import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { CalendarRange, ChevronDown, Plus, Trash2 } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { poppins, shadow, tw } from '../../theme';
import { propertyService } from '../services/apiService';
import { formatINR, toInputDate } from '../utils/format';

/*
 * Port of Frontend/src/modules/Hotel/app/partner/components/SeasonalRatesPanel.jsx.
 *
 * Seasonal rate editor for one room type: named date ranges that override the
 * room's base nightly rate. Overlaps are allowed, first match wins. The web's
 * <input type="date"> is the Android date dialog here.
 */

const pad = (n) => String(n).padStart(2, '0');
const toYmd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function DateBox({ value, onChange, placeholder }) {
  const open = () => {
    const current = value ? new Date(`${value}T00:00:00`) : new Date();
    DateTimePickerAndroid.open({
      value: Number.isNaN(current.getTime()) ? new Date() : current,
      mode: 'date',
      onChange: (event, date) => {
        if (event.type === 'set' && date) onChange(toYmd(date));
      },
    });
  };
  return (
    <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={placeholder} style={[styles.field, { flex: 1 }]}>
      <Text style={[styles.fieldText, { color: value ? tw.gray900 : tw.gray400 }]} numberOfLines={1}>
        {value || placeholder}
      </Text>
    </Pressable>
  );
}

