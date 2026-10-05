import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Linking, PanResponder, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
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
import { F } from '../components/shell';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { poppins, shadow, tw } from '../../theme';

const DISH_FALLBACK = require('../../../assets/food/dish_fallback.webp');
const FSSAI_LOGO = require('../../../assets/food/fssai.png');
const RUPEE = '₹';

function DishImg({ uri, style }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  return <Image source={uri && !failed ? { uri } : DISH_FALLBACK} onError={() => setFailed(true)} style={style} resizeMode="cover" />;
}

function CategoryThumb({ category, size, radius, fontSize }) {
  const [failed, setFailed] = useState(false);
  if (category.image && !failed) {
    return <Image source={{ uri: category.image }} onError={() => setFailed(true)} style={{ width: size, height: size, borderRadius: radius, borderWidth: 1, borderColor: radius > 12 ? 'rgba(255,255,255,0.7)' : tw.gray200 }} />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: tw.gray100, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize, color: tw.gray500, ...poppins(700) }}>{(category.name?.charAt(0) || 'C').toUpperCase()}</Text>
    </View>
  );
}

function DietMark({ veg, color }) {
  const c = color || (veg ? tw.green600 : tw.red600);
  return (
    <View style={[styles.diet, { borderColor: c }]}>
      <View style={{ flex: 1, borderRadius: 999, backgroundColor: c }} />
    </View>
  );
}

function IconButton({ onPress, label, children }) {
  return (
    <Press scale={0.94} onPress={onPress} accessibilityLabel={label} style={styles.roundBtn} hitSlop={4}>
      {children}
    </Press>
  );
}

function Stepper({ quantity, disabled, onMinus, onPlus, name }) {
  return (
    <View style={[styles.stepper, disabled ? styles.addDisabled : null]}>
      <Press scale={0.9} disabled={disabled} onPress={onMinus} accessibilityLabel={`Remove one ${name}`} hitSlop={10}>
        <Minus size={14} color={disabled ? tw.gray400 : F.green} />
      </Press>
      <Text style={[styles.stepperQty, disabled ? { color: tw.gray400 } : null]}>{quantity}</Text>
      <Press scale={0.9} disabled={disabled} onPress={onPlus} accessibilityLabel={`Add one more ${name}`} hitSlop={10}>
        <Plus size={14} color={disabled ? tw.gray400 : F.green} strokeWidth={3} />
      </Press>
    </View>
  );
}

function SheetOption({ active, onPress, children, tone = 'blue', style }) {
  const tones = {
    blue: { borderColor: tw.blue500 || '#2B7FFF', backgroundColor: tw.blue50 || '#EFF6FF' },
    green: { borderColor: tw.green600, backgroundColor: tw.green50 },
    red: { borderColor: tw.red600, backgroundColor: tw.red50 },
    brand: { borderColor: F.green, backgroundColor: F.cream },
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
        <Utensils size={20} color="#fff" />
        <Text style={styles.menuFabText}>Menu</Text>
      </Press>
    </Animated.View>
  );
}

