/* Ported from Frontend/src/modules/Hotel/app/admin/pages/AdminLegalPages.jsx (tools/port.js first pass). */
import React, { useEffect, useState } from 'react';
import { FileText, Shield, Info, PhoneCall, Save } from 'lucide-react-native';
import adminService from '../../../services/adminService';
import { Button, Div, H2, Input, Label, P, ScrollDiv, Textarea, Icon as UiIcon } from '../../../../components/web';
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
  return (
    <ScrollDiv className="space-y-6 pb-24">
      <Div className="flex flex-col gap-4">
        <Div>
          <H2 className="text-2xl font-bold text-gray-900">Legal & Info Pages</H2>
          <P className="text-gray-500 text-sm">Manage Terms, Privacy, About and Contact content for users and partners.</P>
        </Div>
        <Div className="flex items-center self-start gap-2 bg-white border border-gray-200 rounded-xl p-1">
          <Button
            onClick={() => setAudience('user')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg ${audience === 'user' ? 'bg-black text-white' : 'text-gray-600'}`}
          >
            User
          </Button>
          <Button
            onClick={() => setAudience('partner')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg ${audience === 'partner' ? 'bg-black text-white' : 'text-gray-600'}`}
          >
            Partner
          </Button>
        </Div>
      </Div>

      {error && <Div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-4 py-2">{error}</Div>}
      {message && <Div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl px-4 py-2">{message}</Div>}

      <Div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {SLUG_META.map(({ slug, label, icon: Icon }) => {
          const page = pages[slug] || {};
          return (
            <Div key={slug} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col">
              <Div className="flex items-center gap-3 mb-4 border-b border-gray-100 pb-3">
                <Div className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center text-gray-700">
                  <UiIcon as={Icon} size={18} />
                </Div>
                <Div>
                  <P className="text-sm font-bold text-gray-900">{label}</P>
                  <P className="text-[11px] text-gray-500 uppercase tracking-wide">{audience === 'user' ? 'User facing' : 'Partner facing'}</P>
                </Div>
              </Div>

              <Div className="space-y-3 flex-1 flex flex-col">
                <Div>
                  <Label className="block text-xs font-bold text-gray-600 mb-1">Title</Label>
                  <Input
                    type="text"
                    value={page.title || label}
                    onChange={(e) => handleFieldChange(slug, 'title', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-black/70"
                  />
                </Div>
                <Div className="flex-1 flex flex-col">
                  <Label className="block text-xs font-bold text-gray-600 mb-1">Content</Label>
                  <Textarea
                    rows={6}
                    value={page.content || ''}
                    onChange={(e) => handleFieldChange(slug, 'content', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-black/70 resize-none"
                    placeholder="Write the copy that will appear on web and app."
                  />
                </Div>
              </Div>
            </Div>
          );
        })}
      </Div>

      <Div className="flex justify-end pt-2">
        <Button
          onClick={handleSaveAll}
          disabled={saving || loading}
          className="flex flex-row items-center gap-2 px-6 py-3 bg-black text-white text-sm font-bold rounded-xl shadow-lg hover:bg-gray-900 active:scale-95 disabled:opacity-60 disabled:active:scale-100 transition-transform"
        >
          <UiIcon as={Save} size={16} />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </Div>
    </ScrollDiv>
  );
};
export default AdminLegalPages;
