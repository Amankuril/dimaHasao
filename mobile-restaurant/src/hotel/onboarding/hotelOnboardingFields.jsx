import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { FileImage, Upload, X } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { prepareUploadFile } from '../../lib/images';
import { poppins, tw } from '../../theme';
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

function Label({ children }) {
  return <Text style={styles.label}>{children}</Text>;
}

function Input({ style, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      placeholderTextColor={tw.slate400}
      {...props}
      onFocus={(e) => {
        setFocused(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        props.onBlur?.(e);
      }}
      style={[styles.input, focused ? { borderColor: tw.slate900 } : null, style]}
    />
  );
}

export function HotelBusinessFields({ values, onChange }) {
  const set = (key) => (text) => onChange({ ...values, [key]: text });

  return (
    <View style={{ gap: 16 }}>
      <View>
        <Label>Business / contact name</Label>
        <Input value={values.businessName} onChangeText={set('businessName')} placeholder="e.g. Hasao Heritage Stays" accessibilityLabel="Business / contact name" />
      </View>
      <View>
        <Label>Owner&apos;s full name</Label>
        <Input value={values.ownerName} onChangeText={set('ownerName')} placeholder="Full legal name" accessibilityLabel="Owner's full name" />
      </View>
      <View>
        <Label>
          Email <Text style={styles.optional}>(optional)</Text>
        </Label>
        <Input
          value={values.email}
          onChangeText={set('email')}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Email"
        />
      </View>
      <View>
        <Label>Address</Label>
        <Input value={values.addressLine1} onChangeText={set('addressLine1')} placeholder="Street / locality" accessibilityLabel="Address" />
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Label>City</Label>
          <Input value={values.city} onChangeText={set('city')} placeholder="City" accessibilityLabel="City" />
        </View>
        <View style={{ flex: 1 }}>
          <Label>State</Label>
          <Input value={values.state} onChangeText={set('state')} placeholder="State" accessibilityLabel="State" />
        </View>
      </View>
      <View>
        <Label>Pincode</Label>
        <Input
          value={values.pincode}
          onChangeText={(text) => onChange({ ...values, pincode: text.replace(/\D/g, '').slice(0, 6) })}
          keyboardType="number-pad"
          placeholder="6-digit pincode"
          accessibilityLabel="Pincode"
        />
      </View>
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
    <View style={{ flex: 1 }}>
      <Label>{label}</Label>
      {file ? (
        <View style={styles.fileRow}>
          <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <FileImage size={15} color={tw.slate400} />
            <Text style={styles.fileName} numberOfLines={1}>{file.name || 'Photo selected'}</Text>
          </View>
          <Press onPress={onClear} accessibilityLabel={`Remove ${label}`} hitSlop={8}>
            <X size={15} color={tw.slate400} />
          </Press>
        </View>
      ) : (
        <Press scale={0.98} onPress={() => setPickerOpen(true)} accessibilityLabel={`Upload ${label}`} style={styles.uploadTile}>
          <Upload size={15} color={tw.slate500} />
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
    <View style={{ gap: 16 }}>
      <View>
        <Label>Aadhaar number</Label>
        <Input
          value={values.aadhaarNumber}
          onChangeText={(text) => onChange({ ...values, aadhaarNumber: text.replace(/\D/g, '').slice(0, 12) })}
          keyboardType="number-pad"
          placeholder="12-digit Aadhaar number"
          accessibilityLabel="Aadhaar number"
        />
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
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
      <View>
        <Label>PAN number</Label>
        <Input
          value={values.panNumber}
          onChangeText={(text) => onChange({ ...values, panNumber: text.toUpperCase().slice(0, 10) })}
          placeholder="ABCDE1234F"
          autoCapitalize="characters"
          autoCorrect={false}
          accessibilityLabel="PAN number"
        />
      </View>
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
  label: { marginBottom: 6, fontSize: 12, lineHeight: 16, letterSpacing: 0.6, color: tw.slate500, textTransform: 'uppercase', ...poppins(600) },
  optional: { letterSpacing: 0, color: tw.slate400, textTransform: 'none', ...poppins(400) },
  input: { borderRadius: 12, borderWidth: 1, borderColor: tw.slate200, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: tw.gray900, backgroundColor: '#fff', ...poppins(400) },
  fileRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderRadius: 12, borderWidth: 1, borderColor: tw.slate200, paddingHorizontal: 16, paddingVertical: 12 },
  fileName: { flex: 1, fontSize: 14, color: tw.slate700, ...poppins(400) },
  uploadTile: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: tw.slate300, paddingHorizontal: 16, paddingVertical: 12 },
  uploadText: { fontSize: 14, color: tw.slate500, ...poppins(400) },
});
