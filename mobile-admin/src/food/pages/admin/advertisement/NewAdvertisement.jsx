/* Ported from Frontend/src/modules/Food/pages/admin/advertisement/NewAdvertisement.jsx (tools/port.js first pass). */
import { useState } from 'react';
import { Upload, Heart, Star, CheckCircle2, X, Megaphone } from 'lucide-react-native';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../../components/shadcn';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  Field,
  INPUT,
  INPUT_ERROR,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../admin/ui';
import { Button, Div, Form, H3, HScroll, Img, Input, Option, P, Select, Span, Icon as UiIcon } from '../../../../components/web';
import { ActivityIndicator } from 'react-native';
import { pickImage, objectUrl } from '../../../../lib/files';
import { LinearGradient } from 'expo-linear-gradient';
const debugLog = (...args) => {};
const debugError = (...args) => {};

// Using placeholders for advertisement images
const profilePlaceholder = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=400&fit=crop';
const coverPlaceholder = 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1200&h=400&fit=crop';
export default function NewAdvertisement() {
  const [activeLanguage, setActiveLanguage] = useState('default');
  const [formData, setFormData] = useState({
    title: '',
    shortDescription: '',
    restaurant: '',
    priority: 'Priority',
    advertisementType: 'Restaurant Promotion',
    validity: '',
    showReview: true,
    showRatings: true,
  });
  const [profileImage, setProfileImage] = useState(null);
  const [coverImage, setCoverImage] = useState(null);
  const [profilePreview, setProfilePreview] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const { tablet, wide } = useLayoutWidth();
  const languageTabs = [
    {
      key: 'default',
      label: 'Default',
    },
    {
      key: 'en',
      label: 'English(EN)',
    },
    {
      key: 'bn',
      label: 'Bengali - বাংলা(BN)',
    },
    {
      key: 'ar',
      label: 'Arabic - العربية (AR)',
    },
    {
      key: 'es',
      label: 'Spanish - español(ES)',
    },
  ];
  const activeLanguageLabel = activeLanguage === 'default' ? 'Default' : languageTabs.find((t) => t.key === activeLanguage)?.label;
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const newErrors = {
          ...prev,
        };
        delete newErrors[field];
        return newErrors;
      });
    }
  };
  const handleFileUpload = (type, file) => {
    const maxSize = 2 * 1024 * 1024; // 2MB
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setFormErrors((prev) => ({
        ...prev,
        [type]: 'Invalid file type. Please upload PNG, JPG, JPEG, or WEBP.',
      }));
      return;
    }
    if (file.size > maxSize) {
      setFormErrors((prev) => ({
        ...prev,
        [type]: 'File size exceeds 2MB limit.',
      }));
      return;
    }
    if (type === 'profileImage') {
      setProfileImage(file);
      setProfilePreview(objectUrl(file));
    } else {
      setCoverImage(file);
      setCoverPreview(objectUrl(file));
    }
    if (formErrors[type]) {
      setFormErrors((prev) => {
        const newErrors = {
          ...prev,
        };
        delete newErrors[type];
        return newErrors;
      });
    }
  };
  const handlePickImage = async (type) => {
    const file = await pickImage({ compress: false });
    if (file) {
      handleFileUpload(type, file);
    }
  };
  const handleRemoveImage = (type) => {
    if (type === 'profileImage') {
      setProfileImage(null);
      setProfilePreview(null);
    } else {
      setCoverImage(null);
      setCoverPreview(null);
    }
  };
  const validateForm = () => {
    const errors = {};
    if (!formData.title.trim()) {
      errors.title = 'Advertisement title is required';
    }
    if (!formData.restaurant) {
      errors.restaurant = 'Restaurant selection is required';
    }
    if (!formData.validity) {
      errors.validity = 'Validity date is required';
    } else {
      const validityDate = new Date(formData.validity);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (validityDate < today) {
        errors.validity = 'Validity date must be today or later';
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});
    if (!validateForm()) {
      return;
    }
    setIsSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Here you would typically send the data to your API
      debugLog('Form submitted:', {
        ...formData,
        profileImage,
        coverImage,
      });
      setShowSuccessDialog(true);
      setTimeout(() => {
        handleReset();
        setShowSuccessDialog(false);
      }, 3000);
    } catch (error) {
      debugError('Error submitting form:', error);
      setFormErrors({
        submit: 'Failed to create advertisement. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleReset = () => {
    setFormData({
      title: '',
      shortDescription: '',
      restaurant: '',
      priority: 'Priority',
      advertisementType: 'Restaurant Promotion',
      validity: '',
      showReview: true,
      showRatings: true,
    });
    setProfileImage(null);
    setCoverImage(null);
    setProfilePreview(null);
    setCoverPreview(null);
    setFormErrors({});
  };
  const uploadBox = (type, label, hint) => {
    const preview = type === 'profileImage' ? profilePreview : coverPreview;
    return (
      <Field label={label} hint={preview ? undefined : hint} error={formErrors[type]}>
        {preview ? (
          <Div className="border border-slate-200 rounded-lg overflow-hidden">
            <Img src={preview} alt={`${label} preview`} className="w-full h-40 object-cover" />
            <Button
              type="button"
              onClick={() => handleRemoveImage(type)}
              className="absolute top-2 right-2 w-11 h-11 rounded-full bg-red-600 items-center justify-center"
              accessibilityLabel={`Remove ${label}`}
            >
              <UiIcon as={X} size={16} className="text-white" />
            </Button>
          </Div>
        ) : (
          <Button
            type="button"
            onClick={() => handlePickImage(type)}
            className={`border border-dashed rounded-lg py-8 px-4 items-center gap-1 bg-slate-50 ${formErrors[type] ? 'border-red-500' : 'border-slate-300'}`}
            accessibilityLabel={`Upload ${label}`}
          >
            <UiIcon as={Upload} size={24} className="text-slate-400 mb-1" />
            <P className="text-sm font-semibold text-blue-600">Click to upload</P>
          </Button>
        )}
      </Field>
    );
  };
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={Megaphone}
        title="Create Advertisement"
        subtitle="Promote a restaurant in the customer app for a set validity window"
        breadcrumb={[{ label: 'Food' }, { label: 'Advertisements' }, { label: 'New advertisement' }]}
      />

      <Div className={wide ? 'flex-row items-start gap-4' : 'gap-4'}>
        {/* Main Form Section */}
        <Div className={wide ? 'flex-1' : null}>
          <Card>
            {/* Language Tabs */}
            <HScroll className="mb-4 border-b border-slate-200" contentClassName="flex-row items-center">
              {languageTabs.map((tab) => (
                <Button
                  key={tab.key}
                  onClick={() => setActiveLanguage(tab.key)}
                  className={`px-4 h-11 justify-center border-b-2 ${activeLanguage === tab.key ? 'border-blue-600' : 'border-transparent'}`}
                >
                  <Span className={`text-sm font-semibold ${activeLanguage === tab.key ? 'text-blue-600' : 'text-slate-600'}`}>{tab.label}</Span>
                </Button>
              ))}
            </HScroll>

            <Form onSubmit={handleSubmit}>
              <Div className="gap-3">
                <Field label={`Advertisement Title (${activeLanguageLabel})`} required error={formErrors.title}>
                  <Input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Exclusive Offer"
                    className={formErrors.title ? INPUT_ERROR : INPUT}
                  />
                </Field>

                <Field label={`Short Description (${activeLanguageLabel})`}>
                  <Input
                    type="text"
                    value={formData.shortDescription}
                    onChange={(e) => handleInputChange('shortDescription', e.target.value)}
                    placeholder="Get Discount"
                    className={INPUT}
                  />
                </Field>

                <Div className={`grid grid-cols-${tablet ? 2 : 1} gap-3`}>
                  <Field label="Select Restaurant" required error={formErrors.restaurant}>
                    <Select
                      value={formData.restaurant}
                      onChange={(e) => handleInputChange('restaurant', e.target.value)}
                      className={formErrors.restaurant ? INPUT_ERROR : INPUT}
                    >
                      <Option value="">Select Restaurant</Option>
                      <Option value="cafe-monarch">Café Monarch</Option>
                      <Option value="hungry-puppets">Hungry Puppets</Option>
                    </Select>
                  </Field>

                  <Field label="Select Priority">
                    <Select value={formData.priority} onChange={(e) => handleInputChange('priority', e.target.value)} className={INPUT}>
                      <Option value="Priority">Priority</Option>
                      <Option value="High">High</Option>
                      <Option value="Normal">Normal</Option>
                      <Option value="Low">Low</Option>
                    </Select>
                  </Field>

                  <Field label="Advertisement Type">
                    <Select
                      value={formData.advertisementType}
                      onChange={(e) => handleInputChange('advertisementType', e.target.value)}
                      className={INPUT}
                    >
                      <Option value="Restaurant Promotion">Restaurant Promotion</Option>
                      <Option value="Video promotion">Video promotion</Option>
                    </Select>
                  </Field>

                  <Field label="Validity" required error={formErrors.validity}>
                    <Input
                      type="date"
                      value={formData.validity}
                      onChange={(e) => handleInputChange('validity', e.target.value)}
                      className={formErrors.validity ? INPUT_ERROR : INPUT}
                    />
                  </Field>
                </Div>

                <Field label="Show Review & Ratings">
                  <Div className="flex-row items-center gap-5">
                    <Div className="flex-row items-center gap-2 h-11">
                      <Input
                        type="checkbox"
                        checked={formData.showReview}
                        onChange={(e) => handleInputChange('showReview', e.target.checked)}
                        className="w-5 h-5"
                      />
                      <Span className="text-sm text-slate-700">Review</Span>
                    </Div>
                    <Div className="flex-row items-center gap-2 h-11">
                      <Input
                        type="checkbox"
                        checked={formData.showRatings}
                        onChange={(e) => handleInputChange('showRatings', e.target.checked)}
                        className="w-5 h-5"
                      />
                      <Span className="text-sm text-slate-700">Rating</Span>
                    </Div>
                  </Div>
                </Field>

                <SectionTitle>Upload Related Files</SectionTitle>
                <Div className={`grid grid-cols-${tablet ? 2 : 1} gap-3`}>
                  {uploadBox('profileImage', 'Profile Image (1:1)', 'PNG, JPG, JPEG or WEBP — max 2 MB')}
                  {uploadBox('coverImage', 'Cover Image (2:1)', 'PNG, JPG, JPEG or WEBP — max 2 MB')}
                </Div>

                {formErrors.submit ? <P className="text-sm text-red-600">{formErrors.submit}</P> : null}

                <Div className={`flex-row items-center gap-2 ${tablet ? 'justify-end' : ''}`}>
                  <Button type="button" onClick={handleReset} disabled={isSubmitting} className={`${BTN_SECONDARY} ${tablet ? '' : 'flex-1'}`}>
                    <Span className={BTN_TEXT_SECONDARY}>Reset</Span>
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className={`${BTN_PRIMARY} ${tablet ? '' : 'flex-1'}`}>
                    {isSubmitting ? <ActivityIndicator size="small" color="#ffffff" /> : null}
                    <Span className={BTN_TEXT_PRIMARY}>{isSubmitting ? 'Submitting…' : 'Submit'}</Span>
                  </Button>
                </Div>
              </Div>
            </Form>
          </Card>
        </Div>

        {/* Advertisement Preview */}
        <Div style={wide ? { width: 360 } : null}>
          <Card>
            <SectionTitle>Advertisement Preview</SectionTitle>
            <Div className="border border-slate-200 rounded-lg overflow-hidden">
              <LinearGradient colors={['#f8fafc', '#f1f5f9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: 'relative', width: '100%', aspectRatio: 2 }}>
                {/* Cover Image Area */}
                <Div className="absolute inset-0">
                  {coverPreview ? (
                    <Img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                  ) : (
                    <Img src={coverPlaceholder} alt="Cover" className="w-full h-full object-cover" fallback={null} />
                  )}
                </Div>

                {/* Content Overlay */}
                <Div className="absolute inset-0 p-3 justify-between">
                  <Div className="flex-row items-start justify-between">
                    <Div className="w-14 h-14 rounded-full bg-white border-2 border-white overflow-hidden">
                      {profilePreview ? (
                        <Img src={profilePreview} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <Img src={profilePlaceholder} alt="Profile" className="w-full h-full object-cover" fallback={null} />
                      )}
                    </Div>
                    <Div className="w-9 h-9 rounded-full bg-white/80 items-center justify-center">
                      <UiIcon as={Heart} size={16} className="text-red-600" />
                    </Div>
                  </Div>

                  <Div className="bg-white/90 rounded-lg p-3 gap-1">
                    <H3 className="text-sm font-semibold text-slate-900">{formData.title || 'Title'}</H3>
                    <P className="text-xs text-slate-600">{formData.shortDescription || 'Description'}</P>
                    {formData.showRatings && (
                      <Div className="flex-row items-center gap-1">
                        <UiIcon as={Star} size={12} className="fill-yellow-400 text-yellow-400" />
                        <Span className="text-xs font-semibold text-slate-900">4.7 (25+)</Span>
                      </Div>
                    )}
                  </Div>
                </Div>
              </LinearGradient>
            </Div>
          </Card>
        </Div>
      </Div>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="max-w-md bg-white p-0">
          <Div className="p-6 items-center gap-3">
            <Div className="w-14 h-14 rounded-full bg-green-100 items-center justify-center">
              <UiIcon as={CheckCircle2} size={28} className="text-green-700" />
            </Div>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900 text-center">Advertisement created</DialogTitle>
              <DialogDescription className="text-sm text-slate-500 text-center">
                The advertisement has been created and is now active in the system.
              </DialogDescription>
            </DialogHeader>
          </Div>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
