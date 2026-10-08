/* Ported from Frontend/src/modules/Food/pages/admin/settings/RefundPolicy.jsx (tools/port.js first pass). */
import { useState, useEffect } from 'react';
import { toast } from '../../../../lib/notify';
import api from '../../../../api/food';
import { API_ENDPOINTS } from '../../../../api/config';
import { Textarea } from '../../../../components/shadcn';
import { unwrapLegalPage, plainTextToLegalHtml } from '../../../utils/legalContentFormat';
import { Button, Div, Span } from '../../../../components/web';
import { AdminPage, PageHeader, Card, SectionTitle, Field, LoadingState, EmptyState, BTN_PRIMARY, BTN_SECONDARY, BTN_TEXT_PRIMARY, BTN_TEXT_SECONDARY } from '../../../../admin/ui';
import { FileText } from 'lucide-react-native';
import HtmlContent from '../../../../components/HtmlContent';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
export default function RefundPolicy() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState('edit'); // "edit" | "preview"
  const [refundData, setRefundData] = useState({
    title: 'Refund Policy',
    content: '',
  });
  useEffect(() => {
    fetchRefundData();
  }, []);
  const fetchRefundData = async () => {
    try {
      setLoading(true);
      const response = await api.get(API_ENDPOINTS.ADMIN.REFUND, {
        contextModule: 'admin',
      });
      if (response.data.success) {
        setRefundData(
          unwrapLegalPage(response.data, {
            title: 'Refund Policy',
          }),
        );
      }
    } catch (error) {
      debugError('Error fetching refund data:', error);
      toast.error('Failed to load refund policy');
    } finally {
      setLoading(false);
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      // Convert plain text/markdown to HTML for storage + user rendering
      const htmlContent = plainTextToLegalHtml(refundData.content);
      const response = await api.put(
        API_ENDPOINTS.ADMIN.REFUND,
        {
          title: refundData.title,
          content: htmlContent,
        },
        {
          contextModule: 'admin',
        },
      );
      if (response.data.success) {
        toast.success('Refund policy updated successfully');
        setRefundData(
          unwrapLegalPage(response.data, {
            title: 'Refund Policy',
          }),
        );
      }
    } catch (error) {
      debugError('Error saving refund policy:', error);
      toast.error(error.response?.data?.message || 'Failed to save refund policy');
    } finally {
      setSaving(false);
    }
  };
  return (
    <AdminPage maxWidth={900}>
      <PageHeader
        icon={FileText}
        title="Refund Policy"
        subtitle="Manage the refund policy customers and partners read in the apps."
        breadcrumb={[{ label: 'Food' }, { label: 'Settings' }, { label: 'Refund Policy' }]}
        actions={
          <>
            <Button className={viewMode === 'edit' ? BTN_PRIMARY : BTN_SECONDARY} onClick={() => setViewMode('edit')} accessibilityLabel="Edit content">
              <Span className={viewMode === 'edit' ? BTN_TEXT_PRIMARY : BTN_TEXT_SECONDARY}>Edit</Span>
            </Button>
            <Button className={viewMode === 'preview' ? BTN_PRIMARY : BTN_SECONDARY} onClick={() => setViewMode('preview')} accessibilityLabel="Preview content">
              <Span className={viewMode === 'preview' ? BTN_TEXT_PRIMARY : BTN_TEXT_SECONDARY}>Preview</Span>
            </Button>
          </>
        }
      />

      {loading ? (
        <LoadingState label="Loading the refund policy…" />
      ) : viewMode === 'edit' ? (
        <Card>
          <SectionTitle>Content</SectionTitle>
          <Field hint="Use # and ## for headings and **text** for bold.">
            <Textarea
              value={refundData.content}
              onChange={(e) =>
                setRefundData((prev) => ({
                  ...prev,
                  content: e.target.value,
                }))
              }
              placeholder="Enter refund policy content..."
              rows={14}
              className="px-3 py-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-700"
              style={{ textAlign: 'left', width: '100%' }}
            />
          </Field>
        </Card>
      ) : refundData.content ? (
        <Card>
          <SectionTitle>Preview</SectionTitle>
          <HtmlContent html={plainTextToLegalHtml(refundData.content)} soraHeadings={false} color="#334155" />
        </Card>
      ) : (
        <EmptyState
          title="Nothing written yet"
          message="This refund policy is empty, so customers see no policy in the app."
          actionLabel="Write it now"
          onAction={() => setViewMode('edit')}
          icon={FileText}
        />
      )}

      <Div className="flex-row justify-end mt-4">
        <Button type="button" onClick={handleSubmit} disabled={saving} className={`${BTN_PRIMARY}${saving ? ' opacity-50' : ''}`} accessibilityLabel="Save changes">
          <Span className={BTN_TEXT_PRIMARY}>{saving ? 'Saving…' : 'Save changes'}</Span>
        </Button>
      </Div>
    </AdminPage>
  );
}
