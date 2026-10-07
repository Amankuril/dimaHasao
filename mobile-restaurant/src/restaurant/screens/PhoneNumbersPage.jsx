import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, ChevronDown, Edit, Phone, Users, X } from 'lucide-react-native';
import { BottomSheet } from '../../components/kit';
import { Press } from '../../components/ui';
import { poppins, tw } from '../../theme';
import { usePhoneNumbersPage } from '../hooks/pages/usePhoneNumbersPage';
import { RT, RT_GRADIENT } from '../theme';

function Sheet({ visible, onClose, title, children, footer, maxHeight = '70%' }) {
  const insets = useSafeAreaInsets();
  return (
    <BottomSheet visible={visible} onClose={onClose} backdrop="rgba(0,0,0,0.5)">
      <View style={[styles.sheet, { maxHeight }]}>
        <View style={styles.sheetHead}>
          <Text style={styles.sheetTitle}>{title}</Text>
          <Press onPress={onClose} accessibilityLabel="Close" hitSlop={8} style={{ padding: 4 }}>
            <X size={20} color={tw.gray600} />
          </Press>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16 }}>{children}</ScrollView>
        {footer ? <View style={[styles.sheetFoot, { paddingBottom: 16 + insets.bottom }]}>{footer}</View> : null}
      </View>
    </BottomSheet>
  );
}

