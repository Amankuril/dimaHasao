import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, Clock, Heart, Search, ShieldCheck, User, X } from 'lucide-react-native';
import { BottomSheet } from '../../components/kit';
import { Press } from '../../components/ui';
import { NAV_CLEARANCE } from '../../components/dh/AppBottomNav';
import { events } from '../../lib/events';
import { localStore } from '../../lib/storage';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { shadow, tw } from '../../theme';
import { fo, Pulse } from '../account/ui';
import { useTaxiHome } from '../hooks/useTaxiHome';
import { normalizeAssetUrl } from '../context/SettingsContext';
import { userService } from '../services/userService';
import { DISTRICT_PLACES } from '../constants/districtPlaces';
import LocationMapSection from '../components/home/LocationMapSection';
import { useSettings } from '../context/SettingsContext';
import SuperAppHomeHeader from '../components/home/SuperAppHomeHeader';
import {
  SafeImage, airplaneIcon, bikeFallback, busFallback, busStationIcon, calculateDistanceKm, defaultSettings, deliveryFallback, fallbackCar, getDynamicImageSrc,
  parcelFallback, railwayIcon, seamlessHighwayBg, taxiFallback, toSource, truckFallback, yellowTaxiImg,
} from '../components/home/homeShared';

const BG = '#F8FAFC';
const YELLOW = '#FFC400';
const INK = '#0B1220';
const RECENT_KEY = 'Appzeto 24:recentLocations';
const active = (c) => c.status === 'active' || c.status === true;
const byOrder = (a, b) => Number(a.order || 0) - Number(b.order || 0);
const lower = (v) => String(v || '').trim().toLowerCase();

