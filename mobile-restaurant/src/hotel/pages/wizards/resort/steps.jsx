import { useEffect } from 'react';
import { ActivityIndicator, Animated, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { BedDouble, Camera, CheckCircle, FileText, Image as ImageIcon, MapPin, Plus, Search, Trash2 } from 'lucide-react-native';
import { Press } from '../../../../components/ui';
import { useAnimatedValue } from '../../../../lib/useAnimatedValue';
import { poppins, tw } from '../../../../theme';
import { HT } from '../../../theme';
import {
  HOUSE_RULES_OPTIONS, NEARBY_TYPES, RESORT_ACTIVITIES, RESORT_AMENITIES, RESORT_TYPES, ROOM_AMENITIES_OPTIONS,
} from './constants';
import {
  ErrorBanner, Field, FieldBlock, Label, PrimaryButton, ResultsBox, ReviewError, SearchStatus, SecondaryButton, SelectField, useIsSm,
} from './parts';

/* Step bodies of Frontend/src/modules/Hotel/app/partner/pages/AddResortWizard.jsx (steps 1-9 and the success screen). */

const toggleIn = (list, item) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

function Chip({ label, selected, onPress, style, textStyle, selectedStyle }) {
  return (
    <Press onPress={onPress} scale={0.98} style={[styles.chip, selected ? [styles.chipOn, selectedStyle] : styles.chipOff, style]}>
      <Text style={[styles.chipText, { color: selected ? '#fff' : tw.gray600 }, textStyle]}>{label}</Text>
    </Press>
  );
}

function EmptyBox({ icon, title, hint }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>{icon}</View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyHint}>{hint}</Text>
    </View>
  );
}

function CardHeader({ title, onClose }) {
  return (
    <View style={styles.subHeader}>
      <Text style={styles.subTitle}>{title}</Text>
      <Pressable onPress={onClose} hitSlop={8}>
        <Text style={styles.closeText}>Close</Text>
      </Pressable>
    </View>
  );
}

export function StepBasic({ w }) {
  const { propertyForm: f, updatePropertyForm: set } = w;
  return (
    <View style={{ gap: 24 }}>
      <ErrorBanner message={w.error} />
      <View style={{ gap: 16 }}>
        <FieldBlock label="Resort Name">
          <Field placeholder="e.g. Blue Lagoon Resort" value={f.propertyName} onChangeText={(v) => set('propertyName', v)} />
        </FieldBlock>

        <View style={{ gap: 8 }}>
          <Label>Resort Type</Label>
          <View style={styles.grid2}>
            {RESORT_TYPES.map((type) => {
              const on = f.resortType === type.value;
              const Icon = type.icon;
              return (
                <Press key={type.value} onPress={() => set('resortType', type.value)} scale={0.98} style={[styles.typeCard, on ? styles.typeCardOn : styles.typeCardOff]}>
                  <View style={[styles.typeIcon, { backgroundColor: on ? '#fff' : tw.gray100 }]}>
                    <Icon size={20} color={on ? HT.primary : tw.gray500} />
                  </View>
                  <Text style={[styles.typeLabel, { color: on ? HT.primaryStrong : tw.gray600 }]}>{type.label}</Text>
                </Press>
              );
            })}
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <Label>Activities</Label>
          <View style={styles.wrap}>
            {RESORT_ACTIVITIES.map((act) => (
              <Chip key={act} label={act} selected={f.activities.includes(act)} selectedStyle={styles.chipLgOn} onPress={() => set('activities', toggleIn(f.activities, act))} style={styles.chipLg} />
            ))}
          </View>
        </View>

        <FieldBlock label="Short Description">
          <Field multiline placeholder="Brief summary for listings..." value={f.shortDescription} onChangeText={(v) => set('shortDescription', v)} />
        </FieldBlock>

        <FieldBlock label="Detailed Description">
          <Field multiline minHeight={100} placeholder="Tell guests what makes your resort unique..." value={f.description} onChangeText={(v) => set('description', v)} />
        </FieldBlock>

        <FieldBlock label="Contact Number (For Guest Inquiries)">
          <Field placeholder="e.g. +91 9876543210" value={f.contactNumber} onChangeText={(v) => set('contactNumber', v)} />
        </FieldBlock>
      </View>
    </View>
  );
}

