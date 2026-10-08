/* Ported from Frontend/src/modules/Food/pages/admin/settings/ShippingPolicy.jsx (tools/port.js first pass). */
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
export default function ShippingPolicy() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState('edit'); // "edit" | "preview"
  const [shippingData, setShippingData] = useState({
    title: 'Shipping Policy',
    content: '',
  });
  useEffect(() => {
    fetchShippingData();
  }, []);
  const fetchShippingData = async () => {
    try {
      setLoading(true);
      const response = await api.get(API_ENDPOINTS.ADMIN.SHIPPING, {
        contextModule: 'admin',
      });
      if (response.data.success) {
        setShippingData(
          unwrapLegalPage(response.data, {
            title: 'Shipping Policy',
          }),
        );
      }
    } catch (error) {
      debugError('Error fetching shipping data:', error);
      toast.error('Failed to load shipping policy');
    } finally {
      setLoading(false);
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      // Convert plain text/markdown to HTML for storage + user rendering
      const htmlContent = plainTextToLegalHtml(shippingData.content);
      const response = await api.put(
        API_ENDPOINTS.ADMIN.SHIPPING,
        {
          title: shippingData.title,
          content: htmlContent,
        },
        {
          contextModule: 'admin',
        },
      );
      if (response.data.success) {
        toast.success('Shipping policy updated successfully');
        setShippingData(
          unwrapLegalPage(response.data, {
            title: 'Shipping Policy',
          }),
        );
      }
    } catch (error) {
      debugError('Error saving shipping policy:', error);
      toast.error(error.response?.data?.message || 'Failed to save shipping policy');
    } finally {
      setSaving(false);
    }
  };
  return (
    <AdminPage maxWidth={900}>
      <PageHeader
        icon={FileText}
        title="Shipping Policy"
        subtitle="Manage the shipping policy customers and partners read in the apps."
        breadcrumb={[{ label: 'Food' }, { label: 'Settings' }, { label: 'Shipping Policy' }]}
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
        <LoadingState label="Loading the shipping policy…" />
      ) : viewMode === 'edit' ? (
        <Card>
          <SectionTitle>Content</SectionTitle>
          <Field hint="Use # and ## for headings and **text** for bold.">
            <Textarea
              value={shippingData.content}
              onChange={(e) =>
                setShippingData((prev) => ({
                  ...prev,
                  content: e.target.value,
                }))
              }
              placeholder="Enter shipping policy content..."
              rows={14}
              className="px-3 py-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-700"
              style={{ textAlign: 'left', width: '100%' }}
            />
          </Field>
        </Card>
      ) : shippingData.content ? (
        <Card>
          <SectionTitle>Preview</SectionTitle>
          <HtmlContent html={plainTextToLegalHtml(shippingData.content)} soraHeadings={false} color="#334155" />
        </Card>
      ) : (
        <EmptyState
          title="Nothing written yet"
          message="This shipping policy is empty, so customers see no policy in the app."
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
