import React, { useState, useEffect } from 'react';
import {
  ChevronRight,
  Save,
  Plus,
  Trash2,
  Edit2,
  ToggleLeft,
  ToggleRight,
  ArrowUp,
  ArrowDown,
  LayoutGrid,
  Sparkles,
  MapPin,
  FileText,
  HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadService } from '../../../../shared/services/uploadService';
import api from '../../../../shared/api/axiosInstance';
import { useSettings } from '../../../../shared/context/SettingsContext';

const STORAGE_KEY = 'Appzeto :admin:user-app-settings';

const defaultSettings = {
  homeSections: {
    enableEverything: true,
    enableExplore: true,
    enablePromo: true,
    enableGoPlaces: true,
    enableFooter: true
  },
  everything: [
    { id: '1', title: 'Book now', subtitle: 'Your everyday rides', image: '', route: '/taxi/user/ride/select-location', order: 1, status: 'active' },
    { id: '2', title: 'Bike Taxi', subtitle: 'Beat the traffic', image: '', route: '/taxi/user/ride/select-location', order: 2, status: 'active' },
    { id: '3', title: 'Outstation', subtitle: 'Trips beyond the district', image: '', route: '/taxi/user/intercity', order: 3, status: 'active' },
    { id: '4', title: 'All Services', subtitle: 'All Services', image: '', route: '', order: 4, status: 'active' }
  ],
  explore: [
    { id: '1', title: 'Auto', image: '', route: '/taxi/user/ride/select-location', order: 1, status: 'active' },
    { id: '2', title: 'Cab Economy', image: '', route: '/taxi/user/ride/select-location', order: 2, status: 'active' },
    { id: '3', title: 'Bike', image: '', route: '/taxi/user/ride/select-location', order: 3, status: 'active' },
    { id: '4', title: 'Outstation', image: '', route: '/taxi/user/intercity', order: 4, status: 'active' }
  ],
  promos: [
    { id: '1', title: 'Rides across Dima Hasao', subtitle: 'Haflong, Maibang, Umrangso and everywhere between.', image: '', route: '/taxi/user/ride/select-location', order: 1, status: 'active' },
    { id: '2', title: 'Heading out of the district?', subtitle: 'Book an outstation cab to Silchar, Guwahati or Lumding.', image: '', route: '/taxi/user/intercity', order: 2, status: 'active' }
  ],
  goPlaces: [
    { id: '1', title: 'Rides to Haflong Railway Station', image: '', route: '/taxi/user/ride/select-location', order: 1, status: 'active' },
    { id: '2', title: 'Airport transfers to Silchar', image: '', route: '/taxi/user/intercity', order: 2, status: 'active' },
    { id: '3', title: 'Outstation trips', image: '', route: '/taxi/user/intercity', order: 3, status: 'active' }
  ],
  footer: {
    hashtag: '#DimaHasao',
    line1: 'Made for the district',
    line2: 'Crafted for riders'
  }
};

const SectionCard = ({ title, children }) => (
  <div className="bg-white rounded-xl border border-neutral-900/[0.08] overflow-hidden mb-8 flex flex-col">
    {title && (
      <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50">
        <h3 className="text-xs font-medium text-neutral-700 font-medium">{title}</h3>
      </div>
    )}
    <div className="p-6 flex-grow">
      {children}
    </div>
  </div>
);