export function StepLocation({ w }) {
  const { propertyForm: f, updatePropertyForm: set, locationSearch: ls } = w;
  return (
    <View style={{ gap: 16 }}>
      <ErrorBanner message={w.error} />
      <View style={{ gap: 8 }}>
        <Label>Search Address</Label>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Field placeholder="Search location..." value={ls.query} onChangeText={ls.setQuery} />
          </View>
          <Press onPress={ls.searchNow} style={styles.searchBtn}>
            <Text style={styles.searchBtnText}>Search</Text>
          </Press>
        </View>
        <SearchStatus search={ls} />
        {ls.results.length > 0 && (
          <ResultsBox>
            {ls.results.map((p, i) => (
              <Pressable key={i} onPress={() => w.selectLocationResult(p)} style={styles.resultRow}>
                <Text style={styles.resultName}>{p.name}</Text>
                <Text style={styles.resultAddr}>{p.formatted_address}</Text>
              </Pressable>
            ))}
          </ResultsBox>
        )}
      </View>

      <View style={styles.dividerWrap}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OR ENTER MANUALLY</Text>
      </View>

      <View style={{ gap: 12 }}>
        <Field placeholder="Full Address" value={f.address.fullAddress} onChangeText={(v) => set(['address', 'fullAddress'], v)} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}><Field placeholder="City" value={f.address.city} onChangeText={(v) => set(['address', 'city'], v)} /></View>
          <View style={{ flex: 1 }}><Field placeholder="State" value={f.address.state} onChangeText={(v) => set(['address', 'state'], v)} /></View>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}><Field placeholder="Pincode" value={f.address.pincode} onChangeText={(v) => set(['address', 'pincode'], v)} /></View>
          <View style={{ flex: 1 }} />
        </View>
      </View>

      <Press onPress={w.fetchCurrentLocation} disabled={w.loadingLocation} scale={0.98} style={[styles.locBtn, w.loadingLocation && { opacity: 0.5 }]}>
        {w.loadingLocation ? (
          <>
            <ActivityIndicator size="small" color={HT.primary} />
            <Text style={styles.locBtnText}>Fetching Location...</Text>
          </>
        ) : (
          <>
            <MapPin size={18} color={HT.primary} />
            <Text style={styles.locBtnText}>Use Current Location</Text>
          </>
        )}
      </Press>
    </View>
  );
}

export function StepAmenities({ w }) {
  const { propertyForm: f, updatePropertyForm: set } = w;
  const isSm = useIsSm();
  return (
    <View style={{ gap: 16 }}>
      <ErrorBanner message={w.error} />
      <View style={styles.grid2}>
        {RESORT_AMENITIES.map((am) => {
          const on = f.amenities.includes(am);
          return (
            <Press key={am} onPress={() => set('amenities', toggleIn(f.amenities, am))} scale={0.98} style={[styles.amenity, isSm && { width: '31%' }, on ? styles.amenityOn : styles.amenityOff]}>
              <Text style={[styles.amenityText, { color: on ? '#fff' : tw.gray600 }]}>{am}</Text>
              {on && (
                <View style={{ position: 'absolute', top: 8, right: 8 }}>
                  <CheckCircle size={14} color="rgba(255,255,255,0.8)" />
                </View>
              )}
            </Press>
          );
        })}
      </View>
    </View>
  );
}

