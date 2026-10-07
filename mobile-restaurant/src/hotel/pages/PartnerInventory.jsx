import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import {
  ArrowLeft, Calendar as CalendarIcon, ChevronLeft, ChevronRight,
  BedDouble, Users, Plus, CheckCircle, X, AlertTriangle,
  Globe, Lock,
} from 'lucide-react-native';
import { useNavigate, useParams } from '../../lib/webRouter';
import { BottomSheet, SelectField } from '../../components/kit';
import { Press } from '../../components/ui';
import { poppins, shadow, tw } from '../../theme';
import { propertyService, availabilityService } from '../services/apiService';
import SeasonalRatesPanel from '../components/SeasonalRatesPanel';
import { HT } from '../theme';

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
  { id: 'external', label: 'Ext. Booking', icon: Globe },
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
function DateField({ value, onChange, minimumDate }) {
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
    <Pressable onPress={open} accessibilityRole="button" style={styles.input}>
      <Text style={[styles.inputText, { color: value ? tw.gray900 : tw.gray400 }]}>{value}</Text>
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
    const cellW = (screenW - 32 - 2) / 7;

    const days = [];
    // Empty slots for start match
    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={[styles.cell, { width: cellW, backgroundColor: 'rgba(249,250,251,0.3)' }]} />);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const available = availabilityMap[d];
      const isSoldOut = available === 0;
      const isLow = available > 0 && available <= 2;
      const displayCount = available !== undefined ? available : '-';

      days.push(
        <Pressable
          key={d}
          onPress={() => handleDateClick(d)}
          accessibilityRole="button"
          style={[styles.cell, { width: cellW, backgroundColor: isSoldOut ? tw.red50 : '#fff', justifyContent: 'space-between' }]}
        >
          <Text style={{ fontSize: 14, lineHeight: 20, color: isSoldOut ? tw.red500 : tw.gray700, ...poppins(700) }}>{d}</Text>

          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            {selectedRoom ? (
              isSoldOut ? (
                <View style={[styles.tag, { backgroundColor: tw.red100 }]}>
                  <Text style={[styles.tagText, { color: tw.red600 }]}>SOLD OUT</Text>
                </View>
              ) : (
                <View style={[styles.tag, { backgroundColor: isLow ? tw.orange100 : tw.emerald100 }]}>
                  <Text style={[styles.tagText, { color: isLow ? tw.orange600 : tw.emerald600 }]}>{displayCount} left</Text>
                </View>
              )
            ) : null}
          </View>
        </Pressable>,
      );
    }

    return (
      <View style={styles.grid}>
        {WEEKDAYS.map((day) => (
          <View key={day} style={[styles.dayHead, { width: cellW }]}>
            <Text style={{ fontSize: 10, lineHeight: 15, letterSpacing: 1, textTransform: 'uppercase', color: tw.gray400, ...poppins(700) }}>{day}</Text>
          </View>
        ))}
        {days}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: HT.bg }}>
        <ActivityIndicator size="large" color={tw.emerald600} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: HT.bg }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: 12 + insets.top }]}>
        <Press onPress={() => navigate(-1)} accessibilityLabel="Back" style={styles.backBtn}>
          <ArrowLeft size={20} color={tw.gray700} />
        </Press>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 18, lineHeight: 22.5, color: tw.gray900, ...poppins(700) }}>Inventory Manager</Text>
          <Text style={{ fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(400) }} numberOfLines={1}>{property?.propertyName}</Text>
        </View>
        <View style={styles.headIcon}>
          <CalendarIcon size={20} color={tw.emerald600} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 96 + insets.bottom }} keyboardShouldPersistTaps="handled">
        {/* Room Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16, gap: 8 }}>
          {roomTypes.map((rt) => {
            const active = selectedRoom?._id === rt._id;
            return (
              <Press
                key={rt._id}
                onPress={() => setSelectedRoom(rt)}
                style={[styles.roomPill, active ? styles.roomPillOn : styles.roomPillOff]}
              >
                <BedDouble size={14} color={active ? '#fff' : tw.gray600} />
                <Text style={{ fontSize: 12, lineHeight: 16, color: active ? '#fff' : tw.gray600, ...poppins(700) }}>{rt.name}</Text>
              </Press>
            );
          })}
        </ScrollView>

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
        <View style={{ paddingHorizontal: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 18, lineHeight: 28, color: tw.gray900, ...poppins(700) }}>
            {currentDate.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={() => handleMonthChange(-1)} accessibilityRole="button" accessibilityLabel="Previous month" style={styles.monthBtn}>
              <ChevronLeft size={16} color={tw.gray600} />
            </Pressable>
            <Pressable onPress={() => handleMonthChange(1)} accessibilityRole="button" accessibilityLabel="Next month" style={styles.monthBtn}>
              <ChevronRight size={16} color={tw.gray600} />
            </Pressable>
          </View>
        </View>

        {/* Calendar Grid */}
        <View style={{ paddingHorizontal: 16 }}>{renderCalendar()}</View>

        {/* Legend */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 16, flexDirection: 'row', gap: 16, justifyContent: 'center' }}>
          {[
            ['Available', '#10b981'],
            ['Low Stock', '#f97316'],
            ['Sold Out', '#ef4444'],
          ].map(([label, color]) => (
            <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: color }} />
              <Text style={{ fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(500) }}>{label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* FAB */}
      <Press onPress={handleOpenModal} scale={0.9} accessibilityLabel="Update inventory" style={[styles.fab, { bottom: 24 + insets.bottom }]}>
        <Plus size={28} color="#fff" />
      </Press>

      {/* Toast */}
      {toast ? (
        <View pointerEvents="none" style={[styles.toastWrap, { top: 80 + insets.top }]}>
          <View style={styles.toast}>
            {toast.type === 'success' ? <CheckCircle size={16} color={tw.emerald400} /> : <AlertTriangle size={16} color={tw.red400} />}
            <Text style={{ fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(500) }}>{toast.message}</Text>
          </View>
        </View>
      ) : null}

      {/* Action Bottom Sheet */}
      <BottomSheet
        visible={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        backdrop="rgba(0,0,0,0.6)"
        blur={8}
        panelStyle={[styles.sheet, { height: Math.round(screenH * 0.85) }]}
      >
        <View style={styles.sheetHead}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, lineHeight: 28, color: tw.gray900, ...poppins(700) }}>Update Inventory</Text>
            <Text style={{ fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(400) }}>{selectedRoom?.name}</Text>
          </View>
          <Press onPress={() => setIsModalOpen(false)} accessibilityLabel="Close" style={{ backgroundColor: tw.gray100, padding: 8, borderRadius: 999 }}>
            <X size={18} color={tw.gray700} />
          </Press>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = modalTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => setModalTab(tab.id)}
                accessibilityRole="button"
                style={[styles.tab, active && { backgroundColor: '#fff', ...shadow('sm') }]}
              >
                <Icon size={18} color={active ? '#000' : tw.gray400} />
                <Text style={{ fontSize: 12, lineHeight: 16, color: active ? '#000' : tw.gray400, ...poppins(700) }}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Form */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 80, gap: 20 }} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Check-in</Text>
              <DateField
                value={formData.startDate}
                onChange={(newStart) => {
                  let newEnd = formData.endDate;
                  if (newEnd <= newStart) newEnd = toYmd(addDays(fromYmd(newStart), 1));
                  setFormData({ ...formData, startDate: newStart, endDate: newEnd });
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Check-out</Text>
              <DateField
                value={formData.endDate}
                minimumDate={addDays(fromYmd(formData.startDate), 1)}
                onChange={(v) => setFormData({ ...formData, endDate: v })}
              />
            </View>
          </View>

          <View>
            <Text style={styles.label}>Number of Rooms</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <Pressable
                onPress={() => setFormData({ ...formData, units: Math.max(1, formData.units - 1) })}
                accessibilityRole="button"
                accessibilityLabel="Fewer rooms"
                style={styles.stepBtn}
              >
                <ChevronLeft size={20} color={tw.gray700} />
              </Pressable>
              <Text style={{ fontSize: 20, lineHeight: 28, width: 32, textAlign: 'center', color: tw.gray900, ...poppins(700) }}>{formData.units}</Text>
              <Pressable
                onPress={() => setFormData({ ...formData, units: formData.units + 1 })}
                accessibilityRole="button"
                accessibilityLabel="More rooms"
                style={styles.stepBtn}
              >
                <ChevronRight size={20} color={tw.gray700} />
              </Pressable>
            </View>
            <Text style={{ fontSize: 12, lineHeight: 16, color: tw.gray400, marginTop: 8, ...poppins(400) }}>Maximum {selectedRoom?.totalInventory} units available in total.</Text>
          </View>

          {modalTab === 'external' ? (
            <>
              <View>
                <Text style={styles.label}>Platform Name</Text>
                <SelectField
                  value={formData.platform}
                  options={PLATFORMS}
                  onChange={(v) => setFormData({ ...formData, platform: v })}
                  accessibilityLabel="Platform Name"
                  style={styles.input}
                  textStyle={[styles.inputText, { color: tw.gray900 }]}
                />
              </View>
              <View>
                <Text style={styles.label}>Reference ID</Text>
                <TextInput
                  placeholder="e.g. #AB12345"
                  placeholderTextColor={tw.gray400}
                  value={formData.referenceNo}
                  onChangeText={(t) => setFormData({ ...formData, referenceNo: t })}
                  style={[styles.input, styles.inputText, { color: tw.gray900 }]}
                />
              </View>
            </>
          ) : null}

          {modalTab === 'block' ? (
            <View>
              <Text style={styles.label}>Reason for Blocking</Text>
              <TextInput
                placeholder="e.g. Maintenance, Painting, Personal use..."
                placeholderTextColor={tw.gray400}
                value={formData.notes}
                onChangeText={(t) => setFormData({ ...formData, notes: t })}
                multiline
                textAlignVertical="top"
                style={[styles.input, styles.inputText, { height: 96, padding: 16, color: tw.gray900 }]}
              />
            </View>
          ) : null}
        </ScrollView>

        {/* Submit Button */}
        <View style={[styles.submitWrap, { paddingBottom: 16 + insets.bottom }]}>
          <Press onPress={handleActionSubmit} disabled={actionLoading} scale={0.98} style={[styles.submit, { opacity: actionLoading ? 0.5 : 1 }]}>
            {actionLoading ? <ActivityIndicator size="small" color="#fff" /> : null}
            <Text style={{ fontSize: 16, lineHeight: 24, color: '#fff', ...poppins(700) }}>
              {modalTab === 'walk_in' && 'Confirm Walk-in'}
              {modalTab === 'external' && 'Add External Booking'}
              {modalTab === 'block' && 'Block Rooms'}
            </Text>
          </Press>
        </View>
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  header: { backgroundColor: 'rgba(255,255,255,0.9)', borderBottomWidth: 1, borderBottomColor: tw.gray100, paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: tw.gray50, alignItems: 'center', justifyContent: 'center' },
  headIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: tw.emerald50, alignItems: 'center', justifyContent: 'center' },
  roomPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  roomPillOn: { backgroundColor: tw.gray900, borderColor: tw.gray900, ...shadow('0 10px 15px -3px rgba(16,24,40,0.2)') },
  roomPillOff: { backgroundColor: '#fff', borderColor: tw.gray200 },
  monthBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: tw.gray200, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: tw.gray200, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: tw.gray200, ...shadow('sm') },
  dayHead: { height: 32, backgroundColor: tw.gray100, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: tw.gray200 },
  cell: { height: 96, borderWidth: 0.5, borderColor: tw.gray100, padding: 8 },
  tag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tagText: { fontSize: 10, lineHeight: 15, ...poppins(700) },
  fab: { position: 'absolute', right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', ...shadow('0 20px 25px -5px rgba(0,0,0,0.2)') },
  toastWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(16,24,40,0.9)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, ...shadow('xl') },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' },
  sheetHead: { padding: 16, borderBottomWidth: 1, borderBottomColor: tw.gray100, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tabs: { flexDirection: 'row', padding: 8, gap: 4, backgroundColor: tw.gray50, margin: 16, borderRadius: 12 },
  tab: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 12, paddingHorizontal: 8, borderRadius: 8 },
  label: { fontSize: 12, lineHeight: 16, textTransform: 'uppercase', color: tw.gray500, marginBottom: 6, ...poppins(700) },
  input: { height: 48, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: tw.gray200, backgroundColor: '#fff', justifyContent: 'center' },
  inputText: { fontSize: 14, lineHeight: 20, ...poppins(500) },
  stepBtn: { width: 48, height: 48, borderRadius: 12, borderWidth: 1, borderColor: tw.gray200, alignItems: 'center', justifyContent: 'center' },
  submitWrap: { padding: 16, borderTopWidth: 1, borderTopColor: tw.gray100, backgroundColor: '#fff' },
  submit: { height: 56, backgroundColor: '#000', borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});

export default PartnerInventory;
