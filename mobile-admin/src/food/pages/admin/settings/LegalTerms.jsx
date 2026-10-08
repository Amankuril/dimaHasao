/* Ported from Frontend/src/modules/Food/pages/admin/settings/LegalTerms.jsx (tools/port.js first pass). */
import { useState, useEffect } from 'react';
import { Scale } from 'lucide-react-native';
import { toast } from '../../../../lib/notify';
import api from '../../../../api/food';
import { Textarea } from '../../../../components/shadcn';
import { legalHtmlToPlainText, plainTextToLegalHtml } from '../../../utils/legalContentFormat';
import { Button, Div, Input, Span } from '../../../../components/web';
import { AdminPage, PageHeader, Card, SectionTitle, Toolbar, Field, LoadingState, EmptyState, INPUT, BTN_PRIMARY, BTN_SECONDARY, BTN_TEXT_PRIMARY, BTN_TEXT_SECONDARY, useLayoutWidth } from '../../../../admin/ui';
import HtmlContent from '../../../../components/HtmlContent';
export default function TermsAndCondition() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState('edit'); // "edit" | "preview"
  const [activeRole, setActiveRole] = useState('user'); // "user" | "restaurant" | "delivery"
  const [termsData, setTermsData] = useState({
    title: 'Terms and Conditions',
    content: '',
  });
  const [initialData, setInitialData] = useState({
    title: 'Terms and Conditions',
    content: '',
  });
  const hasChanges = JSON.stringify(termsData) !== JSON.stringify(initialData);
  useEffect(() => {
    fetchTermsData();
  }, [activeRole]);
  const fetchTermsData = async () => {
    try {
      setLoading(true);
      const key = activeRole === 'user' ? 'terms' : `terms_${activeRole}`;
      const response = await api.get(`/food/admin/pages-social-media/${key}`, {
        contextModule: 'admin',
      });
      if (response.data.success && response.data.data) {
        const content = response.data.data.content || '';
        const textContent = legalHtmlToPlainText(content);
        const fetchedData = {
          title: response.data.data.title || `Terms and Conditions - ${activeRole.charAt(0).toUpperCase() + activeRole.slice(1)}`,
          content: textContent,
        };
        setTermsData(fetchedData);
        setInitialData(fetchedData);
      } else {
        const defaultData = {
          title: `Terms and Conditions - ${activeRole.charAt(0).toUpperCase() + activeRole.slice(1)}`,
          content: '',
        };
        setTermsData(defaultData);
        setInitialData(defaultData);
      }
    } catch (error) {
      console.error('Error fetching terms data:', error);
      const errorData = {
        title: `Terms and Conditions - ${activeRole.charAt(0).toUpperCase() + activeRole.slice(1)}`,
        content: '',
      };
      setTermsData(errorData);
      setInitialData(errorData);
    } finally {
      setLoading(false);
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const htmlContent = plainTextToLegalHtml(termsData.content);
      const key = activeRole === 'user' ? 'terms' : `terms_${activeRole}`;
      const response = await api.put(
        `/food/admin/pages-social-media/${key}`,
        {
          title: termsData.title,
          content: htmlContent,
        },
        {
          contextModule: 'admin',
        },
      );
      if (response.data.success) {
        toast.success(`${activeRole.charAt(0).toUpperCase() + activeRole.slice(1)} terms updated successfully`);
        const content = response.data.data.content || '';
        const textContent = legalHtmlToPlainText(content);
        const savedData = {
          ...response.data.data,
          content: textContent,
        };
        setTermsData(savedData);
        setInitialData(savedData);
      }
    } catch (error) {
      console.error('Error saving terms:', error);
      toast.error(error.response?.data?.message || 'Failed to save terms and conditions');
    } finally {
      setSaving(false);
    }
  };
  const getRoleLabel = (role) => role.charAt(0).toUpperCase() + role.slice(1);
  const { tablet } = useLayoutWidth();
  return (
    <AdminPage maxWidth={900}>
      <PageHeader
        icon={Scale}
        title="Terms and Conditions"
        subtitle="Manage the terms and conditions shown in each portal."
        breadcrumb={[{ label: 'Food' }, { label: 'Settings' }, { label: 'Terms and Conditions' }]}
      />

      <Card className="mb-4">
        <SectionTitle>Portal</SectionTitle>
        <Toolbar className="mb-0">
          {['user', 'restaurant', 'delivery'].map((role) => (
            <Button
              key={role}
              onClick={() => setActiveRole(role)}
              className={activeRole === role ? BTN_PRIMARY : BTN_SECONDARY}
              accessibilityLabel={`Edit ${getRoleLabel(role)} terms and conditions`}
            >
              <Span className={activeRole === role ? BTN_TEXT_PRIMARY : BTN_TEXT_SECONDARY}>{getRoleLabel(role)}</Span>
            </Button>
          ))}
        </Toolbar>
      </Card>

      <Card className="mb-4">
        <SectionTitle
          action={
            <Div className="flex-row items-center gap-2">
              <Button onClick={() => setViewMode('edit')} className={viewMode === 'edit' ? BTN_PRIMARY : BTN_SECONDARY} accessibilityLabel="Edit content">
                <Span className={viewMode === 'edit' ? BTN_TEXT_PRIMARY : BTN_TEXT_SECONDARY}>Editor</Span>
              </Button>
              <Button onClick={() => setViewMode('preview')} className={viewMode === 'preview' ? BTN_PRIMARY : BTN_SECONDARY} accessibilityLabel="Preview content">
                <Span className={viewMode === 'preview' ? BTN_TEXT_PRIMARY : BTN_TEXT_SECONDARY}>Preview</Span>
              </Button>
            </Div>
          }
        >
          {viewMode === 'preview' ? 'Previewing' : 'Editing'} {getRoleLabel(activeRole)}
        </SectionTitle>

        {loading ? (
          <LoadingState label="Loading content…" />
        ) : viewMode === 'edit' ? (
          <Div className={tablet ? 'flex-row items-start gap-3' : 'gap-3'}>
            <Field label="Page title" className={tablet ? 'flex-1' : null}>
              <Input
                type="text"
                value={termsData.title}
                onChange={(e) =>
                  setTermsData((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                className={INPUT}
              />
            </Field>
            <Field label="Content" hint="Use # and ## for headings and **text** for bold." className={tablet ? 'flex-1' : null}>
              <Textarea
                value={termsData.content}
                onChange={(e) =>
                  setTermsData((prev) => ({
                    ...prev,
                    content: e.target.value,
                  }))
                }
                placeholder={`Enter terms and conditions for ${activeRole} here...`}
                rows={12}
                className="px-3 py-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-700"
                style={{ width: '100%' }}
              />
            </Field>
          </Div>
        ) : termsData.content ? (
          <HtmlContent html={plainTextToLegalHtml(termsData.content)} soraHeadings={false} color="#475569" />
        ) : (
          <EmptyState
            title="Nothing written yet"
            message={`The ${getRoleLabel(activeRole)} portal has no terms and conditions saved.`}
            actionLabel="Write it now"
            onAction={() => setViewMode('edit')}
            icon={Scale}
          />
        )}
      </Card>

      {viewMode === 'edit' && (
        <Card className="flex-row flex-wrap items-center justify-between gap-3">
          <Span className="text-sm text-slate-500 flex-1">Changes are published only once you save.</Span>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={saving || loading || !hasChanges}
            className={`${BTN_PRIMARY}${saving || loading || !hasChanges ? ' opacity-50' : ''}`}
            accessibilityLabel="Save changes"
          >
            <Span className={BTN_TEXT_PRIMARY}>{saving ? 'Saving…' : 'Save changes'}</Span>
          </Button>
        </Card>
      )}
    </AdminPage>
  );
}
