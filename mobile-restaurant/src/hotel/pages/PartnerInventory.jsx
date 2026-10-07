import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight,
  BedDouble, Users, Plus, Minus, CheckCircle, X, AlertTriangle,
  Globe, Lock,
} from 'lucide-react-native';
import { useNavigate, useParams } from '../../lib/webRouter';
import { BottomSheet, SelectField } from '../../components/kit';
import { Press } from '../../components/ui';
import { Button, Chip, ChipRow, IconButton, SegmentedControl } from '../../components/ds';
import HeritageHeader from '../../components/HeritageHeader';
import { color, elevation, radii, space, tone, type } from '../../theme';
import { propertyService, availabilityService } from '../services/apiService';
import SeasonalRatesPanel from '../components/SeasonalRatesPanel';
import { PageLoader } from '../components/dashboard/partnerUi';

/* Port of Frontend/src/modules/Hotel/app/partner/pages/PartnerInventory.jsx. */

const pad = (n) => String(n).padStart(2, '0');
const toYmd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromYmd = (s) => {
  const d = new Date(`${s}T00:00:00`);
  return Number.isNaN(d.getTime()) ? new Date() : d;
};
const addDays = (d, n) => {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
};

const TABS = [
  { id: 'walk_in', label: 'Walk-in', icon: Users },
  { id: 'external', label: 'External', icon: Globe },
  { id: 'block', label: 'Block', icon: Lock },
];

