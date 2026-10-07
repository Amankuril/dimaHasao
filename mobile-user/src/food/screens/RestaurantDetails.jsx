import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Linking, PanResponder, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AlertCircle, ArrowLeft, Bookmark, Check, ChevronDown, Clock, Copy, Flame, Info, Mail, MapPin, MessageCircle, Minus, MoreVertical, Phone, Plus,
  RotateCcw, Search, Send, Share2, SlidersHorizontal, Star, Store, Utensils, X, Zap,
} from 'lucide-react-native';
import Image from '../../components/Img';
import { BottomSheet, Dialog } from '../../components/kit';
import { Press } from '../../components/ui';
import Skeleton from '../../components/Skeleton';
import { useRestaurantDetails } from '../hooks/pages/useRestaurantDetails';
import { getRestaurantAvailabilityStatus } from '../utils/restaurantAvailability';
import { getDefaultFoodVariant, getFoodDisplayPrice, getFoodVariants, hasFoodVariants } from '../utils/foodVariants';
import { ScallopBadge } from '../components/RestaurantCard';
import CartPill from '../components/CartPill';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { Button, StatusBadge } from '../../components/ds';
import { NAV_CLEARANCE } from '../../components/dh/AppBottomNav';
import { color, elevation, radii, space, type } from '../../theme';

const DISH_FALLBACK = require('../../../assets/food/dish_fallback.webp');
const FSSAI_LOGO = require('../../../assets/food/fssai.webp');
const RUPEE = '₹';

function DishImg({ uri, style }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  return <Image source={uri && !failed ? { uri } : DISH_FALLBACK} onError={() => setFailed(true)} style={style} resizeMode="cover" />;
}

function CategoryThumb({ category, size, radius, fontSize }) {
  const [failed, setFailed] = useState(false);
  if (category.image && !failed) {
    return <Image source={{ uri: category.image }} onError={() => setFailed(true)} style={{ width: size, height: size, borderRadius: radius, borderWidth: 1, borderColor: color.border }} />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: color.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ ...type.label, fontFamily: 'Poppins_700Bold', fontSize: Math.max(12, fontSize), lineHeight: Math.max(16, fontSize + 4), color: color.textSecondary }}>{(category.name?.charAt(0) || 'C').toUpperCase()}</Text>
    </View>
  );
}

/** FSSAI veg / non-veg mark: square outline with a filled dot, always in the FSSAI colours. */
function DietMark({ veg, size = 16 }) {
  const c = veg ? color.veg : color.nonVeg;
  return (
    <View accessibilityLabel={veg ? 'Veg' : 'Non-veg'} style={[styles.diet, { width: size, height: size, borderColor: c }]}>
      <View style={{ flex: 1, borderRadius: radii.pill, backgroundColor: c }} />
    </View>
  );
}

function IconButton({ onPress, label, children }) {
  return (
    <Press scale={0.94} onPress={onPress} accessibilityLabel={label} style={styles.roundBtn}>
      {children}
    </Press>
  );
}

function Stepper({ quantity, disabled, onMinus, onPlus, name }) {
  return (
    <View style={[styles.stepper, disabled ? styles.addDisabled : null]}>
      <Press scale={0.9} disabled={disabled} onPress={onMinus} accessibilityLabel={`Remove one ${name}`} hitSlop={6} style={styles.stepperBtn}>
        <Minus size={16} color={disabled ? color.textDisabled : color.onPrimary} strokeWidth={2.75} />
      </Press>
      <Text style={[styles.stepperQty, disabled ? { color: color.textDisabled } : null]} accessibilityLabel={`${quantity} in cart`}>{quantity}</Text>
      <Press scale={0.9} disabled={disabled} onPress={onPlus} accessibilityLabel={`Add one more ${name}`} hitSlop={6} style={styles.stepperBtn}>
        <Plus size={16} color={disabled ? color.textDisabled : color.onPrimary} strokeWidth={2.75} />
      </Press>
    </View>
  );
}

function SheetOption({ active, onPress, children, tone = 'brand', style }) {
  // veg / nonVeg only for the veg and non-veg filters (FSSAI meaning).
  const tones = {
    brand: { borderColor: color.primary, backgroundColor: color.primarySoft },
    veg: { borderColor: color.veg, backgroundColor: color.surface },
    nonVeg: { borderColor: color.nonVeg, backgroundColor: color.surface },
  };
  return (
    <Press scale={0.98} onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked: !!active }} style={[styles.sheetOpt, active ? tones[tone] : null, style]}>
      {children}
    </Press>
  );
}

/** Draggable "Menu" button (web: framer-motion `drag` inside the viewport). */
function FloatingMenuButton({ bottom, onPress }) {
  const { width, height } = useWindowDimensions();
  const size = useRef({ w: 120, h: 48 });
  const pos = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const last = useRef({ x: 0, y: 0 });
  const centred = useRef(false);
  const moved = useRef(false);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 6 || Math.abs(g.dy) > 6,
        onPanResponderGrant: () => {
          moved.current = true;
        },
        onPanResponderMove: (_, g) => {
          const x = Math.max(0, Math.min(width - size.current.w, last.current.x + g.dx));
          const y = Math.max(-(height - size.current.h - bottom - 120), Math.min(0, last.current.y + g.dy));
          pos.setValue({ x, y });
        },
        onPanResponderRelease: () => {
          last.current = { x: pos.x.__getValue(), y: pos.y.__getValue() };
          setTimeout(() => {
            moved.current = false;
          }, 0);
        },
      }),
    [width, height, bottom, pos],
  );

  return (
    <Animated.View
      {...responder.panHandlers}
      onLayout={(e) => {
        size.current = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height };
        if (!centred.current) {
          centred.current = true;
          last.current = { x: (width - size.current.w) / 2, y: 0 };
          pos.setValue(last.current);
        }
      }}
      style={[styles.menuFab, { bottom, transform: pos.getTranslateTransform() }]}
    >
      <Press scale={0.95} onPress={() => !moved.current && onPress()} accessibilityLabel="Open menu categories" style={styles.menuFabBtn}>
        <Utensils size={18} color={color.goldOnDark} />
        <Text style={styles.menuFabText}>Menu</Text>
      </Press>
    </Animated.View>
  );
}

function DetailSkeleton() {
  return (
    <View style={{ flex: 1, backgroundColor: color.bg, padding: space.lg, gap: space.lg }} accessibilityRole="progressbar" accessibilityLabel="Loading restaurant">
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Skeleton style={[styles.sk, { width: 44, height: 44, borderRadius: 22 }]} />
        <Skeleton style={[styles.sk, { width: 120, height: 44, borderRadius: 22 }]} />
      </View>
      <Skeleton style={[styles.sk, { height: 150, borderRadius: radii.lg }]} />
      <Skeleton style={[styles.sk, { height: 44, borderRadius: radii.md }]} />
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ flexDirection: 'row', gap: space.lg }}>
          <View style={{ flex: 1, gap: space.sm }}>
            <Skeleton style={[styles.sk, { height: 18, width: '70%' }]} />
            <Skeleton style={[styles.sk, { height: 14, width: '30%' }]} />
            <Skeleton style={[styles.sk, { height: 14, width: '90%' }]} />
          </View>
          <Skeleton style={[styles.sk, { width: 120, height: 120, borderRadius: radii.lg }]} />
        </View>
      ))}
    </View>
  );
}

