/* Ported from Frontend/src/modules/Food/pages/admin/settings/SupportCMS.jsx (tools/port.js first pass). */
import { useState, useEffect } from 'react';
import { toast } from '../../../../lib/notify';
import api from '../../../../api/food';
import { Textarea } from '../../../../components/shadcn';
import { legalHtmlToPlainText, plainTextToLegalHtml } from '../../../utils/legalContentFormat';
import { Button, Div, H4, Input, P, Span, Strong } from '../../../../components/web';
import { LifeBuoy } from 'lucide-react-native';
import { AdminPage, PageHeader, Card, SectionTitle, Toolbar, Field, LoadingState, EmptyState, INPUT, BTN_PRIMARY, BTN_SECONDARY, BTN_TEXT_PRIMARY, BTN_TEXT_SECONDARY, useLayoutWidth } from '../../../../admin/ui';
import HtmlContent from '../../../../components/HtmlContent';
const debugError = (...args) => {};
export default function SupportCMS() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState('edit'); // "edit" | "preview"
  const [activeRole, setActiveRole] = useState('user'); // "user" | "restaurant" | "delivery"
  const [supportData, setSupportData] = useState({
    title: 'Help & Support',
    content: '',
    email: '',
    mobile: '',
    faq: '',
  });
  const [initialData, setInitialData] = useState({
    title: 'Help & Support',
    content: '',
    email: '',
    mobile: '',
    faq: '',
  });
  const hasChanges = JSON.stringify(supportData) !== JSON.stringify(initialData);
  useEffect(() => {
    fetchSupportData();
  }, [activeRole]);
  const fetchSupportData = async () => {
    try {
      setLoading(true);
      const key = `support_${activeRole}`;
      const response = await api.get(`/food/admin/pages-social-media/${key}`, {
        contextModule: 'admin',
      });
      if (response.data.success && response.data.data) {
        const raw = response.data.data;
        const textContent = legalHtmlToPlainText(raw.content || '');
        const defaultFaq = `Q: How do I track my order?\nA: You can track your order in real-time through the 'My Orders' section in your profile.\n\nQ: What if I receive a wrong item?\nA: Please contact our support immediately via call or email with your order ID for a quick resolution.\n\nQ: Can I cancel my order?\nA: Orders can only be cancelled before the restaurant starts preparing your food.\n\nHOURS: Available 24/7 for emergency support. General inquiries: 9 AM - 11 PM.\nPRIVACY: Your conversations with our support team are encrypted and secure.`;
        const newData = {
          title: raw.title || 'Help & Support',
          content: textContent,
          email: raw.email || '',
          mobile: raw.mobile || '',
          faq: raw.faq || defaultFaq,
        };
        setSupportData(newData);
        setInitialData(newData);
      } else {
        const emptyData = {
          title: 'Help & Support',
          content: '',
          email: '',
          mobile: '',
          faq: '',
        };
        setSupportData(emptyData);
        setInitialData(emptyData);
      }
    } catch (error) {
      debugError('Error fetching support data:', error);
      if (error.response?.status === 404) {
        const emptyData = {
          title: 'Help & Support',
          content: '',
          email: '',
          mobile: '',
          faq: '',
        };
        setSupportData(emptyData);
        setInitialData(emptyData);
      } else {
        toast.error('Failed to load support content');
      }
    } finally {
      setLoading(false);
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const htmlContent = plainTextToLegalHtml(supportData.content);
      const key = `support_${activeRole}`;
      const response = await api.put(
        `/food/admin/pages-social-media/${key}`,
        {
          title: supportData.title,
          content: htmlContent,
          email: supportData.email,
          mobile: supportData.mobile,
          faq: supportData.faq,
        },
        {
          contextModule: 'admin',
        },
      );
      if (response.data.success) {
        toast.success(`${activeRole.charAt(0).toUpperCase() + activeRole.slice(1)} support content updated successfully`);
        const raw = response.data.data;
        const textContent = legalHtmlToPlainText(raw.content || '');
        const savedData = {
          title: raw.title || 'Help & Support',
          content: textContent,
          email: raw.email || '',
          mobile: raw.mobile || '',
          faq: raw.faq || supportData.faq,
        };
        setSupportData(savedData);
        setInitialData(savedData);
      }
    } catch (error) {
      debugError('Error saving support:', error);
      toast.error(error.response?.data?.message || 'Failed to save support content');
    } finally {
      setSaving(false);
    }
  };
  const getRoleLabel = (role) => role.charAt(0).toUpperCase() + role.slice(1);
  const { tablet } = useLayoutWidth();
  return (
    <AdminPage maxWidth={900}>
      <PageHeader
        icon={LifeBuoy}
        title="Help & support"
        subtitle="Contact details, support copy and FAQs for each portal."
        breadcrumb={[{ label: 'Food' }, { label: 'Settings' }, { label: 'Help & support' }]}
      />

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
          Portal
        </SectionTitle>
        <Toolbar className="mb-0">
          {['user', 'restaurant', 'delivery'].map((role) => (
            <Button
              key={role}
              onClick={() => setActiveRole(role)}
              className={activeRole === role ? BTN_PRIMARY : BTN_SECONDARY}
              accessibilityLabel={`Edit ${getRoleLabel(role)} support content`}
            >
              <Span className={activeRole === role ? BTN_TEXT_PRIMARY : BTN_TEXT_SECONDARY}>{getRoleLabel(role)}</Span>
            </Button>
          ))}
        </Toolbar>
      </Card>

      {viewMode === 'edit' && (
        <Card className="mb-4">
          <SectionTitle>Contact information — {getRoleLabel(activeRole)}</SectionTitle>
          {loading ? (
            <LoadingState label="Loading contact details…" />
          ) : (
            <Div className={tablet ? 'flex-row items-start gap-3' : 'gap-3'}>
              <Field label="Support email" className={tablet ? 'flex-1' : null}>
                <Input
                  nativeID="support-email"
                  type="email"
                  value={supportData.email}
                  onChange={(e) =>
                    setSupportData((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  placeholder="support@example.com"
                  className={INPUT}
                />
              </Field>
              <Field label="Support mobile" className={tablet ? 'flex-1' : null}>
                <Input
                  nativeID="support-mobile"
                  type="text"
                  value={supportData.mobile}
                  onChange={(e) =>
                    setSupportData((prev) => ({
                      ...prev,
                      mobile: e.target.value,
                    }))
                  }
                  placeholder="+91 00000 00000"
                  className={INPUT}
                />
              </Field>
            </Div>
          )}
        </Card>
      )}

      <Card className="mb-4">
        <SectionTitle>
          {viewMode === 'preview' ? 'Previewing' : 'Editing'} {getRoleLabel(activeRole)} support content
        </SectionTitle>
        {loading ? (
          <LoadingState label="Loading support content…" />
        ) : viewMode === 'edit' ? (
          <Div className="gap-3">
            <Field label="Page title">
              <Input
                type="text"
                value={supportData.title}
                onChange={(e) =>
                  setSupportData((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                className={INPUT}
              />
            </Field>
            <Field label="Content" hint="Use # and ## for headings and **text** for bold.">
              <Textarea
                value={supportData.content}
                onChange={(e) =>
                  setSupportData((prev) => ({
                    ...prev,
                    content: e.target.value,
                  }))
                }
                placeholder={`Enter help & support content for ${activeRole} portal here...`}
                rows={10}
                className="px-3 py-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-700"
                style={{ width: '100%' }}
              />
            </Field>
          </Div>
        ) : supportData.content ? (
          <HtmlContent html={plainTextToLegalHtml(supportData.content)} soraHeadings={false} color="#475569" />
        ) : (
          <EmptyState
            title="No support content yet"
            message={`The ${getRoleLabel(activeRole)} portal has no help text saved.`}
            actionLabel="Write it now"
            onAction={() => setViewMode('edit')}
            icon={LifeBuoy}
          />
        )}
      </Card>

      <Card className="mb-4">
        <SectionTitle>FAQ — {getRoleLabel(activeRole)}</SectionTitle>
        {loading ? (
          <LoadingState label="Loading FAQs…" />
        ) : viewMode === 'edit' ? (
          <Field
            label="Questions and answers"
            hint="Write a question after Q: and its answer after A:. Use HOURS: for operational hours and PRIVACY: for the data-privacy card."
          >
            <Textarea
              value={supportData.faq}
              onChange={(e) =>
                setSupportData((prev) => ({
                  ...prev,
                  faq: e.target.value,
                }))
              }
              placeholder="Q: Question here?&#10;A: Answer here...&#10;&#10;HOURS: 9 AM - 11 PM&#10;PRIVACY: Safe and secure"
              rows={10}
              className="px-3 py-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-700"
              style={{ width: '100%' }}
            />
          </Field>
        ) : (
          (() => {
            const lines = (supportData.faq || '')
              .split('\n')
              .map((l) => l.trim())
              .filter(Boolean);
            const parsed = [];
            let currentQ = null;
            let hoursText = 'Available 24/7 for emergency support. General inquiries: 9 AM - 11 PM.';
            let privacyText = 'Your conversations with our support team are encrypted and secure.';
            for (const line of lines) {
              if (line.startsWith('Q:')) currentQ = line.substring(2).trim();
              else if (line.startsWith('A:') && currentQ) {
                parsed.push({
                  q: currentQ,
                  a: line.substring(2).trim(),
                });
                currentQ = null;
              } else if (line.startsWith('HOURS:')) hoursText = line.substring(6).trim();
              else if (line.startsWith('PRIVACY:')) privacyText = line.substring(8).trim();
            }
            return (
              <Div className="gap-4">
                {parsed.map((faq, idx) => (
                  <Div key={idx} className="gap-1.5">
                    <H4 className="text-sm font-semibold text-slate-900">Q. {faq.q}</H4>
                    <P className="text-sm text-slate-500">{faq.a}</P>
                  </Div>
                ))}
                {parsed.length === 0 &&
                  (supportData.faq ? (
                    <P className="text-sm text-slate-700">{supportData.faq}</P>
                  ) : (
                    <EmptyState title="No FAQs yet" message="Add questions in the editor so customers can self-serve." actionLabel="Add FAQs" onAction={() => setViewMode('edit')} />
                  ))}
                <Div className={tablet ? 'flex-row items-stretch gap-3 pt-3 border-t border-slate-200' : 'gap-3 pt-3 border-t border-slate-200'}>
                  <Div className="flex-1 p-4 rounded-lg border border-slate-200 bg-slate-50">
                    <Strong className="text-xs font-semibold uppercase tracking-wide text-slate-500">Operational hours</Strong>
                    <P className="text-sm text-slate-700 mt-1">{hoursText}</P>
                  </Div>
                  <Div className="flex-1 p-4 rounded-lg border border-slate-200 bg-slate-50">
                    <Strong className="text-xs font-semibold uppercase tracking-wide text-slate-500">Data privacy</Strong>
                    <P className="text-sm text-slate-700 mt-1">{privacyText}</P>
                  </Div>
                </Div>
              </Div>
            );
          })()
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
