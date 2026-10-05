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
import { F } from '../../components/shell';
import { poppins, tw } from '../../../theme';

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

  const cell = (width - 32 - 2 * 12) / 3;

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={[styles.header, { paddingTop: 16 }]}>
        <View style={{ flex: 1 }}>
          <Search size={20} color={F.green} strokeWidth={2.5} style={styles.sIcon} />
          <TextInput
            ref={inputRef}
            autoFocus
            value={searchValue}
            onChangeText={onChange}
            onSubmitEditing={submit}
            placeholder="Search dishes or restaurants"
            placeholderTextColor={tw.gray400}
            returnKeyType="search"
            style={styles.input}
          />
          <View style={styles.mic}>
            <View style={{ width: 1, height: 24, backgroundColor: tw.gray200 }} />
            <Press scale={0.9} onPress={() => inputRef.current?.focus()} accessibilityLabel="Voice search" style={{ padding: 10, borderRadius: 12 }}>
              <Mic size={20} color={F.green} />
            </Press>
          </View>
        </View>
        <Press scale={0.9} onPress={onClose} accessibilityLabel="Close search" style={styles.close}>
          <X size={20} color={tw.gray700} />
        </Press>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingTop: 24, paddingBottom: 96 + insets.bottom }}>
        <View style={{ marginBottom: 24 }}>
          <View style={styles.rHead}>
            <Clock size={16} color={F.green} />
            <Text style={styles.rTitle}>Recent Searches</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {recent.slice(0, 8).map((s) => (
              <Press
                key={s}
                scale={0.97}
                onPress={() => {
                  onChange(s);
                  inputRef.current?.focus();
                }}
                accessibilityLabel={s}
                style={styles.chip}
              >
                <Clock size={12} color={F.green} />
                <Text style={styles.chipText}>{s}</Text>
              </Press>
            ))}
          </View>
        </View>

        <Text style={styles.h3}>{searchValue.trim() === '' ? 'Start typing to search dishes' : `Search Results (${filteredFoods.length})`}</Text>
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
                accessibilityLabel={food.name}
                style={{ width: cell, alignItems: 'center', gap: 8 }}
              >
                <View style={[styles.circle, { width: cell, height: cell, borderRadius: cell / 2 }]}>
                  {food.image ? (
                    <Image source={{ uri: food.image }} style={{ width: '100%', height: '100%', borderRadius: cell / 2 }} resizeMode="cover" />
                  ) : (
                    <View style={{ flex: 1, borderRadius: cell / 2, backgroundColor: tw.gray100, alignItems: 'center', justifyContent: 'center' }}>
                      <Search size={20} color={tw.gray400} />
                    </View>
                  )}
                </View>
                <Text style={styles.fName} numberOfLines={2}>{food.name}</Text>
              </Press>
            ))}
          </View>
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: 48 }}>
            {loadingFoods ? (
              <>
                <ActivityIndicator size="large" color={tw.gray300} style={{ marginBottom: 16 }} />
                <Text style={styles.eTitle}>Loading dishes from database...</Text>
              </>
            ) : (
              <>
                <Search size={48} color={tw.gray300} style={{ marginBottom: 16 }} />
                <Text style={styles.eTitle}>{searchValue.trim() ? `No results found for "${searchValue}"` : 'No dishes found in database'}</Text>
                <Text style={styles.eBody}>{searchValue.trim() ? 'Try a different search term' : 'Type a dish name to see matching results'}</Text>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 16, paddingBottom: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: tw.gray100, ...{ boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' } },
  sIcon: { position: 'absolute', left: 20, top: 16, zIndex: 1 },
  input: { height: 52, paddingLeft: 56, paddingRight: 64, borderWidth: 1, borderColor: tw.gray200, borderRadius: 16, fontSize: 16, color: tw.gray900, backgroundColor: '#fff', ...poppins(400) },
  mic: { position: 'absolute', right: 8, top: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  close: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  rHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  rTitle: { fontSize: 14, lineHeight: 20, color: tw.gray700, ...poppins(600) },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: tw.orange50, borderWidth: 1, borderColor: tw.orange200, ...{ boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' } },
  chipText: { fontSize: 12, lineHeight: 16, color: tw.gray700, ...poppins(500) },
  h3: { fontSize: 18, lineHeight: 28, color: tw.gray900, marginBottom: 16, ...poppins(700) },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  circle: { padding: 4, backgroundColor: '#fff', ...{ boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)' } },
  fName: { fontSize: 12, lineHeight: 16, color: tw.gray800, textAlign: 'center', paddingHorizontal: 4, ...poppins(600) },
  eTitle: { fontSize: 16, lineHeight: 24, color: tw.gray600, textAlign: 'center', ...poppins(600) },
  eBody: { fontSize: 14, lineHeight: 20, color: tw.gray500, marginTop: 8, textAlign: 'center', ...poppins(400) },
});
