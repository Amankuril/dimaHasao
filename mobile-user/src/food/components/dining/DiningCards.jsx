import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, BadgePercent, Bookmark, Clock, MapPin, Star } from 'lucide-react-native';
import Image from '../../../components/Img';
import Fa from '../../../components/Fa';
import { Press } from '../../../components/ui';
import { poppins, shadow, tw } from '../../../theme';

const GREEN = '#0A4D2B';
const GREEN_FADE = 'rgba(10,77,43,0)';

/** The green fade over the bottom 40% of a card photo with "PRE-BOOK TABLE" and the offer. */
export function PreBookOverlay({ offer }) {
  return (
    <LinearGradient colors={[GREEN, GREEN_FADE]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.overlay}>
      <View style={{ paddingLeft: 16, paddingBottom: 16 }}>
        <Text style={styles.preBook}>PRE-BOOK TABLE</Text>
        <View style={styles.rule} />
        <Text style={styles.offer}>{offer}</Text>
      </View>
    </LinearGradient>
  );
}

/** Top-left "Dish • ₹price" pill on a card photo. */
export function FeaturedPill({ dish, price, opacity = 0.8 }) {
  return (
    <View style={[styles.featured, { backgroundColor: `rgba(30,41,57,${opacity})` }]}>
      <Text style={styles.featuredText}>
        {dish} • ₹{price}
      </Text>
    </View>
  );
}

/** Top-right square bookmark button on a card photo. */
export function BookmarkButton({ favorite, onPress }) {
  return (
    <Press scale={0.9} onPress={onPress} accessibilityLabel={favorite ? 'Remove bookmark' : 'Add bookmark'} style={styles.bookmark}>
      <Bookmark size={20} strokeWidth={2} color={favorite ? tw.gray800 : tw.gray600} fill={favorite ? tw.gray800 : 'none'} />
    </Press>
  );
}

function RatingBadge({ value, color, shadowed }) {
  return (
    <View style={[styles.rating, { backgroundColor: color }, shadowed ? shadow('sm') : null]}>
      <Text style={styles.ratingText}>{value}</Text>
      <Star size={12} color="#fff" fill="#fff" />
    </View>
  );
}

/** ON / OFF chip of the dining status (the web's `plum` classes do not exist, so OFF is the plain outline badge). */
function StatusBadge({ enabled }) {
  return (
    <View style={[styles.badge, enabled ? { backgroundColor: tw.green50, borderColor: tw.green200 } : { borderColor: '#E7E4D9' }]}>
      <Text style={[styles.badgeText, { color: enabled ? tw.green700 : '#2B1B0F' }]}>{enabled ? 'ON' : 'OFF'}</Text>
    </View>
  );
}

/**
 * One restaurant card of the Dining tab. The web styles the first two cards
 * slightly differently from the rest (rating colour, meta row, label size).
 */
