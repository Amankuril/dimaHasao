/* Ported from Frontend/src/modules/Food/pages/admin/system/LandingPageSettings.jsx (tools/port.js first pass). */
import { Children, useState } from 'react';
import { Monitor, Info, X, RotateCcw, Save, Upload } from 'lucide-react-native';
import mobileImage1 from '../../../assets/Transaction-report-icons/mobile_image1.png';
import { pickImage, objectUrl } from '../../../../lib/files';
import { AdminPage, PageHeader, Card, SectionTitle, Field, INPUT, BTN_PRIMARY, BTN_SECONDARY, BTN_TEXT_PRIMARY, BTN_TEXT_SECONDARY, useLayoutWidth } from '../../../../admin/ui';
import { Button, Div, HScroll, Img, Input, Option, P, Select, Span, Textarea, Icon as UiIcon } from '../../../../components/web';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};

const TEXTAREA = 'px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900';

/** The section tab strip: scrolls sideways, 44px targets, never clipped. */
function TabStrip({ tabs, active, onSelect, label }) {
  return (
    <Card className="mb-4" padded={false}>
      <HScroll contentClassName="flex-row items-center gap-2 p-2">
        {tabs.map((tab) => {
          const isActive = tab === active;
          return (
            <Button
              key={tab}
              type="button"
              onClick={() => onSelect(tab)}
              accessibilityLabel={`${label}: ${tab}`}
              className={`h-11 px-4 rounded-lg items-center justify-center ${isActive ? 'bg-blue-600' : 'bg-white'}`}
            >
              <Span className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-slate-700'}`}>{tab}</Span>
            </Button>
          );
        })}
      </HScroll>
    </Card>
  );
}

/** The language strip inside a section: one row, scrolls, 44px targets. */
function LanguageStrip({ languages, active, onSelect, className }) {
  return (
    <HScroll className={className} contentClassName="flex-row items-center gap-3">
      {languages.map((lang) => {
        const isActive = lang.id === active;
        return (
          <Button
            key={lang.id}
            type="button"
            onClick={() => onSelect(lang.id)}
            accessibilityLabel={`Language: ${lang.label}`}
            className={`h-11 px-1 justify-center border-b-2 ${isActive ? 'border-blue-600' : 'border-white'}`}
          >
            <Span className={`text-sm font-semibold ${isActive ? 'text-blue-600' : 'text-slate-600'}`}>{lang.label}</Span>
          </Button>
        );
      })}
    </HScroll>
  );
}

/** Two columns from 700px, one below it — the grid classes native drops, measured. */
function FormGrid({ children, max = 2, className }) {
  const { tablet } = useLayoutWidth();
  const [width, setWidth] = useState(0);
  const items = Children.toArray(children).filter(Boolean);
  const cols = tablet && width ? Math.min(max, items.length) : 1;
  const itemWidth = cols > 1 ? (width - 12 * (cols - 1)) / cols : '100%';
  return (
    <Div
      className={`flex-row flex-wrap gap-3 ${className || ''}`}
      onLayout={(e) => {
        const w = Math.round(e.nativeEvent.layout.width);
        if (w && Math.abs(w - width) > 1) setWidth(w);
      }}
    >
      {items.map((child, i) => (
        <Div key={i} style={{ width: itemWidth }}>
          {child}
        </Div>
      ))}
    </Div>
  );
}

/** The Reset / Save pair every section carries. */
function SectionActions({ onReset, onSave }) {
  return (
    <Div className="flex-row flex-wrap items-center justify-end gap-2 mt-4">
      <Button type="button" onClick={onReset} className={BTN_SECONDARY} accessibilityLabel="Reset this section">
        <UiIcon as={RotateCcw} size={16} className="text-slate-600" />
        <Span className={BTN_TEXT_SECONDARY}>Reset</Span>
      </Button>
      <Button type="button" onClick={onSave} className={BTN_PRIMARY} accessibilityLabel="Save this section">
        <UiIcon as={Save} size={16} className="text-white" />
        <Span className={BTN_TEXT_PRIMARY}>Save</Span>
      </Button>
    </Div>
  );
}

