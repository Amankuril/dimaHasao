import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CheckCircle2, Upload, X } from 'lucide-react-native';
import { IconButton } from '../../components/ds';
import { Press } from '../../components/ui';
import { prepareUploadFile } from '../../lib/images';
import { color, radii, space, type } from '../../theme';
import { Field } from '../components/dashboard/partnerUi';
import ImageSourcePicker from '../../restaurant/components/ImageSourcePicker';

/*
 * Port of Frontend/src/shared/partner/hotelOnboardingFields.jsx.
 *
 * The two hotel onboarding steps (business/owner details, then identity
 * documents) as plain presentational pieces: values/onChange/errors in, JSX
 * out, no API calls, no navigation. Three places render them: the standalone
 * hotel-only wizard, the "both" wizard's steps 4-5 and the "add a hotel later"
 * screen, so the hotel form never drifts into three versions.
 *
 * A document "file" here is what React Native's FormData uploads:
 * { uri, name, type }, from the camera / gallery sheet (web: <input type=file>).
 */

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const AADHAAR_REGEX = /^\d{12}$/;
const PINCODE_REGEX = /^\d{6}$/;

export const HOTEL_BUSINESS_DEFAULTS = {
  businessName: '',
  ownerName: '',
  email: '',
  addressLine1: '',
  city: '',
  state: '',
  pincode: '',
};

export const HOTEL_DOCUMENTS_DEFAULTS = {
  aadhaarNumber: '',
  aadhaarFront: null,
  aadhaarBack: null,
  panNumber: '',
  panCardImage: null,
};

export const validateHotelBusinessFields = (values) => {
  const errors = [];
  if (!String(values.businessName || '').trim()) errors.push('Business or contact name is required');
  if (!String(values.ownerName || '').trim()) errors.push("Owner's full name is required");
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(values.email).trim())) {
    errors.push('Enter a valid email address');
  }
  if (!String(values.addressLine1 || '').trim()) errors.push('Address is required');
  if (!String(values.city || '').trim()) errors.push('City is required');
  if (!String(values.state || '').trim()) errors.push('State is required');
  if (!PINCODE_REGEX.test(String(values.pincode || '').trim())) errors.push('Enter a valid 6-digit pincode');
  return errors;
};

export const validateHotelDocumentFields = (values) => {
  const errors = [];
  if (!AADHAAR_REGEX.test(String(values.aadhaarNumber || '').trim())) errors.push('Enter a valid 12-digit Aadhaar number');
  if (!values.aadhaarFront) errors.push('Aadhaar front photo is required');
  if (!values.aadhaarBack) errors.push('Aadhaar back photo is required');
  if (!PAN_REGEX.test(String(values.panNumber || '').trim().toUpperCase())) errors.push('Enter a valid PAN number');
  if (!values.panCardImage) errors.push('PAN card photo is required');
  return errors;
};

export function HotelBusinessFields({ values, onChange }) {
  const set = (key) => (text) => onChange({ ...values, [key]: text });

  return (
    <View style={{ gap: space.lg }}>
      <Field label="Business / contact name" value={values.businessName} onChangeText={set('businessName')} placeholder="e.g. Hasao Heritage Stays" accessibilityLabel="Business / contact name" />
      <Field label="Owner's full name" value={values.ownerName} onChangeText={set('ownerName')} placeholder="Full legal name" accessibilityLabel="Owner's full name" />
      <Field
        label={
          <>
            Email <Text style={styles.optional}>(optional)</Text>
          </>
        }
        value={values.email}
        onChangeText={set('email')}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="Email"
      />
      <Field label="Address" value={values.addressLine1} onChangeText={set('addressLine1')} placeholder="Street / locality" accessibilityLabel="Address" />
      <View style={{ flexDirection: 'row', gap: space.md }}>
        <Field style={{ flex: 1 }} label="City" value={values.city} onChangeText={set('city')} placeholder="City" accessibilityLabel="City" />
        <Field style={{ flex: 1 }} label="State" value={values.state} onChangeText={set('state')} placeholder="State" accessibilityLabel="State" />
      </View>
      <Field
        label="Pincode"
        value={values.pincode}
        onChangeText={(text) => onChange({ ...values, pincode: text.replace(/\D/g, '').slice(0, 6) })}
        keyboardType="number-pad"
        placeholder="6-digit pincode"
        accessibilityLabel="Pincode"
      />
    </View>
  );
}

