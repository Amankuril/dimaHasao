/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/promotions/BannerImage.jsx (tools/port.js first pass). */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Image as ImageIcon, Loader2, Plus, Save, Trash2, Upload } from 'lucide-react-native';
import { useLocation, useNavigate } from '../../../../../lib/webRouter';
import {
  AdminPage,
  PageHeader,
  Card,
  Toolbar,
  DataTable,
  THead,
  TBody,
  Row,
  Cell,
  StatusBadge,
  Pagination,
  TableSkeleton,
  EmptyState,
  ErrorState,
  Field,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
} from '../../../../../admin/ui';
import { Button, CheckBox, Div, Form, Img, Input, Option, Select, Span, Icon as UiIcon } from '../../../../../components/web';
import { alert, window } from '../../../../../lib/webShim';
import { objectUrl, pickImage } from '../../../../../lib/files';
import fileToDataUrl from './fileToDataUrl';
import { API_BASE_URL } from '../../../../shared/api/runtimeConfig';
const LIST_PATH = '/taxi/admin/promotions/banner-image';
const CREATE_PATH = '/taxi/admin/promotions/banner-image/create';
const COLS = [220, 120, 80];
const createInitialFormData = () => ({
  image: null,
  image_url: '',
  use_url: false,
});
const BannerImage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isCreateRoute = location.pathname === CREATE_PATH;
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(createInitialFormData);
  const [imagePreview, setImagePreview] = useState(null);
  const token = localStorage.getItem('adminToken') || '';
  const baseUrl = API_BASE_URL + '/admin';
  const resolveImageUrl = useCallback(
    (img) => {
      if (!img) return null;
      if (img.startsWith('data:') || img.startsWith('http')) return img;
      const rootUrl = baseUrl.replace('/api/v1/admin', '');
      return `${rootUrl}/${img.startsWith('/') ? img.slice(1) : img}`;
    },
    [baseUrl],
  );
  const syncBannersToHomeSettings = useCallback(
    async (bannersList) => {
      if (!token) return;
      try {
        const homeRes = await fetch(`${API_BASE_URL}/admin/general-settings/user-home-management`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!homeRes.ok) return;
        const homeData = await homeRes.json();
        const currentSettings = homeData.settings || {};
        const nextPromos = bannersList.map((b, idx) => ({
          id: b._id || b.id || String(idx + 1),
          title: b.title || 'Experience A New Standard With Dima Hasao',
          subtitle: b.subtitle || 'A premier private hire service where luxury and reliability converge.',
          imageUrl: b.image || '',
          image: b.image || '',
          route: b.redirect_url || b.external_link || b.deep_link || '/taxi/user/ride/select-location',
          status: b.active !== false ? 'active' : 'inactive',
          order: idx + 1,
        }));
        const updatedSettings = {
          ...currentSettings,
          promos: nextPromos,
        };
        await fetch(`${API_BASE_URL}/admin/general-settings/user-home-management`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            settings: updatedSettings,
          }),
        });
      } catch (error) {
        console.error('Failed to sync banners to home settings:', error);
      }
    },
    [token],
  );
  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const bootstrapRes = await fetch(`${API_BASE_URL}/admin/promotions/bootstrap`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (bootstrapRes.ok) {
        const bootstrapData = await bootstrapRes.json();
        if (bootstrapData.success) {
          const items = bootstrapData.data?.banners || [];
          setBanners(items);
          syncBannersToHomeSettings(items);
          return;
        }
      }
      const res = await fetch(`${baseUrl}/banners`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const items = data.data?.results || (Array.isArray(data.data) ? data.data : data.results || []);
          setBanners(items);
          syncBannersToHomeSettings(items);
        } else {
          setBanners([]);
        }
      } else {
        setBanners([]);
      }
    } catch (error) {
      console.error('Error fetching banners:', error);
      setLoadError(error?.message || 'Failed to load banners');
      setBanners([]);
    } finally {
      setLoading(false);
    }
  }, [baseUrl, token, syncBannersToHomeSettings]);
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  useEffect(() => {
    if (!isCreateRoute) {
      setFormData(createInitialFormData());
      setImagePreview(null);
    }
  }, [isCreateRoute]);
  const rows = useMemo(() => banners, [banners]);
  const handleImageChange = async () => {
    const file = await pickImage();
    if (!file) return;
    setFormData((current) => ({
      ...current,
      image: file,
      use_url: false,
      image_url: '',
    }));
    setImagePreview(objectUrl(file));
  };
  const handleSave = async (event) => {
    event.preventDefault();
    if (!formData.use_url && !formData.image) {
      alert('Please upload a banner image');
      return;
    }
    if (formData.use_url && !formData.image_url.trim()) {
      alert('Please enter an image URL');
      return;
    }
    setSaving(true);
    try {
      let imageData = formData.use_url ? formData.image_url.trim() : '';
      if (!formData.use_url && formData.image) {
        imageData = await fileToDataUrl(formData.image);
      }
      const payload = {
        image: imageData,
        image_url: formData.image_url.trim(),
        use_url: formData.use_url,
      };
      const res = await fetch(`${baseUrl}/banners`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setFormData(createInitialFormData());
        setImagePreview(null);
        await fetchData();
        navigate(LIST_PATH);
      } else {
        alert(data.message || 'Failed to save banner');
      }
    } catch (error) {
      console.error('Save banner error:', error);
      alert(`Network Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = async (id) => {
    if (!(await window.confirmAsync('Are you sure you want to delete this banner?'))) return;
    try {
      const res = await fetch(`${baseUrl}/banners/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        await fetchData();
      }
    } catch (error) {
      console.error('Delete banner error:', error);
    }
  };
  const toggleStatus = async (item) => {
    const id = item._id || item.id;
    try {
      const res = await fetch(`${baseUrl}/banners/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          active: !item.active,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setBanners((current) => {
          const nextBanners = current.map((banner) =>
            (banner._id || banner.id) === id
              ? {
                  ...banner,
                  active: !item.active,
                }
              : banner,
          );
          syncBannersToHomeSettings(nextBanners);
          return nextBanners;
        });
      }
    } catch (error) {
      console.error('Banner status toggle error:', error);
    }
  };
  return (
    <AdminPage maxWidth={isCreateRoute ? 720 : 1200}>
      <PageHeader
        icon={ImageIcon}
        title={isCreateRoute ? 'Create banner image' : 'Banner images'}
        subtitle={isCreateRoute ? 'A 500 × 100 banner for the rider home screen' : 'Banners shown on the rider home screen'}
        breadcrumb={[{ label: 'Promotions' }, { label: 'Banner image' }, ...(isCreateRoute ? [{ label: 'Create' }] : [])]}
        actions={
          isCreateRoute ? (
            <Button type="button" onClick={() => navigate(LIST_PATH)} className={BTN_SECONDARY}>
              <UiIcon as={ArrowLeft} size={16} className="text-slate-600" />
              <Span className={BTN_TEXT_SECONDARY}>Back</Span>
            </Button>
          ) : (
            <Button type="button" onClick={() => navigate(CREATE_PATH)} className={BTN_PRIMARY}>
              <UiIcon as={Plus} size={16} className="text-white" />
              <Span className={BTN_TEXT_PRIMARY}>Add banner image</Span>
            </Button>
          )
        }
      />

      {!isCreateRoute ? (
        <>
          <Card className="mb-4">
            <Toolbar className="mb-0">
              <Span className="text-sm text-slate-700">Show</Span>
              <Select className={`${INPUT} w-24`}>
                <Option>10</Option>
                <Option>25</Option>
                <Option>50</Option>
              </Select>
              <Span className="text-sm text-slate-700">entries</Span>
            </Toolbar>
          </Card>

          {loading ? (
            <TableSkeleton rows={4} />
          ) : loadError ? (
            <ErrorState title="Could not load banners" message={loadError} onRetry={fetchData} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={ImageIcon}
              title="No banners yet"
              message="Add a banner image and it will show on the rider home screen."
              actionLabel="Add banner image"
              onAction={() => navigate(CREATE_PATH)}
            />
          ) : (
            <>
              <DataTable cols={COLS}>
                <THead cols={COLS} labels={['Image', 'Status', 'Action']} />
                <TBody>
                  {rows.map((item, i) => (
                    <Row key={item._id || item.id} last={i === rows.length - 1}>
                      <Cell width={COLS[0]}>
                        <Div className="h-12 w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50 items-center justify-center">
                          {item.image ? (
                            <Img src={resolveImageUrl(item.image)} alt="Banner" className="h-full w-full" contentFit="cover" />
                          ) : (
                            <UiIcon as={ImageIcon} size={16} className="text-slate-400" />
                          )}
                        </Div>
                      </Cell>
                      <Cell width={COLS[1]}>
                        <Button
                          type="button"
                          onClick={() => toggleStatus(item)}
                          accessibilityLabel={item.active ? 'Deactivate banner' : 'Activate banner'}
                          className="h-11 justify-center"
                        >
                          <StatusBadge status={item.active ? 'active' : 'inactive'} label={item.active ? 'Active' : 'Inactive'} />
                        </Button>
                      </Cell>
                      <Cell width={COLS[2]} align="right">
                        <Button
                          type="button"
                          onClick={() => handleDelete(item._id || item.id)}
                          accessibilityLabel="Delete banner"
                          className="w-11 h-11 items-center justify-center rounded-lg border border-slate-200 bg-white"
                        >
                          <UiIcon as={Trash2} size={16} className="text-red-600" />
                        </Button>
                      </Cell>
                    </Row>
                  ))}
                </TBody>
              </DataTable>
              <Pagination page={1} pages={1} total={rows.length} onPrev={() => {}} onNext={() => {}} />
            </>
          )}
        </>
      ) : (
        <Form onSubmit={handleSave}>
          <Card className="gap-4">
          <Field label="Banner image" required hint="500 px × 100 px works best.">
            {imagePreview ? (
              <Div className="gap-3">
                <Img src={imagePreview} alt="Banner preview" className="h-28 w-full rounded-lg border border-slate-200 bg-slate-50" contentFit="contain" />
                <Button
                  type="button"
                  onClick={() => {
                    setImagePreview(null);
                    setFormData((current) => ({
                      ...current,
                      image: null,
                    }));
                  }}
                  className={`${BTN_SECONDARY} self-start`}
                >
                  <Span className={BTN_TEXT_SECONDARY}>Remove image</Span>
                </Button>
              </Div>
            ) : (
              <Button
                type="button"
                onClick={handleImageChange}
                accessibilityLabel="Upload banner image"
                className="rounded-lg border border-slate-300 bg-white items-center justify-center gap-2 py-8"
              >
                <UiIcon as={Upload} size={24} className="text-slate-400" />
                <Span className="text-sm font-semibold text-slate-700">Upload image</Span>
              </Button>
            )}
          </Field>

          <Div className="flex-row items-center gap-2">
            <CheckBox
              checked={formData.use_url}
              onChange={(e) => {
                const checked = e.target.checked;
                setFormData((current) => ({
                  ...current,
                  use_url: checked,
                  image: checked ? null : current.image,
                }));
                if (checked) {
                  setImagePreview(null);
                }
              }}
            />
            <Span className="text-sm text-slate-700">Use image URL</Span>
          </Div>

          {formData.use_url ? (
            <Field label="Image URL">
              <Input
                type="url"
                value={formData.image_url}
                onChange={(e) =>
                  setFormData((current) => ({
                    ...current,
                    image_url: e.target.value,
                  }))
                }
                className={INPUT}
                placeholder="https://example.com/banner.jpg"
              />
            </Field>
          ) : null}

            <Button type="submit" disabled={saving} className={`${BTN_PRIMARY} self-start ${saving ? 'opacity-60' : ''}`}>
              {saving ? <UiIcon as={Loader2} size={16} className="text-white" /> : <UiIcon as={Save} size={16} className="text-white" />}
              <Span className={BTN_TEXT_PRIMARY}>Save</Span>
            </Button>
          </Card>
        </Form>
      )}
    </AdminPage>
  );
};
export default BannerImage;
