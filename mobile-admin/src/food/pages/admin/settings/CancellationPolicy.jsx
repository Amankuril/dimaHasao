/* Ported from Frontend/src/modules/Food/pages/admin/settings/CancellationPolicy.jsx (tools/port.js first pass). */
import { useState, useEffect } from 'react';
import { toast } from '../../../../lib/notify';
import api from '../../../../api/food';
import { API_ENDPOINTS } from '../../../../api/config';
import { Textarea } from '../../../../components/shadcn';
import { unwrapLegalPage, plainTextToLegalHtml } from '../../../utils/legalContentFormat';
import { Button, Div, H1, P, ScrollDiv, Span } from '../../../../components/web';
import HtmlContent from '../../../../components/HtmlContent';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
export default function CancellationPolicy() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState('edit'); // "edit" | "preview"
  const [cancellationData, setCancellationData] = useState({
    title: 'Cancellation Policy',
    content: '',
  });
  useEffect(() => {
    fetchCancellationData();
  }, []);
  const fetchCancellationData = async () => {
    try {
      setLoading(true);
      const response = await api.get(API_ENDPOINTS.ADMIN.CANCELLATION, {
        contextModule: 'admin',
      });
      if (response.data.success) {
        setCancellationData(
          unwrapLegalPage(response.data, {
            title: 'Cancellation Policy',
          }),
        );
      }
    } catch (error) {
      debugError('Error fetching cancellation data:', error);
      toast.error('Failed to load cancellation policy');
    } finally {
      setLoading(false);
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      // Convert plain text/markdown to HTML for storage + user rendering
      const htmlContent = plainTextToLegalHtml(cancellationData.content);
      const response = await api.put(
        API_ENDPOINTS.ADMIN.CANCELLATION,
        {
          title: cancellationData.title,
          content: htmlContent,
        },
        {
          contextModule: 'admin',
        },
      );
      if (response.data.success) {
        toast.success('Cancellation policy updated successfully');
        setCancellationData(
          unwrapLegalPage(response.data, {
            title: 'Cancellation Policy',
          }),
        );
      }
    } catch (error) {
      debugError('Error saving cancellation policy:', error);
      toast.error(error.response?.data?.message || 'Failed to save cancellation policy');
    } finally {
      setSaving(false);
    }
  };
  if (loading) {
    return (
      <ScrollDiv className="h-full bg-slate-50 p-4 lg:p-6 flex items-center justify-center">
        <Div className="text-center">
          <Div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></Div>
          <P className="mt-4 text-slate-600">Loading...</P>
        </Div>
      </ScrollDiv>
    );
  }
  return (
    <ScrollDiv className="h-full bg-slate-50 p-4 lg:p-6">
      <Div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <Div className="mb-6">
          <H1 className="text-2xl font-bold text-slate-900">Cancellation Policy</H1>
          <P className="text-sm text-slate-600 mt-1">Manage your Cancellation Policy content</P>
        </Div>

        {/* Text Area */}
        <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <Div className="flex items-center justify-between gap-3 mb-3">
            <Div className="flex-1 text-sm text-slate-600">
              Use headings like <Span className="font-mono">#</Span>, <Span className="font-mono">##</Span> and bold like{' '}
              <Span className="font-mono">**text**</Span>.
            </Div>
            <Div className="inline-flex rounded-lg border border-slate-200 overflow-hidden">
              <Button
                type="button"
                onClick={() => setViewMode('edit')}
                className={`px-3 py-1.5 text-sm font-medium ${viewMode === 'edit' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
              >
                Edit
              </Button>
              <Button
                type="button"
                onClick={() => setViewMode('preview')}
                className={`px-3 py-1.5 text-sm font-medium ${viewMode === 'preview' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
              >
                Preview
              </Button>
            </Div>
          </Div>

          {viewMode === 'edit' ? (
            <Textarea
              value={cancellationData.content}
              onChange={(e) =>
                setCancellationData((prev) => ({
                  ...prev,
                  content: e.target.value,
                }))
              }
              placeholder="Enter cancellation policy content..."
              className="min-h-[600px] w-full text-sm text-slate-700 leading-relaxed resize-y"
              style={{ textAlign: 'left', width: '100%' }}
            />
          ) : (
            <Div className="min-h-[600px] w-full rounded-md border border-slate-200 bg-white p-4">
              <HtmlContent html={plainTextToLegalHtml(cancellationData.content)} soraHeadings={false} color="#334155" />
            </Div>
          )}
        </Div>

        {/* Submit Button */}
        <Div className="flex justify-end mt-6">
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Div>
      </Div>
    </ScrollDiv>
  );
}
