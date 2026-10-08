/* Ported from Frontend/src/modules/Food/pages/admin/system/DiningManagement.jsx (tools/port.js first pass). */
import { useState, useEffect } from 'react';
import {
  Upload,
  Trash2,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Layout,
  Tag,
  UtensilsCrossed,
  Edit,
  X,
} from 'lucide-react-native';
import api, { adminAPI, uploadAPI } from '../../../../api/food';
import { getModuleToken } from '../../../../admin/session';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  Field,
  INPUT,
  LoadingState,
  EmptyState,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../admin/ui';
import { prepareUploadFile } from '../../../../lib/images';
import { pickImage, objectUrl } from '../../../../lib/files';
import { Button, Div, Img, Input, Span, Icon as UiIcon } from '../../../../components/web';
import { Text } from '../../../../components/Text';
import { tw } from '../../../../lib/tw';
import { window } from '../../../../lib/webShim';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
export default function DiningManagement() {
  const [activeTab, setActiveTab] = useState('categories');

  // Categories
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesUploading, setCategoriesUploading] = useState(false);
  const [categoriesDeleting, setCategoriesDeleting] = useState(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryFile, setCategoryFile] = useState(null);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingCategoryImageUrl, setEditingCategoryImageUrl] = useState('');

  // Banners
  const [banners, setBanners] = useState([]);
  const [bannersLoading, setBannersLoading] = useState(true);
  const [bannersUploading, setBannersUploading] = useState(false);
  const [bannersDeleting, setBannersDeleting] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPercentageOff, setBannerPercentageOff] = useState('');
  const [bannerTagline, setBannerTagline] = useState('');

  // Common
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const getAuthConfig = (additionalConfig = {}) => {
    const adminToken = getModuleToken('admin');
    if (!adminToken) return additionalConfig;
    return {
      ...additionalConfig,
      headers: {
        ...additionalConfig.headers,
        Authorization: `Bearer ${adminToken.trim()}`,
      },
    };
  };
  useEffect(() => {
    fetchCategories();
  }, []);
  useEffect(() => {
    setError(null);
    setSuccess(null);
    if (activeTab === 'banners') {
      fetchBanners();
    }
  }, [activeTab]);

  // ==================== CATEGORIES ====================
  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await adminAPI.getDiningCategories();
      if (response.data.success) setCategories(response.data.data.categories || []);
    } catch (err) {
      debugError(err);
    } finally {
      setCategoriesLoading(false);
    }
  };
  const resetCategoryForm = () => {
    setCategoryName('');
    setCategoryFile(null);
    setEditingCategoryId(null);
    setEditingCategoryImageUrl('');
  };
  const handleEditCategory = (category) => {
    setError(null);
    setSuccess(null);
    setEditingCategoryId(category._id);
    setCategoryName(category.name || '');
    setCategoryFile(null);
    setEditingCategoryImageUrl(category.imageUrl || '');
  };
  const handleSubmitCategory = async () => {
    const trimmedCategoryName = categoryName.trim();
    if (!trimmedCategoryName) return setError('Category name is required');
    if (!editingCategoryId && !categoryFile) return setError('Name and Image are required');
    try {
      setError(null);
      setSuccess(null);
      setCategoriesUploading(true);
      let imageUrl = editingCategoryImageUrl;
      if (categoryFile) {
        const uploadResponse = await uploadAPI.uploadMedia(categoryFile, {
          folder: 'Dima Hasao/dining/categories',
        });
        imageUrl = uploadResponse?.data?.data?.url || '';
      }
      const response = editingCategoryId
        ? await adminAPI.updateDiningCategory(editingCategoryId, {
            name: trimmedCategoryName,
            ...(imageUrl
              ? {
                  imageUrl,
                }
              : {}),
          })
        : await adminAPI.createDiningCategory({
            name: trimmedCategoryName,
            imageUrl,
          });
      if (response.data.success) {
        setSuccess(editingCategoryId ? 'Category updated successfully' : 'Category created successfully');
        resetCategoryForm();
        fetchCategories();
      }
    } catch (err) {
      setError(err.response?.data?.message || (editingCategoryId ? 'Failed to update category' : 'Failed to create category'));
    } finally {
      setCategoriesUploading(false);
    }
  };
  const handleDeleteCategory = async (id) => {
    if (!(await window.confirmAsync('Delete this category?'))) return;
    try {
      setCategoriesDeleting(id);
      await adminAPI.deleteDiningCategory(id);
      fetchCategories();
      setSuccess('Category deleted');
    } catch (err) {
      setError('Failed to delete category');
    } finally {
      setCategoriesDeleting(null);
    }
  };

  // ==================== BANNERS ====================
  const fetchBanners = async () => {
    try {
      setBannersLoading(true);
      const response = await api.get('/food/hero-banners/dining', getAuthConfig());
      if (response.data.success) {
        setBanners(response.data.data.banners || []);
      } else {
        setBanners([]);
      }
    } catch (err) {
      debugError(err);
      setBanners([]);
    } finally {
      setBannersLoading(false);
    }
  };
  const handleSubmitBanner = async () => {
    setError(null);
    setSuccess(null);
    if (!bannerFile) {
      return setError('Banner image is required');
    }
    try {
      setBannersUploading(true);
      const formData = new FormData();
      formData.append('files', await prepareUploadFile(bannerFile));
      if (bannerTagline.trim()) formData.append('title', bannerTagline.trim());
      if (bannerPercentageOff.trim()) formData.append('ctaText', bannerPercentageOff.trim());
      const response = await api.post(
        '/food/hero-banners/dining/multiple',
        formData,
        getAuthConfig({
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }),
      );
      if (response.data.success) {
        setSuccess('Dining page banner created successfully');
        resetBannerForm();
        fetchBanners();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create dining page banner');
    } finally {
      setBannersUploading(false);
    }
  };
  const resetBannerForm = () => {
    setBannerFile(null);
    setBannerPercentageOff('');
    setBannerTagline('');
  };
  const handleDeleteBanner = async (id) => {
    if (!(await window.confirmAsync('Delete this banner?'))) return;
    try {
      setBannersDeleting(id);
      await api.delete(`/food/hero-banners/dining/${id}`, getAuthConfig());
      fetchBanners();
      setSuccess('Banner deleted');
    } catch (err) {
      setError('Failed to delete banner');
    } finally {
      setBannersDeleting(null);
    }
  };
  const tabs = [
    {
      id: 'categories',
      label: 'Dining Categories',
      icon: Layout,
    },
    {
      id: 'banners',
      label: 'Dining Banners',
      icon: ImageIcon,
    },
  ];
  const { tablet, wide } = useLayoutWidth();
  const formCol = tablet ? { width: '34%' } : { width: '100%' };
  const listCol = tablet ? { width: '62%' } : { width: '100%' };
  const tileCol = wide ? { width: '31.5%' } : tablet ? { width: '48%' } : { width: '100%' };
  const bannerCol = tablet ? { width: '48%' } : { width: '100%' };
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={UtensilsCrossed}
        title="Dining Management"
        subtitle="Manage dining categories and the banners on the dining page"
        breadcrumb={[{ label: 'Food' }, { label: 'System' }, { label: 'Dining' }]}
      />

      <Card className="mb-4" padded={false}>
        <Div className="flex-row flex-wrap gap-2 p-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const on = activeTab === tab.id;
            return (
              <Button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-row items-center gap-2 h-11 px-4 rounded-lg ${on ? 'bg-blue-600' : 'bg-white'}`}>
                <UiIcon as={Icon} size={16} className={on ? 'text-white' : 'text-slate-600'} />
                <Span className={on ? 'text-sm font-semibold text-white' : 'text-sm font-semibold text-slate-600'}>{tab.label}</Span>
              </Button>
            );
          })}
        </Div>
      </Card>

      {success ? (
        <Card className="mb-4 bg-green-50 border-green-200 flex-row items-center gap-2">
          <UiIcon as={CheckCircle2} size={16} className="text-green-700 shrink-0" />
          <Text style={tw`text-sm text-slate-700 flex-1`}>{success}</Text>
        </Card>
      ) : null}
      {error ? (
        <Card className="mb-4 bg-red-50 border-red-200 flex-row items-center gap-2">
          <UiIcon as={AlertCircle} size={16} className="text-red-700 shrink-0" />
          <Text style={tw`text-sm text-slate-700 flex-1`}>{error}</Text>
        </Card>
      ) : null}

      {activeTab === 'categories' ? (
        <Div className="flex-row flex-wrap gap-4">
          <Div style={formCol}>
            <Card>
              <SectionTitle
                action={
                  editingCategoryId ? (
                    <Button type="button" onClick={resetCategoryForm} className={BTN_SECONDARY}>
                      <UiIcon as={X} size={16} className="text-slate-600" />
                      <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
                    </Button>
                  ) : null
                }
              >
                {editingCategoryId ? 'Edit Category' : 'Add Category'}
              </SectionTitle>
              <Div className="gap-3">
                <Field label="Name" required>
                  <Input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="Category Name" className={INPUT} />
                </Field>
                <Field label={editingCategoryId ? 'Replace Image' : 'Image'} required={!editingCategoryId}>
                  <Div className="gap-2">
                    <Div className="flex-row flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        onClick={async () => {
                          const picked = await pickImage();
                          if (picked) setCategoryFile(picked);
                        }}
                        className={BTN_SECONDARY}
                      >
                        <UiIcon as={Upload} size={16} className="text-slate-600" />
                        <Span className={BTN_TEXT_SECONDARY}>Choose Image</Span>
                      </Button>
                      {categoryFile ? (
                        <Text style={tw`text-xs text-slate-500 flex-1`} numberOfLines={2}>
                          {categoryFile.name}
                        </Text>
                      ) : null}
                    </Div>
                    {categoryFile ? (
                      <Img src={objectUrl(categoryFile)} alt={categoryFile.name} className="w-24 h-24 rounded-lg object-cover border border-slate-200" />
                    ) : null}
                    {editingCategoryId && editingCategoryImageUrl && !categoryFile ? (
                      <Div className="gap-1">
                        <Img src={editingCategoryImageUrl} alt={categoryName || 'Current category'} className="w-24 h-24 rounded-lg object-cover border border-slate-200" />
                        <Text style={tw`text-xs text-slate-500`}>Current image will be kept unless you select a new one.</Text>
                      </Div>
                    ) : null}
                  </Div>
                </Field>
                <Button onClick={handleSubmitCategory} disabled={categoriesUploading} className={BTN_PRIMARY}>
                  {categoriesUploading ? (
                    <UiIcon as={Loader2} size={16} className="text-white" />
                  ) : (
                    <Span className={BTN_TEXT_PRIMARY}>{editingCategoryId ? 'Update Category' : 'Create Category'}</Span>
                  )}
                </Button>
              </Div>
            </Card>
          </Div>
          <Div style={listCol}>
            <Card>
              <SectionTitle>Categories List</SectionTitle>
              {categoriesLoading ? (
                <LoadingState label="Loading categories…" />
              ) : categories.length === 0 ? (
                <EmptyState icon={Tag} title="No categories yet" message="Create a dining category with the form beside this list." actionLabel="Refresh" onAction={fetchCategories} />
              ) : (
                <Div className="flex-row flex-wrap gap-3">
                  {categories.map((cat) => (
                    <Div key={cat._id} style={tileCol} className="border border-slate-200 rounded-xl overflow-hidden">
                      <Img src={cat.imageUrl} alt={cat.name} className="w-full h-32 object-cover" />
                      <Div className="p-3 bg-white flex-row items-center gap-2">
                        <Text style={tw`text-sm font-semibold text-slate-900 flex-1`} numberOfLines={2}>
                          {cat.name}
                        </Text>
                        <Button onClick={() => handleEditCategory(cat)} accessibilityLabel={`Edit ${cat.name}`} className="w-11 h-11 rounded-lg items-center justify-center">
                          <UiIcon as={Edit} size={16} className="text-blue-600" />
                        </Button>
                        <Button onClick={() => handleDeleteCategory(cat._id)} accessibilityLabel={`Delete ${cat.name}`} className="w-11 h-11 rounded-lg items-center justify-center">
                          <UiIcon as={categoriesDeleting === cat._id ? Loader2 : Trash2} size={16} className="text-red-600" />
                        </Button>
                      </Div>
                    </Div>
                  ))}
                </Div>
              )}
            </Card>
          </Div>
        </Div>
      ) : null}

      {activeTab === 'banners' ? (
        <Div className="flex-row flex-wrap gap-4">
          <Div style={formCol}>
            <Card>
              <SectionTitle>Add Dining Page Banner</SectionTitle>
              <Text style={tw`text-sm text-slate-500 mb-3`}>This banner shows on the user dining page and is not linked to any restaurant.</Text>
              <Div className="gap-3">
                <Field label="Image" required>
                  <Div className="gap-2">
                    <Div className="flex-row flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        onClick={async () => {
                          const picked = await pickImage();
                          setBannerFile(picked || null);
                          setError(null);
                        }}
                        className={BTN_SECONDARY}
                      >
                        <UiIcon as={Upload} size={16} className="text-slate-600" />
                        <Span className={BTN_TEXT_SECONDARY}>Choose Image</Span>
                      </Button>
                      {bannerFile ? (
                        <Text style={tw`text-xs text-slate-500 flex-1`} numberOfLines={2}>
                          {bannerFile.name}
                        </Text>
                      ) : null}
                    </Div>
                    {bannerFile ? <Img src={objectUrl(bannerFile)} alt={bannerFile.name} className="w-full h-32 rounded-lg object-cover border border-slate-200" /> : null}
                  </Div>
                </Field>
                <Field label="Promo Text" hint="Optional, e.g. 50% OFF">
                  <Input
                    value={bannerPercentageOff}
                    onChange={(e) => {
                      setBannerPercentageOff(e.target.value);
                      setError(null);
                    }}
                    placeholder="Optional, e.g. 50% OFF"
                    className={INPUT}
                  />
                </Field>
                <Field label="Tagline" hint="Optional, e.g. Weekend dining specials">
                  <Input
                    value={bannerTagline}
                    onChange={(e) => {
                      setBannerTagline(e.target.value);
                      setError(null);
                    }}
                    placeholder="Optional, e.g. Weekend dining specials"
                    className={INPUT}
                  />
                </Field>
                <Button onClick={handleSubmitBanner} disabled={bannersUploading} className={BTN_PRIMARY}>
                  {bannersUploading ? <UiIcon as={Loader2} size={16} className="text-white" /> : <Span className={BTN_TEXT_PRIMARY}>Create Banner</Span>}
                </Button>
              </Div>
            </Card>
          </Div>
          <Div style={listCol}>
            <Card>
              <SectionTitle>Dining Page Banners</SectionTitle>
              {bannersLoading ? (
                <LoadingState label="Loading banners…" />
              ) : banners.length === 0 ? (
                <EmptyState icon={ImageIcon} title="No banners yet" message="Add a banner with the form beside this list." actionLabel="Refresh" onAction={fetchBanners} />
              ) : (
                <Div className="flex-row flex-wrap gap-3">
                  {banners.map((banner) => (
                    <Div key={banner._id} style={bannerCol} className="border border-slate-200 rounded-xl overflow-hidden">
                      <Img src={banner.imageUrl} alt={banner.title || 'Dining banner'} className="w-full h-32 object-cover" />
                      <Div className="p-3 bg-white flex-row items-start gap-2">
                        <Div className="flex-1 min-w-0 gap-1">
                          {banner.ctaText ? (
                            <Text style={tw`text-sm font-semibold text-slate-900`} numberOfLines={2}>
                              {banner.ctaText}
                            </Text>
                          ) : null}
                          {banner.title ? (
                            <Text style={tw`text-sm text-slate-500`} numberOfLines={2}>
                              {banner.title}
                            </Text>
                          ) : null}
                          <Text style={tw`text-xs text-slate-500`}>{banner.isActive === false ? 'Inactive' : 'Active on dining page'}</Text>
                        </Div>
                        <Button
                          onClick={() => handleDeleteBanner(banner._id)}
                          accessibilityLabel="Delete banner"
                          className="w-11 h-11 rounded-lg items-center justify-center shrink-0"
                        >
                          <UiIcon as={bannersDeleting === banner._id ? Loader2 : Trash2} size={16} className="text-red-600" />
                        </Button>
                      </Div>
                    </Div>
                  ))}
                </Div>
              )}
            </Card>
          </Div>
        </Div>
      ) : null}
    </AdminPage>
  );
}
