import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BedDouble, Camera, CheckCircle, Clock, FileText, Image as ImageIcon, MapPin, Plus, Search, Trash2, Users } from 'lucide-react-native';
import { SelectField } from '../../../../components/kit';
import { Press } from '../../../../components/ui';
import { poppins, tw } from '../../../../theme';
import { HT, wizard } from '../../../theme';
import {
  HOMESTAY_AMENITIES,
  HOUSE_RULES_OPTIONS,
  NEARBY_TYPE_OPTIONS,
  ROOM_AMENITIES,
} from './constants';
import {
  ActionPair,
  Caption,
  CheckDot,
  EditorCard,
  EmptyState,
  ErrorBanner,
  Label,
  ResultList,
  SearchStatus,
  TintButton,
  WInput,
} from './parts';

/* Step bodies of Frontend/src/modules/Hotel/app/partner/pages/AddHomestayWizard.jsx (steps 1-10). `w` is useHomestayWizard(). */

const ring = { boxShadow: `0 0 0 1px ${HT.primary}` };

function Field({ label, children, style }) {
  return (
    <View style={style}>
      <Label>{label}</Label>
      {children}
    </View>
  );
}

function ToggleCard({ checked, onToggle, label }) {
  return (
    <Press
      scale={0.98}
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: Boolean(checked) }}
      style={[styles.toggleCard, checked ? [styles.toggleOn, ring] : styles.toggleOff]}
    >
      <CheckDot checked={checked} square size={20} icon={14} />
      <Text style={[styles.toggleText, { color: checked ? HT.primaryStrong : tw.gray700 }]}>{label}</Text>
    </Press>
  );
}

export function StepBasic({ w }) {
  const { propertyForm: f, updatePropertyForm: set } = w;
  return (
    <View style={{ gap: 24 }}>
      <ErrorBanner message={w.error} />
      <View style={{ gap: 16 }}>
        <Field label="Homestay Name">
          <WInput placeholder="e.g. Grandma's Heritage Home" value={f.propertyName} onChangeText={(v) => set('propertyName', v)} />
        </Field>

        <Field label="Short Description">
          <WInput
            multiline
            placeholder="Brief summary (e.g. Private rooms in a heritage house)..."
            value={f.shortDescription}
            onChangeText={(v) => set('shortDescription', v)}
          />
        </Field>

        <Field label="Detailed Description">
          <WInput
            multiline
            minHeight={100}
            placeholder="Tell guests about your home, the neighborhood, and what to expect..."
            value={f.description}
            onChangeText={(v) => set('description', v)}
          />
        </Field>

        <View style={{ gap: 16, paddingTop: 8 }}>
          <ToggleCard checked={!!f.hostLivesOnProperty} onToggle={() => set('hostLivesOnProperty', !f.hostLivesOnProperty)} label="Host Lives on Property" />
          <ToggleCard checked={!!f.familyFriendly} onToggle={() => set('familyFriendly', !f.familyFriendly)} label="Family Friendly" />
        </View>

        <Field label="Contact Number (For Guest Inquiries)">
          <WInput
            keyboardType="phone-pad"
            placeholder="e.g. +91 9876543210"
            value={f.contactNumber}
            onChangeText={(v) => set('contactNumber', v)}
          />
        </Field>
      </View>
    </View>
  );
}

export function StepLocation({ w }) {
  const { propertyForm: f, updatePropertyForm: set, locationSearch } = w;
  return (
    <View style={{ gap: 24 }}>
      <ErrorBanner message={w.error} />
      <View style={{ gap: 16 }}>
        <View>
          <WInput
            icon={<Search size={18} color={tw.gray400} />}
            placeholder="Search for your address..."
            value={locationSearch.query}
            onChangeText={locationSearch.setQuery}
          />
          <ResultList results={locationSearch.results} onSelect={w.selectLocationResult} secondary={(r) => r.formatted_address} maxHeight={240} />
        </View>

        <SearchStatus search={locationSearch} />

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR ENTER MANUALLY</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={{ gap: 16 }}>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <WInput style={{ flex: 1 }} placeholder="State/Province" value={f.address.state} onChangeText={(v) => set(['address', 'state'], v)} />
            <WInput style={{ flex: 1 }} placeholder="City" value={f.address.city} onChangeText={(v) => set(['address', 'city'], v)} />
          </View>
          <WInput placeholder="Full Street Address" value={f.address.fullAddress} onChangeText={(v) => set(['address', 'fullAddress'], v)} />
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <WInput style={{ flex: 1 }} placeholder="Pincode / Zip" value={f.address.pincode} onChangeText={(v) => set(['address', 'pincode'], v)} />
            <View style={{ flex: 1 }} />
          </View>
        </View>

        <Press
          onPress={w.fetchCurrentLocation}
          disabled={w.loadingLocation}
          scale={0.98}
          style={[styles.locationButton, w.loadingLocation ? { opacity: 0.5 } : null]}
        >
          {w.loadingLocation ? (
            <>
              <ActivityIndicator size="small" color={HT.primaryStrong} />
              <Text style={styles.locationButtonText}>Fetching Location...</Text>
            </>
          ) : (
            <>
              <MapPin size={18} color={HT.primaryStrong} />
              <Text style={styles.locationButtonText}>Use Current Location</Text>
            </>
          )}
        </Press>
      </View>
    </View>
  );
}

