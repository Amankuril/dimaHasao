/* Ported from Frontend/src/modules/Food/pages/admin/settings/AboutUs.jsx (tools/port.js first pass). */
import { useState, useEffect } from 'react';
import { toast } from '../../../../lib/notify';
import api, { adminAPI } from '../../../../api/food';
import { API_ENDPOINTS } from '../../../../api/config';
import { Heart, Users, Shield, Clock, Star, Award, Plus, X, GripVertical } from 'lucide-react-native';
import { Button } from '../../../../components/shadcn';
import { Input } from '../../../../components/shadcn';
import { Textarea } from '../../../../components/shadcn';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/shadcn';
import { Label } from '../../../../components/shadcn';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/shadcn';
import { useCompanyName } from '../../../hooks/useCompanyName';
import { Div, H1, P, ScrollDiv, Icon as UiIcon } from '../../../../components/web';
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
  if (loading) {
    return (
      <ScrollDiv className="h-full bg-slate-50 p-4 lg:p-6 flex items-center justify-center">
        <Div className="text-center">
          <Div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></Div>
          <P className="mt-4 text-slate-600">Loading...</P>
        </Div>
      </ScrollDiv>
    );
  }
  return (
    <ScrollDiv className="h-full bg-slate-50 p-4 lg:p-6">
      <Div className="max-w-6xl mx-auto">
        <Div className="mb-6">
          <H1 className="text-2xl font-bold text-slate-900">About Us</H1>
          <P className="text-sm text-slate-600 mt-1">Manage your About page content</P>
        </Div>

        {/* Basic Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Div>
              <Label htmlFor="appName">App Name</Label>
              <Input
                id="appName"
                value={aboutData.appName}
                onChange={(e) =>
                  setAboutData((prev) => ({
                    ...prev,
                    appName: e.target.value,
                  }))
                }
                placeholder={companyName}
                className="mt-1"
              />
            </Div>
            <Div>
              <Label htmlFor="version">Version</Label>
              <Input
                id="version"
                value={aboutData.version}
                onChange={(e) =>
                  setAboutData((prev) => ({
                    ...prev,
                    version: e.target.value,
                  }))
                }
                placeholder="1.0.0"
                className="mt-1"
              />
            </Div>
            <Div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={aboutData.description}
                onChange={(e) =>
                  setAboutData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Your trusted food delivery partner..."
                rows={4}
                className="mt-1 w-full"
              />
            </Div>
            <Div>
              <Label htmlFor="logo">Logo URL</Label>
              <Input
                id="logo"
                value={aboutData.logo}
                onChange={(e) =>
                  setAboutData((prev) => ({
                    ...prev,
                    logo: e.target.value,
                  }))
                }
                placeholder="https://example.com/logo.png"
                className="mt-1"
              />
            </Div>
          </CardContent>
        </Card>

        {/* Features */}
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Features</CardTitle>
            <Button onClick={addFeature} size="sm" variant="outline">
              <UiIcon as={Plus} className="h-4 w-4 mr-2" />
              Add Feature
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {aboutData.features.map((feature, index) => {
              const IconComponent = iconMap[feature.icon] || Heart;
              return (
                <Card key={index} className="border-2">
                  <CardContent className="p-4">
                    <Div className="flex items-start gap-4">
                      <Div className={`${feature.bgColor} rounded-lg p-3 shrink-0`}>
                        <UiIcon as={IconComponent} className={`h-6 w-6 ${feature.color}`} />
                      </Div>
                      <Div className="flex-1 space-y-3">
                        <Div className="grid grid-cols-2 gap-3">
                          <Div>
                            <Label>Icon</Label>
                            <Select value={feature.icon} onValueChange={(value) => updateFeature(index, 'icon', value)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {iconOptions.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </Div>
                          <Div>
                            <Label>Color</Label>
                            <Select value={feature.color} onValueChange={(value) => updateFeature(index, 'color', value)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {colorOptions.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </Div>
                        </Div>
                        <Div>
                          <Label>Title</Label>
                          <Input value={feature.title} onChange={(e) => updateFeature(index, 'title', e.target.value)} placeholder="Feature title" />
                        </Div>
                        <Div>
                          <Label>Description</Label>
                          <Textarea
                            value={feature.description}
                            onChange={(e) => updateFeature(index, 'description', e.target.value)}
                            placeholder="Feature description"
                            rows={4}
                            className="w-full"
                          />
                        </Div>
                      </Div>
                      <Button variant="ghost" size="icon" onClick={() => removeFeature(index)} className="text-red-600 hover:text-red-700">
                        <UiIcon as={X} className="h-4 w-4" />
                      </Button>
                    </Div>
                  </CardContent>
                </Card>
              );
            })}
            {aboutData.features.length === 0 && <P className="text-center text-slate-500 py-8">No features added yet. Click &quot;Add Feature&quot; to get started.</P>}
          </CardContent>
        </Card>

        {/* Save Button */}
        <Div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Div>
      </Div>
    </ScrollDiv>
  );
}