function DocumentUploadTile({ label, file, onSelect, onClear }) {
  const [pickerOpen, setPickerOpen] = useState(false);

  // Same as the restaurant documents: shrink the photo before it goes in the form.
  const handleSelect = async (picked) => {
    onSelect(picked ? await prepareUploadFile(picked) : null);
  };

  return (
    <View style={{ flex: 1, minWidth: 0, gap: space.xs + 2 }}>
      <Text style={styles.label}>{label}</Text>
      {file ? (
        <View style={styles.fileRow}>
          <CheckCircle2 size={18} color={color.success} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.fileName} numberOfLines={1}>
              {file.name || 'Photo selected'}
            </Text>
            <Text style={styles.fileState}>Added</Text>
          </View>
          <IconButton icon={X} label={`Remove ${label}`} onPress={onClear} size={40} iconSize={18} iconColor={color.textSecondary} />
        </View>
      ) : (
        <Press scale={0.98} onPress={() => setPickerOpen(true)} accessibilityLabel={`Upload ${label}`} style={styles.uploadTile}>
          <Upload size={18} color={color.primary} />
          <Text style={styles.uploadText}>Upload photo</Text>
        </Press>
      )}
      <ImageSourcePicker
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onFileSelect={handleSelect}
        title={`Upload ${label}`}
        fileNamePrefix={String(label).toLowerCase().replace(/[^a-z0-9]+/g, '-')}
      />
    </View>
  );
}

export function HotelDocumentsFields({ values, onChange }) {
  return (
    <View style={{ gap: space.lg }}>
      <Field
        label="Aadhaar number"
        value={values.aadhaarNumber}
        onChangeText={(text) => onChange({ ...values, aadhaarNumber: text.replace(/\D/g, '').slice(0, 12) })}
        keyboardType="number-pad"
        placeholder="12-digit Aadhaar number"
        accessibilityLabel="Aadhaar number"
      />
      <View style={{ flexDirection: 'row', gap: space.md }}>
        <DocumentUploadTile
          label="Aadhaar front"
          file={values.aadhaarFront}
          onSelect={(file) => onChange({ ...values, aadhaarFront: file })}
          onClear={() => onChange({ ...values, aadhaarFront: null })}
        />
        <DocumentUploadTile
          label="Aadhaar back"
          file={values.aadhaarBack}
          onSelect={(file) => onChange({ ...values, aadhaarBack: file })}
          onClear={() => onChange({ ...values, aadhaarBack: null })}
        />
      </View>
      <Field
        label="PAN number"
        value={values.panNumber}
        onChangeText={(text) => onChange({ ...values, panNumber: text.toUpperCase().slice(0, 10) })}
        placeholder="ABCDE1234F"
        autoCapitalize="characters"
        autoCorrect={false}
        accessibilityLabel="PAN number"
      />
      <DocumentUploadTile
        label="PAN card photo"
        file={values.panCardImage}
        onSelect={(file) => onChange({ ...values, panCardImage: file })}
        onClear={() => onChange({ ...values, panCardImage: null })}
      />
    </View>
  );
}

/** Builds the multipart body the KYC endpoint expects from both step states. */
export const buildHotelKycFormData = (businessValues, documentValues) => {
  const formData = new FormData();
  formData.append('ownerName', String(businessValues.ownerName || '').trim());
  formData.append('street', String(businessValues.addressLine1 || '').trim());
  formData.append('city', String(businessValues.city || '').trim());
  formData.append('state', String(businessValues.state || '').trim());
  formData.append('zipCode', String(businessValues.pincode || '').trim());
  formData.append('aadhaarNumber', String(documentValues.aadhaarNumber || '').trim());
  formData.append('panNumber', String(documentValues.panNumber || '').trim().toUpperCase());
  // React Native's FormData takes { uri, name, type } in place of a File.
  const attach = (key, file) => {
    if (file) formData.append(key, { uri: file.uri, name: file.name || `${key}.jpg`, type: file.type || 'image/jpeg' });
  };
  attach('aadhaarFront', documentValues.aadhaarFront);
  attach('aadhaarBack', documentValues.aadhaarBack);
  attach('panCardImage', documentValues.panCardImage);
  return formData;
};

const styles = StyleSheet.create({
  label: { ...type.label, color: color.text },
  optional: { ...type.small, color: color.textMuted },
  fileRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: space.sm, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.successSoft, paddingLeft: space.md, paddingRight: space.xxs },
  fileName: { ...type.small, color: color.text },
  fileState: { ...type.caption, color: color.success },
  uploadTile: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, borderRadius: radii.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: color.primaryBorder, backgroundColor: color.primarySoft, paddingHorizontal: space.md },
  uploadText: { ...type.label, color: color.primary },
});
