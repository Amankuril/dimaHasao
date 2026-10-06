import { View } from 'react-native';
import { DateSelector, Dropdown, DocumentPreview, Field, Label, Pill, Section, UploadButton } from './parts';

const ACCOUNT_TYPES = [
  { value: 'Saving', label: 'Saving' },
  { value: 'Current', label: 'Current' },
];

/** Step 3 of the wizard: PAN, GST, FSSAI and bank account details. */
export default function Step3({ o }) {
  const {
    step3, setStep3, openImageSourcePicker, getPreviewImageUrl,
    handlePanImageSelected, handleGstImageSelected, handleFssaiImageSelected,
    normalizePAN, normalizeGST, normalizeIFSC, normalizeBankAcc, formatNameToCapital,
    parseLocalYMDDate, formatDateToLocalYMD,
  } = o;

  return (
    <View style={{ gap: 24 }}>
      <Section title="PAN details">
        <View style={{ gap: 16 }}>
          <View>
            <Label>PAN number</Label>
            <Field value={step3.panNumber || ''} onChangeText={(text) => setStep3({ ...step3, panNumber: normalizePAN(text) })} style={{ marginTop: 4 }} placeholder="ABCDE1234F" autoCapitalize="characters" autoCorrect={false} accessibilityLabel="PAN number" />
          </View>
          <View>
            <Label>PAN Card Holder Name</Label>
            <Field
              value={step3.nameOnPan || ''}
              onChangeText={(text) => setStep3({ ...step3, nameOnPan: formatNameToCapital(text.replace(/[^A-Za-z ]/g, '')) })}
              style={{ marginTop: 4 }}
              accessibilityLabel="PAN card holder name"
            />
          </View>
        </View>
        <View>
          <Label>PAN image</Label>
          <UploadButton
            style={{ marginTop: 8 }}
            onPress={() => openImageSourcePicker({ title: 'Upload PAN image', fileNamePrefix: 'pan-image', onSelectFile: handlePanImageSelected })}
          />
          {step3.panImage ? <DocumentPreview uri={getPreviewImageUrl(step3.panImage)} label="PAN document" onRemove={() => setStep3((prev) => ({ ...prev, panImage: null }))} /> : null}
        </View>
      </Section>

      <Section title="GST details">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Label style={{ fontSize: 14, lineHeight: 20 }}>GST registered?</Label>
          <Pill label="Yes" active={step3.gstRegistered} onPress={() => setStep3({ ...step3, gstRegistered: true })} />
          <Pill label="No" active={!step3.gstRegistered} onPress={() => setStep3({ ...step3, gstRegistered: false })} />
        </View>
        {step3.gstRegistered ? (
          <View style={{ gap: 12 }}>
            <Field value={step3.gstNumber || ''} onChangeText={(text) => setStep3({ ...step3, gstNumber: normalizeGST(text) })} placeholder="GST number (15 characters)" autoCapitalize="characters" autoCorrect={false} accessibilityLabel="GST number" />
            <Field
              value={step3.gstLegalName || ''}
              onChangeText={(text) => setStep3({ ...step3, gstLegalName: formatNameToCapital(text.replace(/[^A-Za-z ]/g, '')) })}
              placeholder="Legal name"
              accessibilityLabel="GST legal name"
            />
            <Field value={step3.gstAddress || ''} onChangeText={(text) => setStep3({ ...step3, gstAddress: text })} placeholder="Registered address" accessibilityLabel="GST registered address" />
            <View>
              <UploadButton onPress={() => openImageSourcePicker({ title: 'Upload GST image', fileNamePrefix: 'gst-image', onSelectFile: handleGstImageSelected })} />
              {step3.gstImage ? <DocumentPreview uri={getPreviewImageUrl(step3.gstImage)} label="GST document" onRemove={() => setStep3((prev) => ({ ...prev, gstImage: null }))} /> : null}
            </View>
          </View>
        ) : null}
      </Section>

      <Section title="FSSAI details">
        <View style={{ gap: 16 }}>
          <Field
            value={step3.fssaiNumber || ''}
            onChangeText={(text) => setStep3({ ...step3, fssaiNumber: text.replace(/\D/g, '').slice(0, 14) })}
            placeholder="FSSAI number (14 digits)"
            keyboardType="number-pad"
            accessibilityLabel="FSSAI number"
          />
          <View>
            <Label style={{ marginBottom: 4 }}>FSSAI expiry date</Label>
            <DateSelector value={step3.fssaiExpiry} onChange={(fssaiExpiry) => setStep3({ ...step3, fssaiExpiry })} parseLocalYMDDate={parseLocalYMDDate} formatDateToLocalYMD={formatDateToLocalYMD} />
          </View>
        </View>
        <View>
          <UploadButton onPress={() => openImageSourcePicker({ title: 'Upload FSSAI image', fileNamePrefix: 'fssai-image', onSelectFile: handleFssaiImageSelected })} />
          {step3.fssaiImage ? <DocumentPreview uri={getPreviewImageUrl(step3.fssaiImage)} label="FSSAI document" onRemove={() => setStep3((prev) => ({ ...prev, fssaiImage: null }))} /> : null}
        </View>
      </Section>

      <Section title="Bank account details">
        <View style={{ gap: 16 }}>
          <Field value={step3.accountNumber || ''} onChangeText={(text) => setStep3({ ...step3, accountNumber: normalizeBankAcc(text) })} placeholder="Account number" keyboardType="number-pad" accessibilityLabel="Account number" />
          <Field value={step3.confirmAccountNumber || ''} onChangeText={(text) => setStep3({ ...step3, confirmAccountNumber: normalizeBankAcc(text) })} placeholder="Re-enter account number" keyboardType="number-pad" accessibilityLabel="Re-enter account number" />
        </View>
        <View style={{ gap: 16 }}>
          <Field value={step3.ifscCode || ''} onChangeText={(text) => setStep3({ ...step3, ifscCode: normalizeIFSC(text) })} placeholder="IFSC code" autoCapitalize="characters" autoCorrect={false} accessibilityLabel="IFSC code" />
          <Dropdown value={step3.accountType || ''} options={ACCOUNT_TYPES} onChange={(accountType) => setStep3({ ...step3, accountType })} placeholder="Select account type" accessibilityLabel="Account type" />
        </View>
        <Field
          value={step3.accountHolderName || ''}
          onChangeText={(text) => setStep3({ ...step3, accountHolderName: formatNameToCapital(text.replace(/[^A-Za-z ]/g, '')) })}
          placeholder="Account holder name"
          accessibilityLabel="Account holder name"
        />
      </Section>
    </View>
  );
}
