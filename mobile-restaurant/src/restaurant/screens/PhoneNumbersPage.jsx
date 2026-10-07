import { useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, ChevronDown, Pencil, Phone, Users } from 'lucide-react-native';
import { BottomSheet } from '../../components/kit';
import { Button, Card, IconButton, SectionHeader } from '../../components/ds';
import { Press } from '../../components/ui';
import { color, radii, space, type } from '../../theme';
import { usePhoneNumbersPage } from '../hooks/pages/usePhoneNumbersPage';
import { Field, Input, ScreenHeader, SheetPanel } from './inventory/partnerKit';

function Sheet({ visible, onClose, title, children, footer, maxHeight = '70%' }) {
  const insets = useSafeAreaInsets();
  return (
    <BottomSheet visible={visible} onClose={onClose} backdrop={color.overlay}>
      <SheetPanel title={title} onClose={onClose} style={{ maxHeight }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.lg }}>{children}</ScrollView>
        {footer ? <View style={[styles.sheetFoot, { paddingBottom: space.lg + insets.bottom }]}>{footer}</View> : null}
      </SheetPanel>
    </BottomSheet>
  );
}

function Actions({ onCancel, onConfirm, confirmLabel, enabled }) {
  return (
    <>
      <Button title="Cancel" variant="outline" onPress={onCancel} style={{ flex: 1 }} />
      <Button title={confirmLabel} onPress={onConfirm} disabled={!enabled} style={{ flex: 1 }} />
    </>
  );
}

