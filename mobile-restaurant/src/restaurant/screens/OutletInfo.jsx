import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Pencil, Star, Store } from 'lucide-react-native';
import { Button, Card, SectionHeader, StatusBadge } from '../../components/ds';
import Img from '../../components/Img';
import { color, elevation, radii, space, type } from '../../theme';
import BottomNavOrders, { BOTTOM_NAV_HEIGHT } from '../components/BottomNavOrders';
import { useOutletInfo } from '../hooks/pages/useOutletInfo';
import { ScreenHeader } from './inventory/partnerKit';

/*
 * Port of Food/pages/restaurant/OutletInfo.jsx (/food/restaurant/outlet-info).
 * The web file also holds a "Rename Outlet" dialog and an image picker, but
 * nothing on the page opens either of them, so they are not built here.
 */
export default function OutletInfo() {
  const insets = useSafeAreaInsets();
  const { navigate, location, goBack, restaurantData, loading, restaurantName, address, mainImage, thumbnailImage, restaurantId, restaurantMongoId } = useOutletInfo();
  const shortId = loading ? '...' : restaurantMongoId && restaurantMongoId.length >= 5 ? restaurantMongoId.slice(-5) : restaurantId || 'N/A';

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <ScreenHeader title="Outlet information" subtitle={`Outlet ID ${shortId}`} onBack={goBack} />

      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.xxl, paddingBottom: space.xxxl + BOTTOM_NAV_HEIGHT + insets.bottom }}>
        <View>
          <View style={styles.banner}>
            <Img source={{ uri: mainImage }} style={styles.fill} resizeMode="cover" accessibilityLabel="Restaurant banner" />
            <LinearGradient colors={[color.overlay, 'transparent']} start={{ x: 0, y: 1 }} end={{ x: 0, y: 0.4 }} style={StyleSheet.absoluteFill} />
          </View>
          <View style={styles.identity}>
            <View style={styles.thumbWrap}>
              <Img source={{ uri: thumbnailImage }} style={[styles.fill, { borderRadius: radii.md }]} resizeMode="cover" accessibilityLabel="Restaurant thumbnail" />
            </View>
          </View>
          <View style={{ marginTop: space.md, gap: space.xs }}>
            <Text style={[type.heading, { color: color.text }]} numberOfLines={2}>{loading ? 'Loading…' : restaurantName || 'My Restaurant'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
              <StatusBadge label={restaurantData?.rating?.toFixed(1) || '0.0'} tone="gold" icon={Star} />
              <Text style={[type.caption, { color: color.textMuted }]}>{restaurantData?.totalRatings || 0} reviews</Text>
            </View>
          </View>
          <Button
            title="Edit outlet info"
            icon={Pencil}
            variant="secondary"
            onPress={() => navigate('/food/restaurant/edit-owner', { state: { from: location.pathname, activeTab: 'restaurant' } })}
            style={{ marginTop: space.lg }}
          />
        </View>

        <View>
          <SectionHeader title="Details" />
          <Card padded={false} style={{ overflow: 'hidden' }}>
            <View style={[styles.row, styles.divider]}>
              <View style={styles.rowIcon}><Store size={18} color={color.primary} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[type.caption, { color: color.textMuted }]}>Restaurant name</Text>
                <Text style={[type.bodyStrong, { color: color.text }]}>{loading ? 'Loading…' : restaurantName || 'N/A'}</Text>
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.rowIcon}><MapPin size={18} color={color.primary} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[type.caption, { color: color.textMuted }]}>Location address</Text>
                <Text style={[type.body, { color: color.text }]}>{loading ? 'Loading…' : address || 'No address found'}</Text>
              </View>
            </View>
          </Card>
        </View>
      </ScrollView>

      <BottomNavOrders activeTabOverride="explore" />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { width: '100%', height: '100%' },
  banner: { width: '100%', aspectRatio: 16 / 9, borderRadius: radii.lg, overflow: 'hidden', backgroundColor: color.surfaceMuted, borderWidth: 1, borderColor: color.border },
  identity: { paddingHorizontal: space.md, marginTop: -space.xxxl - space.lg },
  thumbWrap: { width: 88, height: 88, borderRadius: radii.lg, backgroundColor: color.surface, padding: space.xs, borderWidth: 1, borderColor: color.border, ...elevation.float },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, padding: space.lg },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  rowIcon: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
});
