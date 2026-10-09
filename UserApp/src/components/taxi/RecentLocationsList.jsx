/**
 * Ported from Frontend/src/modules/Taxi/modules/user/pages/Home.jsx's
 * RecentLocationsList (it wasn't split into its own file on the web either).
 */
import React, {useEffect, useMemo, useState} from 'react';
import {DeviceEventEmitter, Pressable, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Clock, Heart} from 'lucide-react-native';
import {DISTRICT_PLACES} from '../../constants/districtPlaces';
import {getSavedLocationCoords} from '../../services/taxi/locationStore';

const RECENT_LOCATIONS_KEY = 'dimahasao_taxi_recent_locations';
const RECENT_LOCATIONS_UPDATED_EVENT = 'dimahasao:taxi-recent-locations-updated';

const defaultRecent = () =>
  DISTRICT_PLACES.slice(0, 3).map(place => ({
    name: place.title,
    address: place.address,
    lat: place.coords[1],
    lon: place.coords[0],
    distance: '',
  }));

const calculateDistanceKm = ([fromLng, fromLat], [toLng, toLat]) => {
  if (![fromLng, fromLat, toLng, toLat].every(v => Number.isFinite(Number(v)))) return null;
  const toRad = v => (Number(v) * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(toLat - fromLat);
  const dLng = toRad(toLng - fromLng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(fromLat)) * Math.cos(toRad(toLat)) * Math.sin(dLng / 2) ** 2;
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
};

export default function RecentLocationsList() {
  const navigation = useNavigation();
  const [recentLocations, setRecentLocations] = useState(defaultRecent());
  const [currentCoords, setCurrentCoords] = useState(null);

  const load = async () => {
    try {
      const saved = JSON.parse((await AsyncStorage.getItem(RECENT_LOCATIONS_KEY)) || 'null');
      if (Array.isArray(saved) && saved.length > 0) setRecentLocations(saved);
    } catch {
      // keep whatever is already shown
    }
    setCurrentCoords(await getSavedLocationCoords());
  };

  useEffect(() => {
    load();
    const sub = DeviceEventEmitter.addListener(RECENT_LOCATIONS_UPDATED_EVENT, load);
    return () => sub.remove();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const recentList = useMemo(
    () =>
      recentLocations
        .map(item => {
          let distanceLabel = item.distance;
          if (currentCoords && item.lat && item.lon) {
            const distKm = calculateDistanceKm(currentCoords, [item.lon, item.lat]);
            if (distKm !== null) distanceLabel = `${distKm} km`;
          }
          return {...item, distance: distanceLabel || 'Recent'};
        })
        .slice(0, 3),
    [recentLocations, currentCoords],
  );

  const toggleFavourite = async item => {
    const updated = recentLocations.map(loc => (loc.address === item.address ? {...loc, favourite: !loc.favourite} : loc));
    setRecentLocations(updated);
    await AsyncStorage.setItem(RECENT_LOCATIONS_KEY, JSON.stringify(updated));
  };

  return (
    <View className="mt-2">
      {recentList.map((item, index) => (
        <View key={index}>
          <View className="flex-row items-center justify-between gap-3 py-3 px-2">
            <Pressable
              onPress={() =>
                navigation.navigate('SelectLocation', {
                  drop: item.address,
                  dropCoords: item.lat && item.lon ? [item.lon, item.lat] : null,
                  activeInput: 'drop',
                })
              }
              className="flex-row items-center gap-3 flex-1">
              <View className="h-9 w-9 rounded-full items-center justify-center bg-slate-100 border border-slate-200">
                <Clock size={16} color="#64748B" />
              </View>
              <View className="flex-1">
                <Text className="text-[14px] font-bold text-[#0B1220]" numberOfLines={1}>
                  {item.name}
                </Text>
                <Text className="text-[11px] font-medium text-[#64748B] mt-0.5" numberOfLines={1}>
                  {item.distance ? `${item.distance} • ` : ''}
                  {item.address}
                </Text>
              </View>
            </Pressable>
            <Pressable onPress={() => toggleFavourite(item)} className="px-1">
              <Heart size={16} color={item.favourite ? '#f43f5e' : '#94a3b8'} fill={item.favourite ? '#f43f5e' : 'none'} />
            </Pressable>
          </View>
          {index < recentList.length - 1 && <View className="border-b border-dashed border-slate-200 mx-2" />}
        </View>
      ))}
    </View>
  );
}
