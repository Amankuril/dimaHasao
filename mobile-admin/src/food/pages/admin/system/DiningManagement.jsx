/* Ported from Frontend/src/modules/Food/pages/admin/system/DiningManagement.jsx (tools/port.js first pass). */
import { useState, useEffect } from 'react';
import {
  Upload,
  Trash2,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  Layout,
  Tag,
  UtensilsCrossed,
  Edit,
  X,
} from 'lucide-react-native';
import api, { adminAPI, uploadAPI } from '../../../../api/food';
import { getModuleToken } from '../../../../admin/session';
import { Input } from '../../../../components/shadcn';
import { Label } from '../../../../components/shadcn';
import { Button } from '../../../../components/shadcn';
import { prepareUploadFile } from '../../../../lib/images';
import { pickImage, objectUrl } from '../../../../lib/files';
import { Div, H1, H2, Img, P, ScrollDiv, Icon as UiIcon } from '../../../../components/web';
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
  return (
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <Div className="max-w-7xl mx-auto">
        {/* Header */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <Div className="flex items-center gap-3">
            <Div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
              <UiIcon as={UtensilsCrossed} className="w-5 h-5 text-white" />
            </Div>
            <Div>
              <H1 className="text-2xl font-bold text-slate-900">Dining Management</H1>
              <P className="text-sm text-slate-600 mt-1">Manage dining categories, restaurant links, banners, and stories</P>
            </Div>
          </Div>
        </Div>

        {/* Tabs */}
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2 mb-6">
          <Div className="flex gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === tab.id ? 'bg-blue-500 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  <UiIcon as={Icon} className="w-4 h-4" />
                  {tab.label}
                </Button>
              );
            })}
          </Div>
        </Div>

        {/* Messages */}
        {success && (
          <Div className="mb-6 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2 max-w-2xl">
            <UiIcon as={CheckCircle2} className="w-5 h-5" />
            {success}
          </Div>
        )}
        {error && (
          <Div className="mb-6 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2 max-w-2xl">
            <UiIcon as={AlertCircle} className="w-5 h-5" />
            {error}
          </Div>
        )}

        {/* Content */}
        {activeTab === 'categories' && (
          <Div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Div className="lg:col-span-1">
              <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <Div className="flex items-center justify-between gap-3 mb-4">
                  <H2 className="text-lg font-bold text-slate-900">{editingCategoryId ? 'Edit Category' : 'Add Category'}</H2>
                  {editingCategoryId && (
                    <Button type="button" variant="outline" onClick={resetCategoryForm} className="gap-2">
                      <UiIcon as={X} className="w-4 h-4" />
                      Cancel
                    </Button>
                  )}
                </Div>
                <Div className="space-y-4">
                  <Div>
                    <Label>Name</Label>
                    <Input value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="Category Name" className="mt-1" />
                  </Div>
                  <Div>
                    <Label>{editingCategoryId ? 'Replace Image' : 'Image'}</Label>
                    <Div className="mt-1 flex items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={async () => {
                          const picked = await pickImage();
                          if (picked) setCategoryFile(picked);
                        }}
                        className="gap-2"
                      >
                        <UiIcon as={Upload} className="w-4 h-4" />
                        Choose Image
                      </Button>
                      {categoryFile && <P className="text-xs text-slate-600 flex-1">{categoryFile.name}</P>}
                    </Div>
                    {categoryFile && (
                      <Img src={objectUrl(categoryFile)} alt={categoryFile.name} className="mt-3 w-24 h-24 rounded-lg object-cover border border-slate-200" />
                    )}
                    {editingCategoryId && editingCategoryImageUrl && !categoryFile && (
                      <Div className="mt-3">
                        <Img
                          src={editingCategoryImageUrl}
                          alt={categoryName || 'Current category'}
                          className="w-24 h-24 rounded-lg object-cover border border-slate-200"
                        />
                        <P className="text-xs text-slate-500 mt-2">Current image will be kept unless you select a new one.</P>
                      </Div>
                    )}
                  </Div>
                  <Button onClick={handleSubmitCategory} disabled={categoriesUploading} className="w-full bg-blue-600 hover:bg-blue-700">
                    {categoriesUploading ? <UiIcon as={Loader2} className="w-4 h-4 animate-spin" /> : editingCategoryId ? 'Update Category' : 'Create Category'}
                  </Button>
                </Div>
              </Div>
            </Div>
            <Div className="lg:col-span-2">
              <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <H2 className="text-lg font-bold text-slate-900 mb-4">Categories List</H2>
                {categoriesLoading ? (
                  <Div className="flex justify-center p-8">
                    <UiIcon as={Loader2} className="w-8 h-8 animate-spin text-blue-600" />
                  </Div>
                ) : (
                  <Div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categories.map((cat) => (
                      <Div key={cat._id} className="border rounded-lg overflow-hidden group relative">
                        <Img src={cat.imageUrl} alt={cat.name} className="w-full h-32 object-cover" />
                        <Div className="p-3 bg-white">
                          <P className="font-medium text-slate-900">{cat.name}</P>
                        </Div>
                        <Div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button onClick={() => handleEditCategory(cat)} className="p-1.5 bg-blue-100 text-blue-600 rounded-full">
                            <UiIcon as={Edit} className="w-4 h-4" />
                          </Button>
                          <Button onClick={() => handleDeleteCategory(cat._id)} className="p-1.5 bg-red-100 text-red-600 rounded-full">
                            {categoriesDeleting === cat._id ? (
                              <UiIcon as={Loader2} className="w-4 h-4 animate-spin" />
                            ) : (
                              <UiIcon as={Trash2} className="w-4 h-4" />
                            )}
                          </Button>
                        </Div>
                      </Div>
                    ))}
                    {categories.length === 0 && <P className="text-slate-500 text-center col-span-full py-8">No categories found.</P>}
                  </Div>
                )}
              </Div>
            </Div>
          </Div>
        )}

        {activeTab === 'banners' && (
          <Div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Div className="lg:col-span-1">
              <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <H2 className="text-lg font-bold text-slate-900 mb-2">Add Dining Page Banner</H2>
                <P className="text-sm text-slate-500 mb-4">This banner shows on the user dining page and is not linked to any restaurant.</P>
                <Div className="space-y-4">
                  <Div>
                    <Label>Image</Label>
                    <Div className="mt-1 flex items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={async () => {
                          const picked = await pickImage();
                          setBannerFile(picked || null);
                          setError(null);
                        }}
                        className="gap-2"
                      >
                        <UiIcon as={Upload} className="w-4 h-4" />
                        Choose Image
                      </Button>
                      {bannerFile && <P className="text-xs text-slate-600 flex-1">{bannerFile.name}</P>}
                    </Div>
                    {bannerFile && (
                      <Img src={objectUrl(bannerFile)} alt={bannerFile.name} className="mt-3 w-full h-32 rounded-lg object-cover border border-slate-200" />
                    )}
                  </Div>
                  <Div>
                    <Label>Promo Text</Label>
                    <Input
                      value={bannerPercentageOff}
                      onChange={(e) => {
                        setBannerPercentageOff(e.target.value);
                        setError(null);
                      }}
                      placeholder="Optional, e.g. 50% OFF"
                      className="mt-1"
                    />
                  </Div>
                  <Div>
                    <Label>Tagline</Label>
                    <Input
                      value={bannerTagline}
                      onChange={(e) => {
                        setBannerTagline(e.target.value);
                        setError(null);
                      }}
                      placeholder="Optional, e.g. Weekend dining specials"
                      className="mt-1"
                    />
                  </Div>
                  <Button onClick={handleSubmitBanner} disabled={bannersUploading} className="w-full bg-blue-600 hover:bg-blue-700">
                    {bannersUploading ? <UiIcon as={Loader2} className="w-4 h-4 animate-spin" /> : 'Create Banner'}
                  </Button>
                </Div>
              </Div>
            </Div>
            <Div className="lg:col-span-2">
              <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <H2 className="text-lg font-bold text-slate-900 mb-4">Dining Page Banners</H2>
                {bannersLoading ? (
                  <Div className="flex justify-center p-8">
                    <UiIcon as={Loader2} className="w-8 h-8 animate-spin text-blue-600" />
                  </Div>
                ) : (
                  <Div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {banners.map((banner) => (
                      <Div key={banner._id} className="border rounded-lg overflow-hidden group relative">
                        <Img src={banner.imageUrl} alt={banner.title || 'Dining banner'} className="w-full h-32 object-cover" />
                        <Div className="p-3 bg-white">
                          {banner.ctaText && <P className="font-bold text-slate-900">{banner.ctaText}</P>}
                          {banner.title && <P className="text-sm text-slate-600">{banner.title}</P>}
                          <P className="text-xs text-slate-500 mt-1">{banner.isActive === false ? 'Inactive' : 'Active on dining page'}</P>
                        </Div>
                        <Button
                          onClick={() => handleDeleteBanner(banner._id)}
                          className="absolute top-2 right-2 p-1.5 bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {bannersDeleting === banner._id ? (
                            <UiIcon as={Loader2} className="w-4 h-4 animate-spin" />
                          ) : (
                            <UiIcon as={Trash2} className="w-4 h-4" />
                          )}
                        </Button>
                      </Div>
                    ))}
                    {banners.length === 0 && <P className="text-slate-500 text-center col-span-full py-8">No banners found.</P>}
                  </Div>
                )}
              </Div>
            </Div>
          </Div>
        )}
      </Div>
    </ScrollDiv>
  );
}
