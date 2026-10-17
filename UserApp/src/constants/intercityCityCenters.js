/**
 * Ported verbatim from the CITY_CENTERS map in
 * Frontend/src/modules/Taxi/modules/user/pages/intercity/IntercityDetails.jsx
 * — seeds the map and biases place search for an outstation trip's
 * named cities.
 */
import {DEFAULT_COORDS} from './districtPlaces';

export const CITY_CENTERS = {
  Haflong: {lat: 25.1667, lng: 93.0167},
  Maibang: {lat: 25.3, lng: 93.1333},
  Umrangso: {lat: 25.55, lng: 92.7},
  Silchar: {lat: 24.8333, lng: 92.7789},
  Lumding: {lat: 25.7486, lng: 93.1697},
  Guwahati: {lat: 26.1445, lng: 91.7362},
  Shillong: {lat: 25.5788, lng: 91.8933},
  Dimapur: {lat: 25.9063, lng: 93.7276},
  Badarpur: {lat: 24.8686, lng: 92.5951},
};

export const DISTRICT_CENTER = {lat: DEFAULT_COORDS[1], lng: DEFAULT_COORDS[0]};

export const getCityCenter = city => CITY_CENTERS[city] || DISTRICT_CENTER;
export const getCityCoords = city => {
  const center = getCityCenter(city);
  return [center.lng, center.lat];
};