const formatTimeLabel = (timeValue) => {
  if (!timeValue) return '';
  const parts = String(timeValue).split(':');
  if (parts.length < 2) return timeValue;
  const hour = parseInt(parts[0], 10);
  const minute = parseInt(parts[1], 10);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return timeValue;
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'pm' : 'am'}`;
};

const ratingCountLabel = (reviews) => {
  const n = reviews || 0;
  if (n === 1) return '1 rating';
  if (n < 100) return `${n} ratings`;
  if (n < 1000) return `${Math.floor(n / 100) * 100}+ ratings`;
  return `${(n / 1000).toFixed(1)}K+ ratings`;
};

/** Port of pages/user/restaurants/RestaurantDetails.jsx (logic: useRestaurantDetails). */
export default function RestaurantDetails() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const s = useRestaurantDetails();
  const {
    slug, goBack, restaurant, restaurantError, loadingRestaurant, loadingOffers, availabilityTick, isOutOfService, showMoreInfo, setShowMoreInfo, showSearch,
    setShowSearch, searchQuery, setSearchQuery, coupons, currentCouponIndex, formatCouponStripText, formatCouponTitle, handleCopyCoupon, filters, setFilters,
    activeFilterCount, vegMode, menuCategories, selectedMenuCategory, setSelectedMenuCategory, filteredSections, hasUserAppliedFilters, loadingMenuItems,
    loadRemaining, expandedSections, setExpandedSections, isRecommendedSection, toRenderableArray, getDishQuantity, getSoleActiveVariant, updateItemQuantity,
    handleItemClick, closeItemDetail, handleBookmarkClick, handleShareClick, isDishFavorite, highlightedDishId, itemCount, showMenuSheet, setShowMenuSheet,
    showFilterSheet, setShowFilterSheet, showLocationSheet, setShowLocationSheet, showManageCollections, setShowManageCollections, showItemDetail,
    selectedItem, selectedVariantId, setSelectedVariantId, getVariantForDish, showMenuOptionsSheet, setShowMenuOptionsSheet, handleAddToCollection,
    handleShareRestaurant, isFavorite, showShareModal, setShowShareModal, sharePayload, handleSystemShareFromModal, openShareTarget, copyShareLink,
    showOffersSheet, setShowOffersSheet, getDishFavorites, getFavorites, removeDishFavorite,
  } = s;

  const scroller = useRef(null);
  const menuTop = useRef(0);
  const sectionTops = useRef({});
  const couponFade = useAnimatedValue(1);
  useEffect(() => {
    couponFade.setValue(0);
    Animated.timing(couponFade, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, [currentCouponIndex, couponFade]);

  if (loadingRestaurant || loadingOffers) return <DetailSkeleton />;

  if (restaurantError && !restaurant) {
    const isNetworkError = restaurantError.includes('Backend server is not connected');
    const isNotFoundError = restaurantError === 'Restaurant not found';
    return (
      <View style={styles.centerPage}>
        <View style={styles.errIcon}>
          <AlertCircle size={28} color={isNetworkError ? color.primary : color.danger} />
        </View>
        <Text style={styles.errTitle} accessibilityRole="header">{isNetworkError ? 'Connection error' : isNotFoundError ? 'Restaurant not found' : 'Error'}</Text>
        <Text style={styles.errBody}>{isNetworkError ? 'Please check your internet connection and try again.' : restaurantError}</Text>
        <Button title="Go back" variant="outline" size="sm" fullWidth={false} onPress={goBack} />
      </View>
    );
  }

  if (!restaurant) {
    return (
      <View style={styles.centerPage}>
        <View style={styles.errIcon}>
          <AlertCircle size={28} color={color.danger} />
        </View>
        <Text style={styles.errTitle} accessibilityRole="header">Restaurant not found</Text>
        <Button title="Go back" variant="outline" size="sm" fullWidth={false} onPress={goBack} style={{ marginTop: space.lg }} />
      </View>
    );
  }

  const availabilityStatus = getRestaurantAvailabilityStatus(restaurant, new Date(availabilityTick));
  const isRestaurantOffline = !availabilityStatus.isOpen;
  const shouldShowGrayscale = isOutOfService || isRestaurantOffline;
  const restaurantKey = restaurant?.restaurantId || restaurant?._id || restaurant?.id;
  const fssaiReg = restaurant?.onboarding?.step3?.fssai?.registrationNumber;

  if (showMoreInfo) {
    const ownerName = restaurant?.ownerName || '';
    const gstNumber = typeof restaurant?.gstNumber === 'string' ? restaurant.gstNumber.trim() : '';
    const fssaiNumber = restaurant?.fssaiNumber || '';
    const phone = restaurant?.phone || '';
    const maskGST = (gst) => (gst.length < 15 ? gst : gst.substring(0, 2) + 'X'.repeat(10) + gst.substring(12));
    const services = ['delivery'];
    if (restaurant?.diningSettings?.isEnabled === true) services.push('dining');
    if (restaurant?.takeawaySettings?.isEnabled === true) services.push('takeaway');
    const provides = services.length === 1 ? 'Provides delivery' : services.length === 2 ? `Provides both ${services[0]} & ${services[1]}` : `Provides ${services[0]}, ${services[1]} & ${services[2]}`;

    return (
      <ScrollView style={{ flex: 1, backgroundColor: color.bg }} contentContainerStyle={{ paddingBottom: NAV_CLEARANCE + space.xxl + insets.bottom }}>
        <View style={{ paddingHorizontal: space.lg, paddingTop: space.md }}>
          <IconButton onPress={() => setShowMoreInfo(false)} label="Back to menu">
            <ArrowLeft size={20} color={color.text} />
          </IconButton>
        </View>
        <View style={{ paddingHorizontal: space.lg, paddingTop: space.md }}>
          <View style={styles.infoCard}>
            <Text style={styles.infoName} accessibilityRole="header">{restaurant?.name || 'Restaurant Name'}</Text>
            <Text style={styles.infoAddress}>{restaurant?.location || ''}</Text>
            {phone ? (
              <View style={styles.infoCall}>
                <Press scale={0.95} onPress={() => Linking.openURL(`tel:${phone}`).catch(() => {})} accessibilityLabel={`Call ${restaurant?.name}`} style={styles.callBtn}>
                  <Phone size={20} color={color.primary} />
                </Press>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoCallTitle}>Contact to restaurant</Text>
                  <Text style={styles.infoCallBody}>Contact restaurant directly for any inquiries, order updates, or support</Text>
                </View>
              </View>
            ) : null}
            <View style={{ paddingTop: space.lg, borderTopWidth: 1, borderTopColor: color.border, gap: space.md }}>
              <View style={styles.infoLine}>
                <Clock size={16} color={color.textMuted} />
                <Text style={styles.infoLineText}>
                  <Text style={{ color: availabilityStatus?.isOpen ? color.success : color.warning, fontFamily: 'Poppins_600SemiBold' }}>{availabilityStatus?.isOpen ? 'Open now' : 'Closed now'}</Text>
                  {availabilityStatus?.isOpen && availabilityStatus?.closingTime ? ` • Closes ${formatTimeLabel(availabilityStatus.closingTime)}` : ''}
                  {!availabilityStatus?.isOpen && availabilityStatus?.openingTime ? ` • Opens at ${formatTimeLabel(availabilityStatus.openingTime)}` : ''}
                </Text>
              </View>
              <View style={styles.infoLine}>
                <Store size={16} color={color.textMuted} />
                <Text style={styles.infoLineText}>{provides}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.infoCard, { marginTop: space.md, gap: space.lg }]}>
            <View style={gstNumber || fssaiNumber ? styles.legalRow : null}>
              <Text style={styles.legalLabel}>Legal name</Text>
              <Text style={styles.legalValue}>{ownerName || 'Not Provided'}</Text>
            </View>
            {gstNumber ? (
              <View style={fssaiNumber ? styles.legalRow : null}>
                <Text style={styles.legalLabel}>GST number</Text>
                <Text style={[styles.legalValue, { letterSpacing: 0.4 }]}>{maskGST(gstNumber)}</Text>
              </View>
            ) : null}
            {fssaiNumber ? (
              <View style={{ paddingTop: 4 }}>
                <Image source={FSSAI_LOGO} style={{ height: 32, width: 64, opacity: 0.8 }} resizeMode="contain" accessibilityLabel="FSSAI" />
                <Text style={styles.fssaiNo}>Lic. No. {fssaiNumber}</Text>
              </View>
            ) : null}
          </View>

          <Button title="Go back to menu" onPress={() => setShowMoreInfo(false)} style={{ marginTop: space.xxl }} />
        </View>
      </ScrollView>
    );
  }

  const toggleExpanded = (key) =>
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const totalDishCount = !loadingMenuItems && restaurant?.menuSections ? restaurant.menuSections.reduce((sum, sec) => sum + (sec.items?.length || 0), 0) : null;
  const restaurantHasDishes = totalDishCount === null ? true : totalDishCount > 0;
  const hasSections = Array.isArray(restaurant?.menuSections) && restaurant.menuSections.length > 0;

  const renderDish = (item, { recommended, isLast, sub }) => {
    const quantity = getDishQuantity(item);
    const isVeg = item.foodType === 'Veg';
    const favorite = isDishFavorite(item.id, restaurantKey);
    const highlighted = highlightedDishId === item.id && (recommended || sub);
    const onMinus = () => {
      const sole = getSoleActiveVariant(item);
      if (hasFoodVariants(item) && !sole) handleItemClick(item);
      else updateItemQuantity(item, Math.max(0, quantity - 1), null, sole);
    };
    const onPlus = () => {
      const sole = getSoleActiveVariant(item);
      if (hasFoodVariants(item) && !sole) handleItemClick(item);
      else updateItemQuantity(item, quantity + 1, null, sole);
    };
    return (
      <View key={item.id} style={[styles.dish, !isLast && !highlighted ? styles.dishBorder : null, highlighted ? styles.dishHighlight : null]}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <View style={{ marginTop: 3 }}>
              <DietMark veg={isVeg} />
            </View>
            <Text style={styles.dishName} numberOfLines={3}>{item.name}</Text>
          </View>
          <View style={{ marginTop: space.xs, gap: space.xxs }}>
            {hasFoodVariants(item) ? <Text style={styles.startingFrom}>Starting from</Text> : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.sm }}>
              <Text style={styles.dishPrice}>
                {RUPEE}
                {Math.round(getFoodDisplayPrice(item))}
              </Text>
              {item.preparationTime && String(item.preparationTime).trim() ? (
                <View style={styles.prep}>
                  <Clock size={12} color={color.textSecondary} />
                  <Text style={styles.prepText}>{String(item.preparationTime).trim()}</Text>
                </View>
              ) : null}
            </View>
          </View>
          {item.description ? <Text style={styles.dishDesc} numberOfLines={2}>{item.description}</Text> : null}
          <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.md }}>
            <Press scale={0.92} onPress={() => handleBookmarkClick(item)} accessibilityLabel={favorite ? `Remove ${item.name} from bookmarks` : `Bookmark ${item.name}`} accessibilityState={{ selected: !!favorite }} style={[styles.miniBtn, favorite ? styles.miniBtnOn : null]} hitSlop={4}>
              <Bookmark size={18} color={favorite ? color.primary : color.textSecondary} fill={favorite ? color.primary : 'none'} />
            </Press>
            <Press scale={0.92} onPress={() => handleShareClick(item)} accessibilityLabel={`Share ${item.name}`} style={styles.miniBtn} hitSlop={4}>
              <Share2 size={18} color={color.textSecondary} />
            </Press>
          </View>
        </View>

        <View style={{ width: 120, height: 136 }}>
          <Press scale={0.98} onPress={() => handleItemClick(item)} accessibilityLabel={`View ${item.name} details`} style={styles.dishImgWrap}>
            <DishImg uri={item.image} style={{ width: '100%', height: '100%' }} />
          </Press>
          <View style={styles.addWrap}>
            {quantity > 0 ? (
              <Stepper quantity={quantity} disabled={shouldShowGrayscale} onMinus={onMinus} onPlus={onPlus} name={item.name} />
            ) : (
              <Press
                scale={0.95}
                disabled={shouldShowGrayscale}
                onPress={() => updateItemQuantity(item, 1, null, getDefaultFoodVariant(item))}
                accessibilityLabel={`Add ${item.name}`}
                style={[styles.add, shouldShowGrayscale ? styles.addDisabled : null]}
              >
                <Text style={[styles.addText, shouldShowGrayscale ? { color: color.textDisabled } : null]}>Add</Text>
                <Plus size={16} color={shouldShowGrayscale ? color.textDisabled : color.primary} strokeWidth={2.75} />
              </Press>
            )}
          </View>
        </View>
      </View>
    );
  };

  let overallItemCount = 0;
  const rawSections = restaurant?.menuSections || [];
  const rawHasAnyDish = rawSections.some(
    (sec) => (Array.isArray(sec?.items) && sec.items.length > 0) || (Array.isArray(sec?.subsections) && sec.subsections.some((sub) => Array.isArray(sub?.items) && sub.items.length > 0)),
  );
  // Above the app nav, and above the cart pill when one shows.
  const fabBottom = (itemCount > 0 ? NAV_CLEARANCE + 76 : NAV_CLEARANCE) + insets.bottom;
  const anyFabBlockingSheet = showFilterSheet || showMenuSheet || showMenuOptionsSheet;

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <View style={{ flex: 1, opacity: shouldShowGrayscale ? 0.75 : 1 }}>
        <View style={styles.topBar}>
          <IconButton onPress={goBack} label="Go back">
            <ArrowLeft size={20} color={color.text} />
          </IconButton>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flex: 1, justifyContent: 'flex-end' }}>
            {!showSearch ? (
              <Press scale={0.96} onPress={() => setShowSearch(true)} accessibilityLabel="Search for dishes" style={styles.searchPill}>
                <Search size={18} color={color.primary} />
                <Text style={styles.searchPillText}>Search</Text>
              </Press>
            ) : (
              <View style={styles.searchBox}>
                <Search size={18} color={color.textMuted} />
                <TextInput
                  autoFocus
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search for dishes"
                  placeholderTextColor={color.textMuted}
                  returnKeyType="search"
                  autoCorrect={false}
                  accessibilityLabel="Search for dishes"
                  onBlur={() => {
                    if (!searchQuery) setShowSearch(false);
                  }}
                  style={styles.searchInput}
                />
                {searchQuery ? (
                  <Press
                    scale={0.9}
                    hitSlop={8}
                    onPress={() => {
                      setSearchQuery('');
                      setShowSearch(false);
                    }}
                    accessibilityLabel="Clear search"
                    style={styles.clearX}
                  >
                    <X size={16} color={color.textSecondary} />
                  </Press>
                ) : null}
              </View>
            )}
            <IconButton onPress={() => setShowMenuOptionsSheet(true)} label="More options">
              <MoreVertical size={20} color={color.text} />
            </IconButton>
          </View>
        </View>

        <ScrollView ref={scroller} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: NAV_CLEARANCE + 140 + insets.bottom }}>
          <View style={{ paddingHorizontal: space.lg, paddingTop: space.sm, gap: space.md }}>
            <View style={styles.summary}>
              <View style={styles.summaryBar} />
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.name} accessibilityRole="header">{restaurant?.name || 'Unknown Restaurant'}</Text>
                  <View style={[styles.rowC, { marginTop: space.xs, gap: space.sm }]}>
                    <Utensils size={16} color={color.textSecondary} />
                    <Text style={[styles.summaryText, { flex: 1 }]} numberOfLines={1}>{restaurant?.topCategory || restaurant?.cuisine || 'Multi-cuisine'}</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={styles.ratingPill}>
                    <Star size={13} color={color.goldText} fill={Number(restaurant?.rating || 0) > 0 ? color.gold : 'none'} strokeWidth={Number(restaurant?.rating || 0) > 0 ? 0 : 2} />
                    <Text style={styles.ratingPillText}>{Number(restaurant?.rating || 0) > 0 ? Number(restaurant.rating).toFixed(1) : 'New'}</Text>
                  </View>
                  <Text style={styles.ratingCount}>
                    {Number(restaurant?.rating || 0) > 0
                      ? restaurant.reviews === 1
                        ? '1 rating'
                        : `${(restaurant.reviews || 0).toLocaleString()}${restaurant.reviews >= 100 ? '+' : ''} ratings`
                      : 'No ratings yet'}
                  </Text>
                </View>
              </View>

              <View style={[styles.rowC, { gap: space.md }]}>
                <Press scale={0.98} onPress={() => setShowLocationSheet(true)} accessibilityLabel="Restaurant address and outlets" style={[styles.rowC, styles.locLink]}>
                  <MapPin size={16} color={color.textSecondary} />
                  <Text style={[styles.summaryText, { flex: 1 }]} numberOfLines={1}>
                    {restaurant?.distance || '1.2 km'} | {restaurant?.location || 'Location'}
                  </Text>
                  <ChevronDown size={16} color={color.primary} />
                </Press>
                {isRestaurantOffline ? <StatusBadge label="Offline" tone="warning" icon={AlertCircle} /> : <StatusBadge label="Open now" tone="success" icon={Clock} />}
              </View>

              <View style={[styles.rowC, { gap: space.sm }]}>
                <Clock size={16} color={color.textSecondary} />
                <Text style={styles.summaryText}>{restaurant?.deliveryTime || '25-30 mins'}</Text>
              </View>
            </View>

            {isRestaurantOffline ? (
              <View style={styles.offlineNote}>
                <Text style={styles.offlineNoteText}>{restaurant?.name || 'This restaurant'} is currently offline. Orders are unavailable right now.</Text>
              </View>
            ) : null}

            {restaurantHasDishes && coupons && coupons.length > 0 ? (
              <Press scale={0.99} onPress={() => setShowOffersSheet(true)} accessibilityLabel={`${coupons.length} offer${coupons.length > 1 ? 's' : ''} available`} style={styles.offerStrip}>
                <View style={[styles.rowC, { flex: 1, gap: space.sm, marginRight: space.md }]}>
                  <ScallopBadge size={24} color={color.goldText} />
                  <Animated.Text numberOfLines={1} style={[styles.offerStripText, { opacity: couponFade }]}>
                    {formatCouponStripText(coupons[currentCouponIndex])}
                  </Animated.Text>
                </View>
                <View style={[styles.rowC, { gap: space.xs }]}>
                  <Text style={styles.offerCount}>
                    {coupons.length} offer{coupons.length > 1 ? 's' : ''}
                  </Text>
                  <ChevronDown size={16} color={color.goldText} />
                </View>
              </Press>
            ) : null}
          </View>

          {hasSections ? (
            <View style={styles.filterBar}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled contentContainerStyle={{ paddingHorizontal: space.lg }}>
                <View style={{ gap: space.sm }}>
                  <View style={[styles.rowC, { gap: space.sm }]}>
                    <Press scale={0.97} onPress={() => setShowFilterSheet(true)} accessibilityLabel={`Filters${activeFilterCount ? `, ${activeFilterCount} active` : ''}`} style={styles.smBtn}>
                      <SlidersHorizontal size={16} color={color.text} />
                      <Text style={styles.smBtnText}>Filters</Text>
                      <ChevronDown size={14} color={color.text} />
                      {activeFilterCount > 0 ? (
                        <View style={styles.filterCount}>
                          <Text style={styles.filterCountText}>{activeFilterCount}</Text>
                        </View>
                      ) : null}
                    </Press>
                    <Press
                      scale={0.97}
                      onPress={() => setFilters((prev) => ({ ...prev, vegNonVeg: prev.vegNonVeg === 'veg' ? null : 'veg' }))}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: filters.vegNonVeg === 'veg' }}
                      accessibilityLabel="Veg only"
                      style={[styles.smBtn, filters.vegNonVeg === 'veg' ? { borderColor: color.veg, borderWidth: 1.5 } : null]}
                    >
                      <DietMark veg size={14} />
                      <Text style={[styles.smBtnText, filters.vegNonVeg === 'veg' ? { color: color.veg } : null]}>Veg</Text>
                      {filters.vegNonVeg === 'veg' ? <X size={14} color={color.textSecondary} /> : null}
                    </Press>
                    {!vegMode ? (
                      <Press
                        scale={0.97}
                        onPress={() => setFilters((prev) => ({ ...prev, vegNonVeg: prev.vegNonVeg === 'non-veg' ? null : 'non-veg' }))}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: filters.vegNonVeg === 'non-veg' }}
                        accessibilityLabel="Non-veg only"
                        style={[styles.smBtn, filters.vegNonVeg === 'non-veg' ? { borderColor: color.nonVeg, borderWidth: 1.5 } : null]}
                      >
                        <DietMark veg={false} size={14} />
                        <Text style={[styles.smBtnText, filters.vegNonVeg === 'non-veg' ? { color: color.nonVeg } : null]}>Non-veg</Text>
                        {filters.vegNonVeg === 'non-veg' ? <X size={14} color={color.textSecondary} /> : null}
                      </Press>
                    ) : null}
                  </View>

                  {menuCategories.length > 0 ? (
                    <View style={[styles.rowC, { gap: space.sm }]}>
                      <Press scale={0.97} onPress={() => setSelectedMenuCategory('all')} accessibilityRole="tab" accessibilityLabel="All" accessibilityState={{ selected: selectedMenuCategory === 'all' }} style={[styles.catChip, selectedMenuCategory === 'all' ? styles.catChipOn : null]}>
                        <Text style={[styles.catChipText, selectedMenuCategory === 'all' ? { color: color.onPrimary } : null]}>All</Text>
                      </Press>
                      {menuCategories.map((category) => {
                        const on = selectedMenuCategory === category.id;
                        return (
                          <Press key={category.id} scale={0.97} onPress={() => setSelectedMenuCategory(category.id)} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={category.name} style={[styles.catChip, on ? styles.catChipOn : null]}>
                            <CategoryThumb category={category} size={26} radius={13} fontSize={12} />
                            <Text style={[styles.catChipText, on ? { color: color.onPrimary } : null]}>{category.name}</Text>
                          </Press>
                        );
                      })}
                    </View>
                  ) : null}
                </View>
              </ScrollView>
            </View>
          ) : null}

          <View
            style={{ paddingHorizontal: space.lg, paddingVertical: space.xxl, gap: space.xxl }}
            onLayout={(e) => {
              menuTop.current = e.nativeEvent.layout.y;
            }}
          >
            {filteredSections.length === 0 && hasUserAppliedFilters ? (
              <View style={styles.noMatch}>
                <Text style={styles.noMatchTitle}>No dishes match the selected filters.</Text>
                <Text style={styles.noMatchBody}>Clear filters or try a different combination.</Text>
              </View>
            ) : null}

            {filteredSections.length === 0 && !hasUserAppliedFilters && !loadingMenuItems ? (
              <View style={styles.emptyMenu}>
                <View style={styles.emptyMenuIcon}>
                  <Utensils size={28} color={color.primary} />
                </View>
                <Text style={styles.emptyMenuTitle}>{vegMode && rawHasAnyDish ? 'No veg dishes available' : 'Menu coming soon'}</Text>
                <Text style={styles.emptyMenuBody}>
                  {vegMode && rawHasAnyDish
                    ? `${restaurant?.name || 'This restaurant'} doesn't have any veg dishes on their menu right now.`
                    : `${restaurant?.name || 'This restaurant'} is still setting up their menu. We'll notify you as soon as their delicious dishes are available!`}
                </Text>
              </View>
            ) : null}

            {filteredSections.map(({ section, originalIndex }, sectionIndex) => {
              const isRecommended = isRecommendedSection(section);
              const sectionItems = toRenderableArray(section?.items);
              const sectionSubsections = toRenderableArray(section?.subsections);
              const totalItemsInThisSection = sectionItems.length + sectionSubsections.reduce((sum, sub) => sum + toRenderableArray(sub?.items).length, 0);
              // Like the web, the first few dishes paint first and the rest follow.
              if (!(overallItemCount < 5) && !loadRemaining) {
                overallItemCount += totalItemsInThisSection;
                return null;
              }
              const isExpanded = expandedSections.has(originalIndex);
              const title =
                (typeof section?.name === 'string' && section.name.trim()) || (typeof section?.title === 'string' && section.title.trim()) || 'Unnamed Section';

              return (
                <View
                  key={sectionIndex}
                  onLayout={(e) => {
                    sectionTops.current[originalIndex] = e.nativeEvent.layout.y;
                  }}
                  style={styles.sectionCard}
                >
                  <Press scale={1} onPress={() => toggleExpanded(originalIndex)} accessibilityRole="button" accessibilityState={{ expanded: isExpanded }} accessibilityLabel={title} style={styles.sectionHead}>
                    <View style={{ flex: 1, gap: space.xxs, minWidth: 0 }}>
                      <Text style={styles.sectionTitle}>{title}</Text>
                      {section.subtitle ? <Text style={styles.sectionSubtitle}>{section.subtitle}</Text> : null}
                    </View>
                    <View style={{ padding: space.xs, transform: [{ rotate: isExpanded ? '0deg' : '-90deg' }] }}>
                      <ChevronDown size={20} color={color.primary} />
                    </View>
                  </Press>

                  {isExpanded && isRecommended && !loadingMenuItems && sectionItems.length === 0 ? (
                    <Text style={styles.noRecommended}>No dish recommended</Text>
                  ) : null}
                  {isExpanded && loadingMenuItems ? (
                    <View style={{ gap: space.md, paddingHorizontal: space.lg, paddingBottom: space.lg }}>
                      <Skeleton style={[styles.sk, { height: 96, borderRadius: radii.md }]} />
                      <Skeleton style={[styles.sk, { height: 96, borderRadius: radii.md }]} />
                    </View>
                  ) : null}

                  {isExpanded && sectionItems.length > 0 ? (
                    <View>
                      {sectionItems.map((item, i) => {
                        const idx = overallItemCount++;
                        if (!(idx < 5 || loadRemaining)) return null;
                        return renderDish(item, { recommended: isRecommended, isLast: i === sectionItems.length - 1, sub: false });
                      })}
                    </View>
                  ) : null}

                  {isExpanded && sectionSubsections.length > 0 ? (
                    <View>
                      {sectionSubsections.map((subsection, subIndex) => {
                        const subsectionKey = `${originalIndex}-${subIndex}`;
                        const isSubsectionExpanded = expandedSections.has(subsectionKey);
                        const subsectionItems = toRenderableArray(subsection?.items);
                        const subTitle = subsection?.name || subsection?.title || 'Subsection';
                        return (
                          <View key={subIndex}>
                            <Press scale={1} onPress={() => toggleExpanded(subsectionKey)} accessibilityRole="button" accessibilityState={{ expanded: isSubsectionExpanded }} accessibilityLabel={subTitle} style={[styles.sectionHead, styles.subHead]}>
                              <Text style={[styles.subTitle, { flex: 1 }]}>{subTitle}</Text>
                              <View style={{ padding: space.xs, transform: [{ rotate: isSubsectionExpanded ? '0deg' : '-90deg' }] }}>
                                <ChevronDown size={18} color={color.textSecondary} />
                              </View>
                            </Press>
                            {isSubsectionExpanded && subsectionItems.length > 0 ? (
                              <View>
                                {subsectionItems.map((item, i) => {
                                  const idx = overallItemCount++;
                                  if (!(idx < 5 || loadRemaining)) return null;
                                  return renderDish(item, { recommended: false, isLast: i === subsectionItems.length - 1, sub: true });
                                })}
                              </View>
                            ) : null}
                          </View>
                        );
                      })}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>

          {fssaiReg ? (
            <View style={styles.fssai}>
              <View style={styles.fssaiLogo}>
                <Image source={FSSAI_LOGO} style={{ width: '100%', height: '100%' }} resizeMode="contain" accessibilityLabel="FSSAI" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fssaiLabel}>License no.</Text>
                <Text style={styles.fssaiValue}>{fssaiReg}</Text>
              </View>
            </View>
          ) : null}
        </ScrollView>
      </View>

      {!anyFabBlockingSheet && filteredSections.length > 0 ? <FloatingMenuButton bottom={fabBottom} onPress={() => setShowMenuSheet(true)} /> : null}
      <CartPill bottomOffset={NAV_CLEARANCE} linkTo="/food/user/cart" />

      {/* Menu categories */}
      <BottomSheet visible={showMenuSheet} onClose={() => setShowMenuSheet(false)} spring={{ stiffness: 400, damping: 30 }} panelStyle={[styles.sheet, { maxHeight: height * 0.85 }]}>
        <View style={styles.sheetHead}>
          <Text style={styles.sheetTitle} accessibilityRole="header">Menu</Text>
        </View>
        <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingHorizontal: space.sm, paddingVertical: space.sm, gap: space.xxs }}>
          {menuCategories.map((category, index) => (
            <Press
              key={index}
              scale={0.99}
              accessibilityLabel={`${category.name}, ${category.count} items`}
              onPress={() => {
                setShowMenuSheet(false);
                setExpandedSections((prev) => new Set(prev).add(category.sectionIndex));
                setTimeout(() => {
                  const y = sectionTops.current[category.sectionIndex];
                  if (y != null) scroller.current?.scrollTo({ y: Math.max(0, menuTop.current + y - 8), animated: true });
                }, 300);
              }}
              style={styles.menuRow}
            >
              <View style={[styles.rowC, { gap: space.md, flex: 1, minWidth: 0 }]}>
                <CategoryThumb category={category} size={40} radius={radii.md} fontSize={14} />
                <Text style={styles.menuRowName} numberOfLines={1}>{category.name}</Text>
              </View>
              <Text style={styles.menuRowCount}>{category.count}</Text>
            </Press>
          ))}
        </ScrollView>
        <View style={[styles.sheetFoot, { paddingBottom: space.lg + insets.bottom }]}>
          <Button title="Close" variant="secondary" icon={X} accessibilityLabel="Close menu" onPress={() => setShowMenuSheet(false)} />
        </View>
      </BottomSheet>

      {/* Filters and sorting */}
      <BottomSheet visible={showFilterSheet} onClose={() => setShowFilterSheet(false)} spring={{ stiffness: 400, damping: 30 }} panelStyle={[styles.sheet, { height: height * 0.8 }]}>
        <View style={styles.sheetHead}>
          <Text style={styles.sheetTitle} accessibilityRole="header">Filters and sorting</Text>
          <Press scale={0.9} onPress={() => setShowFilterSheet(false)} accessibilityLabel="Close filters" style={styles.closeBtn}>
            <X size={20} color={color.text} />
          </Press>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: space.lg, paddingVertical: space.lg, gap: space.xl }}>
          <View style={{ gap: space.sm }}>
            <Text style={styles.filterHeading}>Sort by</Text>
            <View style={{ gap: space.sm }}>
              <SheetOption active={filters.sortBy === 'low-to-high'} onPress={() => setFilters((prev) => ({ ...prev, sortBy: prev.sortBy === 'low-to-high' ? null : 'low-to-high' }))}>
                <Text style={[styles.sheetOptText, filters.sortBy === 'low-to-high' ? styles.sheetOptTextOn : null]}>Price - low to high</Text>
              </SheetOption>
              <SheetOption active={filters.sortBy === 'high-to-low'} onPress={() => setFilters((prev) => ({ ...prev, sortBy: prev.sortBy === 'high-to-low' ? null : 'high-to-low' }))}>
                <Text style={[styles.sheetOptText, filters.sortBy === 'high-to-low' ? styles.sheetOptTextOn : null]}>Price - high to low</Text>
              </SheetOption>
            </View>
          </View>
          <View style={{ gap: space.sm }}>
            <Text style={styles.filterHeading}>Veg / non-veg preference</Text>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <SheetOption tone="veg" style={{ flex: 1 }} active={filters.vegNonVeg === 'veg'} onPress={() => setFilters((prev) => ({ ...prev, vegNonVeg: prev.vegNonVeg === 'veg' ? null : 'veg' }))}>
                <DietMark veg />
                <Text style={[styles.sheetOptText, filters.vegNonVeg === 'veg' ? { color: color.veg, fontFamily: 'Poppins_600SemiBold' } : null]}>Veg</Text>
              </SheetOption>
              {!vegMode ? (
                <SheetOption tone="nonVeg" style={{ flex: 1 }} active={filters.vegNonVeg === 'non-veg'} onPress={() => setFilters((prev) => ({ ...prev, vegNonVeg: prev.vegNonVeg === 'non-veg' ? null : 'non-veg' }))}>
                  <DietMark veg={false} />
                  <Text style={[styles.sheetOptText, filters.vegNonVeg === 'non-veg' ? { color: color.nonVeg, fontFamily: 'Poppins_600SemiBold' } : null]}>Non-veg</Text>
                </SheetOption>
              ) : null}
            </View>
          </View>
          <View style={{ gap: space.sm }}>
            <Text style={styles.filterHeading}>Top picks</Text>
            <SheetOption tone="brand" active={filters.highlyReordered} onPress={() => setFilters((prev) => ({ ...prev, highlyReordered: !prev.highlyReordered }))}>
              <RotateCcw size={16} color={filters.highlyReordered ? color.primary : color.textSecondary} />
              <Text style={[styles.sheetOptText, filters.highlyReordered ? styles.sheetOptTextOn : null]}>Highly reordered</Text>
            </SheetOption>
          </View>
          <View style={{ gap: space.sm }}>
            <Text style={styles.filterHeading}>Dietary preference</Text>
            <SheetOption tone="brand" active={filters.spicy} onPress={() => setFilters((prev) => ({ ...prev, spicy: !prev.spicy }))}>
              <Flame size={16} color={filters.spicy ? color.primary : color.textSecondary} />
              <Text style={[styles.sheetOptText, filters.spicy ? styles.sheetOptTextOn : null]}>Spicy</Text>
            </SheetOption>
          </View>
        </ScrollView>
        <View style={[styles.sheetFoot, styles.rowC, { gap: space.md, paddingBottom: space.lg + insets.bottom }]}>
          <Button title="Clear all" variant="outline" accessibilityLabel="Clear all filters" onPress={() => setFilters({ sortBy: null, vegNonVeg: null, highlyReordered: false, spicy: false })} style={{ flex: 1 }} />
          <Button title={`Apply${activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}`} accessibilityLabel="Apply filters" onPress={() => setShowFilterSheet(false)} style={{ flex: 1 }} />
        </View>
      </BottomSheet>

      {/* Address / outlets */}
      <Dialog visible={showLocationSheet} onClose={() => setShowLocationSheet(false)} backdrop={color.overlay} panelStyle={[styles.locDialog, { maxHeight: height * 0.8 }]}>
        <View style={styles.locHead}>
          <Text style={[styles.sheetTitle, { flex: 1 }]} accessibilityRole="header">{restaurant?.name || 'Unknown Restaurant'}</Text>
          <Press scale={0.9} onPress={() => setShowLocationSheet(false)} accessibilityLabel="Close" style={styles.closeBtn}>
            <X size={20} color={color.text} />
          </Press>
        </View>
        <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.lg }}>
          {Array.isArray(restaurant?.outlets) && restaurant.outlets.length > 0 ? (
            <View style={{ gap: space.sm }}>
              {restaurant.outlets.map((outlet, i) => (
                <View key={outlet?.id || i} style={styles.outlet}>
                  {outlet?.isNearest ? (
                    <View style={styles.nearest}>
                      <Zap size={14} color={color.goldText} fill={color.gold} />
                      <Text style={styles.nearestText}>Nearest available outlet</Text>
                    </View>
                  ) : null}
                  <Text style={styles.outletName}>{outlet?.location || 'Location'}</Text>
                  <View style={[styles.rowC, { justifyContent: 'space-between', gap: space.lg }]}>
                    <View style={[styles.rowC, { gap: space.md, flexShrink: 1, flexWrap: 'wrap' }]}>
                      <View style={[styles.rowC, { gap: space.xs }]}>
                        <Clock size={14} color={color.textSecondary} />
                        <Text style={styles.outletMeta}>{outlet?.deliveryTime || '25-30 mins'}</Text>
                      </View>
                      <View style={[styles.rowC, { gap: space.xs }]}>
                        <MapPin size={14} color={color.textSecondary} />
                        <Text style={styles.outletMeta}>{outlet?.distance || '1.2 km'}</Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: space.xxs }}>
                      <View style={[styles.rowC, { gap: space.xs }]}>
                        <Star size={14} color={color.goldText} fill={color.gold} strokeWidth={0} />
                        <Text style={[styles.outletMeta, { color: color.goldText, fontFamily: 'Poppins_600SemiBold' }]}>{outlet?.rating ? outlet.rating : 'New'}</Text>
                      </View>
                      <Text style={[styles.outletMeta, { color: color.textMuted }]}>{ratingCountLabel(outlet?.reviews)}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={{ paddingTop: space.xs, paddingBottom: space.md }}>
              <Text style={styles.addrLabel}>Restaurant address</Text>
              <View style={styles.addrBox}>
                <MapPin size={16} color={color.primary} style={{ marginTop: 2 }} />
                <Text style={styles.addrText}>{restaurant?.location || 'Address not available'}</Text>
              </View>
            </View>
          )}
        </ScrollView>
      </Dialog>

      {/* Manage collections */}
      <BottomSheet visible={showManageCollections} onClose={() => setShowManageCollections(false)} spring={{ stiffness: 400, damping: 30 }} panelStyle={styles.sheet}>
        <View style={styles.sheetHead}>
          <Text style={styles.sheetTitle} accessibilityRole="header">Manage collections</Text>
          <Press scale={0.9} onPress={() => setShowManageCollections(false)} accessibilityLabel="Close" style={styles.closeBtn}>
            <X size={20} color={color.text} />
          </Press>
        </View>
        <View style={{ padding: space.lg, gap: space.sm }}>
          <View style={styles.collRow}>
            <View style={styles.collIcon}>
              <Bookmark size={22} color={color.primary} fill={color.primary} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={[styles.rowC, { justifyContent: 'space-between', gap: space.md }]}>
                <Text style={styles.collName}>Bookmarks</Text>
                <Press
                  scale={0.9}
                  hitSlop={12}
                  disabled={!selectedItem}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: true }}
                  accessibilityLabel="Bookmarked. Untick to remove"
                  onPress={() => {
                    removeDishFavorite(selectedItem.id, restaurantKey);
                    setShowManageCollections(false);
                  }}
                  style={[styles.check, selectedItem ? null : { opacity: 0.6 }]}
                >
                  <Check size={14} color={color.onPrimary} strokeWidth={3} />
                </Press>
              </View>
              <Text style={styles.collCount}>
                {getDishFavorites().length} dishes • {getFavorites().length} restaurant
              </Text>
            </View>
          </View>
          <Press scale={0.98} onPress={() => setShowManageCollections(false)} accessibilityLabel="Create new Collection" style={styles.collRow}>
            <View style={[styles.collIcon, { backgroundColor: color.surfaceMuted }]}>
              <Plus size={22} color={color.primary} />
            </View>
            <Text style={[styles.collName, { flex: 1 }]}>Create new collection</Text>
          </Press>
        </View>
        <View style={[styles.sheetFoot, { paddingBottom: space.lg + insets.bottom }]}>
          <Button title="Done" variant="secondary" onPress={() => setShowManageCollections(false)} />
        </View>
      </BottomSheet>

      {/* Dish detail */}
      <Dialog visible={!!(showItemDetail && selectedItem)} onClose={closeItemDetail} backdrop={color.overlay} panelStyle={[styles.itemDialog, { maxHeight: height * 0.9 }]}>
        {selectedItem ? (
          <>
            <View style={{ height: 240, backgroundColor: color.surfaceMuted }}>
              <DishImg uri={selectedItem.displayImage || selectedItem.image} style={{ width: '100%', height: '100%' }} />
              <Press scale={0.9} onPress={closeItemDetail} accessibilityLabel="Close" style={styles.itemClose}>
                <X size={20} color={color.textInverse} />
              </Press>
            </View>
            <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ padding: space.lg }}>
              <View style={[styles.rowC, { gap: space.sm, marginBottom: space.md, alignItems: 'flex-start' }]}>
                <View style={{ marginTop: 5 }}>
                  <DietMark veg={selectedItem.foodType === 'Veg'} size={18} />
                </View>
                <Text style={styles.itemName} accessibilityRole="header">{selectedItem.name}</Text>
              </View>
              {selectedItem.description ? <Text style={styles.itemDesc}>{selectedItem.description}</Text> : null}
              {selectedItem.notEligibleForCoupons ? <StatusBadge label="Not eligible for coupons" tone="neutral" style={{ marginBottom: space.lg }} /> : null}
              {hasFoodVariants(selectedItem) ? (
                <View style={{ marginBottom: space.lg }}>
                  <Text style={styles.variantTitle}>Choose a variant</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                    {getFoodVariants(selectedItem).map((variant) => {
                      const on = String(selectedVariantId || '') === String(variant.id);
                      return (
                        <Press key={variant.id} scale={0.97} onPress={() => setSelectedVariantId(variant.id)} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={`${variant.name}, ${RUPEE}${Math.round(variant.price)}`} style={[styles.variant, on ? styles.variantOn : null]}>
                          <Text style={[styles.variantText, on ? { color: color.onPrimary } : null]}>
                            {variant.name} · {RUPEE}
                            {Math.round(variant.price)}
                          </Text>
                        </Press>
                      );
                    })}
                  </View>
                </View>
              ) : null}
            </ScrollView>
            {(() => {
              const qty = getDishQuantity(selectedItem, selectedVariantId);
              const shown = Math.max(1, qty);
              const variant = getVariantForDish(selectedItem, selectedVariantId);
              return (
                <View style={styles.itemFoot}>
                  <View style={[styles.itemQty, shouldShowGrayscale ? { opacity: 0.5 } : null]}>
                    <Press scale={0.9} disabled={qty === 0 || shouldShowGrayscale} onPress={() => updateItemQuantity(selectedItem, shown - 1, null, variant)} accessibilityLabel="Decrease quantity" style={styles.itemQtyBtn}>
                      <Minus size={20} color={qty === 0 || shouldShowGrayscale ? color.textDisabled : color.primary} />
                    </Press>
                    <Text style={[styles.itemQtyText, shouldShowGrayscale ? { color: color.textDisabled } : null]}>{shown}</Text>
                    <Press scale={0.9} disabled={shouldShowGrayscale} onPress={() => updateItemQuantity(selectedItem, shown + 1, null, variant)} accessibilityLabel="Increase quantity" style={styles.itemQtyBtn}>
                      <Plus size={20} color={shouldShowGrayscale ? color.textDisabled : color.primary} />
                    </Press>
                  </View>
                  <Press
                    scale={0.98}
                    disabled={shouldShowGrayscale}
                    onPress={() => {
                      updateItemQuantity(selectedItem, shown, null, variant);
                      closeItemDetail();
                    }}
                    accessibilityLabel={qty > 0 ? 'Update cart' : 'Add item'}
                    accessibilityState={{ disabled: shouldShowGrayscale }}
                    style={[styles.itemAdd, shouldShowGrayscale ? { backgroundColor: color.surfaceMuted } : null]}
                  >
                    <Text style={[styles.itemAddText, shouldShowGrayscale ? { color: color.textMuted } : null]} numberOfLines={1}>
                      {qty > 0 ? 'Update cart' : hasFoodVariants(selectedItem) ? 'Add' : 'Add item'}
                    </Text>
                    <Text style={[styles.itemAddText, { fontFamily: 'Poppins_700Bold' }, shouldShowGrayscale ? { color: color.textMuted } : null]} numberOfLines={1}>
                      {hasFoodVariants(selectedItem) ? `${variant?.name || 'Default'} · ${RUPEE}${Math.round(variant?.price || selectedItem.price)}` : `${RUPEE}${Math.round(selectedItem.price)}`}
                    </Text>
                  </Press>
                </View>
              );
            })()}
          </>
        ) : null}
      </Dialog>

      {/* Restaurant options */}
      <BottomSheet visible={showMenuOptionsSheet} onClose={() => setShowMenuOptionsSheet(false)} spring={{ stiffness: 400, damping: 30 }} panelStyle={[styles.sheet, { maxHeight: height * 0.7 }]}>
        <View style={styles.sheetHead}>
          <Text style={[styles.sheetTitle, { flex: 1 }]} accessibilityRole="header" numberOfLines={2}>{restaurant?.name || 'Unknown Restaurant'}</Text>
        </View>
        <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ padding: space.sm }}>
          <Press scale={0.99} onPress={handleAddToCollection} accessibilityRole="button" style={styles.optRow}>
            <Bookmark size={20} color={color.primary} />
            <Text style={styles.optText}>{isFavorite(restaurant?.slug || slug || '') ? 'Remove from Collection' : 'Add to Collection'}</Text>
          </Press>
          <Press scale={0.99} onPress={handleShareRestaurant} accessibilityRole="button" style={styles.optRow}>
            <Share2 size={20} color={color.primary} />
            <Text style={styles.optText}>Share this restaurant</Text>
          </Press>
          <Press
            scale={0.99}
            onPress={() => {
              setShowMenuOptionsSheet(false);
              setShowMoreInfo(true);
            }}
            accessibilityRole="button"
            style={styles.optRow}
          >
            <Info size={20} color={color.primary} />
            <Text style={styles.optText}>See more about this restaurant</Text>
          </Press>
          <Text style={styles.disclaimer}>
            Menu items, prices, photos and descriptions are set directly by the restaurant. In case you see any incorrect information, please report it to us.
          </Text>
          {fssaiReg ? (
            <View style={styles.optFssai}>
              <View style={styles.optFssaiLogo}>
                <Image source={FSSAI_LOGO} style={{ width: '100%', height: '100%' }} resizeMode="contain" accessibilityLabel="FSSAI" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optFssaiLabel}>Lic. no.</Text>
                <Text style={styles.optFssaiValue}>{fssaiReg}</Text>
              </View>
            </View>
          ) : null}
        </ScrollView>
        <View style={{ alignItems: 'center', paddingTop: space.sm, paddingBottom: space.sm + insets.bottom }}>
          <View style={{ width: 48, height: 4, borderRadius: 2, backgroundColor: color.borderStrong }} />
        </View>
      </BottomSheet>

      {/* Share */}
      <Dialog visible={!!(showShareModal && sharePayload)} onClose={() => setShowShareModal(false)} backdrop={color.overlay} panelStyle={styles.shareDialog}>
        <View style={styles.shareHead}>
          <Text style={[styles.sheetTitle, { flex: 1 }]} accessibilityRole="header">Share</Text>
          <Press scale={0.9} onPress={() => setShowShareModal(false)} accessibilityLabel="Close share modal" style={styles.closeBtn}>
            <X size={20} color={color.text} />
          </Press>
        </View>
        <View style={{ padding: space.lg, gap: space.sm }}>
          {[
            { key: 'system', label: 'Share via system apps', Icon: Share2, onPress: handleSystemShareFromModal },
            { key: 'whatsapp', label: 'WhatsApp', Icon: MessageCircle, onPress: () => openShareTarget('whatsapp') },
            { key: 'telegram', label: 'Telegram', Icon: Send, onPress: () => openShareTarget('telegram') },
            { key: 'email', label: 'Email', Icon: Mail, onPress: () => openShareTarget('email') },
            { key: 'copy', label: 'Copy link', Icon: Copy, onPress: copyShareLink },
          ].map(({ key, label, Icon, onPress }) => (
            <Press key={key} scale={0.99} onPress={onPress} accessibilityLabel={label} style={styles.shareRow}>
              <Icon size={20} color={color.primary} />
              <Text style={styles.shareRowText}>{label}</Text>
            </Press>
          ))}
        </View>
      </Dialog>

      {/* Offers */}
      <BottomSheet visible={showOffersSheet} onClose={() => setShowOffersSheet(false)} backdrop={color.overlay} panelStyle={[styles.sheet, { maxHeight: height * 0.8 }]}>
        <View style={styles.sheetHead}>
          <Text style={[styles.sheetTitle, { flex: 1 }]} accessibilityRole="header">Offers at {restaurant?.name || 'this restaurant'}</Text>
          <Press scale={0.9} onPress={() => setShowOffersSheet(false)} accessibilityLabel="Close coupons" style={styles.closeBtn}>
            <X size={20} color={color.text} />
          </Press>
        </View>
        <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl + insets.bottom, gap: space.md }}>
          <Text style={styles.addrLabel}>Restaurant coupons</Text>
          {coupons.map((coupon, idx) => (
            <View key={coupon.couponCode || idx} style={styles.coupon}>
              <ScallopBadge size={40} color={color.goldText} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.couponTitle}>{formatCouponTitle(coupon)}</Text>
                <Text style={styles.couponCode}>
                  Use code <Text style={{ color: color.text, fontFamily: 'Poppins_600SemiBold' }}>{coupon.couponCode}</Text>
                </Text>
                <View style={{ flexDirection: 'row', marginTop: space.md }}>
                  <Press scale={0.96} onPress={() => handleCopyCoupon(coupon.couponCode)} accessibilityLabel={`Copy coupon code ${coupon.couponCode}`} style={styles.copyBox}>
                    <Text style={styles.copyBoxText}>{coupon.couponCode}</Text>
                    <Copy size={14} color={color.primary} />
                  </Press>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  rowC: { flexDirection: 'row', alignItems: 'center' },
  sk: { backgroundColor: color.surfaceMuted, borderRadius: radii.sm },
  centerPage: { flex: 1, backgroundColor: color.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xxl },
  errIcon: { width: 60, height: 60, borderRadius: radii.lg, backgroundColor: color.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  errTitle: { ...type.subheading, color: color.text, marginTop: space.lg, marginBottom: space.xs, textAlign: 'center' },
  errBody: { ...type.small, color: color.textSecondary, textAlign: 'center', marginBottom: space.lg },

  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.sm, backgroundColor: color.bg },
  roundBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center', ...elevation.card },
  searchPill: { height: 44, paddingHorizontal: space.lg, borderRadius: 22, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface, flexDirection: 'row', alignItems: 'center', gap: space.sm, ...elevation.card },
  searchPillText: { ...type.label, color: color.text },
  searchBox: { flex: 1, height: 44, borderRadius: 22, borderWidth: 1, borderColor: color.primary, backgroundColor: color.surface, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingLeft: space.md, paddingRight: space.xs },
  searchInput: { flex: 1, minWidth: 0, height: '100%', paddingVertical: 0, ...type.body, color: color.text, outlineWidth: 0 },
  clearX: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  summary: { borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface, padding: space.lg, paddingTop: space.lg + 4, gap: space.md, overflow: 'hidden', ...elevation.card },
  summaryBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: color.gold },
  name: { ...type.heading, fontSize: 20, lineHeight: 28, color: color.text },
  summaryText: { ...type.small, color: color.textSecondary },
  locLink: { flex: 1, gap: space.xs + 2, minWidth: 0, minHeight: 44 },
  ratingPill: { flexDirection: 'row', alignItems: 'center', gap: space.xs, height: 28, borderRadius: radii.pill, paddingHorizontal: space.sm + 2, backgroundColor: color.goldSoft, borderWidth: 1, borderColor: color.border },
  ratingPillText: { ...type.label, color: color.goldText },
  ratingCount: { marginTop: space.xs, ...type.caption, color: color.textMuted, textAlign: 'right' },
  offlineNote: { borderRadius: radii.md, borderWidth: 1, borderColor: color.warningSoft, backgroundColor: color.warningSoft, paddingHorizontal: space.md, paddingVertical: space.sm + 2 },
  offlineNoteText: { ...type.small, color: color.warning },
  offerStrip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, borderWidth: 1, borderColor: color.border, backgroundColor: color.goldSoft, paddingHorizontal: space.md + 2, paddingVertical: space.sm + 2, borderRadius: radii.md },
  offerStripText: { flex: 1, ...type.label, color: color.text },
  offerCount: { ...type.caption, fontFamily: 'Poppins_600SemiBold', color: color.goldText },

  filterBar: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: color.border, paddingVertical: space.md, marginTop: space.lg, backgroundColor: color.surface },
  smBtn: { height: 40, paddingHorizontal: space.md + 2, borderRadius: radii.pill, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface, flexDirection: 'row', alignItems: 'center', gap: space.xs + 2 },
  smBtnText: { ...type.label, color: color.text },
  filterCount: { position: 'absolute', top: -6, right: -6, minWidth: 20, height: 20, paddingHorizontal: 4, borderRadius: 10, backgroundColor: color.primary, alignItems: 'center', justifyContent: 'center' },
  filterCountText: { ...type.caption, lineHeight: 14, fontFamily: 'Poppins_700Bold', color: color.onPrimary },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: space.sm, height: 40, borderRadius: radii.pill, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface, paddingLeft: space.xs + 2, paddingRight: space.md + 2, minWidth: 48, justifyContent: 'center' },
  catChipOn: { borderColor: color.primary, backgroundColor: color.primary },
  catChipText: { ...type.label, color: color.text },

  noMatch: { borderRadius: radii.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: color.borderStrong, backgroundColor: color.surface, paddingHorizontal: space.xl, paddingVertical: space.xxxl, alignItems: 'center' },
  noMatchTitle: { ...type.bodyStrong, color: color.text, textAlign: 'center' },
  noMatchBody: { ...type.small, color: color.textMuted, textAlign: 'center', marginTop: space.sm },
  emptyMenu: { alignItems: 'center', paddingVertical: space.xxxl * 2, paddingHorizontal: space.lg },
  emptyMenuIcon: { width: 60, height: 60, borderRadius: radii.lg, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
  emptyMenuTitle: { ...type.subheading, color: color.text, marginBottom: space.xs, textAlign: 'center' },
  emptyMenuBody: { ...type.small, color: color.textMuted, textAlign: 'center', maxWidth: 320 },

  sectionCard: { backgroundColor: color.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, overflow: 'hidden', ...elevation.card },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, minHeight: 56, paddingHorizontal: space.lg, paddingVertical: space.md },
  sectionTitle: { ...type.sectionSerif, color: color.primary },
  sectionSubtitle: { ...type.small, color: color.textMuted },
  subHead: { borderTopWidth: 1, borderTopColor: color.border, minHeight: 48, backgroundColor: color.bg },
  subTitle: { ...type.bodyStrong, color: color.text },
  noRecommended: { ...type.small, color: color.textMuted, textAlign: 'center', paddingVertical: space.xxl },

  dish: { flexDirection: 'row', gap: space.lg, padding: space.lg, borderTopWidth: 1, borderTopColor: color.border },
  dishBorder: {},
  dishHighlight: { backgroundColor: color.goldSoft, borderWidth: 2, borderColor: color.gold, borderRadius: radii.md, margin: space.xs },
  diet: { borderWidth: 1.5, borderRadius: 3, padding: 2, backgroundColor: color.surface },
  dishName: { flex: 1, ...type.subheading, color: color.text },
  startingFrom: { ...type.caption, color: color.textMuted },
  dishPrice: { ...type.bodyStrong, fontSize: 15, color: color.text },
  prep: { flexDirection: 'row', alignItems: 'center', gap: space.xs, backgroundColor: color.surfaceMuted, paddingHorizontal: space.sm, height: 24, borderRadius: radii.pill },
  prepText: { ...type.caption, color: color.textSecondary },
  dishDesc: { ...type.small, color: color.textMuted, marginTop: space.xs },
  miniBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: color.border, borderRadius: radii.md, backgroundColor: color.surface },
  miniBtnOn: { borderColor: color.primaryBorder, backgroundColor: color.primarySoft },
  dishImgWrap: { width: 120, height: 120, borderRadius: radii.md, overflow: 'hidden', backgroundColor: color.surfaceMuted },
  addWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center' },
  add: { minWidth: 96, height: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs, backgroundColor: color.surface, borderWidth: 1.5, borderColor: color.primary, paddingHorizontal: space.lg, borderRadius: radii.md, ...elevation.card },
  addText: { ...type.button, color: color.primary },
  addDisabled: { backgroundColor: color.surfaceMuted, borderColor: color.border, opacity: 0.7 },
  stepper: { minWidth: 104, height: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: color.primary, borderWidth: 1.5, borderColor: color.primary, borderRadius: radii.md, ...elevation.card },
  stepperBtn: { width: 34, height: '100%', alignItems: 'center', justifyContent: 'center' },
  stepperQty: { minWidth: 20, textAlign: 'center', ...type.button, color: color.onPrimary },

  fssai: { flexDirection: 'row', alignItems: 'center', gap: space.lg, marginHorizontal: space.lg, padding: space.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: color.borderStrong, borderRadius: radii.md, backgroundColor: color.surface },
  fssaiLogo: { width: 80, height: 48, backgroundColor: color.surface, borderRadius: radii.sm, padding: 6, borderWidth: 1, borderColor: color.border },
  fssaiLabel: { ...type.overline, color: color.textMuted, marginBottom: space.xxs },
  fssaiValue: { ...type.bodyStrong, color: color.textSecondary, letterSpacing: 0.35 },

  menuFab: { position: 'absolute', left: 0, zIndex: 40 },
  menuFabBtn: { flexDirection: 'row', alignItems: 'center', gap: space.sm, height: 48, backgroundColor: color.primaryDeep, borderWidth: 1, borderColor: color.gold, paddingHorizontal: space.xl, borderRadius: radii.pill, ...elevation.float },
  menuFabText: { ...type.button, color: color.textInverse },

  sheet: { backgroundColor: color.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, overflow: 'hidden' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, minHeight: 60, paddingLeft: space.lg, paddingRight: space.sm, paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: color.border },
  sheetTitle: { ...type.heading, color: color.text },
  closeBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  sheetFoot: { borderTopWidth: 1, borderTopColor: color.border, paddingHorizontal: space.lg, paddingTop: space.lg, backgroundColor: color.surface },
  menuRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 56, paddingVertical: space.sm, paddingHorizontal: space.sm, borderRadius: radii.md, gap: space.md },
  menuRowName: { flexShrink: 1, ...type.body, fontFamily: 'Poppins_500Medium', color: color.text },
  menuRowCount: { ...type.small, color: color.textMuted },
  filterHeading: { ...type.subheading, color: color.text },
  sheetOpt: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 48, paddingHorizontal: space.lg, paddingVertical: space.sm, borderRadius: radii.md, borderWidth: 1.5, borderColor: color.border, backgroundColor: color.surface },
  sheetOptText: { ...type.body, color: color.text },
  sheetOptTextOn: { color: color.primary, fontFamily: 'Poppins_600SemiBold' },

  locDialog: { width: '90%', maxWidth: 384, backgroundColor: color.surface, borderRadius: radii.lg, overflow: 'hidden', ...elevation.sheet },
  locHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingLeft: space.lg, paddingRight: space.sm, paddingTop: space.sm, paddingBottom: space.sm },
  outlet: { padding: space.md, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface },
  nearest: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: space.xs + 2, marginBottom: space.sm, paddingHorizontal: space.sm, height: 24, backgroundColor: color.goldSoft, borderRadius: radii.pill },
  nearestText: { ...type.caption, fontFamily: 'Poppins_600SemiBold', color: color.goldText },
  outletName: { ...type.bodyStrong, color: color.text, marginBottom: space.sm },
  outletMeta: { ...type.caption, color: color.textSecondary },
  addrLabel: { ...type.overline, color: color.textMuted, marginBottom: space.sm },
  addrBox: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, padding: space.md, borderRadius: radii.md, backgroundColor: color.surfaceMuted, borderWidth: 1, borderColor: color.border },
  addrText: { flex: 1, ...type.body, color: color.textSecondary },

  collRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, minHeight: 64, borderRadius: radii.md },
  collIcon: { width: 48, height: 48, borderRadius: radii.md, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  collName: { ...type.subheading, color: color.text },
  collCount: { ...type.small, color: color.textMuted, marginTop: space.xxs },
  check: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: color.primary, backgroundColor: color.primary, alignItems: 'center', justifyContent: 'center' },

  itemDialog: { width: '100%', maxWidth: 450, backgroundColor: color.surface, borderRadius: radii.xl, overflow: 'hidden', ...elevation.sheet },
  itemClose: { position: 'absolute', top: space.md, right: space.md, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(17,17,17,0.72)', alignItems: 'center', justifyContent: 'center' },
  itemName: { flex: 1, ...type.heading, color: color.text },
  itemDesc: { ...type.body, color: color.textSecondary, marginBottom: space.lg },
  variantTitle: { ...type.label, color: color.text, marginBottom: space.sm },
  variant: { minHeight: 40, justifyContent: 'center', borderRadius: radii.pill, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface, paddingHorizontal: space.md + 2 },
  variantOn: { borderColor: color.primary, backgroundColor: color.primary },
  variantText: { ...type.label, color: color.text },
  itemFoot: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderTopWidth: 1, borderTopColor: color.border, paddingHorizontal: space.lg, paddingVertical: space.lg, backgroundColor: color.surface },
  itemQty: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: color.border, borderRadius: radii.md, height: 48, backgroundColor: color.surface },
  itemQtyBtn: { width: 44, height: '100%', alignItems: 'center', justifyContent: 'center' },
  itemQtyText: { minWidth: 24, textAlign: 'center', ...type.subheading, color: color.text },
  itemAdd: { flex: 1, height: 48, borderRadius: radii.md, backgroundColor: color.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, paddingHorizontal: space.sm },
  itemAddText: { flexShrink: 1, ...type.button, fontSize: 14, color: color.onPrimary },

  optRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg, minHeight: 52, paddingHorizontal: space.sm, paddingVertical: space.md, borderRadius: radii.md },
  optText: { ...type.body, color: color.text, flexShrink: 1 },
  disclaimer: { marginTop: space.lg, paddingHorizontal: space.sm, ...type.caption, fontFamily: 'Poppins_400Regular', lineHeight: 18, color: color.textMuted },
  optFssai: { marginTop: space.lg, marginHorizontal: space.sm, paddingTop: space.lg, borderTopWidth: 1, borderTopColor: color.border, flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.sm },
  optFssaiLogo: { width: 56, height: 32, backgroundColor: color.surface, borderRadius: 4, padding: 4, borderWidth: 1, borderColor: color.border },
  optFssaiLabel: { ...type.caption, color: color.textMuted },
  optFssaiValue: { ...type.caption, fontFamily: 'Poppins_600SemiBold', color: color.textSecondary },

  shareDialog: { width: '92%', maxWidth: 448, backgroundColor: color.surface, borderRadius: radii.lg, ...elevation.sheet },
  shareHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingLeft: space.xl, paddingRight: space.sm, paddingTop: space.sm, paddingBottom: space.sm, borderBottomWidth: 1, borderBottomColor: color.border },
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 48, paddingHorizontal: space.md, borderRadius: radii.md, borderWidth: 1, borderColor: color.border },
  shareRowText: { ...type.bodyStrong, color: color.text },

  coupon: { flexDirection: 'row', alignItems: 'flex-start', gap: space.lg, borderWidth: 1, borderColor: color.border, borderRadius: radii.lg, padding: space.lg, backgroundColor: color.surface, ...elevation.card },
  couponTitle: { ...type.subheading, color: color.text },
  couponCode: { ...type.caption, fontFamily: 'Poppins_400Regular', color: color.textMuted, marginTop: space.xs },
  copyBox: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 40, paddingHorizontal: space.md, borderWidth: 1, borderStyle: 'dashed', borderColor: color.primaryBorder, backgroundColor: color.primarySoft, borderRadius: radii.md },
  copyBoxText: { ...type.label, fontFamily: 'Poppins_700Bold', color: color.primary, letterSpacing: 0.5 },

  infoCard: { backgroundColor: color.surface, borderRadius: radii.lg, padding: space.xl, borderWidth: 1, borderColor: color.border, ...elevation.card },
  infoName: { ...type.heading, color: color.text },
  infoAddress: { ...type.small, color: color.textSecondary, marginTop: space.sm, paddingBottom: space.lg },
  infoCall: { flexDirection: 'row', alignItems: 'center', gap: space.md + 2, paddingVertical: space.lg, borderTopWidth: 1, borderTopColor: color.border },
  callBtn: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: color.primaryBorder, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  infoCallTitle: { ...type.bodyStrong, color: color.text },
  infoCallBody: { ...type.caption, fontFamily: 'Poppins_400Regular', lineHeight: 18, color: color.textMuted, marginTop: space.xxs },
  infoLine: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 2 },
  infoLineText: { flex: 1, ...type.body, color: color.textSecondary },
  legalRow: { paddingBottom: space.md, borderBottomWidth: 1, borderBottomColor: color.border },
  legalLabel: { ...type.overline, color: color.textMuted },
  legalValue: { ...type.subheading, color: color.text, marginTop: space.xs },
  fssaiNo: { ...type.small, fontFamily: 'Poppins_500Medium', color: color.textSecondary, marginTop: space.xs + 2 },
});