/** Port of Food/pages/restaurant/PhoneNumbersPage.jsx (/food/restaurant/phone). Wording is the web's own. */
export default function PhoneNumbersPage() {
  const insets = useSafeAreaInsets();
  const {
    goBack, editingNumber, countryCode, setCountryCode, phoneNumber, setPhoneNumber, isCountryCodeOpen, setIsCountryCodeOpen, showOtpPopup, otp, pendingPhoneData, countryCodes,
    handleEditClick, handleSaveEdit, handleCancelEdit, handleOtpChange, handleOtpKeyDown, handleVerifyOtp, handleResendOtp, handleCancelOtp, getDisplayNumber,
  } = usePhoneNumbersPage();
  const otpRefs = useRef([]);
  const [otpFocus, setOtpFocus] = useState(-1);

  const numberRow = (key, label, top) => (
    <View style={[styles.numberRow, top ? styles.numberTop : null]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        {label ? <Text style={[type.small, { color: color.textMuted }]}>{label}</Text> : null}
        <Text style={[type.subheading, { color: color.text }]}>{getDisplayNumber(key)}</Text>
      </View>
      <IconButton icon={Pencil} label={`Edit ${label || 'restaurant page number'}`} variant="primary" onPress={() => handleEditClick(key)} />
    </View>
  );

  const section = (Icon, title, body, children) => (
    <View>
      <SectionHeader title={title} />
      <Card style={{ gap: space.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
          <View style={styles.cardIcon}>
            <Icon size={18} color={color.primary} />
          </View>
          <Text style={[type.small, { flex: 1, color: color.textSecondary }]}>{body}</Text>
        </View>
        <View>{children}</View>
      </Card>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <ScreenHeader title="Important contacts" onBack={goBack} />

      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxxl + insets.bottom, gap: space.xxl }}>
        {section(
          Users,
          'Order reminder numbers',
          'Should always be available for Zomato to reach out for live order support and order reminders.',
          <View>
            {numberRow('orderReminder1', 'Order reminder number #1')}
            {numberRow('orderReminder2', 'Order reminder number #2', true)}
          </View>,
        )}
        {section(Phone, 'Restaurant page number', 'Number for Zomato customers to call your restaurant.', numberRow('restaurantPage'))}
      </ScrollView>

      <Sheet
        visible={Boolean(editingNumber)}
        onClose={handleCancelEdit}
        title="Edit phone number"
        footer={<Actions onCancel={handleCancelEdit} onConfirm={handleSaveEdit} confirmLabel="Save" enabled={Boolean(phoneNumber.trim())} />}
      >
        <View style={{ gap: space.lg }}>
          <Field label="Country code">
            <Press scale={0.99} onPress={() => setIsCountryCodeOpen(true)} accessibilityLabel={`Country code ${countryCode}`} style={styles.select}>
              <Text style={{ fontSize: 18 }}>{countryCodes.find((c) => c.code === countryCode)?.flag || '🇮🇳'}</Text>
              <Text style={[type.body, { flex: 1, color: color.text }]}>{countryCode}</Text>
              <ChevronDown size={20} color={color.textMuted} />
            </Press>
          </Field>
          <Field label="Phone number">
            <Input value={phoneNumber} onChangeText={(text) => setPhoneNumber(text.replace(/\D/g, ''))} placeholder="Enter phone number" keyboardType="phone-pad" accessibilityLabel="Phone number" />
          </Field>
        </View>
      </Sheet>

      <Sheet visible={isCountryCodeOpen} onClose={() => setIsCountryCodeOpen(false)} title="Select country code" maxHeight="60%">
        <View style={{ gap: space.sm }}>
          {countryCodes.map((country) => {
            const on = countryCode === country.code;
            return (
              <Press
                key={country.code}
                scale={0.99}
                onPress={() => {
                  setCountryCode(country.code);
                  setIsCountryCodeOpen(false);
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${country.country} ${country.code}`}
                style={[styles.country, on && styles.countryOn]}
              >
                <Text style={{ fontSize: 20 }}>{country.flag}</Text>
                <Text style={[type.bodyStrong, { flex: 1, color: color.text }]}>{country.country}</Text>
                <Text style={[type.body, { color: color.textSecondary }]}>{country.code}</Text>
                {on ? <Check size={18} color={color.primary} /> : null}
              </Press>
            );
          })}
        </View>
      </Sheet>

      <Sheet
        visible={showOtpPopup}
        onClose={handleCancelOtp}
        title="Verify OTP"
        footer={<Actions onCancel={handleCancelOtp} onConfirm={handleVerifyOtp} confirmLabel="Verify" enabled={otp.join('').length === 6} />}
      >
        <View style={{ gap: space.xl, paddingVertical: space.sm }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={[type.small, { color: color.textSecondary }]}>We&apos;ve sent a 6-digit OTP to</Text>
            <Text style={[type.subheading, { color: color.text }]}>{pendingPhoneData ? `${pendingPhoneData.countryCode}-${pendingPhoneData.phoneNumber}` : ''}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm }}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(el) => {
                  otpRefs.current[index] = el;
                }}
                value={digit}
                onChangeText={(value) => {
                  handleOtpChange(index, value);
                  // The web moves focus through the DOM; here the boxes are refs.
                  if (/^\d+$/.test(value) && index < 5) otpRefs.current[index + 1]?.focus();
                }}
                onKeyPress={({ nativeEvent }) => {
                  handleOtpKeyDown(index, nativeEvent);
                  if (nativeEvent.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
                }}
                keyboardType="number-pad"
                maxLength={1}
                autoFocus={index === 0}
                accessibilityLabel={`Digit ${index + 1}`}
                onFocus={() => setOtpFocus(index)}
                onBlur={() => setOtpFocus((cur) => (cur === index ? -1 : cur))}
                style={[styles.otp, otpFocus === index ? styles.otpFocus : null]}
              />
            ))}
          </View>
          <Button title="Resend OTP" variant="ghost" fullWidth={false} onPress={handleResendOtp} style={{ alignSelf: 'center' }} />
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  cardIcon: { width: 36, height: 36, borderRadius: radii.md, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  numberRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  numberTop: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border },
  sheetFoot: { paddingHorizontal: space.lg, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border, flexDirection: 'row', gap: space.md },
  select: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, borderWidth: 1, borderColor: color.border, borderRadius: radii.md, backgroundColor: color.surface },
  country: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, borderRadius: radii.md, borderWidth: 1, borderColor: color.border },
  countryOn: { borderColor: color.primary, borderWidth: 2, backgroundColor: color.primarySoft },
  otp: { width: 46, height: 52, textAlign: 'center', paddingVertical: 0, ...type.heading, color: color.text, borderWidth: 1.5, borderColor: color.border, borderRadius: radii.md, backgroundColor: color.surface, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : null) },
  otpFocus: { borderColor: color.primary, borderWidth: 2 },
});
