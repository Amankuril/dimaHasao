import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { CalendarClock, ChevronRight, Clock, Heart, LayoutGrid, Square, User, X } from 'lucide-react-native';
import { BottomSheet } from '../../components/kit';
import { Press } from '../../components/ui';
import { NAV_CLEARANCE } from '../../components/dh/AppBottomNav';
import { events } from '../../lib/events';
import { localStore } from '../../lib/storage';
import { useAnimatedValue } from '../../lib/useAnimatedValue';
import { Card, EmptyState, IconButton, SectionHeader, StatusBadge } from '../../components/ds';
import { color, elevation, radii, space, type } from '../../theme';
import { Pulse } from '../account/ui';
import { useTaxiHome } from '../hooks/useTaxiHome';
import { userService } from '../services/userService';
import { DISTRICT_PLACES } from '../constants/districtPlaces';
import LocationMapSection from '../components/home/LocationMapSection';
import { normalizeAssetUrl, useSettings } from '../context/SettingsContext';
import SuperAppHomeHeader from '../components/home/SuperAppHomeHeader';
import {
  SafeImage, airplaneIcon, bikeFallback, busFallback, busStationIcon, calculateDistanceKm, defaultSettings, deliveryFallback, fallbackCar, getDynamicImageSrc,
  parcelFallback, railwayIcon, seamlessHighwayBg, taxiFallback, toSource, truckFallback, yellowTaxiImg,
} from '../components/home/homeShared';

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
    <Card padded={false}>
      {recentList.map((item, index) => (
        <View key={index}>
          <View style={styles.recentRow}>
            <Press
              scale={0.99}
              onPress={() => navigate(`${routePrefix}/ride/select-location`, { state: { drop: item.address, dropCoords: item.lat && item.lon ? [item.lon, item.lat] : null, activeInput: 'drop' } })}
              accessibilityLabel={`Ride to ${item.name}`}
              style={styles.recentMain}
            >
              <View style={styles.recentIcon}>
                <Clock size={18} color={color.primary} />
              </View>
              <View style={styles.flexText}>
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
              style={styles.heartBtn}
            >
              <Heart size={20} color={item.favourite ? color.danger : color.textMuted} fill={item.favourite ? color.danger : 'none'} />
            </Press>
          </View>
          {index < recentList.length - 1 ? <View style={styles.recentDivider} /> : null}
        </View>
      ))}
    </Card>
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

