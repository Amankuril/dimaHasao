import { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IdCard } from 'lucide-react-native';
import { deliveryApi as deliveryAPI } from '../../../../../api/delivery';
import { mediaUrl } from '../../../../../api/client';
import { Card, EmptyState, ScreenHeader, StatusBadge } from '../../../../../components/ds';
import { Spinner } from '../../../../../components/Loader';
import useDeliveryBackNavigation from '../../../../../delivery/hooks/useDeliveryBackNavigation';
import { useCompanyName } from '../../../../../lib/platformSettings';
import { toast } from '../../../../../lib/notify';
import { color, radii, space, type } from '../../../../../theme';

/*
 * Web: pages/help/ShowIdCardV2.jsx. The partner's ID card, meant to be shown
 * to someone else: brand band, photo, name, status, then the ID details.
 */

const AVATAR = require('../../../../../../assets/images/profile_avatar.webp');

export default function ShowIdCardV2() {
  const companyName = useCompanyName();
  const goBack = useDeliveryBackNavigation();
  const insets = useSafeAreaInsets();
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
      <View style={styles.page}>
        <ScreenHeader title="ID card" onBack={goBack} />
        <View style={styles.center} accessibilityLabel="Loading ID card">
          <Spinner size={32} color={color.primary} />
          <Text style={styles.muted}>Loading ID card...</Text>
        </View>
      </View>
    );
  }
  if (!profileData) {
    return (
      <View style={styles.page}>
        <ScreenHeader title="ID card" onBack={goBack} />
        <View style={styles.center}>
          <EmptyState icon={IdCard} title="Failed to load ID card data" actionLabel="Go back" onAction={goBack} />
        </View>
      </View>
    );
  }

  const status = profileData.status?.toLowerCase() || (profileData.isActive ? 'active' : 'inactive');
  const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
  const statusTone =
    status === 'active' || status === 'approved' ? 'success' : status === 'pending' ? 'warning' : status === 'suspended' || status === 'blocked' ? 'danger' : 'neutral';
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
    <View style={styles.page}>
      <ScreenHeader title="ID card" onBack={goBack} />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: space.xxxl + insets.bottom }]}>
        <Card padded={false} style={styles.card}>
          <View style={styles.band}>
            <Text style={styles.brand} numberOfLines={1}>
              {companyName}
            </Text>
            <Text style={styles.bandTitle}>Partner ID card</Text>
          </View>

          <View style={styles.content}>
            <View style={styles.photoRing}>
              <Image
                source={imageUrl && !imgFailed ? { uri: mediaUrl(imageUrl) } : AVATAR}
                onError={() => setImgFailed(true)}
                style={styles.photo}
                accessibilityLabel={`Photo of ${card.name}`}
              />
            </View>

            <Text style={styles.name} numberOfLines={2}>
              {card.name}
            </Text>
            <Text style={styles.caption}>Full name</Text>
            <StatusBadge tone={statusTone} label={statusLabel} style={styles.status} />

            <View style={styles.grid}>
              <View style={styles.cell}>
                <Text style={styles.caption}>Partner ID</Text>
                <Text style={styles.value} numberOfLines={1}>
                  {card.id}
                </Text>
              </View>
              <View style={styles.cell}>
                <Text style={styles.caption}>Mobile</Text>
                <Text style={styles.value} numberOfLines={1}>
                  {card.phone}
                </Text>
              </View>
            </View>

            {vehicle ? (
              <View style={styles.vehicle}>
                <Text style={styles.caption}>Registered vehicle</Text>
                <Text style={styles.value}>{vehicle.toUpperCase()}</Text>
              </View>
            ) : null}

            <View style={styles.legalWrap}>
              <Text style={styles.legal}>This ID card is issued for essential delivery services only.</Text>
              <Text style={[styles.legal, { color: color.text }]}>Valid on: {validTill}</Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const PHOTO = 120;

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg, padding: space.lg },
  muted: { ...type.body, color: color.textSecondary },
  body: { padding: space.lg },
  card: { width: '100%', maxWidth: 448, alignSelf: 'center', overflow: 'hidden' },
  band: { backgroundColor: color.primary, paddingTop: space.xl, paddingBottom: space.xxxl + PHOTO / 2, paddingHorizontal: space.lg, alignItems: 'center', gap: space.xs },
  brand: { ...type.overline, color: color.textInverse, opacity: 0.85 },
  bandTitle: { ...type.title, color: color.textInverse, textAlign: 'center' },
  content: { alignItems: 'center', paddingHorizontal: space.lg, paddingBottom: space.xxl },
  photoRing: { marginTop: -(PHOTO / 2 + space.xs), padding: space.xs, backgroundColor: color.surface, borderRadius: radii.pill, marginBottom: space.md },
  photo: { width: PHOTO, height: PHOTO, borderRadius: PHOTO / 2, backgroundColor: color.surfaceMuted },
  name: { ...type.title, color: color.text, textAlign: 'center' },
  caption: { ...type.caption, color: color.textMuted, textAlign: 'center' },
  status: { alignSelf: 'center', marginTop: space.md },
  grid: { flexDirection: 'row', alignSelf: 'stretch', gap: space.md, marginTop: space.xl, paddingTop: space.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border },
  cell: { flex: 1, minWidth: 0, alignItems: 'center', gap: space.xxs },
  value: { ...type.bodyStrong, color: color.text, textAlign: 'center' },
  vehicle: { alignSelf: 'stretch', alignItems: 'center', gap: space.xxs, backgroundColor: color.surfaceMuted, padding: space.lg, borderRadius: radii.md, marginTop: space.lg },
  legalWrap: { alignSelf: 'stretch', marginTop: space.xl, paddingTop: space.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border, gap: space.xs },
  legal: { ...type.small, color: color.textMuted, textAlign: 'center' },
});
