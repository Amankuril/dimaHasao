/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/drivers/DriverBulkUpload.jsx (tools/port.js first pass). */
import React, { useEffect, useState } from 'react';
import { File } from 'expo-file-system';
import { ArrowLeft, Download, FileText, RefreshCw, UploadCloud, X } from 'lucide-react-native';
import { useLocation, useNavigate } from '../../../../../lib/webRouter';
import { DRIVER_IMPORT_COLUMNS, validateDriverImportFile } from './driverImportSchema';
import { pickSpreadsheet, saveBase64File } from '../../../../../lib/files';
import { toast } from '../../../../../lib/notify';
import { Button, Div, P, Span, Icon as UiIcon } from '../../../../../components/web';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  DataTable,
  THead,
  TBody,
  Row,
  Cell,
  EmptyState,
  ErrorState,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
} from '../../../../../admin/ui';
const formatFileSize = (size = 0) => `${(size / (1024 * 1024)).toFixed(2)} MB`;
const COLS = [240, 180];
const DriverBulkUpload = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [files, setFiles] = useState(() => {
    const incomingFile = location.state?.selectedFile;
    return incomingFile ? [incomingFile] : [];
  });
  const [error, setError] = useState('');
  const [replaceIndex, setReplaceIndex] = useState(null);
  useEffect(() => {
    const incomingFile = location.state?.selectedFile;
    if (!incomingFile) return;
    navigate(location.pathname, {
      replace: true,
      state: null,
    });
  }, [location.pathname, location.state, navigate]);
  const addFiles = async (selectedFiles = [], indexToReplace = replaceIndex) => {
    const nextFiles = Array.from(selectedFiles);
    if (!nextFiles.length) return;
    const validatedFiles = [];
    for (const file of nextFiles) {
      const validation = await validateDriverImportFile(file);
      if (!validation.valid) {
        setError(validation.message);
        return;
      }
      validatedFiles.push(file);
    }
    setError('');
    if (indexToReplace !== null) {
      setFiles((current) => current.map((currentFile, index) => (index === indexToReplace ? validatedFiles[0] : currentFile)));
      setReplaceIndex(null);
      return;
    }
    setFiles((current) => [...current, ...validatedFiles]);
  };
  const openPicker = async (indexToReplace = null) => {
    const picked = await pickSpreadsheet();
    if (!picked) return;
    setReplaceIndex(indexToReplace);
    await addFiles([{ ...picked.file, workbook: picked.workbook }], indexToReplace);
  };
  const removeFile = (indexToRemove) => {
    setFiles((current) => current.filter((_, index) => index !== indexToRemove));
  };
  const handleDownload = async (file) => {
    try {
      const base64 = await new File(file.uri).base64();
      await saveBase64File(file.name, base64, file.type);
    } catch (downloadError) {
      toast.error(downloadError?.message || 'Could not save the file');
    }
  };
  const handleReupload = (index) => {
    void openPicker(index);
  };
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={UploadCloud}
        title="Bulk upload"
        subtitle={`File columns: ${DRIVER_IMPORT_COLUMNS.join(', ')}`}
        breadcrumb={[{ label: 'Drivers' }, { label: 'Bulk upload' }]}
        actions={
          <>
            <Button type="button" onClick={() => navigate('/taxi/driver-import/create')} className={BTN_PRIMARY}>
              <UiIcon as={UploadCloud} size={16} className="text-white" />
              <Span className={BTN_TEXT_PRIMARY}>Select files</Span>
            </Button>
            <Button type="button" onClick={() => navigate('/taxi/admin/drivers')} className={BTN_SECONDARY}>
              <UiIcon as={ArrowLeft} size={16} className="text-slate-700" />
              <Span className={BTN_TEXT_SECONDARY}>Back</Span>
            </Button>
          </>
        }
      />

      {error ? <ErrorState title="That file was rejected" message={error} className="mb-4" /> : null}

      <Card className="mb-4" padded={false}>
        <Div className="p-4 pb-0">
          <SectionTitle>Upload driver file</SectionTitle>
        </Div>
        <Div className="px-4 pb-4">
          {files.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No files selected"
              message="Use Select files above to create a new upload. Existing import files appear here with download and re-upload actions."
              actionLabel="Select files"
              onAction={() => navigate('/taxi/driver-import/create')}
            />
          ) : (
            <DataTable cols={COLS}>
              <THead cols={COLS} labels={['File', 'Action']} />
              <TBody>
                {files.map((selectedFile, index) => (
                  <Row key={`${selectedFile.name}-${selectedFile.size}-${index}`} last={index === files.length - 1}>
                    <Cell width={COLS[0]}>
                      <Div className="flex-row items-center gap-3">
                        <Div className="h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                          <UiIcon as={FileText} size={18} className="text-blue-600" />
                        </Div>
                        <Div className="flex-1 min-w-0">
                          <P className="text-sm font-medium text-slate-900" numberOfLines={1}>
                            {selectedFile.name}
                          </P>
                          <P className="mt-0.5 text-xs text-slate-500">{formatFileSize(selectedFile.size)}</P>
                        </Div>
                      </Div>
                    </Cell>
                    <Cell width={COLS[1]} align="right">
                      <Div className="flex-row items-center justify-end gap-1">
                        <Button
                          type="button"
                          accessibilityLabel={`Download ${selectedFile.name}`}
                          onClick={() => handleDownload(selectedFile)}
                          className="h-11 w-11 items-center justify-center rounded-lg"
                        >
                          <UiIcon as={Download} size={18} className="text-slate-500" />
                        </Button>
                        <Button
                          type="button"
                          accessibilityLabel={`Replace ${selectedFile.name}`}
                          onClick={() => handleReupload(index)}
                          className="h-11 w-11 items-center justify-center rounded-lg"
                        >
                          <UiIcon as={RefreshCw} size={18} className="text-slate-500" />
                        </Button>
                        <Button
                          type="button"
                          accessibilityLabel={`Remove ${selectedFile.name}`}
                          onClick={() => removeFile(index)}
                          className="h-11 w-11 items-center justify-center rounded-lg"
                        >
                          <UiIcon as={X} size={18} className="text-red-600" />
                        </Button>
                      </Div>
                    </Cell>
                  </Row>
                ))}
              </TBody>
            </DataTable>
          )}
        </Div>
      </Card>
    </AdminPage>
  );
};
export default DriverBulkUpload;
