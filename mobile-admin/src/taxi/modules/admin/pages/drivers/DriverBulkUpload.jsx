/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/drivers/DriverBulkUpload.jsx (tools/port.js first pass). */
import React, { useEffect, useState } from 'react';
import { File } from 'expo-file-system';
import { ArrowLeft, ChevronRight, Download, FileText, RefreshCw, UploadCloud, X } from 'lucide-react-native';
import { useLocation, useNavigate } from '../../../../../lib/webRouter';
import { DRIVER_IMPORT_COLUMNS, validateDriverImportFile } from './driverImportSchema';
import { pickSpreadsheet, saveBase64File } from '../../../../../lib/files';
import { toast } from '../../../../../lib/notify';
import { Button, Div, H1, H3, P, ScrollDiv, Span, Table, Tbody, Td, Th, Thead, Tr, Icon as UiIcon } from '../../../../../components/web';
const formatFileSize = (size = 0) => `${(size / (1024 * 1024)).toFixed(2)} MB`;
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
    <ScrollDiv className="min-h-screen bg-gray-50 p-6 lg:p-8">
      <Div className="mb-6">
        <Div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
          <Span>Drivers</Span>
          <UiIcon as={ChevronRight} size={12} />
          <Span className="text-gray-700">Bulk Upload</Span>
        </Div>

        <Div className="flex items-center justify-between gap-4">
          <H1 className="text-xl text-gray-900 font-bold">Bulk Upload</H1>
          <Button
            type="button"
            onClick={() => navigate('/taxi/admin/drivers')}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <UiIcon as={ArrowLeft} size={16} /> Back
          </Button>
        </Div>
      </Div>

      <Div className="bg-white rounded-xl border border-gray-200 p-6">
        <Div className="flex flex-col gap-4 mb-6 pb-4 border-b border-gray-100 md:flex-row md:items-center md:justify-between">
          <Div className="flex items-center gap-3">
            <Div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <UiIcon as={UploadCloud} size={18} />
            </Div>
            <Div>
              <H3 className="text-sm text-gray-900 font-bold">Upload Driver File</H3>
              <P className="text-xs text-gray-400">File columns: {DRIVER_IMPORT_COLUMNS.join(', ')}</P>
            </Div>
          </Div>

          <Button
            type="button"
            onClick={() => navigate('/taxi/driver-import/create')}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            <UiIcon as={UploadCloud} size={16} /> Select Files
          </Button>
        </Div>

        <Div className="rounded-lg border transition-colors border-gray-200 bg-white">
          <Div>
            <Table cols={[320, 140]} className="w-full text-left">
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
                    <Tr key={`${selectedFile.name}-${selectedFile.size}-${index}`} className="hover:bg-gray-50/60 transition-colors">
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
                            onClick={() => handleDownload(selectedFile)}
                            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                          >
                            <UiIcon as={Download} size={16} />
                          </Button>
                          <Button
                            type="button"
                            onClick={() => handleReupload(index)}
                            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-emerald-50 hover:text-emerald-600"
                          >
                            <UiIcon as={RefreshCw} size={16} />
                          </Button>
                          <Button
                            type="button"
                            onClick={() => removeFile(index)}
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
    </ScrollDiv>
  );
};
export default DriverBulkUpload;