/* ------------------------------ recent places ------------------------------ */
const readRecent = () => {
  try {
    const parsed = JSON.parse(localStore.getItem(RECENT_KEY) || 'null');
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {}
  return DISTRICT_PLACES.slice(0, 3).map((place) => ({ name: place.title, address: place.address, lat: place.coords[1], lon: place.coords[0], distance: '' }));
};

function RecentLocationsList({ navigate, routePrefix }) {
  const [recentLocations, setRecentLocations] = useState(readRecent);
  useEffect(() => {
    const refresh = () => setRecentLocations(readRecent());
    events.on('Appzeto 24:recent-locations-updated', refresh);
    return () => events.off('Appzeto 24:recent-locations-updated', refresh);
  }, []);

  const recentList = useMemo(() => {
    let current = null;
    try {
      const saved = JSON.parse(localStore.getItem('Appzeto 24:lastLocation') || '{}');
      if (Number.isFinite(Number(saved?.lat)) && Number.isFinite(Number(saved?.lon)) && saved.lat != null) current = [Number(saved.lon), Number(saved.lat)];
    } catch {}
    return recentLocations
      .map((item) => {
        let distance = item.distance;
        if (current && item.lat && item.lon) {
          const km = calculateDistanceKm(current, [item.lon, item.lat]);
          if (km !== null) distance = `${km} km`;
        }
        return { ...item, distance: distance || 'Recent' };
      })
      .slice(0, 3);
  }, [recentLocations]);

  return (
    <View style={{ marginTop: 8, gap: 4 }}>
      {recentList.map((item, index) => (
        <View key={index}>
          <View style={styles.recentRow}>
            <Press
              scale={0.99}
              onPress={() => navigate(`${routePrefix}/ride/select-location`, { state: { drop: item.address, dropCoords: item.lat && item.lon ? [item.lon, item.lat] : null, activeInput: 'drop' } })}
              accessibilityLabel={`Ride to ${item.name}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}
            >
              <View style={styles.recentIcon}>
                <Clock size={16} color={tw.slate500} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.recentName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.recentAddr} numberOfLines={1}>
                  {item.distance ? `${item.distance} • ` : ''}
                  {item.address}
                </Text>
              </View>
            </Press>
            <Press
              scale={0.9}
              hitSlop={12}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: !!item.favourite }}
              accessibilityLabel={item.favourite ? `Remove ${item.name} from favourites` : `Mark ${item.name} as favourite`}
              onPress={() => {
                const updated = recentLocations.map((loc) => (loc.address === item.address ? { ...loc, favourite: !loc.favourite } : loc));
                setRecentLocations(updated);
                localStore.setItem(RECENT_KEY, JSON.stringify(updated));
              }}
              style={{ paddingHorizontal: 4 }}
            >
              <Heart size={16} color={item.favourite ? '#FF2056' : tw.slate400} fill={item.favourite ? '#FF2056' : 'none'} />
            </Press>
          </View>
          {index < recentList.length - 1 ? <View style={styles.recentDivider} /> : null}
        </View>
      ))}
    </View>
  );
}

/* ------------------------------ service grid ------------------------------ */
const moduleFallbackIcon = (module = {}) => {
  const name = lower(module?.name);
  const serviceType = lower(module?.service_type);
  const transportType = lower(module?.transport_type);
  if (serviceType === 'bus' || name.includes('bus')) return busFallback;
  if (serviceType === 'rental' || name.includes('bike') || name.includes('rental')) return bikeFallback;
  if (transportType === 'delivery' || serviceType === 'delivery' || name.includes('delivery')) return deliveryFallback;
  if (name.includes('parcel')) return parcelFallback;
  if (name.includes('truck')) return truckFallback;
  if (name.includes('taxi') || name.includes('cab') || name.includes('ride') || name.includes('normal')) return taxiFallback;
  return fallbackCar;
};
const isDeliveryModule = (m = {}) => lower(m.transport_type) === 'delivery' || lower(m.service_type) === 'delivery' || lower(m.name).includes('delivery') || lower(m.name).includes('delhivery');
const isNormalRideModule = (m = {}) => {
  if (isDeliveryModule(m)) return false;
  const serviceType = lower(m.service_type);
  if (['rental', 'outstation', 'bus', 'pooling'].includes(serviceType)) return false;
  const name = lower(m.name);
  return ['normal', 'taxi', 'ride', 'ride_hailing', 'ride-hailing'].includes(serviceType) || ['taxi', 'both'].includes(lower(m.transport_type)) || name.includes('taxi') || name.includes('cab') || name.includes('ride') || name.includes('normal');
};
const pinnedOrder = (m) => (isNormalRideModule(m) ? 1 : isDeliveryModule(m) ? 2 : null);
const isParcelModule = (m = {}) => lower(m.name).includes('parcel') || lower(m.name).includes('courier') || lower(m.transport_type) === 'delivery' || lower(m.service_type) === 'delivery';
const isBikeModule = (m = {}) => lower(m.name).includes('bike') || lower(m.name).includes('moto') || lower(m.service_type) === 'bike' || lower(m.transport_type) === 'bike';
const isRideModule = (m = {}) => !isParcelModule(m) && !isBikeModule(m) && (lower(m.name).includes('ride') || lower(m.name).includes('cab') || lower(m.name).includes('taxi') || lower(m.service_type) === 'normal' || lower(m.transport_type) === 'taxi');
const rememberVehicleType = (title) => {
  const t = lower(title);
  let vehicleType = '';
  if (t.includes('bike') || t.includes('moto')) vehicleType = 'bike';
  else if (t.includes('auto')) vehicleType = 'auto';
  else if (t.includes('cab') || t.includes('taxi') || t.includes('car') || t === 'book now' || t === 'ride') vehicleType = 'cab';
  else if (t.includes('parcel') || t.includes('delivery')) vehicleType = 'parcel';
  if (vehicleType) localStore.setItem('selectedVehicleType', vehicleType);
  else localStore.removeItem('selectedVehicleType');
};

/* The grid has its own defaults on the web (ServiceGrid.jsx), different from the page's: three tiles, Bike Taxi first. */
const GRID_DEFAULT_EVERYTHING = [
  { id: '1', title: 'Bike Taxi', subtitle: 'Beat the traffic', image: '', route: '/taxi/user/ride/select-location', order: 1, status: 'active' },
  { id: '2', title: 'Book now', subtitle: 'Your everyday rides', image: '', route: '/taxi/user/ride/select-location', order: 2, status: 'active' },
  { id: '4', title: 'All Services', subtitle: 'All Services', image: '', route: '', order: 4, status: 'active' },
];

/** The dark "Everything In Minutes" tile: text on the left, artwork bleeding off the right. */
function EverythingCard({ item, fallbackIcon, onPress }) {
  const title = item.title;
  const isAllServices = lower(title).includes('all services');
  const [failed, setFailed] = useState(false);
  const src = failed ? fallbackIcon : getDynamicImageSrc(item, fallbackIcon);
  return (
    <Press
      scale={0.98}
      onPress={() => {
        rememberVehicleType(title);
        onPress();
      }}
      accessibilityLabel={`${title}${item.subtitle && lower(item.subtitle) !== lower(title) ? `, ${item.subtitle}` : ''}`}
      style={styles.everything}
    >
      {isAllServices ? (
        <View style={styles.everythingIconWrap}>
          <View style={styles.allIcon}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: 22, gap: 4 }}>
              {[YELLOW, tw.slate400, tw.slate400, tw.slate300].map((c, i) => (
                <View key={i} style={{ width: 9, height: 9, borderRadius: 2.5, backgroundColor: c }} />
              ))}
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.everythingImageWrap}>
          <Image source={toSource(src)} onError={() => setFailed(true)} style={{ width: '190%', height: '100%' }} resizeMode="cover" />
        </View>
      )}
      <LinearGradient pointerEvents="none" colors={['#121821', '#121821', 'rgba(18,24,33,0)']} locations={[0, 0.52, 0.72]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={styles.everythingText}>
        {lower(item.subtitle) !== lower(title) ? <Text style={styles.everythingSub}>{item.subtitle}</Text> : null}
        <Text style={styles.everythingTitle} numberOfLines={2}>{title}</Text>
      </View>
    </Press>
  );
}

function ServiceGrid({ navigate, onOpenAll, onLoadServices }) {
  const { settings } = useSettings();
  const saved = settings?.userHomeSettings;
  const uiSettings = saved && Object.keys(saved).length > 0 ? saved : null;
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    userService
      .getAppModules({ limit: 100 })
      .then((response) => {
        const list = response?.data?.data?.results || response?.data?.results || response?.data || [];
        if (mounted) setModules(Array.isArray(list) ? list : []);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const activeModules = useMemo(() => (modules || []).filter((m) => m.active === 1 || m.active === true || String(m.active) === '1' || String(m.active) === 'true'), [modules]);
  const parcelModule = activeModules.find(isParcelModule);
  const bikeModule = activeModules.find(isBikeModule);
  const rideModule = activeModules.find(isRideModule);

  const services = useMemo(
    () =>
      activeModules
        .slice()
        .sort((a, b) => {
          const pa = pinnedOrder(a);
          const pb = pinnedOrder(b);
          if (pa !== null || pb !== null) {
            if (pa === null) return 1;
            if (pb === null) return -1;
            if (pa !== pb) return pa - pb;
          }
          const oa = Number(a?.order_by);
          const ob = Number(b?.order_by);
          if (Number.isFinite(oa) && Number.isFinite(ob) && oa !== ob) return oa - ob;
          if (Number.isFinite(oa) !== Number.isFinite(ob)) return Number.isFinite(oa) ? -1 : 1;
          return String(a?.name || '').localeCompare(String(b?.name || ''), undefined, { sensitivity: 'base' });
        })
        .map((m) => {
          const apiIcon = normalizeAssetUrl(m.mobile_menu_icon || m.uploadedImage || m.imageUrl || m.image);
          const s = String(m.service_type || '').toUpperCase();
          const t = String(m.transport_type || '').toUpperCase();
          return {
            icon: apiIcon && apiIcon.trim() !== '' ? apiIcon : moduleFallbackIcon(m),
            label: m.name,
            description: s && t ? `${s} • ${t}` : s || t || 'SERVICE',
            path: lower(m.service_type) === 'outstation' ? '/taxi/user/intercity' : '/taxi/user/ride/select-location',
            rawModule: m,
          };
        }),
    [activeModules],
  );
  useEffect(() => {
    onLoadServices?.(services);
  }, [services, onLoadServices]);

  const items = (uiSettings?.everything || GRID_DEFAULT_EVERYTHING).filter(active).sort(byOrder);
  const moduleIcon = (m, fallback) => (m ? normalizeAssetUrl(m.mobile_menu_icon) || fallback : fallback);

  return (
    <View style={{ paddingVertical: 4 }}>
      <Text style={styles.h2}>Everything In Minutes</Text>
      {loading ? (
        <View style={styles.grid}>
          {[0, 1, 2, 3].map((i) => (
            <Pulse key={i} style={{ width: '48.2%', height: 132, borderRadius: 24, backgroundColor: 'rgba(241,245,249,0.8)' }} />
          ))}
        </View>
      ) : (
        <View style={styles.grid}>
          {items.map((item, idx) => {
            const t = lower(item.title);
            const isAllServices = t.includes('all services');
            const isBike = t.includes('bike');
            const fallbackIcon = t.includes('parcel') ? moduleIcon(parcelModule, parcelFallback) : isBike ? moduleIcon(bikeModule, bikeFallback) : t.includes('book') || t.includes('ride') ? moduleIcon(rideModule, taxiFallback) : taxiFallback;
            const onPress = () => {
              const clickRoute = item.actionRoute || item.route;
              if (clickRoute === 'ALL_SERVICES_MODAL' || isAllServices) onOpenAll();
              else if (clickRoute) navigate(clickRoute);
              else navigate('/taxi/user/ride/select-location', { state: { selectedCategory: isBike ? 'bike' : 'car', flow: 'ride', activeInput: 'drop' } });
            };
            return (
              <View key={item.id || idx} style={{ width: '48.2%' }}>
                <EverythingCard item={item} fallbackIcon={fallbackIcon} onPress={onPress} />
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

/* ------------------------------ promo carousel ------------------------------ */
function PromoCarousel({ promoBanners, currentPromoIndex, setCurrentPromoIndex, setIsHoveringPromo, navigate, routePrefix }) {
  const [width, setWidth] = useState(0);
  const scroller = useRef(null);
  const progress = useAnimatedValue(0);

  // The hook advances the index every 3s; follow it.
  useEffect(() => {
    if (width) scroller.current?.scrollTo({ x: currentPromoIndex * width, animated: true });
    progress.setValue(0);
    const anim = Animated.timing(progress, { toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: false });
    anim.start();
    return () => anim.stop();
  }, [currentPromoIndex, width, progress]);

  const fallbackImages = [yellowTaxiImg, seamlessHighwayBg];
  const open = (item) => {
    if (item.route) {
      if (item.route.includes('/ride/select-location')) navigate(item.route, { state: { activeInput: 'drop', flow: 'ride' } });
      else navigate(item.route);
    } else navigate(`${routePrefix}/ride/select-location`, { state: { activeInput: 'drop', flow: 'ride' } });
  };

  return (
    <View style={{ paddingTop: 8 }}>
      <View style={styles.promo} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          onScrollBeginDrag={() => setIsHoveringPromo(true)}
          onMomentumScrollEnd={(e) => {
            setIsHoveringPromo(false);
            if (width) setCurrentPromoIndex(Math.max(0, Math.min(promoBanners.length - 1, Math.round(e.nativeEvent.contentOffset.x / width))));
          }}
        >
          {promoBanners.map((item, idx) => {
            const title = String(item.title || '');
            return (
              <Press key={item.id || item._id || idx} scale={1} onPress={() => open(item)} accessibilityLabel={`${title}${item.subtitle ? `. ${item.subtitle}` : ''}`} style={{ width: width || 1, height: 150 }}>
                <Image source={toSource(getDynamicImageSrc(item, fallbackImages[idx % fallbackImages.length]))} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                <LinearGradient colors={['#020618', 'rgba(2,6,24,0.8)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                <View style={styles.promoText}>
                  <Text style={styles.promoTag}>SUPER SAVER</Text>
                  <Text style={styles.promoTitle}>
                    <Text style={{ color: YELLOW }}>{title.split(' ')[0].toUpperCase()}</Text> {title.split(' ').slice(1).join(' ').toUpperCase()}
                  </Text>
                  {item.subtitle ? <Text style={styles.promoSub} numberOfLines={2}>{item.subtitle}</Text> : null}
                </View>
              </Press>
            );
          })}
        </ScrollView>
        {promoBanners.length > 1 ? (
          <>
            <View style={styles.promoBar}>
              <Animated.View style={{ height: '100%', backgroundColor: YELLOW, width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
            </View>
            <View style={styles.promoDots}>
              {promoBanners.map((_, idx) => (
                <Press key={idx} scale={1} hitSlop={8} onPress={() => setCurrentPromoIndex(idx)} accessibilityLabel={`Go to offer ${idx + 1}`} style={[styles.promoDot, idx === currentPromoIndex ? { backgroundColor: YELLOW, width: 18 } : null]} />
              ))}
            </View>
          </>
        ) : null}
      </View>
    </View>
  );
}

function SectionSkeleton({ w, h, count, radius }) {
  return (
    <View style={{ paddingTop: 8 }}>
      <Pulse style={{ width: 80, height: 16, borderRadius: 6, backgroundColor: tw.slate200, marginBottom: 12 }} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {Array.from({ length: count }, (_, i) => (
          <Pulse key={i} style={{ width: w, height: h, borderRadius: radius, backgroundColor: tw.slate200 }} />
        ))}
      </View>
    </View>
  );
}

/** Port of Taxi/modules/user/pages/Home.jsx — the phone layout (logic: useTaxiHome). */
export default function TaxiHome() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const {
    navigate, routePrefix, settingsLoading, uiSettings, isAllServicesOpen, setIsAllServicesOpen, activeServices, setActiveServices, pickupAddress, isLocationLoading,
    currentRide, showDeferredSections, promoBanners, currentPromoIndex, setCurrentPromoIndex, setIsHoveringPromo, handleServiceClick, driverName, serviceType,
    vehicleLabel, currentRideIcon, trackingPath, isScheduledAcceptedRide, scheduledDateLabel, scheduledCountdown,
  } = useTaxiHome();

  const sections = uiSettings?.homeSections;
  const exploreCards = (uiSettings?.explore || defaultSettings.explore).filter(active).sort(byOrder);
  const goPlacesCards = (uiSettings?.goPlaces || defaultSettings.goPlaces).filter(active).sort(byOrder);
  const footer = { ...defaultSettings.footer, ...(uiSettings?.footer || {}) };
  const exploreIcon = (title) => {
    const t = lower(title);
    if (t.includes('parcel')) return parcelFallback;
    if (t.includes('auto')) return taxiFallback;
    if (t.includes('bike') || t.includes('moto')) return bikeFallback;
    return fallbackCar;
  };
  const goPlacesIcon = (title) => {
    const t = lower(title);
    if (t.includes('airport') || t.includes('flight')) return airplaneIcon;
    if (t.includes('bus') || t.includes('terminal')) return busStationIcon;
    return railwayIcon;
  };
  const ping = useAnimatedValue(0);
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(ping, { toValue: 1, duration: 1000, easing: Easing.out(Easing.ease), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [ping]);

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[1]} contentContainerStyle={{ paddingBottom: 110 + NAV_CLEARANCE + insets.bottom }}>
        {/* Map with the header and the pickup pill on top of it */}
        <View style={{ height: 240, backgroundColor: tw.slate200 }}>
          {showDeferredSections ? <LocationMapSection /> : <Pulse style={{ flex: 1, backgroundColor: tw.slate200 }} />}
          <View style={{ position: 'absolute', top: 16 + insets.top, left: 0, right: 0 }} pointerEvents="box-none">
            <SuperAppHomeHeader />
          </View>
          <Press scale={0.99} onPress={() => navigate(`${routePrefix}/ride/select-location`, { state: { activeInput: 'pickup', flow: 'ride' } })} accessibilityLabel={`Pickup: ${isLocationLoading ? 'finding your location' : pickupAddress}. Change`} style={styles.pickupPill}>
            <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: '#168a45' }} />
            <Text style={styles.pickupText} numberOfLines={1}>{isLocationLoading ? 'Pinning your current location...' : pickupAddress}</Text>
            <Text style={styles.pickupChange}>CHANGE</Text>
          </Press>
        </View>

        {/* Search bar: sticks to the top while the sheet scrolls under it */}
        <View style={styles.searchWrap}>
          <Press scale={0.99} onPress={() => navigate(`${routePrefix}/ride/select-location`, { state: { activeInput: 'drop', flow: 'ride' } })} accessibilityRole="search" accessibilityLabel="Where do you want to go?" style={styles.search}>
            <Search size={18} color={tw.slate900} strokeWidth={2.5} />
            <Text style={styles.searchText} numberOfLines={1}>Where do you want to go?</Text>
          </Press>
        </View>

        <View style={styles.sheet}>
          <RecentLocationsList navigate={navigate} routePrefix={routePrefix} />

          {currentRide && lower(currentRide?.status) !== 'end_requested' ? (
            <Press scale={0.99} onPress={() => navigate(trackingPath, { state: currentRide })} accessibilityLabel={serviceType === 'rental' ? 'Active rental booking. View details' : 'Active ride. View details'} style={styles.activeRide}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                <View style={{ width: 8, height: 8 }}>
                  <Animated.View style={[styles.pingDot, { opacity: ping.interpolate({ inputRange: [0, 1], outputRange: [0.75, 0] }), transform: [{ scale: ping.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] }) }] }]} />
                  <View style={[styles.pingDot, { backgroundColor: '#00BC7D' }]} />
                </View>
                <Text style={styles.activeRideText} numberOfLines={1}>{serviceType === 'rental' ? 'You have an active rental booking' : 'You have an active ride'}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Text style={styles.activeRideCta}>View details</Text>
                <ChevronRight size={14} color="#009966" />
              </View>
            </Press>
          ) : null}

          {!sections || sections.enableEverything !== false ? (
            <ServiceGrid navigate={navigate} onOpenAll={() => setIsAllServicesOpen(true)} onLoadServices={setActiveServices} />
          ) : null}

          {settingsLoading ? (
            <SectionSkeleton w={86} h={96} count={4} radius={20} />
          ) : sections?.enableExplore === false ? null : (
            <View style={{ paddingTop: 4 }}>
              <View style={styles.headRow}>
                <Text style={[styles.h2, { marginBottom: 0 }]}>Explore</Text>
                <Press scale={0.96} onPress={() => setIsAllServicesOpen(true)} accessibilityLabel="View all services" hitSlop={10} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <Text style={styles.viewAll}>VIEW ALL</Text>
                  <ChevronRight size={12} color={YELLOW} strokeWidth={3} />
                </Press>
              </View>
              <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 12, paddingHorizontal: 4 }}>
                {exploreCards.map((card, idx) => (
                  <Press key={card.id || idx} scale={0.96} onPress={() => handleServiceClick(card)} accessibilityLabel={card.title} style={styles.exploreCard}>
                    <SafeImage item={card} fallbackImage={exploreIcon(card.title)} style={{ width: 32, height: 32 }} />
                    <Text style={styles.exploreTitle} numberOfLines={2}>{card.title}</Text>
                  </Press>
                ))}
              </ScrollView>
            </View>
          )}

          {settingsLoading ? (
            <Pulse style={{ height: 140, borderRadius: 26, backgroundColor: tw.slate200, marginTop: 8 }} />
          ) : sections?.enablePromo === false || !promoBanners || promoBanners.length === 0 ? null : (
            <PromoCarousel promoBanners={promoBanners} currentPromoIndex={currentPromoIndex} setCurrentPromoIndex={setCurrentPromoIndex} setIsHoveringPromo={setIsHoveringPromo} navigate={navigate} routePrefix={routePrefix} />
          )}

          {settingsLoading ? (
            <SectionSkeleton w={156} h={162} count={3} radius={24} />
          ) : sections?.enableGoPlaces === false ? null : (
            <View style={{ paddingTop: 4 }}>
              <View style={{ marginBottom: 10, marginLeft: 4 }}>
                <Text style={[styles.h2, { marginBottom: 0 }]}>Go Places with Dima Hasao</Text>
                <Text style={styles.goSub}>Fast bookings to key transit hubs</Text>
              </View>
              <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: 12, paddingHorizontal: 4 }}>
                {goPlacesCards.map((card, idx) => (
                  <Press key={card.id || idx} scale={0.97} onPress={() => navigate(card.route || `${routePrefix}/ride/select-location`)} accessibilityLabel={`${card.title}. Book now`} style={styles.goCard}>
                    <View style={styles.goImage}>
                      <SafeImage item={card} fallbackImage={goPlacesIcon(card.title)} style={{ width: '100%', height: '100%' }} />
                    </View>
                    <View style={{ padding: 12, flex: 1, justifyContent: 'space-between' }}>
                      <Text style={styles.goTitle} numberOfLines={2}>{card.title}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 10 }}>
                        <Text style={styles.goCta}>Book Now</Text>
                        <ChevronRight size={10} color={YELLOW} strokeWidth={3} />
                      </View>
                    </View>
                  </Press>
                ))}
              </ScrollView>
            </View>
          )}

          {settingsLoading ? (
            <Pulse style={{ height: 140, borderRadius: 24, backgroundColor: tw.slate200, marginTop: 16 }} />
          ) : sections?.enableFooter === false ? null : (
            <View style={styles.footer}>
              <Image source={toSource(getDynamicImageSrc(uiSettings?.footer || {}, seamlessHighwayBg))} style={StyleSheet.absoluteFill} resizeMode="cover" />
              <LinearGradient colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.45)', 'rgba(255,255,255,0.8)']} style={StyleSheet.absoluteFill} />
              <Text style={styles.footerHash}>{String(footer.hashtag || '').toUpperCase()}</Text>
              <Text style={styles.footerLine1}>{String(footer.line1 || '').toUpperCase()}</Text>
              <Text style={styles.footerLine2}>{String(footer.line2 || '').toUpperCase()}</Text>
            </View>
          )}

          {isScheduledAcceptedRide ? (
            <Press scale={0.99} onPress={() => navigate(trackingPath, { state: currentRide })} accessibilityLabel={`Scheduled ride confirmed. ${scheduledCountdown}`} style={styles.scheduled}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={styles.confirmed}>
                  <ShieldCheck size={11} color="#FDC700" strokeWidth={3} />
                  <Text style={styles.confirmedText}>CONFIRMED</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#FDC700' }} />
                  <Text style={styles.confirmedText}>LIVE STATUS</Text>
                </View>
              </View>
              <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.countdown}>{scheduledCountdown}</Text>
                  <Text style={styles.countdownDate}>{scheduledDateLabel}</Text>
                </View>
                <View style={styles.rideIcon}>
                  <Image source={toSource(currentRideIcon)} style={{ width: 32, height: 32 }} resizeMode="contain" />
                </View>
              </View>
              <View style={styles.driverRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                  <View style={styles.driverAvatar}>
                    <User size={16} color="#FDC700" />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.driverLabel}>DRIVER & VEHICLE</Text>
                    <Text style={styles.driverValue} numberOfLines={1}>
                      {driverName} • {vehicleLabel}
                    </Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.driverLabel}>FARE</Text>
                  <Text style={styles.driverValue}>₹{Number(currentRide?.fare || 0).toFixed(0)}</Text>
                </View>
              </View>
            </Press>
          ) : null}
        </View>
      </ScrollView>

      <BottomSheet visible={isAllServicesOpen} onClose={() => setIsAllServicesOpen(false)} backdrop="rgba(0,0,0,0.7)" spring={{ stiffness: 240, damping: 26 }} panelStyle={[styles.allSheet, { height: height * 0.85, paddingBottom: 20 + insets.bottom }]}>
        <Press scale={1} onPress={() => setIsAllServicesOpen(false)} accessibilityLabel="Close" style={{ alignItems: 'center', paddingBottom: 12 }}>
          <View style={{ width: 48, height: 4, borderRadius: 2, backgroundColor: tw.slate200 }} />
        </Press>
        <View style={styles.allHead}>
          <Text style={styles.allTitle}>All Services</Text>
          <Press scale={0.95} onPress={() => setIsAllServicesOpen(false)} accessibilityLabel="Close all services" style={styles.allClose} hitSlop={8}>
            <X size={16} color={tw.slate500} strokeWidth={2.5} />
          </Press>
        </View>
        <ScrollView style={{ flex: 1, marginTop: 20 }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.allGrid}>
          {activeServices.map((service, index) => (
            <Press key={index} scale={0.95} onPress={() => handleServiceClick(service)} accessibilityLabel={service.label} style={styles.allItem}>
              <View style={styles.allIconBox}>
                <Image source={toSource(service.icon)} style={{ width: 44, height: 44 }} resizeMode="contain" />
              </View>
              <Text style={styles.allLabel}>{service.label}</Text>
            </Press>
          ))}
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  pickupPill: { position: 'absolute', left: 16, right: 16, bottom: 36, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: tw.slate200, ...shadow('0 8px 20px rgba(0,0,0,0.18)') },
  pickupText: { flex: 1, fontSize: 12, lineHeight: 14, color: tw.slate800, ...fo(700) },
  pickupChange: { fontSize: 10.5, lineHeight: 14, letterSpacing: 0.5, color: '#F0B100', borderLeftWidth: 1, borderLeftColor: 'rgba(226,232,240,0.5)', paddingLeft: 8, ...fo(900) },
  searchWrap: { marginTop: -20, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6, backgroundColor: BG, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: tw.slate200, ...shadow('sm') },
  searchText: { flex: 1, fontSize: 14, lineHeight: 20, color: tw.slate900, ...fo(600) },
  sheet: { paddingHorizontal: 16, gap: 12, backgroundColor: BG },

  recentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 12, paddingHorizontal: 8, borderRadius: 12 },
  recentIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: tw.slate100, borderWidth: 1, borderColor: tw.slate200 },
  recentName: { fontSize: 14, lineHeight: 17.5, color: INK, ...fo(700) },
  recentAddr: { fontSize: 11, lineHeight: 16, color: '#64748B', marginTop: 4, ...fo(500) },
  recentDivider: { borderBottomWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(226,232,240,0.8)', marginHorizontal: 8 },

  activeRide: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, borderWidth: 1, backgroundColor: 'rgba(236,253,245,0.4)', borderColor: 'rgba(208,250,229,0.6)', marginTop: 4 },
  pingDot: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: '#00D492' },
  activeRideText: { flex: 1, fontSize: 13, lineHeight: 16, color: tw.slate900, ...fo(700) },
  activeRideCta: { fontSize: 12, lineHeight: 14, color: '#009966', ...fo(900) },

  h2: { fontSize: 19, lineHeight: 24, letterSpacing: -0.475, color: tw.slate900, marginBottom: 10, ...fo(900) },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  everything: { height: 108, borderRadius: 22, overflow: 'hidden', backgroundColor: '#121821', borderWidth: 1, borderColor: 'rgba(63,63,70,0.4)' },
  everythingImageWrap: { position: 'absolute', right: 0, bottom: 0, width: '70%', height: '100%', overflow: 'hidden' },
  everythingIconWrap: { position: 'absolute', right: 8, bottom: 8, width: 72, height: 72, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  allIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(226,232,240,0.5)', borderWidth: 1, borderColor: 'rgba(203,213,225,0.3)' },
  everythingText: { width: '65%', padding: 11 },
  everythingSub: { fontSize: 11, lineHeight: 15, letterSpacing: 0.55, color: '#94A3B8', ...fo(700) },
  everythingTitle: { marginTop: 4, fontSize: 15, lineHeight: 18.75, color: '#fff', ...fo(900) },

  headRow: { marginBottom: 10, marginLeft: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  viewAll: { fontSize: 13, lineHeight: 18, letterSpacing: 0.65, color: YELLOW, ...fo(900) },
  exploreCard: { width: 86, height: 96, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(226,232,240,0.8)', backgroundColor: '#F7F8FB', alignItems: 'center', justifyContent: 'center', padding: 8, ...shadow('sm') },
  exploreTitle: { fontSize: 12, lineHeight: 15, letterSpacing: -0.3, color: INK, textAlign: 'center', marginTop: 8, ...fo(900) },

  promo: { borderRadius: 22, overflow: 'hidden', backgroundColor: INK, borderWidth: 1, borderColor: 'rgba(226,232,240,0.6)', ...shadow('md') },
  promoText: { ...StyleSheet.absoluteFill, justifyContent: 'center', padding: 24, paddingRight: '24%' },
  promoTag: { alignSelf: 'flex-start', fontSize: 10, lineHeight: 15, letterSpacing: 1, color: YELLOW, backgroundColor: 'rgba(255,196,0,0.1)', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 999, overflow: 'hidden', marginBottom: 4, ...fo(900) },
  promoTitle: { fontSize: 17, lineHeight: 21, color: '#F8FAFC', ...fo(900) },
  promoSub: { fontSize: 11, lineHeight: 15, color: 'rgba(226,232,240,0.9)', marginTop: 4, ...fo(600) },
  promoBar: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, backgroundColor: 'rgba(255,255,255,0.1)' },
  promoDots: { position: 'absolute', right: 14, bottom: 10, flexDirection: 'row', gap: 6 },
  promoDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.45)' },

  goSub: { fontSize: 11, lineHeight: 16, letterSpacing: 1.54, color: tw.slate400, marginTop: 6, ...fo(900) },
  goCard: { width: 156, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(226,232,240,0.8)', backgroundColor: '#F7F8FB', overflow: 'hidden', ...shadow('sm') },
  goImage: { height: 80, padding: 12, backgroundColor: 'rgba(226,232,240,0.3)', alignItems: 'center', justifyContent: 'center' },
  goTitle: { fontSize: 14, lineHeight: 17.5, letterSpacing: -0.35, color: tw.slate800, ...fo(900) },
  goCta: { fontSize: 11, lineHeight: 12, letterSpacing: 0.55, color: YELLOW, ...fo(900) },

  footer: { marginTop: 16, marginBottom: 24, minHeight: 420, paddingBottom: 128, padding: 32, borderRadius: 24, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: BG, borderTopWidth: 1, borderTopColor: tw.slate200, gap: 12 },
  footerHash: { fontSize: 28, lineHeight: 30, letterSpacing: -0.7, color: INK, textAlign: 'center', ...fo(900) },
  footerLine1: { fontSize: 13, lineHeight: 18, letterSpacing: 1.3, color: INK, textAlign: 'center', ...fo(900) },
  footerLine2: { fontSize: 10, lineHeight: 15, letterSpacing: 1.6, color: '#64748B', textAlign: 'center', ...fo(700) },

  scheduled: { marginTop: 8, borderRadius: 28, padding: 20, backgroundColor: tw.slate900, borderWidth: 1, borderColor: tw.slate800, ...shadow('xl') },
  confirmed: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2, backgroundColor: 'rgba(253,199,0,0.1)' },
  confirmedText: { fontSize: 9, lineHeight: 14, letterSpacing: 1.1, color: '#FDC700', ...fo(900) },
  countdown: { fontSize: 24, lineHeight: 26, letterSpacing: -0.6, color: '#fff', ...fo(900) },
  countdownDate: { marginTop: 6, fontSize: 12, lineHeight: 16, color: tw.slate400, ...fo(700) },
  rideIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#020618', borderWidth: 1, borderColor: tw.slate800, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  driverRow: { marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderRadius: 12, padding: 10, backgroundColor: 'rgba(2,6,24,0.6)', borderWidth: 1, borderColor: tw.slate800 },
  driverAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: tw.slate900, borderWidth: 1, borderColor: tw.slate800, alignItems: 'center', justifyContent: 'center' },
  driverLabel: { fontSize: 9, lineHeight: 10, letterSpacing: 1.26, color: tw.slate500, ...fo(600) },
  driverValue: { marginTop: 2, fontSize: 12.5, lineHeight: 17, color: '#fff', ...fo(700) },

  allSheet: { backgroundColor: BG, borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 20, borderTopWidth: 1, borderTopColor: 'rgba(226,232,240,0.8)' },
  allHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: tw.slate100 },
  allTitle: { fontSize: 19, lineHeight: 26, letterSpacing: -0.475, color: tw.slate900, ...fo(900) },
  allClose: { padding: 6, borderRadius: 999, backgroundColor: tw.slate100 },
  allGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 24, paddingVertical: 4 },
  allItem: { width: '25%', alignItems: 'center' },
  allIconBox: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#121824', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(29,41,61,0.1)', ...shadow('md') },
  allLabel: { fontSize: 10, lineHeight: 12.5, letterSpacing: 0.25, color: tw.slate800, textAlign: 'center', marginTop: 8, maxWidth: 76, ...fo(900) },
});
