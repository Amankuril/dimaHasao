/* Ported from Frontend/src/modules/Food/pages/admin/DeliveryEmergencyHelp.jsx (tools/port.js first pass). */
import { useState, useEffect } from 'react';
import { Phone, Save, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react-native';
import { adminAPI } from '../../../api/food';
import { toast } from '../../../lib/notify';
import { Button, Div, Form, H1, Input, Label, P, ScrollDiv, Icon as UiIcon } from '../../../components/web';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
export default function DeliveryEmergencyHelp() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    medicalEmergency: '',
    accidentHelpline: '',
    contactPolice: '',
    insurance: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const fieldLimits = {
    medicalEmergency: 3,
    accidentHelpline: 3,
    contactPolice: 3,
    insurance: 10,
  };

  // Fetch emergency help numbers on component mount
  useEffect(() => {
    fetchEmergencyHelp();
  }, []);
  const fetchEmergencyHelp = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getEmergencyHelp();
      if (response?.data?.success && response?.data?.data) {
        const data = response.data.data;
        setFormData({
          medicalEmergency: data.medicalEmergency || '',
          accidentHelpline: data.accidentHelpline || '',
          contactPolice: data.contactPolice || '',
          insurance: data.insurance || '',
        });
      }
    } catch (error) {
      debugError('Error fetching emergency help:', error);
      toast.error('Failed to load emergency help numbers');
    } finally {
      setLoading(false);
    }
  };
  const validateForm = () => {
    const errors = {};
    const normalizeDigits = (value) => String(value || '').replace(/[^\d]/g, '');
    if (formData.medicalEmergency && normalizeDigits(formData.medicalEmergency).length !== fieldLimits.medicalEmergency) {
      errors.medicalEmergency = 'Phone number must be exactly 3 digits';
    }
    if (formData.accidentHelpline && normalizeDigits(formData.accidentHelpline).length !== fieldLimits.accidentHelpline) {
      errors.accidentHelpline = 'Phone number must be exactly 3 digits';
    }
    if (formData.contactPolice && normalizeDigits(formData.contactPolice).length !== fieldLimits.contactPolice) {
      errors.contactPolice = 'Phone number must be exactly 3 digits';
    }
    if (formData.insurance && normalizeDigits(formData.insurance).length !== fieldLimits.insurance) {
      errors.insurance = 'Phone number must be exactly 10 digits';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  const handleInputChange = (field, value) => {
    const sanitizedValue = String(value || '')
      .replace(/[^\d]/g, '')
      .slice(0, fieldLimits[field] || 15);
    setFormData((prev) => ({
      ...prev,
      [field]: sanitizedValue,
    }));
    // Clear error for this field when user starts typing
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
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }
    try {
      setSaving(true);
      const response = await adminAPI.createOrUpdateEmergencyHelp({
        medicalEmergency: formData.medicalEmergency.trim(),
        accidentHelpline: formData.accidentHelpline.trim(),
        contactPolice: formData.contactPolice.trim(),
        insurance: formData.insurance.trim(),
      });
      if (response?.data?.success) {
        toast.success('Emergency help numbers saved successfully!');
        // Refresh data
        await fetchEmergencyHelp();
      } else {
        toast.error(response?.data?.message || 'Failed to save emergency help numbers');
      }
    } catch (error) {
      debugError('Error saving emergency help:', error);
      toast.error(error?.response?.data?.message || 'Failed to save emergency help numbers');
    } finally {
      setSaving(false);
    }
  };
  const emergencyFields = [
    {
      id: 'medicalEmergency',
      label: 'Medical Emergency',
      placeholder: 'Enter medical emergency phone number',
      description: 'Phone number for medical emergencies (e.g., 108)',
    },
    {
      id: 'accidentHelpline',
      label: 'Accident Helpline',
      placeholder: 'Enter accident helpline phone number',
      description: 'Phone number for accident helpline',
    },
    {
      id: 'contactPolice',
      label: 'Contact Police',
      placeholder: 'Enter police emergency phone number',
      description: 'Phone number for police emergency (e.g., 100)',
    },
    {
      id: 'insurance',
      label: 'Insurance',
      placeholder: 'Enter insurance helpline phone number',
      description: 'Phone number for insurance claims and policy help',
    },
  ];
  if (loading) {
    return (
      <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen">
        <Div className="max-w-4xl mx-auto">
          <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <Div className="flex items-center justify-center py-12">
              <UiIcon as={Loader2} className="w-8 h-8 animate-spin text-slate-600" />
            </Div>
          </Div>
        </Div>
      </ScrollDiv>
    );
  }
  return (
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <Div className="max-w-4xl mx-auto">
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          {/* Header */}
          <Div className="flex items-center gap-3 mb-6">
            <UiIcon as={Phone} className="w-6 h-6 text-slate-600" />
            <Div>
              <H1 className="text-2xl font-bold text-slate-900">Delivery Emergency Help</H1>
              <P className="text-sm text-slate-600 mt-1">Manage emergency contact numbers for delivery partners</P>
            </Div>
          </Div>

          {/* Info Card */}
          <Div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <Div className="flex items-start gap-3">
              <UiIcon as={AlertCircle} className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
              <Div className="text-sm text-blue-800">
                <P className="font-semibold mb-1">Important Information</P>
                <P>
                  These phone numbers will be displayed to delivery partners in the emergency help section. When a delivery partner clicks on any emergency
                  option, it will automatically dial the corresponding number.
                </P>
              </Div>
            </Div>
          </Div>

          {/* Form */}
          <Form onSubmit={handleSubmit} className="space-y-6">
            {emergencyFields.map((field) => (
              <Div key={field.id} className="space-y-2">
                <Label className="block text-sm font-semibold text-slate-900">{field.label}</Label>
                <P className="text-xs text-slate-600 mb-2">{field.description}</P>
                <Div className="relative">
                  <Input
                    type="text"
                    value={formData[field.id]}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    placeholder={field.placeholder}
                    maxLength={fieldLimits[field.id] || 15}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors[field.id] ? 'border-red-300 focus:ring-red-500' : 'border-slate-300'}`}
                  />
                  {formErrors[field.id] && (
                    <P className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <UiIcon as={AlertCircle} className="w-4 h-4" />
                      {formErrors[field.id]}
                    </P>
                  )}
                </Div>
              </Div>
            ))}

            {/* Submit Button */}
            <Div className="pt-4 border-t border-slate-200">
              <Button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <UiIcon as={Loader2} className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <UiIcon as={Save} className="w-5 h-5" />
                    Save Emergency Numbers
                  </>
                )}
              </Button>
            </Div>
          </Form>

          {/* Success Message */}
          {!loading && !saving && (
            <Div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <Div className="flex items-center gap-2 text-green-800">
                <UiIcon as={CheckCircle2} className="w-5 h-5" />
                <P className="text-sm font-medium">Changes will be reflected immediately for all delivery partners</P>
              </Div>
            </Div>
          )}
        </Div>
      </Div>
    </ScrollDiv>
  );
}
