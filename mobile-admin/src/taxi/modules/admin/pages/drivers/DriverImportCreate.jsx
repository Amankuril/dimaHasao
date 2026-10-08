/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/drivers/DriverImportCreate.jsx (tools/port.js first pass). */
import React, { useState } from 'react';
import { ArrowLeft, FileText, UploadCloud, X } from 'lucide-react-native';
import { useNavigate } from '../../../../../lib/webRouter';
import { toast } from '../../../../../lib/notify';
import { adminService } from '../../services/adminService';
import { DRIVER_IMPORT_COLUMNS, parseDriverImportFile, validateDriverImportFile } from './driverImportSchema';
import { pickSpreadsheet } from '../../../../../lib/files';
import { Button, Div, Form, P, Span, Icon as UiIcon } from '../../../../../components/web';
import { AdminPage, PageHeader, Card, SectionTitle, Field, BTN_PRIMARY, BTN_SECONDARY, BTN_TEXT_PRIMARY, BTN_TEXT_SECONDARY } from '../../../../../admin/ui';
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
    <AdminPage maxWidth={720}>
      <PageHeader
        icon={UploadCloud}
        title="Create import"
        subtitle="Upload one CSV or XLSX file of drivers"
        breadcrumb={[{ label: 'Drivers' }, { label: 'Bulk upload' }, { label: 'Create import' }]}
        actions={
          <Button type="button" onClick={goBack} className={BTN_SECONDARY}>
            <UiIcon as={ArrowLeft} size={16} className="text-slate-700" />
            <Span className={BTN_TEXT_SECONDARY}>Back</Span>
          </Button>
        }
      />

      <Form onSubmit={handleSubmit} className="gap-4">
        <Card className="mb-4">
          <SectionTitle>Driver import file</SectionTitle>

          <Field label="Import file" required error={error || undefined} hint={`Use only these columns: ${DRIVER_IMPORT_COLUMNS.join(', ')}`}>
            <Button
              type="button"
              onClick={openPicker}
              accessibilityLabel={selectedFile ? 'Replace selected file' : 'Select file'}
              className="w-full min-h-[180px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-8"
            >
              <Div className="h-12 w-12 items-center justify-center rounded-lg bg-white border border-slate-200 mb-2">
                <UiIcon as={UploadCloud} size={22} className="text-blue-600" />
              </Div>
              <Span className="text-sm font-semibold text-slate-900">{selectedFile ? 'Replace selected file' : 'Select file'}</Span>
              <Span className="text-xs text-slate-500 text-center">CSV or XLSX files only, with no extra columns</Span>
            </Button>
          </Field>

          {selectedFile ? (
            <Div className="mt-3 flex-row items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
              <Div className="flex-1 min-w-0 flex-row items-center gap-3">
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
              <Button
                type="button"
                accessibilityLabel="Remove selected file"
                onClick={() => {
                  setSelectedFile(null);
                  setError('');
                }}
                className="h-11 w-11 items-center justify-center rounded-lg"
              >
                <UiIcon as={X} size={18} className="text-slate-500" />
              </Button>
            </Div>
          ) : null}

          <Div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
            <P className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Required columns</P>
            <Div className="flex-row flex-wrap gap-2">
              {DRIVER_IMPORT_COLUMNS.map((column) => (
                <Span key={column} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
                  {column}
                </Span>
              ))}
            </Div>
          </Div>
        </Card>

        <Card className="gap-2">
          <Button type="submit" className={`${BTN_PRIMARY} w-full ${!selectedFile || isSubmitting ? 'opacity-50' : ''}`} disabled={!selectedFile || isSubmitting}>
            <Span className={BTN_TEXT_PRIMARY}>{isSubmitting ? 'Importing…' : 'Create import'}</Span>
          </Button>
          <Button type="button" onClick={goBack} className={`${BTN_SECONDARY} w-full`}>
            <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
          </Button>
        </Card>
      </Form>
    </AdminPage>
  );
};
export default DriverImportCreate;