export function StepAmenities({ w }) {
  const { propertyForm: f, updatePropertyForm: set } = w;
  return (
    <View style={{ gap: 24 }}>
      <ErrorBanner message={w.error} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {HOMESTAY_AMENITIES.map((am) => {
          const isSelected = f.amenities.includes(am);
          return (
            <Press
              key={am}
              scale={0.98}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
              onPress={() => set('amenities', isSelected ? f.amenities.filter((x) => x !== am) : [...f.amenities, am])}
              style={[styles.amenityCard, isSelected ? [styles.amenityOn, ring] : styles.amenityOff]}
            >
              <CheckDot checked={isSelected} size={20} radius={10} icon={12} />
              <Text style={[styles.amenityText, { color: isSelected ? HT.primaryStrong : tw.gray700 }]} numberOfLines={2}>
                {am}
              </Text>
            </Press>
          );
        })}
      </View>
    </View>
  );
}

export function StepNearby({ w }) {
  const { propertyForm: f, nearbySearch, tempNearbyPlace: temp, setTempNearbyPlace: setTemp } = w;
  return (
    <View style={{ gap: 16 }}>
      <ErrorBanner message={w.error} />

      {!w.isEditingSubItem && (
        <View style={{ gap: 12 }}>
          {f.nearbyPlaces.map((place, idx) => (
            <View key={idx} style={styles.placeCard}>
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
                <Press onPress={() => w.startEditNearbyPlace(idx)} accessibilityLabel="Edit place" style={[styles.iconBtn, { backgroundColor: HT.primaryTint }]}>
                  <FileText size={18} color={HT.primary} />
                </Press>
                <Press onPress={() => w.deleteNearbyPlace(idx)} accessibilityLabel="Delete place" style={styles.iconBtn}>
                  <Trash2 size={18} color={tw.gray400} />
                </Press>
              </View>
            </View>
          ))}

          {f.nearbyPlaces.length === 0 && (
            <EmptyState
              icon={<MapPin size={24} color={tw.gray400} />}
              tint={tw.gray100}
              title="No nearby places added yet"
              hint="Add tourist spots, transport hubs, etc."
            />
          )}

          <TintButton onPress={w.startAddNearbyPlace} disabled={f.nearbyPlaces.length >= 5} icon={<Plus size={20} color={HT.primaryStrong} />}>
            Add Nearby Place
          </TintButton>
        </View>
      )}

      {w.isEditingSubItem && (
        <EditorCard title={w.editingNearbyIndex === -1 ? 'Add New Place' : 'Edit Place'} onClose={w.cancelEditNearbyPlace}>
          <View style={{ gap: 16 }}>
            <View>
              <Label>Search Place</Label>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <WInput style={{ flex: 1 }} placeholder="Type to search..." value={nearbySearch.query} onChangeText={nearbySearch.setQuery} />
                <Press onPress={nearbySearch.searchNow} style={styles.searchBtn}>
                  <Text style={styles.searchBtnText}>Search</Text>
                </Press>
              </View>
              <SearchStatus search={nearbySearch} />
              <ResultList
                results={nearbySearch.results.slice(0, 6)}
                onSelect={w.selectNearbyPlace}
                secondary={(p) => p.address || p.formatted_address}
                maxHeight={192}
              />
            </View>

            <View style={{ gap: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: tw.gray100 }}>
              <Field label="Name">
                <WInput value={temp.name} onChangeText={(v) => setTemp({ ...temp, name: v })} />
              </Field>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Field label="Type" style={{ flex: 1 }}>
                  <SelectField
                    value={temp.type}
                    options={NEARBY_TYPE_OPTIONS}
                    onChange={(v) => setTemp({ ...temp, type: v })}
                    accessibilityLabel="Type"
                    style={[wizard.input, wizard.select, { paddingRight: 14.4 }]}
                    textStyle={{ fontSize: 15, color: wizard.input.color, ...poppins(400) }}
                  />
                </Field>
                <Field label="Distance (km)" style={{ flex: 1 }}>
                  <WInput keyboardType="decimal-pad" value={String(temp.distanceKm ?? '')} onChangeText={(v) => setTemp({ ...temp, distanceKm: v })} />
                </Field>
              </View>
            </View>

            <ActionPair onCancel={w.cancelEditNearbyPlace} onConfirm={w.saveNearbyPlace} confirmLabel="Save Place" />
          </View>
        </EditorCard>
      )}
    </View>
  );
}

