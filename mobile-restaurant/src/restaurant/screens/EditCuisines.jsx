import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Search, Sparkles } from 'lucide-react-native';
import { Button, Card, SectionHeader, StatusBadge } from '../../components/ds';
import { color, elevation, radii, space, type } from '../../theme';
import { useEditCuisines } from '../hooks/pages/useEditCuisines';
import { CheckRow, Input, PinnedBar, ScreenHeader } from './inventory/partnerKit';

function Row({ name, selected, onPress, divider }) {
  return <CheckRow label={name} checked={selected} onPress={onPress} style={[styles.row, divider && styles.divider]} />;
}

/** Port of Food/pages/restaurant/EditCuisines.jsx (/food/restaurant/edit-cuisines). */
export default function EditCuisines() {
  const { navigate, search, setSearch, selected, error, handleToggle, handleUpdate, filtered, recommendedSet } = useEditCuisines();
  const recommended = filtered.filter((name) => recommendedSet.has(name));
  const others = filtered.filter((name) => !recommendedSet.has(name));
  const none = selected.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <ScreenHeader title="Restaurant cuisines" subtitle={`${selected.length} selected`} onBack={() => navigate(-1)} />

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.lg, gap: space.xxl, paddingBottom: space.xxxl }}>
        <Input value={search} onChangeText={setSearch} placeholder="Search cuisines" accessibilityLabel="Search cuisines" left={<Search size={18} color={color.textMuted} />} />

        <View>
            <SectionHeader title="Recommended" />
            <Card padded={false} style={{ overflow: 'hidden' }}>
              <View style={styles.recHead}>
                <Text style={[type.small, { flex: 1, color: color.textSecondary }]}>These cuisines are updated instantly</Text>
                <StatusBadge label="Pre-approved" tone="gold" icon={Sparkles} />
              </View>
              {recommended.map((name, idx) => (
                <Row key={name} name={name} selected={selected.includes(name)} onPress={() => handleToggle(name)} divider={idx < recommended.length - 1} />
              ))}
            </Card>
          </View>

        {others.length > 0 ? (
          <View>
            <SectionHeader title="All cuisines" />
            <Card padded={false} style={{ overflow: 'hidden' }}>
              {others.map((name, idx) => (
                <Row key={name} name={name} selected={selected.includes(name)} onPress={() => handleToggle(name)} divider={idx < others.length - 1} />
              ))}
            </Card>
          </View>
        ) : null}
      </ScrollView>

      {error ? (
        <View style={styles.errorWrap} pointerEvents="none" accessibilityRole="alert">
          <View style={styles.error}>
            <Text style={[type.small, { color: color.textInverse, textAlign: 'center' }]}>{error}</Text>
          </View>
        </View>
      ) : null}

      <PinnedBar>
        <Button title="Update cuisines" size="lg" disabled={none} onPress={handleUpdate} />
      </PinnedBar>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: space.lg, minHeight: 52 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  recHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.md, backgroundColor: color.goldSoft, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  errorWrap: { alignItems: 'center', paddingHorizontal: space.lg, marginBottom: space.sm },
  error: { backgroundColor: color.text, borderRadius: radii.pill, paddingHorizontal: space.lg, paddingVertical: space.sm, ...elevation.float },
});