export function StepNearby({ w }) {
  const { propertyForm: f, nearbySearch: ns, tempNearbyPlace: temp, setTempNearbyPlace: setTemp } = w;
  const editing = w.editingNearbyIndex !== null;
  return (
    <View style={{ gap: 16 }}>
      <ErrorBanner message={w.error} />

      {!editing && (
        <View style={{ gap: 12 }}>
          {f.nearbyPlaces.map((place, idx) => (
            <View key={idx} style={styles.placeRow}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={styles.placeIcon}>
                  <MapPin size={18} color={HT.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.placeName}>{place.name}</Text>
                  <Text style={styles.placeMeta}>
                    {String(place.type).toUpperCase()} • <Text style={{ color: HT.primary }}>{place.distanceKm} km</Text>
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                <Pressable onPress={() => w.startEditNearbyPlace(idx)} style={styles.iconBtn} accessibilityLabel="Edit place">
                  <FileText size={18} color={tw.gray400} />
                </Pressable>
                <Pressable onPress={() => w.deleteNearbyPlace(idx)} style={styles.iconBtn} accessibilityLabel="Delete place">
                  <Trash2 size={18} color={tw.gray400} />
                </Pressable>
              </View>
            </View>
          ))}

          {f.nearbyPlaces.length === 0 && (
            <EmptyBox icon={<MapPin size={24} color={tw.gray400} />} title="No nearby places added yet" hint="Add tourist spots, transport hubs, etc." />
          )}

          <Press onPress={w.startAddNearbyPlace} disabled={f.nearbyPlaces.length >= 5} scale={0.98} style={[styles.addBtn, f.nearbyPlaces.length >= 5 && { opacity: 0.5 }]}>
            <Plus size={20} color={HT.primaryStrong} />
            <Text style={styles.addBtnText}>Add Nearby Place</Text>
          </Press>
        </View>
      )}

      {editing && (
        <View style={styles.subCard}>
          <CardHeader title={w.editingNearbyIndex === -1 ? 'Add New Place' : 'Edit Place'} onClose={w.cancelEditNearbyPlace} />
          <View style={{ padding: 16, gap: 16 }}>
            <View>
              <Label>Search Place</Label>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Field placeholder="Type to search..." value={ns.query} onChangeText={ns.setQuery} />
                </View>
                <Press onPress={ns.searchNow} style={[styles.searchBtn, { backgroundColor: tw.gray900 }]}>
                  <Text style={[styles.searchBtnText, poppins(600)]}>Search</Text>
                </Press>
              </View>
              <SearchStatus search={ns} />
              {ns.results.length > 0 && (
                <ResultsBox>
                  {ns.results.slice(0, 6).map((p, i) => (
                    <Pressable key={i} onPress={() => w.selectNearbyPlace(p)} style={styles.resultRow}>
                      <Text style={[styles.resultName, poppins(600)]}>{p.name}</Text>
                      <Text style={styles.resultAddr} numberOfLines={1}>{p.address || p.formatted_address}</Text>
                    </Pressable>
                  ))}
                </ResultsBox>
              )}
            </View>

            <View style={styles.topRule}>
              <FieldBlock label="Name">
                <Field value={temp.name} onChangeText={(v) => setTemp({ ...temp, name: v })} />
              </FieldBlock>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <FieldBlock label="Type" style={{ flex: 1 }}>
                  <SelectField value={temp.type} options={NEARBY_TYPES} onChange={(v) => setTemp({ ...temp, type: v })} />
                </FieldBlock>
                <FieldBlock label="Distance (km)" style={{ flex: 1 }}>
                  <Field numeric value={temp.distanceKm} onChangeText={(v) => setTemp({ ...temp, distanceKm: v })} />
                </FieldBlock>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12, paddingTop: 8 }}>
              <SecondaryButton title="Cancel" onPress={w.cancelEditNearbyPlace} />
              <PrimaryButton title="Save Place" onPress={w.saveNearbyPlace} />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

export function StepImages({ w }) {
  const { propertyForm: f, uploading } = w;
  const isSm = useIsSm();
  return (
    <View style={{ gap: 16 }}>
      <ErrorBanner message={w.error} />
      <View style={{ gap: 8 }}>
        <Text style={styles.sectionLabel}>Cover Image</Text>
        <Pressable onPress={() => !uploading && w.uploadCover()} style={[styles.cover, isSm && { height: 256 }]}>
          {f.coverImage ? (
            <Image source={{ uri: f.coverImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <View style={{ alignItems: 'center' }}>
              <ImageIcon size={40} color={tw.gray400} style={{ opacity: 0.5, marginBottom: 8 }} />
              <Text style={styles.coverText}>Take/Upload Cover Photo</Text>
            </View>
          )}
          {uploading === 'cover' && (
            <View style={styles.uploadOverlay}>
              <ActivityIndicator size="large" color={HT.primary} />
              <Text style={styles.uploadText}>Uploading...</Text>
            </View>
          )}
          {f.coverImage ? (
            <Pressable onPress={() => w.handleRemoveImage(f.coverImage, 'cover')} style={styles.coverRemove} accessibilityLabel="Remove cover image">
              <Trash2 size={16} color="#fff" />
            </Pressable>
          ) : null}
        </Pressable>
      </View>

      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.sectionLabel}>Property Gallery</Text>
          <Text style={styles.countText}>{f.propertyImages.length} images</Text>
        </View>
        <View style={styles.galleryGrid}>
          {f.propertyImages.map((img, i) => (
            <View key={i} style={[styles.thumb, isSm && styles.thumbSm]}>
              <Image source={{ uri: img }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              <Pressable onPress={() => w.handleRemoveImage(img, 'gallery', i)} style={styles.thumbRemove} accessibilityLabel="Remove image">
                <Trash2 size={14} color={tw.red500} />
              </Pressable>
            </View>
          ))}
          <Pressable onPress={w.uploadGallery} disabled={!!uploading} style={[styles.thumb, isSm && styles.thumbSm, styles.thumbAdd]}>
            {uploading === 'gallery' ? <ActivityIndicator size="small" color={HT.primary} /> : <Camera size={24} color={tw.gray400} />}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export function StepRooms({ w }) {
  const { roomTypes, editingRoomType: rt, uploading } = w;
  return (
    <View style={{ gap: 16 }}>
      <ErrorBanner message={w.error} />

      {!rt && (
        <View style={{ gap: 16 }}>
          {roomTypes.length === 0 ? (
            <EmptyBox icon={<BedDouble size={24} color={tw.gray400} />} title="No cottages or rooms added yet" hint="Add details for atleast one category." />
          ) : (
            <View style={{ gap: 16 }}>
              {roomTypes.map((r, index) => (
                <View key={r.id || index} style={styles.roomCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.roomName}>{r.name}</Text>
                      <Text style={styles.roomMeta}>
                        Inventory: <Text style={styles.roomMetaStrong}>{r.totalInventory}</Text> · Capacity:{' '}
                        <Text style={styles.roomMetaStrong}>{r.maxAdults}A, {r.maxChildren}C</Text>
                      </Text>
                    </View>
                    <Text style={styles.roomPrice}>₹{r.pricePerNight}</Text>
                  </View>

                  {r.amenities && r.amenities.length > 0 && (
                    <View style={[styles.wrap, { gap: 4, marginBottom: 12 }]}>
                      {r.amenities.slice(0, 3).map((a) => (
                        <View key={a} style={styles.tag}><Text style={styles.tagText}>{a}</Text></View>
                      ))}
                      {r.amenities.length > 3 && <Text style={[styles.tagText, { color: tw.gray400, paddingHorizontal: 8 }]}>+{r.amenities.length - 3} more</Text>}
                    </View>
                  )}

                  <View style={styles.roomActions}>
                    <Press onPress={() => w.startEditRoomType(index)} scale={0.98} style={styles.editBtn}>
                      <Text style={styles.editBtnText}>Edit</Text>
                    </Press>
                    <Press onPress={() => w.deleteRoomType(index)} scale={0.98} style={styles.delBtn} accessibilityLabel="Delete room">
                      <Trash2 size={16} color={tw.red600} />
                    </Press>
                  </View>
                </View>
              ))}
            </View>
          )}

          <Press onPress={w.startAddRoomType} scale={0.98} style={styles.addBtn}>
            <Plus size={20} color={HT.primaryStrong} />
            <Text style={styles.addBtnText}>Add Cottage / Room</Text>
          </Press>
        </View>
      )}

      {rt && (
        <View style={styles.subCard}>
          <CardHeader title={w.editingRoomTypeIndex === -1 || w.editingRoomTypeIndex == null ? 'Add Cottage/Room' : 'Edit Cottage/Room'} onClose={w.cancelEditRoomType} />
          <View style={{ padding: 16, gap: 16 }}>
            <FieldBlock label="Name">
              <Field placeholder="e.g. Deluxe Beach Cottage" value={rt.name} onChangeText={(v) => w.setEditingRoomType({ ...rt, name: v })} />
            </FieldBlock>

            <PairRow>
              <FieldBlock label="Price / Night (₹)" style={{ flex: 1 }}>
                <Field numeric value={rt.pricePerNight} onChangeText={(v) => w.setEditingRoomType({ ...rt, pricePerNight: v })} />
              </FieldBlock>
              <FieldBlock label="Total Units" style={{ flex: 1 }}>
                <Field numeric value={rt.totalInventory} onChangeText={(v) => w.setEditingRoomType({ ...rt, totalInventory: v })} />
              </FieldBlock>
            </PairRow>

            <PairRow>
              <FieldBlock label="Max Adults" style={{ flex: 1 }}>
                <Field numeric value={rt.maxAdults} onChangeText={(v) => w.setEditingRoomType({ ...rt, maxAdults: v })} />
              </FieldBlock>
              <FieldBlock label="Max Children" style={{ flex: 1 }}>
                <Field numeric value={rt.maxChildren} onChangeText={(v) => w.setEditingRoomType({ ...rt, maxChildren: v })} />
              </FieldBlock>
            </PairRow>

            <PairRow>
              <FieldBlock label="Extra Adult Price (₹)" style={{ flex: 1 }}>
                <Field numeric value={rt.extraAdultPrice} onChangeText={(v) => w.setEditingRoomType({ ...rt, extraAdultPrice: v })} />
              </FieldBlock>
              <FieldBlock label="Extra Child Price (₹)" style={{ flex: 1 }}>
                <Field numeric value={rt.extraChildPrice} onChangeText={(v) => w.setEditingRoomType({ ...rt, extraChildPrice: v })} />
              </FieldBlock>
            </PairRow>

            <View style={[styles.topRule, { gap: 8 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Label style={{ marginBottom: 0 }}>Photos</Label>
                <Text style={[styles.countText, { fontSize: 10 }]}>{(rt.images || []).filter(Boolean).length} / 3 min</Text>
              </View>
              <View style={styles.wrap}>
                {(rt.images || []).filter(Boolean).map((img, i) => (
                  <View key={i} style={styles.roomThumb}>
                    <Image source={{ uri: img }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                    <Pressable onPress={() => w.handleRemoveImage(img, 'room', i)} style={styles.roomThumbRemove} accessibilityLabel="Remove photo">
                      <Trash2 size={12} color={tw.red500} />
                    </Pressable>
                  </View>
                ))}
                <Pressable onPress={w.uploadRoomImages} disabled={!!uploading} style={[styles.roomThumb, styles.thumbAdd, { borderRadius: 8 }]}>
                  {uploading === 'room' ? <ActivityIndicator size="small" color={HT.primary} /> : <Plus size={20} color={tw.gray400} />}
                </Pressable>
              </View>
            </View>

            <View style={[styles.topRule, { gap: 8 }]}>
              <Label style={{ marginBottom: 0 }}>Amenities</Label>
              <View style={styles.wrap}>
                {ROOM_AMENITIES_OPTIONS.map((opt) => {
                  const selected = rt.amenities.includes(opt.label);
                  const Icon = opt.icon;
                  return (
                    <Press key={opt.key} onPress={() => w.toggleRoomAmenity(opt.label)} scale={0.98} style={[styles.roomAm, selected ? styles.roomAmOn : styles.roomAmOff]}>
                      <Icon size={14} color={selected ? HT.primaryStrong : tw.gray600} />
                      <Text style={[styles.roomAmText, { color: selected ? HT.primaryStrong : tw.gray600 }]}>{opt.label}</Text>
                    </Press>
                  );
                })}
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12, paddingTop: 16 }}>
              <SecondaryButton title="Cancel" onPress={w.cancelEditRoomType} />
              <PrimaryButton title="Save" onPress={w.saveRoomType} />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

function PairRow({ children }) {
  return <View style={{ flexDirection: 'row', gap: 12 }}>{children}</View>;
}

export function StepRules({ w }) {
  const { propertyForm: f, updatePropertyForm: set } = w;
  return (
    <View style={{ gap: 24 }}>
      <ErrorBanner message={w.error} />
      <View style={{ gap: 16 }}>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <FieldBlock label="Check-in Time" style={{ flex: 1 }}>
            <View>
              <Field leftPad={36} placeholder="3:00 PM" value={f.checkInTime} onChangeText={(v) => set('checkInTime', v)} />
              <Text style={styles.clock}>🕒</Text>
            </View>
          </FieldBlock>
          <FieldBlock label="Check-out Time" style={{ flex: 1 }}>
            <View>
              <Field leftPad={36} placeholder="11:00 AM" value={f.checkOutTime} onChangeText={(v) => set('checkOutTime', v)} />
              <Text style={styles.clock}>🕒</Text>
            </View>
          </FieldBlock>
        </View>

        <FieldBlock label="Cancellation Policy">
          <Field multiline minHeight={100} placeholder="e.g., Free cancellation before 10 days..." value={f.cancellationPolicy} onChangeText={(v) => set('cancellationPolicy', v)} />
        </FieldBlock>

        <View style={[styles.topRule, { gap: 8 }]}>
          <Label style={{ marginBottom: 0 }}>Resort Rules</Label>
          <View style={styles.wrap}>
            {HOUSE_RULES_OPTIONS.map((r) => (
              <Chip key={r} label={r} selected={f.houseRules.includes(r)} onPress={() => set('houseRules', toggleIn(f.houseRules, r))} style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }} textStyle={poppins(500)} />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

export function StepDocuments({ w }) {
  const { propertyForm: f, uploading } = w;
  return (
    <View style={{ gap: 24 }}>
      <ErrorBanner message={w.error} />
      <View style={{ gap: 16 }}>
        <Text style={styles.docIntro}>Please provide the following documents</Text>
        <View style={{ gap: 12 }}>
          {f.documents.map((doc, idx) => (
            <View key={idx} style={styles.docCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <View>
                  <Text style={styles.docName}>{doc.name}</Text>
                  <Text style={styles.docOpt}>Optional document</Text>
                </View>
                {doc.fileUrl ? (
                  <View style={[styles.docBadge, { backgroundColor: tw.emerald50 }]}><CheckCircle size={18} color={tw.emerald700} /></View>
                ) : (
                  <View style={[styles.docBadge, { backgroundColor: tw.gray100 }]}><FileText size={18} color={tw.gray400} /></View>
                )}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Press onPress={() => w.uploadDocument(idx)} scale={0.98} style={[styles.docBtn, doc.fileUrl ? styles.docBtnOn : styles.docBtnOff]}>
                  {uploading === `doc_${idx}` ? (
                    <>
                      <ActivityIndicator size="small" color={HT.primary} />
                      <Text style={[styles.docBtnText, { color: tw.gray600 }]}>Uploading...</Text>
                    </>
                  ) : doc.fileUrl ? (
                    <Text style={[styles.docBtnText, { color: HT.primaryStrong }]}>Change File</Text>
                  ) : (
                    <>
                      <Plus size={16} color={tw.gray600} />
                      <Text style={[styles.docBtnText, { color: tw.gray600 }]}>Upload</Text>
                    </>
                  )}
                </Press>
                {doc.fileUrl ? (
                  <Pressable onPress={() => Linking.openURL(doc.fileUrl).catch(() => {})} style={styles.docView} accessibilityLabel="View document">
                    <Search size={18} color={tw.gray500} />
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

export function StepReview({ w }) {
  const { propertyForm: f, roomTypes } = w;
  return (
    <View style={{ gap: 24 }}>
      <View style={styles.compliance}>
        <View style={styles.complianceIcon}><CheckCircle size={20} color={tw.emerald700} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.complianceTitle}>Review Compliance</Text>
          <Text style={styles.complianceBody}>Please review the details below carefully before submitting.</Text>
        </View>
      </View>

      <ReviewError message={w.error} />

      <View style={{ gap: 16 }}>
        <View style={styles.reviewCard}>
          <Text style={styles.reviewTitle}>Property Details</Text>
          <View style={{ gap: 4 }}>
            <Text style={styles.reviewName}>{f.propertyName || 'No Name'}</Text>
            <Text style={styles.reviewType}>{f.resortType} Resort</Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 4 }}>
              <MapPin size={14} color={tw.gray600} style={{ marginTop: 3 }} />
              <Text style={styles.reviewAddr}>{f.address.fullAddress || 'No Address'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.reviewCard}>
          <Text style={styles.reviewTitle}>Cottages &amp; Rooms ({roomTypes.length})</Text>
          {roomTypes.length > 0 ? (
            <View style={{ gap: 8 }}>
              {roomTypes.map((rt, i) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.reviewRoom}>{rt.name}</Text>
                  <Text style={styles.reviewRoomPrice}>₹{rt.pricePerNight}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noRooms}>No room types added!</Text>
          )}
        </View>

        <View style={styles.reviewCard}>
          <Text style={styles.reviewTitle}>Documents ({f.documents.filter((d) => d.fileUrl).length}/{f.documents.length})</Text>
          <View style={{ gap: 8 }}>
            {f.documents.map((doc, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {doc.fileUrl ? <CheckCircle size={14} color={tw.emerald500} /> : <View style={styles.docDot} />}
                  <Text style={[styles.reviewDoc, { color: doc.fileUrl ? tw.gray700 : tw.gray500 }]}>{doc.name}</Text>
                </View>
                <Text style={styles.reviewDocState}>{doc.fileUrl ? 'Attached' : 'Optional'}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

export function StepDone({ w }) {
  const bounce = useAnimatedValue(0);
  useEffect(() => {
    // tailwind animate-bounce: translateY 0 -> -25% -> 0, 1s loop
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: -20, duration: 500, useNativeDriver: true }),
        Animated.timing(bounce, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bounce]);
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 24 }}>
      <Animated.View style={[styles.doneIcon, { transform: [{ translateY: bounce }] }]}><CheckCircle size={48} color={tw.emerald600} /></Animated.View>
      <View style={{ gap: 8, alignItems: 'center' }}>
        <Text style={styles.doneTitle}>Registration Submitted!</Text>
        <Text style={styles.doneBody}>Your resort registration has been sent for verification. Our team will review it and get back to you shortly.</Text>
      </View>
      <Press onPress={() => w.navigate('/hotel/partner/properties')} style={styles.doneBtn}>
        <Text style={styles.doneBtnText}>Go to My Properties</Text>
      </Press>
    </View>
  );
}

const BORDER = tw.gray200;

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  chipLg: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  chipOn: { backgroundColor: HT.primary, borderColor: HT.primary },
  chipLgOn: { boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', transform: [{ scale: 1.02 }] },
  chipOff: { backgroundColor: '#fff', borderColor: BORDER },
  chipText: { fontSize: 12, lineHeight: 16, ...poppins(700) },
  typeCard: { width: '48%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  typeCardOn: { borderColor: HT.primary, backgroundColor: HT.primaryTint, boxShadow: `0 0 0 1px ${HT.primary}` },
  typeCardOff: { borderColor: BORDER, backgroundColor: '#fff' },
  typeIcon: { padding: 8, borderRadius: 8 },
  typeLabel: { flex: 1, fontSize: 14, ...poppins(700) },
  searchBtn: { paddingHorizontal: 16, justifyContent: 'center', backgroundColor: HT.primary, borderRadius: 12 },
  searchBtnText: { fontSize: 14, color: '#fff', ...poppins(700) },
  resultRow: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: tw.gray50 },
  resultName: { fontSize: 14, color: tw.gray900, ...poppins(500) },
  resultAddr: { fontSize: 12, color: tw.gray500, ...poppins(400) },
  dividerWrap: { height: 28, justifyContent: 'center', alignItems: 'center' },
  dividerLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: BORDER },
  dividerText: { paddingHorizontal: 8, backgroundColor: '#fff', fontSize: 12, color: tw.gray400, ...poppins(500) },
  locBtn: { width: '100%', paddingVertical: 16, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: HT.primary, backgroundColor: HT.primaryTint, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  locBtnText: { fontSize: 16, color: HT.primary, ...poppins(700) },
  amenity: { width: '48%', flexGrow: 1, padding: 16, borderRadius: 16, borderWidth: 1 },
  amenityOn: { backgroundColor: HT.primary, borderColor: HT.primary, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', transform: [{ scale: 1.02 }] },
  amenityOff: { backgroundColor: '#fff', borderColor: BORDER },
  amenityText: { fontSize: 14, ...poppins(600) },
  placeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: 16, borderWidth: 1, borderColor: BORDER, borderRadius: 12, backgroundColor: '#fff' },
  placeIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: HT.primaryTint, alignItems: 'center', justifyContent: 'center' },
  placeName: { fontSize: 15, color: tw.gray900, ...poppins(700) },
  placeMeta: { fontSize: 12, color: tw.gray500, letterSpacing: 0.4, ...poppins(500) },
  iconBtn: { padding: 8, borderRadius: 8 },
  addBtn: { width: '100%', paddingVertical: 16, borderWidth: 1, borderColor: HT.primaryBorder, backgroundColor: HT.primaryTint, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  addBtnText: { fontSize: 16, color: HT.primaryStrong, ...poppins(700) },
  empty: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24, borderWidth: 2, borderStyle: 'dashed', borderColor: BORDER, borderRadius: 16, backgroundColor: 'rgba(249,250,251,0.5)' },
  emptyIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: tw.gray100, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 15, color: tw.gray500, ...poppins(500) },
  emptyHint: { fontSize: 12, color: tw.gray400, marginTop: 4, ...poppins(400) },
  subCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: HT.primaryBorder, overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' },
  subHeader: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: HT.primaryTint, borderBottomWidth: 1, borderBottomColor: HT.primaryBorder, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  subTitle: { fontSize: 14, color: HT.primaryStrong, ...poppins(700) },
  closeText: { fontSize: 12, color: HT.primary, ...poppins(700) },
  topRule: { gap: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: tw.gray100 },
  sectionLabel: { fontSize: 14, color: tw.gray900, ...poppins(700) },
  countText: { fontSize: 12, color: tw.gray500, ...poppins(400) },
  cover: { width: '100%', height: 192, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', borderColor: tw.gray300, backgroundColor: tw.gray50, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  coverText: { fontSize: 12, color: tw.gray400, ...poppins(700) },
  uploadOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center', gap: 8 },
  uploadText: { fontSize: 14, color: HT.primaryStrong, ...poppins(700) },
  coverRemove: { position: 'absolute', top: 8, right: 8, backgroundColor: tw.red600, borderRadius: 999, padding: 8 },
  galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  thumb: { width: '30%', flexGrow: 1, maxWidth: '31%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: BORDER },
  thumbSm: { width: '22%', maxWidth: '23%' },
  thumbAdd: { borderWidth: 2, borderStyle: 'dashed', borderColor: tw.gray300, alignItems: 'center', justifyContent: 'center' },
  thumbRemove: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(255,255,255,0.9)', padding: 4, borderRadius: 999 },
  roomCard: { padding: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER, borderRadius: 16, overflow: 'hidden' },
  roomName: { fontSize: 16, color: tw.gray900, ...poppins(700) },
  roomMeta: { fontSize: 12, color: tw.gray500, marginTop: 2, ...poppins(500) },
  roomMetaStrong: { color: tw.gray900 },
  roomPrice: { fontSize: 18, color: HT.primary, ...poppins(700) },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: tw.gray100, borderWidth: 1, borderColor: BORDER },
  tagText: { fontSize: 10, color: tw.gray600, ...poppins(500) },
  roomActions: { flexDirection: 'row', gap: 8, marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: tw.gray100 },
  editBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: HT.primaryTint, borderRadius: 8 },
  editBtnText: { fontSize: 12, color: HT.primaryStrong, ...poppins(700) },
  delBtn: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: tw.red50, borderRadius: 8, justifyContent: 'center' },
  roomThumb: { width: 64, height: 64, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: BORDER },
  roomThumbRemove: { position: 'absolute', top: 2, right: 2, backgroundColor: 'rgba(255,255,255,0.9)', padding: 2, borderRadius: 999 },
  roomAm: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  roomAmOn: { backgroundColor: HT.primaryTint, borderColor: HT.primaryBorder },
  roomAmOff: { backgroundColor: '#fff', borderColor: BORDER },
  roomAmText: { fontSize: 12, ...poppins(500) },
  clock: { position: 'absolute', left: 12, top: 0, bottom: 0, textAlignVertical: 'center', lineHeight: 44, fontSize: 12, color: tw.gray400 },
  docIntro: { fontSize: 14, color: tw.gray700, ...poppins(600) },
  docCard: { padding: 16, borderWidth: 1, borderColor: BORDER, borderRadius: 16, backgroundColor: '#fff' },
  docName: { fontSize: 15, color: tw.gray900, ...poppins(700) },
  docOpt: { fontSize: 12, color: tw.gray400, marginTop: 2, ...poppins(400) },
  docBadge: { padding: 6, borderRadius: 999 },
  docBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed' },
  docBtnOn: { borderColor: HT.primaryBorder, backgroundColor: HT.primaryTint },
  docBtnOff: { borderColor: tw.gray300, backgroundColor: tw.gray50 },
  docBtnText: { fontSize: 14, ...poppins(700) },
  docView: { padding: 10, borderRadius: 12, borderWidth: 1, borderColor: BORDER, backgroundColor: '#fff' },
  compliance: { flexDirection: 'row', gap: 12, padding: 16, borderRadius: 16, backgroundColor: HT.primaryTint, borderWidth: 1, borderColor: HT.primaryBorder },
  complianceIcon: { alignSelf: 'flex-start', backgroundColor: tw.emerald100, padding: 8, borderRadius: 999 },
  complianceTitle: { fontSize: 15, color: tw.gray900, ...poppins(700) },
  complianceBody: { fontSize: 12, lineHeight: 16, color: tw.gray600, marginTop: 4, ...poppins(400) },
  reviewCard: { borderWidth: 1, borderColor: BORDER, borderRadius: 16, padding: 20, backgroundColor: '#fff' },
  reviewTitle: { fontSize: 14, color: tw.gray900, paddingBottom: 8, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: tw.gray100, ...poppins(700) },
  reviewName: { fontSize: 18, color: HT.primaryStrong, ...poppins(700) },
  reviewType: { fontSize: 14, color: HT.primary, ...poppins(600) },
  reviewAddr: { flex: 1, fontSize: 14, color: tw.gray600, ...poppins(400) },
  reviewRoom: { flex: 1, fontSize: 14, color: tw.gray600, ...poppins(500) },
  reviewRoomPrice: { fontSize: 14, color: tw.gray900, ...poppins(700) },
  noRooms: { fontSize: 12, color: tw.red500, backgroundColor: tw.red50, padding: 8, borderRadius: 8, ...poppins(500) },
  reviewDoc: { fontSize: 14, ...poppins(400) },
  reviewDocState: { fontSize: 12, color: tw.gray400, ...poppins(400) },
  docDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: tw.gray300, backgroundColor: tw.gray50 },
  doneIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: tw.emerald100, alignItems: 'center', justifyContent: 'center' },
  doneTitle: { fontSize: 30, lineHeight: 36, color: tw.gray900, textAlign: 'center', ...poppins(800) },
  doneBody: { fontSize: 16, lineHeight: 24, color: tw.gray500, textAlign: 'center', maxWidth: 384, ...poppins(400) },
  doneBtn: { paddingHorizontal: 32, paddingVertical: 12, backgroundColor: HT.primary, borderRadius: 12, boxShadow: '0 10px 15px -3px rgba(10,77,43,0.25)' },
  doneBtnText: { fontSize: 16, color: '#fff', ...poppins(700) },
});
