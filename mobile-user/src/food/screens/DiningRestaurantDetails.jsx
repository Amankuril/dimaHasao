import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, CheckCircle2, IndianRupee, MapPin, Share2, Ticket, X } from 'lucide-react-native';
import { API_ORIGIN } from '../../api/client';
import { diningAPI, restaurantAPI } from '../../api/food';
import Image from '../../components/Img';
import { BottomSheet } from '../../components/kit';
import { Press } from '../../components/ui';
import { events } from '../../lib/events';
import { toast } from '../../lib/notify';
import { useLocation, useNavigate, useParams } from '../../lib/webRouter';
import { poppins, shadow, tw } from '../../theme';
import { useProfile } from '../context/ProfileContext';
import useAppBackNavigation from '../hooks/useAppBackNavigation';
import { isModuleAuthenticated } from '../utils/auth';
import { getMenuFromResponse } from '../utils/menuItems';
import { isVegMenuItem } from '../utils/vegMode';
import { F } from '../components/shell';
import { gridCell, useNavClearance } from '../components/dining/TableShared';

const formatAddress = (restaurant) =>
  restaurant?.location?.addressLine1 ||
  restaurant?.location?.formattedAddress ||
  restaurant?.location?.address ||
  [restaurant?.location?.area || restaurant?.area, restaurant?.location?.city || restaurant?.city].filter(Boolean).join(', ');

const buildImageList = (restaurant) => {
  const candidates = [
    restaurant?.coverImage?.url,
    restaurant?.coverImage,
    ...(Array.isArray(restaurant?.coverImages) ? restaurant.coverImages.map((image) => image?.url || image) : []),
    ...(Array.isArray(restaurant?.menuImages) ? restaurant.menuImages.map((image) => image?.url || image) : []),
    restaurant?.profileImage?.url,
    restaurant?.profileImage,
  ];
  return candidates
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean)
    .filter((value, index, list) => list.indexOf(value) === index);
};

const buildFacilities = (restaurant) => {
  const facilities = [];
  if (restaurant?.diningSettings?.tableBookingEnabled !== false) facilities.push('Dinner');
  if (restaurant?.isAcceptingOrders !== false) facilities.push('Lunch');
  if (restaurant?.diningSettings?.homeDeliveryAvailable || restaurant?.homeDeliveryAvailable) facilities.push('Home delivery');
  if (restaurant?.diningSettings?.takeawayAvailable || restaurant?.takeawayAvailable) facilities.push('Takeaway available');
  if (restaurant?.diningSettings?.vegOnly || restaurant?.vegOnly) facilities.push('Vegetarian only');
  if (restaurant?.diningSettings?.lessNoisy || restaurant?.ambience === 'quiet') facilities.push('Less noisy');
  return facilities.length > 0 ? facilities : ['Dinner', 'Lunch', 'Home delivery', 'Takeaway available', 'Vegetarian only', 'Less noisy'];
};

const buildFeaturedSections = (menuSections, vegMode = false) =>
  menuSections
    .map((section, index) => {
      const items = [
        ...(Array.isArray(section?.items) ? section.items : []),
        ...(Array.isArray(section?.subsections) ? section.subsections : []).flatMap((subsection) => subsection?.items || []),
      ];
      const visibleItems = vegMode ? items.filter(isVegMenuItem) : items;
      if (vegMode && visibleItems.length === 0) return null;
      return { id: `${section?.name || 'section'}-${index}`, title: section?.name || 'Menu', pages: visibleItems.length || 1 };
    })
    .filter(Boolean)
    .slice(0, 2);

const formatTimeLabel = (value) => {
  if (!value) return null;
  if (/[ap]m/i.test(value)) return value.toUpperCase();
  const date = new Date(`2000-01-01T${String(value).padStart(5, '0')}`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
};

const parseMin = (val) => {
  if (!val) return null;
  const raw = String(val).trim();
  const hhmm = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmm) return Number(hhmm[1]) * 60 + Number(hhmm[2]);
  const ampm = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (ampm) {
    let h = Number(ampm[1]);
    const m = Number(ampm[2] || 0);
    const period = ampm[3].toUpperCase();
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  }
  return null;
};