export function StepImages({ w, wide }) {
  const { propertyForm: f, uploading } = w;
  const addGallery = () =>
    w.requestUpload('gallery', (urls) => w.updatePropertyForm('propertyImages', (cur) => [...cur, ...urls]), { multiple: true });
  return (
    <View style={{ gap: 24 }}>
      <ErrorBanner message={w.error} />

      <View style={{ gap: 24 }}>
        <View style={{ gap: 8 }}>
          <Caption>Main Cover Image</Caption>
          <Press
            scale={0.99}
            disabled={!!uploading}
            onPress={() => w.requestUpload('cover', (u) => u[0] && w.updatePropertyForm('coverImage', u[0]))}
            style={[styles.cover, wide ? { aspectRatio: 21 / 9 } : null, f.coverImage ? { borderColor: 'transparent' } : styles.coverEmpty]}
          >
            {uploading === 'cover' ? (
              <View style={{ alignItems: 'center', gap: 8 }}>
                <ActivityIndicator size="large" color={HT.primary} />
                <Text style={[styles.uploadingText, { color: HT.primary }]}>Uploading Cover...</Text>
              </View>
            ) : f.coverImage ? (
              <>
                <Image source={{ uri: f.coverImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                <Press
                  onPress={() => w.handleRemoveImage(f.coverImage, 'cover')}
                  accessibilityLabel="Remove cover image"
                  style={styles.coverRemove}
                >
                  <Trash2 size={16} color={tw.red500} />
                </Press>
              </>
            ) : (
              <View style={{ alignItems: 'center', padding: 24 }}>
                <View style={styles.coverIcon}>
                  <ImageIcon size={24} color={HT.primary} />
                </View>
                <Text style={styles.coverTitle}>Take/Upload Cover</Text>
                <Text style={styles.coverHint}>Recommended 1920x1080</Text>
              </View>
            )}
          </Press>
        </View>

        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Caption>Property Gallery</Caption>
            <View style={styles.pill}>
              <Text style={styles.pillText}>{f.propertyImages.length} / 4 minimum</Text>
            </View>
          </View>

          <View style={styles.grid}>
            {f.propertyImages.map((img, i) => (
              <View key={i} style={[styles.thumb, wide ? { width: '23%' } : null]}>
                <Image source={{ uri: img }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                <Press
                  onPress={() => w.handleRemoveImage(img, 'gallery', i)}
                  accessibilityLabel="Remove image"
                  style={styles.thumbRemove}
                >
                  <Trash2 size={12} color={tw.red500} />
                </Press>
              </View>
            ))}
            <Press onPress={addGallery} disabled={!!uploading} accessibilityLabel="Add gallery image" style={[styles.thumb, styles.thumbAdd, wide ? { width: '23%' } : null]}>
              {uploading === 'gallery' ? <ActivityIndicator size="small" color={HT.primary} /> : <Camera size={24} color={HT.primary} />}
            </Press>
          </View>
        </View>
      </View>
    </View>
  );
}

export function StepInventory({ w }) {
  const { roomTypes, editingRoomType: rt, setEditingRoomType: setRt, uploading } = w;
  const roomImages = rt?.images || [];
  const addRoomImages = () =>
    w.requestUpload(
      'room',
      (urls) => urls.length && setRt((prev) => ({ ...prev, images: [...(prev.images || []), ...urls].slice(0, 3) })),
      { multiple: true },
    );
  return (
    <View style={{ gap: 24 }}>
      <ErrorBanner message={w.error} />

      {!w.isEditingSubItem && (
        <View style={{ gap: 16 }}>
          <Text style={styles.intro}>Define your homestay inventory (Entire place or rooms).</Text>

          <View style={{ gap: 12 }}>
            {roomTypes.length === 0 ? (
              <EmptyState
                icon={<BedDouble size={24} color={HT.primary} />}
                tint={HT.primarySoft}
                title="No inventory added yet"
                hint="Add rooms or entire house options"
              />
            ) : (
              roomTypes.map((item, index) => (
                <View key={item.id} style={styles.roomCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.roomName}>{item.name}</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 4 }}>
                        <View style={styles.roomBadge}>
                          <Text style={styles.roomBadgeText}>{item.inventoryType === 'entire' ? 'ENTIRE PLACE' : 'PRIVATE ROOM'}</Text>
                        </View>
                        <Text style={styles.roomMeta}>•</Text>
                        <Text style={[styles.roomMeta, { color: tw.gray900, ...poppins(600) }]}>₹{item.pricePerNight}</Text>
                        <Text style={[styles.roomMeta, { fontSize: 12 }]}>/ night</Text>
                      </View>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                        <View style={styles.chip}>
                          <Users size={12} color={tw.gray600} />
                          <Text style={styles.chipText}>Max {item.maxAdults} Adults</Text>
                        </View>
                        <View style={styles.chip}>
                          <Users size={12} color={tw.gray600} />
                          <Text style={styles.chipText}>Max {item.maxChildren} Kids</Text>
                        </View>
                        <View style={styles.chip}>
                          <Text style={styles.chipText}>Inventory: {item.totalInventory}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Press onPress={() => w.startEditRoomType(index)} accessibilityLabel="Edit inventory" style={[styles.smallBtn, { backgroundColor: HT.primarySoft }]}>
                        <FileText size={16} color={HT.primary} />
                      </Press>
                      <Press onPress={() => w.deleteRoomType(index)} accessibilityLabel="Delete inventory" style={[styles.smallBtn, { backgroundColor: tw.red50 }]}>
                        <Trash2 size={16} color={tw.red600} />
                      </Press>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>

          <TintButton onPress={w.startAddRoomType} icon={<Plus size={20} color={HT.primaryStrong} />}>
            Add Inventory
          </TintButton>
        </View>
      )}

      {rt && (
        <EditorCard title={w.editingRoomTypeIndex === -1 ? 'Add Inventory' : 'Edit Inventory'} onClose={w.cancelEditRoomType}>
          <View style={{ gap: 20 }}>
            <View style={styles.segment}>
              {[
                { key: 'room', label: 'Private Room' },
                { key: 'entire', label: 'Entire Homestay' },
              ].map((opt) => {
                const active = rt.inventoryType === opt.key;
                return (
                  <Press
                    key={opt.key}
                    scale={1}
                    onPress={() => w.changeInventoryType(opt.key)}
                    style={[styles.segmentItem, active ? { backgroundColor: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.08)' } : null]}
                  >
                    <Text style={[styles.segmentText, { color: active ? HT.primaryStrong : tw.gray500 }]}>{opt.label}</Text>
                  </Press>
                );
              })}
            </View>

            <Field label="Name">
              <WInput placeholder="e.g. Deluxe Room or Entire 3BHK Villa" value={rt.name} onChangeText={(v) => setRt({ ...rt, name: v })} />
            </Field>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
              <Field label="Price per Night (₹)" style={styles.half}>
                <WInput
                  icon={<Text style={styles.rupee}>₹</Text>}
                  iconLeft={12}
                  style={{ paddingLeft: 28 }}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  value={String(rt.pricePerNight ?? '')}
                  onChangeText={(v) => setRt({ ...rt, pricePerNight: v })}
                />
              </Field>
              <Field label="Inventory Count" style={styles.half}>
                <WInput keyboardType="numeric" placeholder="1" value={String(rt.totalInventory ?? '')} onChangeText={(v) => setRt({ ...rt, totalInventory: v })} />
              </Field>
              <Field label="Max Adults" style={styles.half}>
                <WInput keyboardType="numeric" placeholder="2" value={String(rt.maxAdults ?? '')} onChangeText={(v) => setRt({ ...rt, maxAdults: v })} />
              </Field>
              <Field label="Max Children" style={styles.half}>
                <WInput keyboardType="numeric" placeholder="1" value={String(rt.maxChildren ?? '')} onChangeText={(v) => setRt({ ...rt, maxChildren: v })} />
              </Field>
            </View>

            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Label style={{ marginBottom: 0 }}>Images (Max 3)</Label>
                <Text style={styles.count}>{roomImages.length}/3</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
                {roomImages.map((img, i) => (
                  <View key={i} style={styles.roomThumb}>
                    <Image source={{ uri: img }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                    <Press onPress={() => w.handleRemoveImage(img, 'room', i)} accessibilityLabel="Remove image" style={styles.roomThumbRemove}>
                      <Trash2 size={12} color={tw.red500} />
                    </Press>
                  </View>
                ))}
                {roomImages.length < 3 && (
                  <Press onPress={addRoomImages} disabled={!!uploading} accessibilityLabel="Add inventory image" style={[styles.roomThumb, styles.thumbAdd]}>
                    {uploading === 'room' ? <ActivityIndicator size="small" color={HT.primary} /> : <Plus size={20} color={HT.primary} />}
                  </Press>
                )}
              </ScrollView>
            </View>

            <View style={{ gap: 8 }}>
              <Label style={{ marginBottom: 0 }}>Amenities</Label>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {ROOM_AMENITIES.map((opt) => {
                  const isSelected = rt.amenities.includes(opt.label);
                  const Icon = opt.icon;
                  return (
                    <Press
                      key={opt.label}
                      scale={0.97}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isSelected }}
                      onPress={() => w.toggleRoomAmenity(opt.label)}
                      style={[styles.amenityPill, isSelected ? styles.amenityPillOn : styles.amenityPillOff]}
                    >
                      <Icon size={12} color={isSelected ? '#fff' : tw.gray600} />
                      <Text style={[styles.amenityPillText, { color: isSelected ? '#fff' : tw.gray600 }]}>{opt.label}</Text>
                    </Press>
                  );
                })}
              </View>
            </View>

            <ActionPair
              onCancel={w.cancelEditRoomType}
              onConfirm={w.saveRoomType}
              confirmLabel={w.editingRoomTypeIndex === -1 ? 'Add Inventory' : 'Save Changes'}
              cancelWeight={700}
              shadow="lg"
            />
          </View>
        </EditorCard>
      )}
    </View>
  );
}

export function StepRules({ w }) {
  const { propertyForm: f, updatePropertyForm: set } = w;
  return (
    <View style={{ gap: 24 }}>
      {/* The web renders no error banner on this step, so its "times required" / "policy required" validation is
          silent there; the message is shown here so Continue never appears dead. */}
      <ErrorBanner message={w.error} />
      <View style={{ flexDirection: 'row', gap: 16 }}>
        <Field label="Check-In Time" style={{ flex: 1 }}>
          <WInput icon={<Clock size={18} color={tw.gray400} />} iconPad={48} placeholder="e.g. 12:00 PM" value={f.checkInTime} onChangeText={(v) => set('checkInTime', v)} />
        </Field>
        <Field label="Check-Out Time" style={{ flex: 1 }}>
          <WInput icon={<Clock size={18} color={tw.gray400} />} iconPad={48} placeholder="e.g. 11:00 AM" value={f.checkOutTime} onChangeText={(v) => set('checkOutTime', v)} />
        </Field>
      </View>

      <Field label="Cancellation Policy">
        <WInput
          multiline
          minHeight={80}
          placeholder="e.g. Free cancellation up to 48 hours before check-in..."
          value={f.cancellationPolicy}
          onChangeText={(v) => set('cancellationPolicy', v)}
        />
      </Field>

      <View style={{ gap: 8 }}>
        <Label style={{ marginBottom: 0 }}>House Rules</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {HOUSE_RULES_OPTIONS.map((r) => {
            const isSelected = f.houseRules.includes(r);
            return (
              <Press
                key={r}
                scale={0.97}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                onPress={() => set('houseRules', isSelected ? f.houseRules.filter((x) => x !== r) : [...f.houseRules, r])}
                style={[styles.ruleChip, isSelected ? [styles.ruleOn, ring] : styles.ruleOff]}
              >
                {isSelected ? <CheckCircle size={12} color={HT.primaryStrong} /> : null}
                <Text style={[styles.ruleText, { color: isSelected ? HT.primaryStrong : tw.gray600 }]}>{r}</Text>
              </Press>
            );
          })}
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
        <Text style={styles.docsIntro}>Please provide the following documents</Text>
        <View style={{ gap: 12 }}>
          {f.documents.map((doc, idx) => (
            <View key={idx} style={styles.docCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.docName}>{doc.name}</Text>
                  <Text style={styles.docHint}>Optional document</Text>
                </View>
                {doc.fileUrl ? (
                  <View style={[styles.docStatus, { backgroundColor: tw.emerald50 }]}>
                    <CheckCircle size={18} color={tw.emerald700} />
                  </View>
                ) : (
                  <View style={[styles.docStatus, { backgroundColor: tw.gray100 }]}>
                    <FileText size={18} color={tw.gray400} />
                  </View>
                )}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Press
                  onPress={() => w.requestUpload(`doc_${idx}`, (urls) => urls[0] && w.setDocumentUrl(idx, urls[0]))}
                  disabled={!!uploading}
                  style={[styles.docUpload, doc.fileUrl ? styles.docUploadDone : styles.docUploadEmpty]}
                >
                  {uploading === `doc_${idx}` ? (
                    <>
                      <ActivityIndicator size="small" color={doc.fileUrl ? HT.primaryStrong : HT.primary} />
                      <Text style={[styles.docUploadText, { color: doc.fileUrl ? HT.primaryStrong : HT.primary }]}>Uploading...</Text>
                    </>
                  ) : doc.fileUrl ? (
                    <Text style={[styles.docUploadText, { color: HT.primaryStrong }]}>Change File</Text>
                  ) : (
                    <>
                      <Plus size={16} color={HT.primary} />
                      <Text style={[styles.docUploadText, { color: HT.primary }]}>Upload</Text>
                    </>
                  )}
                </Press>
                {doc.fileUrl ? (
                  <Press onPress={() => w.openDocument(doc.fileUrl)} accessibilityLabel="View file" style={styles.docView}>
                    <Search size={18} color={HT.primary} />
                  </Press>
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
      <View style={styles.readyBox}>
        <View style={styles.readyIcon}>
          <CheckCircle size={32} color={HT.primary} />
        </View>
        <Text style={styles.readyTitle}>Ready to Submit!</Text>
        <Text style={styles.readySub}>Review your homestay details below.</Text>
      </View>

      <View style={{ gap: 16 }}>
        <View style={styles.summary}>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            {f.coverImage ? <Image source={{ uri: f.coverImage }} style={styles.summaryImg} resizeMode="cover" /> : <View style={styles.summaryImg} />}
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryName}>{f.propertyName}</Text>
              <Text style={styles.summaryAddr} numberOfLines={1}>
                {f.address.fullAddress}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <View style={[styles.tag, { backgroundColor: HT.primarySoft }]}>
                  <Text style={[styles.tagText, { color: HT.primaryStrong }]}>HOMESTAY</Text>
                </View>
                <View style={[styles.tag, { backgroundColor: tw.gray100 }]}>
                  <Text style={[styles.tagText, { color: tw.gray700 }]}>{roomTypes.length} INV. TYPES</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>HOST STATUS</Text>
            <Text style={styles.statValue}>{f.hostLivesOnProperty ? 'Lives on Property' : 'Does Not Live'}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>TARGET</Text>
            <Text style={styles.statValue}>{f.familyFriendly ? 'Family Friendly' : 'All Guests'}</Text>
          </View>
        </View>

        <View style={styles.checklist}>
          <Text style={styles.checklistTitle}>Submission Checklist</Text>
          <View style={{ gap: 8 }}>
            <View style={styles.checkRow}>
              <Text style={styles.checkLabel}>Inventory Setup</Text>
              <Text style={[styles.checkValue, { color: roomTypes.length > 0 ? HT.primary : tw.red500 }]}>{roomTypes.length > 0 ? 'Complete' : 'Missing'}</Text>
            </View>
            <View style={styles.checkRow}>
              <Text style={styles.checkLabel}>Documents</Text>
              <Text style={[styles.checkValue, { color: tw.gray500, ...poppins(500) }]}>
                {f.documents.filter((d) => d.fileUrl).length}/{f.documents.length} (Optional)
              </Text>
            </View>
            <View style={styles.checkRow}>
              <Text style={styles.checkLabel}>Photos</Text>
              <Text style={[styles.checkValue, { color: f.propertyImages.length >= 4 ? HT.primary : tw.orange500 }]}>{f.propertyImages.length}/4</Text>
            </View>
          </View>
        </View>
      </View>

      {w.error ? (
        <View style={styles.submitError}>
          <Text style={styles.submitErrorText}>{w.error}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function StepComplete({ w }) {
  // animate-bounce: 1s loop, translateY(-25%) -> 0 -> -25% with Tailwind's two easings
  const [bounce] = useState(() => new Animated.Value(-20));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: 0, duration: 500, easing: Easing.bezier(0, 0, 0.2, 1), useNativeDriver: true }),
        Animated.timing(bounce, { toValue: -20, duration: 500, easing: Easing.bezier(0.8, 0, 1, 1), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bounce]);
  return (
    <View style={{ alignItems: 'center', paddingVertical: 48, gap: 24 }}>
      <Animated.View style={[styles.doneIcon, { transform: [{ translateY: bounce }] }]}>
        <CheckCircle size={48} color={tw.emerald600} />
      </Animated.View>
      <View style={{ gap: 8, alignItems: 'center' }}>
        <Text style={styles.doneTitle}>Registration Submitted!</Text>
        <Text style={styles.doneText}>Your homestay registration has been sent for verification. Our team will review it and get back to you shortly.</Text>
      </View>
      <Press onPress={() => w.navigate('/hotel/partner/properties')} style={styles.doneButton}>
        <Text style={styles.doneButtonText}>Go to My Properties</Text>
      </Press>
    </View>
  );
}

const styles = StyleSheet.create({
  toggleCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderRadius: 12 },
  toggleOn: { backgroundColor: HT.primaryTint, borderColor: HT.primaryBorder },
  toggleOff: { backgroundColor: tw.gray50, borderColor: tw.gray200 },
  toggleText: { fontSize: 14, lineHeight: 20, ...poppins(700) },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: tw.gray200 },
  dividerText: { fontSize: 12, lineHeight: 16, letterSpacing: 0.6, color: tw.gray400, ...poppins(600) },
  // `hover:bg-[#005CA8]/5` is matched by substring in partnerTheme.css, so the tint is always on
  locationButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed', borderColor: HT.primaryBorder, backgroundColor: HT.primaryTint },
  locationButtonText: { color: HT.primaryStrong, fontSize: 14, lineHeight: 20, ...poppins(700) },
  amenityCard: { width: '48%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderWidth: 1, borderRadius: 12 },
  amenityOn: { backgroundColor: HT.primaryTint, borderColor: HT.primary, boxShadow: `0 0 0 1px ${HT.primary}, 0 1px 2px rgba(0,0,0,0.06)` },
  amenityOff: { backgroundColor: '#fff', borderColor: tw.gray200 },
  amenityText: { flex: 1, fontSize: 14, lineHeight: 20, ...poppins(600) },
  placeCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderWidth: 1, borderColor: HT.primaryBorder, borderRadius: 12, backgroundColor: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
  placeIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: HT.primaryTint, alignItems: 'center', justifyContent: 'center' },
  placeName: { fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(700) },
  placeMeta: { fontSize: 12, lineHeight: 16, letterSpacing: 0.4, color: tw.gray500, ...poppins(500) },
  iconBtn: { padding: 8, borderRadius: 8 },
  searchBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: tw.gray900, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  searchBtnText: { color: '#fff', fontSize: 14, lineHeight: 20, ...poppins(600) },
  cover: { width: '100%', aspectRatio: 16 / 9, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', borderColor: tw.gray300, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  coverEmpty: { borderColor: HT.primaryBorder, backgroundColor: HT.primaryTint },
  coverRemove: { position: 'absolute', top: 12, right: 12, padding: 6, backgroundColor: '#fff', borderRadius: 999, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
  coverIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: HT.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  coverTitle: { fontSize: 14, lineHeight: 20, color: tw.gray700, ...poppins(600) },
  coverHint: { marginTop: 4, fontSize: 12, lineHeight: 16, color: tw.gray400, ...poppins(400) },
  uploadingText: { fontSize: 14, lineHeight: 20, ...poppins(700) },
  pill: { backgroundColor: tw.gray100, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  pillText: { fontSize: 10, lineHeight: 14, color: tw.gray500, ...poppins(500) },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  thumb: { width: '31%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: tw.gray200 },
  // the add tiles carry `hover:border-[#005CA8]/50 hover:text-[#005CA8] hover:bg-[#005CA8]/5`, all matched by substring
  thumbAdd: { borderWidth: 2, borderStyle: 'dashed', borderColor: HT.primaryBorder, backgroundColor: HT.primaryTint, alignItems: 'center', justifyContent: 'center' },
  thumbRemove: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(255,255,255,0.9)', padding: 4, borderRadius: 999 },
  intro: { fontSize: 14, lineHeight: 20, color: tw.gray500, ...poppins(400) },
  roomCard: { padding: 16, borderWidth: 1, borderColor: HT.primaryBorder, borderRadius: 16, backgroundColor: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
  roomName: { fontSize: 18, lineHeight: 28, color: tw.gray900, ...poppins(700) },
  roomBadge: { backgroundColor: HT.primaryTint, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  roomBadgeText: { fontSize: 12, lineHeight: 16, letterSpacing: 0.6, color: HT.primaryStrong, ...poppins(700) },
  roomMeta: { fontSize: 14, lineHeight: 20, color: tw.gray500, ...poppins(400) },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: tw.gray100, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  chipText: { fontSize: 12, lineHeight: 16, color: tw.gray600, ...poppins(400) },
  smallBtn: { padding: 8, borderRadius: 8 },
  segment: { padding: 4, backgroundColor: tw.gray100, borderRadius: 12, flexDirection: 'row' },
  segmentItem: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  segmentText: { fontSize: 12, lineHeight: 16, ...poppins(700) },
  half: { width: '47%', flexGrow: 1 },
  rupee: { color: tw.gray400, fontSize: 15, ...poppins(700) },
  count: { fontSize: 10, lineHeight: 14, color: tw.gray400, ...poppins(400) },
  roomThumb: { width: 80, height: 80, borderRadius: 12, borderWidth: 1, borderColor: tw.gray200, overflow: 'hidden' },
  roomThumbRemove: { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  amenityPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  amenityPillOn: { backgroundColor: HT.primary, borderColor: HT.primary },
  amenityPillOff: { backgroundColor: '#fff', borderColor: tw.gray200 },
  amenityPillText: { fontSize: 12, lineHeight: 16, ...poppins(500) },
  ruleChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  ruleOn: { backgroundColor: HT.primaryTint, borderColor: HT.primary },
  ruleOff: { backgroundColor: '#fff', borderColor: tw.gray200 },
  ruleText: { fontSize: 12, lineHeight: 16, ...poppins(700) },
  docsIntro: { fontSize: 14, lineHeight: 20, color: tw.gray700, ...poppins(600) },
  docCard: { padding: 16, borderWidth: 1, borderColor: HT.primaryBorder, borderRadius: 16, backgroundColor: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
  docName: { fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(700) },
  docHint: { marginTop: 2, fontSize: 12, lineHeight: 16, color: tw.gray400, ...poppins(400) },
  docStatus: { padding: 6, borderRadius: 999 },
  docUpload: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed' },
  docUploadDone: { borderColor: HT.primaryBorder, backgroundColor: HT.primarySoft },
  docUploadEmpty: { borderColor: HT.primaryBorder, backgroundColor: tw.gray50 },
  docUploadText: { fontSize: 14, lineHeight: 20, ...poppins(700) },
  docView: { padding: 10, borderRadius: 12, borderWidth: 1, borderColor: HT.primaryBorder, backgroundColor: HT.primaryTint },
  readyBox: { backgroundColor: HT.primaryTint, borderRadius: 16, padding: 24, alignItems: 'center' },
  readyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.08)' },
  readyTitle: { fontSize: 20, lineHeight: 28, color: HT.primaryStrong, ...poppins(700) },
  readySub: { marginTop: 4, fontSize: 14, lineHeight: 20, color: HT.primaryStrong, ...poppins(400) },
  summary: { backgroundColor: '#fff', borderWidth: 1, borderColor: tw.gray200, borderRadius: 12, overflow: 'hidden', padding: 16 },
  summaryImg: { width: 80, height: 80, borderRadius: 8, backgroundColor: tw.gray100 },
  summaryName: { fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(700) },
  summaryAddr: { marginTop: 4, fontSize: 14, lineHeight: 20, color: tw.gray500, ...poppins(400) },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  tagText: { fontSize: 10, lineHeight: 15, ...poppins(700) },
  statBox: { flex: 1, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: tw.gray200, backgroundColor: tw.gray50 },
  statLabel: { marginBottom: 4, fontSize: 12, lineHeight: 16, letterSpacing: 0.6, color: tw.gray500, ...poppins(700) },
  statValue: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(600) },
  checklist: { padding: 16, borderRadius: 12, borderWidth: 1, borderColor: tw.gray200, backgroundColor: '#fff' },
  checklistTitle: { marginBottom: 12, fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(700) },
  checkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  checkLabel: { fontSize: 14, lineHeight: 20, color: tw.gray600, ...poppins(400) },
  checkValue: { fontSize: 14, lineHeight: 20, ...poppins(700) },
  submitError: { padding: 16, backgroundColor: tw.red50, borderWidth: 1, borderColor: tw.red200, borderRadius: 16 },
  submitErrorText: { fontSize: 14, lineHeight: 20, color: tw.red700, ...poppins(500) },
  doneIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: tw.emerald100, alignItems: 'center', justifyContent: 'center' },
  doneTitle: { fontSize: 30, lineHeight: 36, color: tw.gray900, textAlign: 'center', ...poppins(800) },
  doneText: { maxWidth: 384, fontSize: 14, lineHeight: 22, color: tw.gray500, textAlign: 'center', ...poppins(400) },
  doneButton: { paddingHorizontal: 32, paddingVertical: 12, backgroundColor: HT.primaryStrong, borderRadius: 12, boxShadow: `0 10px 15px -3px ${HT.primary}, 0 4px 6px -4px ${HT.primary}` },
  doneButtonText: { color: '#fff', fontSize: 14, lineHeight: 24, ...poppins(700) },
});
