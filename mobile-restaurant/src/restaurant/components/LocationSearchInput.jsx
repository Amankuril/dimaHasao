import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { MapPin, Search, X } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { toast } from '../../lib/notify';
import { color, elevation, radii, space, type } from '../../theme';
import { fetchPlaceSuggestions, resolvePlaceSuggestion } from '../utils/googlePlaces';

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
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputWrap, focused ? styles.inputFocus : null, isResolving ? { opacity: 0.6 } : null]}>
        <Search size={18} color={color.textMuted} />
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
          placeholderTextColor={color.textMuted}
          editable={!isResolving}
          accessibilityLabel={label || placeholder}
          style={styles.input}
        />
        {query && !isSearching && !isResolving ? (
          <Press scale={1} onPress={handleClear} accessibilityLabel="Clear search" style={styles.right}>
            <X size={18} color={color.textMuted} />
          </Press>
        ) : null}
        {isSearching || isResolving ? (
          <View style={styles.right}>
            <ActivityIndicator size="small" color={color.primary} />
          </View>
        ) : null}
      </View>

      {showDropdown ? (
        <View style={styles.dropdown}>
          <Text style={styles.dropHead}>Nearby and matching places</Text>
          {suggestions.map((suggestion, idx) => (
            <Press
              key={suggestion.id}
              scale={1}
              onPress={() => handleSelectSuggestion(suggestion)}
              accessibilityLabel={suggestion.mainText || suggestion.display}
              style={[styles.row, idx < suggestions.length - 1 ? styles.rowDivider : null]}
            >
              <MapPin size={18} color={color.primary} style={{ marginTop: 2 }} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={[type.bodyStrong, { color: color.text }]}>{suggestion.mainText || suggestion.display}</Text>
                {suggestion.secondaryText ? (
                  <Text numberOfLines={1} style={[type.small, { color: color.textMuted }]}>{suggestion.secondaryText}</Text>
                ) : suggestion.display && suggestion.display !== suggestion.mainText ? (
                  <Text numberOfLines={1} style={[type.small, { color: color.textMuted }]}>{suggestion.display}</Text>
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
  label: { ...type.label, color: color.text, marginBottom: space.sm },
  inputWrap: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, borderWidth: 1, borderColor: color.border, borderRadius: radii.md, backgroundColor: color.surface },
  inputFocus: { borderColor: color.primary, borderWidth: 1.5 },
  input: { flex: 1, minWidth: 0, paddingVertical: space.md, ...type.body, color: color.text, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : null) },
  right: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginRight: -space.xs },
  dropdown: { marginTop: space.sm, backgroundColor: color.surface, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, overflow: 'hidden', ...elevation.float },
  dropHead: { ...type.caption, color: color.textMuted, paddingHorizontal: space.lg, paddingVertical: space.sm, backgroundColor: color.surfaceMuted },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, minHeight: 52 },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
});
