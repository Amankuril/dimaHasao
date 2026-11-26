/**
 * A list of real places picked from Google suggestions (type, pick, done),
 * used for a package's optional pickup and drop points. Each entry keeps its
 * coordinates; the list may be left empty.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Loader2, MapPin, Search, X } from 'lucide-react';
import { resolvePlace, searchPlaces } from '../../../services/placesService';

const PlaceListField = ({ label, hint, value = [], onChange, max = 10, placeholder = 'Search a place' }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | searching | empty | error
  const latest = useRef(0);

  useEffect(() => {
    const text = query.trim();
    if (text.length < 3) {
      setResults([]);
      setStatus('idle');
      return undefined;
    }
    const id = ++latest.current;
    setStatus('searching');
    const timer = setTimeout(async () => {
      try {
        const list = await searchPlaces(text);
        if (id !== latest.current) return;
        setResults(list);
        setStatus(list.length ? 'idle' : 'empty');
      } catch {
        if (id === latest.current) setStatus('error');
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  const add = async (suggestion) => {
    if (value.length >= max) return;
    setStatus('searching');
    try {
      const place = await resolvePlace(suggestion);
      if (!value.some((p) => (place.placeId && p.placeId === place.placeId) || p.name === place.name)) {
        onChange([...value, place]);
      }
    } catch {
      // No coordinates: keep the name so the admin is not blocked.
      onChange([...value, { name: suggestion.name, address: suggestion.secondary, placeId: suggestion.placeId }]);
    } finally {
      setQuery('');
      setResults([]);
      setStatus('idle');
    }
  };

  return (
    <div>
      <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">
        {label} <span className="font-normal text-gray-400">(optional)</span>
      </label>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {value.map((place, index) => (
            <span key={`${place.placeId || place.name}-${index}`} className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full bg-[#0a4d2b]/5 border border-[#0a4d2b]/15 text-xs text-gray-800">
              <MapPin size={12} className="text-[#0a4d2b]" />
              <span title={place.address}>{place.name}</span>
              <button type="button" aria-label={`Remove ${place.name}`} onClick={() => onChange(value.filter((_, i) => i !== index))} className="p-0.5 rounded-full hover:bg-red-50 text-red-600">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      {value.length < max && (
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-9 pr-9 py-2.5 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-[#0a4d2b] focus:ring-4 focus:ring-[#0a4d2b]/10 transition"
          />
          {status === 'searching' && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />}
          {results.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full max-h-64 overflow-auto bg-white border border-gray-200 rounded-xl shadow-lg">
              {results.map((r) => (
                <li key={r.placeId}>
                  <button type="button" onClick={() => add(r)} className="w-full text-left px-3 py-2 hover:bg-gray-50">
                    <p className="text-sm text-gray-900">{r.name}</p>
                    {r.secondary && <p className="text-xs text-gray-500">{r.secondary}</p>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {status === 'empty' && <p className="mt-1 text-xs text-gray-500">No places found. Try another name.</p>}
      {status === 'error' && <p className="mt-1 text-xs text-amber-700">Place search is unavailable right now.</p>}
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
};

export default PlaceListField;

/**
 * Search one place and hand back { name, address, lat, lng } — used to pin a
 * destination and fill its address from Google instead of hunting on the map.
 */
export const PlaceSearch = ({ onPick, placeholder = 'Search the place on Google Maps' }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const latest = useRef(0);

  useEffect(() => {
    const text = query.trim();
    if (text.length < 3) {
      setResults([]);
      return undefined;
    }
    const id = ++latest.current;
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const list = await searchPlaces(text);
        if (id === latest.current) setResults(list);
      } catch {
        if (id === latest.current) setResults([]);
      } finally {
        if (id === latest.current) setBusy(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  const pick = async (suggestion) => {
    setBusy(true);
    try {
      const place = await resolvePlace(suggestion);
      if (Number.isFinite(place.lat) && Number.isFinite(place.lng)) onPick(place);
    } finally {
      setBusy(false);
      setQuery('');
      setResults([]);
    }
  };

  return (
    <div className="relative">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
        placeholder={placeholder}
        className="w-full pl-9 pr-9 py-2.5 bg-white border border-neutral-200 rounded-lg text-sm outline-none focus:border-[#0a4d2b] focus:ring-2 focus:ring-[#0a4d2b]/20"
      />
      {busy && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />}
      {results.length > 0 && (
        <ul className="absolute z-[1000] mt-1 w-full max-h-64 overflow-auto bg-white border border-gray-200 rounded-xl shadow-lg">
          {results.map((r) => (
            <li key={r.placeId}>
              <button type="button" onClick={() => pick(r)} className="w-full text-left px-3 py-2 hover:bg-gray-50">
                <p className="text-sm text-gray-900">{r.name}</p>
                {r.secondary && <p className="text-xs text-gray-500">{r.secondary}</p>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