const SeasonalRatesPanel = ({ propertyId, roomType, onSaved, onNotify }) => {
  const [open, setOpen] = useState(false);
  const [seasons, setSeasons] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSeasons(
      (roomType?.seasonalRates || []).map((season) => ({
        name: season.name || '',
        startDate: toInputDate(season.startDate),
        endDate: toInputDate(season.endDate),
        pricePerNight: season.pricePerNight ?? roomType?.pricePerNight ?? 0,
        isActive: season.isActive !== false,
      })),
    );
  }, [roomType]);

  if (!roomType) return null;

  const patch = (index, changes) =>
    setSeasons((current) => current.map((season, i) => (i === index ? { ...season, ...changes } : season)));

  const add = () =>
    setSeasons((current) => [
      ...current,
      { name: '', startDate: '', endDate: '', pricePerNight: roomType.pricePerNight || 0, isActive: true },
    ]);

  const remove = (index) => setSeasons((current) => current.filter((_, i) => i !== index));

  const save = async () => {
    for (const season of seasons) {
      if (!season.name.trim() || !season.startDate || !season.endDate) {
        onNotify?.('Every season needs a name, a start date and an end date', 'error');
        return;
      }
      if (new Date(season.endDate) < new Date(season.startDate)) {
        onNotify?.(`"${season.name}" ends before it starts`, 'error');
        return;
      }
    }

    try {
      setSaving(true);
      await propertyService.updateRoomType(propertyId, roomType._id, {
        seasonalRates: seasons.map((season) => ({
          ...season,
          pricePerNight: Number(season.pricePerNight),
        })),
      });
      onNotify?.('Seasonal rates saved', 'success');
      onSaved?.();
    } catch (error) {
      onNotify?.(error?.message || 'Could not save seasonal rates', 'error');
    } finally {
      setSaving(false);
    }
  };

  const activeCount = seasons.filter((season) => season.isActive).length;

  return (
    <View style={styles.card}>
      <Press scale={1} onPress={() => setOpen((value) => !value)} accessibilityLabel="Seasonal rates" style={styles.head}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <CalendarRange size={16} color={tw.emerald600} />
          <Text style={styles.headTitle}>Seasonal rates</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.headMeta}>{activeCount > 0 ? `${activeCount} active` : `Base ${formatINR(roomType.pricePerNight)}`}</Text>
          <ChevronDown size={14} color={tw.gray400} style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
        </View>
      </Press>

      {open ? (
        <View style={styles.body}>
          <Text style={styles.note}>
            Nights inside a season are charged at its rate; every other night uses the base rate of{' '}
            <Text style={poppins(700)}>{formatINR(roomType.pricePerNight)}</Text>.
          </Text>

          {seasons.length === 0 ? <Text style={styles.empty}>No seasons set for {roomType.name}.</Text> : null}

          {seasons.map((season, index) => (
            <View key={index} style={styles.season}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TextInput
                  value={season.name}
                  onChangeText={(text) => patch(index, { name: text })}
                  placeholder="e.g. Puja peak"
                  placeholderTextColor={tw.gray400}
                  style={[styles.field, styles.fieldText, { flex: 1, color: tw.gray900 }]}
                />
                <Press onPress={() => remove(index)} accessibilityLabel="Remove season" style={{ padding: 8, borderRadius: 8 }}>
                  <Trash2 size={14} color={tw.red500} />
                </Press>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <DateBox value={season.startDate} placeholder="Start date" onChange={(v) => patch(index, { startDate: v })} />
                <DateBox value={season.endDate} placeholder="End date" onChange={(v) => patch(index, { endDate: v })} />
                <TextInput
                  value={String(season.pricePerNight ?? '')}
                  onChangeText={(text) => patch(index, { pricePerNight: text.replace(/[^0-9.]/g, '') })}
                  keyboardType="numeric"
                  accessibilityLabel="Price per night"
                  style={[styles.field, styles.fieldText, { flex: 1, color: tw.gray900, ...poppins(700) }]}
                />
              </View>
              <Press
                scale={1}
                onPress={() => patch(index, { isActive: !season.isActive })}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: season.isActive }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <View style={[styles.check, season.isActive ? { backgroundColor: tw.emerald600, borderColor: tw.emerald600 } : null]}>
                  {season.isActive ? <Text style={styles.tick}>✓</Text> : null}
                </View>
                <Text style={styles.applyText}>Apply this season</Text>
              </Press>
            </View>
          ))}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Press onPress={add} style={styles.addBtn}>
              <Plus size={12} color={tw.gray600} />
              <Text style={styles.addText}>Add season</Text>
            </Press>
            <Press onPress={save} disabled={saving} style={[styles.saveBtn, saving ? { opacity: 0.6 } : null]}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : null}
              <Text style={styles.saveText}>Save rates</Text>
            </Press>
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginBottom: 16, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: tw.gray100, overflow: 'hidden', ...shadow('sm') },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  headTitle: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(700) },
  headMeta: { fontSize: 11, lineHeight: 16.5, color: tw.gray400, ...poppins(700) },
  body: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 12, gap: 12, borderTopWidth: 1, borderTopColor: tw.gray50 },
  note: { fontSize: 11, lineHeight: 16.5, color: tw.gray500, ...poppins(400) },
  empty: { fontSize: 12, lineHeight: 16, color: tw.gray400, paddingVertical: 8, ...poppins(400) },
  season: { backgroundColor: tw.gray50, borderRadius: 12, padding: 12, gap: 8 },
  field: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: tw.gray200, borderRadius: 8, justifyContent: 'center', minHeight: 36 },
  fieldText: { fontSize: 12, lineHeight: 16, ...poppins(400) },
  check: { width: 16, height: 16, borderRadius: 3, borderWidth: 1, borderColor: tw.gray300, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  tick: { fontSize: 11, lineHeight: 13, color: '#fff', ...poppins(700) },
  applyText: { fontSize: 11, lineHeight: 16.5, color: tw.gray500, ...poppins(700) },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: tw.gray50, borderWidth: 1, borderColor: tw.gray200, borderRadius: 8 },
  addText: { fontSize: 11, lineHeight: 16.5, color: tw.gray600, ...poppins(700) },
  saveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: tw.emerald600, borderRadius: 8 },
  saveText: { fontSize: 12, lineHeight: 16, color: '#fff', ...poppins(700) },
});

export { SeasonalRatesPanel };
export default SeasonalRatesPanel;
