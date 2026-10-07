import { useCallback, useEffect, useState } from 'react';
import { Animated, Image as RNImage, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowDownUp, ArrowRight, Bookmark, Check, Clock, MapPin, Minus, Plus, Share2, Star, Store, Timer, Utensils, Wallet, X } from 'lucide-react-native';
import Image from '../../../components/Img';
import Skeleton from '../../../components/Skeleton';
import { BottomSheet } from '../../../components/kit';
import { Press } from '../../../components/ui';
import { useUnder250Page } from '../../hooks/pages/useUnder250Page';
import { getRestaurantAvailabilityStatus } from '../../utils/restaurantAvailability';
import { getDefaultFoodVariant } from '../../utils/foodVariants';
import { isModuleAuthenticated } from '../../utils/auth';
import { events } from '../../../lib/events';
import { useAnimatedValue } from '../../../lib/useAnimatedValue';
import { useFoodNavScroll } from '../../components/shell';
import { Button, Chip, EmptyState, StatusBadge } from '../../../components/ds';
import { NAV_CLEARANCE } from '../../../components/dh/AppBottomNav';
import { color, elevation, radii, space, type } from '../../../theme';

// Height of the floating Delivery / Takeaway / Under 250 / Dining pill (FoodShell).
const FOOD_TABS_HEIGHT = 72;

/** FSSAI veg mark. */
function VegMark({ size = 14 }) {
  return (
    <View accessibilityLabel="Veg" style={[styles.vegMark, { width: size, height: size }]}>
      <View style={styles.vegDot} />
    </View>
  );
}

const BANNER = require('../../../../assets/food/under250_banner.webp');
const AVATAR = require('../../../../assets/food/profile_avatar.webp');
const G = { filter: 'grayscale(1)' };

function Dots({ count, active, onPress }) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: count }).map((_, i) => (
        <Pressable key={i} onPress={() => onPress(i)} accessibilityLabel={`Go to banner ${i + 1}`} hitSlop={10} style={[styles.dot, active === i ? styles.dotOn : null]} />
      ))}
    </View>
  );
}

