import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Clock, Mic, Search, X } from 'lucide-react-native';
import Image from '../../../components/Img';
import { Press } from '../../../components/ui';
import { searchAPI } from '../../../api/food';
import { localStore } from '../../../lib/storage';
import { getSearchOverlayValue, setSearchOverlayValue } from '../../components/shell';
import { EmptyState, SectionHeader } from '../../../components/ds';
import { NAV_CLEARANCE } from '../../../components/dh/AppBottomNav';
import { color, elevation, radii, space, type } from '../../../theme';

const SEARCH_HISTORY_KEY = 'user_recent_searches_v1';

const getImageUrl = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return value.url || value.secure_url || value.imageUrl || value.image || value.src || '';
  return '';
};

/**
 * Port of components/user/SearchOverlay.jsx: the full-screen overlay the web
 * opens over the page (used by the dining explore screens). Here it is its own
 * screen; the text typed before opening comes from the shell's search value.
 */
export default function SearchOverlay() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const inputRef = useRef(null);
  const [searchValue, setValue] = useState(() => getSearchOverlayValue());
  const [allFoods, setAllFoods] = useState([]);
  const [filteredFoods, setFilteredFoods] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loadingFoods, setLoadingFoods] = useState(false);

  const onChange = (v) => {
    setValue(v);
    setSearchOverlayValue(v);
  };
  const onClose = () => {
    setSearchOverlayValue('');
    if (router.canGoBack()) router.back();
    else router.replace('/food/user');
  };

  useEffect(() => {
    try {
      const raw = localStore.getItem(SEARCH_HISTORY_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) setRecent(parsed.filter((item) => typeof item === 'string' && item.trim()).slice(0, 8));
    } catch {
      setRecent([]);
    }
  }, []);

  useEffect(() => {
    const term = searchValue.trim();
    if (!term) {
      setAllFoods([]);
      setFilteredFoods([]);
      setLoadingFoods(false);
      return undefined;
    }
    const timer = setTimeout(async () => {
      setLoadingFoods(true);
      try {
        const res = await searchAPI.unifiedSearch({ q: term, limit: 40 });
        const results = res.data?.data?.restaurants || [];
        const normalized = results
          .filter((item) => item?.matchedDish || item?.matchType === 'food')
          .map((item, index) => ({
            id: item.matchedDishId || item._id || `dish-${index}`,
            name: item.matchedDish || item.restaurantName || item.name,
            image: getImageUrl(item.matchedDishImage || item.profileImage || item.image),
          }));
        setAllFoods(normalized);
        setFilteredFoods(normalized);
      } catch {
        setAllFoods([]);
        setFilteredFoods([]);
      } finally {
        setLoadingFoods(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchValue]);

  useEffect(() => {
    if (searchValue.trim() === '') setFilteredFoods(allFoods);
    else setFilteredFoods(allFoods.filter((food) => String(food.name).toLowerCase().includes(searchValue.toLowerCase())));
  }, [searchValue, allFoods]);

  const saveRecent = (term) => {
    const value = String(term || '').trim();
    if (!value) return;
    setRecent((prev) => {
      const next = [value, ...prev.filter((item) => item.toLowerCase() !== value.toLowerCase())].slice(0, 8);
      localStore.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  };

  const go = (term) => {
    setSearchOverlayValue('');
    // The overlay is replaced by the results page, as the web closes it and navigates.
    router.replace(`/food/user/search?q=${encodeURIComponent(term)}&mode=delivery`);
  };
  const submit = () => {
    if (!searchValue.trim()) return;
    saveRecent(searchValue);
    go(searchValue.trim());
  };

  const cell = (width - space.lg * 2 - 2 * space.md) / 3;

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <View style={styles.header}>
        <View style={styles.field}>
          <Search size={18} color={color.primary} strokeWidth={2.5} />
          <TextInput
            ref={inputRef}
            autoFocus
            value={searchValue}
            onChangeText={onChange}
            onSubmitEditing={submit}
            placeholder="Search dishes or restaurants"
            placeholderTextColor={color.textMuted}
            returnKeyType="search"
            accessibilityLabel="Search dishes or restaurants"
            style={styles.input}
          />
          <View style={styles.divider} />
          <Press scale={0.9} onPress={() => inputRef.current?.focus()} accessibilityLabel="Voice search" style={styles.fieldBtn}>
            <Mic size={20} color={color.primary} />
          </Press>
        </View>
        <Press scale={0.9} onPress={onClose} accessibilityLabel="Close search" style={styles.close}>
          <X size={22} color={color.text} />
        </Press>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.lg, paddingBottom: NAV_CLEARANCE + space.lg + insets.bottom }}>
        <View style={{ marginBottom: space.xxl }}>
          <SectionHeader title="Recent searches" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {recent.slice(0, 8).map((s) => (
              <Press
                key={s}
                scale={0.97}
                onPress={() => {
                  onChange(s);
                  inputRef.current?.focus();
                }}
                accessibilityRole="button"
                accessibilityLabel={s}
                style={styles.chip}
              >
                <Clock size={14} color={color.textSecondary} />
                <Text style={styles.chipText} numberOfLines={1}>{s}</Text>
              </Press>
            ))}
          </View>
        </View>

        <Text style={styles.h3} accessibilityRole="header">{searchValue.trim() === '' ? 'Start typing to search dishes' : `Search results (${filteredFoods.length})`}</Text>
        {filteredFoods.length > 0 ? (
          <View style={styles.grid}>
            {filteredFoods.map((food) => (
              <Press
                key={food.id}
                scale={0.97}
                onPress={() => {
                  saveRecent(food.name);
                  go(food.name);
                }}
                accessibilityRole="button"
                accessibilityLabel={food.name}
                style={{ width: cell, alignItems: 'center', gap: space.sm }}
              >
                <View style={[styles.circle, { width: cell, height: cell, borderRadius: cell / 2 }]}>
                  {food.image ? (
                    <Image source={{ uri: food.image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  ) : (
                    <View style={{ flex: 1, backgroundColor: color.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}>
                      <Search size={20} color={color.textDisabled} />
                    </View>
                  )}
                </View>
                <Text style={styles.fName} numberOfLines={2}>{food.name}</Text>
              </Press>
            ))}
          </View>
        ) : loadingFoods ? (
          <View style={{ alignItems: 'center', paddingVertical: space.xxxl }} accessibilityRole="progressbar">
            <ActivityIndicator size="large" color={color.primary} style={{ marginBottom: space.lg }} />
            <Text style={styles.eTitle}>Loading dishes from database...</Text>
          </View>
        ) : (
          <EmptyState
            icon={Search}
            title={searchValue.trim() ? `No results found for "${searchValue}"` : 'No dishes found in database'}
            message={searchValue.trim() ? 'Try a different search term' : 'Type a dish name to see matching results'}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingLeft: space.lg, paddingRight: space.xs, paddingVertical: space.sm, backgroundColor: color.bg, borderBottomWidth: 1, borderBottomColor: color.border },
  field: { flex: 1, height: 48, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingLeft: space.md, paddingRight: space.xxs, borderWidth: 1, borderColor: color.primaryBorder, borderRadius: radii.md, backgroundColor: color.surface },
  input: { flex: 1, minWidth: 0, height: '100%', paddingVertical: 0, ...type.body, color: color.text, outlineWidth: 0 },
  divider: { width: 1, height: 20, backgroundColor: color.border },
  fieldBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: space.sm, height: 40, maxWidth: '100%', paddingHorizontal: space.md + 2, borderRadius: radii.pill, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border },
  chipText: { ...type.label, color: color.textSecondary, flexShrink: 1 },
  h3: { ...type.subheading, color: color.text, marginBottom: space.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  circle: { overflow: 'hidden', borderWidth: 2, borderColor: color.border, backgroundColor: color.surface, ...elevation.card },
  fName: { ...type.caption, fontFamily: 'Poppins_600SemiBold', color: color.text, textAlign: 'center', paddingHorizontal: space.xs },
  eTitle: { ...type.bodyStrong, color: color.textSecondary, textAlign: 'center' },
});
