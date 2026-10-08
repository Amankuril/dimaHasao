/*
 * Files in and out, for what the admin web does with Blob downloads, jsPDF,
 * xlsx, window.print and <input type="file">.
 *
 * Out: the web builds a Blob and clicks a hidden <a download>. Here the file is
 * written to the cache folder and handed to the Android share sheet, from which
 * the admin saves it to Downloads / Drive or opens it.
 *   saveTextFile('orders_2026-10-08.csv', csv, 'text/csv')
 *   saveBase64File('report.xlsx', b64, XLSX_MIME)
 *   saveWorkbook(XLSX.utils.book_new()..., 'orders.xlsx')     // SheetJS, as on the web
 *   saveHtmlAsPdf('orders.pdf', html, { landscape: true })      // replaces jsPDF + autoTable
 *   tableToPdf({ title, subtitle, columns, rows, filename })    // the common jsPDF table export
 *   printHtml(html)                                              // window.print()
 *   downloadAndShare(url, filename)                              // a server export (admin token sent)
 *
 * In: <input type="file"> becomes a picker. Each returns React Native's upload
 * object { uri, name, type, size } (or an array with `multiple`), which
 * FormData.append() accepts like a browser File. `objectUrl(file)` is the
 * preview URL (the web's URL.createObjectURL).
 *   pickImage({ camera?: false, multiple?: false })
 *   pickDocument({ type: ['application/pdf', 'image/*'], multiple?: false })
 *   pickSpreadsheet()  ->  { file, workbook }  (parsed with SheetJS, for bulk imports)
 */
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as DocumentPicker from 'expo-document-picker';
import * as XLSX from 'xlsx';
import { getAuthToken, mediaUrl } from '../api/client';
import { openCamera, openGallery, prepareUploadFile } from './images';
import { toast } from './notify';
import * as ImagePicker from 'expo-image-picker';

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const MIME_BY_EXT = {
  csv: 'text/csv',
  xls: 'application/vnd.ms-excel',
  xlsx: XLSX_MIME,
  pdf: 'application/pdf',
  json: 'application/json',
  txt: 'text/plain',
  zip: 'application/zip',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

const safeName = (name) => String(name || 'file').replace(/[\\/:*?"<>|]+/g, '_');
const extOf = (name) => String(name).split('.').pop().toLowerCase();

async function share(file, mimeType) {
  if (!(await Sharing.isAvailableAsync())) {
    toast.error('Sharing is not available on this device');
    return false;
  }
  await Sharing.shareAsync(file.uri, { mimeType: mimeType || MIME_BY_EXT[extOf(file.name)] || 'application/octet-stream', dialogTitle: file.name });
  return true;
}

function freshFile(filename) {
  const file = new File(Paths.cache, safeName(filename));
  if (file.exists) file.delete();
  file.create();
  return file;
}

/** Write text (CSV, TSV, JSON) and open the share sheet. */
export async function saveTextFile(filename, text, mimeType) {
  try {
    const file = freshFile(filename);
    file.write(String(text ?? ''));
    return await share(file, mimeType);
  } catch (e) {
    toast.error(e?.message || 'Could not save the file');
    return false;
  }
}

/** Write base64 bytes and open the share sheet. */
export async function saveBase64File(filename, base64, mimeType) {
  try {
    const file = freshFile(filename);
    file.write(base64, { encoding: 'base64' });
    return await share(file, mimeType);
  } catch (e) {
    toast.error(e?.message || 'Could not save the file');
    return false;
  }
}

/** `XLSX.writeFile(workbook, filename)` on the web. */
export function saveWorkbook(workbook, filename, { bookType } = {}) {
  const type = bookType || (extOf(filename) === 'csv' ? 'csv' : extOf(filename) === 'xls' ? 'biff8' : 'xlsx');
  if (type === 'csv') return saveTextFile(filename, XLSX.write(workbook, { type: 'string', bookType: 'csv' }), 'text/csv');
  const b64 = XLSX.write(workbook, { type: 'base64', bookType: type });
  return saveBase64File(filename, b64, type === 'biff8' ? MIME_BY_EXT.xls : XLSX_MIME);
}

/** An HTML document rendered to PDF (A4) and shared: the web's jsPDF output, or "Save as PDF" from print. */
export async function saveHtmlAsPdf(filename, html, { landscape = false } = {}) {
  try {
    const size = landscape ? { width: 842, height: 595 } : { width: 595, height: 842 };
    const { uri } = await Print.printToFileAsync({ html, ...size });
    const tmp = new File(uri);
    const target = freshFile(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
    target.delete();
    await tmp.move(target);
    return await share(target, 'application/pdf');
  } catch (e) {
    toast.error(e?.message || 'Could not create the PDF');
    return false;
  }
}

/** window.print() of an HTML document: the Android print dialog (which can also save a PDF). */
export async function printHtml(html) {
  try {
    await Print.printAsync({ html });
    return true;
  } catch (e) {
    if (!/cancel/i.test(String(e?.message))) toast.error(e?.message || 'Could not print');
    return false;
  }
}

const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * The web's jsPDF + autoTable export: a title, a subtitle line, a striped table.
 * `columns` are header labels, `rows` arrays of cell values.
 */
export function tableHtml({ title, subtitle, columns = [], rows = [], headColor = '#1E293B', fontSize = 9 }) {
  return `<!doctype html><html><head><meta charset="utf-8"/><style>
    body{font-family:Helvetica,Arial,sans-serif;margin:24px;color:#1E1E1E}
    h1{font-size:16px;text-align:center;margin:0 0 4px}
    .sub{font-size:10px;color:#646464;text-align:center;margin:0 0 12px}
    table{width:100%;border-collapse:collapse;font-size:${fontSize}px}
    th{background:${headColor};color:#fff;text-align:left;padding:6px;font-weight:bold}
    td{padding:5px 6px;border-bottom:1px solid #E5E7EB;vertical-align:top}
    tr:nth-child(even) td{background:#F8FAFC}
  </style></head><body>
  ${title ? `<h1>${esc(title)}</h1>` : ''}${subtitle ? `<p class="sub">${esc(subtitle)}</p>` : ''}
  <table><thead><tr>${columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead>
  <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>
  </body></html>`;
}

export function tableToPdf({ filename, landscape = true, ...table }) {
  return saveHtmlAsPdf(filename, tableHtml(table), { landscape });
}

/** CSV text from header labels and rows, quoted as the web's exporters quote it. */
export function toCsv(columns, rows) {
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [columns.map(q).join(','), ...rows.map((r) => r.map(q).join(','))].join('\n');
}

/** Fetch a file the server builds (CSV/XLSX/PDF export endpoints) with the admin token, then share it. */
export async function downloadAndShare(url, filename, { headers } = {}) {
  try {
    const target = freshFile(filename);
    target.delete();
    const token = getAuthToken();
    const file = await File.downloadFileAsync(mediaUrl(url) || url, target, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(headers || {}) },
      idempotent: true,
    });
    return await share(file);
  } catch (e) {
    toast.error(e?.message || 'Download failed');
    return false;
  }
}

/* ------------------------------------------------------------------ pickers */

/**
 * An image, as <input type="file" accept="image/*"> gives it (compressed the
 * way the web's imageCompressor does). With `multiple`, an array.
 */
export async function pickImage({ camera = false, multiple = false, compress = true, ...opts } = {}) {
  if (multiple && !camera) {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.error('Photo library permission is required');
      return [];
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.85 });
    if (res.canceled) return [];
    const files = res.assets.map((a, i) => ({ uri: a.uri, name: a.fileName || `image-${Date.now()}-${i}.jpg`, type: a.mimeType || 'image/jpeg', size: a.fileSize, width: a.width, height: a.height }));
    return compress ? Promise.all(files.map((f) => prepareUploadFile(f))) : files;
  }
  const file = camera ? await openCamera(opts) : await openGallery(opts);
  if (!file) return null;
  return compress ? prepareUploadFile(file) : file;
}

