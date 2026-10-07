import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, BadgePercent, Bookmark, Clock, MapPin, Star, UtensilsCrossed } from 'lucide-react-native';
import Image from '../../../components/Img';
import Fa from '../../../components/Fa';
import { Press } from '../../../components/ui';
import { StatusBadge } from '../../../components/ds';
import { color, elevation, radii, space, type } from '../../../theme';

/** Dark scrim for text over a photo (primaryDeep, transparent → 85%). */
const SCRIM = ['rgba(6,44,22,0)', 'rgba(6,44,22,0.85)'];
/** Translucent white chips over photos. */
const ON_PHOTO = 'rgba(255,255,255,0.92)';

/** Dark scrim over the bottom of a card photo with "Pre-book table" and the offer. */
export function PreBookOverlay({ offer }) {
  return (
    <LinearGradient colors={SCRIM} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.overlay}>
      <View style={{ paddingHorizontal: space.lg, paddingBottom: space.md }}>
        <Text style={styles.preBook}>Pre-book table</Text>
        <Text style={styles.offer} numberOfLines={1}>
          {offer}
        </Text>
      </View>
    </LinearGradient>
  );
}

/** Top-left "Dish • ₹price" pill on a card photo. */
// `opacity` is accepted for callers; the pill uses one scrim colour.
export function FeaturedPill({ dish, price }) {
  return (
    <View style={styles.featured}>
      <Text style={styles.featuredText} numberOfLines={1}>
        {dish} • ₹{price}
      </Text>
    </View>
  );
}

/** Top-right bookmark button on a card photo (44 px target). */
export function BookmarkButton({ favorite, onPress }) {
  return (
    <Press
      scale={0.9}
      onPress={onPress}
      accessibilityLabel={favorite ? 'Remove bookmark' : 'Add bookmark'}
      accessibilityState={{ selected: Boolean(favorite) }}
      style={styles.bookmark}
    >
      <Bookmark size={20} strokeWidth={2} color={favorite ? color.primary : color.text} fill={favorite ? color.primary : 'none'} />
    </Press>
  );
}

function RatingBadge({ value }) {
  return (
    <View style={styles.rating} accessibilityLabel={`Rated ${value}`}>
      <Star size={14} color={color.gold} fill={color.gold} />
      <Text style={styles.ratingText}>{value}</Text>
    </View>
  );
}

function PhotoPlaceholder() {
  return (
    <View style={[StyleSheet.absoluteFill, styles.placeholder]}>
      <UtensilsCrossed size={32} color={color.textDisabled} />
    </View>
  );
}

