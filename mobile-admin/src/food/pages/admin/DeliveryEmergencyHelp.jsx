/* Ported from Frontend/src/modules/Food/pages/admin/DeliveryEmergencyHelp.jsx (tools/port.js first pass). */
import { useState, useEffect } from 'react';
import { Phone, Save, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react-native';
import { adminAPI } from '../../../api/food';
import { toast } from '../../../lib/notify';
import { AdminPage, PageHeader, Card, SectionTitle, Field, INPUT, INPUT_ERROR, BTN_PRIMARY, BTN_TEXT_PRIMARY, LoadingState, useLayoutWidth } from '../../../admin/ui';

/* Two columns from 700px: the kit's grid classes are dropped on native, so the width is measured. */
const PAGE_MAX = 720;
import { Button, Div, Form, Input, Span, Icon as UiIcon } from '../../../components/web';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
export default function DeliveryEmergencyHelp() {
  const { width, tablet } = useLayoutWidth();
  const colWidth = tablet ? (Math.min(width, PAGE_MAX) - 32 - 32 - 12) / 2 : null;
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
  const header = (
    <PageHeader
      icon={Phone}
      title="Delivery emergency help"
      subtitle="Emergency contact numbers shown to delivery partners. Tapping one in the app dials it."
      breadcrumb={[{ label: 'Food' }, { label: 'Delivery' }, { label: 'Emergency help' }]}
    />
  );
  if (loading) {
    return (
      <AdminPage maxWidth={PAGE_MAX}>
        {header}
        <LoadingState label="Loading emergency numbers…" />
      </AdminPage>
    );
  }
  return (
    <AdminPage maxWidth={PAGE_MAX}>
      {header}
      <Card className="mb-3 flex-row items-start gap-3">
        <UiIcon as={AlertCircle} size={18} className="text-blue-600 mt-0.5" />
        <Div className="flex-1 gap-1">
          <Span className="text-sm font-semibold text-slate-900">Important information</Span>
          <Span className="text-sm text-slate-700">
            These numbers appear in the delivery partner app&apos;s emergency help section. Tapping an option dials the matching number.
          </Span>
        </Div>
      </Card>

      <Card>
        <SectionTitle>Emergency numbers</SectionTitle>
        <Form onSubmit={handleSubmit}>
          <Div className={tablet ? 'flex-row flex-wrap gap-3' : 'gap-3'}>
            {emergencyFields.map((field) => (
              <Div key={field.id} style={colWidth ? { width: colWidth } : null}>
                <Field label={field.label} hint={field.description} error={formErrors[field.id]}>
                  <Input
                    type="text"
                    value={formData[field.id]}
                    onChange={(e) => handleInputChange(field.id, e.target.value)}
                    placeholder={field.placeholder}
                    maxLength={fieldLimits[field.id] || 15}
                    className={formErrors[field.id] ? INPUT_ERROR : INPUT}
                  />
                </Field>
              </Div>
            ))}
          </Div>
          <Div className="mt-4 pt-4 border-t border-slate-200">
            <Button type="submit" disabled={saving} className={`${BTN_PRIMARY} self-start`}>
              <UiIcon as={saving ? Loader2 : Save} size={16} className="text-white" />
              <Span className={BTN_TEXT_PRIMARY}>{saving ? 'Saving…' : 'Save emergency numbers'}</Span>
            </Button>
          </Div>
        </Form>
      </Card>

      <Div className="flex-row items-center gap-2 mt-3">
        <UiIcon as={CheckCircle2} size={14} className="text-green-700" />
        <Span className="text-xs text-slate-500 flex-1">Changes reach every delivery partner immediately.</Span>
      </Div>
    </AdminPage>
  );
}