/** <input type="file" accept=".pdf,image/*">: any document. */
export async function pickDocument({ type = '*/*', multiple = false } = {}) {
  try {
    const res = await DocumentPicker.getDocumentAsync({ type, multiple, copyToCacheDirectory: true });
    if (res.canceled) return multiple ? [] : null;
    const files = res.assets.map((a) => ({ uri: a.uri, name: a.name, type: a.mimeType || MIME_BY_EXT[extOf(a.name)] || 'application/octet-stream', size: a.size }));
    return multiple ? files : files[0];
  } catch (e) {
    toast.error(e?.message || 'Could not open the file');
    return multiple ? [] : null;
  }
}

/** A spreadsheet picked and parsed: the web's FileReader + XLSX.read(...) for bulk imports. */
export async function pickSpreadsheet() {
  const file = await pickDocument({ type: [XLSX_MIME, MIME_BY_EXT.xls, 'text/csv', 'text/comma-separated-values', 'application/csv'] });
  if (!file) return null;
  const f = new File(file.uri);
  const workbook = extOf(file.name) === 'csv' ? XLSX.read(await f.text(), { type: 'string' }) : XLSX.read(await f.base64(), { type: 'base64' });
  return { file, workbook };
}

/** The web's URL.createObjectURL(file) for a preview <img>. */
export const objectUrl = (file) => (file && typeof file === 'object' ? file.uri : file) || null;

export { XLSX };
