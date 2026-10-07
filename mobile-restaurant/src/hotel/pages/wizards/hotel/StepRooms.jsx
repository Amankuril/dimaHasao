import { ActivityIndicator, Image as RNImage, StyleSheet, Text, View } from 'react-native';
import { BedDouble, Coffee, Plus, ShowerHead, Snowflake, Trash2, Tv, Wifi } from 'lucide-react-native';
import { Press } from '../../../../components/ui';
import { poppins, tw } from '../../../../theme';
import { HT } from '../../../theme';
import { ErrorBanner, Label, NumInput, SectionHeading, WInput } from './shared';

/*
 * Step 6 (Room Types) of
 * Frontend/src/modules/Hotel/app/partner/pages/AddHotelWizard.jsx.
 */

const ROOM_AMENITIES = [
  { key: 'ac', label: 'AC', icon: Snowflake },
  { key: 'wifi', label: 'WiFi', icon: Wifi },
  { key: 'tv', label: 'TV', icon: Tv },
  { key: 'geyser', label: 'Geyser', icon: ShowerHead },
  { key: 'balcony', label: 'Balcony', icon: BedDouble },
  { key: 'coffee', label: 'Tea/Coffee', icon: Coffee },
];

export function StepRooms({
  roomTypes,
  error,
  editingRoomType,
  setEditingRoomType,
  editingRoomTypeIndex,
  startAddRoomType,
  startEditRoomType,
  deleteRoomType,
  cancelEditRoomType,
  saveRoomType,
  toggleRoomAmenity,
  uploading,
  pickRoomImages,
  handleRemoveImage,
}) {
  const set = (key) => (v) => setEditingRoomType((prev) => ({ ...prev, [key]: v }));
  return (
    <View style={{ gap: 20 }}>
      <SectionHeading icon={BedDouble} title="Rooms and rates" description="Add each room you sell, with its nightly rate and how many you have." />

      <ErrorBanner message={error} />

      {!editingRoomType ? (
        <View style={{ gap: 16 }}>
          {roomTypes.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <BedDouble size={24} color={tw.gray400} />
              </View>
              <Text style={styles.emptyTitle}>No room types added yet</Text>
              <Text style={styles.emptySub}>Add details for atleast one room type.</Text>
            </View>
          ) : (
            <View style={{ gap: 16 }}>
              {roomTypes.map((rt, index) => (
                <View key={rt.id || index} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardName}>{rt.name || `Room Type ${index + 1}`}</Text>
                      <Text style={styles.cardMeta}>
                        Inventory: <Text style={styles.cardMetaStrong}>{rt.totalInventory}</Text> · Capacity:{' '}
                        <Text style={styles.cardMetaStrong}>{rt.maxAdults}A, {rt.maxChildren}C</Text>
                      </Text>
                    </View>
                    <Text style={styles.cardPrice}>₹{rt.pricePerNight}</Text>
                  </View>

                  {rt.amenities && rt.amenities.length > 0 ? (
                    <View style={styles.chips}>
                      {rt.amenities.slice(0, 3).map((a) => (
                        <Text key={a} style={styles.chip}>{a}</Text>
                      ))}
                      {rt.amenities.length > 3 ? <Text style={styles.chipMore}>+{rt.amenities.length - 3} more</Text> : null}
                    </View>
                  ) : null}

                  <View style={styles.cardActions}>
                    <Press scale={0.97} onPress={() => startEditRoomType(index)} style={styles.editBtn}>
                      <Text style={styles.editBtnText}>Edit</Text>
                    </Press>
                    <Press scale={0.95} onPress={() => deleteRoomType(index)} style={styles.delBtn} accessibilityLabel="Delete room type">
                      <Trash2 size={16} color={tw.red600} />
                    </Press>
                  </View>
                </View>
              ))}
            </View>
          )}

          <Press scale={0.98} onPress={startAddRoomType} style={styles.addBtn}>
            <Plus size={20} color={HT.primaryStrong} />
            <Text style={styles.addBtnText}>Add Room Type</Text>
          </Press>
        </View>
      ) : (
        <View style={styles.editor}>
          <View style={styles.editorHead}>
            <Text style={styles.editorTitle}>{editingRoomTypeIndex === -1 || editingRoomTypeIndex == null ? 'Add Room Type' : 'Edit Room Type'}</Text>
            <Press scale={0.95} onPress={cancelEditRoomType} style={{ padding: 4 }}>
              <Text style={styles.closeText}>Close</Text>
            </Press>
          </View>

          <View style={{ padding: 16, gap: 16 }}>
            <View>
              <Label>Name</Label>
              <WInput placeholder="e.g. Deluxe Suite" value={editingRoomType.name} onChangeText={set('name')} />
            </View>

            <View style={styles.pair}>
              <View style={{ flex: 1 }}>
                <Label>Price / Night (₹)</Label>
                <NumInput value={String(editingRoomType.pricePerNight ?? '')} onChangeText={set('pricePerNight')} />
              </View>
              <View style={{ flex: 1 }}>
                <Label>Total Rooms</Label>
                <NumInput value={String(editingRoomType.totalInventory ?? '')} onChangeText={set('totalInventory')} />
              </View>
            </View>

            <View style={styles.pair}>
              <View style={{ flex: 1 }}>
                <Label>Max Adults</Label>
                <NumInput value={String(editingRoomType.maxAdults ?? '')} onChangeText={set('maxAdults')} />
              </View>
              <View style={{ flex: 1 }}>
                <Label>Max Children</Label>
                <NumInput value={String(editingRoomType.maxChildren ?? '')} onChangeText={set('maxChildren')} />
              </View>
            </View>

            <View style={styles.pair}>
              <View style={{ flex: 1 }}>
                <Label>Extra Adult Price (₹)</Label>
                <NumInput value={String(editingRoomType.extraAdultPrice ?? '')} onChangeText={set('extraAdultPrice')} />
              </View>
              <View style={{ flex: 1 }}>
                <Label>Extra Child Price (₹)</Label>
                <NumInput value={String(editingRoomType.extraChildPrice ?? '')} onChangeText={set('extraChildPrice')} />
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.between}>
                <Label>Room Photos</Label>
                <Text style={styles.photoCount}>{(editingRoomType.images || []).filter(Boolean).length} / 3 min</Text>
              </View>
              <View style={styles.photoWrap}>
                {(editingRoomType.images || []).filter(Boolean).map((img, i) => (
                  <View key={`${img}-${i}`} style={styles.photo}>
                    <RNImage source={{ uri: img }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    <Press scale={0.9} onPress={() => handleRemoveImage(img, 'room', i)} style={styles.photoTrash} accessibilityLabel="Remove photo">
                      <Trash2 size={12} color={tw.red500} />
                    </Press>
                  </View>
                ))}
                <Press scale={0.95} onPress={pickRoomImages} disabled={!!uploading} style={[styles.photo, styles.photoAdd]} accessibilityLabel="Add room photos">
                  {uploading === 'room' ? <ActivityIndicator size="small" color={HT.primary} /> : <Plus size={20} color={tw.gray400} />}
                </Press>
              </View>
            </View>

            <View style={styles.section}>
              <Label>Amenities</Label>
              <View style={styles.photoWrap}>
                {ROOM_AMENITIES.map((opt) => {
                  const selected = editingRoomType.amenities.includes(opt.label);
                  const Icon = opt.icon;
                  return (
                    <Press key={opt.key} scale={0.97} onPress={() => toggleRoomAmenity(opt.label)} style={[styles.amen, selected ? styles.amenOn : null]}>
                      <Icon size={14} color={selected ? HT.primaryStrong : tw.gray600} />
                      <Text style={[styles.amenText, selected ? { color: HT.primaryStrong } : null]}>{opt.label}</Text>
                    </Press>
                  );
                })}
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12, paddingTop: 16 }}>
              <Press scale={0.97} onPress={cancelEditRoomType} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Press>
              <Press scale={0.95} onPress={saveRoomType} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>Save Room</Text>
              </Press>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pair: { flexDirection: 'row', gap: 12 },
  section: { gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: tw.gray100 },
  empty: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24, borderWidth: 2, borderStyle: 'dashed', borderColor: tw.gray200, borderRadius: 16, backgroundColor: 'rgba(249,250,251,0.5)' },
  emptyIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: tw.gray100, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 16, lineHeight: 24, color: tw.gray500, ...poppins(500) },
  emptySub: { fontSize: 12, lineHeight: 16, marginTop: 4, color: tw.gray400, ...poppins(400) },
  card: { padding: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: tw.gray200, borderRadius: 16 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 },
  cardName: { fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(700) },
  cardMeta: { fontSize: 12, lineHeight: 16, marginTop: 2, color: tw.gray500, ...poppins(500) },
  cardMetaStrong: { color: tw.gray900 },
  cardPrice: { fontSize: 18, lineHeight: 28, color: HT.primary, ...poppins(700) },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 12 },
  chip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: tw.gray100, borderWidth: 1, borderColor: tw.gray200, fontSize: 10, lineHeight: 15, color: tw.gray600, overflow: 'hidden', ...poppins(500) },
  chipMore: { paddingHorizontal: 8, paddingVertical: 2, fontSize: 10, lineHeight: 15, color: tw.gray400, ...poppins(400) },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: tw.gray100 },
  editBtn: { flex: 1, paddingVertical: 8, backgroundColor: HT.primaryTint, borderRadius: 8, alignItems: 'center' },
  editBtnText: { fontSize: 12, lineHeight: 16, color: HT.primaryStrong, ...poppins(700) },
  delBtn: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: tw.red50, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  addBtn: { width: '100%', paddingVertical: 16, borderWidth: 1, borderColor: HT.primaryBorder, backgroundColor: HT.primaryTint, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  addBtnText: { fontSize: 16, lineHeight: 24, color: HT.primaryStrong, ...poppins(700) },
  editor: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: HT.primarySoft, overflow: 'hidden' },
  editorHead: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: HT.primaryTint, borderBottomWidth: 1, borderBottomColor: HT.primarySoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  editorTitle: { fontSize: 14, lineHeight: 20, color: HT.primaryStrong, ...poppins(700) },
  closeText: { fontSize: 12, lineHeight: 16, color: HT.primary, ...poppins(700) },
  photoCount: { fontSize: 10, lineHeight: 15, color: tw.gray400, ...poppins(400) },
  photoWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photo: { width: 64, height: 64, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: tw.gray200 },
  photoTrash: { position: 'absolute', top: 2, right: 2, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 999, padding: 2 },
  photoAdd: { borderWidth: 2, borderStyle: 'dashed', borderColor: tw.gray300, alignItems: 'center', justifyContent: 'center' },
  amen: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: tw.gray200, backgroundColor: '#fff' },
  amenOn: { backgroundColor: HT.primaryTint, borderColor: HT.primaryBorder },
  amenText: { fontSize: 12, lineHeight: 16, color: tw.gray600, ...poppins(500) },
  cancelBtn: { flex: 1, paddingVertical: 12, backgroundColor: tw.gray100, borderRadius: 12, alignItems: 'center' },
  cancelBtnText: { fontSize: 16, lineHeight: 24, color: tw.gray600, ...poppins(600) },
  saveBtn: { flex: 1, paddingVertical: 12, backgroundColor: HT.primary, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { fontSize: 16, lineHeight: 24, color: '#fff', ...poppins(700) },
});
