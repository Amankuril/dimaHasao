/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/users/UserBulkUpload.jsx (tools/port.js first pass). */
import React, { useEffect, useState } from 'react';
import { ArrowLeft, ChevronRight, Download, FileText, Loader2, RefreshCw, UploadCloud, X } from 'lucide-react-native';
import { useLocation, useNavigate } from '../../../../../lib/webRouter';
import { toast } from '../../../../../lib/notify';
import { USER_IMPORT_COLUMNS, validateUserImportFile } from './userImportSchema';
import * as XLSX from 'xlsx';
import { adminService } from '../../services/adminService';
import { Button, Div, H1, H3, P, ScrollDiv, Span, Table, Tbody, Td, Th, Thead, Tr, Icon as UiIcon } from '../../../../../components/web';
import { File } from 'expo-file-system';
import { pickSpreadsheet, saveBase64File } from '../../../../../lib/files';
const formatFileSize = (size = 0) => `${(size / (1024 * 1024)).toFixed(2)} MB`;
const parseCsvLine = (line = '') => {
  const cells = [];
  let current = '';
  let insideQuote = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];
    if (char === '"' && nextChar === '"') {
      current += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      insideQuote = !insideQuote;
      continue;
    }
    if (char === ',' && !insideQuote) {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
};
const normalizeCsvColumn = (column = '') =>
  String(column || '')
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase();
const parseUsersFromCsv = (text = '') => {
  const rows = String(text || '')
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter((row) => row.length > 0);
  if (!rows.length) {
    return [];
  }
  const header = parseCsvLine(rows[0]);
  const headerIndex = new Map(header.map((column, index) => [normalizeCsvColumn(column), index]));
  const requiredColumns = USER_IMPORT_COLUMNS.map(normalizeCsvColumn);
  const missingColumns = requiredColumns.filter((column) => !headerIndex.has(column));
  if (missingColumns.length) {
    throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
  }
  const users = [];
  for (let index = 1; index < rows.length; index += 1) {
    const values = parseCsvLine(rows[index]);
    const getValue = (column) => values[headerIndex.get(normalizeCsvColumn(column))] ?? '';
    const name = String(getValue('Name') || '').trim();
    const email = String(getValue('Email') || '').trim();
    const mobile = String(getValue('Mobile') || '').trim();
    const gender = String(getValue('Gender') || '').trim();
    const country = String(getValue('Country') || '').trim();
    if (!name && !mobile && !email) {
      continue;
    }
    users.push({
      name,
      email,
      phone: mobile,
      gender: gender.toLowerCase(),
      countryCode: country,
    });
  }
  return users;
};
const UserBulkUpload = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [files, setFiles] = useState(() => {
    const incomingFile = location.state?.selectedFile;
    return incomingFile ? [incomingFile] : [];
  });
  const [error, setError] = useState('');
  const [replaceIndex, setReplaceIndex] = useState(null);
  const [importingIndex, setImportingIndex] = useState(null);
  useEffect(() => {
    const incomingFile = location.state?.selectedFile;
    if (!incomingFile) return;
    navigate(location.pathname, {
      replace: true,
      state: null,
    });
  }, [location.pathname, location.state, navigate]);
  const addFiles = async (selectedFiles = [], replaceAt = replaceIndex) => {
    const nextFiles = Array.from(selectedFiles);
    if (!nextFiles.length) return;
    const validatedFiles = [];
    for (const file of nextFiles) {
      const validation = await validateUserImportFile(file);
      if (!validation.valid) {
        setError(validation.message);
        return;
      }
      validatedFiles.push(file);
    }
    setError('');
    if (replaceAt !== null) {
      setFiles((current) => current.map((currentFile, index) => (index === replaceAt ? validatedFiles[0] : currentFile)));
      setReplaceIndex(null);
      return;
    }
    setFiles((current) => [...current, ...validatedFiles]);
  };
  const removeFile = (indexToRemove) => {
    setFiles((current) => current.filter((_, index) => index !== indexToRemove));
  };
  const handleDownload = async (file) => {
    try {
      const base64 = await new File(file.uri).base64();
      await saveBase64File(file.name, base64, file.type);
    } catch (downloadError) {
      toast.error(downloadError.message || 'Could not open the file');
    }
  };
  const handleReupload = async (index) => {
    setReplaceIndex(index);
    const picked = await pickSpreadsheet();
    if (!picked?.file) {
      setReplaceIndex(null);
      return;
    }
    await addFiles([picked.file], index);
  };
  const handleImport = async (selectedFile, index) => {
    if (!selectedFile) return;
    const fileName = selectedFile.name.toLowerCase();
    if (!fileName.endsWith('.csv') && !fileName.endsWith('.xlsx')) {
      toast.error('Only CSV or XLSX import is supported.');
      return;
    }
    try {
      setImportingIndex(index);
      let users = [];
      const fileHandle = new File(selectedFile.uri);
      if (fileName.endsWith('.csv')) {
        const csvText = await fileHandle.text();
        users = parseUsersFromCsv(csvText);
      } else if (fileName.endsWith('.xlsx')) {
        const workbook = XLSX.read(await fileHandle.base64(), {
          type: 'base64',
        });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
        });
        if (json.length > 1) {
          const header = json[0];
          const headerIndex = new Map(header.map((col, idx) => [normalizeCsvColumn(col), idx]));
          for (let i = 1; i < json.length; i++) {
            const row = json[i];
            if (!row || row.length === 0) continue;
            const getValue = (column) => row[headerIndex.get(normalizeCsvColumn(column))] ?? '';
            const name = String(getValue('Name') || '').trim();
            const email = String(getValue('Email') || '').trim();
            const mobile = String(getValue('Mobile') || '').trim();
            const gender = String(getValue('Gender') || '').trim();
            const country = String(getValue('Country') || '').trim();
            if (!name && !mobile && !email) {
              continue;
            }
            users.push({
              name,
              email,
              phone: mobile,
              gender: gender.toLowerCase(),
              countryCode: country,
            });
          }
        }
      }
      if (!users.length) {
        toast.error('No valid user rows found in this file.');
        return;
      }
      const batchSize = 300;
      let createdCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      const skippedSample = [];
      const errorSample = [];
      const totalBatches = Math.ceil(users.length / batchSize);
      const toastId = toast.loading(`Importing batch 1/${totalBatches} (0/${users.length})...`);
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex += 1) {
        const start = batchIndex * batchSize;
        const end = Math.min(users.length, start + batchSize);
        const batch = users.slice(start, end);
        toast.loading(`Importing batch ${batchIndex + 1}/${totalBatches} (${end}/${users.length})...`, {
          id: toastId,
        });
        const resData = await adminService.bulkImportUsers({
          users: batch,
        });
        if (!resData?.success) {
          toast.error(resData?.message || 'Import failed', {
            id: toastId,
          });
          return;
        }
        const summary = resData.data || {};
        createdCount += Number(summary.created_count || 0);
        skippedCount += Number(summary.skipped_count || 0);
        errorCount += Number(summary.error_count || 0);
        if (Array.isArray(summary.skipped) && skippedSample.length < 5) {
          skippedSample.push(
            ...summary.skipped
              .slice(0, 5 - skippedSample.length)
              .map((item) => item?.phone)
              .filter(Boolean),
          );
        }
        if (Array.isArray(summary.errors) && errorSample.length < 5) {
          errorSample.push(
            ...summary.errors
              .slice(0, 5 - errorSample.length)
              .map((item) => item?.message)
              .filter(Boolean),
          );
        }
      }
      if (createdCount === 0) {
        const detailParts = [];
        if (skippedCount) detailParts.push(`skipped ${skippedCount}`);
        if (errorCount) detailParts.push(`errors ${errorCount}`);
        const details = detailParts.length ? ` (${detailParts.join(', ')})` : '';
        const hintParts = [];
        if (skippedSample.length) hintParts.push(`Duplicates: ${skippedSample.join(', ')}`);
        if (errorSample.length) hintParts.push(`Errors: ${errorSample.join(' | ')}`);
        const hint = hintParts.length ? `\n${hintParts.join('\n')}` : '';
        toast.error(`No users were created${details}.${hint}`, {
          id: toastId,
        });
        return;
      }
      toast.success(`Imported ${createdCount}, skipped ${skippedCount}, errors ${errorCount}`, {
        id: toastId,
      });
      navigate('/taxi/admin/users');
    } catch (err) {
      toast.error(err.message || 'Failed to import users');
    } finally {
      setImportingIndex(null);
    }
  };
  return (
    <ScrollDiv className="min-h-screen bg-gray-50 p-4 lg:p-6">
      <Div className="mb-4">
        <Div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
          <Span>Users</Span>
          <UiIcon as={ChevronRight} size={12} />
          <Span className="text-gray-700 font-medium">Bulk Upload</Span>
        </Div>

        <Div className="flex items-center justify-between gap-4">
          <H1 className="text-lg text-gray-900 font-bold">Bulk Upload</H1>
          <Button
            type="button"
            onClick={() => navigate('/taxi/admin/users')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
          >
            <UiIcon as={ArrowLeft} size={16} /> Back
          </Button>
        </Div>
      </Div>

      <Div>
        <Div>
          <Div className="bg-white rounded-xl border border-gray-200 p-6">
            <Div className="flex flex-col gap-4 mb-6 pb-4 border-b border-gray-100 md:flex-row md:items-center md:justify-between">
              <Div className="flex items-center gap-3">
                <Div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <UiIcon as={UploadCloud} size={18} />
                </Div>
                <Div>
                  <H3 className="text-sm text-gray-900 font-bold">Upload Customer File</H3>
                  <P className="text-xs text-gray-400">File columns: {USER_IMPORT_COLUMNS.join(', ')}</P>
                </Div>
              </Div>

              <Button
                type="button"
                onClick={() => navigate('/user-import/create')}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-yellow-400 px-4 py-2 text-sm font-semibold text-black shadow-sm transition-colors hover:bg-yellow-500"
              >
                <UiIcon as={UploadCloud} size={16} /> Select Files
              </Button>
            </Div>

            <Div className="rounded-lg border transition-colors border-gray-200 bg-white">
              <Div>
                <Table cols={[260, 168]} className="w-full text-left">
                  <Thead>
                    <Tr className="border-b border-gray-100 bg-gray-50">
                      <Th className="px-4 py-3 text-xs font-semibold text-gray-900">File</Th>
                      <Th className="px-4 py-3 text-right text-xs font-semibold text-gray-900">Action</Th>
                    </Tr>
                  </Thead>
                  <Tbody className="divide-y divide-gray-100">
                    {files.length === 0 ? (
                      <Tr>
                        <Td colSpan="2" className="px-4 py-14 text-center text-sm font-medium text-gray-400">
                          No files selected. Use Select Files above to create a new upload.
                        </Td>
                      </Tr>
                    ) : (
                      files.map((selectedFile, index) => (
                        <Tr key={`${selectedFile.name}-${index}`} className="hover:bg-gray-50/60 transition-colors">
                          <Td className="px-4 py-3">
                            <Div className="flex min-w-0 items-center gap-3">
                              <Div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                                <UiIcon as={FileText} size={18} />
                              </Div>
                              <Div className="min-w-0">
                                <P className="truncate text-sm font-medium text-gray-900">{selectedFile.name}</P>
                                <P className="mt-0.5 text-xs text-gray-400">{formatFileSize(selectedFile.size)}</P>
                              </Div>
                            </Div>
                          </Td>
                          <Td className="px-4 py-3 text-right">
                            <Div className="flex items-center justify-end gap-2">
                              <Button
                                type="button"
                                onClick={() => handleImport(selectedFile, index)}
                                disabled={importingIndex !== null}
                                className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-emerald-50 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {importingIndex === index ? <UiIcon as={Loader2} size={16} className="animate-spin" /> : <UiIcon as={UploadCloud} size={16} />}
                              </Button>
                              <Button
                                type="button"
                                onClick={() => handleDownload(selectedFile)}
                                className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                              >
                                <UiIcon as={Download} size={16} />
                              </Button>
                              <Button
                                type="button"
                                onClick={() => handleReupload(index)}
                                disabled={importingIndex !== null}
                                className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-emerald-50 hover:text-emerald-600"
                              >
                                <UiIcon as={RefreshCw} size={16} />
                              </Button>
                              <Button
                                type="button"
                                onClick={() => removeFile(index)}
                                disabled={importingIndex !== null}
                                className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
                              >
                                <UiIcon as={X} size={16} />
                              </Button>
                            </Div>
                          </Td>
                        </Tr>
                      ))
                    )}
                  </Tbody>
                </Table>
              </Div>

              <Div className="border-t border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-500">
                Existing import files will appear here with download and re-upload actions.
              </Div>

              {error && <Div className="border-t border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">{error}</Div>}
            </Div>
          </Div>
        </Div>
      </Div>
    </ScrollDiv>
  );
};
export default UserBulkUpload;
