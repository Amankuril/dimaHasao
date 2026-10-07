import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle2, Clock, ImageIcon, IndianRupee, MapPin, Share2, Star, Ticket, UtensilsCrossed, X } from 'lucide-react-native';
import { API_ORIGIN } from '../../api/client';
import { diningAPI, restaurantAPI } from '../../api/food';
import Image from '../../components/Img';
import { BottomSheet } from '../../components/kit';
import { Press } from '../../components/ui';
import { events } from '../../lib/events';
import { toast } from '../../lib/notify';
import { useLocation, useNavigate, useParams } from '../../lib/webRouter';
import { Button, EmptyState, IconButton, SectionHeader, SegmentedControl, StatusBadge } from '../../components/ds';
import { color, elevation, radii, space, type } from '../../theme';
import { useProfile } from '../context/ProfileContext';
import useAppBackNavigation from '../hooks/useAppBackNavigation';
import { isModuleAuthenticated } from '../utils/auth';
import { getMenuFromResponse } from '../utils/menuItems';
import { isVegMenuItem } from '../utils/vegMode';
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

const TAB_BAR_H = 64;
/** Dark scrim over the hero photo (primaryDeep). */
const HERO_SCRIM = ['rgba(6,44,22,0)', 'rgba(6,44,22,0.35)', 'rgba(6,44,22,0.9)'];
const ON_PHOTO_BTN = 'rgba(6,28,14,0.55)';

