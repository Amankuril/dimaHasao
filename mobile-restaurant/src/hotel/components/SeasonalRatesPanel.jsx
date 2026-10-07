import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { CalendarDays, CalendarRange, Check, ChevronDown, Plus, Trash2 } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { Button, IconButton } from '../../components/ds';
import { color, elevation, radii, space, type } from '../../theme';
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
    <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={placeholder} style={[styles.field, styles.dateField]}>
      <CalendarDays size={16} color={color.textMuted} />
      <Text style={[styles.fieldText, { flex: 1, color: value ? color.text : color.textDisabled }]} numberOfLines={1}>
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
      <Press
        scale={1}
        onPress={() => setOpen((value) => !value)}
        accessibilityLabel="Seasonal rates"
        accessibilityState={{ expanded: open }}
        style={styles.head}
      >
        <View style={styles.headIcon}>
          <CalendarRange size={18} color={color.primary} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.headTitle}>Seasonal rates</Text>
          <Text style={styles.headMeta} numberOfLines={1}>
            {activeCount > 0 ? `${activeCount} active` : `Base ${formatINR(roomType.pricePerNight)}`}
          </Text>
        </View>
        <ChevronDown size={18} color={color.textMuted} style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
      </Press>

      {open ? (
        <View style={styles.body}>
          <Text style={styles.note}>
            Nights inside a season are charged at its rate; every other night uses the base rate of{' '}
            <Text style={{ ...type.bodyStrong, fontSize: 13, color: color.text }}>{formatINR(roomType.pricePerNight)}</Text>.
          </Text>

          {seasons.length === 0 ? <Text style={styles.empty}>No seasons set for {roomType.name}.</Text> : null}

          {seasons.map((season, index) => (
            <View key={index} style={styles.season}>
              <Text style={styles.label}>Season name</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <TextInput
                  value={season.name}
                  onChangeText={(text) => patch(index, { name: text })}
                  placeholder="e.g. Puja peak"
                  placeholderTextColor={color.textDisabled}
                  accessibilityLabel="Season name"
                  style={[styles.field, styles.fieldText, { flex: 1, minWidth: 0, color: color.text }]}
                />
                <IconButton icon={Trash2} label="Remove season" variant="danger" onPress={() => remove(index)} style={{ borderRadius: radii.md }} />
              </View>
              <View style={{ flexDirection: 'row', gap: space.sm }}>
                <View style={{ flex: 1, gap: space.xs }}>
                  <Text style={styles.label}>From</Text>
                  <DateBox value={season.startDate} placeholder="Start date" onChange={(v) => patch(index, { startDate: v })} />
                </View>
                <View style={{ flex: 1, gap: space.xs }}>
                  <Text style={styles.label}>To</Text>
                  <DateBox value={season.endDate} placeholder="End date" onChange={(v) => patch(index, { endDate: v })} />
                </View>
              </View>
              <Text style={styles.label}>Price per night (₹)</Text>
              <TextInput
                value={String(season.pricePerNight ?? '')}
                onChangeText={(text) => patch(index, { pricePerNight: text.replace(/[^0-9.]/g, '') })}
                keyboardType="numeric"
                accessibilityLabel="Price per night"
                style={[styles.field, styles.fieldText, type.bodyStrong, { color: color.text }]}
              />
              <Press
                scale={1}
                onPress={() => patch(index, { isActive: !season.isActive })}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: season.isActive }}
                accessibilityLabel="Apply this season"
                style={styles.checkRow}
              >
                <View style={[styles.check, season.isActive ? { backgroundColor: color.primary, borderColor: color.primary } : null]}>
                  {season.isActive ? <Check size={14} color={color.onPrimary} strokeWidth={3} /> : null}
                </View>
                <Text style={styles.applyText}>Apply this season</Text>
              </Press>
            </View>
          ))}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Button title="Add season" icon={Plus} variant="outline" fullWidth={false} onPress={add} />
            <Button title="Save rates" onPress={save} loading={saving} disabled={saving} style={{ flex: 1 }} />
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { marginHorizontal: space.lg, marginBottom: space.lg, backgroundColor: color.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, overflow: 'hidden', ...elevation.card },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, minHeight: 56 },
  headIcon: { width: 36, height: 36, borderRadius: radii.md, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  headTitle: { ...type.bodyStrong, color: color.text },
  headMeta: { ...type.caption, color: color.textMuted },
  body: { padding: space.lg, gap: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border },
  note: { ...type.small, color: color.textSecondary },
  empty: { ...type.small, color: color.textMuted, paddingVertical: space.sm },
  season: { backgroundColor: color.surfaceMuted, borderRadius: radii.md, padding: space.md, gap: space.xs + 2 },
  label: { ...type.label, color: color.text },
  field: { paddingHorizontal: space.md, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, borderRadius: radii.md, justifyContent: 'center', minHeight: 48 },
  dateField: { flexDirection: 'row', alignItems: 'center', gap: space.sm, justifyContent: 'flex-start' },
  fieldText: { ...type.body },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 44 },
  check: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: color.borderStrong, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' },
  applyText: { ...type.label, color: color.text },
});

export { SeasonalRatesPanel };
export default SeasonalRatesPanel;