/** One restaurant card of the Dining tab. `first` is still accepted (the rating fallback differs). */
export function DiningRestaurantCard({ restaurant, first = false, favorite, onToggleFavorite, onPress }) {
  return (
    <View style={styles.card}>
      <Press scale={0.98} onPress={onPress} accessibilityLabel={restaurant.name}>
        <View style={styles.photo}>
          {restaurant.image ? <Image source={{ uri: restaurant.image }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <PhotoPlaceholder />}
          {restaurant.featuredDish && restaurant.featuredDish !== "Chef's special" && restaurant.featuredPrice > 0 ? (
            <View style={styles.topLeft}>
              <FeaturedPill dish={restaurant.featuredDish} price={restaurant.featuredPrice} />
            </View>
          ) : null}
          <PreBookOverlay offer={restaurant.offer} />
        </View>

        <View style={styles.body}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {restaurant.name}
            </Text>
            <RatingBadge value={first ? restaurant.rating : restaurant.rating || '0'} />
          </View>

          <View style={styles.meta}>
            <View style={styles.metaPart}>
              <Clock size={16} color={color.textMuted} strokeWidth={2} />
              <Text style={styles.metaText}>{restaurant.deliveryTime}</Text>
            </View>
            <Text style={styles.metaDot}>•</Text>
            <View style={[styles.metaPart, { flexShrink: 1 }]}>
              <MapPin size={16} color={color.textMuted} strokeWidth={2} />
              <Text style={[styles.metaText, { flexShrink: 1 }]} numberOfLines={1}>
                {restaurant.distance || 'Distance unavailable'}
              </Text>
            </View>
          </View>

          <View style={[styles.meta, { marginTop: space.sm }]}>
            <StatusBadge label={restaurant.isEnabled ? 'Booking on' : 'Booking off'} tone={restaurant.isEnabled ? 'primary' : 'neutral'} />
            <Text style={styles.preBookLabel}>Pre-book table</Text>
          </View>
        </View>
      </Press>
      {/* A sibling of the card's Press, not a child: no nested buttons on web. */}
      <View style={styles.topRight}>
        <BookmarkButton favorite={favorite} onPress={onToggleFavorite} />
      </View>
    </View>
  );
}

/** Explore pages' restaurant card (static list). */
export function ExploreRestaurantCard({ restaurant, favorite, onToggleFavorite, onPress }) {
  return (
    <View style={styles.card}>
      <Press scale={0.98} onPress={onPress} accessibilityLabel={restaurant.name}>
        <View style={styles.photo}>
          {restaurant.image ? <Image source={{ uri: restaurant.image }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <PhotoPlaceholder />}
          <View style={styles.topLeft}>
            <FeaturedPill dish={restaurant.featuredDish} price={restaurant.featuredPrice} />
          </View>
          <PreBookOverlay offer={restaurant.offer} />
        </View>
        <View style={styles.body}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {restaurant.name}
            </Text>
            <RatingBadge value={restaurant.rating} />
          </View>
          <View style={styles.meta}>
            <View style={styles.metaPart}>
              <Clock size={16} color={color.textMuted} strokeWidth={2} />
              <Text style={styles.metaText}>{restaurant.deliveryTime}</Text>
            </View>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.metaText} numberOfLines={1}>
              {restaurant.distance}
            </Text>
          </View>
          {restaurant.offer ? (
            <View style={[styles.meta, { marginTop: space.sm }]}>
              <BadgePercent size={16} color={color.goldText} strokeWidth={2} />
              <Text style={[styles.metaText, { color: color.goldText, flexShrink: 1 }]} numberOfLines={1}>
                {restaurant.offer}
              </Text>
            </View>
          ) : null}
        </View>
      </Press>
      <View style={styles.topRight}>
        <BookmarkButton favorite={favorite} onPress={onToggleFavorite} />
      </View>
    </View>
  );
}

/** Banner overlay nav of the explore / coffee pages: round back button and the city label. */
export function OverlayNav({ onBack, onLocation, cityName }) {
  return (
    <View style={styles.nav}>
      <Press scale={0.95} onPress={onBack} accessibilityLabel="Go back" style={styles.back}>
        <ArrowLeft size={20} color={color.text} strokeWidth={2.5} />
      </Press>
      <Press scale={0.97} onPress={onLocation} accessibilityLabel={`Location: ${cityName}. Change`} style={styles.locBtn}>
        <Fa name="fa-solid fa-location-dot" size={16} color={color.goldOnDark} />
        <Text style={styles.locText} numberOfLines={1}>
          {cityName}
        </Text>
      </Press>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
    justifyContent: 'flex-end',
  },
  preBook: {
    ...type.overline,
    color: color.goldOnDark,
    marginBottom: space.xxs,
  },
  offer: { ...type.subheading, color: color.textInverse },
  featured: {
    maxWidth: 200,
    paddingHorizontal: space.md,
    paddingVertical: space.xs + 2,
    borderRadius: radii.pill,
    backgroundColor: color.overlay,
  },
  featuredText: { ...type.caption, color: color.textInverse },
  bookmark: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ON_PHOTO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topLeft: { position: 'absolute', top: space.md, left: space.md, right: 72 },
  topRight: { position: 'absolute', top: space.sm, right: space.sm },
  placeholder: {
    backgroundColor: color.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },

  card: {
    borderRadius: radii.lg,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    overflow: 'hidden',
    ...elevation.card,
  },
  photo: {
    aspectRatio: 16 / 9,
    width: '100%',
    overflow: 'hidden',
    backgroundColor: color.surfaceMuted,
  },
  body: { padding: space.lg, gap: space.xs },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
  },
  name: { flex: 1, minWidth: 0, ...type.subheading, color: color.text },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.sm,
    height: 26,
    borderRadius: radii.pill,
    backgroundColor: color.goldSoft,
  },
  ratingText: { ...type.label, color: color.goldText },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  metaPart: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  metaText: { ...type.small, color: color.textSecondary },
  metaDot: { ...type.small, color: color.textDisabled },
  preBookLabel: { ...type.label, color: color.textSecondary },

  nav: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ON_PHOTO,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation.card,
  },
  locBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 44,
    paddingHorizontal: space.md,
    borderRadius: radii.pill,
    backgroundColor: color.overlay,
    flexShrink: 1,
  },
  locText: {
    flexShrink: 1,
    ...type.label,
    color: color.textInverse,
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
  },
});
