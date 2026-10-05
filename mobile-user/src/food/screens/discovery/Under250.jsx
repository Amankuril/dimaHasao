import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Image as RNImage, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowDownUp, ArrowRight, Bookmark, Check, ChevronDown, Clock, MapPin, Minus, Plus, Share2, Star, Timer, Utensils, Wallet, X } from 'lucide-react-native';
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
import { F, useFoodNavScroll } from '../../components/shell';
import { poppins, tw } from '../../../theme';

const BANNER = require('../../../../assets/food/under250_banner.jpg');
const AVATAR = require('../../../../assets/food/profile_avatar.webp');
const G = { filter: 'grayscale(1)' };

function Dots({ count, active, onPress }) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: count }).map((_, i) => (
        <Pressable key={i} onPress={() => onPress(i)} accessibilityLabel={`Go to banner ${i + 1}`} hitSlop={6} style={[styles.dot, active === i ? styles.dotOn : null]} />
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
    Animated.timing(x, { toValue: -currentBannerIndex * width, duration: isTransitionEnabled ? 500 : 0, useNativeDriver: true }).start();
  }, [currentBannerIndex, isTransitionEnabled, width, x]);

  const requireLogin = (href) => {
    if (!isModuleAuthenticated('user')) events.emit('show-login-required');
    else router.push(href);
  };

  const slides = bannerImages.length > 1 ? [...bannerImages, bannerImages[0]] : bannerImages.length > 0 ? bannerImages : [null];
  const activeDot = currentBannerIndex === bannerImages.length ? 0 : currentBannerIndex;
  const bannerH = 210;
  const detailOffline = shouldShowGrayscale || selectedItem?.isRestaurantOffline;
  const defaultVariant = selectedItem ? getDefaultFoodVariant(selectedItem) : null;
  const selectedLine = selectedItem ? getLineItemIdForDish(selectedItem, defaultVariant) : '';

  return (
    <View style={[{ flex: 1, backgroundColor: '#fff' }, shouldShowGrayscale ? { opacity: 0.75 } : null]}>
      <ScrollView onScroll={onNavScroll} scrollEventThrottle={16} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 176 + insets.bottom }}>
        <View style={{ height: bannerH, overflow: 'hidden' }} onTouchStart={handleBannerTouchStart} onTouchMove={handleBannerTouchMove} onTouchEnd={handleBannerTouchEnd}>
          <Animated.View style={{ flexDirection: 'row', width: width * slides.length, height: '100%', transform: [{ translateX: x }] }}>
            {slides.map((src, i) => (
              <View key={`${i}-${src}`} style={{ width, height: '100%' }}>
                {src ? <Image source={{ uri: src }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <RNImage source={BANNER} style={{ width: '100%', height: '100%' }} resizeMode="cover" />}
              </View>
            ))}
          </Animated.View>
          <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0.1)', 'transparent']} style={StyleSheet.absoluteFill} />
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

        <View style={{ paddingHorizontal: 12, paddingTop: 8 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 8, paddingVertical: 8 }}>
            <Press scale={0.95} onPress={() => setActiveCategory(null)} accessibilityLabel="All" style={styles.catItem}>
              {!activeCategory ? (
                <View style={styles.catRing}>
                  <LinearGradient colors={[F.green, F.greenDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.catCircle}>
                    <Utensils size={24} color="#fff" />
                  </LinearGradient>
                </View>
              ) : (
                <View style={[styles.catCircle, { backgroundColor: '#fff', borderWidth: 1, borderColor: tw.gray200 }]}>
                  <Utensils size={24} color={tw.gray700} />
                </View>
              )}
              <Text style={[styles.catName, { ...poppins(700) }, !activeCategory ? { color: F.green } : null]}>All</Text>
            </Press>
            {loadingCategories
              ? [1, 2, 3, 4, 5, 6].map((i) => (
                  <View key={i} style={styles.catItem}>
                    <Skeleton style={{ width: 56, height: 56, borderRadius: 28 }} />
                    <Skeleton style={{ width: 48, height: 14, borderRadius: 4 }} />
                  </View>
                ))
              : displayCategories.map((category) => {
                  const active = activeCategory === category.id;
                  return (
                    <Press key={category.id} scale={0.95} onPress={() => setActiveCategory(active ? null : category.id)} accessibilityLabel={category.name} style={styles.catItem}>
                      <View style={active ? styles.catRing : null}>
                        <View style={[styles.catCircle, { backgroundColor: '#fff', overflow: 'hidden', ...{ boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' } }]}>
                          {category.image ? <Image source={{ uri: category.image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : null}
                        </View>
                      </View>
                      <Text style={[styles.catName, active ? { color: F.green } : null]}>{category.name.length > 7 ? `${category.name.slice(0, 7)}...` : category.name}</Text>
                    </Press>
                  );
                })}
          </ScrollView>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 }}>
            <Press scale={0.97} onPress={() => setShowSortPopup(true)} accessibilityLabel="Sort" style={[styles.pill]}>
              <ArrowDownUp size={16} color={tw.gray700} style={{ transform: [{ rotate: '90deg' }] }} />
              <Text style={[styles.pillText, { color: tw.gray700 }]}>{selectedSort ? sortOptions.find((o) => o.id === selectedSort)?.label : 'Sort'}</Text>
              <ChevronDown size={12} color={tw.gray700} />
            </Press>
            <Press scale={0.97} onPress={() => setUnder30MinsFilter(!under30MinsFilter)} accessibilityRole="checkbox" accessibilityState={{ checked: under30MinsFilter }} accessibilityLabel="Under 30 mins" style={[styles.pill, under30MinsFilter ? { backgroundColor: F.green, borderColor: F.green } : null]}>
              <Timer size={12} color={under30MinsFilter ? '#fff' : tw.gray600} />
              <Text style={[styles.pillText, { color: under30MinsFilter ? '#fff' : tw.gray600 }]}>Under 30 mins</Text>
            </Press>
          </View>

          {loadingRestaurants && under250Restaurants.length === 0 ? (
            <View style={{ gap: 32, paddingTop: 16 }}>
              {[1, 2, 3].map((i) => (
                <View key={i} style={{ gap: 16 }}>
                  <View style={{ gap: 8 }}>
                    <Skeleton style={{ height: 24, width: 192, borderRadius: 8 }} />
                    <View style={{ flexDirection: 'row', gap: 16 }}>
                      <Skeleton style={{ height: 16, width: 96, borderRadius: 4 }} />
                      <Skeleton style={{ height: 16, width: 96, borderRadius: 4 }} />
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 16, overflow: 'hidden' }}>
                    {[1, 2, 3, 4].map((j) => (
                      <View key={j} style={styles.skCard}>
                        <Skeleton style={{ height: 128, borderRadius: 8 }} />
                        <Skeleton style={{ height: 16, width: '75%', borderRadius: 4 }} />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8 }}>
                          <Skeleton style={{ height: 20, width: 64, borderRadius: 4 }} />
                          <Skeleton style={{ height: 32, width: 64, borderRadius: 4 }} />
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          ) : sortedAndFilteredRestaurants.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <Text style={{ color: tw.gray500, textAlign: 'center', fontSize: 16, lineHeight: 24, ...poppins(400) }}>
                {under250Restaurants.length === 0 ? `No restaurants with dishes under ${RUPEE_SYMBOL}${under250PriceLimit} found.` : 'No restaurants match the selected filters.'}
              </Text>
            </View>
          ) : (
            <>
              {sortedAndFilteredRestaurants.slice(0, visibleRestaurantCount).map((restaurant) => {
                const slug = restaurant.slug || restaurant.name.toLowerCase().replace(/\s+/g, '-');
                const offline = !getRestaurantAvailabilityStatus(restaurant).isOpen;
                return (
                  <View key={restaurant.id} style={[{ paddingTop: 16 }, offline ? { opacity: 0.8 } : null]}>
                    <Text style={styles.rName}>{restaurant.name}</Text>
                    <View style={styles.rMeta}>
                      <View style={styles.m}><Clock size={14} color={tw.gray500} strokeWidth={2.5} /><Text style={styles.mText}>{restaurant.deliveryTime}</Text></View>
                      <View style={styles.m}><MapPin size={14} color={tw.gray500} strokeWidth={2.5} /><Text style={styles.mText}>{restaurant.distance}</Text></View>
                      <View style={styles.rate}>
                        <Star size={12} color="#fff" fill="#fff" />
                        <Text style={styles.rateText}>{restaurant.rating}</Text>
                      </View>
                      <View style={{ width: 1, height: 16, backgroundColor: tw.gray200 }} />
                      <Text style={styles.cnt}>{restaurant.totalRatings > 0 ? `${restaurant.totalRatings >= 1000 ? `${(restaurant.totalRatings / 1000).toFixed(1)}K` : restaurant.totalRatings}+ Ratings` : 'New'}</Text>
                    </View>

                    {restaurant.menuItems && restaurant.menuItems.length > 0 ? (
                      <View style={{ gap: 8, marginTop: 12 }}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 8 }}>
                          {restaurant.menuItems.map((item) => {
                            const variant = getDefaultFoodVariant(item);
                            const line = getLineItemIdForDish(item, variant);
                            const quantity = quantities[line] || 0;
                            const isOffline = shouldShowGrayscale || offline;
                            return (
                              <Press key={item.id} scale={0.99} onPress={() => handleItemClick(item, restaurant)} accessibilityLabel={item.name} style={[styles.item, isOffline ? { opacity: 0.75 } : null]}>
                                <View style={{ height: 128, backgroundColor: tw.gray100 }}>
                                  <Image source={{ uri: item.image }} style={[{ width: '100%', height: '100%' }, isOffline ? G : null]} resizeMode="cover" />
                                  {item.isVeg ? (
                                    <View style={styles.vegOuter}>
                                      <View style={styles.vegDot} />
                                    </View>
                                  ) : null}
                                </View>
                                <View style={{ padding: 12 }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                                    {item.isVeg ? (
                                      <View style={styles.vegSmall}>
                                        <View style={[styles.vegDot, { width: 6, height: 6 }]} />
                                      </View>
                                    ) : null}
                                    <Text style={styles.iName} numberOfLines={1}>1 x {item.name}</Text>
                                  </View>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <View>
                                      <Text style={styles.price}>{RUPEE_SYMBOL}{Math.round(item.price)}</Text>
                                      {item.bestPrice ? <Text style={styles.best}>Best price</Text> : null}
                                    </View>
                                    {quantity > 0 && !offline ? (
                                      <View style={styles.stepper}>
                                        <Press scale={0.9} onPress={() => updateItemQuantity(item, quantity - 1, null, restaurant.name, variant)} accessibilityLabel="Decrease" style={styles.sBtn}><Minus size={14} color="#fff" /></Press>
                                        <Text style={styles.sNum}>{quantity}</Text>
                                        <Press scale={0.9} onPress={() => updateItemQuantity(item, quantity + 1, null, restaurant.name, variant)} accessibilityLabel="Increase" style={styles.sBtn}><Plus size={14} color="#fff" /></Press>
                                      </View>
                                    ) : (
                                      <Press scale={0.95} disabled={isOffline} onPress={() => !isOffline && updateItemQuantity(item, 1, null, restaurant.name, variant)} accessibilityLabel={`Add ${item.name}`} style={[styles.add, isOffline ? { backgroundColor: tw.gray100, opacity: 0.5 } : null]}>
                                        <Text style={[styles.addText, isOffline ? { color: tw.gray400 } : null]}>Add</Text>
                                      </Press>
                                    )}
                                  </View>
                                </View>
                              </Press>
                            );
                          })}
                        </ScrollView>

                        <Press scale={0.97} onPress={() => router.push(`/food/user/restaurants/${slug}?under250=true`)} accessibilityLabel="View full menu" style={styles.full}>
                          <Text style={styles.fullText}>View full menu</Text>
                          <ArrowRight size={16} color={tw.gray700} />
                        </Press>
                      </View>
                    ) : null}
                  </View>
                );
              })}
              {visibleRestaurantCount < sortedAndFilteredRestaurants.length ? (
                <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                  <Press scale={0.97} onPress={() => setVisibleRestaurantCount((n) => n + UNDER250_LIST_MAX_VISIBLE)} accessibilityLabel="Show more restaurants" style={styles.more}>
                    <Text style={styles.moreText}>Show more restaurants</Text>
                  </Press>
                </View>
              ) : (
                <View style={{ height: 96 }} />
              )}
            </>
          )}
        </View>
      </ScrollView>

      <View style={styles.header}>
        <View style={{ flexShrink: 1 }}>
          <Text style={styles.hKicker}>BUDGET MEALS</Text>
          <Text style={styles.hTitle}>Under {RUPEE_SYMBOL}{under250PriceLimit}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Press scale={0.9} onPress={() => requireLogin('/food/user/wallet')} accessibilityLabel="Wallet" style={{ padding: 6 }}>
            <Wallet size={26} color="#fff" strokeWidth={2.2} />
          </Press>
          <Press scale={0.95} onPress={() => requireLogin('/food/user/profile')} accessibilityLabel="Profile" style={styles.avatar}>
            <Image source={userProfile?.profileImage ? { uri: userProfile.profileImage } : AVATAR} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          </Press>
        </View>
      </View>

      <Modal visible={showSortPopup} transparent animationType="fade" onRequestClose={() => setShowSortPopup(false)} statusBarTranslucent>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowSortPopup(false)} accessibilityLabel="Close" />
          <View style={styles.sortCard}>
            <View style={styles.sortHead}>
              <Text style={styles.sortTitle}>Sort By</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Press scale={0.96} onPress={handleClearAll} accessibilityLabel="Clear all"><Text style={styles.clear}>Clear all</Text></Press>
                <Press scale={0.9} onPress={() => setShowSortPopup(false)} accessibilityLabel="Close" style={styles.xBtn}><X size={20} color={tw.gray700} /></Press>
              </View>
            </View>
            <View style={{ paddingHorizontal: 20, paddingVertical: 16, gap: 12 }}>
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
                    accessibilityLabel={o.label}
                    style={[styles.opt, on ? { borderColor: F.green, backgroundColor: '#fdfafc' } : null]}
                  >
                    <Text style={[styles.optText, on ? { color: F.green } : null]}>{o.label}</Text>
                    {on ? (
                      <View style={styles.check}><Check size={12} color="#fff" /></View>
                    ) : null}
                  </Press>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingBottom: 20 }}>
              <Press scale={0.98} onPress={() => setShowSortPopup(false)} accessibilityLabel="Close" style={[styles.fBtn, { backgroundColor: tw.gray800 }]}><Text style={[styles.fText, { color: '#fff', ...poppins(700) }]}>Close</Text></Press>
              <Press scale={0.98} onPress={handleApply} accessibilityLabel="Apply" style={[styles.fBtn, { backgroundColor: F.green }]}><Text style={[styles.fText, { color: '#fff' }]}>Apply</Text></Press>
            </View>
          </View>
        </View>
      </Modal>

      <BottomSheet visible={Boolean(showItemDetail && selectedItem)} onClose={closeItemDetail} backdrop="rgba(0,0,0,0.4)" spring={{ stiffness: 400, damping: 30 }} panelStyle={styles.detail}>
        {selectedItem ? (
          <>
            <View style={[{ height: 256, overflow: 'hidden', borderTopLeftRadius: 24, borderTopRightRadius: 24 }, detailOffline ? { opacity: 0.75 } : null]}>
              <Image source={{ uri: selectedItem.image }} style={[{ width: '100%', height: '100%' }, detailOffline ? G : null]} resizeMode="cover" />
              <View style={styles.dActions}>
                <Press scale={0.9} onPress={() => handleBookmarkClick(selectedItem.id)} accessibilityLabel="Bookmark" style={[styles.dBtn, bookmarkedItems.has(selectedItem.id) ? { borderColor: tw.red500, backgroundColor: tw.red50 } : null]}>
                  <Bookmark size={20} color={bookmarkedItems.has(selectedItem.id) ? tw.red500 : tw.gray600} fill={bookmarkedItems.has(selectedItem.id) ? tw.red500 : 'none'} />
                </Press>
                <Press scale={0.9} onPress={() => handleShareItem(selectedItem)} accessibilityLabel="Share" style={styles.dBtn}>
                  <Share2 size={20} color={tw.gray600} />
                </Press>
              </View>
              <Press scale={0.9} onPress={closeItemDetail} accessibilityLabel="Close" style={styles.dClose}><X size={20} color="#fff" /></Press>
            </View>
            <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                {selectedItem.isVeg ? (
                  <View style={styles.vegBig}><View style={[styles.vegDot, { width: 10, height: 10 }]} /></View>
                ) : null}
                <Text style={styles.dName}>{selectedItem.name}</Text>
              </View>
              <Text style={styles.dDesc}>{selectedItem.description || `${selectedItem.name} from ${selectedItem.restaurant || 'Under 250'}`}</Text>
              {selectedItem.customisable ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <View style={{ flex: 1, height: 2, backgroundColor: tw.gray200, borderRadius: 1, overflow: 'hidden' }}>
                    <View style={{ height: '100%', width: '50%', backgroundColor: F.green }} />
                  </View>
                  <Text style={{ fontSize: 12, lineHeight: 16, color: tw.gray600, ...poppins(500) }}>highly reordered</Text>
                </View>
              ) : null}
              {selectedItem.notEligibleForCoupons ? <Text style={{ fontSize: 12, lineHeight: 16, color: tw.gray500, marginBottom: 16, ...poppins(500) }}>NOT ELIGIBLE FOR COUPONS</Text> : null}
            </ScrollView>
            <View style={[styles.bar, { paddingBottom: 16 + insets.bottom }]}>
              {selectedItem.isRestaurantOffline ? <Text style={styles.closedMsg}>Restaurant is currently closed and not accepting orders.</Text> : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <View style={[styles.dq, detailOffline ? { opacity: 0.5 } : null]}>
                  <Press scale={0.9} disabled={itemDetailQuantity <= 1 || detailOffline} onPress={() => setItemDetailQuantity((q) => Math.max(1, q - 1))} accessibilityLabel="Decrease"><Minus size={20} color={itemDetailQuantity <= 1 || detailOffline ? tw.gray300 : tw.gray600} /></Press>
                  <Text style={[styles.dqNum, detailOffline ? { color: tw.gray400 } : null]}>{itemDetailQuantity}</Text>
                  <Press scale={0.9} disabled={detailOffline} onPress={() => setItemDetailQuantity((q) => q + 1)} accessibilityLabel="Increase"><Plus size={20} color={detailOffline ? tw.gray300 : tw.gray600} /></Press>
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
                  style={[styles.addBig, detailOffline ? { backgroundColor: tw.gray300, opacity: 0.5 } : null]}
                >
                  <Text style={[styles.addBigText, detailOffline ? { color: tw.gray500 } : null]}>{quantities[selectedLine] > 0 ? 'Update item' : 'Add item'}</Text>
                  <Text style={[styles.addBigText, { fontSize: 16, ...poppins(700) }, detailOffline ? { color: tw.gray500 } : null]}>{RUPEE_SYMBOL}{Math.round((defaultVariant?.price ?? selectedItem.price) * itemDetailQuantity)}</Text>
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

      <BottomSheet visible={Boolean(showShareOptions && selectedItem)} onClose={() => setShowShareOptions(false)} backdrop="rgba(0,0,0,0.4)" spring={{ stiffness: 320, damping: 28 }} panelStyle={[styles.share, { paddingBottom: 16 + insets.bottom }]}>
        <View style={{ alignItems: 'center', paddingBottom: 12 }}>
          <View style={{ width: 48, height: 4, borderRadius: 2, backgroundColor: tw.gray300 }} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16 }}>
          <Text style={{ fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(600) }}>Share dish</Text>
          <Press scale={0.96} onPress={() => setShowShareOptions(false)} accessibilityLabel="Close"><Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray500, ...poppins(500) }}>Close</Text></Press>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {[
            { id: 'whatsapp', label: 'WhatsApp' },
            { id: 'telegram', label: 'Telegram' },
            { id: 'sms', label: 'SMS' },
            { id: 'email', label: 'Email' },
            { id: 'copy', label: 'Copy Link' },
          ].map((o) => (
            <Press key={o.id} scale={0.97} onPress={() => handleShareOption(o.id)} accessibilityLabel={o.label} style={styles.shareOpt}>
              <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray800, ...poppins(500) }}>{o.label}</Text>
            </Press>
          ))}
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#06381E', borderBottomLeftRadius: 32, borderBottomRightRadius: 32, ...{ boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)' } },
  hKicker: { fontSize: 10, lineHeight: 15, letterSpacing: 2, color: 'rgba(255,255,255,0.8)', ...poppins(700) },
  hTitle: { fontSize: 20, lineHeight: 28, color: '#fff', ...poppins(700) },
  avatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: '#fff', backgroundColor: '#FFF5E6', overflow: 'hidden' },
  dots: { position: 'absolute', bottom: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotOn: { width: 16, backgroundColor: '#fff' },
  catItem: { width: 62, alignItems: 'center', gap: 8 },
  catCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  catRing: { padding: 2, borderRadius: 32, borderWidth: 2, borderColor: F.green },
  catName: { fontSize: 12, lineHeight: 16, color: tw.gray800, textAlign: 'center', paddingBottom: 4, ...poppins(600) },
  pill: { height: 32, paddingHorizontal: 12, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: tw.gray200 },
  pillText: { fontSize: 12, lineHeight: 16, ...poppins(500) },
  skCard: { width: 200, height: 256, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: tw.gray200, padding: 12, gap: 12 },
  rName: { fontSize: 18, lineHeight: 28, color: tw.gray900, marginBottom: 4, ...poppins(700) },
  rMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 6 },
  m: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mText: { fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(600) },
  rate: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#267e3e', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  rateText: { fontSize: 10, lineHeight: 15, color: '#fff', ...poppins(900) },
  cnt: { fontSize: 10, lineHeight: 15, color: tw.gray400, ...poppins(700) },
  item: { width: 200, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: tw.gray200, overflow: 'hidden', ...{ boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)' } },
  vegOuter: { position: 'absolute', top: 8, left: 8, width: 16, height: 16, borderRadius: 4, borderWidth: 2, borderColor: tw.green600, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  vegDot: { width: 8, height: 8, borderRadius: 999, backgroundColor: tw.green600 },
  vegSmall: { width: 12, height: 12, borderRadius: 3, borderWidth: 1, borderColor: tw.green600, backgroundColor: tw.green50, alignItems: 'center', justifyContent: 'center' },
  vegBig: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: tw.green600, backgroundColor: tw.green50, alignItems: 'center', justifyContent: 'center' },
  iName: { flexShrink: 1, fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(600) },
  price: { fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(700) },
  best: { fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(400) },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: F.green, borderRadius: 8, padding: 4, ...{ boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' } },
  sBtn: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 4 },
  sNum: { minWidth: 20, textAlign: 'center', paddingHorizontal: 4, color: '#fff', fontSize: 12, lineHeight: 16, ...poppins(700) },
  add: { height: 28, paddingHorizontal: 12, borderRadius: 6, backgroundColor: F.green, alignItems: 'center', justifyContent: 'center', ...{ boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' } },
  addText: { fontSize: 12, lineHeight: 16, color: '#fff', ...poppins(700) },
  full: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, height: 36, paddingHorizontal: 16, borderRadius: 8, backgroundColor: tw.gray50, borderWidth: 1, borderColor: tw.gray200, marginTop: 8 },
  fullText: { fontSize: 14, lineHeight: 20, color: tw.gray700, ...poppins(500) },
  more: { height: 36, paddingHorizontal: 24, borderRadius: 999, borderWidth: 1, borderColor: tw.gray200, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  moreText: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(500) },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  sortCard: { width: '100%', maxWidth: 384, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', ...{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' } },
  sortHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: tw.gray200 },
  sortTitle: { fontSize: 18, lineHeight: 28, color: tw.gray900, ...poppins(700) },
  clear: { fontSize: 14, lineHeight: 20, color: F.green, ...poppins(500) },
  xBtn: { padding: 6, borderRadius: 999, backgroundColor: tw.gray100 },
  opt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: tw.gray200 },
  optText: { fontSize: 14, lineHeight: 20, color: tw.gray700, ...poppins(500) },
  check: { width: 20, height: 20, borderRadius: 10, backgroundColor: F.green, alignItems: 'center', justifyContent: 'center' },
  fBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  fText: { fontSize: 14, lineHeight: 20, ...poppins(600) },
  detail: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  dActions: { position: 'absolute', bottom: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  dBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: '#fff', backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  dClose: { position: 'absolute', top: 12, alignSelf: 'center', width: 40, height: 40, borderRadius: 20, backgroundColor: tw.gray800, alignItems: 'center', justifyContent: 'center' },
  dName: { flex: 1, fontSize: 20, lineHeight: 28, color: tw.gray900, ...poppins(700) },
  dDesc: { fontSize: 14, lineHeight: 22.75, color: tw.gray600, marginBottom: 16, ...poppins(400) },
  bar: { borderTopWidth: 1, borderTopColor: tw.gray200, paddingHorizontal: 16, paddingTop: 16, backgroundColor: '#fff' },
  closedMsg: { fontSize: 14, lineHeight: 20, color: tw.red500, marginBottom: 12, textAlign: 'center', ...poppins(600) },
  dq: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 2, borderColor: tw.gray300, borderRadius: 8, paddingHorizontal: 12, height: 44 },
  dqNum: { minWidth: 32, textAlign: 'center', fontSize: 18, lineHeight: 28, color: tw.gray900, ...poppins(600) },
  addBig: { flex: 1, height: 44, borderRadius: 8, backgroundColor: F.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  addBigText: { fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(600) },
  remove: { height: 44, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: tw.red200, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  removeText: { fontSize: 12, lineHeight: 16, color: tw.red600, ...poppins(600) },
  share: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 16 },
  shareOpt: { width: '48%', borderRadius: 16, borderWidth: 1, borderColor: tw.gray200, paddingHorizontal: 16, paddingVertical: 12 },
});
