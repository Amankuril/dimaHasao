import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Check, Search } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { poppins, shadow, tw } from '../../theme';
import { useEditCuisines } from '../hooks/pages/useEditCuisines';
import { RT, RT_GRADIENT } from '../theme';

function Row({ name, selected, onPress, borderColor, style }) {
  return (
    <Press scale={1} onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} style={[styles.row, style]}>
      <Text style={styles.rowText}>{name}</Text>
      <LinearGradient colors={selected ? RT_GRADIENT : ['#fff', '#fff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.box, { borderColor }]}>
        {selected ? <Check size={12} color="#fff" /> : null}
      </LinearGradient>
    </Press>
  );
}

/** Port of Food/pages/restaurant/EditCuisines.jsx (/food/restaurant/edit-cuisines). */
export default function EditCuisines() {
  const insets = useSafeAreaInsets();
  const { navigate, search, setSearch, selected, error, handleToggle, handleUpdate, filtered, recommendedSet } = useEditCuisines();
  const recommended = filtered.filter((name) => recommendedSet.has(name));
  const others = filtered.filter((name) => !recommendedSet.has(name));
  const none = selected.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={[styles.header, { paddingTop: 12 + insets.top }]}>
        <Press onPress={() => navigate(-1)} accessibilityLabel="Go back" hitSlop={8} style={{ padding: 6 }}>
          <ArrowLeft size={24} color={RT.primary} />
        </Press>
        <Text style={styles.title} accessibilityRole="header">Edit restaurant cuisines</Text>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 110 + insets.bottom, gap: 16 }}>
        <View style={styles.search}>
          <Search size={16} color={tw.gray400} />
          <TextInput value={search} onChangeText={setSearch} placeholder="Search cuisines" placeholderTextColor={tw.gray400} accessibilityLabel="Search cuisines" style={styles.searchInput} />
        </View>

        <View style={styles.recommended}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(600) }}>Recommended</Text>
            <Text style={styles.pre}>PRE APPROVED</Text>
          </View>
          <Text style={{ fontSize: 12, lineHeight: 16, color: tw.gray600, marginBottom: 8, ...poppins(400) }}>These cuisines will be updated instantly</Text>
          {recommended.map((name) => (
            <Row key={name} name={name} selected={selected.includes(name)} onPress={() => handleToggle(name)} borderColor={RT.primary} />
          ))}
        </View>

        <View style={styles.others}>
          {others.map((name, idx) => (
            <Row
              key={name}
              name={name}
              selected={selected.includes(name)}
              onPress={() => handleToggle(name)}
              borderColor="#000"
              style={[{ paddingHorizontal: 16 }, idx < others.length - 1 ? { borderBottomWidth: 1, borderBottomColor: tw.gray100 } : null]}
            />
          ))}
        </View>
      </ScrollView>

      {error ? (
        <View style={[styles.error, { bottom: 96 + insets.bottom }]} pointerEvents="none" accessibilityRole="alert">
          <Text style={{ fontSize: 12, lineHeight: 16, color: tw.gray900, ...poppins(400) }}>{error}</Text>
        </View>
      ) : null}

      <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
        <Press scale={0.98} disabled={none} onPress={handleUpdate} accessibilityState={{ disabled: none }}>
          <LinearGradient colors={none ? [tw.gray200, tw.gray200] : RT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.update}>
            <Text style={{ fontSize: 16, lineHeight: 24, color: none ? tw.gray500 : '#fff', ...poppins(700) }}>Update Cuisines</Text>
          </LinearGradient>
        </Press>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: tw.gray200, paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontSize: 18, lineHeight: 28, color: tw.gray900, ...poppins(700) },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: tw.gray300 },
  searchInput: { flex: 1, paddingVertical: 0, fontSize: 14, color: tw.gray900, ...poppins(400) },
  recommended: { backgroundColor: tw.blue50, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  pre: { fontSize: 11, lineHeight: 16, color: '#fff', backgroundColor: tw.green600, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, overflow: 'hidden', ...poppins(600) },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  rowText: { flex: 1, fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(400) },
  box: { width: 20, height: 20, borderWidth: 1, borderRadius: 2, alignItems: 'center', justifyContent: 'center' },
  others: { borderRadius: 12, borderWidth: 1, borderColor: tw.gray200, overflow: 'hidden' },
  error: { position: 'absolute', alignSelf: 'center', backgroundColor: '#fff', borderRadius: 999, borderWidth: 1, borderColor: tw.gray200, paddingHorizontal: 16, paddingVertical: 8, ...shadow('lg') },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: tw.gray200, paddingHorizontal: 16, paddingTop: 16 },
  update: { height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', ...shadow('lg') },
});