/** A section's on/off header: the checkbox and its name in one 44px row. */
function SectionToggle({ label, checked, defaultChecked, onChange }) {
  return (
    <Div className="flex-row items-center gap-3 mb-3 h-11">
      <Input
        type="checkbox"
        checked={checked}
        defaultChecked={defaultChecked}
        onChange={onChange}
        className="w-5 h-5 rounded border-slate-300"
      />
      <Span className="text-base font-semibold text-slate-900 flex-1">{label}</Span>
    </Div>
  );
}

/** An image slot: the preview with a 44px remove button, or a tap-to-upload tile. */
function ImageSlot({ src, alt, onPick, onRemove, width, height }) {
  if (src) {
    return (
      <Div className="flex-row items-start gap-2">
        <Img src={src} alt={alt} className="rounded-lg border border-slate-200" style={{ width, height }} contentFit="cover" />
        <Button type="button" onClick={onRemove} accessibilityLabel={`Remove ${alt} image`} className="w-11 h-11 rounded-lg bg-red-600 items-center justify-center">
          <UiIcon as={X} size={16} className="text-white" />
        </Button>
      </Div>
    );
  }
  return (
    <Button
      type="button"
      onClick={onPick}
      accessibilityLabel={`Upload ${alt} image`}
      className="rounded-lg border border-dashed border-slate-300 bg-slate-50 items-center justify-center gap-2"
      style={{ width, height }}
    >
      <UiIcon as={Upload} size={18} className="text-slate-400" />
      <Span className="text-xs font-semibold text-slate-500">Upload</Span>
    </Button>
  );
}

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
      label: 'Spanish - español(ES)',
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
      <AdminPage maxWidth={720}>
        <PageHeader
          icon={Monitor}
          title="Admin Landing Page"
          subtitle="Edit one section at a time, then save it."
          breadcrumb={[{ label: 'Food' }, { label: 'System' }, { label: 'Admin landing page' }]}
          actions={
            <Div className="flex-row items-center gap-1.5">
              <UiIcon as={Info} size={14} className="text-blue-600" />
              <Span className="text-sm font-semibold text-blue-600">See how it works!</Span>
            </Div>
          }
        />

        <TabStrip tabs={adminTabs} active={adminActiveTab} onSelect={setAdminActiveTab} label="Section" />

        <Card className="mb-4">
          <SectionTitle>Language</SectionTitle>
          <LanguageStrip languages={languages} active={adminActiveLanguage} onSelect={setAdminActiveLanguage} />
        </Card>

        {/* Header Content Section */}
        {adminActiveTab === 'Header' && (
          <Div className="gap-4">
            <Card>
              <SectionToggle
                label="Header Content Section"
                checked={adminHeaderContent.enabled}
                onChange={(e) =>
                  setAdminHeaderContent((prev) => ({
                    ...prev,
                    enabled: e.target.checked,
                  }))
                }
              />
              <Div className="gap-3">
                <Field label="Title">
                  <Input
                    type="text"
                    value={adminHeaderContent.title}
                    onChange={(e) =>
                      setAdminHeaderContent((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    className={INPUT}
                  />
                </Field>
                <Field label="Subtitle">
                  <Input
                    type="text"
                    value={adminHeaderContent.subtitle}
                    onChange={(e) =>
                      setAdminHeaderContent((prev) => ({
                        ...prev,
                        subtitle: e.target.value,
                      }))
                    }
                    className={INPUT}
                  />
                </Field>
                <Field label="Tagline">
                  <Input
                    type="text"
                    value={adminHeaderContent.tagline}
                    onChange={(e) =>
                      setAdminHeaderContent((prev) => ({
                        ...prev,
                        tagline: e.target.value,
                      }))
                    }
                    className={INPUT}
                  />
                </Field>
                <FormGrid>
                  <Field label="Button Name">
                    <Input
                      type="text"
                      value={adminHeaderContent.buttonName}
                      onChange={(e) =>
                        setAdminHeaderContent((prev) => ({
                          ...prev,
                          buttonName: e.target.value,
                        }))
                      }
                      className={INPUT}
                    />
                  </Field>
                  <Field label="Redirect Link" hint={adminHeaderContent.redirectLinkEnabled ? 'The button opens this link.' : 'The link is switched off.'}>
                    <Div className="flex-row items-center gap-2">
                      <Input
                        type="text"
                        value={adminHeaderContent.redirectLink}
                        onChange={(e) =>
                          setAdminHeaderContent((prev) => ({
                            ...prev,
                            redirectLink: e.target.value,
                          }))
                        }
                        className={`${INPUT} flex-1`}
                      />
                      <Button
                        type="button"
                        onClick={() =>
                          setAdminHeaderContent((prev) => ({
                            ...prev,
                            redirectLinkEnabled: !prev.redirectLinkEnabled,
                          }))
                        }
                        accessibilityLabel={adminHeaderContent.redirectLinkEnabled ? 'Turn the redirect link off' : 'Turn the redirect link on'}
                        className={`h-11 px-4 rounded-lg items-center justify-center ${adminHeaderContent.redirectLinkEnabled ? 'bg-blue-600' : 'bg-slate-100'}`}
                      >
                        <Span className={`text-sm font-semibold ${adminHeaderContent.redirectLinkEnabled ? 'text-white' : 'text-slate-600'}`}>
                          {adminHeaderContent.redirectLinkEnabled ? 'ON' : 'OFF'}
                        </Span>
                      </Button>
                    </Div>
                  </Field>
                </FormGrid>
              </Div>
              <SectionActions onReset={handleReset} onSave={handleSave} />
            </Card>

            {/* Image Content Section */}
            <Card>
              <SectionToggle
                label="Image Content"
                checked={adminImageContent.enabled}
                onChange={(e) =>
                  setAdminImageContent((prev) => ({
                    ...prev,
                    enabled: e.target.checked,
                  }))
                }
              />
              <Div className="gap-3">
                <Field label="Content Image" hint="800 x 800 px">
                  <ImageSlot
                    src={adminImageContent.contentImage}
                    alt="Content"
                    width={128}
                    height={128}
                    onPick={() => handleImageUpload(setAdminImageContent, 'contentImage')}
                    onRemove={() => handleImageRemove(setAdminImageContent, 'contentImage')}
                  />
                </Field>
                <Field label="Section Background Image" hint="1600 x 1700 px">
                  <ImageSlot
                    src={adminImageContent.backgroundImage}
                    alt="Background"
                    width={128}
                    height={128}
                    onPick={() => handleImageUpload(setAdminImageContent, 'backgroundImage')}
                    onRemove={() => handleImageRemove(setAdminImageContent, 'backgroundImage')}
                  />
                </Field>
              </Div>
              <SectionActions onReset={handleReset} onSave={handleSave} />
            </Card>

            {/* Floating Icon Content Section */}
            <Card>
              <SectionToggle
                label="Floating Icon Content"
                checked={adminFloatingIcon.enabled}
                onChange={(e) =>
                  setAdminFloatingIcon((prev) => ({
                    ...prev,
                    enabled: e.target.checked,
                  }))
                }
              />
              <FormGrid>
                <Field label="Total Order">
                  <Input
                    type="text"
                    value={adminFloatingIcon.totalOrder}
                    onChange={(e) =>
                      setAdminFloatingIcon((prev) => ({
                        ...prev,
                        totalOrder: e.target.value,
                      }))
                    }
                    className={INPUT}
                  />
                </Field>
                <Field label="Total User">
                  <Input
                    type="text"
                    value={adminFloatingIcon.totalUser}
                    onChange={(e) =>
                      setAdminFloatingIcon((prev) => ({
                        ...prev,
                        totalUser: e.target.value,
                      }))
                    }
                    className={INPUT}
                  />
                </Field>
                <Field label="Total Reviews">
                  <Input
                    type="text"
                    value={adminFloatingIcon.totalReviews}
                    onChange={(e) =>
                      setAdminFloatingIcon((prev) => ({
                        ...prev,
                        totalReviews: e.target.value,
                      }))
                    }
                    className={INPUT}
                  />
                </Field>
              </FormGrid>
              <SectionActions onReset={handleReset} onSave={handleSave} />
            </Card>
          </Div>
        )}

        {/* About us Section */}
        {adminActiveTab === 'About us' && (
          <Card>
            <SectionToggle label="About us Section" defaultChecked />
            <Div className="gap-3">
              <Field label="Title">
                <Input type="text" placeholder="Enter about us title" className={INPUT} />
              </Field>
              <Field label="Description">
                <Textarea rows={4} placeholder="Enter about us description" className={TEXTAREA} />
              </Field>
            </Div>
            <SectionActions onReset={handleReset} onSave={handleSave} />
          </Card>
        )}

        {/* Features Section */}
        {adminActiveTab === 'Features' && (
          <Card>
            <SectionToggle label="Features Section" defaultChecked />
            <FormGrid>
              <Field label="Section Title">
                <Input type="text" placeholder="Enter features section title" className={INPUT} />
              </Field>
              <Field label="Number of Features">
                <Input type="number" placeholder="Enter number" className={INPUT} />
              </Field>
            </FormGrid>
            <SectionActions onReset={handleReset} onSave={handleSave} />
          </Card>
        )}

        {/* Services Section */}
        {adminActiveTab === 'Services' && (
          <Card>
            <SectionToggle label="Services Section" defaultChecked />
            <Div className="gap-3">
              <Field label="Section Title">
                <Input type="text" placeholder="Enter services section title" className={INPUT} />
              </Field>
              <Field label="Section Description">
                <Textarea rows={3} placeholder="Enter services description" className={TEXTAREA} />
              </Field>
            </Div>
            <SectionActions onReset={handleReset} onSave={handleSave} />
          </Card>
        )}

        {/* Earn money Section */}
        {adminActiveTab === 'Earn money' && (
          <Card>
            <SectionToggle label="Earn money Section" defaultChecked />
            <FormGrid>
              <Field label="Section Title">
                <Input type="text" placeholder="Enter earn money section title" className={INPUT} />
              </Field>
              <Field label="Button Text">
                <Input type="text" placeholder="Enter button text" className={INPUT} />
              </Field>
            </FormGrid>
            <SectionActions onReset={handleReset} onSave={handleSave} />
          </Card>
        )}

        {/* Why choose us Section */}
        {adminActiveTab === 'Why choose us' && (
          <Card>
            <SectionToggle label="Why choose us Section" defaultChecked />
            <FormGrid>
              <Field label="Section Title">
                <Input type="text" placeholder="Enter why choose us title" className={INPUT} />
              </Field>
              <Field label="Number of Reasons">
                <Input type="number" placeholder="Enter number" className={INPUT} />
              </Field>
            </FormGrid>
            <SectionActions onReset={handleReset} onSave={handleSave} />
          </Card>
        )}

        {/* Testimonials Section */}
        {adminActiveTab === 'Testimonials' && (
          <Card>
            <SectionToggle label="Testimonials Section" defaultChecked />
            <FormGrid>
              <Field label="Section Title">
                <Input type="text" placeholder="Enter testimonials section title" className={INPUT} />
              </Field>
              <Field label="Number of Testimonials">
                <Input type="number" placeholder="Enter number" className={INPUT} />
              </Field>
            </FormGrid>
            <SectionActions onReset={handleReset} onSave={handleSave} />
          </Card>
        )}

        {/* Available zone Section */}
        {adminActiveTab === 'Available zone' && (
          <Card>
            <SectionToggle label="Available zone Section" defaultChecked />
            <Div className="gap-3">
              <Field label="Section Title">
                <Input type="text" placeholder="Enter available zone section title" className={INPUT} />
              </Field>
              <Field label="Enable Zone Display">
                <Div className="flex-row items-center gap-3 h-11">
                  <Input type="checkbox" className="w-5 h-5 rounded border-slate-300" defaultChecked />
                  <Span className="text-sm text-slate-700 flex-1">Show available zones</Span>
                </Div>
              </Field>
            </Div>
            <SectionActions onReset={handleReset} onSave={handleSave} />
          </Card>
        )}

        {/* Fixed data Section */}
        {adminActiveTab === 'Fixed data' && (
          <Card>
            <SectionToggle label="Fixed data Section" defaultChecked />
            <Div className="gap-3">
              <Field label="Company Name">
                <Input type="text" placeholder="Enter company name" className={INPUT} />
              </Field>
              <FormGrid>
                <Field label="Contact Email">
                  <Input type="email" placeholder="Enter contact email" className={INPUT} />
                </Field>
                <Field label="Contact Phone">
                  <Input type="tel" placeholder="Enter contact phone" className={INPUT} />
                </Field>
              </FormGrid>
            </Div>
            <SectionActions onReset={handleReset} onSave={handleSave} />
          </Card>
        )}

        {/* Button & links Section */}
        {adminActiveTab === 'Button & links' && (
          <Card>
            <SectionToggle label="Button & links Section" defaultChecked />
            <Div className="gap-3">
              <FormGrid>
                <Field label="Primary Button Text">
                  <Input type="text" placeholder="Enter primary button text" className={INPUT} />
                </Field>
                <Field label="Primary Button Link">
                  <Input type="url" placeholder="Enter button link URL" className={INPUT} />
                </Field>
              </FormGrid>
              <FormGrid>
                <Field label="Secondary Button Text">
                  <Input type="text" placeholder="Enter secondary button text" className={INPUT} />
                </Field>
                <Field label="Secondary Button Link">
                  <Input type="url" placeholder="Enter button link URL" className={INPUT} />
                </Field>
              </FormGrid>
            </Div>
            <SectionActions onReset={handleReset} onSave={handleSave} />
          </Card>
        )}

        {/* Background color Section */}
        {adminActiveTab === 'Background color' && (
          <Card>
            <SectionToggle label="Background color Section" defaultChecked />
            <Div className="gap-3">
              <Field label="Primary Background Color">
                <Div className="flex-row items-center gap-2">
                  <Div className="w-11 h-11 rounded-lg border border-slate-200" style={{ backgroundColor: adminBackgroundColors.primary || 'transparent' }} />
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
                    className={`${INPUT} flex-1`}
                  />
                </Div>
              </Field>
              <Field label="Secondary Background Color">
                <Div className="flex-row items-center gap-2">
                  <Div className="w-11 h-11 rounded-lg border border-slate-200" style={{ backgroundColor: adminBackgroundColors.secondary || 'transparent' }} />
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
                    className={`${INPUT} flex-1`}
                  />
                </Div>
              </Field>
              <Field label="Accent Color">
                <Div className="flex-row items-center gap-2">
                  <Div className="w-11 h-11 rounded-lg border border-slate-200" style={{ backgroundColor: adminBackgroundColors.accent || 'transparent' }} />
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
                    className={`${INPUT} flex-1`}
                  />
                </Div>
              </Field>
            </Div>
            <SectionActions onReset={handleReset} onSave={handleSave} />
          </Card>
        )}
      </AdminPage>
    );
  }

  // React Landing Page
  return (
    <AdminPage maxWidth={720}>
      <PageHeader
        icon={Monitor}
        title="React Landing Page"
        subtitle="Edit one section at a time, then save it."
        breadcrumb={[{ label: 'Food' }, { label: 'System' }, { label: 'React landing page' }]}
      />

      <TabStrip tabs={reactTabs} active={reactActiveTab} onSelect={setReactActiveTab} label="Section" />

      {/* Header Section */}
      {reactActiveTab === 'Header' && (
        <Div className="gap-4">
          <Card>
            <SectionTitle>Header Section</SectionTitle>
            <P className="text-sm text-slate-500 mb-3">Manage main banner content including title, subtitle, and background image.</P>
            <LanguageStrip className="mb-3" languages={languages} active={reactActiveLanguage} onSelect={setReactActiveLanguage} />
            <Div className="gap-3">
              <Field label="Title" required hint={`${reactHeaderContent.title.length}/50 characters`}>
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
                  className={INPUT}
                />
              </Field>
              <Field label="Subtitle" required hint={`${reactHeaderContent.subtitle.length}/100 characters`}>
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
                  className={INPUT}
                />
              </Field>
              <Field label="Section Background Image" required hint="Jpeg, jpg, png, gif or webp under 2MB (1260 x 360 px)">
                <ImageSlot
                  src={reactHeaderContent.backgroundImage}
                  alt="Background"
                  width={192}
                  height={120}
                  onPick={() => handleImageUpload(setReactHeaderContent, 'backgroundImage')}
                  onRemove={() => handleImageRemove(setReactHeaderContent, 'backgroundImage')}
                />
              </Field>
            </Div>
            <SectionActions onReset={handleReset} onSave={handleSave} />
          </Card>

          {/* Location picker section */}
          <Card>
            <SectionTitle>Location picker section</SectionTitle>
            <P className="text-sm text-slate-500 mb-3">Customize location search bar and placeholder text to help users find nearby restaurants.</P>
            <LanguageStrip className="mb-3" languages={languages} active={reactActiveLanguage} onSelect={setReactActiveLanguage} />
            <Field label="Placeholder" required hint={`${reactLocationPicker.placeholder.length}/50 characters`}>
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
                className={INPUT}
              />
            </Field>
            <SectionActions onReset={handleReset} onSave={handleSave} />
          </Card>

          {/* Business Statistics Section */}
          <Card>
            <SectionTitle>Business Statistics Section</SectionTitle>
            <P className="text-sm text-slate-500 mb-3">Display key business statistics like total restaurants, happy customers, and average delivery time.</P>
            <FormGrid>
              <Field label="Restaurant" required>
                <Input
                  type="number"
                  value={reactBusinessStats.restaurant}
                  onChange={(e) =>
                    setReactBusinessStats((prev) => ({
                      ...prev,
                      restaurant: e.target.value,
                    }))
                  }
                  className={INPUT}
                />
              </Field>
              <Field label="Happy Customer" required>
                <Input
                  type="number"
                  value={reactBusinessStats.happyCustomer}
                  onChange={(e) =>
                    setReactBusinessStats((prev) => ({
                      ...prev,
                      happyCustomer: e.target.value,
                    }))
                  }
                  className={INPUT}
                />
              </Field>
              <Field label="Average Delivery (Minutes)" required>
                <Input
                  type="number"
                  value={reactBusinessStats.averageDelivery}
                  onChange={(e) =>
                    setReactBusinessStats((prev) => ({
                      ...prev,
                      averageDelivery: e.target.value,
                    }))
                  }
                  className={INPUT}
                />
              </Field>
            </FormGrid>
            <SectionActions onReset={handleReset} onSave={handleSave} />
          </Card>
        </Div>
      )}

      {/* Services Section */}
      {reactActiveTab === 'Services' && (
        <Card>
          <SectionTitle>Services Section</SectionTitle>
          <P className="text-sm text-slate-500 mb-3">Configure services section content and settings.</P>
          <Div className="gap-3">
            <Field label="Section Title">
              <Input type="text" placeholder="Enter section title" className={INPUT} />
            </Field>
            <Field label="Section Description">
              <Textarea rows={4} placeholder="Enter section description" className={TEXTAREA} />
            </Field>
          </Div>
          <SectionActions onReset={handleReset} onSave={handleSave} />
        </Card>
      )}

      {/* Stepper Section */}
      {reactActiveTab === 'Stepper Section' && (
        <Card>
          <SectionTitle>Stepper Section</SectionTitle>
          <P className="text-sm text-slate-500 mb-3">Configure step-by-step process display.</P>
          <Div className="gap-3">
            <Field label="Step 1 Title">
              <Input type="text" placeholder="Enter step 1 title" className={INPUT} />
            </Field>
            <Field label="Step 2 Title">
              <Input type="text" placeholder="Enter step 2 title" className={INPUT} />
            </Field>
            <Field label="Step 3 Title">
              <Input type="text" placeholder="Enter step 3 title" className={INPUT} />
            </Field>
          </Div>
          <SectionActions onReset={handleReset} onSave={handleSave} />
        </Card>
      )}

      {/* Promotional Banner */}
      {reactActiveTab === 'Promotional Banner' && (
        <Card>
          <SectionTitle>Promotional Banner</SectionTitle>
          <P className="text-sm text-slate-500 mb-3">Configure promotional banner content and images.</P>
          <Div className="gap-3">
            <Field label="Banner Title">
              <Input type="text" placeholder="Enter banner title" className={INPUT} />
            </Field>
            <Field label="Banner Image">
              <ImageSlot src={null} alt="Banner" width={192} height={120} />
            </Field>
          </Div>
          <SectionActions onReset={handleReset} onSave={handleSave} />
        </Card>
      )}

      {/* Categories */}
      {reactActiveTab === 'Categories' && (
        <Card>
          <SectionTitle>Categories Section</SectionTitle>
          <P className="text-sm text-slate-500 mb-3">Configure food categories display settings.</P>
          <FormGrid>
            <Field label="Section Title">
              <Input type="text" placeholder="Enter categories section title" className={INPUT} />
            </Field>
            <Field label="Number of Categories to Display">
              <Input type="number" placeholder="Enter number" className={INPUT} />
            </Field>
          </FormGrid>
          <SectionActions onReset={handleReset} onSave={handleSave} />
        </Card>
      )}

      {/* Download Apps */}
      {reactActiveTab === 'Download Apps' && (
        <Card>
          <SectionTitle>Download Apps Section</SectionTitle>
          <P className="text-sm text-slate-500 mb-3">Configure mobile app download links and information.</P>
          <Div className="gap-3">
            <Field label="Section Title">
              <Input type="text" placeholder="Enter section title" className={INPUT} />
            </Field>
            <Field label="Google Play Store Link">
              <Input type="url" placeholder="https://play.google.com/..." className={INPUT} />
            </Field>
            <Field label="Apple App Store Link">
              <Input type="url" placeholder="https://apps.apple.com/..." className={INPUT} />
            </Field>
          </Div>
          <SectionActions onReset={handleReset} onSave={handleSave} />
        </Card>
      )}

      {/* Gallery */}
      {reactActiveTab === 'Gallery' && (
        <Card>
          <SectionTitle>Gallery Section</SectionTitle>
          <P className="text-sm text-slate-500 mb-3">Configure image gallery settings and display options.</P>
          <FormGrid>
            <Field label="Section Title">
              <Input type="text" placeholder="Enter gallery section title" className={INPUT} />
            </Field>
            <Field label="Number of Images per Row">
              <Select className={INPUT}>
                <Option>3</Option>
                <Option>4</Option>
                <Option>6</Option>
              </Select>
            </Field>
          </FormGrid>
          <SectionActions onReset={handleReset} onSave={handleSave} />
        </Card>
      )}

      {/* Available zone */}
      {reactActiveTab === 'Available zone' && (
        <Card>
          <SectionTitle>Available Zone Section</SectionTitle>
          <P className="text-sm text-slate-500 mb-3">Configure available delivery zones display.</P>
          <Div className="gap-3">
            <Field label="Section Title">
              <Input type="text" placeholder="Enter section title" className={INPUT} />
            </Field>
            <Field label="Enable Zone Display">
              <Div className="flex-row items-center gap-3 h-11">
                <Input type="checkbox" className="w-5 h-5 rounded border-slate-300" />
                <Span className="text-sm text-slate-700 flex-1">Show available zones</Span>
              </Div>
            </Field>
          </Div>
          <SectionActions onReset={handleReset} onSave={handleSave} />
        </Card>
      )}

      {/* Registration section */}
      {reactActiveTab === 'Registration section' && (
        <Card>
          <SectionTitle>Registration Section</SectionTitle>
          <P className="text-sm text-slate-500 mb-3">Configure user registration section settings.</P>
          <FormGrid>
            <Field label="Section Title">
              <Input type="text" placeholder="Enter registration section title" className={INPUT} />
            </Field>
            <Field label="Registration Button Text">
              <Input type="text" placeholder="Enter button text" className={INPUT} />
            </Field>
          </FormGrid>
          <SectionActions onReset={handleReset} onSave={handleSave} />
        </Card>
      )}

      {/* Testimonials */}
      {reactActiveTab === 'Testimonials' && (
        <Card>
          <SectionTitle>Testimonials Section</SectionTitle>
          <P className="text-sm text-slate-500 mb-3">Configure customer testimonials display settings.</P>
          <FormGrid>
            <Field label="Section Title">
              <Input type="text" placeholder="Enter testimonials section title" className={INPUT} />
            </Field>
            <Field label="Number of Testimonials to Display">
              <Input type="number" placeholder="Enter number" className={INPUT} />
            </Field>
          </FormGrid>
          <SectionActions onReset={handleReset} onSave={handleSave} />
        </Card>
      )}
    </AdminPage>
  );
}
