/* Ported from Frontend/src/modules/Hotel/app/admin/pages/AdminLegalPages.jsx (tools/port.js first pass). */
import React, { useEffect, useState } from 'react';
import { FileText, Shield, Info, PhoneCall, Save } from 'lucide-react-native';
import adminService from '../../../services/adminService';
import { Button, Div, Input, P, Span, Textarea, Icon as UiIcon } from '../../../../components/web';
import {
  AdminPage,
  PageHeader,
  Card,
  Field,
  LoadingState,
  ErrorState,
  StatusBadge,
  useLayoutWidth,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
} from '../../../../admin/ui';
const SLUG_META = [
  {
    slug: 'terms',
    label: 'Terms & Conditions',
    icon: FileText,
  },
  {
    slug: 'privacy',
    label: 'Privacy Policy',
    icon: Shield,
  },
  {
    slug: 'about',
    label: 'About Us',
    icon: Info,
  },
  {
    slug: 'contact',
    label: 'Contact Us',
    icon: PhoneCall,
  },
];
const AdminLegalPages = () => {
  const [audience, setAudience] = useState('user');
  const [pages, setPages] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { tablet } = useLayoutWidth();
  const loadPages = async (aud) => {
    setLoading(true);
    setError('');
    try {
      const res = await adminService.getLegalPages({
        audience: aud,
      });
      const map = {};
      (res.pages || []).forEach((p) => {
        map[p.slug] = p;
      });
      setPages(map);
    } catch (e) {
      setError('Unable to fetch legal pages. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadPages(audience);
  }, [audience]);
  const handleFieldChange = (slug, field, value) => {
    setPages((prev) => {
      const current = prev[slug] || {
        slug,
        audience,
      };
      return {
        ...prev,
        [slug]: {
          ...current,
          [field]: value,
        },
      };
    });
  };
  const handleSaveAll = async () => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const entries = SLUG_META.map(({ slug, label }) => {
        const page = pages[slug] || {};
        return {
          audience,
          slug,
          title: page.title || label,
          content: page.content || '',
          isActive: page.isActive !== false,
        };
      });
      for (const entry of entries) {
        await adminService.saveLegalPage(entry);
      }
      setMessage('Legal pages saved successfully.');
      await loadPages(audience);
    } catch (e) {
      setError('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  const loadFailed = !!error && Object.keys(pages).length === 0;
  return (
    <AdminPage maxWidth={900}>
      <PageHeader
        icon={FileText}
        title="Legal & Info Pages"
        subtitle="Manage Terms, Privacy, About and Contact content for users and partners."
        breadcrumb={[{ label: 'Hotel' }, { label: 'Legal & Content' }]}
        actions={
          <>
            <Button onClick={() => setAudience('user')} className={audience === 'user' ? BTN_PRIMARY : BTN_SECONDARY}>
              <Span className={audience === 'user' ? BTN_TEXT_PRIMARY : BTN_TEXT_SECONDARY}>User</Span>
            </Button>
            <Button onClick={() => setAudience('partner')} className={audience === 'partner' ? BTN_PRIMARY : BTN_SECONDARY}>
              <Span className={audience === 'partner' ? BTN_TEXT_PRIMARY : BTN_TEXT_SECONDARY}>Partner</Span>
            </Button>
          </>
        }
      />

      {loadFailed ? (
        <ErrorState title="Could not load the pages" message={error} onRetry={() => loadPages(audience)} />
      ) : loading ? (
        <LoadingState label="Loading legal pages…" />
      ) : (
        <>
          {error ? (
            <Card className="mb-4 bg-red-100 border-red-200">
              <P className="text-sm text-red-700">{error}</P>
            </Card>
          ) : null}
          {message ? (
            <Card className="mb-4 bg-green-100 border-green-200">
              <P className="text-sm text-green-700">{message}</P>
            </Card>
          ) : null}

          <Div className={tablet ? 'flex-row flex-wrap gap-3 mb-4' : 'gap-3 mb-4'}>
            {SLUG_META.map(({ slug, label, icon: Icon }) => {
              const page = pages[slug] || {};
              return (
                <Card key={slug} className={`gap-3 ${tablet ? 'flex-1 min-w-[300px]' : ''}`}>
                  <Div className="flex-row items-center gap-3 pb-3 border-b border-slate-200">
                    <Div className="w-10 h-10 rounded-lg bg-slate-100 items-center justify-center shrink-0">
                      <UiIcon as={Icon} size={18} className="text-slate-600" />
                    </Div>
                    <Div className="flex-1 min-w-0">
                      <P numberOfLines={1} className="text-base font-semibold text-slate-900">
                        {label}
                      </P>
                      <P className="text-xs text-slate-500">{audience === 'user' ? 'User facing' : 'Partner facing'}</P>
                    </Div>
                    <StatusBadge status={page.isActive === false ? 'inactive' : 'active'} label={page.isActive === false ? 'Hidden' : 'Live'} />
                  </Div>

                  <Field label="Title">
                    <Input type="text" value={page.title || label} onChange={(e) => handleFieldChange(slug, 'title', e.target.value)} className={INPUT} />
                  </Field>
                  <Field label="Content" hint="Shown on both web and the app.">
                    <Textarea
                      rows={6}
                      value={page.content || ''}
                      onChange={(e) => handleFieldChange(slug, 'content', e.target.value)}
                      className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
                      placeholder="Write the copy that will appear on web and app."
                    />
                  </Field>
                </Card>
              );
            })}
          </Div>

          <Div className="flex-row justify-end">
            <Button onClick={handleSaveAll} disabled={saving || loading} className={`${BTN_PRIMARY} ${saving || loading ? 'opacity-60' : ''}`}>
              <UiIcon as={Save} size={16} className="text-white" />
              <Span className={BTN_TEXT_PRIMARY}>{saving ? 'Saving…' : 'Save Changes'}</Span>
            </Button>
          </Div>
        </>
      )}
    </AdminPage>
  );
};
export default AdminLegalPages;
