/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/drivers/DriverImportCreate.jsx (tools/port.js first pass). */
import React, { useState } from 'react';
import { ArrowLeft, ChevronRight, FileText, UploadCloud, X } from 'lucide-react-native';
import { useNavigate } from '../../../../../lib/webRouter';
import { toast } from '../../../../../lib/notify';
import { adminService } from '../../services/adminService';
import { DRIVER_IMPORT_COLUMNS, parseDriverImportFile, validateDriverImportFile } from './driverImportSchema';
import { pickSpreadsheet } from '../../../../../lib/files';
import { Button, Div, Form, H1, H3, Label, P, ScrollDiv, Span, Icon as UiIcon } from '../../../../../components/web';
const labelClass = 'block text-xs font-semibold text-gray-500 mb-1.5';
const formatFileSize = (size = 0) => `${(size / (1024 * 1024)).toFixed(2)} MB`;
const DriverImportCreate = () => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const goBack = () => navigate('/taxi/admin/drivers/bulk-upload');
  const selectFile = async (file) => {
    if (!file) return;
    const validation = await validateDriverImportFile(file);
    if (!validation.valid) {
      setError(validation.message);
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
    setError('');
  };
  const openPicker = async () => {
    const picked = await pickSpreadsheet();
    if (!picked) return;
    await selectFile({ ...picked.file, workbook: picked.workbook });
  };
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedFile) {
      setError('Select a file before creating the import.');
      return;
    }
    try {
      setIsSubmitting(true);
      setError('');
      const parsed = await parseDriverImportFile(selectedFile);
      if (!parsed.valid) {
        setError(parsed.message);
        return;
      }
      const response = await adminService.bulkImportDrivers({
        drivers: parsed.rows,
      });
      const result = response.data || {};
      const summary = `Imported ${result.created_count || 0} drivers. Skipped ${result.skipped_count || 0}, errors ${result.error_count || 0}.`;
      if ((result.created_count || 0) > 0) {
        toast.success(summary);
        navigate('/taxi/admin/drivers');
        return;
      }
      setError(summary);
    } catch (importError) {
      setError(importError.message || 'Failed to import drivers.');
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <ScrollDiv className="min-h-screen bg-gray-50 p-6 lg:p-8">
      <Div className="mb-6">
        <Div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
          <Span>Drivers</Span>
          <UiIcon as={ChevronRight} size={12} />
          <Span>Bulk Upload</Span>
          <UiIcon as={ChevronRight} size={12} />
          <Span className="text-gray-700">Create Import</Span>
        </Div>

        <Div className="flex items-center justify-between gap-4">
          <H1 className="text-xl text-gray-900 font-bold">Create Import</H1>
          <Button
            type="button"
            onClick={goBack}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <UiIcon as={ArrowLeft} size={16} /> Back
          </Button>
        </Div>
      </Div>

      <Form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Div className="bg-white rounded-xl border border-gray-200 p-6">
          <Div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            <Div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <UiIcon as={UploadCloud} size={18} />
            </Div>
            <Div>
              <H3 className="text-sm text-gray-900 font-bold">Driver Import File</H3>
              <P className="text-xs text-gray-400">Use only these columns: {DRIVER_IMPORT_COLUMNS.join(', ')}</P>
            </Div>
          </Div>

          <Div className="grid grid-cols-1 gap-5">
            <Div>
              <Label className={labelClass}>Import File *</Label>
              <Button
                type="button"
                onClick={openPicker}
                className="flex min-h-[220px] w-full flex-col items-center justify-center rounded-lg border border-dashed px-6 py-8 text-center transition-colors border-gray-200 bg-gray-50"
              >
                <Span className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-white text-indigo-600 border border-gray-200">
                  <UiIcon as={UploadCloud} size={22} />
                </Span>
                <Span className="text-sm font-semibold text-gray-900">{selectedFile ? 'Replace selected file' : 'Select file'}</Span>
                <Span className="mt-1 text-xs text-gray-500">CSV or XLSX files only, with no extra columns</Span>
              </Button>
            </Div>

            {selectedFile && (
              <Div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white px-4 py-3">
                <Div className="flex min-w-0 items-center gap-3">
                  <Div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <UiIcon as={FileText} size={18} />
                  </Div>
                  <Div className="min-w-0">
                    <P className="truncate text-sm font-medium text-gray-900">{selectedFile.name}</P>
                    <P className="mt-0.5 text-xs text-gray-400">{formatFileSize(selectedFile.size)}</P>
                  </Div>
                </Div>
                <Button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setError('');
                  }}
                  className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
                >
                  <UiIcon as={X} size={16} />
                </Button>
              </Div>
            )}

            <Div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <P className="text-xs font-semibold text-gray-500 mb-2">Required Excel Columns</P>
              <Div className="flex flex-wrap gap-2">
                {DRIVER_IMPORT_COLUMNS.map((column) => (
                  <Span key={column} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-800">
                    {column}
                  </Span>
                ))}
              </Div>
            </Div>

            {error && <Div className="rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">{error}</Div>}
          </Div>
        </Div>

        <Div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3 self-start">
          <Button
            type="submit"
            className="w-full py-3 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:cursor-not-allowed disabled:bg-indigo-200"
            disabled={!selectedFile || isSubmitting}
          >
            {isSubmitting ? 'Importing...' : 'Create Import'}
          </Button>
          <Button
            type="button"
            onClick={goBack}
            className="w-full py-3 bg-gray-50 text-gray-600 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
          >
            Cancel
          </Button>
        </Div>
      </Form>
    </ScrollDiv>
  );
};
export default DriverImportCreate;
