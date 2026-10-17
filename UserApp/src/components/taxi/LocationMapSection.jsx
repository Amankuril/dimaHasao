/**
 * Simplified from Frontend/src/modules/Taxi/modules/user/components/LocationMapSection.jsx.
 * Same job (show the map behind the home screen, keep the saved pickup
 * location fresh) via RN equivalents: react-native-maps instead of
 * @react-google-maps/api, @react-native-community/geolocation instead of
 * the browser Geolocation API, and a runtime permission request Android
 * requires that the web version never needed.
 */
import React, {useEffect, useRef, useState} from 'react';
import {PermissionsAndroid, View} from 'react-native';
import MapView, {Marker, PROVIDER_GOOGLE} from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import {GOOGLE_MAPS_API_KEY} from '../../services/api/config';
import {getSavedLocation, saveLocation} from '../../services/taxi/locationStore';
import {DEFAULT_PLACE} from '../../constants/districtPlaces';

const AUTO_REFRESH_INTERVAL_MS = 2 * 60 * 1000;
const DEFAULT_REGION = {
  latitude: DEFAULT_PLACE.coords[1],
  longitude: DEFAULT_PLACE.coords[0],
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

async function requestLocationPermission() {
  try {
    const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, {
      title: 'Location access',
      message: 'Dima Hasao needs your location to show nearby rides and set your pickup point.',
      buttonPositive: 'Allow',
    });
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

async function reverseGeocode(lat, lon) {
  if (!GOOGLE_MAPS_API_KEY) return '';
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${GOOGLE_MAPS_API_KEY}`,
    );
    const body = await res.json();
    return body?.results?.[0]?.formatted_address || '';
  } catch {
    return '';
  }
}

export default function LocationMapSection() {
  const [region, setRegion] = useState(DEFAULT_REGION);
  const mapRef = useRef(null);

  const refreshLocation = async () => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) return;

    Geolocation.getCurrentPosition(
      async position => {
        const {latitude, longitude} = position.coords;
        const nextRegion = {latitude, longitude, latitudeDelta: 0.02, longitudeDelta: 0.02};
        setRegion(nextRegion);
        mapRef.current?.animateToRegion(nextRegion, 400);

        const address = await reverseGeocode(latitude, longitude);
        await saveLocation({lat: latitude, lon: longitude, address, updatedAt: Date.now()});
      },
      () => {
        // Permission denied or position unavailable — keep showing the last
        // saved/default location rather than an error state.
      },
      {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
    );
  };

  useEffect(() => {
    (async () => {
      const saved = await getSavedLocation();
      if (saved?.lat && saved?.lon) {
        setRegion({latitude: saved.lat, longitude: saved.lon, latitudeDelta: 0.02, longitudeDelta: 0.02});
      }
      refreshLocation();
    })();

    const interval = setInterval(refreshLocation, AUTO_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View className="h-full w-full">
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={{flex: 1}}
        initialRegion={region}
        region={region}
        showsUserLocation
        showsMyLocationButton={false}
        toolbarEnabled={false}>
        <Marker coordinate={{latitude: region.latitude, longitude: region.longitude}} />
      </MapView>
    </View>
  );
}
