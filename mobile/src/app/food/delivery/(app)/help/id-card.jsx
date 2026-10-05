import { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X } from 'lucide-react-native';
import { deliveryApi as deliveryAPI } from '../../../../../api/delivery';
import { mediaUrl } from '../../../../../api/client';
import { Spinner } from '../../../../../components/Loader';
import { Press } from '../../../../../components/ui';
import useDeliveryBackNavigation from '../../../../../delivery/hooks/useDeliveryBackNavigation';
import { useCompanyName } from '../../../../../lib/platformSettings';
import { toast } from '../../../../../lib/notify';
import { display, poppins, shadow, tw } from '../../../../../theme';

/*
 * Web: pages/help/ShowIdCardV2.jsx. No font-poppins root, so Poppins; h1-h3
 * and font-black are Sora. The status pill is bg-green-500, which the theme's
 * substring rule paints #E8F2EC, under white text.
 */

const AVATAR = require('../../../../../../assets/images/profile_avatar.webp');

export default function ShowIdCardV2() {
  const companyName = useCompanyName();
  const goBack = useDeliveryBackNavigation();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const response = await deliveryAPI.getProfile();
        if (response?.data?.success && response?.data?.data?.profile) setProfileData(response.data.data.profile);
        else toast.error('Failed to load profile data');
      } catch {
        toast.error('Failed to load ID card data');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <View style={{ alignItems: 'center', gap: 16 }}>
          <Spinner size={32} color={tw.gray600} />
          <Text style={styles.muted}>Loading ID card...</Text>
        </View>
      </View>
    );
  }
  if (!profileData) {
    return (
      <View style={styles.center}>
        <View style={{ alignItems: 'center' }}>
          <Text style={[styles.muted, { marginBottom: 16 }]}>Failed to load ID card data</Text>
          <Press onPress={goBack} accessibilityLabel="Go Back" style={styles.goBack}>
            <Text style={styles.goBackText}>Go Back</Text>
          </Press>
        </View>
      </View>
    );
  }

  const status = profileData.status?.toLowerCase() || (profileData.isActive ? 'active' : 'inactive');
  const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
  const statusBg =
    status === 'active' || status === 'approved' ? tw.primarySoft : status === 'pending' ? tw.yellow500 : status === 'suspended' || status === 'blocked' ? tw.red500 : tw.gray500;
  const validTill = (() => {
    if (!profileData?.createdAt) return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const d = new Date(profileData.createdAt);
    d.setFullYear(d.getFullYear() + 1);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  })();
  const vehicle = (() => {
    const v = profileData?.vehicle;
    if (!v) return null;
    const parts = [];
    if (v.type) parts.push(v.type.charAt(0).toUpperCase() + v.type.slice(1));
    if (v.number) parts.push(v.number);
    return parts.length ? parts.join(' - ') : null;
  })();
  const imageUrl = profileData?.profileImage?.url || profileData?.documents?.photo || null;
  const card = {
    name: profileData.name || 'Delivery Partner',
    id: profileData.deliveryId || profileData._id?.toString().slice(-8).toUpperCase() || 'N/A',
    phone: profileData.phone || 'N/A',
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#000' }} contentContainerStyle={{ flexGrow: 1 }}>
      <View style={[styles.sheet, shadow('2xl')]}>
        <Press onPress={goBack} accessibilityLabel="Close" style={[styles.close, { top: 16 + insets.top }]}>
          <X size={24} color="#000" />
        </Press>

        <View style={[styles.top, { height: 160 + insets.top }]}>
          <LinearGradient colors={['rgba(0,0,0,0.05)', 'transparent']} style={StyleSheet.absoluteFill} />
          <View style={styles.photoWrap}>
            <View style={[styles.photoRing, shadow('2xl')]}>
              <Image source={imageUrl && !imgFailed ? { uri: mediaUrl(imageUrl) } : AVATAR} onError={() => setImgFailed(true)} style={styles.photo} />
            </View>
          </View>
        </View>

        <View style={[styles.content, { minHeight: height - 160 }]}>
          <Text style={styles.brand}>{companyName}</Text>
          <Text style={styles.partner}>PARTNER</Text>
          <Text style={styles.idCard}>ID CARD</Text>
          {/* An inline <span>: its vertical padding does not grow the 24 px line box. */}
          <View style={{ marginBottom: 32, height: 24, justifyContent: 'center' }}>
            <Text style={[styles.status, { backgroundColor: statusBg }, shadow('0 10px 15px -3px rgba(10,77,43,0.35), 0 4px 6px -4px rgba(10,77,43,0.35)')]}>{statusLabel}</Text>
          </View>
          <View style={{ width: '100%', gap: 32, marginTop: 16 }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.name}>{card.name}</Text>
              <Text style={styles.caption}>Full Name</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 32 }}>
              <View style={styles.cell}>
                <Text style={styles.value}>{card.id}</Text>
                <Text style={styles.small}>Partner ID</Text>
              </View>
              <View style={styles.cell}>
                <Text style={styles.value}>{card.phone}</Text>
                <Text style={styles.small}>Mobile</Text>
              </View>
            </View>
            {vehicle ? (
              <View style={[styles.vehicle, shadow('card')]}>
                <Text style={[styles.value, { textTransform: 'uppercase' }]}>{vehicle}</Text>
                <Text style={styles.small}>Registered Vehicle</Text>
              </View>
            ) : null}
            <View style={{ paddingTop: 16, borderTopWidth: 1, borderTopColor: tw.gray100 }}>
              <Text style={styles.legal}>
                {'This ID card is issued for essential delivery services only. \n'}Valid On: {validTill}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: tw.gray100, alignItems: 'center', justifyContent: 'center' },
  muted: { color: tw.gray600, fontSize: 16, lineHeight: 24, ...poppins(400) },
  goBack: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: tw.primary, borderRadius: 8 },
  goBackText: { color: '#fff', fontSize: 16, lineHeight: 24, ...poppins(400) },
  sheet: { flex: 1, width: '100%', maxWidth: 448, alignSelf: 'center', backgroundColor: tw.gray100 },
  close: { position: 'absolute', right: 16, padding: 8, borderRadius: 999, zIndex: 30, backgroundColor: 'rgba(255,255,255,0.5)' },
  top: { backgroundColor: tw.gray300, justifyContent: 'flex-end', alignItems: 'center', zIndex: 10 },
  photoWrap: { position: 'absolute', bottom: -78, alignSelf: 'center' },
  photoRing: { padding: 6, backgroundColor: '#fff', borderRadius: 999 },
  photo: { width: 144, height: 144, borderRadius: 72, borderWidth: 4, borderColor: tw.gray100 },
  content: { backgroundColor: '#fff', paddingTop: 80, paddingHorizontal: 17.6, paddingBottom: 48, alignItems: 'center' },
  // text-xs font-black -> Sora (.01em)
  brand: { fontSize: 12, lineHeight: 16, color: tw.primary, textTransform: 'uppercase', marginBottom: 8, ...display(900, 12) },
  partner: { fontSize: 36, lineHeight: 45, color: tw.gray900, marginBottom: 4, ...display(900, 36) },
  idCard: { fontSize: 20, lineHeight: 28, color: tw.gray400, textTransform: 'uppercase', marginBottom: 24, ...display(700, 20) },
  status: { color: '#fff', paddingHorizontal: 32, paddingVertical: 10, marginVertical: -6, borderRadius: 999, overflow: 'hidden', fontSize: 12, lineHeight: 16, textTransform: 'uppercase', ...display(900, 12) },
  name: { fontSize: 24, lineHeight: 32, color: tw.gray950, textTransform: 'uppercase', textAlign: 'center', ...display(900, 24) },
  caption: { marginTop: 4, color: tw.gray400, fontSize: 10, lineHeight: 15, letterSpacing: 2, textTransform: 'uppercase', ...poppins(700) },
  cell: { flex: 1, alignItems: 'center' },
  value: { fontSize: 14, lineHeight: 20, color: tw.gray950, ...display(900, 14) },
  small: { fontSize: 9, lineHeight: 13.5, letterSpacing: 0.9, textTransform: 'uppercase', color: tw.gray400, ...poppins(700) },
  vehicle: { alignItems: 'center', backgroundColor: tw.gray50, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E5DDC3' },
  legal: { fontSize: 10, lineHeight: 20, letterSpacing: 1, textTransform: 'uppercase', color: tw.gray400, textAlign: 'center', ...poppins(700) },
});
