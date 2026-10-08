/*
 * The web price-management pages wrap a text input in @react-google-maps/api's
 * <Autocomplete onLoad={setAutocomplete} onPlaceChanged={...}> and read
 * `autocomplete.getPlace()` inside the handler. There is no Places widget in
 * React Native, so this field runs a Places text search through geocodeAPI,
 * lists the matches under the input, and on a tap hands `onPlace` an object
 * shaped exactly like Autocomplete's getPlace() result
 * ({ name, formatted_address, address_components, geometry.location.lat()/lng() }),
 * so each page's place handler runs with the web's own body.
 */
import { useEffect, useRef, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react-native';
import { geocodeAPI } from '../../../../../api/geocode';
import { Div, Input, P, Span, Icon as UiIcon } from '../../../../../components/web';

const DEBOUNCE_MS = 350;

const toAutocompletePlace = (result, suggestion) => {
  const loc = result?.geometry?.location || {};
  const lat = Number(loc.lat ?? suggestion?.location?.latitude);
  const lng = Number(loc.lng ?? suggestion?.location?.longitude);
  return {
    name: suggestion?.displayName?.text || result?.formatted_address || '',
    formatted_address: result?.formatted_address || suggestion?.formattedAddress || '',
    address_components: Array.isArray(result?.address_components) ? result.address_components : [],
    geometry: {
      location: {
        lat: () => lat,
        lng: () => lng,
      },
    },
  };
};

/**
 * `value` / `onValueChange` make the text controlled (CreatePackagePrice binds
 * the field to formData.package_destination); left out, the field keeps its own
 * query like the web's unbound search inputs.
 */
export default function PlaceSearchField({ value, onValueChange, placeholder, className, disabled, icon = MapPin, onPlace }) {
  const [ownQuery, setOwnQuery] = useState('');
  const controlled = value !== undefined;
  const query = controlled ? value || '' : ownQuery;
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [resolving, setResolving] = useState(false);
  const skipNextSearch = useRef(false);
  const requestId = useRef(0);

  const setQuery = (next) => {
    if (controlled) onValueChange?.(next);
    else setOwnQuery(next);
  };

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return undefined;
    }
    const text = String(query || '').trim();
    if (text.length < 3) {
      setSuggestions([]);
      return undefined;
    }
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await geocodeAPI.textSearch({
          textQuery: text,
          maxResultCount: 6,
        });
        if (id !== requestId.current) return;
        const places = res?.data?.data?.places;
        setSuggestions(Array.isArray(places) ? places : []);
      } catch {
        if (id === requestId.current) setSuggestions([]);
      } finally {
        if (id === requestId.current) setSearching(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const choose = async (suggestion) => {
    requestId.current += 1;
    setSuggestions([]);
    setSearching(false);
    skipNextSearch.current = true;
    setQuery(suggestion?.displayName?.text || suggestion?.formattedAddress || '');
    setResolving(true);
    try {
      let result = null;
      if (suggestion?.id) {
        const res = await geocodeAPI.place(suggestion.id);
        result = res?.data?.data?.results?.[0] || null;
      }
      onPlace?.(toAutocompletePlace(result, suggestion));
    } catch {
      onPlace?.(toAutocompletePlace(null, suggestion));
    } finally {
      setResolving(false);
    }
  };

  return (
    <Div className="flex-1">
      <Div className="relative">
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={className}
        />
        {icon ? <UiIcon as={icon} size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /> : null}
      </Div>
      {searching || resolving ? (
        <Div className="flex items-center gap-2 mt-1">
          <UiIcon as={Loader2} className="w-3 h-3 animate-spin text-slate-500" />
          <Span className="text-[11px] text-slate-500">{resolving ? 'Fetching location...' : 'Searching...'}</Span>
        </Div>
      ) : null}
      {suggestions.length > 0 ? (
        <Div className="mt-1 rounded-md border border-slate-200 bg-white shadow-sm overflow-hidden">
          {suggestions.map((s, idx) => (
            <Div key={s?.id || idx} onClick={() => choose(s)} className={`flex items-start gap-2 px-3 py-2 ${idx > 0 ? 'border-t border-slate-100' : ''}`}>
              <UiIcon as={MapPin} className="w-4 h-4 text-slate-400 mt-0.5" />
              <Div className="flex-1">
                <P className="text-sm font-medium text-slate-800">{s?.displayName?.text || s?.formattedAddress || ''}</P>
                {s?.formattedAddress ? <P className="text-xs text-slate-500">{s.formattedAddress}</P> : null}
              </Div>
            </Div>
          ))}
        </Div>
      ) : null}
    </Div>
  );
}