function DetailSkeleton() {
  return (
    <View style={{ flex: 1, backgroundColor: '#fff', padding: 16, gap: 16 }} accessibilityRole="progressbar" accessibilityLabel="Loading restaurant">
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Skeleton style={{ width: 40, height: 40, borderRadius: 20 }} />
        <Skeleton style={{ width: 120, height: 40, borderRadius: 20 }} />
      </View>
      <Skeleton style={{ height: 150, borderRadius: 24 }} />
      <Skeleton style={{ height: 44, borderRadius: 12 }} />
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 16 }}>
          <View style={{ flex: 1, gap: 8 }}>
            <Skeleton style={{ height: 20, width: '70%', borderRadius: 10 }} />
            <Skeleton style={{ height: 16, width: '30%', borderRadius: 8 }} />
            <Skeleton style={{ height: 14, width: '90%', borderRadius: 7 }} />
          </View>
          <Skeleton style={{ width: 128, height: 128, borderRadius: 16 }} />
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
        <AlertCircle size={48} color={isNetworkError ? F.green : tw.red500} />
        <Text style={styles.errTitle}>{isNetworkError ? 'Connection Error' : isNotFoundError ? 'Restaurant not found' : 'Error'}</Text>
        <Text style={styles.errBody}>{isNetworkError ? 'Please check your internet connection and try again.' : restaurantError}</Text>
        <Press scale={0.97} onPress={goBack} accessibilityLabel="Go back" style={styles.outlineBtn}>
          <Text style={styles.outlineBtnText}>Go Back</Text>
        </Press>
      </View>
    );
  }

  if (!restaurant) {
    return (
      <View style={styles.centerPage}>
        <AlertCircle size={48} color={tw.red500} />
        <Text style={[styles.errBody, { marginTop: 16 }]}>Restaurant not found</Text>
        <Press scale={0.97} onPress={goBack} accessibilityLabel="Go back" style={styles.outlineBtn}>
          <Text style={styles.outlineBtnText}>Go Back</Text>
        </Press>
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
      <ScrollView style={{ flex: 1, backgroundColor: tw.gray50 }} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        <View style={{ padding: 16 }}>
          <IconButton onPress={() => setShowMoreInfo(false)} label="Back to menu">
            <ArrowLeft size={20} color={tw.gray900} />
          </IconButton>
        </View>
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <View style={styles.infoCard}>
            <Text style={styles.infoName} accessibilityRole="header">{restaurant?.name || 'Restaurant Name'}</Text>
            <Text style={styles.infoAddress}>{restaurant?.location || ''}</Text>
            {phone ? (
              <View style={styles.infoCall}>
                <Press scale={0.95} onPress={() => Linking.openURL(`tel:${phone}`).catch(() => {})} accessibilityLabel={`Call ${restaurant?.name}`} style={styles.callBtn}>
                  <Phone size={20} color={F.green} />
                </Press>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoCallTitle}>Contact to restaurant</Text>
                  <Text style={styles.infoCallBody}>Contact restaurant directly for any inquiries, order updates, or support</Text>
                </View>
              </View>
            ) : null}
            <View style={{ paddingTop: 16, borderTopWidth: 1, borderTopColor: tw.gray100, gap: 12 }}>
              <View style={styles.infoLine}>
                <Clock size={16} color={tw.gray500} />
                <Text style={styles.infoLineText}>
                  <Text style={{ color: availabilityStatus?.isOpen ? tw.green600 : tw.red600, ...poppins(600) }}>{availabilityStatus?.isOpen ? 'Open now' : 'Closed now'}</Text>
                  {availabilityStatus?.isOpen && availabilityStatus?.closingTime ? ` • Closes ${formatTimeLabel(availabilityStatus.closingTime)}` : ''}
                  {!availabilityStatus?.isOpen && availabilityStatus?.openingTime ? ` • Opens at ${formatTimeLabel(availabilityStatus.openingTime)}` : ''}
                </Text>
              </View>
              <View style={styles.infoLine}>
                <Store size={16} color={tw.gray500} />
                <Text style={styles.infoLineText}>{provides}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.infoCard, { marginTop: 16, gap: 16 }]}>
            <View style={gstNumber || fssaiNumber ? styles.legalRow : null}>
              <Text style={styles.legalLabel}>LEGAL NAME</Text>
              <Text style={styles.legalValue}>{ownerName || 'Not Provided'}</Text>
            </View>
            {gstNumber ? (
              <View style={fssaiNumber ? styles.legalRow : null}>
                <Text style={styles.legalLabel}>GST NUMBER</Text>
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

          <Press scale={0.98} onPress={() => setShowMoreInfo(false)} accessibilityLabel="Go back to menu" style={styles.backToMenu}>
            <Text style={styles.backToMenuText}>Go back to menu</Text>
          </Press>
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
            <View style={{ marginTop: 4 }}>
              <DietMark veg={isVeg} color={sub ? (isVeg ? '#8CC63F' : F.green) : undefined} />
            </View>
            <Text style={styles.dishName}>{item.name}</Text>
          </View>
          <View style={{ marginTop: 4, gap: 2 }}>
            {hasFoodVariants(item) ? <Text style={styles.startingFrom}>Starting from</Text> : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={styles.dishPrice}>
                {RUPEE}
                {Math.round(getFoodDisplayPrice(item))}
              </Text>
              {item.preparationTime && String(item.preparationTime).trim() ? (
                <View style={styles.prep}>
                  <Clock size={12} color={tw.gray500} />
                  <Text style={styles.prepText}>{String(item.preparationTime).trim()}</Text>
                </View>
              ) : null}
            </View>
          </View>
          {item.description ? <Text style={styles.dishDesc} numberOfLines={2}>{item.description}</Text> : null}
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 12 }}>
            <Press scale={0.92} onPress={() => handleBookmarkClick(item)} accessibilityLabel={favorite ? `Remove ${item.name} from bookmarks` : `Bookmark ${item.name}`} style={[styles.miniBtn, favorite ? { borderColor: tw.red500, backgroundColor: tw.red50 } : null]} hitSlop={6}>
              <Bookmark size={18} color={favorite ? tw.red500 : tw.gray600} fill={favorite ? tw.red500 : 'none'} />
            </Press>
            <Press scale={0.92} onPress={() => handleShareClick(item)} accessibilityLabel={`Share ${item.name}`} style={styles.miniBtn} hitSlop={6}>
              <Share2 size={18} color={tw.gray600} />
            </Press>
          </View>
        </View>

        <View style={{ width: 128, height: 136 }}>
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
                <Text style={[styles.addText, shouldShowGrayscale ? { color: tw.gray400 } : null]}>ADD</Text>
                <Plus size={14} color={shouldShowGrayscale ? tw.gray400 : F.green} strokeWidth={3} />
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
  const fabBottom = (itemCount > 0 ? 150 : 80) + insets.bottom;
  const anyFabBlockingSheet = showFilterSheet || showMenuSheet || showMenuOptionsSheet;

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ flex: 1, opacity: shouldShowGrayscale ? 0.75 : 1 }}>
        <View style={styles.topBar}>
          <IconButton onPress={goBack} label="Go back">
            <ArrowLeft size={20} color={tw.gray900} />
          </IconButton>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, justifyContent: 'flex-end' }}>
            {!showSearch ? (
              <Press scale={0.96} onPress={() => setShowSearch(true)} accessibilityLabel="Search for dishes" style={styles.searchPill}>
                <Search size={16} color={tw.gray900} />
                <Text style={styles.searchPillText}>Search</Text>
              </Press>
            ) : (
              <View style={styles.searchBox}>
                <Search size={16} color={tw.gray400} />
                <TextInput
                  autoFocus
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search for dishes..."
                  placeholderTextColor={tw.gray400}
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
                  >
                    <X size={16} color={tw.gray400} />
                  </Press>
                ) : null}
              </View>
            )}
            <IconButton onPress={() => setShowMenuOptionsSheet(true)} label="More options">
              <MoreVertical size={20} color={tw.gray900} />
            </IconButton>
          </View>
        </View>

        <ScrollView ref={scroller} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 190 + insets.bottom }}>
          <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 12 }}>
            <View style={styles.summary}>
              <LinearGradient colors={['#0a4d2b', '#8a4b77', '#b36b8f']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.summaryBar} />
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.name} accessibilityRole="header">{restaurant?.name || 'Unknown Restaurant'}</Text>
                  <View style={[styles.rowC, { marginTop: 4, gap: 8 }]}>
                    <Utensils size={16} color={tw.gray700} />
                    <Text style={styles.summaryText}>{restaurant?.topCategory || restaurant?.cuisine || 'Multi-cuisine'}</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <View style={styles.ratingPill}>
                    <Star size={12} color="#fff" fill="#fff" />
                    <Text style={styles.ratingPillText}>{Number(restaurant?.rating || 0) > 0 ? Number(restaurant.rating).toFixed(1) : 'NEW'}</Text>
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

              <View style={[styles.rowC, { gap: 12 }]}>
                <Press scale={0.98} onPress={() => setShowLocationSheet(true)} accessibilityLabel="Restaurant address and outlets" style={[styles.rowC, { flex: 1, gap: 4, minWidth: 0 }]}>
                  <MapPin size={16} color={tw.gray700} />
                  <Text style={[styles.summaryText, { flexShrink: 1 }]} numberOfLines={1}>
                    {restaurant?.distance || '1.2 km'} | {restaurant?.location || 'Location'}
                  </Text>
                  <ChevronDown size={16} color={tw.gray500} />
                </Press>
                <View style={[styles.openBadge, isRestaurantOffline ? { backgroundColor: '#EC003F' } : null]}>
                  {isRestaurantOffline ? (
                    <Text style={styles.openBadgeText}>Offline</Text>
                  ) : (
                    <>
                      <Text style={styles.openBadgeText}>Open</Text>
                      <Text style={styles.openBadgeText}>now</Text>
                    </>
                  )}
                </View>
              </View>

              <View style={[styles.rowC, { gap: 8 }]}>
                <Clock size={16} color={tw.gray700} />
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
                <View style={[styles.rowC, { flex: 1, gap: 8, marginRight: 16 }]}>
                  <ScallopBadge size={24} />
                  <Animated.Text numberOfLines={1} style={[styles.offerStripText, { opacity: couponFade }]}>
                    {formatCouponStripText(coupons[currentCouponIndex])}
                  </Animated.Text>
                </View>
                <View style={[styles.rowC, { gap: 4 }]}>
                  <Text style={styles.offerCount}>
                    {coupons.length} offer{coupons.length > 1 ? 's' : ''}
                  </Text>
                  <ChevronDown size={16} color={tw.gray500} />
                </View>
              </Press>
            ) : null}
          </View>

          {hasSections ? (
            <View style={styles.filterBar}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled contentContainerStyle={{ paddingHorizontal: 16 }}>
                <View style={{ gap: 8 }}>
                  <View style={[styles.rowC, { gap: 8 }]}>
                    <Press scale={0.97} onPress={() => setShowFilterSheet(true)} accessibilityLabel={`Filters${activeFilterCount ? `, ${activeFilterCount} active` : ''}`} style={styles.smBtn}>
                      <SlidersHorizontal size={16} color={tw.gray900} />
                      <Text style={styles.smBtnText}>Filters</Text>
                      <ChevronDown size={12} color={tw.gray900} />
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
                      style={[styles.smBtn, { borderRadius: 999 }, filters.vegNonVeg === 'veg' ? { borderColor: tw.green600, backgroundColor: tw.green50 } : null]}
                    >
                      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: tw.green600 }} />
                      <Text style={[styles.smBtnText, filters.vegNonVeg === 'veg' ? { color: tw.green700, ...poppins(700) } : null]}>Veg</Text>
                      {filters.vegNonVeg === 'veg' ? <X size={12} color={tw.gray600} /> : null}
                    </Press>
                    {!vegMode ? (
                      <Press
                        scale={0.97}
                        onPress={() => setFilters((prev) => ({ ...prev, vegNonVeg: prev.vegNonVeg === 'non-veg' ? null : 'non-veg' }))}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: filters.vegNonVeg === 'non-veg' }}
                        accessibilityLabel="Non-veg only"
                        style={[styles.smBtn, { borderRadius: 999 }, filters.vegNonVeg === 'non-veg' ? { borderColor: tw.red600, backgroundColor: tw.red50 } : null]}
                      >
                        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: tw.red600 }} />
                        <Text style={[styles.smBtnText, filters.vegNonVeg === 'non-veg' ? { color: tw.red600 } : null]}>Non-veg</Text>
                        {filters.vegNonVeg === 'non-veg' ? <X size={12} color={tw.gray600} /> : null}
                      </Press>
                    ) : null}
                  </View>

                  {menuCategories.length > 0 ? (
                    <View style={[styles.rowC, { gap: 8 }]}>
                      <Press scale={0.97} onPress={() => setSelectedMenuCategory('all')} accessibilityRole="tab" accessibilityState={{ selected: selectedMenuCategory === 'all' }} style={[styles.catChip, selectedMenuCategory === 'all' ? styles.catChipOn : null]}>
                        <Text style={[styles.catChipText, selectedMenuCategory === 'all' ? { color: F.green } : null]}>All</Text>
                      </Press>
                      {menuCategories.map((category) => {
                        const on = selectedMenuCategory === category.id;
                        return (
                          <Press key={category.id} scale={0.97} onPress={() => setSelectedMenuCategory(category.id)} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={category.name} style={[styles.catChip, on ? styles.catChipOn : null]}>
                            <CategoryThumb category={category} size={24} radius={12} fontSize={10} />
                            <Text style={[styles.catChipText, on ? { color: F.green } : null]}>{category.name}</Text>
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
            style={{ paddingHorizontal: 16, paddingVertical: 24, gap: 24 }}
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
                  <Utensils size={48} color={tw.gray400} />
                </View>
                <Text style={styles.emptyMenuTitle}>{vegMode && rawHasAnyDish ? 'No Veg Dishes Available' : 'Menu Coming Soon'}</Text>
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
                  style={{ gap: 4 }}
                >
                  <Press scale={1} onPress={() => toggleExpanded(originalIndex)} accessibilityRole="button" accessibilityState={{ expanded: isExpanded }} accessibilityLabel={title} style={styles.sectionHead}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={styles.sectionTitle}>{title}</Text>
                      {section.subtitle ? <Text style={styles.sectionSubtitle}>{section.subtitle}</Text> : null}
                    </View>
                    <View style={{ padding: 4, transform: [{ rotate: isExpanded ? '0deg' : '-90deg' }] }}>
                      <ChevronDown size={20} color={tw.gray600} />
                    </View>
                  </Press>

                  {isExpanded && isRecommended && !loadingMenuItems && sectionItems.length === 0 ? (
                    <Text style={styles.noRecommended}>No dish recommended</Text>
                  ) : null}
                  {isExpanded && loadingMenuItems ? (
                    <View style={{ gap: 12, paddingHorizontal: 4, paddingVertical: 8 }}>
                      <Skeleton style={{ height: 96, borderRadius: 16 }} />
                      <Skeleton style={{ height: 96, borderRadius: 16 }} />
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
                    <View style={{ gap: 16 }}>
                      {sectionSubsections.map((subsection, subIndex) => {
                        const subsectionKey = `${originalIndex}-${subIndex}`;
                        const isSubsectionExpanded = expandedSections.has(subsectionKey);
                        const subsectionItems = toRenderableArray(subsection?.items);
                        const subTitle = subsection?.name || subsection?.title || 'Subsection';
                        return (
                          <View key={subIndex} style={{ gap: 16 }}>
                            <Press scale={1} onPress={() => toggleExpanded(subsectionKey)} accessibilityRole="button" accessibilityState={{ expanded: isSubsectionExpanded }} accessibilityLabel={subTitle} style={styles.sectionHead}>
                              <Text style={[styles.subTitle, { flex: 1 }]}>{subTitle}</Text>
                              <View style={{ padding: 4, transform: [{ rotate: isSubsectionExpanded ? '0deg' : '-90deg' }] }}>
                                <ChevronDown size={16} color={tw.gray500} />
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
                <Text style={styles.fssaiLabel}>LICENSE NO.</Text>
                <Text style={styles.fssaiValue}>{fssaiReg}</Text>
              </View>
            </View>
          ) : null}
        </ScrollView>
      </View>

      {!anyFabBlockingSheet && filteredSections.length > 0 ? <FloatingMenuButton bottom={fabBottom} onPress={() => setShowMenuSheet(true)} /> : null}
      <CartPill bottomOffset={80} linkTo="/food/user/cart" />

      {/* Menu categories */}
      <BottomSheet visible={showMenuSheet} onClose={() => setShowMenuSheet(false)} spring={{ stiffness: 400, damping: 30 }} panelStyle={[styles.sheet, { maxHeight: height * 0.85 }]}>
        <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 24, gap: 4 }}>
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
              <View style={[styles.rowC, { gap: 12, flex: 1, minWidth: 0 }]}>
                <CategoryThumb category={category} size={40} radius={12} fontSize={14} />
                <Text style={styles.menuRowName} numberOfLines={1}>{category.name}</Text>
              </View>
              <Text style={styles.menuRowCount}>{category.count}</Text>
            </Press>
          ))}
        </ScrollView>
        <View style={[styles.sheetFoot, { paddingBottom: 16 + insets.bottom }]}>
          <Press scale={0.98} onPress={() => setShowMenuSheet(false)} accessibilityLabel="Close menu" style={styles.primaryBtn}>
            <X size={16} color="#fff" />
            <Text style={styles.primaryBtnText}>Close</Text>
          </Press>
        </View>
      </BottomSheet>

      {/* Filters and sorting */}
      <BottomSheet visible={showFilterSheet} onClose={() => setShowFilterSheet(false)} spring={{ stiffness: 400, damping: 30 }} panelStyle={[styles.sheet, { height: height * 0.8 }]}>
        <View style={styles.sheetHead}>
          <Text style={styles.sheetTitle}>Filters and Sorting</Text>
          <Press scale={0.9} onPress={() => setShowFilterSheet(false)} accessibilityLabel="Close filters" style={{ padding: 8 }}>
            <X size={20} color={tw.gray600} />
          </Press>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 16 }}>
          <View style={{ gap: 8 }}>
            <Text style={styles.filterHeading}>Sort by:</Text>
            <View style={{ gap: 6 }}>
              <SheetOption active={filters.sortBy === 'low-to-high'} onPress={() => setFilters((prev) => ({ ...prev, sortBy: prev.sortBy === 'low-to-high' ? null : 'low-to-high' }))}>
                <Text style={[styles.sheetOptText, filters.sortBy === 'low-to-high' ? { color: tw.blue700 || '#1447E6' } : null]}>Price - low to high</Text>
              </SheetOption>
              <SheetOption active={filters.sortBy === 'high-to-low'} onPress={() => setFilters((prev) => ({ ...prev, sortBy: prev.sortBy === 'high-to-low' ? null : 'high-to-low' }))}>
                <Text style={[styles.sheetOptText, filters.sortBy === 'high-to-low' ? { color: tw.blue700 || '#1447E6' } : null]}>Price - high to low</Text>
              </SheetOption>
            </View>
          </View>
          <View style={{ gap: 8 }}>
            <Text style={styles.filterHeading}>Veg/Non-veg preference:</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <SheetOption tone="green" style={{ flex: 1 }} active={filters.vegNonVeg === 'veg'} onPress={() => setFilters((prev) => ({ ...prev, vegNonVeg: prev.vegNonVeg === 'veg' ? null : 'veg' }))}>
                <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: tw.green600 }} />
                <Text style={[styles.sheetOptText, poppins(500), filters.vegNonVeg === 'veg' ? { color: tw.green700 } : null]}>Veg</Text>
              </SheetOption>
              {!vegMode ? (
                <SheetOption tone="red" style={{ flex: 1 }} active={filters.vegNonVeg === 'non-veg'} onPress={() => setFilters((prev) => ({ ...prev, vegNonVeg: prev.vegNonVeg === 'non-veg' ? null : 'non-veg' }))}>
                  <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: tw.red600 }} />
                  <Text style={[styles.sheetOptText, poppins(500), filters.vegNonVeg === 'non-veg' ? { color: tw.red600 } : null]}>Non-veg</Text>
                </SheetOption>
              ) : null}
            </View>
          </View>
          <View style={{ gap: 8 }}>
            <Text style={styles.filterHeading}>Top picks:</Text>
            <SheetOption tone="brand" active={filters.highlyReordered} onPress={() => setFilters((prev) => ({ ...prev, highlyReordered: !prev.highlyReordered }))}>
              <RotateCcw size={16} color={filters.highlyReordered ? F.green : tw.gray700} />
              <Text style={[styles.sheetOptText, poppins(500), filters.highlyReordered ? { color: F.green } : null]}>Highly reordered</Text>
            </SheetOption>
          </View>
          <View style={{ gap: 8 }}>
            <Text style={styles.filterHeading}>Dietary preference:</Text>
            <SheetOption tone="red" active={filters.spicy} onPress={() => setFilters((prev) => ({ ...prev, spicy: !prev.spicy }))}>
              <Flame size={16} color={filters.spicy ? tw.red700 : tw.gray700} />
              <Text style={[styles.sheetOptText, poppins(500), filters.spicy ? { color: tw.red700 } : null]}>Spicy</Text>
            </SheetOption>
          </View>
        </ScrollView>
        <View style={[styles.sheetFoot, styles.rowC, { justifyContent: 'space-between', paddingTop: 12, paddingBottom: 12 + insets.bottom }]}>
          <Press scale={0.96} onPress={() => setFilters({ sortBy: null, vegNonVeg: null, highlyReordered: false, spicy: false })} accessibilityLabel="Clear all filters" hitSlop={8}>
            <Text style={styles.clearAll}>Clear All</Text>
          </Press>
          <Press scale={0.97} onPress={() => setShowFilterSheet(false)} accessibilityLabel="Apply filters" style={styles.applyBtn}>
            <Text style={styles.applyBtnText}>Apply{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}</Text>
          </Press>
        </View>
      </BottomSheet>

      {/* Address / outlets */}
      <Dialog visible={showLocationSheet} onClose={() => setShowLocationSheet(false)} backdrop="rgba(0,0,0,0.4)" panelStyle={[styles.locDialog, { maxHeight: height * 0.8 }]}>
        <View style={styles.locHead}>
          <Text style={[styles.sheetTitle, { flex: 1, ...poppins(700) }]}>{restaurant?.name || 'Unknown Restaurant'}</Text>
          <Press scale={0.9} onPress={() => setShowLocationSheet(false)} accessibilityLabel="Close" style={{ padding: 6 }}>
            <X size={16} color={tw.gray400} />
          </Press>
        </View>
        <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          {Array.isArray(restaurant?.outlets) && restaurant.outlets.length > 0 ? (
            <View style={{ gap: 8 }}>
              {restaurant.outlets.map((outlet, i) => (
                <View key={outlet?.id || i} style={styles.outlet}>
                  {outlet?.isNearest ? (
                    <View style={styles.nearest}>
                      <Zap size={14} color={F.green} fill={F.green} />
                      <Text style={styles.nearestText}>Nearest available outlet</Text>
                    </View>
                  ) : null}
                  <Text style={styles.outletName}>{outlet?.location || 'Location'}</Text>
                  <View style={[styles.rowC, { justifyContent: 'space-between', gap: 16 }]}>
                    <View style={[styles.rowC, { gap: 12 }]}>
                      <View style={[styles.rowC, { gap: 4 }]}>
                        <Clock size={14} color={tw.gray600} />
                        <Text style={styles.outletMeta}>{outlet?.deliveryTime || '25-30 mins'}</Text>
                      </View>
                      <View style={[styles.rowC, { gap: 4 }]}>
                        <MapPin size={14} color={tw.gray600} />
                        <Text style={styles.outletMeta}>{outlet?.distance || '1.2 km'}</Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 2 }}>
                      <View style={[styles.rowC, { gap: 4 }]}>
                        <Star size={14} color="#8CC63F" fill="#8CC63F" />
                        <Text style={[styles.outletMeta, { color: tw.gray900, ...poppins(500) }]}>{outlet?.rating ? outlet.rating : 'NEW'}</Text>
                      </View>
                      <Text style={[styles.outletMeta, { color: tw.gray500 }]}>{ratingCountLabel(outlet?.reviews)}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={{ paddingTop: 4, paddingBottom: 12 }}>
              <Text style={styles.addrLabel}>RESTAURANT ADDRESS</Text>
              <View style={styles.addrBox}>
                <MapPin size={16} color={tw.red500} style={{ marginTop: 2 }} />
                <Text style={styles.addrText}>{restaurant?.location || 'Address not available'}</Text>
              </View>
            </View>
          )}
        </ScrollView>
      </Dialog>

      {/* Manage collections */}
      <BottomSheet visible={showManageCollections} onClose={() => setShowManageCollections(false)} spring={{ stiffness: 400, damping: 30 }} panelStyle={styles.sheet}>
        <View style={[styles.sheetHead, { paddingTop: 24, paddingBottom: 16 }]}>
          <Text style={[styles.sheetTitle, poppins(700)]}>Manage Collections</Text>
          <Press scale={0.9} onPress={() => setShowManageCollections(false)} accessibilityLabel="Close" style={styles.darkClose}>
            <X size={16} color="#fff" />
          </Press>
        </View>
        <View style={{ paddingHorizontal: 16, paddingVertical: 16, gap: 8 }}>
          <View style={styles.collRow}>
            <View style={styles.collIcon}>
              <Bookmark size={24} color={tw.red500} fill={tw.red500} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={[styles.rowC, { justifyContent: 'space-between' }]}>
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
                  style={[styles.check, selectedItem ? null : { borderColor: tw.red500, backgroundColor: tw.red500 }]}
                >
                  <Check size={12} color="#fff" strokeWidth={3} />
                </Press>
              </View>
              <Text style={styles.collCount}>
                {getDishFavorites().length} dishes • {getFavorites().length} restaurant
              </Text>
            </View>
          </View>
          <Press scale={0.98} onPress={() => setShowManageCollections(false)} accessibilityLabel="Create new Collection" style={styles.collRow}>
            <View style={styles.collIcon}>
              <Plus size={24} color={tw.red500} />
            </View>
            <Text style={[styles.collName, { flex: 1 }]}>Create new Collection</Text>
          </Press>
        </View>
        <View style={[styles.sheetFoot, { paddingBottom: 16 + insets.bottom }]}>
          <Press scale={0.98} onPress={() => setShowManageCollections(false)} accessibilityLabel="Done" style={[styles.primaryBtn, { paddingVertical: 12, borderRadius: 8 }]}>
            <Text style={styles.primaryBtnText}>Done</Text>
          </Press>
        </View>
      </BottomSheet>

      {/* Dish detail */}
      <Dialog visible={!!(showItemDetail && selectedItem)} onClose={closeItemDetail} backdrop="rgba(0,0,0,0.5)" panelStyle={[styles.itemDialog, { maxHeight: height * 0.9 }]}>
        {selectedItem ? (
          <>
            <View style={{ height: 256, backgroundColor: tw.gray100 }}>
              <DishImg uri={selectedItem.displayImage || selectedItem.image} style={{ width: '100%', height: '100%' }} />
              <Press scale={0.9} onPress={closeItemDetail} accessibilityLabel="Close" style={styles.itemClose}>
                <X size={20} color="#fff" />
              </Press>
            </View>
            <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ padding: 16 }}>
              <View style={[styles.rowC, { gap: 8, marginBottom: 12 }]}>
                <View style={[styles.itemDiet, selectedItem.foodType === 'Veg' ? { borderColor: tw.green600, backgroundColor: tw.green50 } : { borderColor: tw.red600, backgroundColor: tw.red50 }]}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: selectedItem.foodType === 'Veg' ? tw.green600 : tw.red600 }} />
                </View>
                <Text style={styles.itemName}>{selectedItem.name}</Text>
              </View>
              {selectedItem.description ? <Text style={styles.itemDesc}>{selectedItem.description}</Text> : null}
              {selectedItem.notEligibleForCoupons ? <Text style={styles.itemNoCoupon}>NOT ELIGIBLE FOR COUPONS</Text> : null}
              {hasFoodVariants(selectedItem) ? (
                <View style={{ marginBottom: 16 }}>
                  <Text style={styles.variantTitle}>Choose a variant</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {getFoodVariants(selectedItem).map((variant) => {
                      const on = String(selectedVariantId || '') === String(variant.id);
                      return (
                        <Press key={variant.id} scale={0.97} onPress={() => setSelectedVariantId(variant.id)} accessibilityRole="radio" accessibilityState={{ checked: on }} style={[styles.variant, on ? { borderColor: tw.red500, backgroundColor: tw.red50 } : null]}>
                          <Text style={[styles.variantText, on ? { color: tw.red600 } : null]}>
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
                    <Press scale={0.9} hitSlop={8} disabled={qty === 0 || shouldShowGrayscale} onPress={() => updateItemQuantity(selectedItem, shown - 1, null, variant)} accessibilityLabel="Decrease quantity">
                      <Minus size={20} color={qty === 0 || shouldShowGrayscale ? tw.gray300 : tw.gray600} />
                    </Press>
                    <Text style={[styles.itemQtyText, shouldShowGrayscale ? { color: tw.gray400 } : null]}>{shown}</Text>
                    <Press scale={0.9} hitSlop={8} disabled={shouldShowGrayscale} onPress={() => updateItemQuantity(selectedItem, shown + 1, null, variant)} accessibilityLabel="Increase quantity">
                      <Plus size={20} color={shouldShowGrayscale ? tw.gray300 : tw.gray600} />
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
                    style={[styles.itemAdd, shouldShowGrayscale ? { backgroundColor: tw.gray300, opacity: 0.5 } : null]}
                  >
                    <Text style={[styles.itemAddText, shouldShowGrayscale ? { color: tw.gray500 } : null]} numberOfLines={1}>
                      {qty > 0 ? 'Update cart' : hasFoodVariants(selectedItem) ? 'Add' : 'Add item'}
                    </Text>
                    <Text style={[styles.itemAddText, { fontSize: 14, ...poppins(700) }, shouldShowGrayscale ? { color: tw.gray500 } : null]} numberOfLines={1}>
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
        <View style={[styles.sheetHead, { paddingTop: 24, paddingBottom: 16 }]}>
          <Text style={[styles.sheetTitle, poppins(700)]}>{restaurant?.name || 'Unknown Restaurant'}</Text>
        </View>
        <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ padding: 16 }}>
          <Press scale={0.99} onPress={handleAddToCollection} style={styles.optRow}>
            <Bookmark size={20} color={tw.gray700} />
            <Text style={styles.optText}>{isFavorite(restaurant?.slug || slug || '') ? 'Remove from Collection' : 'Add to Collection'}</Text>
          </Press>
          <Press scale={0.99} onPress={handleShareRestaurant} style={styles.optRow}>
            <Share2 size={20} color={tw.gray700} />
            <Text style={styles.optText}>Share this restaurant</Text>
          </Press>
          <Press
            scale={0.99}
            onPress={() => {
              setShowMenuOptionsSheet(false);
              setShowMoreInfo(true);
            }}
            style={styles.optRow}
          >
            <Info size={20} color={tw.gray700} />
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
                <Text style={styles.optFssaiLabel}>LIC. NO.</Text>
                <Text style={styles.optFssaiValue}>{fssaiReg}</Text>
              </View>
            </View>
          ) : null}
        </ScrollView>
        <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 8 + insets.bottom }}>
          <View style={{ width: 48, height: 4, borderRadius: 2, backgroundColor: tw.gray300 }} />
        </View>
      </BottomSheet>

      {/* Share */}
      <Dialog visible={!!(showShareModal && sharePayload)} onClose={() => setShowShareModal(false)} backdrop="rgba(0,0,0,0.5)" panelStyle={styles.shareDialog}>
        <View style={styles.shareHead}>
          <Text style={[styles.sheetTitle, { flex: 1 }]}>Share</Text>
          <Press scale={0.9} onPress={() => setShowShareModal(false)} accessibilityLabel="Close share modal" style={{ padding: 4 }} hitSlop={8}>
            <X size={16} color={tw.gray600} />
          </Press>
        </View>
        <View style={{ paddingHorizontal: 20, paddingVertical: 16, gap: 8 }}>
          {[
            { key: 'system', label: 'Share via system apps', Icon: Share2, onPress: handleSystemShareFromModal },
            { key: 'whatsapp', label: 'WhatsApp', Icon: MessageCircle, onPress: () => openShareTarget('whatsapp') },
            { key: 'telegram', label: 'Telegram', Icon: Send, onPress: () => openShareTarget('telegram') },
            { key: 'email', label: 'Email', Icon: Mail, onPress: () => openShareTarget('email') },
            { key: 'copy', label: 'Copy link', Icon: Copy, onPress: copyShareLink },
          ].map(({ key, label, Icon, onPress }) => (
            <Press key={key} scale={0.99} onPress={onPress} accessibilityLabel={label} style={styles.shareRow}>
              <Icon size={20} color={tw.gray700} />
              <Text style={styles.shareRowText}>{label}</Text>
            </Press>
          ))}
        </View>
      </Dialog>

      {/* Offers */}
      <BottomSheet visible={showOffersSheet} onClose={() => setShowOffersSheet(false)} backdrop="rgba(0,0,0,0.6)" panelStyle={[styles.sheet, { maxHeight: height * 0.8 }]}>
        <View style={[styles.sheetHead, { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16, borderBottomColor: tw.gray100 }]}>
          <Text style={[styles.offersTitle, { flex: 1 }]}>Offers at {restaurant?.name || 'this restaurant'}</Text>
          <Press scale={0.9} onPress={() => setShowOffersSheet(false)} accessibilityLabel="Close coupons" style={styles.darkClose}>
            <X size={16} color="#fff" />
          </Press>
        </View>
        <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 24 + insets.bottom, gap: 12 }}>
          <Text style={styles.addrLabel}>RESTAURANT COUPONS</Text>
          {coupons.map((coupon, idx) => (
            <View key={coupon.couponCode || idx} style={styles.coupon}>
              <ScallopBadge size={40} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.couponTitle}>{formatCouponTitle(coupon)}</Text>
                <Text style={styles.couponCode}>
                  Use code <Text style={{ color: tw.gray700, ...poppins(600) }}>{coupon.couponCode}</Text>
                </Text>
                <View style={{ flexDirection: 'row', marginTop: 14 }}>
                  <Press scale={0.96} onPress={() => handleCopyCoupon(coupon.couponCode)} accessibilityLabel={`Copy coupon code ${coupon.couponCode}`} style={styles.copyBox}>
                    <Text style={styles.copyBoxText}>{coupon.couponCode}</Text>
                    <Copy size={12} color={tw.blue600 || '#155DFC'} />
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
  centerPage: { flex: 1, backgroundColor: tw.gray50, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  errTitle: { fontSize: 18, lineHeight: 28, color: tw.gray900, marginTop: 16, marginBottom: 4, ...poppins(600) },
  errBody: { fontSize: 14, lineHeight: 20, color: tw.gray600, textAlign: 'center', marginBottom: 16, ...poppins(400) },
  outlineBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: tw.gray200, backgroundColor: '#fff', ...shadow('sm') },
  outlineBtnText: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(500) },

  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, backgroundColor: '#fff' },
  roundBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: tw.gray200, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow('sm') },
  searchPill: { height: 40, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: tw.gray200, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 8, ...shadow('sm') },
  searchPillText: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(500) },
  searchBox: { flex: 1, height: 40, borderRadius: 20, borderWidth: 1, borderColor: tw.gray200, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, ...shadow('sm') },
  searchInput: { flex: 1, paddingVertical: 0, fontSize: 14, color: tw.gray900, ...poppins(400) },

  summary: { borderRadius: 24, borderWidth: 1, borderColor: tw.gray100, backgroundColor: '#fff', padding: 16, gap: 16, overflow: 'hidden', ...shadow('0 16px 40px rgba(15,23,42,0.08)') },
  summaryBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 6 },
  name: { fontSize: 24, lineHeight: 30, color: tw.gray900, ...poppins(700) },
  summaryText: { fontSize: 14, lineHeight: 20, color: tw.gray700, ...poppins(400) },
  ratingPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#257d3c', ...shadow('sm') },
  ratingPillText: { fontSize: 12, lineHeight: 16, color: '#fff', ...poppins(600) },
  ratingCount: { marginTop: 4, fontSize: 12, lineHeight: 16, color: tw.gray500, textAlign: 'center', ...poppins(400) },
  openBadge: { alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#257d3c', ...shadow('sm') },
  openBadgeText: { fontSize: 10, lineHeight: 12.5, color: '#fff', ...poppins(700) },
  offlineNote: { borderRadius: 8, borderWidth: 1, borderColor: '#FFCCD3', backgroundColor: '#FFF1F2', paddingHorizontal: 12, paddingVertical: 8 },
  offlineNoteText: { fontSize: 14, lineHeight: 20, color: '#C70036', ...poppins(400) },
  offerStrip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: tw.gray200, backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, marginBottom: 12, ...shadow('sm') },
  offerStripText: { flex: 1, fontSize: 12, lineHeight: 20, color: tw.gray800, ...poppins(600) },
  offerCount: { fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(600) },

  filterBar: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: tw.gray200, paddingVertical: 12, marginTop: 12 },
  smBtn: { height: 36, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: tw.gray300, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 6 },
  smBtnText: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(500) },
  filterCount: { position: 'absolute', top: -4, right: -4, width: 20, height: 20, borderRadius: 10, backgroundColor: tw.red500, alignItems: 'center', justifyContent: 'center' },
  filterCountText: { fontSize: 12, lineHeight: 16, color: '#fff', ...poppins(600) },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, borderWidth: 1, borderColor: tw.gray300, backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 6 },
  catChipOn: { borderColor: F.green, backgroundColor: 'rgba(10,77,43,0.08)' },
  catChipText: { fontSize: 14, lineHeight: 20, color: tw.gray700, ...poppins(600) },

  noMatch: { borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: tw.gray300, backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 32, alignItems: 'center' },
  noMatchTitle: { fontSize: 14, lineHeight: 20, color: tw.gray700, textAlign: 'center', ...poppins(500) },
  noMatchBody: { fontSize: 12, lineHeight: 16, color: tw.gray500, textAlign: 'center', marginTop: 8, ...poppins(400) },
  emptyMenu: { alignItems: 'center', paddingVertical: 64, paddingHorizontal: 16 },
  emptyMenuIcon: { backgroundColor: tw.gray100, padding: 24, borderRadius: 999, marginBottom: 24 },
  emptyMenuTitle: { fontSize: 20, lineHeight: 28, color: tw.gray800, marginBottom: 8, textAlign: 'center', ...poppins(700) },
  emptyMenuBody: { fontSize: 14, lineHeight: 20, color: tw.gray500, textAlign: 'center', maxWidth: 320, ...poppins(400) },

  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 18, lineHeight: 28, color: tw.gray900, ...poppins(700) },
  sectionSubtitle: { fontSize: 14, lineHeight: 20, color: tw.blue600 || '#155DFC', textDecorationLine: 'underline', ...poppins(400) },
  subTitle: { fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(600) },
  noRecommended: { fontSize: 14, lineHeight: 20, color: tw.gray500, textAlign: 'center', paddingVertical: 32, ...poppins(400) },

  dish: { flexDirection: 'row', gap: 16, padding: 16 },
  dishBorder: { borderBottomWidth: 1, borderBottomColor: tw.gray100 },
  dishHighlight: { backgroundColor: 'rgba(251,44,54,0.06)', borderRadius: 16, borderWidth: 2, borderColor: 'rgba(231,0,11,0.8)' },
  diet: { width: 16, height: 16, borderWidth: 2, borderRadius: 2, padding: 2 },
  dishName: { flex: 1, fontSize: 18, lineHeight: 22.5, color: tw.gray800, ...poppins(700) },
  startingFrom: { fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(500) },
  dishPrice: { fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(600) },
  prep: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: tw.gray100, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  prepText: { fontSize: 12, lineHeight: 16, color: tw.gray600, ...poppins(500) },
  dishDesc: { fontSize: 14, lineHeight: 20, color: tw.gray500, marginTop: 4, ...poppins(400) },
  miniBtn: { padding: 6, borderWidth: 1, borderColor: tw.gray300, borderRadius: 8 },
  dishImgWrap: { width: 128, height: 128, borderRadius: 16, overflow: 'hidden', backgroundColor: tw.gray100, ...shadow('sm') },
  addWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center' },
  add: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', borderWidth: 1, borderColor: F.green, paddingHorizontal: 24, paddingVertical: 6, borderRadius: 8, ...shadow('md') },
  addText: { fontSize: 16, lineHeight: 24, color: F.green, ...poppins(700) },
  addDisabled: { backgroundColor: tw.gray50, borderColor: tw.gray300, opacity: 0.5 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', borderWidth: 1, borderColor: F.green, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8, ...shadow('md') },
  stepperQty: { marginHorizontal: 8, fontSize: 14, lineHeight: 24, color: F.green, ...poppins(700) },

  fssai: { flexDirection: 'row', alignItems: 'center', gap: 16, marginHorizontal: 16, marginTop: 8, padding: 16, borderTopWidth: 1, borderStyle: 'dashed', borderColor: tw.gray200, borderRadius: 12, backgroundColor: 'rgba(249,250,251,0.3)' },
  fssaiLogo: { width: 80, height: 48, backgroundColor: '#fff', borderRadius: 8, padding: 6, borderWidth: 1, borderColor: tw.gray100, ...shadow('sm') },
  fssaiLabel: { fontSize: 10, lineHeight: 15, letterSpacing: 1, color: tw.gray400, marginBottom: 4, ...poppins(700) },
  fssaiValue: { fontSize: 14, lineHeight: 20, letterSpacing: 0.35, color: tw.gray600, fontFamily: 'monospace', fontWeight: '600' },

  menuFab: { position: 'absolute', left: 0, zIndex: 40 },
  menuFabBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#5a5e66', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 22, ...shadow('lg') },
  menuFabText: { fontSize: 17, lineHeight: 24, letterSpacing: 0.4, color: '#fff', ...poppins(500) },

  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: tw.gray200 },
  sheetTitle: { fontSize: 18, lineHeight: 28, color: tw.gray900, ...poppins(600) },
  sheetFoot: { borderTopWidth: 1, borderTopColor: tw.gray200, paddingHorizontal: 16, paddingTop: 16, backgroundColor: '#fff' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: F.green, paddingVertical: 16, borderRadius: 12, ...shadow('lg') },
  primaryBtnText: { fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(700) },
  menuRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 8, borderRadius: 8, gap: 12 },
  menuRowName: { flexShrink: 1, fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(500) },
  menuRowCount: { fontSize: 14, lineHeight: 20, color: tw.gray500, ...poppins(400) },
  filterHeading: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(600) },
  sheetOpt: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 2, borderColor: tw.gray200, backgroundColor: '#fff' },
  sheetOptText: { fontSize: 16, lineHeight: 24, color: tw.gray700, ...poppins(400) },
  clearAll: { fontSize: 14, lineHeight: 20, color: tw.red600, ...poppins(500) },
  applyBtn: { backgroundColor: F.green, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  applyBtnText: { fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(700) },
  darkClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: tw.gray700, alignItems: 'center', justifyContent: 'center' },

  locDialog: { width: '88%', maxWidth: 384, backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden', ...shadow('2xl') },
  locHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  outlet: { padding: 12, borderRadius: 8, borderWidth: 1, borderColor: tw.gray200, backgroundColor: '#fff' },
  nearest: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: F.cream, borderRadius: 6 },
  nearestText: { fontSize: 12, lineHeight: 16, color: F.green, ...poppins(600) },
  outletName: { fontSize: 14, lineHeight: 20, color: tw.gray900, marginBottom: 8, ...poppins(600) },
  outletMeta: { fontSize: 12, lineHeight: 16, color: tw.gray600, ...poppins(400) },
  addrLabel: { fontSize: 12, lineHeight: 16, letterSpacing: 0.6, color: tw.gray400, marginBottom: 8, ...poppins(600) },
  addrBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 12, borderRadius: 12, backgroundColor: tw.gray50, borderWidth: 1, borderColor: tw.gray100 },
  addrText: { flex: 1, fontSize: 14, lineHeight: 22.75, color: tw.gray700, ...poppins(400) },

  collRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 8 },
  collIcon: { width: 48, height: 48, borderRadius: 8, backgroundColor: tw.pink100, alignItems: 'center', justifyContent: 'center' },
  collName: { fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(500) },
  collCount: { fontSize: 14, lineHeight: 20, color: tw.gray500, marginTop: 4, ...poppins(400) },
  check: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: tw.green500, backgroundColor: tw.green500, alignItems: 'center', justifyContent: 'center' },

  itemDialog: { width: '100%', maxWidth: 450, backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden', ...shadow('2xl') },
  itemClose: { position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(16,24,40,0.9)', alignItems: 'center', justifyContent: 'center', ...shadow('md') },
  itemDiet: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  itemName: { flex: 1, fontSize: 20, lineHeight: 28, color: tw.gray900, ...poppins(700) },
  itemDesc: { fontSize: 14, lineHeight: 22.75, color: tw.gray600, marginBottom: 16, ...poppins(400) },
  itemNoCoupon: { fontSize: 12, lineHeight: 16, color: tw.gray500, marginBottom: 16, ...poppins(500) },
  variantTitle: { fontSize: 14, lineHeight: 20, color: tw.gray900, marginBottom: 8, ...poppins(600) },
  variant: { borderRadius: 999, borderWidth: 1, borderColor: tw.gray200, backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 6 },
  variantText: { fontSize: 14, lineHeight: 20, color: tw.gray700, ...poppins(500) },
  itemFoot: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: tw.gray200, paddingHorizontal: 12, paddingVertical: 16, backgroundColor: '#fff' },
  itemQty: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 2, borderColor: tw.gray300, borderRadius: 8, paddingHorizontal: 8, height: 44, backgroundColor: '#fff' },
  itemQtyText: { minWidth: 24, textAlign: 'center', fontSize: 18, lineHeight: 28, color: tw.gray900, ...poppins(600) },
  itemAdd: { flex: 1, height: 44, borderRadius: 8, backgroundColor: tw.red500, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 4 },
  itemAddText: { flexShrink: 1, fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(600) },

  optRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 8, paddingVertical: 12, borderRadius: 8 },
  optText: { fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(400) },
  disclaimer: { marginTop: 24, paddingHorizontal: 8, fontSize: 12, lineHeight: 19.5, color: tw.gray500, ...poppins(400) },
  optFssai: { marginTop: 16, paddingHorizontal: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: tw.gray100, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: 0.8, marginBottom: 8 },
  optFssaiLogo: { width: 56, height: 32, backgroundColor: '#fff', borderRadius: 4, padding: 4, borderWidth: 1, borderColor: tw.gray100 },
  optFssaiLabel: { fontSize: 10, lineHeight: 15, letterSpacing: 0.25, color: tw.gray500, ...poppins(500) },
  optFssaiValue: { fontSize: 12, lineHeight: 16, color: tw.gray700, ...poppins(600) },

  shareDialog: { width: '92%', maxWidth: 448, backgroundColor: '#fff', borderRadius: 16, ...shadow('2xl') },
  shareHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: tw.gray200 },
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: tw.gray200 },
  shareRowText: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(500) },

  offersTitle: { fontSize: 20, lineHeight: 28, color: tw.gray900, ...poppins(700) },
  coupon: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, borderWidth: 1, borderColor: tw.gray100, borderRadius: 16, padding: 16, backgroundColor: '#fff', ...shadow('sm') },
  couponTitle: { fontSize: 16, lineHeight: 20, color: tw.gray950, ...poppins(700) },
  couponCode: { fontSize: 12, lineHeight: 16, color: tw.gray500, marginTop: 4, ...poppins(400) },
  copyBox: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderStyle: 'dashed', borderColor: tw.blue200 || '#BEDBFF', backgroundColor: 'rgba(239,246,255,0.5)', borderRadius: 8 },
  copyBoxText: { fontSize: 12, lineHeight: 16, color: tw.blue600 || '#155DFC', ...poppins(700) },

  infoCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: tw.gray100, ...shadow('sm') },
  infoName: { fontSize: 20, lineHeight: 28, color: tw.gray900, ...poppins(700) },
  infoAddress: { fontSize: 14, lineHeight: 22.75, color: tw.gray500, marginTop: 8, paddingBottom: 16, ...poppins(400) },
  infoCall: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, borderTopWidth: 1, borderTopColor: tw.gray100 },
  callBtn: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: tw.red200, backgroundColor: tw.red50, alignItems: 'center', justifyContent: 'center', ...shadow('sm') },
  infoCallTitle: { fontSize: 14, lineHeight: 20, color: tw.gray800, ...poppins(600) },
  infoCallBody: { fontSize: 12, lineHeight: 19.5, color: tw.gray500, marginTop: 2, ...poppins(400) },
  infoLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoLineText: { flex: 1, fontSize: 14, lineHeight: 20, color: tw.gray700, ...poppins(400) },
  legalRow: { paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: tw.gray100 },
  legalLabel: { fontSize: 12, lineHeight: 16, letterSpacing: 0.6, color: tw.gray400, ...poppins(500) },
  legalValue: { fontSize: 16, lineHeight: 24, color: tw.gray900, marginTop: 4, ...poppins(600) },
  fssaiNo: { fontSize: 14, lineHeight: 20, color: tw.gray500, marginTop: 6, ...poppins(500) },
  backToMenu: { marginTop: 32, backgroundColor: F.green, paddingVertical: 14, borderRadius: 12, alignItems: 'center', ...shadow('md') },
  backToMenuText: { fontSize: 16, lineHeight: 24, color: '#fff', ...poppins(700) },
});
