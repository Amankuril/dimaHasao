/**
 * Ported from Frontend/src/modules/Taxi/modules/user/pages/Activity.jsx and
 * its components/activity/* (Header, Tabs, Card, Pager, States, helpers) —
 * folded into one file since none of those pieces are reused outside this
 * screen.
 *
 * Dropped: the "rental" service-type branch throughout (current-ride card
 * variant, live-charge ticking, rental tracking path) — the rental booking
 * vertical itself was never ported to this app, so there is nothing for it
 * to key off. Bus/pooling booking normalizers in the web's activityHelpers.js
 * are dead code even there (Activity.jsx never calls them) and are skipped
 * here too. Vehicle photo assets become VehicleIcon (lucide) like every
 * other screen in this port; the driver-avatar fallback (ui-avatars.com) is
 * a plain remote image URL and needs no adaptation.
 */
import React, {useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, DeviceEventEmitter, Image, Pressable, ScrollView, SafeAreaView, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {AlertCircle, ArrowLeft, Calendar, ChevronRight, Clock, Headset, MapPin, ShieldCheck, User} from 'lucide-react-native';

import api from '../../services/taxi/axiosInstance';
import {CURRENT_RIDE_UPDATED_EVENT, getCurrentRide, isActiveCurrentRide} from '../../services/taxi/currentRideService';
import VehicleIcon from '../../components/taxi/VehicleIcon';

const PAGE_SIZE = 4;
const TABS = ['All', 'Rides', 'Outstation', 'Scheduled', 'Support'];
const AGGREGATE_FETCH_LIMIT = 60;

const buildAvatarFallback = (name = 'Captain') =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=E2E8F0&color=0F172A&bold=true`;

const pickFirstString = (...values) => {
  for (const value of values) {
    const normalized = String(value || '').trim();
    if (normalized) return normalized;
  }
  return '';
};

const getPayload = response => response?.data?.data || response?.data || response || {};

const toTimestamp = value => {
  if (!value) return 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const formatRideDate = value => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString('en-IN', {day: '2-digit', month: 'short'});
};

const formatRideTime = value => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleTimeString('en-IN', {hour: '2-digit', minute: '2-digit', hour12: true});
};

const formatStatus = status => {
  const normalized = String(status || 'searching').toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const getStatusTone = (status = '') => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'completed' || normalized === 'confirmed') return 'success';
  if (normalized === 'cancelled' || normalized === 'failed' || normalized === 'expired') return 'danger';
  return 'warning';
};

const coordLabel = (location, fallback) => {
  const coords = location?.coordinates || [];
  const [lng, lat] = coords;
  if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) return `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
  return fallback;
};

const getRideTimeSource = ride => ride.completedAt || ride.startedAt || ride.acceptedAt || ride.createdAt || ride.updatedAt;

const normalizeRide = ride => {
  const timeSource = getRideTimeSource(ride);
  const driverName = pickFirstString(
    ride?.driver?.name,
    ride?.driver?.fullName,
    ride?.driverName,
    ride?.driver?.phone ? `Driver ${ride.driver.phone}` : '',
    'Driver assigned',
  );
  const iconType = ride?.vehicleIconType || ride?.driver?.vehicleIconType || ride?.driver?.vehicleType || 'car';
  const status = formatStatus(ride.status || ride.liveStatus);
  const serviceType = String(ride.serviceType || ride.type || 'ride').toLowerCase();
  const pickup = ride.pickupAddress || coordLabel(ride.pickupLocation, 'Pickup');
  const drop = ride.dropAddress || coordLabel(ride.dropLocation, 'Drop');
  const isScheduled = Boolean(ride?.scheduledAt);
  const isOutstation = serviceType === 'intercity';
  const title = isScheduled
    ? `Scheduled ride with ${driverName}`
    : isOutstation
    ? `Outstation trip with ${driverName}`
    : status === 'Searching'
    ? 'Ride request'
    : `Ride with ${driverName}`;

  return {
    id: ride.rideId || ride._id || ride.id,
    title,
    address: `${pickup} to ${drop}`,
    date: formatRideDate(timeSource),
    time: formatRideTime(timeSource),
    status,
    statusTone: getStatusTone(status),
    price: Number(ride.fare || 0).toFixed(0),
    ride,
    driverName,
    eyebrow: isScheduled ? 'Scheduled booking' : isOutstation ? 'Outstation trip' : 'Driver trip',
    driverImage: pickFirstString(ride?.driver?.profileImage, ride?.driver?.profile_image, ride?.driver?.image, ride?.driver?.avatar, buildAvatarFallback(driverName)),
    iconType,
    sortTimestamp: toTimestamp(timeSource),
  };
};

