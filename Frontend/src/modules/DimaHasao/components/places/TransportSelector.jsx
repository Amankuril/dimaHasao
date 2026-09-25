import React, { useEffect, useState } from 'react';
import { useNavigate, useHostNavigate } from '../../router';
import { useBooking } from '../../context/BookingContext';
import { TRANSPORTS_DATA } from '../../data/tourismData';
import { motion, AnimatePresence } from 'framer-motion';

// Same assumption SelectVehicle.jsx uses for its own fallback ETA when there
// is no routing API to call (this app has no Maps key configured) — keeping
// both in step means "X min away" never disagrees with the real ride screen.
const AVERAGE_HILL_ROAD_SPEED_KMPH = 24;

const toRad = (deg) => (deg * Math.PI) / 180;

/** Straight-line distance in km — no Maps key needed, unlike a routed distance. */
const haversineKm = (from, to) => {
  if (!from || !to || ![from.lat, from.lng, to.lat, to.lng].every(Number.isFinite)) return null;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

/** The official OSM embed widget — no API key, unlike Google's Maps Embed API. */
const buildOsmEmbedSrc = (lat, lng, delta = 0.012) => {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const bbox = [lng - delta, lat - delta, lng + delta, lat + delta].join('%2C');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
};

/** Works with no key on both mobile (opens the Maps app) and desktop. */
const googleDirectionsUrl = (lat, lng) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

export const TransportSelector = ({ place }) => {
  const { selectedTransportId, setSelectedTransportId, setSelectedPlaceId, pickupLocation } = useBooking();
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [liveCoords, setLiveCoords] = useState(null);
  const navigate = useNavigate();
  const hostNavigate = useHostNavigate();

  const destCoords = place.coordinates;

  // Anchor "From" to where the visitor actually is, when they allow it —
  // falling back to the district hub otherwise, exactly as before.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return;
        setLiveCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {},
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 },
    );
    return () => { cancelled = true; };
  }, []);

  const liveDistanceKm = destCoords ? haversineKm(liveCoords, destCoords) : null;
  const fromLabel = liveDistanceKm != null ? 'Your current location' : (pickupLocation || 'Haflong Station');
  const distanceLabel = liveDistanceKm != null
    ? `${liveDistanceKm < 1 ? '< 1' : liveDistanceKm.toFixed(1)} km`
    : place.distanceFromStation;
  const travelTimeLabel = liveDistanceKm != null
    ? `${Math.max(1, Math.round((liveDistanceKm / AVERAGE_HILL_ROAD_SPEED_KMPH) * 60))} min (Approx.)`
    : place.travelTime;

  const mapEmbedSrc = destCoords ? buildOsmEmbedSrc(destCoords.lat, destCoords.lng) : null;
  const modalMapEmbedSrc = destCoords ? buildOsmEmbedSrc(destCoords.lat, destCoords.lng, 0.006) : null;

  const handleSelect = (transportId) => {
    setSelectedTransportId(transportId);
    setSelectedPlaceId(place.id);
    hostNavigate('/taxi/user');
  };

  return (
    <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <h3 className="text-xs font-bold uppercase tracking-wider mb-4 text-gray-800 flex items-center gap-2">
        <i className="fa-solid fa-route text-emerald-700"></i>
        <span>HOW TO REACH</span>
      </h3>

      <div className="space-y-4">
        {/* Journey Points */}
        <div className="relative border-l-2 border-dashed border-emerald-300 ml-2 pl-4 py-1">
          {/* Pickup Pin */}
          <div className="absolute w-3 h-3 bg-blue-500 rounded-full -left-[7px] top-1.5 shadow"></div>
          <div className="mb-4">
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wide">From</p>
            <p className="text-xs font-semibold text-gray-900">{fromLabel}</p>
          </div>

          {/* Destination Pin */}
          <div className="absolute w-3.5 h-3.5 text-red-500 -left-[8px] bottom-1.5 bg-white flex items-center justify-center">
            <i className="fa-solid fa-location-dot text-xs"></i>
          </div>
          <div>
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wide">To</p>
            <p className="text-xs font-semibold text-gray-900">{place.name}</p>
            <p className="text-[10px] text-emerald-700 font-medium">{distanceLabel} away{travelTimeLabel ? ` · ${travelTimeLabel}` : ''}</p>
          </div>
        </div>

        {/* Transport Options List */}
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Transport Options</p>
          <div className="space-y-2">
            {TRANSPORTS_DATA.map((t, idx) => {
              const isSelected = selectedTransportId === t.id;
              return (
                <React.Fragment key={t.id}>
                  <div
                    className={`flex items-center justify-between p-2.5 rounded-xl transition-all ${
                      isSelected ? 'bg-emerald-50/90 border border-emerald-300 shadow-xs' : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-base ${
                          t.id === 'bike'
                            ? 'bg-green-100 text-green-700'
                            : t.id === 'auto'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        <i className={t.iconClass}></i>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900">{t.name}</p>
                        <p className="text-[10px] text-gray-500">{t.time}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-[9px] text-gray-400 uppercase font-semibold">MRP</p>
                      <p className="text-xs font-bold text-gray-900">{t.fareFormatted}</p>
                    </div>

                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      onClick={() => handleSelect(t.id)}
                      className={`text-xs px-3.5 py-1.5 rounded-full font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#0a3a22] text-white shadow'
                          : 'bg-[#0b2e13] text-white hover:bg-emerald-800'
                      }`}
                    >
                      {isSelected ? 'Book' : 'Select'}
                    </motion.button>
                  </div>
                  {idx < TRANSPORTS_DATA.length - 1 && <hr className="border-gray-100 my-0.5" />}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Map Thumbnail */}
        <div className="pt-2">
          {mapEmbedSrc ? (
            <div
              onClick={() => setIsMapModalOpen(true)}
              className="relative w-full h-32 bg-gray-200 rounded-xl overflow-hidden border border-gray-200 cursor-pointer group shadow-xs"
            >
              <iframe
                title={`Map of ${place.name}`}
                src={mapEmbedSrc}
                className="w-full h-full pointer-events-none border-0"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <span className="bg-white/95 backdrop-blur-xs text-xs font-semibold text-gray-800 px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5">
                  <i className="fa-solid fa-map-location-dot text-emerald-700"></i>
                  <span>View Route Map</span>
                </span>
              </div>
            </div>
          ) : (
            <div className="w-full h-32 bg-gray-50 rounded-xl border border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 text-center px-4">
              <i className="fa-solid fa-map-location-dot text-gray-300 text-lg"></i>
              <span className="text-[10px] text-gray-400 font-medium">Location not pinned yet — the admin hasn't set map coordinates for {place.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Map Modal */}
      <AnimatePresence>
        {isMapModalOpen && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMapModalOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl p-5 shadow-2xl z-10 w-full max-w-sm border border-emerald-100 relative"
            >
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-sm text-gray-900">Route Map: {fromLabel} to {place.name}</h4>
                <button
                  onClick={() => setIsMapModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 cursor-pointer"
                >
                  <i className="fa-solid fa-xmark text-xs"></i>
                </button>
              </div>

              <div className="h-64 w-full rounded-2xl overflow-hidden border border-gray-200 mb-4">
                {modalMapEmbedSrc ? (
                  <iframe
                    title={`Detailed map of ${place.name}`}
                    src={modalMapEmbedSrc}
                    className="w-full h-full border-0"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-50 flex items-center justify-center text-xs text-gray-400">Map unavailable</div>
                )}
              </div>

              <div className="flex items-center justify-between text-xs font-medium text-gray-700 mb-4 bg-emerald-50 p-2.5 rounded-xl">
                <span>Distance: <strong>{distanceLabel}</strong></span>
                <span>Est. Time: <strong>{travelTimeLabel}</strong></span>
              </div>

              {destCoords && (
                <a
                  href={googleDirectionsUrl(destCoords.lat, destCoords.lng)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full mb-2 py-2.5 border border-emerald-700 text-emerald-800 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-50 transition-colors"
                >
                  <i className="fa-solid fa-diamond-turn-right"></i>
                  Get Directions
                </a>
              )}

              <button
                onClick={() => {
                  setIsMapModalOpen(false);
                  hostNavigate('/taxi/user');
                }}
                className="w-full py-2.5 bg-[#0a3a22] hover:bg-emerald-800 text-white rounded-xl font-bold text-xs shadow cursor-pointer"
              >
                Proceed to Book Ride
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};