export function DiningRestaurantCard({ restaurant, first = false, favorite, onToggleFavorite, onPress }) {
  return (
    <Press scale={0.98} onPress={onPress} accessibilityLabel={restaurant.name} style={styles.card}>
      <View style={styles.photo}>
        {restaurant.image ? (
          <Image source={{ uri: restaurant.image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <LinearGradient colors={['#fff5e8', '#fffaf4', '#ffe5d0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        )}
        {restaurant.featuredDish && restaurant.featuredDish !== "Chef's special" && restaurant.featuredPrice > 0 ? (
          <View style={{ position: 'absolute', top: 12, left: 12 }}>
            <FeaturedPill dish={restaurant.featuredDish} price={restaurant.featuredPrice} opacity={first ? 0.9 : 0.8} />
          </View>
        ) : null}
        <View style={{ position: 'absolute', top: 12, right: 12 }}>
          <BookmarkButton favorite={favorite} onPress={onToggleFavorite} />
        </View>
        <PreBookOverlay offer={restaurant.offer} />
      </View>

      <View style={styles.body}>
        <View style={[styles.nameRow, { gap: first ? 8 : 12 }]}>
          <Text style={styles.name} numberOfLines={1}>
            {restaurant.name}
          </Text>
          <RatingBadge value={first ? restaurant.rating : restaurant.rating || '0'} color={first ? tw.green600 : '#267e3e'} shadowed={!first} />
        </View>

        {first ? (
          <View style={[styles.meta, { gap: 4, marginBottom: 8 }]}>
            <Clock size={16} color={tw.gray500} strokeWidth={1.5} />
            <Text style={styles.metaText}>{restaurant.deliveryTime}</Text>
            <Text style={[styles.metaText, { marginHorizontal: 4 }]}>|</Text>
            <Text style={styles.metaText}>{restaurant.distance}</Text>
          </View>
        ) : (
          <View style={[styles.meta, { gap: 6, marginBottom: 10 }]}>
            <View style={styles.metaPart}>
              <Clock size={16} color={tw.gray400} strokeWidth={2} />
              <Text style={styles.metaText}>{restaurant.deliveryTime}</Text>
            </View>
            <Text style={[styles.metaText, { marginHorizontal: 2, color: tw.gray300 }]}>|</Text>
            <View style={[styles.metaPart, { flexShrink: 1 }]}>
              <MapPin size={14} color={tw.gray400} strokeWidth={2} />
              <Text style={[styles.metaText, { flexShrink: 1 }]} numberOfLines={1}>
                {restaurant.distance || 'Distance unavailable'}
              </Text>
            </View>
          </View>
        )}

        <View style={[styles.meta, { gap: 8, marginTop: first ? 4 : 0 }]}>
          <StatusBadge enabled={restaurant.isEnabled} />
          <Text style={first ? styles.preBookLabelFirst : styles.preBookLabel}>Pre-book table</Text>
        </View>
      </View>
    </Press>
  );
}

/** Explore pages' restaurant card (static list). */
export function ExploreRestaurantCard({ restaurant, favorite, onToggleFavorite, onPress }) {
  return (
    <Press scale={0.98} onPress={onPress} accessibilityLabel={restaurant.name} style={styles.exploreCard}>
      <View style={styles.explorePhoto}>
        {restaurant.image ? <Image source={{ uri: restaurant.image }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
        <View style={{ position: 'absolute', top: 12, left: 12 }}>
          <FeaturedPill dish={restaurant.featuredDish} price={restaurant.featuredPrice} />
        </View>
        <View style={{ position: 'absolute', top: 12, right: 12 }}>
          <BookmarkButton favorite={favorite} onPress={onToggleFavorite} />
        </View>
        <PreBookOverlay offer={restaurant.offer} />
      </View>
      <View style={{ padding: 12 }}>
        <View style={[styles.nameRow, { gap: 8 }]}>
          <Text style={styles.name} numberOfLines={1}>
            {restaurant.name}
          </Text>
          <RatingBadge value={restaurant.rating} color={tw.green600} />
        </View>
        <View style={[styles.meta, { gap: 4, marginBottom: 8 }]}>
          <Clock size={16} color={tw.gray500} strokeWidth={1.5} />
          <Text style={styles.metaText}>{restaurant.deliveryTime}</Text>
          <Text style={[styles.metaText, { marginHorizontal: 4 }]}>|</Text>
          <Text style={styles.metaText}>{restaurant.distance}</Text>
        </View>
        {restaurant.offer ? (
          <View style={[styles.meta, { gap: 8 }]}>
            <BadgePercent size={16} color={GREEN} strokeWidth={2} />
            <Text style={styles.exploreOffer}>{restaurant.offer}</Text>
          </View>
        ) : null}
      </View>
    </Press>
  );
}

/** Banner overlay nav of the explore / coffee pages: round back button and the dotted city label. */
export function OverlayNav({ onBack, onLocation, cityName }) {
  return (
    <View style={styles.nav}>
      <Press scale={0.95} onPress={onBack} accessibilityLabel="Go back" style={styles.back}>
        <ArrowLeft size={20} color={tw.gray800} strokeWidth={2.5} />
      </Press>
      <Press scale={0.97} onPress={onLocation} accessibilityLabel={`Location: ${cityName}. Change`} style={styles.locBtn}>
        <Fa name="fa-solid fa-location-dot" size={16} color="#fff" />
        <Text style={styles.locText} numberOfLines={1}>
          {cityName}
        </Text>
      </Press>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '40%', justifyContent: 'flex-end' },
  preBook: { fontSize: 12, lineHeight: 16, letterSpacing: 0.3, color: '#fff', marginBottom: 4, ...poppins(500) },
  rule: { height: 1, width: 96, backgroundColor: 'rgba(255,255,255,0.3)', marginBottom: 8 },
  offer: { fontSize: 16, lineHeight: 24, color: '#fff', ...poppins(700) },
  featured: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  featuredText: { fontSize: 12, lineHeight: 16, color: '#fff', ...poppins(500) },
  bookmark: { width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },

  card: { borderRadius: 22, backgroundColor: '#fff', overflow: 'hidden', ...shadow('md') },
  photo: { height: 176, width: '100%', overflow: 'hidden' },
  body: { paddingHorizontal: 10, paddingBottom: 10, paddingTop: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 },
  name: { flex: 1, fontSize: 18, lineHeight: 28, color: tw.gray900, ...poppins(700) },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  ratingText: { fontSize: 14, lineHeight: 14, color: '#fff', ...poppins(700) },
  meta: { flexDirection: 'row', alignItems: 'center' },
  metaPart: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 14, lineHeight: 20, color: tw.gray500, ...poppins(500) },
  badge: { height: 20, paddingHorizontal: 8, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 10, lineHeight: 14, letterSpacing: 0.5, ...poppins(700) },
  preBookLabelFirst: { fontSize: 13, lineHeight: 20, color: tw.slate700, ...poppins(700) },
  preBookLabel: { fontSize: 14, lineHeight: 20, color: tw.gray600, ...poppins(700) },

  exploreCard: { borderRadius: 16, backgroundColor: '#fff', overflow: 'hidden', ...shadow('md') },
  explorePhoto: { height: 192, width: '100%', overflow: 'hidden', borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  exploreOffer: { fontSize: 14, lineHeight: 20, color: tw.gray700, ...poppins(500) },

  nav: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 12 },
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  locBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, flexShrink: 1 },
  locText: { flexShrink: 1, fontSize: 14, lineHeight: 20, color: '#fff', borderBottomWidth: 2, borderBottomColor: '#fff', borderStyle: 'dotted', ...poppins(600) },
});
