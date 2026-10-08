/*
 * The web restaurant forms attach google.maps.places.Autocomplete to a text
 * input and read `autocomplete.getPlace()` on 'place_changed'. Here the input
 * runs a Places text search through geocodeAPI, lists the suggestions under
 * the field, and on a tap geocodes the chosen place and hands `onPlace` an
 * object shaped like Autocomplete's getPlace() result
 * ({ formatted_address, address_components, geometry.location.lat()/lng() }),
 * so the web's place parsing code runs unchanged.
 */
import { forwardRef, useEffect, useRef, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react-native';
import { geocodeAPI } from '../../../../api/geocode';
import { Input } from '../../../../components/shadcn';
import { Div, P, Span, Icon as UiIcon } from '../../../../components/web';

const DEBOUNCE_MS = 350;

const toAutocompletePlace = (result, fallback) => {
  const loc = result?.geometry?.location || {};
  const lat = Number(loc.lat ?? fallback?.location?.latitude);
  const lng = Number(loc.lng ?? fallback?.location?.longitude);
  return {
    formatted_address: result?.formatted_address || fallback?.formattedAddress || '',
    address_components: Array.isArray(result?.address_components) ? result.address_components : [],
    name: fallback?.displayName?.text || '',
    geometry: {
      location: {
        lat: () => lat,
        lng: () => lng,
      },
    },
  };
};

const PlacesSearchInput = forwardRef(function PlacesSearchInput({ onPlace, onError, placeholder, className, style, disabled }, ref) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [resolving, setResolving] = useState(false);
  const skipNextSearch = useRef(false);
  const requestId = useRef(0);

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return undefined;
    }
    const text = query.trim();
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
      } catch (e) {
        if (id !== requestId.current) return;
        setSuggestions([]);
        onError?.(e?.response?.data?.message || e?.message || 'Unable to search locations.');
      } finally {
        if (id === requestId.current) setSearching(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, onError]);

  const choose = async (suggestion) => {
    requestId.current += 1;
    setSuggestions([]);
    setSearching(false);
    skipNextSearch.current = true;
    setQuery(suggestion?.formattedAddress || suggestion?.displayName?.text || '');
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
    <Div>
      <Input
        ref={ref}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className={className}
        style={style}
        disabled={disabled}
      />
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
});

export default PlacesSearchInput;
