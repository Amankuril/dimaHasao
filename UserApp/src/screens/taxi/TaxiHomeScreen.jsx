/**
 * Ported from Frontend/src/modules/Taxi/modules/user/pages/Home.jsx (mobile
 * layout branch only — the desktop branch never renders in an RN app) plus
 * its ServiceGrid.jsx ("Everything In Minutes" grid + All Services modal).
 *
 * Kept 1:1: the admin-configurable home sections (everything/explore/promo/
 * goPlaces/footer, each falling back from live settings -> cached settings ->
 * hardcoded defaults), the service-click routing rules (bike/auto/cab
 * detection by name, retired parcel/rental/bus/self-drive routes redirecting
 * to ride booking), and the active-ride polling loop (same intervals, same
 * idle backoff, same focus-triggered resync).
 *
 * Adapted for RN: window/document events -> AppState + DeviceEventEmitter,
 * localStorage -> AsyncStorage (async), CSS decorative blur/shimmer ->
 * simple equivalents.
 */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  AppState,
  DeviceEventEmitter,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {ChevronRight, MapPin, Search, User, Wallet, X} from 'lucide-react-native';

import {useSettings} from '../../context/SettingsContext';
import {userService} from '../../services/taxi/userService';
import {getLocalUserToken, clearLocalUserSession} from '../../services/taxi/authService';
import api from '../../services/taxi/axiosInstance';
import {
  CURRENT_RIDE_UPDATED_EVENT,
  getCurrentRide,
  getCurrentRideSignature,
  isActiveCurrentRide,
  saveCurrentRide,
  clearCurrentRide,
} from '../../services/taxi/currentRideService';
import LocationMapSection from '../../components/taxi/LocationMapSection';
import VehicleIcon from '../../components/taxi/VehicleIcon';
import RecentLocationsList from '../../components/taxi/RecentLocationsList';

const ADMIN_SETTINGS_CACHE_KEY = 'dimahasao_taxi_admin_ui_settings';
const ACTIVE_RIDE_SYNC_INTERVAL_MS = 15000;
const IDLE_RIDE_SYNC_INTERVALS_MS = [60000, 120000, 180000];
const FORCED_SYNC_COOLDOWN_MS = 10000;

const DEFAULT_SETTINGS = {
  homeSections: {enableEverything: true, enableExplore: true, enablePromo: true, enableGoPlaces: true, enableFooter: true},
  everything: [
    {id: '1', title: 'Book now', subtitle: 'Your everyday rides', route: 'SelectLocation', order: 1, status: 'active'},
    {id: '2', title: 'Bike Taxi', subtitle: 'Beat the traffic', route: 'SelectLocation', order: 2, status: 'active'},
    {id: '3', title: 'Outstation', subtitle: 'Trips beyond the district', route: 'IntercityHome', order: 3, status: 'active'},
    {id: '4', title: 'All Services', subtitle: 'All Services', route: 'ALL_SERVICES_MODAL', order: 4, status: 'active'},
  ],
  explore: [
    {id: '1', title: 'Auto', route: 'SelectLocation', order: 1, status: 'active'},
    {id: '2', title: 'Cab Economy', route: 'SelectLocation', order: 2, status: 'active'},
    {id: '3', title: 'Bike', route: 'SelectLocation', order: 3, status: 'active'},
    {id: '4', title: 'Outstation', route: 'IntercityHome', order: 4, status: 'active'},
  ],
  promos: [
    {id: '1', title: 'Rides across Dima Hasao', subtitle: 'Haflong, Maibang, Umrangso and everywhere between.', route: 'SelectLocation', order: 1, status: 'active'},
    {id: '2', title: 'Heading out of the district?', subtitle: 'Book an outstation cab to Silchar, Guwahati or Lumding.', route: 'IntercityHome', order: 2, status: 'active'},
  ],
  goPlaces: [
    {id: '1', title: 'Rides to Haflong Railway Station', route: 'SelectLocation', order: 1, status: 'active'},
    {id: '2', title: 'Airport transfers to Silchar', route: 'IntercityHome', order: 2, status: 'active'},
    {id: '3', title: 'Outstation trips', route: 'IntercityHome', order: 3, status: 'active'},
  ],
  footer: {hashtag: '#DimaHasao', line1: 'Made for the district', line2: 'Crafted for riders'},
};

const unwrapApiPayload = response => response?.data?.data || response?.data || response;