const AdminUserAppManagement = ({ tab: initialTab }) => {
  const [activeTab, setActiveTab] = useState(initialTab || 'home-sections');
  const { refreshSettings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(defaultSettings);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/general-settings/user-home-management');
      const savedSettings = res.data?.settings || {};

      let fetchedPromos = [];
      try {
        const bannersRes = await api.get('/admin/banners');
        const bannersData = bannersRes.data?.data?.results || bannersRes.data?.results || bannersRes.data || [];
        fetchedPromos = bannersData.map((b, idx) => ({
          id: b._id || b.id || String(idx + 1),
          title: b.title || 'Experience A New Standard With Dima Hasao',
          subtitle: b.subtitle || 'A premier private hire service where luxury and reliability converge.',
          imageUrl: b.image || '',
          image: b.image || '',
          route: b.redirect_url || b.external_link || b.deep_link || '/taxi/user/ride/select-location',
          status: b.active !== false ? 'active' : 'inactive',
          order: idx + 1
        }));
      } catch (e) {
        console.error('Failed to fetch banners list:', e);
      }

      const promosToUse = fetchedPromos.length > 0 ? fetchedPromos : (savedSettings.promos || defaultSettings.promos);

      const nextSettings = {
        ...defaultSettings,
        ...savedSettings,
        homeSections: {
          ...defaultSettings.homeSections,
          ...(savedSettings.homeSections || {})
        },
        everything: savedSettings.everything || defaultSettings.everything,
        explore: savedSettings.explore || defaultSettings.explore,
        promos: promosToUse,
        goPlaces: savedSettings.goPlaces || defaultSettings.goPlaces,
        footer: {
          ...defaultSettings.footer,
          ...(savedSettings.footer || {})
        }
      };

      setSettings(nextSettings);

      // Auto-save settings to DB if we fetched active banners to keep in sync
      if (fetchedPromos.length > 0) {
        await api.patch('/admin/general-settings/user-home-management', { settings: nextSettings });
      }
    } catch (err) {
      console.error('Failed to load user-app-settings from backend:', err);
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) {
          setSettings(JSON.parse(saved));
        }
      } catch (e) {
        console.error(e);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const [editItem, setEditItem] = useState(null);
  const [isAdding, setIsAdding] = useState(false);

  const [uploadedImageUrl, setUploadedImageUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (editItem) {
      setUploadedImageUrl(editItem.uploadedImage || null);
    } else {
      setUploadedImageUrl(null);
    }
  }, [editItem]);

  useEffect(() => {
    if (isAdding) {
      setUploadedImageUrl(null);
    }
  }, [isAdding]);


  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed');
      return;
    }

    try {
      setUploading(true);
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });

      const response = await uploadService.uploadImage(base64, 'admin-user-app');
      const url = response.secureUrl || response.url || response;
      if (url) {
        setUploadedImageUrl(url);
        toast.success('Image uploaded successfully');
      } else {
        toast.error('Failed to get uploaded image URL');
      }
    } catch (error) {
      console.error(error);
      toast.error('Image upload failed');
    } finally {
      setUploading(false);
    }
  };

  const processFooterFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed');
      return;
    }

    try {
      setUploading(true);
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });

      const response = await uploadService.uploadImage(base64, 'admin-user-app-footer');
      const url = response.secureUrl || response.url || response;
      if (url) {
        handleFooterChange('uploadedImage', url);
        toast.success('Footer image uploaded successfully');
      } else {
        toast.error('Failed to get uploaded image URL');
      }
    } catch (error) {
      console.error(error);
      toast.error('Footer image upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = async (e) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  const handleRemoveImage = () => {
    setUploadedImageUrl(null);
    toast.success('Image removed');
  };

  // Sync tab with props changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const fetchHomeSections = fetchSettings;

  const handleSave = async () => {
    try {
      await api.patch('/admin/general-settings/user-home-management', { settings });
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      window.dispatchEvent(new Event('storage'));
      if (refreshSettings) {
        await refreshSettings();
      }
      if (typeof fetchHomeSections === 'function') {
        await fetchHomeSections();
      }
      toast.success('User App settings saved successfully');
    } catch (e) {
      console.error(e);
      toast.error('Failed to save settings to database');
    }
  };

  const updateHomeSectionToggle = (key) => {
    setSettings(prev => ({
      ...prev,
      homeSections: {
        ...prev.homeSections,
        [key]: !prev.homeSections[key]
      }
    }));
  };

  const handleFooterChange = (key, val) => {
    setSettings(prev => ({
      ...prev,
      footer: {
        ...prev.footer,
        [key]: val
      }
    }));
  };

  const getTabItems = () => {
    if (activeTab === 'everything') return settings.everything;
    if (activeTab === 'explore') return settings.explore;
    if (activeTab === 'promos') return settings.promos;
    if (activeTab === 'go-places') return settings.goPlaces;
    return [];
  };

  const updateTabItems = (newItems) => {
    const key = activeTab === 'everything' ? 'everything' :
      activeTab === 'explore' ? 'explore' :
        activeTab === 'promos' ? 'promos' :
          activeTab === 'go-places' ? 'go-places' : '';
    if (!key) return;

    // Convert tab name mapping correctly
    const settingsKey = key === 'go-places' ? 'goPlaces' : key;
    setSettings(prev => ({
      ...prev,
      [settingsKey]: newItems
    }));
  };

  const toggleItemStatus = (id) => {
    const items = getTabItems();
    const nextItems = items.map(item => item.id === id ? { ...item, status: item.status === 'active' ? 'inactive' : 'active' } : item);
    updateTabItems(nextItems);
  };

  const deleteItem = (id) => {
    const items = getTabItems();
    const nextItems = items.filter(item => item.id !== id).map((item, idx) => ({ ...item, order: idx + 1 }));
    updateTabItems(nextItems);
    toast.success('Item deleted');
  };

  const moveItem = (index, direction) => {
    const items = [...getTabItems()];
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === items.length - 1) return;

    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const temp = items[index];
    items[index] = items[targetIdx];
    items[targetIdx] = temp;

    // Reassign orders
    const ordered = items.map((item, idx) => ({ ...item, order: idx + 1 }));
    updateTabItems(ordered);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const title = formData.get('title');
    const subtitle = formData.get('subtitle');
    const image = formData.get('image');
    const route = formData.get('route');
    const status = formData.get('status');
    const rawDisplayMode = formData.get('imageDisplayMode') || 'illustration';
    const imageDisplayMode = rawDisplayMode === 'full-card background' ? 'cover' : rawDisplayMode;
    const imageMode = imageDisplayMode;

    const items = getTabItems();

    if (isAdding) {
      const newItem = {
        id: Date.now().toString(),
        title,
        subtitle: subtitle || '',
        image: image || '',
        uploadedImage: uploadedImageUrl || '',
        route: route || '',
        order: items.length + 1,
        status: status || 'active',
        imageDisplayMode,
        imageMode
      };
      updateTabItems([...items, newItem]);
      setIsAdding(false);
      toast.success('Item added successfully');
    } else if (editItem) {
      const updated = items.map(item => item.id === editItem.id ? {
        ...item,
        title,
        subtitle: subtitle || '',
        image: image || '',
        uploadedImage: uploadedImageUrl || '',
        route: route || '',
        status: status || 'active',
        imageDisplayMode,
        imageMode
      } : item);
      updateTabItems(updated);
      setEditItem(null);
      toast.success('Item updated successfully');
    }
  };

  const tabsConfig = [
    { id: 'home-sections', label: 'Home Sections' },
    { id: 'everything', label: 'Everything In Minutes' },
    { id: 'explore', label: 'Explore Cards' },
    { id: 'promos', label: 'Promo Banners' },
    { id: 'go-places', label: 'Go Places' },
    { id: 'footer', label: 'Footer Content' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#405189] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-neutral-500">Loading Settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-6 lg:p-10 font-sans">
      {/* Header Block */}
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-[15px] font-medium text-neutral-800 font-medium">User app management</h1>
        <div className="flex items-center gap-1.5 text-xs text-neutral-500">
          <span>Settings</span>
          <ChevronRight size={12} strokeWidth={3} />
          <span className="text-neutral-600">User app UI</span>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8 grid-rows-1">
        {/* Left Side: Navigation Tabs */}
        <div className="lg:col-span-1 space-y-2">
          <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-4 space-y-1">
            {tabsConfig.map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setEditItem(null);
                  setIsAdding(false);
                }}
                className={`w-full text-left px-4 py-3 rounded-xl text-[13px] font-medium transition-colors flex items-center justify-between ${activeTab === tab.id
                    ? 'bg-yellow-50 border-l-4 border-[#0a4d2b] text-yellow-900 shadow-sm'
                    : 'text-neutral-600 hover:bg-neutral-50'
                  }`}
              >
                <span>{tab.label}</span>
                <ChevronRight size={14} className={activeTab === tab.id ? 'text-white' : 'text-neutral-300'} />
              </button>
            ))}
          </div>

          <button
            onClick={handleSave}
            className="w-full flex items-center justify-center gap-2 px-5 py-4 rounded-2xl bg-[#0a4d2b] hover:bg-[#06381e] text-white text-sm font-medium shadow-sm transition-colors"
          >
            <Save size={16} /> Save changes
          </button>
        </div>

        {/* Right Side: Tab Contents Editor */}
        <div className="lg:col-span-3">
          {activeTab === 'home-sections' && (
            <SectionCard title="Homepage section toggles">
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl">
                  <div>
                    <div className="text-[15px] font-medium text-neutral-800">Everything in minutes grid</div>
                    <p className="text-xs text-neutral-500 mt-1">Masonry grid displaying the main ride categories</p>
                  </div>
                  <button
                    onClick={() => updateHomeSectionToggle('enableEverything')}
                    className={`w-12 h-6 rounded-full transition-colors duration-300 relative ${settings.homeSections.enableEverything ? 'bg-[#0a4d2b] text-white' : 'bg-neutral-300'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-colors duration-300 ${settings.homeSections.enableEverything ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl">
                  <div>
                    <div className="text-[15px] font-medium text-neutral-800">Explore horizontal scroll</div>
                    <p className="text-xs text-neutral-500 mt-1">Explore all categories and active modules horizontally</p>
                  </div>
                  <button
                    onClick={() => updateHomeSectionToggle('enableExplore')}
                    className={`w-12 h-6 rounded-full transition-colors duration-300 relative ${settings.homeSections.enableExplore ? 'bg-[#0a4d2b] text-white' : 'bg-neutral-300'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-colors duration-300 ${settings.homeSections.enableExplore ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl">
                  <div>
                    <div className="text-[15px] font-medium text-neutral-800">Promo banner</div>
                    <p className="text-xs text-neutral-500 mt-1">Super Saver promotional card with action handler</p>
                  </div>
                  <button
                    onClick={() => updateHomeSectionToggle('enablePromo')}
                    className={`w-12 h-6 rounded-full transition-colors duration-300 relative ${settings.homeSections.enablePromo ? 'bg-[#0a4d2b] text-white' : 'bg-neutral-300'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-colors duration-300 ${settings.homeSections.enablePromo ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl">
                  <div>
                    <div className="text-[15px] font-medium text-neutral-800">Go places section</div>
                    <p className="text-xs text-neutral-500 mt-1">Airport, railway station, and outstation fast booking cards</p>
                  </div>
                  <button
                    onClick={() => updateHomeSectionToggle('enableGoPlaces')}
                    className={`w-12 h-6 rounded-full transition-colors duration-300 relative ${settings.homeSections.enableGoPlaces ? 'bg-[#0a4d2b] text-white' : 'bg-neutral-300'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-colors duration-300 ${settings.homeSections.enableGoPlaces ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl">
                  <div>
                    <div className="text-[15px] font-medium text-neutral-800">Footer brand illustration</div>
                    <p className="text-xs text-neutral-500 mt-1">Branded city silhouette footer with custom hashtag text</p>
                  </div>
                  <button
                    onClick={() => updateHomeSectionToggle('enableFooter')}
                    className={`w-12 h-6 rounded-full transition-colors duration-300 relative ${settings.homeSections.enableFooter ? 'bg-[#0a4d2b] text-white' : 'bg-neutral-300'}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-colors duration-300 ${settings.homeSections.enableFooter ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>
              </div>
            </SectionCard>
          )}

          {activeTab === 'footer' && (
            <SectionCard title="Footer branding configuration">
              <div className="space-y-5">
                <div>
                  <label className="block text-xs text-neutral-500 mb-2">Footer hashtag</label>
                  <input
                    type="text"
                    value={settings.footer.hashtag}
                    onChange={(e) => handleFooterChange('hashtag', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:border-[#405189] text-[13px] font-medium"
                    placeholder="#DimaHasao"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-500 mb-2">Slogan Line 1</label>
                  <input
                    type="text"
                    value={settings.footer.line1}
                    onChange={(e) => handleFooterChange('line1', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:border-[#405189] text-[13px] font-medium"
                    placeholder="Made for india"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-500 mb-2">Slogan Line 2</label>
                  <input
                    type="text"
                    value={settings.footer.line2}
                    onChange={(e) => handleFooterChange('line2', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:border-[#405189] text-[13px] font-medium"
                    placeholder="Crafted for riders"
                  />
                </div>

                <div>
                  <label className="block text-xs text-neutral-500 mb-2">Footer Background URL (Optional)</label>
                  <input
                    type="text"
                    value={settings.footer.image || ''}
                    onChange={(e) => handleFooterChange('image', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:border-[#405189] text-[13px] font-medium"
                    placeholder="e.g. /assets/user-app/city-mask.png"
                  />
                </div>

                {/* Upload Footer Image Section */}
                <div>
                  <label className="block text-xs text-neutral-500 mb-2">Upload footer background image</label>

                  {settings.footer.uploadedImage ? (
                    <div className="relative rounded-2xl border border-neutral-200 p-4 bg-neutral-50 flex items-center gap-4">
                      <img
                        src={settings.footer.uploadedImage}
                        alt="Uploaded preview"
                        className="w-16 h-16 object-contain rounded-lg border border-neutral-200 bg-white"
                      />
                      <div className="flex-grow min-w-0">
                        <p className="text-xs font-medium text-neutral-800 truncate">{settings.footer.uploadedImage}</p>
                        <p className="text-xs text-neutral-500 mt-0.5">Uploaded image URL</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleFooterChange('uploadedImage', '')}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-650 rounded-lg text-xs font-medium font-medium transition-colors shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragActive(false);
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          await processFooterFile(e.dataTransfer.files[0]);
                        }
                      }}
                      className={`relative rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors duration-200 ${dragActive
                          ? 'border-[#405189] bg-yellow-50/20'
                          : 'border-neutral-300 hover:border-neutral-400 bg-white'
                        }`}
                    >
                      <input
                        type="file"
                        id="footer-file-upload"
                        accept="image/*"
                        onChange={async (e) => {
                          if (e.target.files && e.target.files[0]) {
                            await processFooterFile(e.target.files[0]);
                          }
                        }}
                        className="hidden"
                        disabled={uploading}
                      />
                      <label htmlFor="footer-file-upload" className="cursor-pointer block w-full h-full">
                        {uploading ? (
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="w-6 h-6 border-2 border-[#0a4d2b] border-t-transparent rounded-full animate-spin" />
                            <span className="text-xs font-medium text-[#0a4d2b] font-medium">Uploading to Cloudinary...</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-1.5">
                            <Sparkles className="w-7 h-7 text-neutral-500 mb-1" />
                            <span className="text-xs font-medium text-neutral-700">Drag & drop your footer image here, or <span className="text-[#0a4d2b] hover:underline">browse</span></span>
                            <span className="text-xs text-neutral-500">Supports PNG, JPG, JPEG, GIF</span>
                          </div>
                        )}
                      </label>
                    </div>
                  )}
                </div>

                {/* Image Preview Block */}
                {(settings.footer.uploadedImage || settings.footer.image) && (
                  <div className="rounded-2xl border border-neutral-250 p-4 bg-neutral-50">
                    <label className="block text-xs text-neutral-500 mb-2">Footer background preview</label>
                    <div className="w-full h-32 rounded-xl border border-neutral-200 bg-white flex items-center justify-center p-4">
                      <img
                        src={settings.footer.uploadedImage || settings.footer.image}
                        alt="Preview"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          {['everything', 'explore', 'promos', 'go-places'].includes(activeTab) && (
            <>
              {/* Items List */}
              {!editItem && !isAdding && (
                <SectionCard title={`${tabsConfig.find(t => t.id === activeTab)?.label} List`}>
                  <div className="mb-4 flex justify-end">
                    <button
                      onClick={() => setIsAdding(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0a4d2b] hover:bg-[#06381e] text-white rounded-xl text-xs font-medium font-medium transition-colors"
                    >
                      <Plus size={14} /> Add new card
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-[13px] text-left">
                      <thead>
                        <tr className="border-b border-neutral-200 text-neutral-500">
                          <th className="pb-3 pl-2 w-24">Order</th>
                          <th className="pb-3">Title</th>
                          <th className="pb-3">Subtitle</th>
                          <th className="pb-3">Route / action</th>
                          <th className="pb-3">Status</th>
                          <th className="pb-3 text-right pr-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 font-medium">
                        {getTabItems().map((item, index) => (
                          <tr key={item.id} className="hover:bg-neutral-50/50">
                            <td className="py-3.5 pl-2">
                              <span className="inline-flex items-center gap-1 text-neutral-500">
                                <button onClick={() => moveItem(index, 'up')} disabled={index === 0} className="hover:text-neutral-800 disabled:opacity-30">
                                  <ArrowUp size={14} />
                                </button>
                                <button onClick={() => moveItem(index, 'down')} disabled={index === getTabItems().length - 1} className="hover:text-neutral-800 disabled:opacity-30">
                                  <ArrowDown size={14} />
                                </button>
                                <span className="ml-1 text-neutral-800 font-medium">{item.order}</span>
                              </span>
                            </td>
                            <td className="py-3.5 text-neutral-900 font-medium">{item.title}</td>
                            <td className="py-3.5 text-neutral-500">{item.subtitle || '-'}</td>
                            <td className="py-3.5 font-mono text-xs text-[#0a4d2b]">{item.route || '-'}</td>
                            <td className="py-3.5">
                              <button
                                onClick={() => toggleItemStatus(item.id)}
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium font-medium ${item.status === 'active'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-red-50 text-red-700'
                                  }`}
                              >
                                {item.status}
                              </button>
                            </td>
                            <td className="py-3.5 text-right pr-2">
                              <div className="inline-flex items-center gap-2">
                                <button
                                  onClick={() => setEditItem(item)}
                                  className="p-1 text-neutral-500 hover:text-[#0a4d2b] rounded"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => deleteItem(item.id)}
                                  className="p-1 text-neutral-500 hover:text-red-650 rounded"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {getTabItems().length === 0 && (
                          <tr>
                            <td colSpan="6" className="py-8 text-center text-neutral-500">
                              No items configured. Fallbacks will be rendered.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </SectionCard>
              )}

              {/* Form to Add/Edit Item */}
              {(isAdding || editItem) && (
                <SectionCard title={isAdding ? 'Add New Card' : `Edit: ${editItem.title}`}>
                  <form onSubmit={handleFormSubmit} className="space-y-5">
                    <div>
                      <label className="block text-xs text-neutral-500 mb-2">Card title</label>
                      <input
                        type="text"
                        name="title"
                        required
                        defaultValue={editItem ? editItem.title : ''}
                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:border-[#405189] text-[13px] font-medium"
                        placeholder="e.g. Parcel"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-neutral-500 mb-2">Card subtitle / description</label>
                      <input
                        type="text"
                        name="subtitle"
                        defaultValue={editItem ? editItem.subtitle : ''}
                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:border-[#405189] text-[13px] font-medium"
                        placeholder="e.g. Send anything"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-neutral-500 mb-2">Image URL (Optional)</label>
                      <input
                        type="text"
                        name="image"
                        defaultValue={editItem ? editItem.image : ''}
                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:border-[#405189] text-[13px] font-medium"
                        placeholder="e.g. /assets/user-app/bike.png"
                      />
                    </div>

                    {/* Upload Image Section */}
                    <div>
                      <label className="block text-xs text-neutral-500 mb-2">Upload image</label>

                      {uploadedImageUrl ? (
                        <div className="relative rounded-2xl border border-neutral-200 p-4 bg-neutral-50 flex items-center gap-4">
                          <img
                            src={uploadedImageUrl}
                            alt="Uploaded preview"
                            className="w-16 h-16 object-contain rounded-lg border border-neutral-200 bg-white"
                          />
                          <div className="flex-grow min-w-0">
                            <p className="text-xs font-medium text-neutral-800 truncate">{uploadedImageUrl}</p>
                            <p className="text-xs text-neutral-500 mt-0.5">Uploaded image URL</p>
                          </div>
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-650 rounded-lg text-xs font-medium font-medium transition-colors shrink-0"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div
                          onDragEnter={handleDrag}
                          onDragOver={handleDrag}
                          onDragLeave={handleDrag}
                          onDrop={handleDrop}
                          className={`relative rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors duration-200 ${dragActive
                              ? 'border-[#405189] bg-yellow-50/20'
                              : 'border-neutral-300 hover:border-neutral-400 bg-white'
                            }`}
                        >
                          <input
                            type="file"
                            id="file-upload"
                            accept="image/*"
                            onChange={handleFileSelect}
                            className="hidden"
                            disabled={uploading}
                          />
                          <label htmlFor="file-upload" className="cursor-pointer block w-full h-full">
                            {uploading ? (
                              <div className="flex flex-col items-center justify-center gap-2">
                                <div className="w-6 h-6 border-2 border-[#0a4d2b] border-t-transparent rounded-full animate-spin" />
                                <span className="text-xs font-medium text-[#0a4d2b] font-medium">Uploading to Cloudinary...</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center gap-1.5">
                                <Sparkles className="w-7 h-7 text-neutral-500 mb-1" />
                                <span className="text-xs font-medium text-neutral-700">Drag & drop your image here, or <span className="text-[#0a4d2b] hover:underline">browse</span></span>
                                <span className="text-xs text-neutral-500">Supports PNG, JPG, JPEG, GIF</span>
                              </div>
                            )}
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Image Preview Block */}
                    {(uploadedImageUrl || (editItem && editItem.image)) && (
                      <div className="rounded-2xl border border-neutral-250 p-4 bg-neutral-50">
                        <label className="block text-xs text-neutral-500 mb-2">Image preview</label>
                        <div className="w-full h-32 rounded-xl border border-neutral-200 bg-white flex items-center justify-center p-4">
                          <img
                            src={uploadedImageUrl || editItem.image}
                            alt="Preview"
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs text-neutral-500 mb-2">Action route / target</label>
                      <input
                        type="text"
                        name="route"
                        defaultValue={editItem ? editItem.route : ''}
                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:border-[#405189] text-[13px] font-medium"
                        placeholder="e.g. /taxi/user/ride/select-location"
                      />
                    </div>

                    {activeTab === 'everything' && (
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs text-neutral-500 mb-2">Image display mode</label>
                          <select
                            name="imageDisplayMode"
                            defaultValue={editItem ? (editItem.imageMode || editItem.imageDisplayMode || 'illustration') : 'illustration'}
                            className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:border-[#405189] text-[13px] font-medium"
                          >
                            <option value="illustration">Illustration (Bottom-right, contain)</option>
                            <option value="cover">Full-card background (Fills card)</option>
                            <option value="full-card background">Full-card background (Legacy)</option>
                          </select>
                        </div>
                        <p className="text-xs text-amber-600 font-medium leading-relaxed">
                          For Everything In Minutes, upload transparent PNG illustration 512x512 for best result. If uploading a full banner/card image, choose Full-card background mode.
                        </p>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs text-neutral-500 mb-2">Status</label>
                      <select
                        name="status"
                        defaultValue={editItem ? editItem.status : 'active'}
                        className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:border-[#405189] text-[13px] font-medium"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="submit"
                        className="px-5 py-2.5 bg-[#0a4d2b] hover:bg-[#06381e] text-white rounded-xl text-xs font-medium font-medium transition-colors"
                      >
                        {isAdding ? 'Add Item' : 'Update Item'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAdding(false);
                          setEditItem(null);
                        }}
                        className="px-5 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-xl text-xs font-medium font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </SectionCard>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminUserAppManagement;
