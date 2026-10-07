import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { MapPin, Search, X } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { toast } from '../../lib/notify';
import { poppins, shadow, tw } from '../../theme';
import { fetchPlaceSuggestions, resolvePlaceSuggestion } from '../utils/googlePlaces';
import { RT } from '../theme';

const DEBOUNCE_MS = 350;
const MIN_QUERY_LENGTH = 3;

/** Port of Food/components/restaurant/LocationSearchInput.jsx (place search with a suggestion list). */
export default function LocationSearchInput({
  label = 'Search location',
  placeholder = 'Search area, street, landmark...',
  onLocationSelect,
  biasLocation = null,
  style,
}) {
  const inputRef = useRef(null);
  const skipSearchRef = useRef(false);
  const selectionLockRef = useRef(false);
  const activeRequestRef = useRef(0);
  const biasLocationRef = useRef(biasLocation);

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    biasLocationRef.current = biasLocation;
  }, [biasLocation]);

  useEffect(() => {
    const trimmed = String(query || '').trim();

    if (skipSearchRef.current) {
      skipSearchRef.current = false;
      return;
    }
    if (selectionLockRef.current) return;

    if (trimmed.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setDropdownOpen(false);
      setIsSearching(false);
      return;
    }

    const requestId = ++activeRequestRef.current;
    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const bias = biasLocationRef.current;
        const results = await fetchPlaceSuggestions(trimmed, { latitude: bias?.latitude, longitude: bias?.longitude });
        if (requestId !== activeRequestRef.current) return;
        if (selectionLockRef.current) return;
        setSuggestions(results);
        setDropdownOpen(results.length > 0);
      } catch {
        if (requestId !== activeRequestRef.current) return;
        setSuggestions([]);
        setDropdownOpen(false);
      } finally {
        if (requestId === activeRequestRef.current) setIsSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  const closeDropdown = () => {
    activeRequestRef.current += 1;
    setDropdownOpen(false);
    setSuggestions([]);
    setIsSearching(false);
  };

  const handleQueryChange = (value) => {
    selectionLockRef.current = false;
    setQuery(value);
    if (!String(value || '').trim()) closeDropdown();
  };

  const handleClear = () => {
    skipSearchRef.current = true;
    selectionLockRef.current = false;
    setQuery('');
    closeDropdown();
    inputRef.current?.focus();
  };

  const handleSelectSuggestion = async (suggestion) => {
    closeDropdown();
    selectionLockRef.current = true;
    inputRef.current?.blur();

    try {
      setIsResolving(true);
      const location = await resolvePlaceSuggestion(suggestion);
      skipSearchRef.current = true;
      setQuery(suggestion.mainText || suggestion.display || location.formattedAddress || '');
      onLocationSelect?.(location);
    } catch (error) {
      console.error('[LocationSearchInput] resolve failed:', error);
      selectionLockRef.current = false;
      toast.error('Failed to load selected location. Please try again.');
    } finally {
      setIsResolving(false);
    }
  };

  const showDropdown = dropdownOpen && suggestions.length > 0 && !isResolving;

  return (
    <View style={[{ zIndex: 20 }, style]}>
      {label ? <Text style={styles.label}>{String(label).toUpperCase()}</Text> : null}
      <View style={styles.inputWrap}>
        <View style={styles.searchIcon} pointerEvents="none">
          <Search size={16} color={tw.gray400} />
        </View>
        <TextInput
          ref={inputRef}
          value={query}
          onChangeText={handleQueryChange}
          onBlur={() => setFocused(false)}
          onFocus={() => {
            setFocused(true);
            if (!selectionLockRef.current && suggestions.length > 0 && !isResolving) setDropdownOpen(true);
          }}
          placeholder={placeholder}
          placeholderTextColor={tw.gray400}
          editable={!isResolving}
          accessibilityLabel={label}
          style={[styles.input, focused ? styles.inputFocus : null, isResolving ? { opacity: 0.6 } : null]}
        />
        {query && !isSearching && !isResolving ? (
          <Press scale={1} onPress={handleClear} accessibilityLabel="Clear search" style={styles.right}>
            <X size={16} color={tw.gray400} />
          </Press>
        ) : null}
        {isSearching || isResolving ? (
          <View style={styles.right}>
            <ActivityIndicator size="small" color={RT.primary} />
          </View>
        ) : null}
      </View>

      {showDropdown ? (
        <View style={styles.dropdown}>
          <Text style={styles.dropHead}>NEARBY & MATCHING PLACES</Text>
          {suggestions.map((suggestion, idx) => (
            <Press
              key={suggestion.id}
              scale={1}
              onPress={() => handleSelectSuggestion(suggestion)}
              style={[styles.row, idx < suggestions.length - 1 ? { borderBottomWidth: 1, borderBottomColor: tw.gray50 } : null]}
            >
              <MapPin size={16} color={RT.primary} style={{ marginTop: 2 }} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={styles.main}>{suggestion.mainText || suggestion.display}</Text>
                {suggestion.secondaryText ? (
                  <Text numberOfLines={1} style={styles.second}>{suggestion.secondaryText}</Text>
                ) : suggestion.display && suggestion.display !== suggestion.mainText ? (
                  <Text numberOfLines={1} style={styles.second}>{suggestion.display}</Text>
                ) : null}
              </View>
            </Press>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, lineHeight: 16, color: tw.gray700, marginBottom: 6, letterSpacing: 0.3, minWidth: 64, ...poppins(700) },
  inputWrap: { justifyContent: 'center', ...shadow('sm') },
  searchIcon: { position: 'absolute', left: 12, zIndex: 10 },
  input: { paddingLeft: 40, paddingRight: 40, paddingVertical: 12, fontSize: 14, color: tw.gray900, borderWidth: 1, borderColor: tw.gray200, borderRadius: 12, backgroundColor: '#fff', ...poppins(400) },
  // restaurantTheme.css: input:focus border = primary 55 % over white
  inputFocus: { borderColor: '#789d8a' },
  right: { position: 'absolute', right: 12, padding: 4 },
  dropdown: { marginTop: 8, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: tw.gray100, overflow: 'hidden', ...shadow('xl') },
  dropHead: { paddingHorizontal: 16, paddingVertical: 8, fontSize: 10, lineHeight: 16, letterSpacing: 0.5, color: tw.gray400, backgroundColor: tw.gray50, ...poppins(700) },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  main: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(600) },
  second: { fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(400) },
});