function Actions({ onCancel, onConfirm, confirmLabel, enabled }) {
  return (
    <>
      <Press scale={0.98} onPress={onCancel} style={styles.cancel}>
        <Text style={styles.cancelText}>Cancel</Text>
      </Press>
      <Press scale={0.98} onPress={onConfirm} disabled={!enabled} accessibilityState={{ disabled: !enabled }} style={{ flex: 1 }}>
        <LinearGradient colors={enabled ? RT_GRADIENT : [tw.gray300, tw.gray300]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.confirm}>
          <Text style={[styles.cancelText, { color: enabled ? '#fff' : tw.gray500 }]}>{confirmLabel}</Text>
        </LinearGradient>
      </Press>
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
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [otpFocus, setOtpFocus] = useState(-1);

  const numberRow = (key, label, top) => (
    <View style={[styles.numberRow, top ? { borderTopWidth: 1, borderTopColor: tw.gray100 } : null]}>
      <View style={{ flex: 1 }}>
        {label ? <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray700, marginBottom: 4, ...poppins(400) }}>{label}</Text> : null}
        <Text style={{ fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(600) }}>{getDisplayNumber(key)}</Text>
      </View>
      <Press onPress={() => handleEditClick(key)} accessibilityLabel={`Edit ${label || 'restaurant page number'}`} hitSlop={8} style={{ padding: 8 }}>
        <Edit size={16} color={RT.primary} />
      </Press>
    </View>
  );

  const section = (Icon, title, body, children) => (
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <View style={styles.cardIcon}>
          <Icon size={20} color={tw.gray700} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(700) }}>{title}</Text>
          <Text style={{ fontSize: 12, lineHeight: 16, color: tw.gray600, marginTop: 4, ...poppins(400) }}>{body}</Text>
        </View>
      </View>
      <View style={{ marginTop: 16 }}>{children}</View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: tw.gray100 }}>
      <View style={[styles.header, { paddingTop: 12 + insets.top }]}>
        <Press onPress={goBack} accessibilityLabel="Go back" hitSlop={8} style={{ padding: 4 }}>
          <ArrowLeft size={20} color={tw.gray700} />
        </Press>
        <Text style={{ fontSize: 20, lineHeight: 28, color: tw.gray900, ...poppins(700) }} accessibilityRole="header">Important contacts</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 48 + insets.bottom, gap: 16 }}>
        {section(
          Users,
          'Order reminder numbers',
          'Should always be available for Zomato to reach out for live order support and order reminders.',
          <View style={{ gap: 12 }}>
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
        <View style={{ gap: 16 }}>
          <View>
            <Text style={styles.label}>Country code</Text>
            <Press scale={0.99} onPress={() => setIsCountryCodeOpen(true)} style={styles.select}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 18 }}>{countryCodes.find((c) => c.code === countryCode)?.flag || '🇮🇳'}</Text>
                <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(400) }}>{countryCode}</Text>
              </View>
              <ChevronDown size={20} color={tw.gray500} />
            </Press>
          </View>
          <View>
            <Text style={styles.label}>Phone number</Text>
            <TextInput value={phoneNumber} onChangeText={(text) => setPhoneNumber(text.replace(/\D/g, ''))} placeholder="Enter phone number" placeholderTextColor={tw.gray400} keyboardType="phone-pad" accessibilityLabel="Phone number" onFocus={() => setPhoneFocused(true)} onBlur={() => setPhoneFocused(false)} style={[styles.input, phoneFocused ? styles.focus : null]} />
          </View>
        </View>
      </Sheet>

      <Sheet visible={isCountryCodeOpen} onClose={() => setIsCountryCodeOpen(false)} title="Select country code" maxHeight="60%">
        <View style={{ gap: 8 }}>
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
              >
                <LinearGradient colors={on ? RT_GRADIENT : [tw.gray50, tw.gray50]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.country}>
                  <Text style={{ fontSize: 20 }}>{country.flag}</Text>
                  <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: on ? '#fff' : tw.gray900, ...poppins(500) }}>{country.country}</Text>
                  <Text style={{ fontSize: 14, lineHeight: 20, color: on ? '#fff' : tw.gray600, ...poppins(500) }}>{country.code}</Text>
                </LinearGradient>
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
        <View style={{ gap: 24, paddingVertical: 8 }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray600, marginBottom: 8, ...poppins(400) }}>We&apos;ve sent a 6-digit OTP to</Text>
            <Text style={{ fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(600) }}>{pendingPhoneData ? `${pendingPhoneData.countryCode}-${pendingPhoneData.phoneNumber}` : ''}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
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
                style={[styles.otp, otpFocus === index ? styles.focus : null]}
              />
            ))}
          </View>
          <Press onPress={handleResendOtp} hitSlop={8} style={{ alignSelf: 'center' }}>
            <Text style={{ fontSize: 14, lineHeight: 20, color: RT.primary, ...poppins(500) }}>Resend OTP</Text>
          </Press>
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  // restaurantTheme.css: input:focus border = primary 55 % over white
  focus: { borderColor: '#789d8a' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: tw.gray200, paddingHorizontal: 16, paddingBottom: 12 },
  card: { backgroundColor: '#fff', borderRadius: 8, padding: 16 },
  cardIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: tw.gray100, alignItems: 'center', justifyContent: 'center' },
  numberRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: tw.gray200 },
  sheetTitle: { fontSize: 18, lineHeight: 28, color: tw.gray900, ...poppins(700) },
  sheetFoot: { paddingHorizontal: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: tw.gray200, flexDirection: 'row', gap: 12 },
  label: { fontSize: 14, lineHeight: 20, color: tw.gray900, marginBottom: 8, ...poppins(500) },
  select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: tw.gray300, borderRadius: 8, backgroundColor: '#fff' },
  input: { paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: tw.gray300, borderRadius: 8, fontSize: 14, color: tw.gray900, backgroundColor: '#fff', ...poppins(400) },
  cancel: { flex: 1, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: tw.gray300, borderRadius: 8, backgroundColor: '#fff', alignItems: 'center' },
  cancelText: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(600) },
  confirm: { paddingVertical: 13, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center' },
  country: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8 },
  otp: { width: 48, height: 48, textAlign: 'center', fontSize: 18, paddingVertical: 0, color: tw.gray900, borderWidth: 2, borderColor: tw.gray300, borderRadius: 8, ...poppins(600) },
});
