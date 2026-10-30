/**
 * Maps a vehicle category/icon_types/name string to a lucide icon — the RN
 * stand-in for the web's per-vehicle PNG set (bike.png, auto.png, SUV.png,
 * truck.png, ...), which NativeWind/lucide covers without bundling a dozen
 * image assets.
 */
import React from 'react';
import {Bike, Bus, Car, Truck} from 'lucide-react-native';

export default function VehicleIcon({name, size = 20, color = '#0B1220'}) {
  const value = String(name || '').toLowerCase();

  if (value.includes('bike') || value.includes('moto') || value.includes('scooty')) {
    return <Bike size={size} color={color} />;
  }
  if (value.includes('bus')) {
    return <Bus size={size} color={color} />;
  }
  if (value.includes('truck') || value.includes('lcv') || value.includes('mcv') || value.includes('hcv')) {
    return <Truck size={size} color={color} />;
  }
  return <Car size={size} color={color} />;
}