/** Port of pages/user/Under250.jsx (the "Under 250" tab). The page logic is hooks/pages/useUnder250Page.js. */
export default function Under250() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  const p = useUnder250Page({ isTabActive: focused });
  const {
    userProfile, activeCategory, setActiveCategory, showSortPopup, setShowSortPopup, selectedSort, draftSelectedSort, setDraftSelectedSort, setSelectedSort,
    under30MinsFilter, setUnder30MinsFilter, showItemDetail, selectedItem, itemDetailQuantity, setItemDetailQuantity, showShareOptions, setShowShareOptions, quantities,
    bookmarkedItems, loadingCategories, bannerImages, currentBannerIndex, setCurrentBannerIndex, setIsTransitionEnabled, isTransitionEnabled, under250PriceLimit,
    under250Restaurants, loadingRestaurants, visibleRestaurantCount, setVisibleRestaurantCount, sortOptions, handleClearAll, handleApply, sortedAndFilteredRestaurants,
    displayCategories, resetBannerAutoSlide, handleBannerTouchStart, handleBannerTouchMove, handleBannerTouchEnd, updateItemQuantity, closeItemDetail, handleItemClick,
    handleBookmarkClick, handleShareItem, handleShareOption, shouldShowGrayscale, getLineItemIdForDish, RUPEE_SYMBOL, UNDER250_LIST_MAX_VISIBLE,
  } = p;

  const onNavScroll = useFoodNavScroll();
  const x = useAnimatedValue(0);
  useEffect(() => {
    Animated.timing(x, { toValue: -currentBannerIndex * (width - space.lg * 2), duration: isTransitionEnabled ? 500 : 0, useNativeDriver: true }).start();
  }, [currentBannerIndex, isTransitionEnabled, width, x]);

  const requireLogin = (href) => {
    if (!isModuleAuthenticated('user')) events.emit('show-login-required');
    else router.push(href);
  };

  const slides = bannerImages.length > 1 ? [...bannerImages, bannerImages[0]] : bannerImages.length > 0 ? bannerImages : [null];
  const activeDot = currentBannerIndex === bannerImages.length ? 0 : currentBannerIndex;
  const bannerW = width - space.lg * 2;
  const bannerH = Math.round(bannerW / 1.8);
  const detailOffline = shouldShowGrayscale || selectedItem?.isRestaurantOffline;
  const defaultVariant = selectedItem ? getDefaultFoodVariant(selectedItem) : null;
  const selectedLine = selectedItem ? getLineItemIdForDish(selectedItem, defaultVariant) : '';

  return (
    <View style={[{ flex: 1, backgroundColor: color.bg }, shouldShowGrayscale ? { opacity: 0.75 } : null]}>
      <View style={styles.header}>
        <View style={{ flexShrink: 1, minWidth: 0 }}>
          <Text style={styles.hKicker}>Budget meals</Text>
          <Text style={styles.hTitle} accessibilityRole="header" numberOfLines={1}>
            UNDER <Text style={styles.hRupee}>{RUPEE_SYMBOL}</Text>
            {under250PriceLimit}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
          <Press scale={0.9} onPress={() => requireLogin('/food/user/wallet')} accessibilityLabel="Wallet" style={styles.hBtn}>
            <Wallet size={22} color={color.textInverse} strokeWidth={2} />
          </Press>
          <Press scale={0.95} onPress={() => requireLogin('/food/user/profile')} accessibilityLabel="Profile" style={styles.avatar}>
            <Image source={userProfile?.profileImage ? { uri: userProfile.profileImage } : AVATAR} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          </Press>
        </View>
      </View>

      <ScrollView onScroll={onNavScroll} scrollEventThrottle={16} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: NAV_CLEARANCE + FOOD_TABS_HEIGHT + space.lg + insets.bottom }}>
        <View style={styles.bannerWrap}>
        <View style={[styles.banner, { height: bannerH }]} onTouchStart={handleBannerTouchStart} onTouchMove={handleBannerTouchMove} onTouchEnd={handleBannerTouchEnd}>
          <Animated.View style={{ flexDirection: 'row', width: bannerW * slides.length, height: '100%', transform: [{ translateX: x }] }}>
            {slides.map((src, i) => (
              <View key={`${i}-${src}`} style={{ width: bannerW, height: '100%' }}>
                {src ? <Image source={{ uri: src }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <RNImage source={BANNER} style={{ width: '100%', height: '100%' }} resizeMode="cover" />}
              </View>
            ))}
          </Animated.View>
          {bannerImages.length > 1 ? (
            <Dots
              count={bannerImages.length}
              active={activeDot}
              onPress={(i) => {
                setIsTransitionEnabled(true);
                setCurrentBannerIndex(i);
                resetBannerAutoSlide();
              }}
            />
          ) : null}
        </View>
        </View>

        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
            <Press scale={0.95} onPress={() => setActiveCategory(null)} accessibilityRole="button" accessibilityState={{ selected: !activeCategory }} accessibilityLabel="All" style={styles.catItem}>
              <View style={[styles.catRing, !activeCategory ? styles.catRingOn : null]}>
                <View style={[styles.catCircle, !activeCategory ? { backgroundColor: color.primary } : { backgroundColor: color.surface }]}>
                  <Utensils size={22} color={!activeCategory ? color.onPrimary : color.textSecondary} />
                </View>
              </View>
              <Text style={[styles.catName, !activeCategory ? styles.catNameOn : null]}>All</Text>
            </Press>
            {loadingCategories
              ? [1, 2, 3, 4, 5, 6].map((i) => (
                  <View key={i} style={styles.catItem}>
                    <Skeleton style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: color.surfaceMuted }} />
                    <Skeleton style={{ width: 48, height: 12, borderRadius: 6, backgroundColor: color.surfaceMuted }} />
                  </View>
                ))
              : displayCategories.map((category) => {
                  const active = activeCategory === category.id;
                  return (
                    <Press key={category.id} scale={0.95} onPress={() => setActiveCategory(active ? null : category.id)} accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={category.name} style={styles.catItem}>
                      <View style={[styles.catRing, active ? styles.catRingOn : null]}>
                        <View style={[styles.catCircle, { backgroundColor: color.surface, overflow: 'hidden' }]}>
                          {category.image ? <Image source={{ uri: category.image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : null}
                        </View>
                      </View>
                      <Text style={[styles.catName, active ? styles.catNameOn : null]} numberOfLines={1}>{category.name}</Text>
                    </Press>
                  );
                })}
          </ScrollView>

          <View style={styles.filters}>
            <Chip
              icon={ArrowDownUp}
              label={selectedSort ? sortOptions.find((o) => o.id === selectedSort)?.label : 'Sort'}
              selected={false}
              onPress={() => setShowSortPopup(true)}
              style={{ height: 40 }}
            />
            <Chip icon={Timer} label="Under 30 mins" selected={under30MinsFilter} onPress={() => setUnder30MinsFilter(!under30MinsFilter)} style={{ height: 40 }} />
          </View>

          {loadingRestaurants && under250Restaurants.length === 0 ? (
            <View style={{ gap: space.xxl, paddingTop: space.lg, paddingHorizontal: space.lg }} accessibilityRole="progressbar" accessibilityLabel="Loading restaurants">
              {[1, 2, 3].map((i) => (
                <View key={i} style={{ gap: space.lg }}>
                  <View style={{ gap: space.sm }}>
                    <Skeleton style={[styles.sk, { height: 20, width: 192 }]} />
                    <View style={{ flexDirection: 'row', gap: space.lg }}>
                      <Skeleton style={[styles.sk, { height: 14, width: 96 }]} />
                      <Skeleton style={[styles.sk, { height: 14, width: 96 }]} />
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: space.md, overflow: 'hidden' }}>
                    {[1, 2, 3, 4].map((j) => (
                      <View key={j} style={styles.skCard}>
                        <Skeleton style={[styles.sk, { height: 120, borderRadius: radii.md }]} />
                        <Skeleton style={[styles.sk, { height: 14, width: '75%' }]} />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: space.sm }}>
                          <Skeleton style={[styles.sk, { height: 18, width: 56 }]} />
                          <Skeleton style={[styles.sk, { height: 32, width: 64 }]} />
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          ) : sortedAndFilteredRestaurants.length === 0 ? (
            <EmptyState
              icon={Store}
              title={under250Restaurants.length === 0 ? `No restaurants with dishes under ${RUPEE_SYMBOL}${under250PriceLimit} found.` : 'No restaurants match the selected filters.'}
            />
          ) : (
            <>
              {sortedAndFilteredRestaurants.slice(0, visibleRestaurantCount).map((restaurant) => {
                const slug = restaurant.slug || restaurant.name.toLowerCase().replace(/\s+/g, '-');
                const offline = !getRestaurantAvailabilityStatus(restaurant).isOpen;
                return (
                  <View key={restaurant.id} style={[styles.rBlock, offline ? { opacity: 0.8 } : null]}>
                    <View style={styles.gutter}>
                      <Text style={styles.rName} numberOfLines={2}>{restaurant.name}</Text>
                      <View style={styles.rMeta}>
                        <View style={styles.m}><Clock size={14} color={color.textSecondary} /><Text style={styles.mText}>{restaurant.deliveryTime}</Text></View>
                        <View style={styles.m}><MapPin size={14} color={color.textSecondary} /><Text style={styles.mText}>{restaurant.distance}</Text></View>
                        <View style={styles.rate}>
                          <Star size={12} color={color.goldText} fill={color.gold} strokeWidth={0} />
                          <Text style={styles.rateText}>{restaurant.rating}</Text>
                        </View>
                        <Text style={styles.cnt}>{restaurant.totalRatings > 0 ? `${restaurant.totalRatings >= 1000 ? `${(restaurant.totalRatings / 1000).toFixed(1)}K` : restaurant.totalRatings}+ ratings` : 'New'}</Text>
                        {offline ? <StatusBadge label="Closed" tone="neutral" icon={Clock} /> : null}
                      </View>
                    </View>

                    {restaurant.menuItems && restaurant.menuItems.length > 0 ? (
                      <View style={{ gap: space.sm, marginTop: space.md }}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.itemsRow}>
                          {restaurant.menuItems.map((item) => {
                            const variant = getDefaultFoodVariant(item);
                            const line = getLineItemIdForDish(item, variant);
                            const quantity = quantities[line] || 0;
                            const isOffline = shouldShowGrayscale || offline;
                            return (
                              <View key={item.id} style={[styles.item, isOffline ? { opacity: 0.75 } : null]}>
                                <Press scale={0.99} onPress={() => handleItemClick(item, restaurant)} accessibilityRole="button" accessibilityLabel={item.name}>
                                  <View style={{ height: 120, backgroundColor: color.surfaceMuted }}>
                                    <Image source={{ uri: item.image }} style={[{ width: '100%', height: '100%' }, isOffline ? G : null]} resizeMode="cover" />
                                  </View>
                                  <View style={styles.itemHead}>
                                    {item.isVeg ? <VegMark size={14} /> : null}
                                    <Text style={styles.iName} numberOfLines={1}>1 x {item.name}</Text>
                                  </View>
                                </Press>
                                <View style={styles.itemFoot}>
                                  <View style={{ flexShrink: 1 }}>
                                    <Text style={styles.price}>{RUPEE_SYMBOL}{Math.round(item.price)}</Text>
                                    {item.bestPrice ? <Text style={styles.best}>Best price</Text> : null}
                                  </View>
                                  {quantity > 0 && !offline ? (
                                    <View style={styles.stepper}>
                                      <Press scale={0.9} onPress={() => updateItemQuantity(item, quantity - 1, null, restaurant.name, variant)} accessibilityLabel={`Remove one ${item.name}`} hitSlop={4} style={styles.sBtn}><Minus size={16} color={color.onPrimary} /></Press>
                                      <Text style={styles.sNum}>{quantity}</Text>
                                      <Press scale={0.9} onPress={() => updateItemQuantity(item, quantity + 1, null, restaurant.name, variant)} accessibilityLabel={`Add one more ${item.name}`} hitSlop={4} style={styles.sBtn}><Plus size={16} color={color.onPrimary} /></Press>
                                    </View>
                                  ) : (
                                    <Press scale={0.95} disabled={isOffline} onPress={() => !isOffline && updateItemQuantity(item, 1, null, restaurant.name, variant)} accessibilityLabel={`Add ${item.name}`} hitSlop={4} style={[styles.add, isOffline ? styles.addOff : null]}>
                                      <Text style={[styles.addText, isOffline ? { color: color.textDisabled } : null]}>Add</Text>
                                      <Plus size={14} color={isOffline ? color.textDisabled : color.primary} strokeWidth={2.75} />
                                    </Press>
                                  )}
                                </View>
                              </View>
                            );
                          })}
                        </ScrollView>

                        <Press scale={0.97} onPress={() => router.push(`/food/user/restaurants/${slug}?under250=true`)} accessibilityRole="button" accessibilityLabel="View full menu" style={styles.full}>
                          <Text style={styles.fullText}>View full menu</Text>
                          <ArrowRight size={16} color={color.primary} />
                        </Press>
                      </View>
                    ) : null}
                  </View>
                );
              })}
              {visibleRestaurantCount < sortedAndFilteredRestaurants.length ? (
                <View style={{ alignItems: 'center', paddingVertical: space.xxl }}>
                  <Button title="Show more restaurants" variant="outline" size="sm" fullWidth={false} onPress={() => setVisibleRestaurantCount((n) => n + UNDER250_LIST_MAX_VISIBLE)} />
                </View>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>

      <Modal visible={showSortPopup} transparent animationType="fade" onRequestClose={() => setShowSortPopup(false)} statusBarTranslucent>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowSortPopup(false)} accessibilityLabel="Close" />
          <View style={styles.sortCard}>
            <View style={styles.sortHead}>
              <Text style={styles.sortTitle} accessibilityRole="header">Sort by</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Press scale={0.96} onPress={handleClearAll} accessibilityLabel="Clear all" style={styles.clearBtn}><Text style={styles.clear}>Clear all</Text></Press>
                <Press scale={0.9} onPress={() => setShowSortPopup(false)} accessibilityLabel="Close" style={styles.xBtn}><X size={20} color={color.text} /></Press>
              </View>
            </View>
            <View style={{ padding: space.lg, gap: space.sm }}>
              {sortOptions.map((o) => {
                const on = selectedSort === o.id;
                return (
                  <Press
                    key={o.id || 'relevance'}
                    scale={0.98}
                    onPress={() => {
                      setDraftSelectedSort(o.id);
                      setSelectedSort(o.id);
                      setShowSortPopup(false);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={o.label}
                    style={[styles.opt, on ? styles.optOn : null]}
                  >
                    <Text style={[styles.optText, on ? { color: color.primary, fontFamily: 'Poppins_600SemiBold' } : null]}>{o.label}</Text>
                    {on ? (
                      <View style={styles.check}><Check size={14} color={color.onPrimary} /></View>
                    ) : null}
                  </Press>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', gap: space.md, paddingHorizontal: space.lg, paddingBottom: space.lg }}>
              <Button title="Close" variant="outline" onPress={() => setShowSortPopup(false)} style={{ flex: 1 }} />
              <Button title="Apply" onPress={handleApply} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      <BottomSheet visible={Boolean(showItemDetail && selectedItem)} onClose={closeItemDetail} backdrop={color.overlay} spring={{ stiffness: 400, damping: 30 }} panelStyle={styles.detail}>
        {selectedItem ? (
          <>
            <View style={[{ height: 240, overflow: 'hidden', borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, backgroundColor: color.surfaceMuted }, detailOffline ? { opacity: 0.75 } : null]}>
              <Image source={{ uri: selectedItem.image }} style={[{ width: '100%', height: '100%' }, detailOffline ? G : null]} resizeMode="cover" />
              <View style={styles.dActions}>
                <Press scale={0.9} onPress={() => handleBookmarkClick(selectedItem.id)} accessibilityLabel="Bookmark" accessibilityState={{ selected: bookmarkedItems.has(selectedItem.id) }} style={[styles.dBtn, bookmarkedItems.has(selectedItem.id) ? { backgroundColor: color.primary } : null]}>
                  <Bookmark size={20} color={bookmarkedItems.has(selectedItem.id) ? color.onPrimary : color.text} fill={bookmarkedItems.has(selectedItem.id) ? color.onPrimary : 'none'} />
                </Press>
                <Press scale={0.9} onPress={() => handleShareItem(selectedItem)} accessibilityLabel="Share" style={styles.dBtn}>
                  <Share2 size={20} color={color.text} />
                </Press>
              </View>
              <Press scale={0.9} onPress={closeItemDetail} accessibilityLabel="Close" style={styles.dClose}><X size={20} color={color.textInverse} /></Press>
            </View>
            <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ padding: space.lg }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, marginBottom: space.md }}>
                {selectedItem.isVeg ? (
                  <View style={{ marginTop: 5 }}>
                    <VegMark size={18} />
                  </View>
                ) : null}
                <Text style={styles.dName} accessibilityRole="header">{selectedItem.name}</Text>
              </View>
              <Text style={styles.dDesc}>{selectedItem.description || `${selectedItem.name} from ${selectedItem.restaurant || 'Under 250'}`}</Text>
              {selectedItem.customisable ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.lg }}>
                  <View style={{ flex: 1, height: 4, backgroundColor: color.surfaceMuted, borderRadius: 2, overflow: 'hidden' }}>
                    <View style={{ height: '100%', width: '50%', backgroundColor: color.gold }} />
                  </View>
                  <Text style={{ ...type.caption, color: color.textSecondary }}>Highly reordered</Text>
                </View>
              ) : null}
              {selectedItem.notEligibleForCoupons ? <StatusBadge label="Not eligible for coupons" tone="neutral" style={{ marginBottom: space.lg }} /> : null}
            </ScrollView>
            <View style={[styles.bar, { paddingBottom: space.lg + insets.bottom }]}>
              {selectedItem.isRestaurantOffline ? <Text style={styles.closedMsg}>Restaurant is currently closed and not accepting orders.</Text> : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                <View style={[styles.dq, detailOffline ? { opacity: 0.5 } : null]}>
                  <Press scale={0.9} disabled={itemDetailQuantity <= 1 || detailOffline} onPress={() => setItemDetailQuantity((q) => Math.max(1, q - 1))} accessibilityLabel="Decrease" style={styles.dqBtn}><Minus size={20} color={itemDetailQuantity <= 1 || detailOffline ? color.textDisabled : color.primary} /></Press>
                  <Text style={[styles.dqNum, detailOffline ? { color: color.textDisabled } : null]}>{itemDetailQuantity}</Text>
                  <Press scale={0.9} disabled={detailOffline} onPress={() => setItemDetailQuantity((q) => q + 1)} accessibilityLabel="Increase" style={styles.dqBtn}><Plus size={20} color={detailOffline ? color.textDisabled : color.primary} /></Press>
                </View>
                <Press
                  scale={0.98}
                  disabled={detailOffline}
                  onPress={() => {
                    if (detailOffline) return;
                    updateItemQuantity(selectedItem, itemDetailQuantity, null, selectedItem.restaurant, defaultVariant);
                    closeItemDetail();
                  }}
                  accessibilityLabel={quantities[selectedLine] > 0 ? 'Update item' : 'Add item'}
                  accessibilityState={{ disabled: !!detailOffline }}
                  style={[styles.addBig, detailOffline ? { backgroundColor: color.surfaceMuted } : null]}
                >
                  <Text style={[styles.addBigText, detailOffline ? { color: color.textMuted } : null]} numberOfLines={1}>{quantities[selectedLine] > 0 ? 'Update item' : 'Add item'}</Text>
                  <Text style={[styles.addBigText, { fontFamily: 'Poppins_700Bold' }, detailOffline ? { color: color.textMuted } : null]}>{RUPEE_SYMBOL}{Math.round((defaultVariant?.price ?? selectedItem.price) * itemDetailQuantity)}</Text>
                </Press>
                {quantities[selectedLine] > 0 ? (
                  <Press
                    scale={0.97}
                    onPress={() => {
                      if (detailOffline) return;
                      updateItemQuantity(selectedItem, 0, null, selectedItem.restaurant, defaultVariant);
                      closeItemDetail();
                    }}
                    accessibilityLabel="Remove"
                    style={styles.remove}
                  >
                    <Text style={styles.removeText}>Remove</Text>
                  </Press>
                ) : null}
              </View>
            </View>
          </>
        ) : null}
      </BottomSheet>

      <BottomSheet visible={Boolean(showShareOptions && selectedItem)} onClose={() => setShowShareOptions(false)} backdrop={color.overlay} spring={{ stiffness: 320, damping: 28 }} panelStyle={[styles.share, { paddingBottom: space.lg + insets.bottom }]}>
        <View style={{ alignItems: 'center', paddingBottom: space.md }}>
          <View style={{ width: 48, height: 4, borderRadius: 2, backgroundColor: color.borderStrong }} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: space.md }}>
          <Text style={{ ...type.subheading, color: color.text }} accessibilityRole="header">Share dish</Text>
          <Press scale={0.96} onPress={() => setShowShareOptions(false)} accessibilityLabel="Close" style={styles.clearBtn}><Text style={styles.clear}>Close</Text></Press>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
          {[
            { id: 'whatsapp', label: 'WhatsApp' },
            { id: 'telegram', label: 'Telegram' },
            { id: 'sms', label: 'SMS' },
            { id: 'email', label: 'Email' },
            { id: 'copy', label: 'Copy Link' },
          ].map((o) => (
            <Press key={o.id} scale={0.97} onPress={() => handleShareOption(o.id)} accessibilityLabel={o.label} style={styles.shareOpt}>
              <Text style={{ ...type.bodyStrong, color: color.text }}>{o.label}</Text>
            </Press>
          ))}
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, paddingLeft: space.lg, paddingRight: space.md, paddingVertical: space.md, backgroundColor: color.primaryDeep, borderBottomLeftRadius: radii.xl, borderBottomRightRadius: radii.xl, ...elevation.card },
  hKicker: { ...type.overline, color: color.textOnDarkMuted },
  hTitle: { ...type.heroSerif, color: color.goldOnDark },
  hRupee: { fontFamily: 'Poppins_700Bold', letterSpacing: 0 },
  hBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: color.gold, backgroundColor: color.goldSoft, overflow: 'hidden' },
  bannerWrap: { paddingHorizontal: space.lg, paddingTop: space.lg },
  banner: { borderRadius: radii.lg, overflow: 'hidden', backgroundColor: color.surfaceMuted, borderWidth: 1, borderColor: color.border },
  dots: { position: 'absolute', bottom: space.md, right: space.md, flexDirection: 'row', alignItems: 'center', gap: space.xs + 2 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.55)' },
  dotOn: { width: 20, backgroundColor: color.surface },
  catRow: { gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.sm },
  catItem: { width: 72, alignItems: 'center', gap: space.xs + 2 },
  catRing: { padding: 2, borderRadius: 34, borderWidth: 2, borderColor: 'transparent' },
  catRingOn: { borderColor: color.primary },
  catCircle: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: color.border },
  catName: { ...type.caption, color: color.text, textAlign: 'center', alignSelf: 'stretch' },
  catNameOn: { color: color.primary, fontFamily: 'Poppins_700Bold' },
  filters: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.sm, flexWrap: 'wrap' },
  sk: { backgroundColor: color.surfaceMuted, borderRadius: radii.sm },
  skCard: { width: 184, height: 240, backgroundColor: color.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, padding: space.md, gap: space.md },
  rBlock: { paddingTop: space.xxl },
  gutter: { paddingHorizontal: space.lg },
  rName: { ...type.heading, color: color.text },
  rMeta: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap', marginTop: space.xs },
  m: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  mText: { ...type.caption, color: color.textSecondary },
  rate: { flexDirection: 'row', alignItems: 'center', gap: space.xs, height: 24, paddingHorizontal: space.sm, borderRadius: radii.pill, backgroundColor: color.goldSoft },
  rateText: { ...type.caption, fontFamily: 'Poppins_600SemiBold', color: color.goldText },
  cnt: { ...type.caption, color: color.textMuted },
  itemsRow: { gap: space.md, paddingHorizontal: space.lg, paddingBottom: space.sm },
  item: { width: 184, backgroundColor: color.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, overflow: 'hidden', ...elevation.card },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2, paddingHorizontal: space.md, paddingTop: space.sm + 2 },
  itemFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, paddingHorizontal: space.md, paddingTop: space.xs, paddingBottom: space.md },
  vegMark: { borderWidth: 1.5, borderRadius: 3, borderColor: color.veg, backgroundColor: color.surface, padding: 2 },
  vegDot: { flex: 1, borderRadius: radii.pill, backgroundColor: color.veg },
  iName: { flexShrink: 1, ...type.bodyStrong, color: color.text },
  price: { ...type.bodyStrong, fontSize: 15, color: color.text },
  best: { ...type.caption, color: color.textMuted },
  stepper: { flexDirection: 'row', alignItems: 'center', height: 36, backgroundColor: color.primary, borderRadius: radii.md },
  sBtn: { width: 32, height: '100%', alignItems: 'center', justifyContent: 'center' },
  sNum: { minWidth: 18, textAlign: 'center', ...type.label, color: color.onPrimary },
  add: { flexDirection: 'row', alignItems: 'center', gap: space.xs, height: 36, paddingHorizontal: space.md, borderRadius: radii.md, borderWidth: 1.5, borderColor: color.primary, backgroundColor: color.surface },
  addOff: { borderColor: color.border, backgroundColor: color.surfaceMuted },
  addText: { ...type.label, color: color.primary },
  full: { marginHorizontal: space.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, height: 44, borderRadius: radii.md, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border },
  fullText: { ...type.label, color: color.primary },
  overlay: { flex: 1, backgroundColor: color.overlay, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg },
  sortCard: { width: '100%', maxWidth: 384, backgroundColor: color.surface, borderRadius: radii.lg, overflow: 'hidden', ...elevation.sheet },
  sortHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: space.lg, paddingRight: space.xs, paddingVertical: space.xs, borderBottomWidth: 1, borderBottomColor: color.border },
  sortTitle: { ...type.heading, color: color.text },
  clearBtn: { minHeight: 44, paddingHorizontal: space.sm, justifyContent: 'center' },
  clear: { ...type.label, color: color.primary },
  xBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  opt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, paddingHorizontal: space.lg, borderRadius: radii.md, borderWidth: 1, borderColor: color.border },
  optOn: { borderColor: color.primary, backgroundColor: color.primarySoft },
  optText: { ...type.body, color: color.text },
  check: { width: 22, height: 22, borderRadius: 11, backgroundColor: color.primary, alignItems: 'center', justifyContent: 'center' },
  detail: { backgroundColor: color.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, maxHeight: '90%' },
  dActions: { position: 'absolute', bottom: space.lg, right: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.md },
  dBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center', ...elevation.card },
  dClose: { position: 'absolute', top: space.md, alignSelf: 'center', width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(17,17,17,0.72)', alignItems: 'center', justifyContent: 'center' },
  dName: { flex: 1, ...type.heading, color: color.text },
  dDesc: { ...type.body, color: color.textSecondary, marginBottom: space.lg },
  bar: { borderTopWidth: 1, borderTopColor: color.border, paddingHorizontal: space.lg, paddingTop: space.lg, backgroundColor: color.surface },
  closedMsg: { ...type.label, color: color.warning, marginBottom: space.md, textAlign: 'center' },
  dq: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: color.border, borderRadius: radii.md, height: 48 },
  dqBtn: { width: 44, height: '100%', alignItems: 'center', justifyContent: 'center' },
  dqNum: { minWidth: 28, textAlign: 'center', ...type.subheading, color: color.text },
  addBig: { flex: 1, height: 48, borderRadius: radii.md, backgroundColor: color.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, paddingHorizontal: space.sm },
  addBigText: { flexShrink: 1, ...type.button, fontSize: 14, color: color.onPrimary },
  remove: { height: 48, paddingHorizontal: space.md, borderRadius: radii.md, borderWidth: 1.5, borderColor: color.borderStrong, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surface },
  removeText: { ...type.label, color: color.textSecondary },
  share: { backgroundColor: color.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, paddingHorizontal: space.lg, paddingTop: space.lg },
  shareOpt: { width: '47%', flexGrow: 1, minHeight: 48, justifyContent: 'center', borderRadius: radii.md, borderWidth: 1, borderColor: color.border, paddingHorizontal: space.lg },
});
