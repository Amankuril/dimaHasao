/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/users/UserImportCreate.jsx (tools/port.js first pass). */
import React, { useState } from 'react';
import { ArrowLeft, FileText, UploadCloud, X } from 'lucide-react-native';
import { useNavigate } from '../../../../../lib/webRouter';
import { toast } from '../../../../../lib/notify';
import { adminService } from '../../services/adminService';
import { USER_IMPORT_COLUMNS, parseUserImportFile, validateUserImportFile } from './userImportSchema';
import { Button, Div, Form, Span, Icon as UiIcon } from '../../../../../components/web';
import { pickSpreadsheet } from '../../../../../lib/files';
import { AdminPage, PageHeader, Card, SectionTitle, Field, BTN_PRIMARY, BTN_SECONDARY, BTN_TEXT_PRIMARY, BTN_TEXT_SECONDARY } from '../../../../../admin/ui';

const formatFileSize = (size = 0) => `${(size / (1024 * 1024)).toFixed(2)} MB`;
const UserImportCreate = () => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const goBack = () => navigate('/taxi/admin/users/bulk-upload');
  const selectFile = async (file) => {
    if (!file) return;
    const validation = await validateUserImportFile(file);
    if (!validation.valid) {
      setError(validation.message);
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
    setError('');
  };
  // The web's <input type="file" accept=".csv,.xlsx"> (and its drag-and-drop,
  // which a touch screen has no equivalent for) is the document picker here.
  const handleFileInput = async () => {
    const picked = await pickSpreadsheet();
    await selectFile(picked?.file);
  };
  const submitImport = async (event) => {
    event.preventDefault();
    if (!selectedFile) {
      setError('Select a file before creating the import.');
      return;
    }
    try {
      setIsSubmitting(true);
      setError('');
      const parsed = await parseUserImportFile(selectedFile);
      if (!parsed.valid) {
        setError(parsed.message);
        return;
      }
      const response = await adminService.bulkImportUsers({
        users: parsed.rows,
      });
      const result = response.data || {};
      const summary = `Imported ${result.created_count || 0} users. Skipped ${result.skipped_count || 0}, errors ${result.error_count || 0}.`;
      if ((result.created_count || 0) > 0) {
        toast.success(summary);
        navigate('/taxi/admin/users');
        return;
      }
      setError(summary);
    } catch (importError) {
      setError(importError.message || 'Failed to import users.');
    } finally {
      setIsSubmitting(false);
    }
  };
  const submitDisabled = !selectedFile || isSubmitting;
  return (
    <AdminPage maxWidth={720}>
      <PageHeader
        icon={UploadCloud}
        title="Create Import"
        subtitle="Upload a CSV or XLSX of passengers"
        breadcrumb={[{ label: 'Users' }, { label: 'Bulk Upload' }, { label: 'Create Import' }]}
        actions={
          <Button type="button" onClick={goBack} className={BTN_SECONDARY} accessibilityLabel="Back to bulk upload">
            <UiIcon as={ArrowLeft} size={16} className="text-slate-600" />
            <Span className={BTN_TEXT_SECONDARY}>Back</Span>
          </Button>
        }
      />

      <Form onSubmit={submitImport} className="gap-4">
        <Card>
          <SectionTitle>User Import File</SectionTitle>
          <Field label="Import File" required error={error || undefined} hint={error ? undefined : 'CSV or XLSX only, with no extra columns'}>
            <Button
              type="button"
              onClick={handleFileInput}
              accessibilityLabel={selectedFile ? 'Replace the selected file' : 'Select a file to import'}
              className="h-40 rounded-lg border border-dashed border-slate-300 bg-slate-50 items-center justify-center gap-2"
            >
              <UiIcon as={UploadCloud} size={28} className="text-slate-400" />
              <Span className="text-sm font-semibold text-slate-900">{selectedFile ? 'Replace selected file' : 'Select file'}</Span>
            </Button>
          </Field>

          {selectedFile ? (
            <Div className="flex-row items-center justify-between gap-3 mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
              <Div className="flex-row items-center gap-2 flex-1 min-w-0">
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
              <Button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  setError('');
                }}
                accessibilityLabel="Remove the selected file"
                className="w-11 h-11 items-center justify-center rounded-lg"
              >
                <UiIcon as={X} size={18} className="text-slate-500" />
              </Button>
            </Div>
          ) : null}
        </Card>

        <Card>
          <SectionTitle>Required columns</SectionTitle>
          <Div className="flex-row flex-wrap gap-2">
            {USER_IMPORT_COLUMNS.map((column) => (
              <Div key={column} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                <Span className="text-xs font-medium text-slate-700">{column}</Span>
              </Div>
            ))}
          </Div>
        </Card>

        <Div className="flex-row gap-2">
          <Button type="submit" className={`${BTN_PRIMARY} flex-1 ${submitDisabled ? 'opacity-50' : ''}`} disabled={submitDisabled}>
            <Span className={BTN_TEXT_PRIMARY}>{isSubmitting ? 'Importing…' : 'Create Import'}</Span>
          </Button>
          <Button type="button" onClick={goBack} className={`${BTN_SECONDARY} flex-1`}>
            <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
          </Button>
        </Div>
      </Form>
    </AdminPage>
  );
};
export default UserImportCreate;