const sortLatestFirst = (items = []) => [...items].sort((left, right) => Number(right.sortTimestamp || 0) - Number(left.sortTimestamp || 0));

const buildLocalPagination = (items, page) => {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(Math.max(Number(page) || 1, 1), totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  return {
    results: items.slice(startIndex, startIndex + PAGE_SIZE),
    pagination: {page: safePage, limit: PAGE_SIZE, total, totalPages, hasNextPage: safePage < totalPages, hasPrevPage: safePage > 1},
  };
};

const getRideCategoryForTab = tab => {
  if (tab === 'Rides') return 'rides';
  if (tab === 'Outstation') return 'outstation';
  if (tab === 'Scheduled') return 'scheduled';
  return '';
};

const getHelperText = tab => {
  if (tab === 'Support') return 'Tickets and help requests';
  if (tab === 'Outstation') return 'Long-distance trips and outstation deliveries';
  if (tab === 'Scheduled') return 'Bookings reserved for a later pickup time';
  return 'Your recent rides and outstation trips';
};

const EMPTY_MESSAGES = {
  all: 'Nothing here yet',
  rides: 'No rides yet',
  outstation: 'No outstation trips yet',
  scheduled: 'No scheduled rides',
  support: 'No support requests yet',
};

const DEFAULT_PAGINATION = {page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1, hasNextPage: false, hasPrevPage: false};

function ActivityCard({item, onPress}) {
  const [driverBroken, setDriverBroken] = useState(false);
  const toneStyle =
    item.statusTone === 'success'
      ? {bg: '#ecfdf5', text: '#047857', border: '#a7f3d0'}
      : item.statusTone === 'danger'
      ? {bg: '#fff1f2', text: '#be123c', border: '#fecdd3'}
      : {bg: '#fffbeb', text: '#b45309', border: '#fde68a'};

  return (
    <Pressable onPress={onPress} className="rounded-2xl border border-slate-200 bg-white p-3.5">
      <View className="flex-row items-start gap-3">
        <View className="relative h-16 w-16 rounded-2xl border border-slate-200 bg-slate-50 items-center justify-center">
          <VehicleIcon name={item.iconType} size={26} color="#334155" />
          <View className="absolute bottom-1.5 right-1.5 h-6 w-6 rounded-full border-2 border-white bg-slate-100 overflow-hidden">
            {!driverBroken && (
              <Image source={{uri: item.driverImage}} onError={() => setDriverBroken(true)} className="w-full h-full" />
            )}
          </View>
        </View>

        <View className="flex-1 min-w-0">
          <View className="flex-row items-start gap-2">
            <View className="flex-1 min-w-0">
              <Text className="text-[14px] font-semibold text-slate-900" numberOfLines={2}>{item.title}</Text>
              <Text className="mt-1 text-[10px] font-semibold text-slate-400" numberOfLines={1}>{item.eyebrow}</Text>
              <Text className="mt-2 text-[12px] text-slate-600" numberOfLines={2}>{item.address}</Text>
            </View>
            <Text className="text-[13px] font-semibold text-slate-900">Rs {item.price}</Text>
          </View>

          <View className="mt-3 flex-row flex-wrap items-center gap-3">
            <View className="flex-row items-center gap-1">
              <Calendar size={11} color="#94a3b8" />
              <Text className="text-[10px] font-semibold text-slate-400">{item.date}</Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Clock size={11} color="#94a3b8" />
              <Text className="text-[10px] font-semibold text-slate-400">{item.time}</Text>
            </View>
            <View className="rounded-full border px-2 py-1 ml-auto" style={{backgroundColor: toneStyle.bg, borderColor: toneStyle.border}}>
              <Text className="text-[9px] font-semibold" style={{color: toneStyle.text}}>{item.status}</Text>
            </View>
          </View>
        </View>

        <View className="mt-1 h-8 w-8 rounded-full border border-slate-200 bg-slate-50 items-center justify-center">
          <ChevronRight size={16} color="#cbd5e1" />
        </View>
      </View>
    </Pressable>
  );
}

export default function ActivityScreen() {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('All');
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);

  const [currentRide, setCurrentRide] = useState(null);

  useEffect(() => {
    const refreshCurrentRide = async () => {
      const ride = await getCurrentRide();
      setCurrentRide(isActiveCurrentRide(ride) ? ride : null);
    };
    refreshCurrentRide();
    const sub = DeviceEventEmitter.addListener(CURRENT_RIDE_UPDATED_EVENT, refreshCurrentRide);
    return () => sub.remove();
  }, []);

  const driverName = currentRide?.driver?.name || 'Captain';
  const serviceType = String(currentRide?.serviceType || currentRide?.type || 'ride').toLowerCase();
  const vehicleLabel = currentRide?.driver?.vehicle || currentRide?.driver?.vehicleType || 'Taxi';
  const currentRideIconType = currentRide?.vehicleIconType || currentRide?.driver?.vehicleType || 'car';
  const rideStage = String(currentRide?.liveStatus || currentRide?.status || 'accepted').toLowerCase();
  const hasAssignedDriver = Boolean(currentRide?.driver?._id || currentRide?.driver?.id || currentRide?.driver?.name);
  const scheduledTimestamp = currentRide?.scheduledAt ? new Date(currentRide.scheduledAt).getTime() : NaN;
  const isScheduledRide = Number.isFinite(scheduledTimestamp);
  const isScheduledUpcoming = isScheduledRide && scheduledTimestamp > Date.now();
  const isScheduledAcceptedRide = ['ride', 'intercity'].includes(serviceType) && isScheduledUpcoming && hasAssignedDriver && ['accepted', 'arriving'].includes(rideStage);
  const rideStageLabel =
    rideStage === 'started'
      ? 'Ride in progress'
      : rideStage === 'arrived'
      ? `${driverName} reached destination`
      : rideStage === 'arriving'
      ? `${driverName} has arrived`
      : 'Ride booked';
  const rideStageContextLabel = isScheduledAcceptedRide ? 'Driver assigned for your scheduled trip' : rideStageLabel;

  useEffect(() => {
    let active = true;

    const loadActivities = async () => {
      setLoading(true);
      setError('');

      try {
        if (activeTab === 'Support') {
          if (!active) return;
          setActivities([]);
          setPagination(DEFAULT_PAGINATION);
          return;
        }

        let nextActivities = [];
        let nextPagination = null;

        if (activeTab === 'All' || activeTab === 'Rides') {
          const params = {limit: AGGREGATE_FETCH_LIMIT, page: 1};
          if (activeTab === 'Rides') params.category = 'rides';
          const response = await api.get('/rides', {params}).catch(() => null);
          const payload = response ? getPayload(response) : {};
          const rides = Array.isArray(payload?.results) ? payload.results : [];
          const merged = sortLatestFirst(rides.map(normalizeRide).filter(item => item.id));
          const localPage = buildLocalPagination(merged, currentPage);
          nextActivities = localPage.results;
          nextPagination = localPage.pagination;
        } else {
          const response = await api.get('/rides', {params: {limit: PAGE_SIZE, page: currentPage, category: getRideCategoryForTab(activeTab)}});
          const payload = getPayload(response);
          const rides = Array.isArray(payload?.results) ? payload.results : [];
          nextActivities = rides.map(normalizeRide).filter(ride => ride.id);
          nextPagination = payload?.pagination || null;
        }

        if (!active) return;
        setActivities(nextActivities);
        setPagination(
          nextPagination || {
            page: currentPage,
            limit: PAGE_SIZE,
            total: nextActivities.length,
            totalPages: Math.max(1, Math.ceil(nextActivities.length / PAGE_SIZE)),
            hasNextPage: false,
            hasPrevPage: currentPage > 1,
          },
        );
      } catch (loadError) {
        if (!active) return;
        setError(loadError?.message || 'Could not load your ride history.');
        setActivities([]);
        setPagination(DEFAULT_PAGINATION);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadActivities();
    return () => {
      active = false;
    };
  }, [activeTab, currentPage, reloadKey]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const handleItemClick = item => navigation.navigate('RideDetail', {id: item.id, ride: item.ride});
  const helperText = useMemo(() => getHelperText(activeTab), [activeTab]);

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="border-b border-slate-200 bg-white px-5 pt-4 pb-4">
        <View className="flex-row items-start gap-3">
          <Pressable onPress={() => navigation.goBack()} className="p-2 -ml-2">
            <ArrowLeft size={22} color="#0f172a" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-[10px] font-semibold text-slate-400">My bookings</Text>
            <Text className="mt-1 text-[20px] font-extrabold text-slate-900">Recent activity</Text>
            <Text className="mt-1 text-[12px] text-slate-500">{helperText}</Text>
          </View>
        </View>
      </View>

      <View className="border-b border-slate-200 bg-white px-5 py-3">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 8}}>
          {TABS.map(tab => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              className="rounded-full px-4 py-2"
              style={{backgroundColor: activeTab === tab ? '#FFC400' : '#f8fafc'}}>
              <Text className="text-[11px] font-bold" style={{color: activeTab === tab ? '#0f172a' : '#64748b'}}>{tab}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{padding: 16, gap: 12}}>
        {currentRide && (
          <Pressable onPress={() => navigation.navigate('RideTracking', {ride: currentRide})} className="rounded-3xl border border-slate-200 bg-white p-5">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5">
                <ShieldCheck size={11} color="#047857" />
                <Text className="text-[9px] font-black uppercase text-emerald-700">Active Trip</Text>
              </View>
              <View className="flex-row items-center gap-1.5">
                <View className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <Text className="text-[9px] font-black uppercase text-emerald-600">Live Status</Text>
              </View>
            </View>

            <View className="mt-4 flex-row items-end justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-[20px] font-black text-slate-900" numberOfLines={1}>{rideStageContextLabel}</Text>
                <Text className="mt-1 text-[11px] font-bold text-slate-400">Active Booking</Text>
              </View>
              <View className="h-12 w-12 rounded-xl bg-slate-100 border border-slate-200 items-center justify-center">
                <VehicleIcon name={currentRideIconType} size={24} color="#0f172a" />
              </View>
            </View>

            <View className="mt-4 flex-row items-center gap-2">
              <MapPin size={12} color="#10b981" />
              <Text className="flex-1 text-[11px] font-medium text-slate-600" numberOfLines={1}>{currentRide.pickup || 'Pickup location'}</Text>
            </View>
            <View className="mt-1 flex-row items-center gap-2">
              <MapPin size={12} color="#f97316" />
              <Text className="flex-1 text-[11px] font-medium text-slate-600" numberOfLines={1}>{currentRide.drop || 'Drop location'}</Text>
            </View>

            {isScheduledAcceptedRide && (
              <View className="mt-3.5 flex-row items-center gap-2">
                <View className="flex-row items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1">
                  <User size={11} color="#0369a1" />
                  <Text className="text-[10px] font-medium text-sky-700">{driverName}</Text>
                </View>
              </View>
            )}

            <View className="mt-4 flex-row items-center justify-between rounded-xl bg-slate-50 border border-slate-200 p-3">
              <View className="flex-row items-center gap-2.5 flex-1 min-w-0">
                <View className="h-8 w-8 rounded-full bg-emerald-50 border border-emerald-100 items-center justify-center">
                  <User size={16} color="#059669" />
                </View>
                <View className="flex-1 min-w-0">
                  <Text className="text-[9px] font-semibold uppercase text-slate-400">Driver & Vehicle</Text>
                  <Text className="mt-0.5 text-[12.5px] font-bold text-slate-900" numberOfLines={1}>{driverName} • {vehicleLabel}</Text>
                </View>
              </View>
              <View className="flex-row items-center gap-3">
                <View>
                  <Text className="text-[9px] font-semibold uppercase text-slate-400">Fare</Text>
                  <Text className="mt-0.5 text-[12.5px] font-bold text-slate-900">₹{Number(currentRide?.fare || 0).toFixed(0)}</Text>
                </View>
                <View className="h-7 w-7 rounded-[10px] bg-slate-900 items-center justify-center">
                  <ChevronRight size={16} color="#fff" />
                </View>
              </View>
            </View>
          </Pressable>
        )}

        {activeTab === 'Support' ? (
          <View className="items-center py-20 gap-5">
            <View className="w-20 h-20 bg-white border border-slate-100 rounded-3xl items-center justify-center">
              <Headset size={36} color="#f97316" />
            </View>
            <View className="items-center gap-1">
              <Text className="text-[17px] font-black text-slate-900">No support tickets</Text>
              <Text className="text-[13px] font-bold text-slate-500">You haven't raised any support tickets yet.</Text>
            </View>
            <Pressable onPress={() => navigation.navigate('RideSupport')} className="bg-slate-900 px-7 py-3 rounded-full">
              <Text className="text-white text-[12px] font-black uppercase">Contact Us</Text>
            </Pressable>
          </View>
        ) : loading ? (
          <View className="items-center py-20 gap-3">
            <ActivityIndicator color="#f97316" />
            <Text className="text-[15px] font-black text-slate-500">Loading your trips</Text>
          </View>
        ) : error ? (
          <View className="items-center py-20 gap-3">
            <AlertCircle size={24} color="#f43f5e" />
            <Text className="text-[15px] font-black text-slate-700">{error}</Text>
            <Pressable onPress={() => setReloadKey(c => c + 1)} className="bg-slate-900 px-6 py-3 rounded-full">
              <Text className="text-white text-[12px] font-black uppercase">Retry</Text>
            </Pressable>
          </View>
        ) : activities.length === 0 ? (
          <View className="items-center py-20 gap-3">
            <Text className="text-[22px] font-black text-slate-400">-</Text>
            <Text className="text-[15px] font-black text-slate-500">{EMPTY_MESSAGES[activeTab.toLowerCase()] || 'Nothing here yet'}</Text>
          </View>
        ) : (
          <View style={{gap: 12}}>
            {activities.map(item => (
              <ActivityCard key={item.id} item={item} onPress={() => handleItemClick(item)} />
            ))}
            {pagination.totalPages > 1 && (
              <View className="mt-2 flex-row items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                <Pressable
                  onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={!pagination.hasPrevPage}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 items-center"
                  style={{opacity: pagination.hasPrevPage ? 1 : 0.45}}>
                  <Text className="text-[11px] font-bold text-slate-700">Previous</Text>
                </Pressable>
                <View className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <Text className="text-[11px] font-bold text-slate-500">Page {pagination.page} / {pagination.totalPages}</Text>
                </View>
                <Pressable
                  onPress={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={!pagination.hasNextPage}
                  className="flex-1 rounded-xl bg-slate-900 px-4 py-3 items-center"
                  style={{opacity: pagination.hasNextPage ? 1 : 0.45}}>
                  <Text className="text-[11px] font-bold text-white">Next</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
