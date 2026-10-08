/* Ported from Frontend/src/modules/Food/pages/admin/system/LandingPageSettings.jsx (tools/port.js first pass). */
import { useState } from 'react';
import { Monitor, Info, X, ChevronRight, RotateCcw, Save } from 'lucide-react-native';
import mobileImage1 from '../../../assets/Transaction-report-icons/mobile_image1.png';
import { pickImage, objectUrl } from '../../../../lib/files';
import { Button, Div, H1, H2, HScroll, Img, Input, Label, Option, P, ScrollDiv, Select, Span, Textarea, Icon as UiIcon } from '../../../../components/web';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
export default function LandingPageSettings({ type = 'admin' }) {
  const isAdmin = type === 'admin';

  // Admin Landing Page state
  const [adminActiveTab, setAdminActiveTab] = useState('Header');
  const [adminActiveLanguage, setAdminActiveLanguage] = useState('default');
  const [adminHeaderContent, setAdminHeaderContent] = useState({
    enabled: true,
    title: 'Why stay Hungry!',
    subtitle: 'when you can order always form',
    tagline: 'Start Your Business or Download the App',
    buttonName: 'Order Now',
    redirectLink: 'https://stackfood-web.6amtech.com/',
    redirectLinkEnabled: true,
  });
  const [adminImageContent, setAdminImageContent] = useState({
    enabled: true,
    contentImage: mobileImage1,
    backgroundImage: null,
  });
  const [adminFloatingIcon, setAdminFloatingIcon] = useState({
    enabled: true,
    totalOrder: '5000',
    totalUser: '999',
    totalReviews: '2330',
  });

  // React Landing Page state
  const [reactActiveTab, setReactActiveTab] = useState('Header');
  const [reactActiveLanguage, setReactActiveLanguage] = useState('default');
  const [reactHeaderContent, setReactHeaderContent] = useState({
    title: 'Your Next Experience Awaits',
    subtitle: 'Discover Restaurants Near You',
    backgroundImage: null,
  });
  const [reactLocationPicker, setReactLocationPicker] = useState({
    placeholder: 'Enter location to search restaurant',
  });
  const [adminBackgroundColors, setAdminBackgroundColors] = useState({
    primary: '#ffffff',
    secondary: '#f8f9fa',
    accent: '#006fbd',
  });
  const [reactBusinessStats, setReactBusinessStats] = useState({
    restaurant: '200',
    happyCustomer: '10000',
    averageDelivery: '30',
  });
  const adminTabs = [
    'Header',
    'About us',
    'Features',
    'Services',
    'Earn money',
    'Why choose us',
    'Testimonials',
    'Available zone',
    'Fixed data',
    'Button & links',
    'Background color',
  ];
  const reactTabs = [
    'Header',
    'Services',
    'Stepper Section',
    'Promotional Banner',
    'Categories',
    'Download Apps',
    'Gallery',
    'Available zone',
    'Registration section',
    'Testimonials',
  ];
  const languages = [
    {
      id: 'default',
      label: 'Default',
    },
    {
      id: 'en',
      label: 'English(EN)',
    },
    {
      id: 'bn',
      label: 'Bengali - বাংলা(BN)',
    },
    {
      id: 'ar',
      label: 'Arabic - العربية (AR)',
    },
    {
      id: 'es',
      label: 'Spanish - espa�ol(ES)',
    },
  ];
  const handleImageUpload = async (setter, field) => {
    const file = await pickImage({ compress: false });
    if (!file) return;
    setter((prev) => ({
      ...prev,
      [field]: objectUrl(file),
    }));
  };
  const handleImageRemove = (setter, field) => {
    setter((prev) => ({
      ...prev,
      [field]: null,
    }));
  };
  const handleReset = () => {
    if (isAdmin) {
      setAdminHeaderContent({
        enabled: true,
        title: 'Why stay Hungry!',
        subtitle: 'when you can order always form',
        tagline: 'Start Your Business or Download the App',
        buttonName: 'Order Now',
        redirectLink: 'https://stackfood-web.6amtech.com/',
        redirectLinkEnabled: true,
      });
      setAdminImageContent({
        enabled: true,
        contentImage: mobileImage1,
        backgroundImage: null,
      });
      setAdminFloatingIcon({
        enabled: true,
        totalOrder: '5000',
        totalUser: '999',
        totalReviews: '2330',
      });
    } else {
      setReactHeaderContent({
        title: 'Your Next Experience Awaits',
        subtitle: 'Discover Restaurants Near You',
        backgroundImage: null,
      });
      setReactLocationPicker({
        placeholder: 'Enter location to search restaurant',
      });
      setReactBusinessStats({
        restaurant: '200',
        happyCustomer: '10000',
        averageDelivery: '30',
      });
    }
  };
  const handleSave = () => {
    // Handle save logic here
    debugLog('Saving...');
  };
  if (isAdmin) {
    return (
      <ScrollDiv className="p-2 lg:p-3 bg-slate-50 min-h-screen w-full">
          <Div
            className="w-full mx-auto overflow-hidden"
            style={{
              maxWidth: '100%',
            }}
          >
            {/* Page Header */}
            <Div
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 w-full overflow-hidden"
              style={{
                maxWidth: '100%',
              }}
            >
              <Div className="flex items-center gap-2 min-w-0">
                <UiIcon as={Monitor} className="w-5 h-5 text-slate-700 flex-shrink-0" />
                <H1 className="text-xl lg:text-2xl font-bold text-slate-900 truncate">Admin Landing Page</H1>
              </Div>
              <Div className="text-blue-600 hover:text-blue-700 text-xs sm:text-sm font-medium flex items-center gap-1 flex-shrink-0">
                <Span>See how it works!</Span>
                <UiIcon as={Info} className="w-3 h-3 sm:w-4 sm:h-4" />
              </Div>
            </Div>

            {/* Main Navigation Tabs */}
            <Div
              className="bg-white rounded-lg shadow-sm border border-slate-200 p-2 mb-3 w-full overflow-hidden"
              style={{
                maxWidth: '100%',
              }}
            >
              <Div className="flex flex-wrap items-center gap-1.5 w-full">
                {adminTabs.map((tab) => {
                  const isActive = tab === adminActiveTab;
                  return (
                    <Button
                      key={tab}
                      type="button"
                      onClick={() => setAdminActiveTab(tab)}
                      className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${isActive ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                    >
                      {tab}
                    </Button>
                  );
                })}
                <UiIcon as={ChevronRight} className="w-4 h-4 text-slate-400 ml-1 flex-shrink-0" />
              </Div>
            </Div>

            {/* Language Tabs */}
            <Div
              className="bg-white rounded-lg shadow-sm border border-slate-200 p-2 mb-3 w-full overflow-hidden"
              style={{
                maxWidth: '100%',
              }}
            >
              <Div className="flex flex-wrap items-center gap-2 sm:gap-3 border-b border-slate-200 pb-2 w-full">
                {languages.map((lang) => {
                  const isActive = lang.id === adminActiveLanguage;
                  return (
                    <Button
                      key={lang.id}
                      type="button"
                      onClick={() => setAdminActiveLanguage(lang.id)}
                      className={`text-xs sm:text-sm font-medium transition-all pb-1 whitespace-nowrap flex-shrink-0 ${isActive ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      {lang.label}
                    </Button>
                  );
                })}
              </Div>
            </Div>

            {/* Header Content Section */}
            {adminActiveTab === 'Header' && (
              <Div
                className="space-y-3 w-full overflow-hidden"
                style={{
                  maxWidth: '100%',
                }}
              >
                {/* Header Content Section */}
                <Div
                  className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 sm:p-4 w-full overflow-hidden"
                  style={{
                    maxWidth: '100%',
                  }}
                >
                  <Div className="flex items-center gap-2 mb-4">
                    <Input
                      type="checkbox"
                      nativeID="header-content"
                      checked={adminHeaderContent.enabled}
                      onChange={(e) =>
                        setAdminHeaderContent((prev) => ({
                          ...prev,
                          enabled: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 text-blue-600 rounded border-slate-300"
                    />
                    <Label className="text-xs sm:text-sm font-semibold text-slate-900">Header Content Section</Label>
                  </Div>

                  <Div className="space-y-3">
                    <Div>
                      <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                        Title
                        <UiIcon as={Info} className="w-3 h-3 text-slate-400" />
                      </Label>
                      <Input
                        type="text"
                        value={adminHeaderContent.title}
                        onChange={(e) =>
                          setAdminHeaderContent((prev) => ({
                            ...prev,
                            title: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </Div>

                    <Div>
                      <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                        Subtitle
                        <UiIcon as={Info} className="w-3 h-3 text-slate-400" />
                      </Label>
                      <Input
                        type="text"
                        value={adminHeaderContent.subtitle}
                        onChange={(e) =>
                          setAdminHeaderContent((prev) => ({
                            ...prev,
                            subtitle: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </Div>

                    <Div>
                      <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                        Tagline
                        <UiIcon as={Info} className="w-3 h-3 text-slate-400" />
                      </Label>
                      <Input
                        type="text"
                        value={adminHeaderContent.tagline}
                        onChange={(e) =>
                          setAdminHeaderContent((prev) => ({
                            ...prev,
                            tagline: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </Div>

                    <Div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Div>
                        <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                          Button Name
                          <UiIcon as={Info} className="w-3 h-3 text-slate-400" />
                        </Label>
                        <Input
                          type="text"
                          value={adminHeaderContent.buttonName}
                          onChange={(e) =>
                            setAdminHeaderContent((prev) => ({
                              ...prev,
                              buttonName: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </Div>

                      <Div>
                        <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                          Redirect Link
                          <UiIcon as={Info} className="w-3 h-3 text-slate-400" />
                        </Label>
                        <Div className="flex items-center gap-2 min-w-0">
                          <Input
                            type="text"
                            value={adminHeaderContent.redirectLink}
                            onChange={(e) =>
                              setAdminHeaderContent((prev) => ({
                                ...prev,
                                redirectLink: e.target.value,
                              }))
                            }
                            className="flex-1 min-w-0 px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <Button
                            type="button"
                            onClick={() =>
                              setAdminHeaderContent((prev) => ({
                                ...prev,
                                redirectLinkEnabled: !prev.redirectLinkEnabled,
                              }))
                            }
                            className={`px-3 py-1.5 text-xs sm:text-sm rounded-lg transition-all whitespace-nowrap ${adminHeaderContent.redirectLinkEnabled ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}
                          >
                            {adminHeaderContent.redirectLinkEnabled ? 'ON' : 'OFF'}
                          </Button>
                        </Div>
                      </Div>
                    </Div>
                  </Div>

                  <Div className="flex justify-end gap-2 mt-4">
                    <Button
                      type="button"
                      onClick={handleReset}
                      className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                    >
                      <UiIcon as={RotateCcw} className="w-3 h-3" />
                      Reset
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSave}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                    >
                      <UiIcon as={Save} className="w-3 h-3" />
                      Save
                    </Button>
                  </Div>
                </Div>

                {/* Image Content Section */}
                <Div
                  className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 sm:p-4 w-full overflow-hidden"
                  style={{
                    maxWidth: '100%',
                  }}
                >
                  <Div className="flex items-center gap-2 mb-4">
                    <Input
                      type="checkbox"
                      nativeID="image-content"
                      checked={adminImageContent.enabled}
                      onChange={(e) =>
                        setAdminImageContent((prev) => ({
                          ...prev,
                          enabled: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 text-blue-600 rounded border-slate-300"
                    />
                    <Label className="text-xs sm:text-sm font-semibold text-slate-900">Image Content</Label>
                  </Div>

                  <Div className="space-y-3">
                    <Div>
                      <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Content Image (800x800px)</Label>
                      <Div className="relative inline-block">
                        {adminImageContent.contentImage ? (
                          <Div className="relative">
                            <Img
                              src={adminImageContent.contentImage}
                              alt="Content"
                              className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-lg border border-slate-300"
                            />
                            <Button
                              type="button"
                              onClick={() => handleImageRemove(setAdminImageContent, 'contentImage')}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                            >
                              <UiIcon as={X} className="w-3 h-3" />
                            </Button>
                          </Div>
                        ) : (
                          <Div className="cursor-pointer" onClick={() => handleImageUpload(setAdminImageContent, 'contentImage')}>
                            <Div className="w-24 h-24 sm:w-32 sm:h-32 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center hover:border-blue-500 transition-colors">
                              <Span className="text-xs text-slate-500">Upload</Span>
                            </Div>
                          </Div>
                        )}
                      </Div>
                    </Div>

                    <Div>
                      <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Section Background Image (1600x1700px)</Label>
                      <Div className="relative inline-block">
                        {adminImageContent.backgroundImage ? (
                          <Div className="relative">
                            <Img
                              src={adminImageContent.backgroundImage}
                              alt="Background"
                              className="w-24 h-24 sm:w-32 sm:h-32 object-cover rounded-lg border border-slate-300"
                            />
                            <Button
                              type="button"
                              onClick={() => handleImageRemove(setAdminImageContent, 'backgroundImage')}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                            >
                              <UiIcon as={X} className="w-3 h-3" />
                            </Button>
                          </Div>
                        ) : (
                          <Div className="cursor-pointer" onClick={() => handleImageUpload(setAdminImageContent, 'backgroundImage')}>
                            <Div className="w-24 h-24 sm:w-32 sm:h-32 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center hover:border-blue-500 transition-colors">
                              <Span className="text-xs text-slate-500">Upload</Span>
                            </Div>
                          </Div>
                        )}
                      </Div>
                    </Div>
                  </Div>

                  <Div className="flex justify-end gap-2 mt-4">
                    <Button
                      type="button"
                      onClick={handleReset}
                      className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                    >
                      <UiIcon as={RotateCcw} className="w-3 h-3" />
                      Reset
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSave}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                    >
                      <UiIcon as={Save} className="w-3 h-3" />
                      Save
                    </Button>
                  </Div>
                </Div>

                {/* Floating Icon Content Section */}
                <Div
                  className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 sm:p-4 w-full overflow-hidden"
                  style={{
                    maxWidth: '100%',
                  }}
                >
                  <Div className="flex items-center gap-2 mb-4">
                    <Input
                      type="checkbox"
                      nativeID="floating-icon"
                      checked={adminFloatingIcon.enabled}
                      onChange={(e) =>
                        setAdminFloatingIcon((prev) => ({
                          ...prev,
                          enabled: e.target.checked,
                        }))
                      }
                      className="w-4 h-4 text-blue-600 rounded border-slate-300"
                    />
                    <Label className="text-xs sm:text-sm font-semibold text-slate-900">Floating Icon Content</Label>
                  </Div>

                  <Div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Div>
                      <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                        Total Order
                        <UiIcon as={Info} className="w-3 h-3 text-slate-400" />
                      </Label>
                      <Input
                        type="text"
                        value={adminFloatingIcon.totalOrder}
                        onChange={(e) =>
                          setAdminFloatingIcon((prev) => ({
                            ...prev,
                            totalOrder: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </Div>

                    <Div>
                      <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                        Total User
                        <UiIcon as={Info} className="w-3 h-3 text-slate-400" />
                      </Label>
                      <Input
                        type="text"
                        value={adminFloatingIcon.totalUser}
                        onChange={(e) =>
                          setAdminFloatingIcon((prev) => ({
                            ...prev,
                            totalUser: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </Div>

                    <Div>
                      <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                        Total Reviews
                        <UiIcon as={Info} className="w-3 h-3 text-slate-400" />
                      </Label>
                      <Input
                        type="text"
                        value={adminFloatingIcon.totalReviews}
                        onChange={(e) =>
                          setAdminFloatingIcon((prev) => ({
                            ...prev,
                            totalReviews: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </Div>
                  </Div>

                  <Div className="flex justify-end gap-2 mt-4">
                    <Button
                      type="button"
                      onClick={handleReset}
                      className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                    >
                      <UiIcon as={RotateCcw} className="w-3 h-3" />
                      Reset
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSave}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                    >
                      <UiIcon as={Save} className="w-3 h-3" />
                      Save
                    </Button>
                  </Div>
                </Div>
              </Div>
            )}

            {/* About us Section */}
            {adminActiveTab === 'About us' && (
              <Div
                className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 sm:p-4 w-full overflow-hidden"
                style={{
                  maxWidth: '100%',
                }}
              >
                <Div className="flex items-center gap-2 mb-4">
                  <Input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-slate-300" defaultChecked />
                  <Label className="text-xs sm:text-sm font-semibold text-slate-900">About us Section</Label>
                </Div>
                <Div className="space-y-3">
                  <Div>
                    <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      Title
                      <UiIcon as={Info} className="w-3 h-3 text-slate-400" />
                    </Label>
                    <Input
                      type="text"
                      placeholder="Enter about us title"
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </Div>
                  <Div>
                    <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      Description
                      <UiIcon as={Info} className="w-3 h-3 text-slate-400" />
                    </Label>
                    <Textarea
                      rows={4}
                      placeholder="Enter about us description"
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </Div>
                </Div>
                <Div className="flex justify-end gap-2 mt-4">
                  <Button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                  >
                    <UiIcon as={RotateCcw} className="w-3 h-3" /> Reset
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                  >
                    <UiIcon as={Save} className="w-3 h-3" /> Save
                  </Button>
                </Div>
              </Div>
            )}

            {/* Features Section */}
            {adminActiveTab === 'Features' && (
              <Div
                className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 sm:p-4 w-full overflow-hidden"
                style={{
                  maxWidth: '100%',
                }}
              >
                <Div className="flex items-center gap-2 mb-4">
                  <Input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-slate-300" defaultChecked />
                  <Label className="text-xs sm:text-sm font-semibold text-slate-900">Features Section</Label>
                </Div>
                <Div className="space-y-3">
                  <Div>
                    <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      Section Title
                      <UiIcon as={Info} className="w-3 h-3 text-slate-400" />
                    </Label>
                    <Input
                      type="text"
                      placeholder="Enter features section title"
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </Div>
                  <Div>
                    <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      Number of Features
                      <UiIcon as={Info} className="w-3 h-3 text-slate-400" />
                    </Label>
                    <Input
                      type="number"
                      placeholder="Enter number"
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </Div>
                </Div>
                <Div className="flex justify-end gap-2 mt-4">
                  <Button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                  >
                    <UiIcon as={RotateCcw} className="w-3 h-3" /> Reset
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                  >
                    <UiIcon as={Save} className="w-3 h-3" /> Save
                  </Button>
                </Div>
              </Div>
            )}

            {/* Services Section */}
            {adminActiveTab === 'Services' && (
              <Div
                className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 sm:p-4 w-full overflow-hidden"
                style={{
                  maxWidth: '100%',
                }}
              >
                <Div className="flex items-center gap-2 mb-4">
                  <Input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-slate-300" defaultChecked />
                  <Label className="text-xs sm:text-sm font-semibold text-slate-900">Services Section</Label>
                </Div>
                <Div className="space-y-3">
                  <Div>
                    <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      Section Title
                      <UiIcon as={Info} className="w-3 h-3 text-slate-400" />
                    </Label>
                    <Input
                      type="text"
                      placeholder="Enter services section title"
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </Div>
                  <Div>
                    <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      Section Description
                      <UiIcon as={Info} className="w-3 h-3 text-slate-400" />
                    </Label>
                    <Textarea
                      rows={3}
                      placeholder="Enter services description"
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </Div>
                </Div>
                <Div className="flex justify-end gap-2 mt-4">
                  <Button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                  >
                    <UiIcon as={RotateCcw} className="w-3 h-3" /> Reset
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                  >
                    <UiIcon as={Save} className="w-3 h-3" /> Save
                  </Button>
                </Div>
              </Div>
            )}

            {/* Earn money Section */}
            {adminActiveTab === 'Earn money' && (
              <Div
                className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 sm:p-4 w-full overflow-hidden"
                style={{
                  maxWidth: '100%',
                }}
              >
                <Div className="flex items-center gap-2 mb-4">
                  <Input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-slate-300" defaultChecked />
                  <Label className="text-xs sm:text-sm font-semibold text-slate-900">Earn money Section</Label>
                </Div>
                <Div className="space-y-3">
                  <Div>
                    <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      Section Title
                      <UiIcon as={Info} className="w-3 h-3 text-slate-400" />
                    </Label>
                    <Input
                      type="text"
                      placeholder="Enter earn money section title"
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </Div>
                  <Div>
                    <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      Button Text
                      <UiIcon as={Info} className="w-3 h-3 text-slate-400" />
                    </Label>
                    <Input
                      type="text"
                      placeholder="Enter button text"
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </Div>
                </Div>
                <Div className="flex justify-end gap-2 mt-4">
                  <Button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                  >
                    <UiIcon as={RotateCcw} className="w-3 h-3" /> Reset
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                  >
                    <UiIcon as={Save} className="w-3 h-3" /> Save
                  </Button>
                </Div>
              </Div>
            )}

            {/* Why choose us Section */}
            {adminActiveTab === 'Why choose us' && (
              <Div
                className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 sm:p-4 w-full overflow-hidden"
                style={{
                  maxWidth: '100%',
                }}
              >
                <Div className="flex items-center gap-2 mb-4">
                  <Input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-slate-300" defaultChecked />
                  <Label className="text-xs sm:text-sm font-semibold text-slate-900">Why choose us Section</Label>
                </Div>
                <Div className="space-y-3">
                  <Div>
                    <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      Section Title
                      <UiIcon as={Info} className="w-3 h-3 text-slate-400" />
                    </Label>
                    <Input
                      type="text"
                      placeholder="Enter why choose us title"
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </Div>
                  <Div>
                    <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      Number of Reasons
                      <UiIcon as={Info} className="w-3 h-3 text-slate-400" />
                    </Label>
                    <Input
                      type="number"
                      placeholder="Enter number"
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </Div>
                </Div>
                <Div className="flex justify-end gap-2 mt-4">
                  <Button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                  >
                    <UiIcon as={RotateCcw} className="w-3 h-3" /> Reset
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                  >
                    <UiIcon as={Save} className="w-3 h-3" /> Save
                  </Button>
                </Div>
              </Div>
            )}

            {/* Testimonials Section */}
            {adminActiveTab === 'Testimonials' && (
              <Div
                className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 sm:p-4 w-full overflow-hidden"
                style={{
                  maxWidth: '100%',
                }}
              >
                <Div className="flex items-center gap-2 mb-4">
                  <Input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-slate-300" defaultChecked />
                  <Label className="text-xs sm:text-sm font-semibold text-slate-900">Testimonials Section</Label>
                </Div>
                <Div className="space-y-3">
                  <Div>
                    <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      Section Title
                      <UiIcon as={Info} className="w-3 h-3 text-slate-400" />
                    </Label>
                    <Input
                      type="text"
                      placeholder="Enter testimonials section title"
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </Div>
                  <Div>
                    <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      Number of Testimonials
                      <UiIcon as={Info} className="w-3 h-3 text-slate-400" />
                    </Label>
                    <Input
                      type="number"
                      placeholder="Enter number"
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </Div>
                </Div>
                <Div className="flex justify-end gap-2 mt-4">
                  <Button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                  >
                    <UiIcon as={RotateCcw} className="w-3 h-3" /> Reset
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                  >
                    <UiIcon as={Save} className="w-3 h-3" /> Save
                  </Button>
                </Div>
              </Div>
            )}

            {/* Available zone Section */}
            {adminActiveTab === 'Available zone' && (
              <Div
                className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 sm:p-4 w-full overflow-hidden"
                style={{
                  maxWidth: '100%',
                }}
              >
                <Div className="flex items-center gap-2 mb-4">
                  <Input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-slate-300" defaultChecked />
                  <Label className="text-xs sm:text-sm font-semibold text-slate-900">Available zone Section</Label>
                </Div>
                <Div className="space-y-3">
                  <Div>
                    <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      Section Title
                      <UiIcon as={Info} className="w-3 h-3 text-slate-400" />
                    </Label>
                    <Input
                      type="text"
                      placeholder="Enter available zone section title"
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </Div>
                  <Div>
                    <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      Enable Zone Display
                      <UiIcon as={Info} className="w-3 h-3 text-slate-400" />
                    </Label>
                    <Div className="flex items-center gap-2">
                      <Input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-slate-300" defaultChecked />
                      <Span className="text-xs sm:text-sm text-slate-700">Show available zones</Span>
                    </Div>
                  </Div>
                </Div>
                <Div className="flex justify-end gap-2 mt-4">
                  <Button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                  >
                    <UiIcon as={RotateCcw} className="w-3 h-3" /> Reset
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                  >
                    <UiIcon as={Save} className="w-3 h-3" /> Save
                  </Button>
                </Div>
              </Div>
            )}

            {/* Fixed data Section */}
            {adminActiveTab === 'Fixed data' && (
              <Div
                className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 sm:p-4 w-full overflow-hidden"
                style={{
                  maxWidth: '100%',
                }}
              >
                <Div className="flex items-center gap-2 mb-4">
                  <Input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-slate-300" defaultChecked />
                  <Label className="text-xs sm:text-sm font-semibold text-slate-900">Fixed data Section</Label>
                </Div>
                <Div className="space-y-3">
                  <Div>
                    <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      Company Name
                      <UiIcon as={Info} className="w-3 h-3 text-slate-400" />
                    </Label>
                    <Input
                      type="text"
                      placeholder="Enter company name"
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </Div>
                  <Div>
                    <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      Contact Email
                      <UiIcon as={Info} className="w-3 h-3 text-slate-400" />
                    </Label>
                    <Input
                      type="email"
                      placeholder="Enter contact email"
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </Div>
                  <Div>
                    <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      Contact Phone
                      <UiIcon as={Info} className="w-3 h-3 text-slate-400" />
                    </Label>
                    <Input
                      type="tel"
                      placeholder="Enter contact phone"
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </Div>
                </Div>
                <Div className="flex justify-end gap-2 mt-4">
                  <Button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                  >
                    <UiIcon as={RotateCcw} className="w-3 h-3" /> Reset
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                  >
                    <UiIcon as={Save} className="w-3 h-3" /> Save
                  </Button>
                </Div>
              </Div>
            )}

            {/* Button & links Section */}
            {adminActiveTab === 'Button & links' && (
              <Div
                className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 sm:p-4 w-full overflow-hidden"
                style={{
                  maxWidth: '100%',
                }}
              >
                <Div className="flex items-center gap-2 mb-4">
                  <Input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-slate-300" defaultChecked />
                  <Label className="text-xs sm:text-sm font-semibold text-slate-900">Button & links Section</Label>
                </Div>
                <Div className="space-y-3">
                  <Div>
                    <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      Primary Button Text
                      <UiIcon as={Info} className="w-3 h-3 text-slate-400" />
                    </Label>
                    <Input
                      type="text"
                      placeholder="Enter primary button text"
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </Div>
                  <Div>
                    <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      Primary Button Link
                      <UiIcon as={Info} className="w-3 h-3 text-slate-400" />
                    </Label>
                    <Input
                      type="url"
                      placeholder="Enter button link URL"
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </Div>
                  <Div>
                    <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      Secondary Button Text
                      <UiIcon as={Info} className="w-3 h-3 text-slate-400" />
                    </Label>
                    <Input
                      type="text"
                      placeholder="Enter secondary button text"
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </Div>
                  <Div>
                    <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      Secondary Button Link
                      <UiIcon as={Info} className="w-3 h-3 text-slate-400" />
                    </Label>
                    <Input
                      type="url"
                      placeholder="Enter button link URL"
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </Div>
                </Div>
                <Div className="flex justify-end gap-2 mt-4">
                  <Button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                  >
                    <UiIcon as={RotateCcw} className="w-3 h-3" /> Reset
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                  >
                    <UiIcon as={Save} className="w-3 h-3" /> Save
                  </Button>
                </Div>
              </Div>
            )}

            {/* Background color Section */}
            {adminActiveTab === 'Background color' && (
              <Div
                className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 sm:p-4 w-full overflow-hidden"
                style={{
                  maxWidth: '100%',
                }}
              >
                <Div className="flex items-center gap-2 mb-4">
                  <Input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-slate-300" defaultChecked />
                  <Label className="text-xs sm:text-sm font-semibold text-slate-900">Background color Section</Label>
                </Div>
                <Div className="space-y-3">
                  <Div>
                    <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      Primary Background Color
                      <UiIcon as={Info} className="w-3 h-3 text-slate-400" />
                    </Label>
                    <Div className="flex items-center gap-2">
                      <Div className="w-16 h-10 rounded border border-slate-300" style={{ backgroundColor: adminBackgroundColors.primary || 'transparent' }} />
                      <Input
                        type="text"
                        value={adminBackgroundColors.primary}
                        onChange={(e) =>
                          setAdminBackgroundColors((prev) => ({
                            ...prev,
                            primary: e.target.value,
                          }))
                        }
                        placeholder="#ffffff"
                        className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </Div>
                  </Div>
                  <Div>
                    <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      Secondary Background Color
                      <UiIcon as={Info} className="w-3 h-3 text-slate-400" />
                    </Label>
                    <Div className="flex items-center gap-2">
                      <Div className="w-16 h-10 rounded border border-slate-300" style={{ backgroundColor: adminBackgroundColors.secondary || 'transparent' }} />
                      <Input
                        type="text"
                        value={adminBackgroundColors.secondary}
                        onChange={(e) =>
                          setAdminBackgroundColors((prev) => ({
                            ...prev,
                            secondary: e.target.value,
                          }))
                        }
                        placeholder="#f8f9fa"
                        className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </Div>
                  </Div>
                  <Div>
                    <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      Accent Color
                      <UiIcon as={Info} className="w-3 h-3 text-slate-400" />
                    </Label>
                    <Div className="flex items-center gap-2">
                      <Div className="w-16 h-10 rounded border border-slate-300" style={{ backgroundColor: adminBackgroundColors.accent || 'transparent' }} />
                      <Input
                        type="text"
                        value={adminBackgroundColors.accent}
                        onChange={(e) =>
                          setAdminBackgroundColors((prev) => ({
                            ...prev,
                            accent: e.target.value,
                          }))
                        }
                        placeholder="#006fbd"
                        className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </Div>
                  </Div>
                </Div>
                <Div className="flex justify-end gap-2 mt-4">
                  <Button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                  >
                    <UiIcon as={RotateCcw} className="w-3 h-3" /> Reset
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                  >
                    <UiIcon as={Save} className="w-3 h-3" /> Save
                  </Button>
                </Div>
              </Div>
            )}
          </Div>
      </ScrollDiv>
    );
  }

  // React Landing Page
  return (
    <ScrollDiv className="p-2 lg:p-3 bg-slate-50 min-h-screen w-full">
        <Div className="w-full mx-auto max-w-full overflow-hidden">
          {/* Page Header */}
          <Div className="flex items-center gap-2 mb-3 max-w-full overflow-hidden">
            <UiIcon as={Monitor} className="w-5 h-5 text-slate-700" />
            <H1 className="text-xl lg:text-2xl font-bold text-slate-900">React Landing Page</H1>
          </Div>

          {/* Main Navigation Tabs */}
          <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-2 mb-3 max-w-full overflow-hidden">
            <HScroll className="w-full" contentClassName="flex items-center gap-1.5">
                {reactTabs.map((tab) => {
                  const isActive = tab === reactActiveTab;
                  return (
                    <Button
                      key={tab}
                      type="button"
                      onClick={() => setReactActiveTab(tab)}
                      className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${isActive ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                    >
                      {tab}
                    </Button>
                  );
                })}
            </HScroll>
          </Div>

          {/* Header Section */}
          {reactActiveTab === 'Header' && (
            <Div className="space-y-3 max-w-full overflow-hidden">
              <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 sm:p-4 max-w-full overflow-hidden">
                <H2 className="text-base sm:text-lg font-semibold text-slate-900 mb-1.5">Header Section</H2>
                <P className="text-xs sm:text-sm text-slate-600 mb-3">Manage main banner content including title, subtitle, and background image.</P>

                {/* Language Tabs */}
                <HScroll className="w-full border-b border-slate-200 pb-2 mb-4" contentClassName="flex items-center gap-2 sm:gap-3">
                    {languages.map((lang) => {
                      const isActive = lang.id === reactActiveLanguage;
                      return (
                        <Button
                          key={lang.id}
                          type="button"
                          onClick={() => setReactActiveLanguage(lang.id)}
                          className={`text-xs sm:text-sm font-medium transition-all pb-1 whitespace-nowrap ${isActive ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                          {lang.label}
                        </Button>
                      );
                    })}
                </HScroll>

                <Div className="space-y-3">
                  <Div>
                    <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Title ({reactHeaderContent.title.length}/50)*</Label>
                    <Input
                      type="text"
                      value={reactHeaderContent.title}
                      onChange={(e) =>
                        setReactHeaderContent((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      maxLength={50}
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </Div>

                  <Div>
                    <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Subtitle ({reactHeaderContent.subtitle.length}/100)*</Label>
                    <Input
                      type="text"
                      value={reactHeaderContent.subtitle}
                      onChange={(e) =>
                        setReactHeaderContent((prev) => ({
                          ...prev,
                          subtitle: e.target.value,
                        }))
                      }
                      maxLength={100}
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </Div>

                  <Div>
                    <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Section Background Image*</Label>
                    <P className="text-xs text-slate-500 mb-1.5">Upload your section background image.</P>
                    <P className="text-xs text-slate-500 mb-2">Jpeg, jpg, png, gif, webp Less Than 2MB (1260 x 360 px)</P>
                    <Div className="relative inline-block">
                      {reactHeaderContent.backgroundImage ? (
                        <Div className="relative">
                          <Img
                            src={reactHeaderContent.backgroundImage}
                            alt="Background"
                            className="w-40 h-24 sm:w-48 sm:h-32 object-cover rounded-lg border border-slate-300"
                          />
                          <Button
                            type="button"
                            onClick={() => handleImageRemove(setReactHeaderContent, 'backgroundImage')}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <UiIcon as={X} className="w-3 h-3" />
                          </Button>
                        </Div>
                      ) : (
                        <Div className="cursor-pointer" onClick={() => handleImageUpload(setReactHeaderContent, 'backgroundImage')}>
                          <Div className="w-40 h-24 sm:w-48 sm:h-32 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center hover:border-blue-500 transition-colors">
                            <Span className="text-xs text-slate-500">Upload Image</Span>
                          </Div>
                        </Div>
                      )}
                    </Div>
                  </Div>
                </Div>

                <Div className="flex justify-end gap-2 mt-4">
                  <Button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                  >
                    <UiIcon as={RotateCcw} className="w-3 h-3" />
                    Reset
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                  >
                    <UiIcon as={Save} className="w-3 h-3" />
                    Save
                  </Button>
                </Div>
              </Div>

              {/* Location picker section */}
              <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 sm:p-4 max-w-full overflow-hidden">
                <H2 className="text-base sm:text-lg font-semibold text-slate-900 mb-1.5">Location picker section</H2>
                <P className="text-xs sm:text-sm text-slate-600 mb-3">
                  Customize location search bar and placeholder text to help users find nearby restaurants.
                </P>

                {/* Language Tabs */}
                <HScroll className="w-full border-b border-slate-200 pb-2 mb-4" contentClassName="flex items-center gap-2 sm:gap-3">
                    {languages.map((lang) => {
                      const isActive = lang.id === reactActiveLanguage;
                      return (
                        <Button
                          key={lang.id}
                          type="button"
                          onClick={() => setReactActiveLanguage(lang.id)}
                          className={`text-xs sm:text-sm font-medium transition-all pb-1 whitespace-nowrap ${isActive ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                          {lang.label}
                        </Button>
                      );
                    })}
                </HScroll>

                <Div>
                  <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">
                    Placeholder ({reactLocationPicker.placeholder.length}/50)*
                  </Label>
                  <Input
                    type="text"
                    value={reactLocationPicker.placeholder}
                    onChange={(e) =>
                      setReactLocationPicker((prev) => ({
                        ...prev,
                        placeholder: e.target.value,
                      }))
                    }
                    maxLength={50}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </Div>

                <Div className="flex justify-end gap-2 mt-4">
                  <Button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                  >
                    <UiIcon as={RotateCcw} className="w-3 h-3" />
                    Reset
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                  >
                    <UiIcon as={Save} className="w-3 h-3" />
                    Save
                  </Button>
                </Div>
              </Div>

              {/* Business Statistics Section */}
              <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 sm:p-4 max-w-full overflow-hidden">
                <H2 className="text-base sm:text-lg font-semibold text-slate-900 mb-1.5">Business Statistics Section</H2>
                <P className="text-xs sm:text-sm text-slate-600 mb-3">
                  Display key business statistics like total restaurants, happy customers, and average delivery time.
                </P>

                <Div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Div>
                    <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Restaurant*</Label>
                    <Input
                      type="number"
                      value={reactBusinessStats.restaurant}
                      onChange={(e) =>
                        setReactBusinessStats((prev) => ({
                          ...prev,
                          restaurant: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </Div>

                  <Div>
                    <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Happy Customer*</Label>
                    <Input
                      type="number"
                      value={reactBusinessStats.happyCustomer}
                      onChange={(e) =>
                        setReactBusinessStats((prev) => ({
                          ...prev,
                          happyCustomer: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </Div>

                  <Div>
                    <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Average Delivery (Minutes)*</Label>
                    <Input
                      type="number"
                      value={reactBusinessStats.averageDelivery}
                      onChange={(e) =>
                        setReactBusinessStats((prev) => ({
                          ...prev,
                          averageDelivery: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </Div>
                </Div>

                <Div className="flex justify-end gap-2 mt-4">
                  <Button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                  >
                    <UiIcon as={RotateCcw} className="w-3 h-3" />
                    Reset
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                  >
                    <UiIcon as={Save} className="w-3 h-3" />
                    Save
                  </Button>
                </Div>
              </Div>
            </Div>
          )}

          {/* Services Section */}
          {reactActiveTab === 'Services' && (
            <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 sm:p-4 max-w-full overflow-hidden">
              <H2 className="text-base sm:text-lg font-semibold text-slate-900 mb-1.5">Services Section</H2>
              <P className="text-xs sm:text-sm text-slate-600 mb-4">Configure services section content and settings.</P>
              <Div className="space-y-3">
                <Div>
                  <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Section Title</Label>
                  <Input
                    type="text"
                    placeholder="Enter section title"
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </Div>
                <Div>
                  <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Section Description</Label>
                  <Textarea
                    rows={4}
                    placeholder="Enter section description"
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </Div>
              </Div>
              <Div className="flex justify-end gap-2 mt-4">
                <Button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                >
                  <UiIcon as={RotateCcw} className="w-3 h-3" />
                  Reset
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                >
                  <UiIcon as={Save} className="w-3 h-3" />
                  Save
                </Button>
              </Div>
            </Div>
          )}

          {/* Stepper Section */}
          {reactActiveTab === 'Stepper Section' && (
            <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 sm:p-4 max-w-full overflow-hidden">
              <H2 className="text-base sm:text-lg font-semibold text-slate-900 mb-1.5">Stepper Section</H2>
              <P className="text-xs sm:text-sm text-slate-600 mb-4">Configure step-by-step process display.</P>
              <Div className="space-y-3">
                <Div>
                  <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Step 1 Title</Label>
                  <Input
                    type="text"
                    placeholder="Enter step 1 title"
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </Div>
                <Div>
                  <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Step 2 Title</Label>
                  <Input
                    type="text"
                    placeholder="Enter step 2 title"
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </Div>
                <Div>
                  <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Step 3 Title</Label>
                  <Input
                    type="text"
                    placeholder="Enter step 3 title"
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </Div>
              </Div>
              <Div className="flex justify-end gap-2 mt-4">
                <Button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                >
                  <UiIcon as={RotateCcw} className="w-3 h-3" />
                  Reset
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                >
                  <UiIcon as={Save} className="w-3 h-3" />
                  Save
                </Button>
              </Div>
            </Div>
          )}

          {/* Promotional Banner */}
          {reactActiveTab === 'Promotional Banner' && (
            <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 sm:p-4 max-w-full overflow-hidden">
              <H2 className="text-base sm:text-lg font-semibold text-slate-900 mb-1.5">Promotional Banner</H2>
              <P className="text-xs sm:text-sm text-slate-600 mb-4">Configure promotional banner content and images.</P>
              <Div className="space-y-3">
                <Div>
                  <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Banner Title</Label>
                  <Input
                    type="text"
                    placeholder="Enter banner title"
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </Div>
                <Div>
                  <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Banner Image</Label>
                  <Div className="relative inline-block">
                    <Div className="cursor-pointer">
                      <Div className="w-40 h-24 sm:w-48 sm:h-32 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center hover:border-blue-500 transition-colors">
                        <Span className="text-xs text-slate-500">Upload Image</Span>
                      </Div>
                    </Div>
                  </Div>
                </Div>
              </Div>
              <Div className="flex justify-end gap-2 mt-4">
                <Button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                >
                  <UiIcon as={RotateCcw} className="w-3 h-3" />
                  Reset
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                >
                  <UiIcon as={Save} className="w-3 h-3" />
                  Save
                </Button>
              </Div>
            </Div>
          )}

          {/* Categories */}
          {reactActiveTab === 'Categories' && (
            <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 sm:p-4 max-w-full overflow-hidden">
              <H2 className="text-base sm:text-lg font-semibold text-slate-900 mb-1.5">Categories Section</H2>
              <P className="text-xs sm:text-sm text-slate-600 mb-4">Configure food categories display settings.</P>
              <Div className="space-y-3">
                <Div>
                  <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Section Title</Label>
                  <Input
                    type="text"
                    placeholder="Enter categories section title"
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </Div>
                <Div>
                  <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Number of Categories to Display</Label>
                  <Input
                    type="number"
                    placeholder="Enter number"
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </Div>
              </Div>
              <Div className="flex justify-end gap-2 mt-4">
                <Button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                >
                  <UiIcon as={RotateCcw} className="w-3 h-3" />
                  Reset
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                >
                  <UiIcon as={Save} className="w-3 h-3" />
                  Save
                </Button>
              </Div>
            </Div>
          )}

          {/* Download Apps */}
          {reactActiveTab === 'Download Apps' && (
            <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 sm:p-4 max-w-full overflow-hidden">
              <H2 className="text-base sm:text-lg font-semibold text-slate-900 mb-1.5">Download Apps Section</H2>
              <P className="text-xs sm:text-sm text-slate-600 mb-4">Configure mobile app download links and information.</P>
              <Div className="space-y-3">
                <Div>
                  <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Section Title</Label>
                  <Input
                    type="text"
                    placeholder="Enter section title"
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </Div>
                <Div>
                  <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Google Play Store Link</Label>
                  <Input
                    type="url"
                    placeholder="https://play.google.com/..."
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </Div>
                <Div>
                  <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Apple App Store Link</Label>
                  <Input
                    type="url"
                    placeholder="https://apps.apple.com/..."
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </Div>
              </Div>
              <Div className="flex justify-end gap-2 mt-4">
                <Button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                >
                  <UiIcon as={RotateCcw} className="w-3 h-3" />
                  Reset
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                >
                  <UiIcon as={Save} className="w-3 h-3" />
                  Save
                </Button>
              </Div>
            </Div>
          )}

          {/* Gallery */}
          {reactActiveTab === 'Gallery' && (
            <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 sm:p-4 max-w-full overflow-hidden">
              <H2 className="text-base sm:text-lg font-semibold text-slate-900 mb-1.5">Gallery Section</H2>
              <P className="text-xs sm:text-sm text-slate-600 mb-4">Configure image gallery settings and display options.</P>
              <Div className="space-y-3">
                <Div>
                  <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Section Title</Label>
                  <Input
                    type="text"
                    placeholder="Enter gallery section title"
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </Div>
                <Div>
                  <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Number of Images per Row</Label>
                  <Select className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <Option>3</Option>
                    <Option>4</Option>
                    <Option>6</Option>
                  </Select>
                </Div>
              </Div>
              <Div className="flex justify-end gap-2 mt-4">
                <Button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                >
                  <UiIcon as={RotateCcw} className="w-3 h-3" />
                  Reset
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                >
                  <UiIcon as={Save} className="w-3 h-3" />
                  Save
                </Button>
              </Div>
            </Div>
          )}

          {/* Available zone */}
          {reactActiveTab === 'Available zone' && (
            <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 sm:p-4 max-w-full overflow-hidden">
              <H2 className="text-base sm:text-lg font-semibold text-slate-900 mb-1.5">Available Zone Section</H2>
              <P className="text-xs sm:text-sm text-slate-600 mb-4">Configure available delivery zones display.</P>
              <Div className="space-y-3">
                <Div>
                  <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Section Title</Label>
                  <Input
                    type="text"
                    placeholder="Enter section title"
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </Div>
                <Div>
                  <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Enable Zone Display</Label>
                  <Div className="flex items-center gap-2">
                    <Input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-slate-300" />
                    <Span className="text-xs sm:text-sm text-slate-700">Show available zones</Span>
                  </Div>
                </Div>
              </Div>
              <Div className="flex justify-end gap-2 mt-4">
                <Button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                >
                  <UiIcon as={RotateCcw} className="w-3 h-3" />
                  Reset
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                >
                  <UiIcon as={Save} className="w-3 h-3" />
                  Save
                </Button>
              </Div>
            </Div>
          )}

          {/* Registration section */}
          {reactActiveTab === 'Registration section' && (
            <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 sm:p-4 max-w-full overflow-hidden">
              <H2 className="text-base sm:text-lg font-semibold text-slate-900 mb-1.5">Registration Section</H2>
              <P className="text-xs sm:text-sm text-slate-600 mb-4">Configure user registration section settings.</P>
              <Div className="space-y-3">
                <Div>
                  <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Section Title</Label>
                  <Input
                    type="text"
                    placeholder="Enter registration section title"
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </Div>
                <Div>
                  <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Registration Button Text</Label>
                  <Input
                    type="text"
                    placeholder="Enter button text"
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </Div>
              </Div>
              <Div className="flex justify-end gap-2 mt-4">
                <Button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                >
                  <UiIcon as={RotateCcw} className="w-3 h-3" />
                  Reset
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                >
                  <UiIcon as={Save} className="w-3 h-3" />
                  Save
                </Button>
              </Div>
            </Div>
          )}

          {/* Testimonials */}
          {reactActiveTab === 'Testimonials' && (
            <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 sm:p-4 max-w-full overflow-hidden">
              <H2 className="text-base sm:text-lg font-semibold text-slate-900 mb-1.5">Testimonials Section</H2>
              <P className="text-xs sm:text-sm text-slate-600 mb-4">Configure customer testimonials display settings.</P>
              <Div className="space-y-3">
                <Div>
                  <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Section Title</Label>
                  <Input
                    type="text"
                    placeholder="Enter testimonials section title"
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </Div>
                <Div>
                  <Label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Number of Testimonials to Display</Label>
                  <Input
                    type="number"
                    placeholder="Enter number"
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </Div>
              </Div>
              <Div className="flex justify-end gap-2 mt-4">
                <Button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                >
                  <UiIcon as={RotateCcw} className="w-3 h-3" />
                  Reset
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1.5"
                >
                  <UiIcon as={Save} className="w-3 h-3" />
                  Save
                </Button>
              </Div>
            </Div>
          )}
        </Div>
    </ScrollDiv>
  );
}