const PLATFORMS = [
  { value: '', label: 'Select Platform' },
  { value: 'Airbnb', label: 'Airbnb' },
  { value: 'Booking.com', label: 'Booking.com' },
  { value: 'Agoda', label: 'Agoda' },
  { value: 'Other', label: 'Other' },
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** The web's <input type="date">: a box that opens the Android date dialog. */
function DateField({ value, onChange, minimumDate, label }) {
  const open = () => {
    DateTimePickerAndroid.open({
      value: value ? fromYmd(value) : new Date(),
      mode: 'date',
      minimumDate,
      onChange: (event, date) => {
        if (event.type === 'set' && date) onChange(toYmd(date));
      },
    });
  };
  return (
    <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={label ? `${label}: ${value || 'not set'}` : value} style={[styles.input, styles.dateInput]}>
      <CalendarIcon size={16} color={color.textMuted} />
      <Text style={[styles.inputText, { flex: 1, color: value ? color.text : color.textDisabled }]} numberOfLines={1}>
        {value}
      </Text>
    </Pressable>
  );
}

const PartnerInventory = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const insets = useSafeAreaInsets();
  const { height: screenH, width: screenW } = useWindowDimensions();

  // State
  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState(null);
  const [roomTypes, setRoomTypes] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [availabilityMap, setAvailabilityMap] = useState({});

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState('walk_in'); // walk_in, external, block
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    units: 1,
    source: 'walk_in',
    platform: '', // For external
    referenceNo: '', // For external
    notes: '', // For block
  });

  // Initial Fetch
  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const res = await propertyService.getDetails(id);
        setProperty(res.property);
        const rooms = res.roomTypes || [];
        setRoomTypes(rooms);
        if (rooms.length > 0) {
          setSelectedRoom(rooms[0]);
        }
      } catch (error) {
        console.error('Failed to load property', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProperty();
  }, [id]);

  // Fetch Availability when Month or Room changes
  useEffect(() => {
    if (!selectedRoom) return;

    const fetchAvailability = async () => {
      try {
        // Get start and end of current month view
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        await availabilityService.check({
          propertyId: id,
          checkIn: firstDay.toISOString(),
          checkOut: lastDay.toISOString(),
        });

        // The ledger gives accurate daily visuals: availability per day is computed on the client.
        const ledgerRes = await availabilityService.getLedger({
          propertyId: id,
          roomTypeId: selectedRoom._id,
          startDate: firstDay.toISOString(),
          limit: 500, // Increased limit as backend doesn't filter by date yet
        });

        // Compute availability per day
        const dayMap = {};
        const daysInMonth = lastDay.getDate();
        const total = selectedRoom?.totalInventory || 0;

        for (let d = 1; d <= daysInMonth; d++) {
          const dateObj = new Date(year, month, d);
          let blockedCount = 0;

          if (ledgerRes.entries) {
            ledgerRes.entries.forEach((entry) => {
              const start = new Date(entry.startDate);
              const end = new Date(entry.endDate);
              // [start, end): check-in day counts, check-out day is free
              if (dateObj >= start && dateObj < end) {
                blockedCount += entry.units;
              }
            });
          }

          dayMap[d] = Math.max(0, total - blockedCount);
        }
        setAvailabilityMap(dayMap);
      } catch (error) {
        console.error('Failed to fetch availability', error);
      }
    };

    fetchAvailability();
  }, [selectedRoom, currentDate, id, toast]); // re-fetch when toast appears (action done)

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Handlers
  const handleDateClick = (day) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const dateObj = new Date(year, month, day);
    const nextDateObj = new Date(year, month, day + 1);

    setFormData({
      ...formData,
      startDate: toYmd(dateObj),
      endDate: toYmd(nextDateObj),
      units: 1,
    });
    setIsModalOpen(true);
  };

  const handleMonthChange = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const handleOpenModal = () => {
    const todayObj = new Date();
    setFormData({
      ...formData,
      startDate: toYmd(todayObj),
      endDate: toYmd(addDays(todayObj, 1)),
      units: 1,
    });
    setIsModalOpen(true);
  };

  const handleActionSubmit = async () => {
    setActionLoading(true);
    try {
      const payload = {
        propertyId: id,
        roomTypeId: selectedRoom._id,
        startDate: formData.startDate,
        endDate: formData.endDate,
        units: Number(formData.units),
      };

      let res;
      if (modalTab === 'walk_in') {
        res = await availabilityService.createWalkIn(payload);
      } else if (modalTab === 'external') {
        res = await availabilityService.createExternal({
          ...payload,
          platform: formData.platform,
          referenceNo: formData.referenceNo,
        });
      } else if (modalTab === 'block') {
        res = await availabilityService.blockDates({
          ...payload,
          notes: formData.notes,
        });
      }

      if (res.success) {
        setIsModalOpen(false);
        showToast('Inventory updated successfully!', 'success');
      }
    } catch (error) {
      showToast(error.message || 'Operation failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // --- Render Helpers ---

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cellW = (screenW - space.lg * 2 - 2) / 7 - 0.1;

    const days = [];
    // Empty slots for start match
    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={[styles.cell, { width: cellW, backgroundColor: color.surfaceMuted }]} />);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const available = availabilityMap[d];
      const isSoldOut = available === 0;
      const isLow = available > 0 && available <= 2;
      const displayCount = available !== undefined ? available : '-';
      const t = isSoldOut ? tone.danger : isLow ? tone.warning : tone.success;

      days.push(
        <Pressable
          key={d}
          onPress={() => handleDateClick(d)}
          accessibilityRole="button"
          accessibilityLabel={`${d}: ${selectedRoom ? (isSoldOut ? 'sold out' : `${displayCount} left`) : ''}. Update inventory`}
          style={({ pressed }) => [styles.cell, { width: cellW, backgroundColor: isSoldOut ? color.dangerSoft : color.surface }, pressed && { backgroundColor: color.primarySoft }]}
        >
          <Text style={[type.caption, { color: isSoldOut ? color.danger : color.textSecondary }]}>{d}</Text>
          {selectedRoom ? (
            <View style={[styles.tag, { backgroundColor: t.bg }]}>
              <Text style={[isSoldOut ? type.caption : type.bodyStrong, { color: t.fg }]} numberOfLines={1}>
                {isSoldOut ? 'Full' : displayCount}
              </Text>
            </View>
          ) : null}
        </Pressable>,
      );
    }

    return (
      <View style={styles.grid}>
        {WEEKDAYS.map((day) => (
          <View key={day} style={[styles.dayHead, { width: cellW }]}>
            <Text style={[type.caption, { color: color.textMuted }]}>{day}</Text>
          </View>
        ))}
        {days}
      </View>
    );
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      {/* Header */}
      <HeritageHeader title="Inventory" subtitle={property?.propertyName} onBack={() => navigate(-1)} />

      <ScrollView contentContainerStyle={{ paddingBottom: 56 + space.xxxl + insets.bottom }} keyboardShouldPersistTaps="handled">
        {/* Room Selector */}
        <View style={{ paddingVertical: space.lg }}>
          <ChipRow>
            {roomTypes.map((rt) => (
              <Chip key={rt._id} icon={BedDouble} label={rt.name} selected={selectedRoom?._id === rt._id} onPress={() => setSelectedRoom(rt)} />
            ))}
          </ChipRow>
        </View>

        <SeasonalRatesPanel
          propertyId={id}
          roomType={selectedRoom}
          onNotify={(message, type) => showToast(message, type)}
          onSaved={async () => {
            // Re-read so the panel shows exactly what was stored.
            const res = await propertyService.getDetails(id);
            const rooms = res.roomTypes || [];
            setRoomTypes(rooms);
            setSelectedRoom(rooms.find((room) => room._id === selectedRoom?._id) || rooms[0] || null);
          }}
        />

        {/* Calendar Controls */}
        <View style={styles.monthRow}>
          <Text style={[type.heading, { color: color.text, flex: 1 }]} numberOfLines={1}>
            {currentDate.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
          </Text>
          <IconButton icon={ChevronLeft} label="Previous month" variant="soft" onPress={() => handleMonthChange(-1)} />
          <IconButton icon={ChevronRight} label="Next month" variant="soft" onPress={() => handleMonthChange(1)} />
        </View>
        <Text style={[type.small, { color: color.textMuted, paddingHorizontal: space.lg, marginBottom: space.md }]}>Rooms left each night. Tap a date to update it.</Text>

        {/* Calendar Grid */}
        <View style={{ paddingHorizontal: space.lg }}>{renderCalendar()}</View>

        {/* Legend */}
        <View style={styles.legend}>
          {[
            ['Available', 'success'],
            ['Low stock (1–2)', 'warning'],
            ['Sold out', 'danger'],
          ].map(([label, t]) => (
            <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs + 2 }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: tone[t].fg }} />
              <Text style={[type.caption, { color: color.textSecondary }]}>{label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* FAB */}
      <Press onPress={handleOpenModal} scale={0.9} accessibilityLabel="Update inventory" style={[styles.fab, { bottom: space.xxl + insets.bottom }]}>
        <Plus size={26} color={color.onPrimary} />
      </Press>

      {/* Toast */}
      {toast ? (
        <View pointerEvents="none" style={[styles.toastWrap, { top: insets.top + 72 }]}>
          <View style={styles.toast} accessibilityLiveRegion="polite">
            {toast.type === 'success' ? <CheckCircle size={18} color={color.successSoft} /> : <AlertTriangle size={18} color={color.dangerSoft} />}
            <Text style={[type.bodyStrong, { color: color.textInverse, flexShrink: 1 }]}>{toast.message}</Text>
          </View>
        </View>
      ) : null}

      {/* Action Bottom Sheet */}
      <BottomSheet
        visible={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        backdrop={color.overlay}
        blur={8}
        panelStyle={[styles.sheet, { height: Math.round(screenH * 0.85) }]}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.sheetHead}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[type.heading, { color: color.text }]}>Update inventory</Text>
              <Text style={[type.small, { color: color.textMuted }]} numberOfLines={1}>
                {selectedRoom?.name}
              </Text>
            </View>
            <IconButton icon={X} label="Close" variant="soft" onPress={() => setIsModalOpen(false)} />
          </View>

          {/* Tabs */}
          <SegmentedControl
            options={TABS.map((tab) => ({ value: tab.id, label: tab.label }))}
            value={modalTab}
            onChange={setModalTab}
            style={{ margin: space.lg }}
          />

          {/* Form */}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.xxl, gap: space.xl }} keyboardShouldPersistTaps="handled">
            <View style={{ flexDirection: 'row', gap: space.md }}>
              <View style={{ flex: 1, gap: space.xs + 2 }}>
                <Text style={styles.label}>Check-in</Text>
                <DateField
                  label="Check-in"
                  value={formData.startDate}
                  onChange={(newStart) => {
                    let newEnd = formData.endDate;
                    if (newEnd <= newStart) newEnd = toYmd(addDays(fromYmd(newStart), 1));
                    setFormData({ ...formData, startDate: newStart, endDate: newEnd });
                  }}
                />
              </View>
              <View style={{ flex: 1, gap: space.xs + 2 }}>
                <Text style={styles.label}>Check-out</Text>
                <DateField
                  label="Check-out"
                  value={formData.endDate}
                  minimumDate={addDays(fromYmd(formData.startDate), 1)}
                  onChange={(v) => setFormData({ ...formData, endDate: v })}
                />
              </View>
            </View>

            <View style={{ gap: space.xs + 2 }}>
              <Text style={styles.label}>Number of rooms</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
                <Pressable
                  onPress={() => setFormData({ ...formData, units: Math.max(1, formData.units - 1) })}
                  accessibilityRole="button"
                  accessibilityLabel="Fewer rooms"
                  style={styles.stepBtn}
                >
                  <Minus size={20} color={color.text} />
                </Pressable>
                <Text style={[type.price, { minWidth: 32, textAlign: 'center', color: color.text }]}>{formData.units}</Text>
                <Pressable
                  onPress={() => setFormData({ ...formData, units: formData.units + 1 })}
                  accessibilityRole="button"
                  accessibilityLabel="More rooms"
                  style={styles.stepBtn}
                >
                  <Plus size={20} color={color.text} />
                </Pressable>
              </View>
              <Text style={[type.caption, { color: color.textMuted }]}>Maximum {selectedRoom?.totalInventory} units available in total.</Text>
            </View>

            {modalTab === 'external' ? (
              <>
                <View style={{ gap: space.xs + 2 }}>
                  <Text style={styles.label}>Platform name</Text>
                  <SelectField
                    value={formData.platform}
                    options={PLATFORMS}
                    onChange={(v) => setFormData({ ...formData, platform: v })}
                    accessibilityLabel="Platform Name"
                    style={styles.input}
                    textStyle={[styles.inputText, { color: color.text }]}
                    chevronColor={color.textMuted}
                  />
                </View>
                <View style={{ gap: space.xs + 2 }}>
                  <Text style={styles.label}>Reference ID</Text>
                  <TextInput
                    placeholder="e.g. #AB12345"
                    placeholderTextColor={color.textDisabled}
                    value={formData.referenceNo}
                    onChangeText={(t) => setFormData({ ...formData, referenceNo: t })}
                    accessibilityLabel="Reference ID"
                    style={[styles.input, styles.inputText, { color: color.text }]}
                  />
                </View>
              </>
            ) : null}

            {modalTab === 'block' ? (
              <View style={{ gap: space.xs + 2 }}>
                <Text style={styles.label}>Reason for blocking</Text>
                <TextInput
                  placeholder="e.g. Maintenance, Painting, Personal use..."
                  placeholderTextColor={color.textDisabled}
                  value={formData.notes}
                  onChangeText={(t) => setFormData({ ...formData, notes: t })}
                  multiline
                  textAlignVertical="top"
                  accessibilityLabel="Reason for blocking"
                  style={[styles.input, styles.inputText, { height: 96, paddingTop: space.md, color: color.text }]}
                />
              </View>
            ) : null}
          </ScrollView>

          {/* Submit Button */}
          <View style={[styles.submitWrap, { paddingBottom: space.lg + insets.bottom }]}>
            <Button
              size="lg"
              loading={actionLoading}
              disabled={actionLoading}
              onPress={handleActionSubmit}
              title={modalTab === 'walk_in' ? 'Confirm walk-in' : modalTab === 'external' ? 'Add external booking' : 'Block rooms'}
            />
          </View>
        </KeyboardAvoidingView>
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  monthRow: { paddingHorizontal: space.lg, paddingBottom: space.xs, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: color.border, borderRadius: radii.lg, overflow: 'hidden', borderWidth: 1, borderColor: color.border },
  dayHead: { height: 32, backgroundColor: color.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  cell: { height: 64, borderWidth: StyleSheet.hairlineWidth, borderColor: color.border, paddingVertical: space.xs, alignItems: 'center', justifyContent: 'space-between' },
  tag: { minWidth: 30, paddingHorizontal: space.xs, height: 26, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  legend: { paddingHorizontal: space.lg, paddingVertical: space.lg, flexDirection: 'row', flexWrap: 'wrap', columnGap: space.lg, rowGap: space.sm, justifyContent: 'center' },
  fab: { position: 'absolute', right: space.xl, width: 56, height: 56, borderRadius: 28, backgroundColor: color.primary, alignItems: 'center', justifyContent: 'center', ...elevation.float },
  toastWrap: { position: 'absolute', left: space.lg, right: space.lg, alignItems: 'center' },
  toast: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: color.primaryDeep, paddingHorizontal: space.lg, paddingVertical: space.md, borderRadius: radii.md, ...elevation.float },
  sheet: { backgroundColor: color.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, overflow: 'hidden' },
  sheetHead: { paddingLeft: space.lg, paddingRight: space.sm, paddingVertical: space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  label: { ...type.label, color: color.text },
  input: { height: 48, paddingHorizontal: space.md, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface, justifyContent: 'center' },
  dateInput: { flexDirection: 'row', alignItems: 'center', gap: space.sm, justifyContent: 'flex-start' },
  inputText: { ...type.body },
  stepBtn: { width: 48, height: 48, borderRadius: radii.md, borderWidth: 1, borderColor: color.borderStrong, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' },
  submitWrap: { padding: space.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border, backgroundColor: color.surface },
});

export default PartnerInventory;