/** "Everything in minutes" tile: a white card with the artwork on the right; "All services" is the deep-green heritage tile. */
function EverythingCard({ item, fallbackIcon, onPress }) {
  const title = item.title;
  const isAllServices = lower(title).includes('all services');
  const [failed, setFailed] = useState(false);
  const src = failed ? fallbackIcon : getDynamicImageSrc(item, fallbackIcon);
  const showSub = lower(item.subtitle) !== lower(title) && item.subtitle;
  return (
    <Press
      scale={0.98}
      onPress={() => {
        rememberVehicleType(title);
        onPress();
      }}
      accessibilityLabel={`${title}${item.subtitle && lower(item.subtitle) !== lower(title) ? `, ${item.subtitle}` : ''}`}
      style={[styles.everything, isAllServices && styles.everythingDark]}
    >
      <View style={styles.everythingText}>
        <Text style={[styles.everythingTitle, isAllServices && { color: color.goldOnDark }]} numberOfLines={2}>{title}</Text>
        {showSub ? <Text style={[styles.everythingSub, isAllServices && { color: color.textOnDarkMuted }]} numberOfLines={2}>{item.subtitle}</Text> : null}
      </View>
      {isAllServices ? (
        <View style={styles.allIcon}>
          <LayoutGrid size={22} color={color.goldOnDark} />
        </View>
      ) : (
        <View style={styles.everythingImageWrap}>
          <Image source={toSource(src)} onError={() => setFailed(true)} style={styles.everythingImage} resizeMode="contain" />
        </View>
      )}
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
    <View>
      <SectionHeader title="Everything in minutes" />
      {loading ? (
        <View style={styles.grid}>
          {[0, 1, 2, 3].map((i) => (
            <Pulse key={i} style={styles.gridSkeleton} />
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
              <View key={item.id || idx} style={styles.gridCell}>
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
    <View>
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
                <LinearGradient colors={[color.primaryDeep, 'rgba(6,44,22,0.82)', 'rgba(6,44,22,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                <View style={styles.promoText}>
                  <View style={styles.promoTag}>
                    <Text style={styles.promoTagText}>Super saver</Text>
                  </View>
                  <Text style={styles.promoTitle} numberOfLines={2}>
                    <Text style={{ color: color.goldOnDark }}>{title.split(' ')[0]}</Text> {title.split(' ').slice(1).join(' ')}
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
              <Animated.View style={{ height: '100%', backgroundColor: color.gold, width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
            </View>
            <View style={styles.promoDots}>
              {promoBanners.map((_, idx) => (
                <Press key={idx} scale={1} hitSlop={8} onPress={() => setCurrentPromoIndex(idx)} accessibilityLabel={`Go to offer ${idx + 1}`} style={[styles.promoDot, idx === currentPromoIndex ? styles.promoDotOn : null]} />
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
    <View>
      <Pulse style={styles.skeletonTitle} />
      <View style={{ flexDirection: 'row', gap: space.md }}>
        {Array.from({ length: count }, (_, i) => (
          <Pulse key={i} style={{ width: w, height: h, borderRadius: radius, backgroundColor: color.surfaceMuted }} />
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
    <View style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[1]} contentContainerStyle={{ paddingBottom: space.xxl + NAV_CLEARANCE + insets.bottom }}>
        {/* Location strip, then the map with the pickup card on top of it */}
        <View>
          <SuperAppHomeHeader />
          <View style={styles.mapArea}>
            {showDeferredSections ? <LocationMapSection /> : <Pulse style={{ flex: 1, backgroundColor: color.surfaceMuted }} />}
            <Press scale={0.99} onPress={() => navigate(`${routePrefix}/ride/select-location`, { state: { activeInput: 'pickup', flow: 'ride' } })} accessibilityLabel={`Pickup: ${isLocationLoading ? 'finding your location' : pickupAddress}. Change`} style={styles.pickupPill}>
              <View style={styles.pickupDot} />
              <View style={styles.flexText}>
                <Text style={styles.pickupLabel}>Pickup</Text>
                <Text style={styles.pickupText} numberOfLines={1}>{isLocationLoading ? 'Pinning your current location...' : pickupAddress}</Text>
              </View>
              <Text style={styles.pickupChange}>Change</Text>
            </Press>
          </View>
        </View>

        {/* Drop search: sticks to the top while the page scrolls under it */}
        <View style={styles.searchWrap}>
          <Press scale={0.99} onPress={() => navigate(`${routePrefix}/ride/select-location`, { state: { activeInput: 'drop', flow: 'ride' } })} accessibilityRole="search" accessibilityLabel="Where do you want to go?" style={styles.search}>
            <View style={styles.dropMarker}>
              <Square size={10} color={DROP} fill={DROP} />
            </View>
            <Text style={styles.searchText} numberOfLines={1}>Where do you want to go?</Text>
            <ChevronRight size={20} color={color.textMuted} />
          </Press>
        </View>

        <View style={styles.sheet}>
          <RecentLocationsList navigate={navigate} routePrefix={routePrefix} />

          {currentRide && lower(currentRide?.status) !== 'end_requested' ? (
            <Press scale={0.99} onPress={() => navigate(trackingPath, { state: currentRide })} accessibilityLabel={serviceType === 'rental' ? 'Active rental booking. View details' : 'Active ride. View details'} style={styles.activeRide}>
              <View style={styles.activeRideLeft}>
                <View style={{ width: 10, height: 10 }}>
                  <Animated.View style={[styles.pingDot, { opacity: ping.interpolate({ inputRange: [0, 1], outputRange: [0.75, 0] }), transform: [{ scale: ping.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] }) }] }]} />
                  <View style={styles.pingDot} />
                </View>
                <Text style={styles.activeRideText} numberOfLines={1}>{serviceType === 'rental' ? 'You have an active rental booking' : 'You have an active ride'}</Text>
              </View>
              <View style={styles.inlineLink}>
                <Text style={styles.linkText}>View details</Text>
                <ChevronRight size={16} color={color.primary} />
              </View>
            </Press>
          ) : null}

          {!sections || sections.enableEverything !== false ? (
            <ServiceGrid navigate={navigate} onOpenAll={() => setIsAllServicesOpen(true)} onLoadServices={setActiveServices} />
          ) : null}

          {settingsLoading ? (
            <SectionSkeleton w={88} h={100} count={4} radius={radii.lg} />
          ) : sections?.enableExplore === false ? null : (
            <View>
              <SectionHeader title="Explore" action="View all" onAction={() => setIsAllServicesOpen(true)} />
              <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.hScroll}>
                {exploreCards.map((card, idx) => (
                  <Press key={card.id || idx} scale={0.96} onPress={() => handleServiceClick(card)} accessibilityLabel={card.title} style={styles.exploreCard}>
                    <SafeImage item={card} fallbackImage={exploreIcon(card.title)} style={{ width: 36, height: 36 }} />
                    <Text style={styles.exploreTitle} numberOfLines={2}>{card.title}</Text>
                  </Press>
                ))}
              </ScrollView>
            </View>
          )}

          {settingsLoading ? (
            <Pulse style={styles.promoSkeleton} />
          ) : sections?.enablePromo === false || !promoBanners || promoBanners.length === 0 ? null : (
            <PromoCarousel promoBanners={promoBanners} currentPromoIndex={currentPromoIndex} setCurrentPromoIndex={setCurrentPromoIndex} setIsHoveringPromo={setIsHoveringPromo} navigate={navigate} routePrefix={routePrefix} />
          )}

          {settingsLoading ? (
            <SectionSkeleton w={156} h={162} count={3} radius={radii.lg} />
          ) : sections?.enableGoPlaces === false ? null : (
            <View>
              <SectionHeader title="Go places with Dima Hasao" style={{ marginBottom: space.xs }} />
              <Text style={styles.goSub}>Fast bookings to key transit hubs</Text>
              <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.hScroll}>
                {goPlacesCards.map((card, idx) => (
                  <Press key={card.id || idx} scale={0.97} onPress={() => navigate(card.route || `${routePrefix}/ride/select-location`)} accessibilityLabel={`${card.title}. Book now`} style={styles.goCard}>
                    <View style={styles.goImage}>
                      <SafeImage item={card} fallbackImage={goPlacesIcon(card.title)} style={{ width: '100%', height: '100%' }} />
                    </View>
                    <View style={styles.goBody}>
                      <Text style={styles.goTitle} numberOfLines={2}>{card.title}</Text>
                      <View style={styles.inlineLink}>
                        <Text style={styles.linkText}>Book now</Text>
                        <ChevronRight size={16} color={color.primary} />
                      </View>
                    </View>
                  </Press>
                ))}
              </ScrollView>
            </View>
          )}

          {isScheduledAcceptedRide ? (
            <Press scale={0.99} onPress={() => navigate(trackingPath, { state: currentRide })} accessibilityLabel={`Scheduled ride confirmed. ${scheduledCountdown}`} style={styles.scheduled}>
              <View style={styles.rowBetween}>
                <StatusBadge label="Confirmed" tone="info" />
                <View style={styles.liveRow}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>Live status</Text>
                </View>
              </View>
              <View style={styles.countdownRow}>
                <View style={styles.flexText}>
                  <View style={styles.liveRow}>
                    <CalendarClock size={18} color={color.goldOnDark} />
                    <Text style={styles.countdown}>{scheduledCountdown}</Text>
                  </View>
                  <Text style={styles.countdownDate}>{scheduledDateLabel}</Text>
                </View>
                <View style={styles.rideIcon}>
                  <Image source={toSource(currentRideIcon)} style={{ width: 36, height: 36 }} resizeMode="contain" />
                </View>
              </View>
              <View style={styles.driverRow}>
                <View style={styles.activeRideLeft}>
                  <View style={styles.driverAvatar}>
                    <User size={18} color={color.primary} />
                  </View>
                  <View style={styles.flexText}>
                    <Text style={styles.driverLabel}>Driver and vehicle</Text>
                    <Text style={styles.driverValue} numberOfLines={1}>
                      {driverName} • {vehicleLabel}
                    </Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.driverLabel}>Fare</Text>
                  <Text style={styles.driverFare}>₹{Number(currentRide?.fare || 0).toFixed(0)}</Text>
                </View>
              </View>
            </Press>
          ) : null}

          {settingsLoading ? (
            <Pulse style={styles.promoSkeleton} />
          ) : sections?.enableFooter === false ? null : (
            <View style={styles.footer}>
              <Image source={toSource(getDynamicImageSrc(uiSettings?.footer || {}, seamlessHighwayBg))} style={StyleSheet.absoluteFill} resizeMode="cover" />
              <LinearGradient colors={['rgba(6,44,22,0.35)', 'rgba(6,44,22,0.75)', 'rgba(6,44,22,0.92)']} style={StyleSheet.absoluteFill} />
              <Text style={styles.footerHash}>{String(footer.hashtag || '')}</Text>
              <Text style={styles.footerLine1}>{String(footer.line1 || '')}</Text>
              <Text style={styles.footerLine2}>{String(footer.line2 || '')}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <BottomSheet visible={isAllServicesOpen} onClose={() => setIsAllServicesOpen(false)} backdrop={color.overlay} spring={{ stiffness: 240, damping: 26 }} panelStyle={[styles.allSheet, { height: height * 0.85, paddingBottom: space.xl + insets.bottom }]}>
        <Press scale={1} onPress={() => setIsAllServicesOpen(false)} accessibilityLabel="Close" style={styles.grabberHit}>
          <View style={styles.grabber} />
        </Press>
        <View style={styles.allHead}>
          <Text style={styles.allTitle} accessibilityRole="header">All services</Text>
          <IconButton icon={X} label="Close all services" variant="soft" onPress={() => setIsAllServicesOpen(false)} />
        </View>
        <ScrollView style={{ flex: 1, marginTop: space.lg }} showsVerticalScrollIndicator={false} contentContainerStyle={styles.allGrid}>
          {activeServices.length === 0 ? <EmptyState icon={LayoutGrid} title="No services yet" message="Taxi services for your area will show here." style={{ width: '100%' }} /> : null}
          {activeServices.map((service, index) => (
            <Press key={index} scale={0.95} onPress={() => handleServiceClick(service)} accessibilityLabel={service.label} style={styles.allItem}>
              <View style={styles.allIconBox}>
                <Image source={toSource(service.icon)} style={{ width: 44, height: 44 }} resizeMode="contain" />
              </View>
              <Text style={styles.allLabel} numberOfLines={2}>{service.label}</Text>
            </Press>
          ))}
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

/** Drop is marked with a red square everywhere in the ride flow; pickup is a brand-green dot. */
const DROP = color.danger;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  flexText: { flex: 1, minWidth: 0 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  inlineLink: { flexDirection: 'row', alignItems: 'center', gap: space.xxs, minHeight: 32 },
  linkText: { ...type.label, color: color.primary },
  bleed: { marginHorizontal: -space.lg },
  hScroll: { gap: space.md, paddingHorizontal: space.lg, paddingBottom: space.xs },

  mapArea: { height: 240, backgroundColor: color.surfaceMuted },
  pickupPill: {
    position: 'absolute', left: space.lg, right: space.lg, bottom: space.xl, minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: space.md,
    borderRadius: radii.lg, paddingHorizontal: space.lg, paddingVertical: space.sm, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, ...elevation.float,
  },
  pickupDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: color.primary, borderWidth: 2, borderColor: color.primarySoft },
  pickupLabel: { ...type.caption, color: color.primary },
  pickupText: { ...type.bodyStrong, color: color.text },
  pickupChange: { ...type.label, color: color.primary, paddingLeft: space.md, borderLeftWidth: 1, borderLeftColor: color.border },

  searchWrap: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.sm, backgroundColor: color.bg },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56, borderRadius: radii.lg, paddingHorizontal: space.lg,
    backgroundColor: color.surface, borderWidth: 1.5, borderColor: color.primaryBorder, ...elevation.card,
  },
  dropMarker: { width: 24, height: 24, borderRadius: radii.sm, backgroundColor: color.dangerSoft, alignItems: 'center', justifyContent: 'center' },
  searchText: { ...type.subheading, flex: 1, color: color.text },
  sheet: { paddingHorizontal: space.lg, paddingTop: space.sm, gap: space.xxl, backgroundColor: color.bg },

  recentRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingLeft: space.lg, paddingRight: space.xs },
  recentMain: { flexDirection: 'row', alignItems: 'center', gap: space.md, flex: 1, minWidth: 0, minHeight: 64, paddingVertical: space.sm },
  recentIcon: { width: 40, height: 40, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', backgroundColor: color.primarySoft },
  recentName: { ...type.bodyStrong, color: color.text },
  recentAddr: { ...type.small, color: color.textMuted },
  heartBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  recentDivider: { height: StyleSheet.hairlineWidth, backgroundColor: color.border, marginLeft: space.lg + 40 + space.md },

  activeRide: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, paddingHorizontal: space.lg, minHeight: 56,
    borderRadius: radii.lg, borderWidth: 1, backgroundColor: color.primarySoft, borderColor: color.primaryBorder, marginTop: -space.md,
  },
  activeRideLeft: { flexDirection: 'row', alignItems: 'center', gap: space.md, flex: 1, minWidth: 0 },
  pingDot: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: color.success },
  activeRideText: { ...type.bodyStrong, flex: 1, color: color.text },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space.md },
  gridCell: { width: '48.4%' },
  gridSkeleton: { width: '48.4%', height: 104, borderRadius: radii.lg, backgroundColor: color.surfaceMuted },
  everything: {
    height: 104, borderRadius: radii.lg, overflow: 'hidden', backgroundColor: color.surface, borderWidth: 1, borderColor: color.border,
    flexDirection: 'row', alignItems: 'stretch', ...elevation.card,
  },
  everythingDark: { backgroundColor: color.primaryDeep, borderColor: color.primaryDeep },
  everythingText: { flex: 1, minWidth: 0, padding: space.md, justifyContent: 'center', gap: space.xxs },
  everythingTitle: { ...type.subheading, color: color.text },
  everythingSub: { ...type.caption, color: color.textMuted },
  everythingImageWrap: { width: '38%', alignItems: 'center', justifyContent: 'center', paddingRight: space.sm },
  everythingImage: { width: '100%', height: 72 },
  allIcon: {
    width: 44, height: 44, borderRadius: radii.md, alignSelf: 'center', marginRight: space.md, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: color.gold,
  },

  exploreCard: {
    width: 88, minHeight: 100, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface,
    alignItems: 'center', justifyContent: 'center', padding: space.sm, gap: space.sm, ...elevation.card,
  },
  exploreTitle: { ...type.caption, fontFamily: 'Poppins_600SemiBold', color: color.text, textAlign: 'center' },

  promo: { borderRadius: radii.lg, overflow: 'hidden', backgroundColor: color.primaryDeep, ...elevation.card },
  promoSkeleton: { height: 150, borderRadius: radii.lg, backgroundColor: color.surfaceMuted },
  promoText: { ...StyleSheet.absoluteFill, justifyContent: 'center', padding: space.xl, paddingRight: '28%', gap: space.xs },
  promoTag: { alignSelf: 'flex-start', backgroundColor: color.goldBright, paddingHorizontal: space.sm, height: 24, justifyContent: 'center', borderRadius: radii.pill },
  promoTagText: { ...type.caption, fontFamily: 'Poppins_600SemiBold', color: color.onGold },
  promoTitle: { ...type.heading, color: color.textInverse },
  promoSub: { ...type.small, color: color.textOnDarkMuted },
  promoBar: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, backgroundColor: 'rgba(255,255,255,0.15)' },
  promoDots: { position: 'absolute', right: space.md, bottom: space.sm, flexDirection: 'row', gap: space.sm },
  promoDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)' },
  promoDotOn: { width: 20, backgroundColor: color.gold },

  skeletonTitle: { width: 120, height: 18, borderRadius: radii.sm, backgroundColor: color.surfaceMuted, marginBottom: space.md },
  goSub: { ...type.small, color: color.textMuted, marginBottom: space.md },
  goCard: { width: 160, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface, overflow: 'hidden', ...elevation.card },
  goImage: { height: 84, padding: space.md, backgroundColor: color.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  goBody: { padding: space.md, flex: 1, justifyContent: 'space-between', gap: space.sm },
  goTitle: { ...type.bodyStrong, color: color.text },

  footer: {
    minHeight: 220, padding: space.xxl, borderRadius: radii.lg, overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
    backgroundColor: color.primaryDeep, gap: space.sm,
  },
  footerHash: { ...type.heroSerif, color: color.goldOnDark, textAlign: 'center' },
  footerLine1: { ...type.subheading, color: color.textInverse, textAlign: 'center' },
  footerLine2: { ...type.small, color: color.textOnDarkMuted, textAlign: 'center' },

  scheduled: { borderRadius: radii.lg, padding: space.xl, backgroundColor: color.primaryDeep, borderWidth: 1, borderColor: color.gold, ...elevation.float },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.goldOnDark },
  liveText: { ...type.caption, color: color.goldOnDark },
  countdownRow: { marginTop: space.lg, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: space.md },
  countdown: { ...type.priceLg, color: color.textInverse, flexShrink: 1 },
  countdownDate: { ...type.small, marginTop: space.xs, color: color.textOnDarkMuted },
  rideIcon: { width: 52, height: 52, borderRadius: radii.md, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' },
  driverRow: {
    marginTop: space.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, borderRadius: radii.md, padding: space.md,
    backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
  },
  driverAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  driverLabel: { ...type.caption, color: color.textOnDarkMuted },
  driverValue: { ...type.bodyStrong, color: color.textInverse },
  driverFare: { ...type.price, color: color.goldOnDark },

  allSheet: { backgroundColor: color.bg, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, paddingHorizontal: space.xl, paddingTop: space.sm, ...elevation.sheet },
  grabberHit: { alignItems: 'center', justifyContent: 'center', height: 24 },
  grabber: { width: 44, height: 4, borderRadius: 2, backgroundColor: color.borderStrong },
  allHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: space.md, borderBottomWidth: 1, borderBottomColor: color.border },
  allTitle: { ...type.heading, color: color.text },
  allGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: space.xl, paddingVertical: space.xs },
  allItem: { width: '25%', alignItems: 'center', gap: space.sm },
  allIconBox: { width: 64, height: 64, borderRadius: radii.lg, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: color.border, ...elevation.card },
  allLabel: { ...type.caption, fontFamily: 'Poppins_600SemiBold', color: color.text, textAlign: 'center', maxWidth: 80 },
});
