/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/users/UserBulkUpload.jsx (tools/port.js first pass). */
import React, { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { ArrowLeft, Download, FileText, RefreshCw, UploadCloud, X } from 'lucide-react-native';
import { useLocation, useNavigate } from '../../../../../lib/webRouter';
import { toast } from '../../../../../lib/notify';
import { USER_IMPORT_COLUMNS, validateUserImportFile } from './userImportSchema';
import * as XLSX from 'xlsx';
import { adminService } from '../../services/adminService';
import { Button, Div, Span, Icon as UiIcon } from '../../../../../components/web';
import { File } from 'expo-file-system';
import { pickSpreadsheet, saveBase64File } from '../../../../../lib/files';
import { AdminPage, PageHeader, Card, SectionTitle, DataTable, THead, TBody, Row, Cell, EmptyState, ErrorState, BTN_PRIMARY, BTN_SECONDARY, BTN_TEXT_PRIMARY, BTN_TEXT_SECONDARY } from '../../../../../admin/ui';

const COLS = [220, 190];
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
  const busy = importingIndex !== null;
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={UploadCloud}
        title="Bulk Upload"
        subtitle={`File columns: ${USER_IMPORT_COLUMNS.join(', ')}`}
        breadcrumb={[{ label: 'Users' }, { label: 'Bulk Upload' }]}
        actions={
          <>
            <Button type="button" onClick={() => navigate('/user-import/create')} className={BTN_PRIMARY}>
              <UiIcon as={UploadCloud} size={16} className="text-white" />
              <Span className={BTN_TEXT_PRIMARY}>Select Files</Span>
            </Button>
            <Button type="button" onClick={() => navigate('/taxi/admin/users')} className={BTN_SECONDARY} accessibilityLabel="Back to users">
              <UiIcon as={ArrowLeft} size={16} className="text-slate-600" />
              <Span className={BTN_TEXT_SECONDARY}>Back</Span>
            </Button>
          </>
        }
      />

      {error ? <ErrorState title="That file cannot be used" message={error} className="mb-4" /> : null}

      {files.length === 0 ? (
        <EmptyState
          icon={UploadCloud}
          title="No files selected"
          message="Pick a CSV or XLSX of passengers to import. Existing import files appear here with download and re-upload actions."
          actionLabel="Select Files"
          onAction={() => navigate('/user-import/create')}
        />
      ) : (
        <Card padded={false}>
          <Div className="px-4 pt-4">
            <SectionTitle>Upload Customer File</SectionTitle>
          </Div>
          <Div className="px-4 pb-4">
            <DataTable cols={COLS}>
              <THead cols={COLS} labels={['File', 'Action']} />
              <TBody>
                {files.map((selectedFile, index) => (
                  <Row key={`${selectedFile.name}-${index}`} last={index === files.length - 1}>
                    <Cell width={COLS[0]}>
                      <Div className="flex-row items-center gap-2">
                        <Div className="w-9 h-9 rounded-lg bg-blue-100 items-center justify-center shrink-0">
                          <UiIcon as={FileText} size={18} className="text-blue-700" />
                        </Div>
                        <Div className="flex-1 min-w-0">
                          <Span className="text-sm font-medium text-slate-900" numberOfLines={1}>
                            {selectedFile.name}
                          </Span>
                          <Span className="text-xs text-slate-500">{formatFileSize(selectedFile.size)}</Span>
                        </Div>
                      </Div>
                    </Cell>
                    <Cell width={COLS[1]}>
                      <Div className="flex-row items-center gap-1">
                        <Button
                          type="button"
                          onClick={() => handleImport(selectedFile, index)}
                          disabled={busy}
                          accessibilityLabel={`Import ${selectedFile.name}`}
                          className={`w-11 h-11 items-center justify-center rounded-lg ${busy ? 'opacity-50' : ''}`}
                        >
                          {importingIndex === index ? <ActivityIndicator size="small" color="#155DFC" /> : <UiIcon as={UploadCloud} size={18} className="text-green-700" />}
                        </Button>
                        <Button
                          type="button"
                          onClick={() => handleDownload(selectedFile)}
                          accessibilityLabel={`Download ${selectedFile.name}`}
                          className="w-11 h-11 items-center justify-center rounded-lg"
                        >
                          <UiIcon as={Download} size={18} className="text-slate-500" />
                        </Button>
                        <Button
                          type="button"
                          onClick={() => handleReupload(index)}
                          disabled={busy}
                          accessibilityLabel={`Replace ${selectedFile.name}`}
                          className={`w-11 h-11 items-center justify-center rounded-lg ${busy ? 'opacity-50' : ''}`}
                        >
                          <UiIcon as={RefreshCw} size={18} className="text-slate-500" />
                        </Button>
                        <Button
                          type="button"
                          onClick={() => removeFile(index)}
                          disabled={busy}
                          accessibilityLabel={`Remove ${selectedFile.name}`}
                          className={`w-11 h-11 items-center justify-center rounded-lg ${busy ? 'opacity-50' : ''}`}
                        >
                          <UiIcon as={X} size={18} className="text-red-600" />
                        </Button>
                      </Div>
                    </Cell>
                  </Row>
                ))}
              </TBody>
            </DataTable>
          </Div>
        </Card>
      )}
    </AdminPage>
  );
};
export default UserBulkUpload;
