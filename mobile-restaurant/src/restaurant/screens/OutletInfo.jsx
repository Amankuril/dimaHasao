import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, MapPin, Pencil, Star } from 'lucide-react-native';
import Img from '../../components/Img';
import { Press } from '../../components/ui';
import { poppins, shadow, tw } from '../../theme';
import BottomNavOrders, { BOTTOM_NAV_HEIGHT } from '../components/BottomNavOrders';
import { useOutletInfo } from '../hooks/pages/useOutletInfo';
import { RT, RT_GRADIENT } from '../theme';

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
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={[styles.header, { paddingTop: 12 + insets.top }]}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Press onPress={goBack} accessibilityLabel="Go back" style={{ padding: 8, borderRadius: 12 }}>
            <ArrowLeft size={20} color={RT.primary} />
          </Press>
          <Text style={styles.title} accessibilityRole="header">Outlet Information</Text>
        </View>
        <LinearGradient colors={RT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.idPill}>
          <Text style={styles.idText}>{`ID: ${shortId}`.toUpperCase()}</Text>
        </LinearGradient>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 96 + BOTTOM_NAV_HEIGHT + insets.bottom }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <View style={styles.banner}>
            <Img source={{ uri: mainImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityLabel="Restaurant banner" />
            <LinearGradient colors={['rgba(0,0,0,0.6)', 'transparent', 'transparent']} start={{ x: 0, y: 1 }} end={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
          </View>

          <View style={{ paddingHorizontal: 16, gap: 16 }}>
            <View style={styles.thumbWrap}>
              <Img source={{ uri: thumbnailImage }} style={{ width: '100%', height: '100%', borderRadius: 26 }} resizeMode="cover" accessibilityLabel="Restaurant thumbnail" />
            </View>

            <View style={{ paddingBottom: 4 }}>
              <Text style={styles.name}>{loading ? 'Loading...' : restaurantName || 'My Restaurant'}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <View style={styles.rating}>
                  <Text style={{ fontSize: 12, lineHeight: 16, color: '#fff', ...poppins(900) }}>{restaurantData?.rating?.toFixed(1) || '0.0'}</Text>
                  <Star size={12} color="#fff" fill="#fff" />
                </View>
                <Text style={styles.reviews}>{`${restaurantData?.totalRatings || 0} Reviews`.toUpperCase()}</Text>
              </View>

              <Press
                onPress={() => navigate('/food/restaurant/edit-owner', { state: { from: location.pathname, activeTab: 'restaurant' } })}
                style={{ marginTop: 16, alignSelf: 'flex-start', ...shadow('lg') }}
              >
                <LinearGradient colors={RT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.edit}>
                  <Pencil size={14} color="#fff" />
                  <Text style={{ fontSize: 12, lineHeight: 16, color: '#fff', ...poppins(700) }}>Edit Outlet Info</Text>
                </LinearGradient>
              </Press>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 32, paddingBottom: 48, gap: 16 }}>
          <LinearGradient colors={['rgba(239,246,255,0.4)', 'rgba(239,246,255,0.8)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.card, { borderColor: 'rgba(219,234,254,0.5)' }]}>
            <View style={styles.captionRow}>
              <LinearGradient colors={RT_GRADIENT} style={styles.dot} />
              <Text style={[styles.caption, { color: RT.primary }]}>RESTAURANT NAME</Text>
            </View>
            <Text style={{ marginTop: 6, fontSize: 18, lineHeight: 28, color: tw.gray900, ...poppins(900) }}>{loading ? 'Loading...' : restaurantName || 'N/A'}</Text>
          </LinearGradient>

          <LinearGradient colors={[tw.gray50, 'rgba(243,244,246,0.5)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.card, { borderColor: 'rgba(229,231,235,0.5)' }]}>
            <View style={styles.captionRow}>
              <View style={[styles.dot, { backgroundColor: tw.gray500 }]} />
              <Text style={[styles.caption, { color: tw.gray500 }]}>LOCATION ADDRESS</Text>
            </View>
            <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <View style={styles.pin}>
                <MapPin size={20} color={RT.primary} />
              </View>
              <Text style={{ flex: 1, fontSize: 15, lineHeight: 20.6, color: tw.gray700, ...poppins(700) }}>{loading ? 'Loading...' : address || 'No address found'}</Text>
            </View>
          </LinearGradient>
        </View>
      </ScrollView>

      <BottomNavOrders activeTabOverride="explore" />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: tw.gray100, paddingHorizontal: 16, paddingBottom: 12, ...shadow('sm') },
  title: { fontSize: 17, lineHeight: 24, letterSpacing: -0.4, color: tw.gray900, ...poppins(700) },
  idPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  idText: { fontSize: 11, lineHeight: 16, letterSpacing: 0.55, color: '#fff', minWidth: 48, ...poppins(900) },
  banner: { width: '100%', height: 180, borderRadius: 32, overflow: 'hidden', backgroundColor: tw.gray100, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  thumbWrap: { marginTop: -48, width: 96, height: 96, borderRadius: 32, backgroundColor: '#fff', padding: 6, ...shadow('2xl') },
  name: { fontSize: 24, lineHeight: 30, color: tw.gray900, ...poppins(900) },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: tw.green600, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  reviews: { fontSize: 12, lineHeight: 16, letterSpacing: 1.2, color: tw.gray400, minWidth: 64, ...poppins(700) },
  edit: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  card: { borderRadius: 24, padding: 20, borderWidth: 1 },
  captionRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  caption: { fontSize: 10, lineHeight: 15, letterSpacing: 1, minWidth: 80, ...poppins(900) },
  pin: { backgroundColor: '#fff', padding: 8, borderRadius: 12, borderWidth: 1, borderColor: tw.gray100, ...shadow('sm') },
});
