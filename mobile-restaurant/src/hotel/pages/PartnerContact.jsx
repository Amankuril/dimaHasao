import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertCircle, CheckCircle2, Mail, Phone, Send } from 'lucide-react-native';
import { Button, Card, ListRow, SectionHeader } from '../../components/ds';
import { color, radii, space, type } from '../../theme';
import PartnerHeader from '../components/PartnerHeader';
import { legalService } from '../services/apiService';
import { Field } from '../components/dashboard/partnerUi';

/*
 * Port of Frontend/src/modules/Hotel/app/partner/pages/PartnerContact.jsx
 * (/hotel/partner/contact). The gsap entrance is dropped.
 */

function Input({ label, multiline, ...props }) {
  return <Field label={label} multiline={multiline} numberOfLines={multiline ? 4 : 1} {...props} />;
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
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <PartnerHeader title="Contact Partner Support" subtitle="Reach the Dima Hasao team" />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ paddingBottom: space.xxxl + insets.bottom }} keyboardShouldPersistTaps="handled">
          <View style={{ maxWidth: 768, width: '100%', alignSelf: 'center', padding: space.lg, gap: space.lg }}>
            <Card padded={false}>
              <ListRow icon={Mail} title="Email" subtitle="hoomzohub@gmail.com" divider />
              <ListRow icon={Phone} title="Phone" subtitle="6232314147" />
            </Card>

            {error ? (
              <View style={[styles.banner, { backgroundColor: color.dangerSoft }]} accessibilityRole="alert">
                <AlertCircle size={18} color={color.danger} />
                <Text style={[styles.bannerText, { color: color.danger }]}>{error}</Text>
              </View>
            ) : null}
            {success ? (
              <View style={[styles.banner, { backgroundColor: color.successSoft }]} accessibilityLiveRegion="polite">
                <CheckCircle2 size={18} color={color.success} />
                <Text style={[styles.bannerText, { color: color.success }]}>{success}</Text>
              </View>
            ) : null}

            <Card style={{ gap: space.lg }}>
              <SectionHeader title="Send a message" style={{ marginBottom: 0 }} />
              <Input label="Full name *" value={name} onChangeText={setName} placeholder="Your name" />
              <Input label="Email" value={email} onChangeText={setEmail} placeholder="you@hotel.com" keyboardType="email-address" autoCapitalize="none" />
              <Input label="Phone" value={phone} onChangeText={setPhone} placeholder="+91" keyboardType="phone-pad" />
              <Input label="Subject *" value={subject} onChangeText={setSubject} placeholder="Billing, onboarding, payouts..." />
              <Input label="Message *" multiline value={message} onChangeText={setMessage} placeholder="Share context so we can assist you faster." />

              <Button title={submitting ? 'Sending...' : 'Send to support'} icon={Send} onPress={handleSubmit} disabled={submitting} loading={submitting} size="lg" />
            </Card>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderRadius: radii.md, padding: space.md },
  bannerText: { flex: 1, ...type.small },
});

export default PartnerContact;