/** bike/auto/cab from a free-text service name, same precedence as the web version. */
const vehicleTypeFromName = name => {
  const value = String(name || '').toLowerCase();
  if (value.includes('bike') || value.includes('moto')) return 'bike';
  if (value.includes('auto')) return 'auto';
  if (value.includes('cab') || value.includes('taxi') || value.includes('car') || value === 'book now' || value === 'ride') return 'cab';
  return '';
};

/** Routes a retired module (parcel/rental/bus/self-drive) could still carry. */
const RETIRED_ROUTES = new Set(['Parcel', 'Rental', 'Bus', 'SelfDrive']);

export default function TaxiHomeScreen() {
  const navigation = useNavigation();
  const {settings} = useSettings();

  const [uiSettings, setUiSettings] = useState(DEFAULT_SETTINGS);
  const [isAllServicesOpen, setIsAllServicesOpen] = useState(false);
  const [modules, setModules] = useState([]);
  const [modulesLoading, setModulesLoading] = useState(true);
  const [currentRide, setCurrentRide] = useState(null);
  const [promoIndex, setPromoIndex] = useState(0);

  const currentRideRef = useRef(null);
  const lastSyncAtRef = useRef(0);
  const consecutiveIdleMissesRef = useRef(0);
  const lastRideSignatureRef = useRef('');

  // Settings cascade: live bootstrap settings -> cached copy -> hardcoded defaults.
  useEffect(() => {
    (async () => {
      if (settings?.userHomeSettings && Object.keys(settings.userHomeSettings).length > 0) {
        setUiSettings(settings.userHomeSettings);
        await AsyncStorage.setItem(ADMIN_SETTINGS_CACHE_KEY, JSON.stringify(settings.userHomeSettings));
        return;
      }
      try {
        const cached = await AsyncStorage.getItem(ADMIN_SETTINGS_CACHE_KEY);
        if (cached) setUiSettings(JSON.parse(cached));
      } catch {
        // keep defaults
      }
    })();
  }, [settings?.userHomeSettings]);

  useEffect(() => {
    let active = true;
    (async () => {
      setModulesLoading(true);
      try {
        const response = await userService.getAppModules({limit: 100});
        const list = response?.data?.data?.results || response?.data?.results || response?.data || [];
        if (active) setModules(Array.isArray(list) ? list : []);
      } catch {
        // the "everything" grid still works off uiSettings without live modules
      } finally {
        if (active) setModulesLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    (async () => {
      const token = await getLocalUserToken();
      if (!token) {
        await clearLocalUserSession();
        navigation.reset({index: 0, routes: [{name: 'Login'}]});
      }
    })();
  }, [navigation]);

  const persistCurrentRide = useCallback(ride => {
    const normalized = isActiveCurrentRide(ride) ? ride : null;
    const nextSignature = getCurrentRideSignature(normalized);
    if (lastRideSignatureRef.current === nextSignature) return;

    lastRideSignatureRef.current = nextSignature;
    setCurrentRide(normalized);
    currentRideRef.current = normalized;
    if (normalized) saveCurrentRide(normalized);
    else clearCurrentRide();
  }, []);

  // Active-ride resume banner: same polling cadence as the web version (15s
  // while a ride is active, backing off to 60/120/180s while idle), synced on
  // mount and whenever the app returns to the foreground.
  useEffect(() => {
    let cancelled = false;
    let syncTimer = null;
    let syncInFlight = false;

    const scheduleNextSync = () => {
      if (cancelled) return;
      const nextInterval = currentRideRef.current
        ? ACTIVE_RIDE_SYNC_INTERVAL_MS
        : IDLE_RIDE_SYNC_INTERVALS_MS[Math.min(consecutiveIdleMissesRef.current, IDLE_RIDE_SYNC_INTERVALS_MS.length - 1)];
      syncTimer = setTimeout(syncCurrentRide, nextInterval);
    };

    const syncCurrentRide = async (reason = 'timer') => {
      if (cancelled || syncInFlight) {
        scheduleNextSync();
        return;
      }
      if (reason === 'focus' && Date.now() - lastSyncAtRef.current < FORCED_SYNC_COOLDOWN_MS) {
        scheduleNextSync();
        return;
      }

      syncInFlight = true;
      lastSyncAtRef.current = Date.now();
      try {
        const token = await getLocalUserToken();
        if (!token) {
          persistCurrentRide(null);
          consecutiveIdleMissesRef.current = 0;
          return;
        }

        let rideData = null;
        try {
          rideData = unwrapApiPayload(await api.get('/rides/active/me'));
        } catch (error) {
          if (Number(error?.status || 0) !== 404) throw error;
        }

        if (rideData?._id || rideData?.rideId) {
          const normalizedRide = {
            rideId: rideData._id || rideData.rideId,
            pickup: rideData.pickupAddress || rideData.pickup,
            drop: rideData.dropAddress || rideData.drop,
            fare: rideData.fare,
            status: rideData.status,
            liveStatus: rideData.liveStatus,
            serviceType: rideData.serviceType,
            scheduledAt: rideData.scheduledAt || null,
            otp: rideData.otp || '',
            driver: rideData.driverId || rideData.driver,
          };
          if (isActiveCurrentRide(normalizedRide)) {
            if (cancelled) return;
            consecutiveIdleMissesRef.current = 0;
            persistCurrentRide(normalizedRide);
            return;
          }
        }

        if (cancelled) return;
        consecutiveIdleMissesRef.current = Math.min(consecutiveIdleMissesRef.current + 1, IDLE_RIDE_SYNC_INTERVALS_MS.length - 1);
        persistCurrentRide(null);
      } finally {
        syncInFlight = false;
        scheduleNextSync();
      }
    };

    (async () => {
      const ride = await getCurrentRide();
      persistCurrentRide(ride);
      syncCurrentRide('mount');
    })();

    const appStateSub = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') syncCurrentRide('focus');
    });
    const rideUpdatedSub = DeviceEventEmitter.addListener(CURRENT_RIDE_UPDATED_EVENT, async () => {
      persistCurrentRide(await getCurrentRide());
    });

    return () => {
      cancelled = true;
      if (syncTimer) clearTimeout(syncTimer);
      appStateSub.remove();
      rideUpdatedSub.remove();
    };
  }, [persistCurrentRide]);

  // Rotate the promo carousel, same as the web's 3s auto-advance.
  const promoBanners = useMemo(
    () => (uiSettings?.homeSections?.enablePromo === false ? [] : uiSettings?.promos || DEFAULT_SETTINGS.promos),
    [uiSettings],
  );
  useEffect(() => {
    if (promoBanners.length <= 1) return;
    const interval = setInterval(() => setPromoIndex(prev => (prev + 1) % promoBanners.length), 3000);
    return () => clearInterval(interval);
  }, [promoBanners.length]);

  const resolveRouteName = route => (RETIRED_ROUTES.has(route) ? 'SelectLocation' : route || 'SelectLocation');

  const handleServiceClick = item => {
    const targetRoute = item.actionRoute || item.route;

    if (targetRoute === 'ALL_SERVICES_MODAL') {
      setIsAllServicesOpen(true);
      return;
    }

    setIsAllServicesOpen(false);

    const name = item.title || item.name || item.label || '';
    const vehicleType = vehicleTypeFromName(name);

    if (targetRoute && targetRoute.trim() !== '') {
      navigation.navigate(resolveRouteName(targetRoute), vehicleType ? {vehicleType} : undefined);
      return;
    }

    if (name.toLowerCase().includes('outstation') || name.toLowerCase().includes('intercity')) {
      navigation.navigate('IntercityHome');
      return;
    }

    navigation.navigate('SelectLocation', vehicleType ? {selectedCategory: vehicleType} : undefined);
  };

  const activeModules = useMemo(
    () => (modules || []).filter(m => m.active === 1 || m.active === true || String(m.active) === '1'),
    [modules],
  );

  const everythingItems = useMemo(() => {
    const items = uiSettings?.homeSections?.enableEverything === false ? [] : uiSettings?.everything || DEFAULT_SETTINGS.everything;
    return items.filter(i => i.status === 'active' || i.status === true).sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  }, [uiSettings]);

  const exploreItems = useMemo(() => {
    const items = uiSettings?.homeSections?.enableExplore === false ? [] : uiSettings?.explore || DEFAULT_SETTINGS.explore;
    return items.filter(i => i.status === 'active' || i.status === true).sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  }, [uiSettings]);

  const goPlacesItems = useMemo(() => {
    if (uiSettings?.homeSections?.enableGoPlaces === false) return [];
    return uiSettings?.goPlaces || DEFAULT_SETTINGS.goPlaces;
  }, [uiSettings]);

  const footer = uiSettings?.homeSections?.enableFooter === false ? null : uiSettings?.footer || DEFAULT_SETTINGS.footer;

  const serviceType = String(currentRide?.serviceType || 'ride').toLowerCase();

  return (
    <View className="flex-1 bg-white">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Map header */}
        <View style={{height: 220}} className="relative">
          <LocationMapSection />

          <View className="absolute top-3 left-3 right-3 flex-row items-center justify-between">
            <Pressable onPress={() => navigation.navigate('More')} className="w-10 h-10 rounded-full bg-[#06381e]/90 items-center justify-center">
              <MapPin size={18} color="#fff" />
            </Pressable>
            <View className="flex-row gap-2">
              <Pressable onPress={() => navigation.navigate('Wallet')} className="w-10 h-10 rounded-full bg-[#06381e]/90 items-center justify-center">
                <Wallet size={18} color="#fff" />
              </Pressable>
              {/*
               * The web's own Taxi bottom nav was retired in favor of the
               * platform-wide one, whose Profile tab is the yet-to-be-built
               * top-level DimaHasao Profile (task #12) — not this Taxi-specific
               * one. Until that lands, this is this app's only way into
               * TaxiProfileScreen and everything under it (settings, SOS,
               * notifications, promo codes, referral).
               */}
              <Pressable onPress={() => navigation.navigate('TaxiProfile')} className="w-10 h-10 rounded-full bg-[#06381e]/90 items-center justify-center">
                <User size={18} color="#fff" />
              </Pressable>
            </View>
          </View>

          <Pressable
            onPress={() => navigation.navigate('SelectLocation', {activeInput: 'pickup', flow: 'ride'})}
            className="absolute bottom-3 left-3 right-3 flex-row items-center gap-2.5 rounded-full px-4 py-2.5 bg-white shadow">
            <View className="w-2.5 h-2.5 rounded-full bg-[#168a45]" />
            <Text className="text-xs font-bold text-slate-800 flex-1" numberOfLines={1}>
              Tap to set your pickup location
            </Text>
            <Text className="text-[10px] font-black text-amber-500 uppercase">Change</Text>
          </Pressable>
        </View>

        <View className="px-3 pt-3 gap-3">
          {/* Where do you want to go? */}
          <Pressable
            onPress={() => navigation.navigate('SelectLocation', {activeInput: 'drop', flow: 'ride'})}
            className="flex-row items-center gap-3 rounded-full px-4 py-3.5 bg-white border border-slate-200 shadow-sm">
            <Search size={18} color="#0f172a" />
            <Text className="flex-1 text-[14px] font-semibold text-slate-900">Where do you want to go?</Text>
          </Pressable>

          <RecentLocationsList />

          {/* Active ride resume banner */}
          {currentRide && String(currentRide.status || '').toLowerCase() !== 'end_requested' && (
            <Pressable
              onPress={() => navigation.navigate('RideTracking', {ride: currentRide})}
              className="flex-row items-center justify-between px-4 py-3.5 rounded-2xl border border-emerald-100 bg-emerald-50">
              <View className="flex-row items-center gap-2.5">
                <View className="w-2 h-2 rounded-full bg-emerald-500" />
                <Text className="text-[13px] font-bold text-slate-900">
                  {serviceType === 'rental' ? 'You have an active rental booking' : 'You have an active ride'}
                </Text>
              </View>
              <View className="flex-row items-center gap-0.5">
                <Text className="text-[12px] font-black text-emerald-700">View details</Text>
                <ChevronRight size={14} color="#047857" />
              </View>
            </Pressable>
          )}

          {/* Everything In Minutes */}
          {everythingItems.length > 0 && (
            <View>
              <Text className="text-[19px] font-extrabold text-slate-900 mb-2.5">Everything In Minutes</Text>
              <View className="flex-row flex-wrap justify-between">
                {everythingItems.map((item, idx) => (
                  <Pressable
                    key={item.id || idx}
                    onPress={() => handleServiceClick(item)}
                    className="w-[48%] h-[110px] rounded-[20px] bg-[#F7F8FB] border border-slate-200 justify-center px-3 mb-3">
                    <View className="w-9 h-9 rounded-full bg-amber-100 items-center justify-center mb-2">
                      <VehicleIcon name={item.title} size={18} color="#b45309" />
                    </View>
                    <Text className="text-[13px] font-black text-slate-900">{item.title}</Text>
                    <Text className="text-[10px] text-slate-500 mt-0.5" numberOfLines={1}>
                      {item.subtitle}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Explore */}
          {exploreItems.length > 0 && (
            <View>
              <View className="flex-row items-center justify-between mb-2.5">
                <Text className="text-[19px] font-extrabold text-slate-900">Explore</Text>
                <Pressable onPress={() => setIsAllServicesOpen(true)} className="flex-row items-center gap-0.5">
                  <Text className="text-[12px] font-black uppercase text-amber-500">View All</Text>
                  <ChevronRight size={12} color="#f59e0b" />
                </Pressable>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {exploreItems.map((card, idx) => (
                  <Pressable
                    key={card.id || idx}
                    onPress={() => handleServiceClick(card)}
                    className="w-[86px] h-[96px] rounded-[20px] bg-[#F7F8FB] border border-slate-200 items-center justify-center mr-3 px-1">
                    <VehicleIcon name={card.title} size={22} color="#0B1220" />
                    <Text className="text-[12px] font-black text-slate-900 mt-2 text-center" numberOfLines={2}>
                      {card.title}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Promo carousel */}
          {promoBanners.length > 0 && (
            <Pressable
              onPress={() => handleServiceClick(promoBanners[promoIndex])}
              className="rounded-[20px] overflow-hidden bg-[#0B1220] p-4" style={{minHeight: 110}}>
              <Text className="text-white font-bold text-sm">{promoBanners[promoIndex]?.title}</Text>
              <Text className="text-slate-300 text-xs mt-1">{promoBanners[promoIndex]?.subtitle}</Text>
              <View className="flex-row gap-1.5 mt-3">
                {promoBanners.map((_, idx) => (
                  <View key={idx} className="h-1.5 rounded-full" style={{width: idx === promoIndex ? 18 : 6, backgroundColor: idx === promoIndex ? '#FFC400' : 'rgba(255,255,255,0.4)'}} />
                ))}
              </View>
            </Pressable>
          )}

          {/* Go places */}
          {goPlacesItems.length > 0 && (
            <View className="gap-2">
              {goPlacesItems.map((item, idx) => (
                <Pressable
                  key={item.id || idx}
                  onPress={() => handleServiceClick(item)}
                  className="flex-row items-center justify-between px-4 py-3 rounded-xl bg-slate-50 border border-slate-200">
                  <Text className="text-[13px] font-semibold text-slate-800 flex-1" numberOfLines={1}>
                    {item.title}
                  </Text>
                  <ChevronRight size={16} color="#64748B" />
                </Pressable>
              ))}
            </View>
          )}

          {/* Footer */}
          {footer && (
            <View className="items-center py-6">
              <Text className="text-amber-500 font-black text-sm">{footer.hashtag}</Text>
              <Text className="text-slate-900 font-bold text-base mt-1">{footer.line1}</Text>
              <Text className="text-slate-500 text-xs mt-0.5">{footer.line2}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* All Services modal */}
      <Modal visible={isAllServicesOpen} animationType="slide" transparent onRequestClose={() => setIsAllServicesOpen(false)}>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-4" style={{maxHeight: '75%'}}>
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-base font-extrabold text-slate-900">All Services</Text>
              <Pressable onPress={() => setIsAllServicesOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center">
                <X size={16} color="#475569" />
              </Pressable>
            </View>
            {modulesLoading ? (
              <ActivityIndicator className="py-8" />
            ) : (
              <ScrollView contentContainerStyle={{paddingBottom: 16}}>
                <View className="flex-row flex-wrap justify-between">
                  {(activeModules.length ? activeModules : everythingItems).map((m, idx) => (
                    <Pressable
                      key={m._id || m.id || idx}
                      onPress={() =>
                        handleServiceClick({
                          title: m.name || m.title,
                          route:
                            String(m.service_type || '').toLowerCase() === 'outstation' ? 'IntercityHome' : 'SelectLocation',
                        })
                      }
                      className="w-[31%] items-center py-3 mb-2">
                      <View className="w-12 h-12 rounded-full bg-slate-100 items-center justify-center mb-1.5">
                        <VehicleIcon name={m.name || m.title} size={20} />
                      </View>
                      <Text className="text-[11px] font-bold text-slate-800 text-center" numberOfLines={2}>
                        {m.name || m.title}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