const TOP_TABS = [
  { id: 'menu', label: 'Menu', target: 'restaurant-menu' },
  { id: 'photos', label: 'Photos', target: 'restaurant-photos' },
  { id: 'about', label: 'About', target: 'restaurant-about' },
];

const TAB_BAR_H = 53;

function Photo({ uri, style, empty }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  if (uri && !failed) return <Image source={{ uri }} onError={() => setFailed(true)} style={[{ width: '100%', height: '100%' }, style]} resizeMode="cover" />;
  return empty || null;
}

export default function DiningRestaurantDetails() {
  const { category, diningType: routeType, slug } = useParams();
  const diningType = category || routeType;
  const location = useLocation();
  const navigate = useNavigate();
  const goBack = useAppBackNavigation();
  const clearance = useNavClearance();
  const { width: winW } = useWindowDimensions();
  const { vegMode } = useProfile();
  const routeRestaurant = location.state?.restaurant || null;

  const [restaurant, setRestaurant] = useState(routeRestaurant);
  const [menuSections, setMenuSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGuests, setSelectedGuests] = useState(2);
  const [isBookingSheetOpen, setIsBookingSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('menu');
  const [currentBookings, setCurrentBookings] = useState([]);
  const [outletTimings, setOutletTimings] = useState({});

  const scrollRef = useRef(null);
  const sectionY = useRef({});

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const preferredRestaurantLookup = routeRestaurant?._id || routeRestaurant?.restaurantId || routeRestaurant?.id || slug;
        let resolvedRestaurant = null;

        // Dining first
        try {
          const diningRes = await diningAPI.getRestaurantBySlug(slug);
          if (diningRes?.data?.success && diningRes?.data?.data) resolvedRestaurant = diningRes.data.data?.restaurant || diningRes.data.data;
        } catch {
          // fall through to the next lookup
        }
        if (!resolvedRestaurant) {
          try {
            const r = await restaurantAPI.getRestaurantById(preferredRestaurantLookup);
            if (r?.data?.success) resolvedRestaurant = r.data.data?.restaurant || r.data.data;
          } catch {
            // next
          }
        }
        if (!resolvedRestaurant && preferredRestaurantLookup !== slug) {
          try {
            const r = await restaurantAPI.getRestaurantById(slug);
            if (r?.data?.success) resolvedRestaurant = r.data.data?.restaurant || r.data.data;
          } catch {
            // next
          }
        }
        // Last resort: search the dining list
        if (!resolvedRestaurant) {
          try {
            const searchResponse = await diningAPI.getRestaurants({ limit: 100 });
            const restaurants = searchResponse?.data?.data?.restaurants || searchResponse?.data?.data || [];
            const restaurantNameStr = slug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
            const matching = restaurants.find((r) => {
              const nameToUse = r.restaurantName || r.name;
              if (!nameToUse) return false;
              return (
                r.slug === slug ||
                nameToUse.toLowerCase().replace(/\s+/g, '-') === slug.toLowerCase().replace(/\s+/g, '-') ||
                nameToUse.toLowerCase() === restaurantNameStr.toLowerCase() ||
                nameToUse.toLowerCase() === slug.toLowerCase()
              );
            });
            if (matching) {
              const full = await restaurantAPI.getRestaurantById(matching._id || matching.restaurantId || matching.slug);
              resolvedRestaurant = full?.data?.success ? full.data.data?.restaurant || full.data.data : matching;
            }
          } catch {
            // not found
          }
        }
        if (cancelled) return;
        if (!resolvedRestaurant) {
          setError('Restaurant not found');
          setRestaurant(null);
          return;
        }
        setRestaurant(resolvedRestaurant);
        const restaurantId = resolvedRestaurant?._id || resolvedRestaurant?.id || slug;

        if (isModuleAuthenticated('user')) {
          try {
            const bookingsRes = await diningAPI.getRestaurantBookings(resolvedRestaurant);
            if (!cancelled && bookingsRes.data.success) setCurrentBookings(Array.isArray(bookingsRes.data.data) ? bookingsRes.data.data : []);
          } catch {
            // availability unknown
          }
        } else {
          setCurrentBookings([]);
        }

        restaurantAPI
          .getOutletTimingsByRestaurantId(restaurantId)
          .then((r) => !cancelled && setOutletTimings(r?.data?.data?.outletTimings || {}))
          .catch(() => {});

        const menuResponse = await restaurantAPI.getMenuByRestaurantId(restaurantId).catch(() => null);
        const resolvedMenu = menuResponse ? getMenuFromResponse(menuResponse) : null;
        if (!cancelled) setMenuSections(Array.isArray(resolvedMenu?.sections) ? resolvedMenu.sections : []);
      } catch {
        if (!cancelled) {
          setError('Failed to load restaurant');
          setRestaurant(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [routeRestaurant, slug]);

  // Occupied seats: approved bookings plus pending ones younger than 30 minutes
  const occupiedSeats = useMemo(() => {
    const now = new Date();
    const THIRTY_MINUTES = 30 * 60 * 1000;
    return currentBookings
      .filter((b) => {
        if (b.status === 'approved') return true;
        if (b.status === 'pending') return now - new Date(b.createdAt || b.date) < THIRTY_MINUTES;
        return false;
      })
      .reduce((sum, b) => sum + (Number(b.guests) || 0), 0);
  }, [currentBookings]);

  const maxCapacity = restaurant?.diningSettings?.maxGuests || 6;
  const remainingSeats = Math.max(0, maxCapacity - occupiedSeats);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: '#f6f7fb' }]}>
        <ActivityIndicator size="large" color={F.green} />
      </View>
    );
  }

  if (error || !restaurant) {
    return (
      <View style={[styles.center, { backgroundColor: '#f6f7fb', gap: 16, paddingHorizontal: 16 }]}>
        <Text style={styles.nfTitle}>Restaurant not found</Text>
        <Press scale={0.95} onPress={goBack} style={styles.outlineBtn}>
          <Text style={styles.outlineBtnText}>Go Back</Text>
        </Press>
      </View>
    );
  }

  const restaurantName = restaurant.name || restaurant.restaurantName || 'Restaurant';
  const address = formatAddress(restaurant) || 'Address unavailable';
  const imageGallery = buildImageList(restaurant);
  const heroImage = imageGallery[0] || '';
  const menuPreviewImages = imageGallery.length > 0 ? imageGallery : [''];
  const featuredSections = buildFeaturedSections(menuSections, vegMode);
  const cuisines =
    Array.isArray(restaurant?.cuisines) && restaurant.cuisines.length > 0
      ? restaurant.cuisines.join(', ')
      : 'Asian, Italian, Continental, Chinese, North Indian, Desserts, Beverages, Coffee';
  const costForTwo = restaurant?.costForTwo ? `₹${restaurant.costForTwo} for two` : '₹1900 for two';
  const facilities = buildFacilities(restaurant);
  const rating = Number(restaurant?.rating || restaurant?.avgRating || 0).toFixed(1);
  const reviewCount = restaurant?.totalRatings || restaurant?.reviewCount || restaurant?.reviewsCount || 0;
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todayTiming = outletTimings?.[todayName] || null;
  const rawOpeningTime = todayTiming?.openingTime || restaurant?.openingTime || restaurant?.diningSettings?.openingTime || '12:00';
  const rawClosingTime = todayTiming?.closingTime || restaurant?.closingTime || restaurant?.diningSettings?.closingTime || '23:59';
  const openingTime = formatTimeLabel(rawOpeningTime);
  const closingTime = formatTimeLabel(rawClosingTime);

  const isOpenNow = (() => {
    if (todayTiming?.isOpen === false) return false;
    const now = new Date();
    const cur = now.getHours() * 60 + now.getMinutes();
    const open = parseMin(rawOpeningTime);
    let close = parseMin(rawClosingTime);
    if (open === null || close === null) return true;
    if (close <= open) close += 24 * 60;
    return cur >= open && cur <= close;
  })();
  const isDiningEnabled = restaurant?.diningSettings?.isEnabled !== false;

  const handleShare = async () => {
    const url = `${API_ORIGIN}/food/user/dining/${diningType || 'restaurant'}/${slug}`;
    try {
      await Share.share({ title: restaurantName, message: `Check out ${restaurantName} on Dima Hasao Food! ${url}`, url });
    } catch {
      toast.error('Sharing failed. Please try again.');
    }
  };

  const handleContinueBooking = () => {
    if (!isDiningEnabled) return;
    setIsBookingSheetOpen(false);
    navigate(`/food/user/dining/book/${slug}`, { state: { guestCount: selectedGuests, restaurant } });
  };

  const handleOpenBookingSheet = () => {
    if (!isDiningEnabled) return;
    if (!isModuleAuthenticated('user')) {
      events.emit('show-login-required');
      return;
    }
    setIsBookingSheetOpen(true);
  };

  const scrollToSection = (id) => {
    const y = sectionY.current[id];
    if (y != null) scrollRef.current?.scrollTo({ y: Math.max(0, y - TAB_BAR_H), animated: true });
  };
  const mark = (id) => (e) => {
    sectionY.current[id] = e.nativeEvent.layout.y;
  };

  const W = Math.min(winW, 448);
  const body = W - 32; // px-4
  const menuCell = gridCell(body, 2, 12);
  const aboutInner = body - 34; // p-4 + border
  const facilityCell = gridCell(aboutInner, 2, 16);
  const photos = imageGallery.length > 0 ? imageGallery.slice(0, 4) : menuPreviewImages.slice(0, 2);
  const menuCards =
    featuredSections.length > 0
      ? featuredSections
      : [
          { id: 'food', title: 'Food', pages: 16 },
          { id: 'beverages', title: 'Beverages', pages: 10 },
        ];
  const sheetCell = gridCell(W - 32, 4, 12);

  return (
    <View style={styles.page}>
      <ScrollView ref={scrollRef} stickyHeaderIndices={[1]} contentContainerStyle={{ paddingBottom: 112 + clearance }} showsVerticalScrollIndicator={false}>
        <View style={{ width: '100%', maxWidth: 448, alignSelf: 'center', backgroundColor: '#f6f7fb' }}>
          <View style={styles.hero}>
            {heroImage ? (
              <Photo uri={heroImage} />
            ) : (
              <LinearGradient colors={['#eadcc7', '#a09279', '#655749']} locations={[0, 0.58, 1]} style={StyleSheet.absoluteFill} />
            )}
            <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.18)', 'rgba(0,0,0,0.78)']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />

            <View style={styles.heroTop}>
              <Press scale={0.9} onPress={goBack} accessibilityLabel="Back" style={styles.roundBtn}>
                <ArrowLeft size={20} color="#fff" />
              </Press>
              <Press scale={0.9} onPress={handleShare} accessibilityLabel="Share" style={styles.roundBtn}>
                <Share2 size={20} color="#fff" />
              </Press>
            </View>

            <View style={styles.heroBottom}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.heroName}>{restaurantName}</Text>
                <Text style={styles.heroAddr}>{address}</Text>
                <Text style={styles.heroCost}>
                  {costForTwo}
                  <Text style={{ color: 'rgba(255,255,255,0.65)' }}>{'  •  '}</Text>
                  {cuisines}
                </Text>
                <View style={styles.openPill}>
                  {isOpenNow ? <CheckCircle2 size={16} color="#48d597" /> : <View style={styles.closedDot} />}
                  <Text style={[styles.openText, { color: isOpenNow ? '#48d597' : tw.red400 }]}>{isOpenNow ? 'Open now' : 'Closed'}</Text>
                  {openingTime && closingTime ? (
                    <>
                      <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>|</Text>
                      <Text style={styles.openText2}>
                        {openingTime} to {closingTime}
                      </Text>
                    </>
                  ) : null}
                </View>
              </View>
              <View style={styles.ratingCard}>
                <View style={[styles.row, { justifyContent: 'center', gap: 4 }]}>
                  <Text style={styles.ratingNum}>{rating}</Text>
                  <Text style={styles.ratingStar}>★</Text>
                </View>
                <Text style={styles.ratingSub}>{reviewCount} Reviews</Text>
              </View>
            </View>
          </View>

          <View style={{ paddingHorizontal: 12, paddingTop: 12, paddingBottom: 4 }}>
            <Press
              scale={0.95}
              onPress={handleOpenBookingSheet}
              disabled={!isDiningEnabled}
              style={[styles.bookPill, isDiningEnabled ? null : styles.bookPillOff]}
            >
              <Ticket size={15} color={F.green} />
              <Text style={[styles.bookPillText, isDiningEnabled ? null : { color: '#c06a79' }]}>{isDiningEnabled ? 'Book a table' : 'Dining paused'}</Text>
            </Press>
            {!isDiningEnabled ? (
              <View style={styles.pausedBox}>
                <Text style={styles.pausedText}>Dining bookings are currently turned off by the restaurant.</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.tabsWrap}>
          <View style={styles.tabs}>
            {TOP_TABS.map((tab) => {
              const on = activeTab === tab.id;
              return (
                <Press
                  key={tab.id}
                  scale={1}
                  onPress={() => {
                    setActiveTab(tab.id);
                    scrollToSection(tab.target);
                  }}
                  style={[styles.tab, on ? styles.tabOn : null]}
                >
                  <Text style={[styles.tabText, on ? { color: '#2a2018' } : null]}>{tab.label}</Text>
                </Press>
              );
            })}
          </View>
        </View>

        <View style={{ width: '100%', maxWidth: 448, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 8 }}>
          <View style={{ marginTop: 8 }} onLayout={mark('restaurant-menu')}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
              <View>
                <Text style={styles.h2}>Menu</Text>
                <Text style={styles.updated}>Last updated a month ago</Text>
              </View>
              <Text style={styles.dishes}>{featuredSections.length || 2} dishes</Text>
            </View>
            <View style={[styles.grid, { marginTop: 16, gap: 12 }]}>
              {menuCards.map((section, index) => (
                <View key={section.id} style={[styles.menuCard, { width: menuCell }]}>
                  <View style={{ width: '100%', aspectRatio: 0.88, backgroundColor: '#f7f1e7' }}>
                    <Photo
                      uri={menuPreviewImages[index]}
                      empty={
                        <View style={styles.menuEmpty}>
                          <Text style={styles.menuEmptyText}>Menu preview</Text>
                        </View>
                      }
                    />
                  </View>
                  <View style={{ paddingHorizontal: 8, paddingTop: 8, paddingBottom: 12, alignItems: 'center' }}>
                    <Text style={styles.menuTitle}>{section.title}</Text>
                    <Text style={styles.menuPages}>{section.pages} pages</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section} onLayout={mark('restaurant-photos')}>
            <Text style={styles.h2}>Photos</Text>
            <View style={[styles.grid, { marginTop: 16, gap: 12 }]}>
              {photos.map((image, index) => (
                <View
                  key={`${image || 'placeholder'}-${index}`}
                  style={[styles.photo, index === 0 ? { width: '100%', aspectRatio: 1.72 } : { width: menuCell, aspectRatio: 1.08 }]}
                >
                  <Photo uri={image} empty={<View style={styles.menuEmpty}><Text style={styles.menuEmptyText}>Photo coming soon</Text></View>} />
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section} onLayout={mark('restaurant-about')}>
            <Text style={styles.h2}>About the restaurant</Text>
            <View style={styles.about}>
              <View style={{ gap: 16 }}>
                <View style={styles.aboutRow}>
                  <IndianRupee size={16} color="#f0b500" style={{ marginTop: 2 }} />
                  <Text style={styles.aboutText}>{costForTwo}</Text>
                </View>
                <View style={styles.aboutRow}>
                  <View style={styles.dot} />
                  <Text style={styles.aboutText}>{cuisines}</Text>
                </View>
                <View style={styles.aboutRow}>
                  <MapPin size={16} color={F.green} style={{ marginTop: 2 }} />
                  <Text style={styles.aboutText}>{address}</Text>
                </View>
              </View>

              <View style={styles.aboutDivider}>
                <Text style={styles.h3}>Featured In</Text>
                <View style={styles.featured}>
                  <View style={{ width: '100%', aspectRatio: 1.2, backgroundColor: '#efe8df' }}>
                    <Photo uri={heroImage} empty={<View style={styles.menuEmpty}><Text style={styles.menuEmptyText}>Featured image</Text></View>} />
                  </View>
                  <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.72)']} style={styles.featuredLabel} pointerEvents="none">
                    <Text style={styles.featuredText}>Pan-Asian Restaurants</Text>
                  </LinearGradient>
                </View>
              </View>

              <View style={styles.aboutDivider}>
                <Text style={styles.h3}>Facilities</Text>
                <View style={[styles.grid, { marginTop: 12, columnGap: 16, rowGap: 12 }]}>
                  {facilities.slice(0, 6).map((facility) => (
                    <View key={facility} style={[styles.row, { width: facilityCell, gap: 8 }]}>
                      <View style={styles.ring} />
                      <Text style={[styles.aboutText, { flex: 1 }]}>{facility}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: 16 + clearance }]}>
        <View style={{ width: '100%', maxWidth: 448, alignSelf: 'center' }}>
          <Press scale={0.98} onPress={handleOpenBookingSheet} disabled={!isDiningEnabled} style={[styles.footBtn, isDiningEnabled ? null : styles.footBtnOff]}>
            <Text style={[styles.footBtnText, isDiningEnabled ? null : { color: tw.gray400 }]}>{isDiningEnabled ? 'Book a table' : 'Dining paused'}</Text>
          </Press>
        </View>
      </View>

      <BottomSheet visible={isBookingSheetOpen} onClose={() => setIsBookingSheetOpen(false)} backdrop="rgba(0,0,0,0.35)" panelStyle={[styles.sheet, { paddingBottom: 24 + clearance }]}>
        <View style={styles.grab} />
        <View style={styles.sheetHead}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sheetTitle}>Select number of guests</Text>
            <Text style={styles.sheetSub}>
              {remainingSeats > 0 ? `Only ${remainingSeats} out of ${maxCapacity} seats available now.` : 'Fully booked for now. Try later!'}
            </Text>
          </View>
          <Press scale={0.95} onPress={() => setIsBookingSheetOpen(false)} accessibilityLabel="Close booking sheet" style={styles.sheetClose}>
            <X size={16} color="#5b5b5b" />
          </Press>
        </View>

        <View style={[styles.grid, { gap: 12 }]}>
          {Array.from({ length: maxCapacity }, (_, index) => {
            const count = index + 1;
            const isBooked = count <= occupiedSeats;
            const isTooLarge = count > remainingSeats && !isBooked;
            const selected = selectedGuests === count;
            return (
              <Press
                key={`sheet-${count}`}
                scale={1}
                disabled={isBooked || isTooLarge}
                onPress={() => setSelectedGuests(count)}
                style={[
                  styles.num,
                  { width: sheetCell },
                  selected ? styles.numOn : isBooked ? styles.numBooked : isTooLarge ? styles.numLarge : null,
                ]}
              >
                {isBooked ? (
                  <View style={{ alignItems: 'center', gap: 2 }}>
                    <Text style={styles.bookedTag}>BOOKED</Text>
                    <Text style={[styles.numText, { color: tw.red400 }]}>{count}</Text>
                  </View>
                ) : (
                  <Text style={[styles.numText, selected ? { color: F.green } : isTooLarge ? { color: tw.gray300 } : null]}>{count}</Text>
                )}
              </Press>
            );
          })}
        </View>

        <Press
          scale={0.98}
          onPress={handleContinueBooking}
          disabled={remainingSeats === 0 || selectedGuests > remainingSeats}
          style={[styles.continue, remainingSeats === 0 || selectedGuests > remainingSeats ? { backgroundColor: tw.gray200 } : null]}
        >
          <Text style={[styles.continueText, remainingSeats === 0 || selectedGuests > remainingSeats ? { color: tw.gray400 } : null]}>
            {remainingSeats === 0 ? 'Fully Booked' : 'Continue'}
          </Text>
        </Press>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f6f7fb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  nfTitle: { fontSize: 24, lineHeight: 32, color: '#23180f', textAlign: 'center', ...poppins(700) },
  outlineBtn: { height: 40, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: tw.gray200, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  outlineBtnText: { fontSize: 14, color: tw.gray900, ...poppins(500) },
  hero: { height: 392, overflow: 'hidden' },
  heroTop: { position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 12 },
  roundBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(81,88,106,0.75)', alignItems: 'center', justifyContent: 'center' },
  heroBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 12, paddingBottom: 16, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  heroName: { fontSize: 36, lineHeight: 36, letterSpacing: -1.08, color: '#fff', ...poppins(900) },
  heroAddr: { marginTop: 8, maxWidth: '94%', fontSize: 14, lineHeight: 20, color: 'rgba(255,255,255,0.92)', ...poppins(400) },
  heroCost: { marginTop: 8, fontSize: 14, lineHeight: 20, color: 'rgba(255,255,255,0.9)', ...poppins(400) },
  openPill: { marginTop: 8, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.28)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  closedDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: tw.red500 },
  openText: { fontSize: 13, lineHeight: 20, ...poppins(500) },
  openText2: { fontSize: 13, lineHeight: 20, color: '#fff', ...poppins(500) },
  ratingCard: { marginBottom: 4, backgroundColor: '#fff', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', ...shadow('xl') },
  ratingNum: { fontSize: 31, lineHeight: 31, color: '#1f2328', ...poppins(900) },
  ratingStar: { fontSize: 18, lineHeight: 31, color: '#18b54f' },
  ratingSub: { marginTop: 4, fontSize: 13, lineHeight: 16, color: '#6e7481', ...poppins(400) },
  bookPill: { height: 52, borderRadius: 999, borderWidth: 1, borderColor: '#f1ebee', backgroundColor: '#fff', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, ...shadow('0 10px 24px rgba(15,23,42,0.05)') },
  bookPillOff: { borderColor: '#f2d7da', backgroundColor: '#fff5f6', opacity: 0.8 },
  bookPillText: { fontSize: 15, lineHeight: 22, color: '#2b2118', ...poppins(500) },
  pausedBox: { marginTop: 12, borderRadius: 18, borderWidth: 1, borderColor: tw.amber200, backgroundColor: tw.amber50, paddingHorizontal: 16, paddingVertical: 12 },
  pausedText: { fontSize: 14, lineHeight: 20, color: tw.amber800, ...poppins(400) },
  tabsWrap: { backgroundColor: 'rgba(255,255,255,0.95)', borderBottomWidth: 1, borderBottomColor: '#ececf3' },
  tabs: { width: '100%', maxWidth: 448, alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', justifyContent: 'center', gap: 8 },
  tab: { borderRadius: 999, borderWidth: 1, borderColor: '#ece9e1', backgroundColor: '#fafafa', paddingHorizontal: 20, paddingVertical: 8 },
  tabOn: { borderColor: F.green, backgroundColor: '#fff' },
  tabText: { fontSize: 14, lineHeight: 20, color: '#8b8881', ...poppins(400) },
  h2: { fontSize: 28, lineHeight: 28, color: '#23180f', ...poppins(900) },
  h3: { fontSize: 20, lineHeight: 28, color: '#23180f', ...poppins(600) },
  updated: { marginTop: 8, fontSize: 13, lineHeight: 20, color: '#e19135', ...poppins(400) },
  dishes: { backgroundColor: '#fff3e6', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, overflow: 'hidden', fontSize: 12, lineHeight: 16, color: '#e58a2c', ...poppins(600) },
  menuCard: { borderRadius: 18, borderWidth: 1, borderColor: '#ede8dd', backgroundColor: '#fff', overflow: 'hidden' },
  menuEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3eadf' },
  menuEmptyText: { fontSize: 14, lineHeight: 20, color: '#a28868', ...poppins(500) },
  menuTitle: { fontSize: 16, lineHeight: 20, color: '#2b2218', ...poppins(500) },
  menuPages: { marginTop: 4, fontSize: 12, lineHeight: 16, color: '#7f7a73', ...poppins(400) },
  section: { marginTop: 20, borderTopWidth: 1, borderTopColor: '#e8e8ef', paddingTop: 16 },
  photo: { borderRadius: 18, overflow: 'hidden', backgroundColor: '#f6efe4' },
  about: { marginTop: 16, borderRadius: 18, borderWidth: 1, borderColor: '#ececf4', backgroundColor: '#fafbff', padding: 16 },
  aboutRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  aboutText: { flex: 1, fontSize: 14, lineHeight: 22.75, color: '#5f6474', ...poppins(400) },
  dot: { marginTop: 7, width: 8, height: 8, borderRadius: 4, backgroundColor: '#8a8f9d' },
  aboutDivider: { marginTop: 20, borderTopWidth: 1, borderTopColor: '#e8e8ef', paddingTop: 16 },
  featured: { marginTop: 12, borderRadius: 16, overflow: 'hidden', backgroundColor: '#fff', ...shadow('sm') },
  featuredLabel: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12, paddingTop: 40 },
  featuredText: { fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(500) },
  ring: { width: 7, height: 7, borderRadius: 4, borderWidth: 1, borderColor: '#8a8f9d' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 30, backgroundColor: 'rgba(255,255,255,0.95)', borderTopWidth: 1, borderTopColor: '#ebe5da', paddingHorizontal: 16, paddingTop: 16 },
  footBtn: { height: 48, borderRadius: 16, borderWidth: 1, borderColor: '#FEE2E2', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  footBtnOff: { borderColor: tw.gray200, backgroundColor: tw.gray50, opacity: 0.8 },
  footBtnText: { fontSize: 17, lineHeight: 28, color: F.green, ...poppins(500) },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 16, paddingTop: 16, ...shadow('0 -20px 60px rgba(15,23,42,0.18)') },
  grab: { alignSelf: 'center', width: 56, height: 6, borderRadius: 3, backgroundColor: '#e7e5e4', marginBottom: 16 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 },
  sheetTitle: { fontSize: 20, lineHeight: 28, color: '#23180f', ...poppins(900) },
  sheetSub: { marginTop: 4, fontSize: 14, lineHeight: 20, color: '#7b6651', ...poppins(400) },
  sheetClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: F.cream, alignItems: 'center', justifyContent: 'center' },
  num: { borderRadius: 16, borderWidth: 1, borderColor: '#ece7de', backgroundColor: '#fff', paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  numOn: { borderColor: F.green, backgroundColor: '#fdfafc', transform: [{ scale: 1.02 }], ...shadow('sm') },
  numBooked: { borderColor: tw.red100, backgroundColor: tw.red50, opacity: 0.7 },
  numLarge: { borderColor: tw.gray100, backgroundColor: tw.gray50 },
  numText: { fontSize: 14, lineHeight: 20, color: '#23180f', ...poppins(700) },
  bookedTag: { fontSize: 10, lineHeight: 15, letterSpacing: -0.5, opacity: 0.6, color: tw.red400, ...poppins(900) },
  continue: { marginTop: 24, height: 48, borderRadius: 16, backgroundColor: F.green, alignItems: 'center', justifyContent: 'center' },
  continueText: { fontSize: 16, lineHeight: 24, color: '#fff', ...poppins(700) },
});
