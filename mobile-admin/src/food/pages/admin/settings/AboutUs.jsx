/* Ported from Frontend/src/modules/Food/pages/admin/settings/AboutUs.jsx (tools/port.js first pass). */
import { useState, useEffect } from 'react';
import { toast } from '../../../../lib/notify';
import api, { adminAPI } from '../../../../api/food';
import { API_ENDPOINTS } from '../../../../api/config';
import { Heart, Users, Shield, Clock, Star, Award, Plus, X, Info } from 'lucide-react-native';
import { useCompanyName } from '../../../hooks/useCompanyName';
import { Button, Div, Input, Select, Span, Textarea, Icon as UiIcon } from '../../../../components/web';
import { AdminPage, PageHeader, Card, SectionTitle, Field, LoadingState, EmptyState, INPUT, BTN_PRIMARY, BTN_SECONDARY, BTN_TEXT_PRIMARY, BTN_TEXT_SECONDARY, useLayoutWidth } from '../../../../admin/ui';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};

// Icon mapping
const iconMap = {
  Heart,
  Users,
  Shield,
  Clock,
  Star,
  Award,
};
const iconOptions = [
  {
    value: 'Heart',
    label: 'Heart',
  },
  {
    value: 'Users',
    label: 'Users',
  },
  {
    value: 'Shield',
    label: 'Shield',
  },
  {
    value: 'Clock',
    label: 'Clock',
  },
  {
    value: 'Star',
    label: 'Star',
  },
  {
    value: 'Award',
    label: 'Award',
  },
];
const colorOptions = [
  {
    value: 'text-pink-600 dark:text-pink-400',
    label: 'Pink',
    bg: 'bg-pink-100 dark:bg-pink-900/30',
  },
  {
    value: 'text-blue-600 dark:text-blue-400',
    label: 'Blue',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
  },
  {
    value: 'text-green-600 dark:text-green-400',
    label: 'Green',
    bg: 'bg-green-100 dark:bg-green-900/30',
  },
  {
    value: 'text-orange-600 dark:text-orange-400',
    label: 'Orange',
    bg: 'bg-orange-100 dark:bg-orange-900/30',
  },
  {
    value: 'text-purple-600 dark:text-purple-400',
    label: 'Purple',
    bg: 'bg-purple-100 dark:bg-purple-900/30',
  },
  {
    value: 'text-red-600 dark:text-red-400',
    label: 'Red',
    bg: 'bg-red-100 dark:bg-red-900/30',
  },
];
export default function AboutUs() {
  const companyName = useCompanyName();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aboutData, setAboutData] = useState({
    appName: 'Dima Hasao Food',
    version: '1.0.0',
    description: '',
    logo: '',
    features: [],
  });
  useEffect(() => {
    fetchAboutData();
  }, []);
  const fetchAboutData = async () => {
    try {
      setLoading(true);
      const response = await api.get(API_ENDPOINTS.ADMIN.ABOUT, {
        contextModule: 'admin',
      });
      if (response.data.success) {
        const data = response.data.data;
        if (data && typeof data === 'object') {
          setAboutData((prev) => ({
            ...prev,
            ...data,
            features: Array.isArray(data.features) ? data.features : [],
          }));
        }
      }
    } catch (error) {
      debugError('Error fetching about data:', error);
      toast.error('Failed to load about page data');
    } finally {
      setLoading(false);
    }
  };
  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await api.put(API_ENDPOINTS.ADMIN.ABOUT, aboutData, {
        contextModule: 'admin',
      });
      if (response.data.success) {
        toast.success('About page updated successfully');
        const data = response.data.data;
        if (data && typeof data === 'object') {
          setAboutData((prev) => ({
            ...prev,
            ...data,
            features: Array.isArray(data.features) ? data.features : [],
          }));
        }
      }
    } catch (error) {
      debugError('Error saving about data:', error);
      toast.error(error.response?.data?.message || 'Failed to save about page');
    } finally {
      setSaving(false);
    }
  };
  const addFeature = () => {
    setAboutData((prev) => ({
      ...prev,
      features: [
        ...prev.features,
        {
          icon: 'Heart',
          title: '',
          description: '',
          color: 'text-pink-600 dark:text-pink-400',
          bgColor: 'bg-pink-100 dark:bg-pink-900/30',
          order: prev.features.length,
        },
      ],
    }));
  };
  const removeFeature = async (index) => {
    try {
      // Update state immediately for better UX
      const updatedData = {
        ...aboutData,
        features: aboutData.features.filter((_, i) => i !== index),
      };
      setAboutData(updatedData);

      // Save to backend immediately
      setSaving(true);
      const response = await api.put(API_ENDPOINTS.ADMIN.ABOUT, updatedData, {
        contextModule: 'admin',
      });
      if (response.data.success) {
        toast.success('Feature deleted successfully');
        const data = response.data.data;
        if (data && typeof data === 'object') {
          setAboutData((prev) => ({
            ...prev,
            ...data,
            features: Array.isArray(data.features) ? data.features : [],
          }));
        }
      }
    } catch (error) {
      debugError('Error deleting feature:', error);
      toast.error(error.response?.data?.message || 'Failed to delete feature');
      // Revert state on error
      fetchAboutData();
    } finally {
      setSaving(false);
    }
  };
  const updateFeature = (index, field, value) => {
    setAboutData((prev) => {
      const newFeatures = [...prev.features];
      newFeatures[index] = {
        ...newFeatures[index],
        [field]: value,
      };

      // Update bgColor when color changes
      if (field === 'color') {
        const colorOption = colorOptions.find((opt) => opt.value === value);
        if (colorOption) {
          newFeatures[index].bgColor = colorOption.bg;
        }
      }
      return {
        ...prev,
        features: newFeatures,
      };
    });
  };
  const { tablet } = useLayoutWidth();
  const TEXTAREA = 'px-3 py-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-900';
  if (loading) {
    return (
      <AdminPage maxWidth={720}>
        <PageHeader icon={Info} title="About us" subtitle="Manage your About page content" breadcrumb={[{ label: 'Food' }, { label: 'Settings' }, { label: 'About us' }]} />
        <LoadingState label="Loading the About page…" />
      </AdminPage>
    );
  }
  return (
    <AdminPage maxWidth={720}>
      <PageHeader
        icon={Info}
        title="About us"
        subtitle="Manage your About page content"
        breadcrumb={[{ label: 'Food' }, { label: 'Settings' }, { label: 'About us' }]}
      />

      <Card className="mb-4">
        <SectionTitle>Basic information</SectionTitle>
        <Div className="gap-3">
          <Div className={tablet ? 'flex-row items-start gap-3' : 'gap-3'}>
            <Field label="App name" className={tablet ? 'flex-1' : null}>
              <Input
                nativeID="appName"
                value={aboutData.appName}
                onChange={(e) =>
                  setAboutData((prev) => ({
                    ...prev,
                    appName: e.target.value,
                  }))
                }
                placeholder={companyName}
                className={INPUT}
              />
            </Field>
            <Field label="Version" className={tablet ? 'flex-1' : null}>
              <Input
                nativeID="version"
                value={aboutData.version}
                onChange={(e) =>
                  setAboutData((prev) => ({
                    ...prev,
                    version: e.target.value,
                  }))
                }
                placeholder="1.0.0"
                className={INPUT}
              />
            </Field>
          </Div>
          <Field label="Description">
            <Textarea
              nativeID="description"
              value={aboutData.description}
              onChange={(e) =>
                setAboutData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Your trusted food delivery partner..."
              rows={4}
              className={TEXTAREA}
            />
          </Field>
          <Field label="Logo URL" hint="A direct link to a PNG or JPG.">
            <Input
              nativeID="logo"
              value={aboutData.logo}
              onChange={(e) =>
                setAboutData((prev) => ({
                  ...prev,
                  logo: e.target.value,
                }))
              }
              placeholder="https://example.com/logo.png"
              className={INPUT}
            />
          </Field>
        </Div>
      </Card>

      <Card className="mb-4">
        <SectionTitle
          action={
            <Button onClick={addFeature} className={BTN_SECONDARY} accessibilityLabel="Add feature">
              <UiIcon as={Plus} size={16} className="text-slate-700" />
              <Span className={BTN_TEXT_SECONDARY}>Add</Span>
            </Button>
          }
        >
          Features
        </SectionTitle>
        {aboutData.features.length === 0 ? (
          <EmptyState
            title="No features yet"
            message="Features are the highlight cards on the About page."
            actionLabel="Add a feature"
            onAction={addFeature}
            icon={Star}
            className="border-0"
          />
        ) : (
          <Div className="gap-3">
            {aboutData.features.map((feature, index) => {
              const IconComponent = iconMap[feature.icon] || Heart;
              return (
                <Div key={index} className="rounded-xl border border-slate-200 p-3 gap-3">
                  <Div className="flex-row items-center gap-3">
                    <Div className={`${feature.bgColor} rounded-lg w-11 h-11 items-center justify-center shrink-0`}>
                      <UiIcon as={IconComponent} size={20} className={feature.color} />
                    </Div>
                    <Span className="flex-1 text-sm font-semibold text-slate-900">{feature.title || `Feature ${index + 1}`}</Span>
                    <Button
                      onClick={() => removeFeature(index)}
                      className="w-11 h-11 rounded-lg items-center justify-center border border-slate-200 bg-white"
                      accessibilityLabel={`Remove feature ${index + 1}`}
                    >
                      <UiIcon as={X} size={16} className="text-red-600" />
                    </Button>
                  </Div>
                  <Div className={tablet ? 'flex-row items-start gap-3' : 'gap-3'}>
                    <Field label="Icon" className={tablet ? 'flex-1' : null}>
                      <Select value={feature.icon} onValueChange={(value) => updateFeature(index, 'icon', value)} options={iconOptions} className={INPUT} />
                    </Field>
                    <Field label="Colour" className={tablet ? 'flex-1' : null}>
                      <Select value={feature.color} onValueChange={(value) => updateFeature(index, 'color', value)} options={colorOptions} className={INPUT} />
                    </Field>
                  </Div>
                  <Field label="Title">
                    <Input value={feature.title} onChange={(e) => updateFeature(index, 'title', e.target.value)} placeholder="Feature title" className={INPUT} />
                  </Field>
                  <Field label="Description">
                    <Textarea
                      value={feature.description}
                      onChange={(e) => updateFeature(index, 'description', e.target.value)}
                      placeholder="Feature description"
                      rows={3}
                      className={TEXTAREA}
                    />
                  </Field>
                </Div>
              );
            })}
          </Div>
        )}
      </Card>

      <Div className="flex-row justify-end">
        <Button onClick={handleSave} disabled={saving} className={`${BTN_PRIMARY}${saving ? ' opacity-50' : ''}`} accessibilityLabel="Save changes">
          <Span className={BTN_TEXT_PRIMARY}>{saving ? 'Saving…' : 'Save changes'}</Span>
        </Button>
      </Div>
    </AdminPage>
  );
}