function PhotoEmpty({ label, icon: Icon = ImageIcon }) {
  return (
    <View style={styles.menuEmpty}>
      <Icon size={22} color={color.textDisabled} />
      <Text style={styles.menuEmptyText}>{label}</Text>
    </View>
  );
}

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
  // The sheet is a modal above the app nav, so it only clears the system inset.
  const insets = useSafeAreaInsets();
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
      <View style={styles.center} accessibilityRole="progressbar" accessibilityLabel="Loading restaurant">
        <ActivityIndicator size="large" color={color.primary} />
      </View>
    );
  }

  if (error || !restaurant) {
    return (
      <View style={[styles.center, { paddingHorizontal: space.lg }]}>
        <EmptyState icon={UtensilsCrossed} title="Restaurant not found" actionLabel="Go back" onAction={goBack} />
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

  const guestsBlocked = remainingSeats === 0 || selectedGuests > remainingSeats;

  return (
    <View style={styles.page}>
      <ScrollView ref={scrollRef} stickyHeaderIndices={[1]} contentContainerStyle={{ paddingBottom: 96 + clearance }} showsVerticalScrollIndicator={false}>
        <View style={{ width: '100%', maxWidth: 448, alignSelf: 'center', backgroundColor: color.bg }}>
          <View style={styles.hero}>
            {heroImage ? <Photo uri={heroImage} /> : <View style={[StyleSheet.absoluteFill, { backgroundColor: color.primaryDeep }]} />}
            <LinearGradient colors={HERO_SCRIM} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />

            <View style={styles.heroTop}>
              <IconButton icon={ArrowLeft} label="Back" onPress={goBack} iconColor={color.textInverse} style={{ backgroundColor: ON_PHOTO_BTN }} />
              <IconButton icon={Share2} label="Share" onPress={handleShare} iconColor={color.textInverse} style={{ backgroundColor: ON_PHOTO_BTN }} />
            </View>

            <View style={styles.heroBottom}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.heroName} numberOfLines={2} accessibilityRole="header">
                  {restaurantName}
                </Text>
                <Text style={styles.heroAddr} numberOfLines={2}>
                  {address}
                </Text>
                <Text style={styles.heroCost} numberOfLines={2}>
                  {costForTwo}
                  {'  •  '}
                  {cuisines}
                </Text>
                <View style={styles.openRow}>
                  <StatusBadge icon={isOpenNow ? CheckCircle2 : X} label={isOpenNow ? 'Open now' : 'Closed'} tone={isOpenNow ? 'success' : 'danger'} />
                  {openingTime && closingTime ? (
                    <Text style={styles.openText2} numberOfLines={1}>
                      {openingTime} to {closingTime}
                    </Text>
                  ) : null}
                </View>
              </View>
              <View style={styles.ratingCard} accessibilityLabel={`Rated ${rating}, ${reviewCount} reviews`}>
                <View style={[styles.row, { justifyContent: 'center', gap: space.xs }]}>
                  <Text style={styles.ratingNum}>{rating}</Text>
                  <Star size={16} color={color.gold} fill={color.gold} />
                </View>
                <Text style={styles.ratingSub}>{reviewCount} reviews</Text>
              </View>
            </View>
          </View>

          <View style={{ paddingHorizontal: space.lg, paddingTop: space.lg }}>
            <Button
              title={isDiningEnabled ? 'Book a table' : 'Dining paused'}
              icon={Ticket}
              variant="secondary"
              onPress={handleOpenBookingSheet}
              disabled={!isDiningEnabled}
            />
            {!isDiningEnabled ? (
              <View style={styles.pausedBox}>
                <Clock size={18} color={color.warning} />
                <Text style={styles.pausedText}>Dining bookings are currently turned off by the restaurant.</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.tabsWrap}>
          <SegmentedControl
            style={styles.tabs}
            options={TOP_TABS.map((tab) => ({ value: tab.id, label: tab.label }))}
            value={activeTab}
            onChange={(id) => {
              const tab = TOP_TABS.find((t) => t.id === id);
              setActiveTab(id);
              scrollToSection(tab.target);
            }}
          />
        </View>

        <View style={{ width: '100%', maxWidth: 448, alignSelf: 'center', paddingHorizontal: space.lg, paddingTop: space.lg }}>
          <View onLayout={mark('restaurant-menu')}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.md }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <SectionHeader title="Menu" style={{ marginBottom: space.xxs }} />
                <Text style={styles.updated}>Last updated a month ago</Text>
              </View>
              <StatusBadge label={`${featuredSections.length || 2} dishes`} tone="gold" />
            </View>
            <View style={[styles.grid, { marginTop: space.lg, gap: space.md }]}>
              {menuCards.map((section, index) => (
                <View key={section.id} style={[styles.menuCard, { width: menuCell }]}>
                  <View style={{ width: '100%', aspectRatio: 0.88, backgroundColor: color.surfaceMuted }}>
                    <Photo uri={menuPreviewImages[index]} empty={<PhotoEmpty label="Menu preview" icon={UtensilsCrossed} />} />
                  </View>
                  <View style={{ padding: space.sm, paddingBottom: space.md, alignItems: 'center' }}>
                    <Text style={styles.menuTitle} numberOfLines={1}>
                      {section.title}
                    </Text>
                    <Text style={styles.menuPages}>{section.pages} pages</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section} onLayout={mark('restaurant-photos')}>
            <SectionHeader title="Photos" style={{ marginBottom: 0 }} />
            <View style={[styles.grid, { marginTop: space.lg, gap: space.md }]}>
              {photos.map((image, index) => (
                <View
                  key={`${image || 'placeholder'}-${index}`}
                  style={[styles.photo, index === 0 ? { width: '100%', aspectRatio: 1.72 } : { width: menuCell, aspectRatio: 1.08 }]}
                >
                  <Photo uri={image} empty={<PhotoEmpty label="Photo coming soon" />} />
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section} onLayout={mark('restaurant-about')}>
            <SectionHeader title="About the restaurant" style={{ marginBottom: 0 }} />
            <View style={styles.about}>
              <View style={{ gap: space.md }}>
                <View style={styles.aboutRow}>
                  <IndianRupee size={18} color={color.goldText} />
                  <Text style={styles.aboutText}>{costForTwo}</Text>
                </View>
                <View style={styles.aboutRow}>
                  <UtensilsCrossed size={18} color={color.textMuted} />
                  <Text style={styles.aboutText}>{cuisines}</Text>
                </View>
                <View style={styles.aboutRow}>
                  <MapPin size={18} color={color.primary} />
                  <Text style={styles.aboutText}>{address}</Text>
                </View>
              </View>

              <View style={styles.aboutDivider}>
                <Text style={styles.h3}>Featured in</Text>
                <View style={styles.featured}>
                  <View style={{ width: '100%', aspectRatio: 1.2, backgroundColor: color.surfaceMuted }}>
                    <Photo uri={heroImage} empty={<PhotoEmpty label="Featured image" />} />
                  </View>
                  <LinearGradient colors={['rgba(6,44,22,0)', 'rgba(6,44,22,0.8)']} style={styles.featuredLabel} pointerEvents="none">
                    <Text style={styles.featuredText}>Pan-Asian Restaurants</Text>
                  </LinearGradient>
                </View>
              </View>

              <View style={styles.aboutDivider}>
                <Text style={styles.h3}>Facilities</Text>
                <View style={[styles.grid, { marginTop: space.md, columnGap: space.lg, rowGap: space.md }]}>
                  {facilities.slice(0, 6).map((facility) => (
                    <View key={facility} style={[styles.row, { width: facilityCell, gap: space.sm }]}>
                      <CheckCircle2 size={16} color={color.primary} />
                      <Text style={[styles.aboutText, { flex: 1 }]}>{facility}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: space.md + clearance }]}>
        <View style={{ width: '100%', maxWidth: 448, alignSelf: 'center' }}>
          <Button title={isDiningEnabled ? 'Book a table' : 'Dining paused'} size="lg" onPress={handleOpenBookingSheet} disabled={!isDiningEnabled} />
        </View>
      </View>

      <BottomSheet visible={isBookingSheetOpen} onClose={() => setIsBookingSheetOpen(false)} backdrop={color.overlay} panelStyle={[styles.sheet, { paddingBottom: space.xxl + insets.bottom }]}>
        <View style={styles.grab} />
        <View style={styles.sheetHead}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.sheetTitle}>Select number of guests</Text>
            <Text style={[styles.sheetSub, remainingSeats > 0 ? null : { color: color.danger }]}>
              {remainingSeats > 0 ? `Only ${remainingSeats} out of ${maxCapacity} seats available now.` : 'Fully booked for now. Try later!'}
            </Text>
          </View>
          <IconButton icon={X} label="Close booking sheet" variant="soft" onPress={() => setIsBookingSheetOpen(false)} />
        </View>

        <View style={[styles.grid, { gap: space.md }]}>
          {Array.from({ length: maxCapacity }, (_, index) => {
            const count = index + 1;
            const isBooked = count <= occupiedSeats;
            const isTooLarge = count > remainingSeats && !isBooked;
            const selected = selectedGuests === count;
            return (
              <Press
                key={`sheet-${count}`}
                scale={0.96}
                disabled={isBooked || isTooLarge}
                onPress={() => setSelectedGuests(count)}
                accessibilityLabel={`${count} ${count === 1 ? 'guest' : 'guests'}${isBooked ? ', booked' : isTooLarge ? ', unavailable' : ''}`}
                accessibilityState={{ selected, disabled: isBooked || isTooLarge }}
                style={[
                  styles.num,
                  { width: sheetCell },
                  selected ? styles.numOn : isBooked ? styles.numBooked : isTooLarge ? styles.numLarge : null,
                ]}
              >
                {isBooked ? (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={[styles.numText, { color: color.danger }]}>{count}</Text>
                    <Text style={styles.bookedTag}>Booked</Text>
                  </View>
                ) : (
                  <Text style={[styles.numText, selected ? { color: color.onPrimary } : isTooLarge ? { color: color.textDisabled } : null]}>{count}</Text>
                )}
              </Press>
            );
          })}
        </View>

        <Button title={remainingSeats === 0 ? 'Fully Booked' : 'Continue'} size="lg" onPress={handleContinueBooking} disabled={guestsBlocked} style={{ marginTop: space.xxl }} />
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.bg },
  row: { flexDirection: 'row', alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  hero: { aspectRatio: 1.1, maxHeight: 400, overflow: 'hidden', backgroundColor: color.primaryDeep },
  heroTop: { position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row', justifyContent: 'space-between', padding: space.md },
  heroBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: space.lg, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: space.md },
  heroName: { ...type.heroSerif, color: color.textInverse },
  heroAddr: { marginTop: space.xs, ...type.small, color: 'rgba(255,255,255,0.92)' },
  heroCost: { marginTop: space.xs, ...type.small, color: 'rgba(255,255,255,0.92)' },
  openRow: { marginTop: space.sm, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.sm },
  openText2: { ...type.caption, color: color.textInverse },
  ratingCard: { backgroundColor: color.surface, borderRadius: radii.lg, paddingHorizontal: space.md, paddingVertical: space.sm, alignItems: 'center', ...elevation.float },
  ratingNum: { ...type.price, color: color.text },
  ratingSub: { ...type.caption, color: color.textMuted },
  pausedBox: { marginTop: space.md, flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, borderRadius: radii.md, backgroundColor: color.warningSoft, padding: space.md },
  pausedText: { flex: 1, ...type.small, color: color.warning },
  tabsWrap: { backgroundColor: color.bg, paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  tabs: { width: '100%', maxWidth: 448 - space.lg * 2, alignSelf: 'center' },
  h3: { ...type.subheading, color: color.text },
  updated: { ...type.caption, color: color.textMuted },
  menuCard: { borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface, overflow: 'hidden', ...elevation.card },
  menuEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.xs, backgroundColor: color.surfaceMuted },
  menuEmptyText: { ...type.caption, color: color.textMuted },
  menuTitle: { ...type.bodyStrong, color: color.text },
  menuPages: { ...type.caption, color: color.textMuted },
  section: { marginTop: space.xxl, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border, paddingTop: space.xxl },
  photo: { borderRadius: radii.lg, overflow: 'hidden', backgroundColor: color.surfaceMuted },
  about: { marginTop: space.lg, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface, padding: space.lg, ...elevation.card },
  aboutRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  aboutText: { flex: 1, minWidth: 0, ...type.body, color: color.textSecondary },
  aboutDivider: { marginTop: space.xl, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border, paddingTop: space.lg },
  featured: { marginTop: space.md, borderRadius: radii.lg, overflow: 'hidden', backgroundColor: color.surfaceMuted },
  featuredLabel: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: space.md, paddingTop: space.xxxl },
  featuredText: { ...type.bodyStrong, color: color.textInverse },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 30, backgroundColor: color.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border, paddingHorizontal: space.lg, paddingTop: space.md },
  sheet: { backgroundColor: color.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, paddingHorizontal: space.lg, paddingTop: space.md, ...elevation.sheet },
  grab: { alignSelf: 'center', width: 48, height: 5, borderRadius: 3, backgroundColor: color.borderStrong, marginBottom: space.lg },
  sheetHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.md, marginBottom: space.lg },
  sheetTitle: { ...type.heading, color: color.text },
  sheetSub: { marginTop: space.xxs, ...type.small, color: color.textSecondary },
  num: { minHeight: 56, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' },
  numOn: { borderColor: color.primary, backgroundColor: color.primary },
  numBooked: { borderColor: color.dangerSoft, backgroundColor: color.dangerSoft },
  numLarge: { borderColor: color.border, backgroundColor: color.surfaceMuted },
  numText: { ...type.subheading, color: color.text },
  bookedTag: { ...type.caption, color: color.danger },
});
