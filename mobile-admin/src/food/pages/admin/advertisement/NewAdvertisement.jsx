/* Ported from Frontend/src/modules/Food/pages/admin/advertisement/NewAdvertisement.jsx (tools/port.js first pass). */
import { useState } from 'react';
import { Upload, Heart, Star, Calendar, CheckCircle2, X } from 'lucide-react-native';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../../components/shadcn';
import { Button, Div, Form, H1, H2, H3, Img, Input, Label, Option, P, ScrollDiv, Select, Span, Icon as UiIcon } from '../../../../components/web';
import { ActivityIndicator } from 'react-native';
import { pickImage, objectUrl } from '../../../../lib/files';
import { LinearGradient } from 'expo-linear-gradient';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
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
      label: 'Spanish - espa�ol(ES)',
    },
  ];
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
  return (
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <Div className="max-w-7xl mx-auto">
        <Div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form Section */}
          <Div className="lg:col-span-2">
            <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <H1 className="text-2xl font-bold text-slate-900 mb-6">Create Advertisement</H1>

              {/* Language Tabs */}
              <Div className="flex items-center gap-2 border-b border-slate-200 mb-6">
                {languageTabs.map((tab) => (
                  <Button
                    key={tab.key}
                    onClick={() => setActiveLanguage(tab.key)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeLanguage === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'}`}
                  >
                    {tab.label}
                  </Button>
                ))}
              </Div>

              <Form onSubmit={handleSubmit}>
                <Div className="space-y-6">
                  <Div>
                    <Label className="block text-sm font-semibold text-slate-700 mb-2">
                      Advertisement Title ({activeLanguage === 'default' ? 'Default' : languageTabs.find((t) => t.key === activeLanguage)?.label}){' '}
                      <Span className="text-red-500">*</Span>
                    </Label>
                    <Input
                      type="text"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      placeholder="Exclusive Offer"
                      className={`w-full px-4 py-2.5 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${formErrors.title ? 'border-red-500' : 'border-slate-300'}`}
                    />
                    {formErrors.title && <P className="text-xs text-red-500 mt-1">{formErrors.title}</P>}
                  </Div>

                  <Div>
                    <Label className="block text-sm font-semibold text-slate-700 mb-2">
                      Short Description ({activeLanguage === 'default' ? 'Default' : languageTabs.find((t) => t.key === activeLanguage)?.label})
                    </Label>
                    <Input
                      type="text"
                      value={formData.shortDescription}
                      onChange={(e) => handleInputChange('shortDescription', e.target.value)}
                      placeholder="Get Discount"
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </Div>

                  <Div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Div>
                      <Label className="block text-sm font-semibold text-slate-700 mb-2">
                        Select Restaurant <Span className="text-red-500">*</Span>
                      </Label>
                      <Select
                        value={formData.restaurant}
                        onChange={(e) => handleInputChange('restaurant', e.target.value)}
                        className={`w-full px-4 py-2.5 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${formErrors.restaurant ? 'border-red-500' : 'border-slate-300'}`}
                      >
                        <Option value="">Select Restaurant</Option>
                        <Option value="cafe-monarch">Caf� Monarch</Option>
                        <Option value="hungry-puppets">Hungry Puppets</Option>
                      </Select>
                      {formErrors.restaurant && <P className="text-xs text-red-500 mt-1">{formErrors.restaurant}</P>}
                    </Div>

                    <Div>
                      <Label className="block text-sm font-semibold text-slate-700 mb-2">Select Priority</Label>
                      <Select
                        value={formData.priority}
                        onChange={(e) => handleInputChange('priority', e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      >
                        <Option value="Priority">Priority</Option>
                        <Option value="High">High</Option>
                        <Option value="Normal">Normal</Option>
                        <Option value="Low">Low</Option>
                      </Select>
                    </Div>
                  </Div>

                  <Div>
                    <Label className="block text-sm font-semibold text-slate-700 mb-2">Advertisement Type</Label>
                    <Select
                      value={formData.advertisementType}
                      onChange={(e) => handleInputChange('advertisementType', e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <Option value="Restaurant Promotion">Restaurant Promotion</Option>
                      <Option value="Video promotion">Video promotion</Option>
                    </Select>
                  </Div>

                  <Div>
                    <Label className="block text-sm font-semibold text-slate-700 mb-2">
                      Validity <Span className="text-red-500">*</Span>
                    </Label>
                    <Div className="relative">
                      <Input
                        type="date"
                        value={formData.validity}
                        onChange={(e) => handleInputChange('validity', e.target.value)}
                        className={`w-full px-4 py-2.5 pr-10 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${formErrors.validity ? 'border-red-500' : 'border-slate-300'}`}
                      />
                      <UiIcon as={Calendar} className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </Div>
                    {formErrors.validity && <P className="text-xs text-red-500 mt-1">{formErrors.validity}</P>}
                  </Div>

                  <Div>
                    <Label className="block text-sm font-semibold text-slate-700 mb-3">Show Review & Ratings</Label>
                    <Div className="flex items-center gap-6">
                      <Label className="flex items-center gap-2 cursor-pointer">
                        <Input
                          type="checkbox"
                          checked={formData.showReview}
                          onChange={(e) => handleInputChange('showReview', e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                        />
                        <Span className="text-sm text-slate-700">Review</Span>
                      </Label>
                      <Label className="flex items-center gap-2 cursor-pointer">
                        <Input
                          type="checkbox"
                          checked={formData.showRatings}
                          onChange={(e) => handleInputChange('showRatings', e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                        />
                        <Span className="text-sm text-slate-700">Rating</Span>
                      </Label>
                    </Div>
                  </Div>

                  {/* Upload Related Files */}
                  <Div>
                    <Label className="block text-sm font-semibold text-slate-700 mb-4">Upload Related Files</Label>
                    <Div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Div>
                        <Label className="block text-sm font-medium text-slate-600 mb-2">Profile Image (Ratio - 1:1)</Label>
                        {profilePreview ? (
                          <Div className="relative border-2 border-slate-300 rounded-lg overflow-hidden">
                            <Img src={profilePreview} alt="Profile preview" className="w-full h-48 object-cover" />
                            <Button
                              type="button"
                              onClick={() => handleRemoveImage('profileImage')}
                              className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                            >
                              <UiIcon as={X} className="w-4 h-4" />
                            </Button>
                          </Div>
                        ) : (
                          <Div
                            onClick={() => handlePickImage('profileImage')}
                            className={`border-2 border-dashed rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer ${formErrors.profileImage ? 'border-red-500' : 'border-slate-300'}`}
                          >
                            <UiIcon as={Upload} className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                            <P className="text-sm font-medium text-blue-600 mb-1">Click to Upload Profile Image</P>
                            <P className="text-xs text-slate-500">Supports: PNG, JPG, JPEG, WEBP Maximum 2 MB</P>
                          </Div>
                        )}
                        {formErrors.profileImage && <P className="text-xs text-red-500 mt-1">{formErrors.profileImage}</P>}
                      </Div>

                      <Div>
                        <Label className="block text-sm font-medium text-slate-600 mb-2">Upload Cover (Ratio - 2:1)</Label>
                        {coverPreview ? (
                          <Div className="relative border-2 border-slate-300 rounded-lg overflow-hidden">
                            <Img src={coverPreview} alt="Cover preview" className="w-full h-48 object-cover" />
                            <Button
                              type="button"
                              onClick={() => handleRemoveImage('coverImage')}
                              className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                            >
                              <UiIcon as={X} className="w-4 h-4" />
                            </Button>
                          </Div>
                        ) : (
                          <Div
                            onClick={() => handlePickImage('coverImage')}
                            className={`border-2 border-dashed rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer ${formErrors.coverImage ? 'border-red-500' : 'border-slate-300'}`}
                          >
                            <UiIcon as={Upload} className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                            <P className="text-sm font-medium text-blue-600 mb-1">Click to Upload Cover Image</P>
                            <P className="text-xs text-slate-500">Supports: PNG, JPG, JPEG, WEBP Maximum 2 MB</P>
                          </Div>
                        )}
                        {formErrors.coverImage && <P className="text-xs text-red-500 mt-1">{formErrors.coverImage}</P>}
                      </Div>
                    </Div>
                  </Div>

                  <Div className="flex items-center justify-end gap-4">
                    {formErrors.submit && <P className="text-sm text-red-500 mr-auto">{formErrors.submit}</P>}
                    <Button
                      type="button"
                      onClick={handleReset}
                      disabled={isSubmitting}
                      className="px-6 py-2.5 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Reset
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-2.5 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <ActivityIndicator size="small" color="#ffffff" />
                          Submitting...
                        </>
                      ) : (
                        'Submit'
                      )}
                    </Button>
                  </Div>
                </Div>
              </Form>
            </Div>
          </Div>

          {/* Advertisement Preview */}
          <Div className="lg:col-span-1">
            <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <H2 className="text-lg font-semibold text-slate-900 mb-4">Advertisement Preview</H2>
              <Div className="border-2 border-slate-200 rounded-lg overflow-hidden">
                <LinearGradient
                  colors={['#f8fafc', '#f1f5f9']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ position: 'relative', width: '100%', aspectRatio: 2 }}
                >
                  {/* Cover Image Area */}
                  <Div className="absolute inset-0">
                    {coverPreview ? (
                      <Img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                      <Img src={coverPlaceholder} alt="Cover" className="w-full h-full object-cover" fallback={null} />
                    )}
                  </Div>

                  {/* Content Overlay */}
                  <Div className="absolute inset-0 p-4 flex flex-col justify-between">
                    <Div className="flex items-start justify-between">
                      <Div className="w-16 h-16 rounded-full bg-white border-2 border-white shadow-md overflow-hidden">
                        {profilePreview ? (
                          <Img src={profilePreview} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <Img src={profilePlaceholder} alt="Profile" className="w-full h-full object-cover" fallback={null} />
                        )}
                      </Div>
                      <Button className="p-2 rounded-full bg-white/80 hover:bg-white transition-colors">
                        <UiIcon as={Heart} className="w-4 h-4 text-red-500" />
                      </Button>
                    </Div>

                    <Div className="bg-white/90 backdrop-blur-sm rounded-lg p-3">
                      <H3 className="text-sm font-semibold text-slate-900 mb-1">{formData.title || 'Title'}</H3>
                      <P className="text-xs text-slate-600 mb-2">{formData.shortDescription || 'Description'}</P>
                      {formData.showRatings && (
                        <Div className="flex items-center gap-1">
                          <UiIcon as={Star} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <Span className="text-xs font-medium text-slate-900">4.7 (25+)</Span>
                        </Div>
                      )}
                    </Div>
                  </Div>
                </LinearGradient>
              </Div>
            </Div>
          </Div>
        </Div>
      </Div>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="max-w-md bg-white p-0 opacity-0 data-[state=open]:opacity-100 data-[state=closed]:opacity-0 transition-opacity duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:scale-100 data-[state=closed]:scale-100">
          <Div className="p-8 text-center">
            <Div className="flex justify-center mb-4">
              <Div className="relative">
                <Div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-75"></Div>
                <Div className="relative bg-emerald-500 rounded-full p-4">
                  <UiIcon as={CheckCircle2} className="w-12 h-12 text-white" />
                </Div>
              </Div>
            </Div>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-slate-900 mb-2">Advertisement Created Successfully!</DialogTitle>
              <DialogDescription className="text-sm text-slate-600">
                The advertisement has been successfully created and is now active in the system.
              </DialogDescription>
            </DialogHeader>
          </Div>
        </DialogContent>
      </Dialog>
    </ScrollDiv>
  );
}
