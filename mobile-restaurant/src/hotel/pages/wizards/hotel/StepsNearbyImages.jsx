import { ActivityIndicator, Image as RNImage, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { FileText, Image, MapPin, Plus, Trash2 } from 'lucide-react-native';
import { Press } from '../../../../components/ui';
import { poppins, tw } from '../../../../theme';
import { HT } from '../../../theme';
import { ErrorBanner, Label, NEARBY_TYPES, NumInput, SearchStatus, SectionHeading, Select, WInput, useGridCell } from './shared';

/*
 * Steps 4-5 (Nearby Places, Property Images) of
 * Frontend/src/modules/Hotel/app/partner/pages/AddHotelWizard.jsx.
 */

export function StepNearby({
  propertyForm,
  error,
  isEditingSubItem,
  editingNearbyIndex,
  tempNearbyPlace,
  setTempNearbyPlace,
  nearbySearch,
  selectNearbyPlace,
  startAddNearbyPlace,
  startEditNearbyPlace,
  deleteNearbyPlace,
  saveNearbyPlace,
  cancelEditNearbyPlace,
}) {
  return (
    <View style={{ gap: 20 }}>
      <SectionHeading icon={MapPin} title="What's nearby?" description="Stations, airports and landmarks help guests judge the location." />

      <ErrorBanner message={error} />

      {!isEditingSubItem ? (
        <View style={{ gap: 12 }}>
          {propertyForm.nearbyPlaces.map((place, idx) => (
            <View key={idx} style={styles.placeCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                <View style={styles.placeIcon}>
                  <MapPin size={18} color={HT.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.placeName}>{place.name}</Text>
                  <Text style={styles.placeMeta}>
                    {place.type} • <Text style={{ color: HT.primary }}>{place.distanceKm} km</Text>
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                <Press scale={0.9} onPress={() => startEditNearbyPlace(idx)} style={styles.iconBtn} accessibilityLabel="Edit place">
                  <FileText size={18} color={tw.gray400} />
                </Press>
                <Press scale={0.9} onPress={() => deleteNearbyPlace(idx)} style={styles.iconBtn} accessibilityLabel="Delete place">
                  <Trash2 size={18} color={tw.gray400} />
                </Press>
              </View>
            </View>
          ))}

          {propertyForm.nearbyPlaces.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <MapPin size={24} color={tw.gray400} />
              </View>
              <Text style={styles.emptyTitle}>No nearby places added yet</Text>
              <Text style={styles.emptySub}>Add tourist spots, transport hubs, etc.</Text>
            </View>
          ) : null}

          <Press
            scale={0.98}
            onPress={startAddNearbyPlace}
            disabled={propertyForm.nearbyPlaces.length >= 5}
            style={[styles.addBtn, propertyForm.nearbyPlaces.length >= 5 ? { opacity: 0.5 } : null]}
          >
            <Plus size={20} color={HT.primaryStrong} />
            <Text style={styles.addBtnText}>Add Nearby Place</Text>
          </Press>
        </View>
      ) : (
        <View style={styles.editor}>
          <View style={styles.editorHead}>
            <Text style={styles.editorTitle}>{editingNearbyIndex === -1 ? 'Add New Place' : 'Edit Place'}</Text>
            <Press scale={0.95} onPress={cancelEditNearbyPlace} style={{ padding: 4 }}>
              <Text style={styles.closeText}>Close</Text>
            </Press>
          </View>

          <View style={{ padding: 16, gap: 16 }}>
            <View>
              <Label>Search Place</Label>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <WInput
                  style={{ flex: 1, width: undefined }}
                  placeholder="Type to search..."
                  value={nearbySearch.query}
                  onChangeText={nearbySearch.setQuery}
                  returnKeyType="search"
                  onSubmitEditing={nearbySearch.searchNow}
                />
                <Press scale={0.97} onPress={nearbySearch.searchNow} style={styles.searchBtn}>
                  <Text style={styles.searchBtnText}>Search</Text>
                </Press>
              </View>
              <SearchStatus search={nearbySearch} />
              {nearbySearch.results.length > 0 ? (
                <View style={styles.results}>
                  {nearbySearch.results.slice(0, 6).map((p, i, arr) => (
                    <Press key={i} scale={1} onPress={() => selectNearbyPlace(p)} style={[styles.resultRow, i === arr.length - 1 ? { borderBottomWidth: 0 } : null]}>
                      <Text style={styles.resultName}>{p.name}</Text>
                      <Text style={styles.resultAddr} numberOfLines={1}>{p.address || p.formatted_address}</Text>
                    </Press>
                  ))}
                </View>
              ) : null}
            </View>

            <View style={{ gap: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: tw.gray100 }}>
              <View>
                <Label>Name</Label>
                <WInput value={tempNearbyPlace.name} onChangeText={(v) => setTempNearbyPlace({ ...tempNearbyPlace, name: v })} />
              </View>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Label>Type</Label>
                  <Select title="Type" value={tempNearbyPlace.type} options={NEARBY_TYPES} onChange={(v) => setTempNearbyPlace({ ...tempNearbyPlace, type: v })} />
                </View>
                <View style={{ flex: 1 }}>
                  <Label>Distance (km)</Label>
                  <NumInput value={String(tempNearbyPlace.distanceKm ?? '')} onChangeText={(v) => setTempNearbyPlace({ ...tempNearbyPlace, distanceKm: v })} />
                </View>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12, paddingTop: 8 }}>
              <Press scale={0.97} onPress={cancelEditNearbyPlace} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Press>
              <Press scale={0.95} onPress={saveNearbyPlace} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>Save Place</Text>
              </Press>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

export function StepImages({ propertyForm, error, uploading, pickCover, pickGallery, handleRemoveImage }) {
  const cell = useGridCell(3, 4);
  const { width } = useWindowDimensions();
  return (
    <View style={{ gap: 24 }}>
      <SectionHeading icon={Image} title="Show the property" description="A strong cover photo is the single biggest driver of bookings." />

      <ErrorBanner message={error} />

      {/* Cover Image */}
      <View style={{ gap: 8 }}>
        <View style={styles.between}>
          <Text style={[styles.labelPlain]}>Cover Image</Text>
          <Text style={styles.requiredPill}>Required</Text>
        </View>
        <Press scale={1} onPress={pickCover} style={[styles.cover, width >= 640 ? { height: 256 } : null]}>
          {uploading === 'cover' ? (
            <View style={{ alignItems: 'center', gap: 8 }}>
              <ActivityIndicator size="small" color={HT.primary} />
              <Text style={[styles.uploadText, { color: HT.primary }]}>Uploading...</Text>
            </View>
          ) : propertyForm.coverImage ? (
            <View style={{ width: '100%', height: '100%' }}>
              <RNImage source={{ uri: propertyForm.coverImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityLabel="Cover" />
              <View style={styles.coverOverlay}>
                <Press scale={0.95} onPress={pickCover} style={styles.changeBtn}>
                  <Image size={18} color="#fff" />
                  <Text style={styles.changeText}>Change Image</Text>
                </Press>
                <Press scale={0.9} onPress={() => handleRemoveImage(propertyForm.coverImage, 'cover')} style={styles.coverTrash} accessibilityLabel="Remove cover image">
                  <Trash2 size={20} color="#fff" />
                </Press>
              </View>
            </View>
          ) : (
            <View style={{ alignItems: 'center', gap: 8 }}>
              <View style={styles.coverIconWrap}>
                <Image size={24} color={tw.gray400} />
              </View>
              <Text style={[styles.uploadText, { color: tw.gray400 }]}>Upload Cover Photo</Text>
            </View>
          )}
        </Press>
      </View>

      {/* Gallery */}
      <View style={{ gap: 12 }}>
        <View style={styles.between}>
          <Text style={styles.labelPlain}>Gallery</Text>
          <Text style={styles.countText}>{propertyForm.propertyImages.length} / 4 minimum</Text>
        </View>

        <View style={styles.galleryGrid}>
          {propertyForm.propertyImages.map((img, i) => (
            <View key={`${img}-${i}`} style={[styles.tile, { width: cell }]}>
              <RNImage source={{ uri: img }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              <Press scale={0.9} onPress={() => handleRemoveImage(img, 'gallery', i)} style={styles.tileTrash} accessibilityLabel="Remove image">
                <Trash2 size={14} color={tw.red500} />
              </Press>
            </View>
          ))}
          <Press scale={0.97} onPress={pickGallery} disabled={!!uploading} style={[styles.tile, styles.tileAdd, { width: cell }]} accessibilityLabel="Add gallery images">
            {uploading === 'gallery' ? <ActivityIndicator size="small" color={HT.primary} /> : <Plus size={24} color={tw.gray400} />}
          </Press>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  labelPlain: { fontSize: 13, lineHeight: 18, color: '#374151', ...poppins(600) },
  requiredPill: { fontSize: 12, lineHeight: 16, color: HT.primary, backgroundColor: HT.primaryTint, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: 'hidden', ...poppins(500) },
  countText: { fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(400) },
  placeCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderWidth: 1, borderColor: tw.gray200, borderRadius: 12, backgroundColor: '#fff' },
  placeIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: HT.primaryTint, alignItems: 'center', justifyContent: 'center' },
  placeName: { fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(700) },
  placeMeta: { fontSize: 12, lineHeight: 16, color: tw.gray500, letterSpacing: 0.5, textTransform: 'uppercase', ...poppins(500) },
  iconBtn: { padding: 8, borderRadius: 8 },
  empty: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24, borderWidth: 2, borderStyle: 'dashed', borderColor: tw.gray200, borderRadius: 16, backgroundColor: 'rgba(249,250,251,0.5)' },
  emptyIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: tw.gray100, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 16, lineHeight: 24, color: tw.gray500, ...poppins(500) },
  emptySub: { fontSize: 12, lineHeight: 16, marginTop: 4, color: tw.gray400, ...poppins(400) },
  addBtn: { width: '100%', paddingVertical: 16, borderWidth: 1, borderColor: HT.primaryBorder, backgroundColor: HT.primaryTint, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  addBtnText: { fontSize: 16, lineHeight: 24, color: HT.primaryStrong, ...poppins(700) },
  editor: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: HT.primarySoft, overflow: 'hidden' },
  editorHead: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: HT.primaryTint, borderBottomWidth: 1, borderBottomColor: HT.primarySoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  editorTitle: { fontSize: 14, lineHeight: 20, color: HT.primaryStrong, ...poppins(700) },
  closeText: { fontSize: 12, lineHeight: 16, color: HT.primary, ...poppins(700) },
  searchBtn: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: HT.primary, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  searchBtnText: { fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(700) },
  results: { marginTop: 4, backgroundColor: '#fff', borderWidth: 1, borderColor: tw.gray200, borderRadius: 12, overflow: 'hidden' },
  resultRow: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: tw.gray50 },
  resultName: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(600) },
  resultAddr: { fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(400) },
  cancelBtn: { flex: 1, paddingVertical: 12, backgroundColor: tw.gray100, borderRadius: 12, alignItems: 'center' },
  cancelBtnText: { fontSize: 16, lineHeight: 24, color: tw.gray600, ...poppins(600) },
  saveBtn: { flex: 1, paddingVertical: 12, backgroundColor: HT.primary, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { fontSize: 16, lineHeight: 24, color: '#fff', ...poppins(700) },
  cover: { width: '100%', height: 192, borderWidth: 2, borderStyle: 'dashed', borderColor: tw.gray300, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: tw.gray50, overflow: 'hidden' },
  uploadText: { fontSize: 14, lineHeight: 20, ...poppins(600) },
  coverIconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  coverOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  changeBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  changeText: { fontSize: 16, lineHeight: 24, color: '#fff', ...poppins(600) },
  coverTrash: { width: 40, height: 40, borderRadius: 20, backgroundColor: tw.red600, alignItems: 'center', justifyContent: 'center' },
  galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { aspectRatio: 1, borderRadius: 12, borderWidth: 1, borderColor: tw.gray200, overflow: 'hidden' },
  tileTrash: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 999, padding: 4 },
  tileAdd: { borderWidth: 2, borderStyle: 'dashed', borderColor: tw.gray300, backgroundColor: tw.gray50, alignItems: 'center', justifyContent: 'center' },
});
