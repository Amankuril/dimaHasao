import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mail, Phone, Send } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { poppins, shadow, tw } from '../../theme';
import PartnerHeader from '../components/PartnerHeader';
import { legalService } from '../services/apiService';
import { HT, htAlpha } from '../theme';

/*
 * Port of Frontend/src/modules/Hotel/app/partner/pages/PartnerContact.jsx
 * (/hotel/partner/contact). The gsap entrance is dropped.
 */

function Input({ label, multiline, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholderTextColor={tw.gray400}
        style={[styles.input, multiline && { minHeight: 98, textAlignVertical: 'top' }, focused && { boxShadow: `0 0 0 2px ${htAlpha(0.6)}` }]}
      />
    </View>
  );
}

const PartnerContact = () => {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    if (!name || !subject || !message) {
      setError('Please fill all required fields.');
      return;
    }

    try {
      setSubmitting(true);
      await legalService.submitContact('partner', {
        name,
        email,
        phone,
        subject,
        message,
      });
      setSuccess('Your message has been sent to the Dima Hasao team.');
      setName('');
      setEmail('');
      setPhone('');
      setSubject('');
      setMessage('');
    } catch (e) {
      setError(e?.message || 'Failed to send message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: HT.bg }}>
      <PartnerHeader title="Contact Partner Support" subtitle="Reach the Dima Hasao team" />

      <ScrollView contentContainerStyle={{ paddingBottom: 80 + insets.bottom }} keyboardShouldPersistTaps="handled">
        <View style={{ maxWidth: 768, width: '100%', alignSelf: 'center', paddingHorizontal: 16, paddingTop: 24, gap: 16 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={styles.info}>
              <View style={styles.infoIcon}>
                <Mail size={18} color={HT.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>hoomzohub@gmail.com</Text>
              </View>
            </View>
            <View style={styles.info}>
              <View style={styles.infoIcon}>
                <Phone size={18} color={HT.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>6232314147</Text>
              </View>
            </View>
          </View>

          {error ? (
            <View style={[styles.banner, { backgroundColor: tw.red50, borderColor: tw.red200 }]}>
              <Text style={[styles.bannerText, { color: tw.red700 }]}>{error}</Text>
            </View>
          ) : null}
          {success ? (
            <View style={[styles.banner, { backgroundColor: tw.emerald50, borderColor: tw.emerald200 }]}>
              <Text style={[styles.bannerText, { color: tw.emerald700 }]}>{success}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Input label="Full Name *" value={name} onChangeText={setName} placeholder="Your name" />
              <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@hotel.com" keyboardType="email-address" autoCapitalize="none" />
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Input label="Phone" value={phone} onChangeText={setPhone} placeholder="+91" keyboardType="phone-pad" />
              <Input label="Subject *" value={subject} onChangeText={setSubject} placeholder="Billing, onboarding, payouts..." />
            </View>

            <Input label="Message *" multiline value={message} onChangeText={setMessage} placeholder="Share context so we can assist you faster." />

            <Press onPress={handleSubmit} disabled={submitting} style={[styles.submit, submitting && { opacity: 0.6 }]}>
              <Send size={16} color="#fff" />
              <Text style={styles.submitText}>{submitting ? 'Sending...' : 'Send to Support'}</Text>
            </Press>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  info: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: tw.gray100, flexDirection: 'row', alignItems: 'center', gap: 12, ...shadow('sm') },
  infoIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: HT.primarySoft, alignItems: 'center', justifyContent: 'center' },
  infoLabel: { fontSize: 11, lineHeight: 16.5, letterSpacing: 0.55, textTransform: 'uppercase', color: tw.gray700, ...poppins(700) },
  infoValue: { fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(400) },
  banner: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 },
  bannerText: { fontSize: 12, lineHeight: 16, ...poppins(400) },
  form: { backgroundColor: '#fff', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: tw.gray100, gap: 16, ...shadow('sm') },
  label: { fontSize: 12, lineHeight: 16, color: tw.gray600, marginBottom: 4, ...poppins(700) },
  input: { width: '100%', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: tw.gray200, fontSize: 14, color: tw.gray900, ...poppins(400) },
  submit: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8, backgroundColor: HT.primary, paddingVertical: 12, borderRadius: 12, ...shadow('md') },
  submitText: { fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(700) },
});

export default PartnerContact;
