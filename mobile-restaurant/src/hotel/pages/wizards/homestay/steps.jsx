import { Image, StyleSheet, Text, View } from 'react-native';
import { BedDouble, Camera, Clock, MapPin, Plus, Search } from 'lucide-react-native';
import { Button, StatusBadge } from '../../../../components/ds';
import { color, radii, space, type } from '../../../../theme';
import { Field, InfoTile, KeyValue, sentence } from '../../../components/dashboard/partnerUi';
import {
  AddPhotoTile,
  ChoiceSwitch,
  CoverPhoto,
  DocumentRow,
  DoneState,
  GroupLabel,
  Grid,
  LocationButton,
  Notice,
  OptionCard,
  OrDivider,
  PhotoTile,
  PlaceRow,
  ReviewBlock,
  RoomCard,
  SearchField,
  SelectBox,
  ToggleChip,
  FieldPair,
} from '../../../components/wizardUi';
import { HOMESTAY_AMENITIES, HOUSE_RULES_OPTIONS, NEARBY_TYPE_OPTIONS, ROOM_AMENITIES } from './constants';
import { ActionPair, EditorCard, EmptyState, ErrorBanner, ResultList, SearchStatus } from './parts';

/* Step bodies of Frontend/src/modules/Hotel/app/partner/pages/AddHomestayWizard.jsx (steps 1-10). `w` is useHomestayWizard(). */

const clockIcon = <Clock size={18} color={color.textMuted} />;
const typeLabel = (value) => NEARBY_TYPE_OPTIONS.find((t) => t.value === value)?.label || sentence(value);
const ROOM_PHOTO = 80;

export function StepBasic({ w }) {
  const { propertyForm: f, updatePropertyForm: set } = w;
  return (
    <View style={{ gap: space.xl }}>
      <ErrorBanner message={w.error} />
      <View style={{ gap: space.lg }}>
        <Field label="Homestay name" placeholder="e.g. Grandma's Heritage Home" value={f.propertyName} onChangeText={(v) => set('propertyName', v)} />

        <Field
          label="Short description"
          multiline
          inputStyle={{ minHeight: 72 }}
          placeholder="Brief summary (e.g. Private rooms in a heritage house)..."
          value={f.shortDescription}
          onChangeText={(v) => set('shortDescription', v)}
        />

        <Field
          label="Detailed description"
          multiline
          inputStyle={{ minHeight: 100 }}
          placeholder="Tell guests about your home, the neighborhood, and what to expect..."
          value={f.description}
          onChangeText={(v) => set('description', v)}
        />

        <View style={{ gap: space.sm }}>
          <OptionCard label="Host lives on property" selected={!!f.hostLivesOnProperty} onPress={() => set('hostLivesOnProperty', !f.hostLivesOnProperty)} />
          <OptionCard label="Family friendly" selected={!!f.familyFriendly} onPress={() => set('familyFriendly', !f.familyFriendly)} />
        </View>

        <Field label="Contact number (for guest inquiries)" keyboardType="phone-pad" placeholder="e.g. +91 9876543210" value={f.contactNumber} onChangeText={(v) => set('contactNumber', v)} />
      </View>
    </View>
  );
}

export function StepLocation({ w }) {
  const { propertyForm: f, updatePropertyForm: set, locationSearch } = w;
  return (
    <View style={{ gap: space.lg }}>
      <ErrorBanner message={w.error} />

      <View style={{ gap: space.sm }}>
        <Field
          label="Search address"
          right={<Search size={18} color={color.textMuted} />}
          placeholder="Search for your address..."
          value={locationSearch.query}
          onChangeText={locationSearch.setQuery}
        />
        <ResultList results={locationSearch.results} onSelect={w.selectLocationResult} secondary={(r) => r.formatted_address} maxHeight={240} />
        <SearchStatus search={locationSearch} />
      </View>

      <OrDivider label="Or enter manually" />

      <View style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <Field style={{ flex: 1 }} label="State" placeholder="State/Province" value={f.address.state} onChangeText={(v) => set(['address', 'state'], v)} />
          <Field style={{ flex: 1 }} label="City" placeholder="City" value={f.address.city} onChangeText={(v) => set(['address', 'city'], v)} />
        </View>
        <Field label="Street address" placeholder="Full Street Address" value={f.address.fullAddress} onChangeText={(v) => set(['address', 'fullAddress'], v)} />
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <Field style={{ flex: 1 }} label="Pincode" placeholder="Pincode / Zip" value={f.address.pincode} onChangeText={(v) => set(['address', 'pincode'], v)} />
          <View style={{ flex: 1 }} />
        </View>
      </View>

      <LocationButton onPress={w.fetchCurrentLocation} loading={w.loadingLocation} label="Use current location" loadingLabel="Fetching location..." icon={MapPin} />
    </View>
  );
}

export function StepAmenities({ w }) {
  const { propertyForm: f, updatePropertyForm: set } = w;
  return (
    <View style={{ gap: space.xl }}>
      <ErrorBanner message={w.error} />
      <Grid columns={2}>
        {HOMESTAY_AMENITIES.map((am) => {
          const isSelected = f.amenities.includes(am);
          return (
            <OptionCard
              key={am}
              label={am}
              style={{ flex: 1 }}
              selected={isSelected}
              onPress={() => set('amenities', isSelected ? f.amenities.filter((x) => x !== am) : [...f.amenities, am])}
            />
          );
        })}
      </Grid>
    </View>
  );
}

export function StepNearby({ w }) {
  const { propertyForm: f, nearbySearch, tempNearbyPlace: temp, setTempNearbyPlace: setTemp } = w;
  return (
    <View style={{ gap: space.lg }}>
      <ErrorBanner message={w.error} />

      {!w.isEditingSubItem && (
        <View style={{ gap: space.md }}>
          {f.nearbyPlaces.map((place, idx) => (
            <PlaceRow
              key={idx}
              name={place.name}
              kind={typeLabel(place.type)}
              distanceKm={place.distanceKm}
              onEdit={() => w.startEditNearbyPlace(idx)}
              onDelete={() => w.deleteNearbyPlace(idx)}
            />
          ))}

          {f.nearbyPlaces.length === 0 && <EmptyState icon={MapPin} title="No nearby places added yet" hint="Add tourist spots, transport hubs, etc." />}

          <Button title="Add nearby place" variant="secondary" icon={Plus} onPress={w.startAddNearbyPlace} disabled={f.nearbyPlaces.length >= 5} />
        </View>
      )}

      {w.isEditingSubItem && (
        <EditorCard title={w.editingNearbyIndex === -1 ? 'Add new place' : 'Edit place'} onClose={w.cancelEditNearbyPlace}>
          <View style={{ gap: space.sm }}>
            <SearchField label="Search place" placeholder="Type to search..." value={nearbySearch.query} onChangeText={nearbySearch.setQuery} onSearch={nearbySearch.searchNow} />
            <SearchStatus search={nearbySearch} />
            <ResultList results={nearbySearch.results.slice(0, 6)} onSelect={w.selectNearbyPlace} secondary={(p) => p.address || p.formatted_address} maxHeight={192} />
          </View>

          <Field label="Name" accessibilityLabel="Place name" value={temp.name} onChangeText={(v) => setTemp({ ...temp, name: v })} />
          <FieldPair>
            <SelectBox label="Type" title="Type" value={temp.type} options={NEARBY_TYPE_OPTIONS} onChange={(v) => setTemp({ ...temp, type: v })} />
            <Field
              label="Distance (km)"
              accessibilityLabel="Distance in km"
              keyboardType="decimal-pad"
              value={String(temp.distanceKm ?? '')}
              onChangeText={(v) => setTemp({ ...temp, distanceKm: v })}
            />
          </FieldPair>

          <ActionPair onCancel={w.cancelEditNearbyPlace} onConfirm={w.saveNearbyPlace} confirmLabel="Save place" />
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
    <View style={{ gap: space.xl }}>
      <ErrorBanner message={w.error} />

      <View style={{ gap: space.sm }}>
        <GroupLabel>Main cover image</GroupLabel>
        <CoverPhoto
          uri={f.coverImage}
          uploading={uploading === 'cover'}
          disabled={!!uploading}
          onPick={() => w.requestUpload('cover', (u) => u[0] && w.updatePropertyForm('coverImage', u[0]))}
          onRemove={() => w.handleRemoveImage(f.coverImage, 'cover')}
          emptyLabel="Take/upload cover"
          hint="Recommended 1920x1080"
          uploadingLabel="Uploading cover..."
          aspectRatio={wide ? 21 / 9 : 16 / 9}
        />
      </View>

      <View style={{ gap: space.md }}>
        <GroupLabel right={<StatusBadge label={`${f.propertyImages.length} / 4 minimum`} tone={f.propertyImages.length >= 4 ? 'success' : 'neutral'} />}>Property gallery</GroupLabel>
        <Grid columns={wide ? 4 : 3} gap={space.sm + 2}>
          {f.propertyImages.map((img, i) => (
            <PhotoTile key={i} uri={img} onRemove={() => w.handleRemoveImage(img, 'gallery', i)} />
          ))}
          <AddPhotoTile key="add" onPress={addGallery} disabled={!!uploading} loading={uploading === 'gallery'} label="Add gallery image" icon={Camera} />
        </Grid>
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
    <View style={{ gap: space.xl }}>
      <ErrorBanner message={w.error} />

      {!w.isEditingSubItem && (
        <View style={{ gap: space.md }}>
          <Text style={[type.body, { color: color.textSecondary }]}>Define your homestay inventory (Entire place or rooms).</Text>

          {roomTypes.length === 0 ? (
            <EmptyState icon={BedDouble} title="No inventory added yet" hint="Add rooms or entire house options" />
          ) : (
            roomTypes.map((item, index) => (
              <RoomCard
                key={item.id}
                name={item.name}
                badge={item.inventoryType === 'entire' ? 'Entire place' : 'Private room'}
                price={`₹${item.pricePerNight}`}
                facts={[`Max ${item.maxAdults} adults`, `Max ${item.maxChildren} kids`, `Inventory: ${item.totalInventory}`]}
                onEdit={() => w.startEditRoomType(index)}
                onDelete={() => w.deleteRoomType(index)}
                deleteLabel="Delete inventory"
              />
            ))
          )}

          <Button title="Add inventory" variant="secondary" icon={Plus} onPress={w.startAddRoomType} />
        </View>
      )}

      {rt && (
        <EditorCard title={w.editingRoomTypeIndex === -1 ? 'Add inventory' : 'Edit inventory'} onClose={w.cancelEditRoomType}>
          <ChoiceSwitch
            options={[
              { key: 'room', label: 'Private room' },
              { key: 'entire', label: 'Entire homestay' },
            ]}
            value={rt.inventoryType}
            onChange={w.changeInventoryType}
          />

          <Field label="Name" accessibilityLabel="Inventory name" placeholder="e.g. Deluxe Room or Entire 3BHK Villa" value={rt.name} onChangeText={(v) => setRt({ ...rt, name: v })} />

          <View style={{ flexDirection: 'row', gap: space.md }}>
            <Field style={{ flex: 1 }} label="Price per night (₹)" keyboardType="decimal-pad" placeholder="0" value={String(rt.pricePerNight ?? '')} onChangeText={(v) => setRt({ ...rt, pricePerNight: v })} />
            <Field style={{ flex: 1 }} label="Inventory count" keyboardType="numeric" placeholder="1" value={String(rt.totalInventory ?? '')} onChangeText={(v) => setRt({ ...rt, totalInventory: v })} />
          </View>
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <Field style={{ flex: 1 }} label="Max adults" keyboardType="numeric" placeholder="2" value={String(rt.maxAdults ?? '')} onChangeText={(v) => setRt({ ...rt, maxAdults: v })} />
            <Field style={{ flex: 1 }} label="Max children" keyboardType="numeric" placeholder="1" value={String(rt.maxChildren ?? '')} onChangeText={(v) => setRt({ ...rt, maxChildren: v })} />
          </View>

          <View style={{ gap: space.sm }}>
            <GroupLabel right={`${roomImages.length}/3`}>Images (max 3)</GroupLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {roomImages.map((img, i) => (
                <PhotoTile key={i} uri={img} size={ROOM_PHOTO} onRemove={() => w.handleRemoveImage(img, 'room', i)} />
              ))}
              {roomImages.length < 3 && <AddPhotoTile size={ROOM_PHOTO} onPress={addRoomImages} disabled={!!uploading} loading={uploading === 'room'} label="Add inventory image" />}
            </View>
          </View>

          <View style={{ gap: space.sm }}>
            <GroupLabel>Amenities</GroupLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {ROOM_AMENITIES.map((opt) => (
                <ToggleChip key={opt.label} label={opt.label} icon={opt.icon} selected={rt.amenities.includes(opt.label)} onPress={() => w.toggleRoomAmenity(opt.label)} />
              ))}
            </View>
          </View>

          <ActionPair onCancel={w.cancelEditRoomType} onConfirm={w.saveRoomType} confirmLabel={w.editingRoomTypeIndex === -1 ? 'Add inventory' : 'Save changes'} />
        </EditorCard>
      )}
    </View>
  );
}

export function StepRules({ w }) {
  const { propertyForm: f, updatePropertyForm: set } = w;
  return (
    <View style={{ gap: space.xl }}>
      {/* The web renders no error banner on this step, so its "times required" / "policy required" validation is
          silent there; the message is shown here so Continue never appears dead. */}
      <ErrorBanner message={w.error} />
      <View style={{ flexDirection: 'row', gap: space.md }}>
        <Field style={{ flex: 1 }} label="Check-in time" right={clockIcon} placeholder="e.g. 12:00 PM" value={f.checkInTime} onChangeText={(v) => set('checkInTime', v)} />
        <Field style={{ flex: 1 }} label="Check-out time" right={clockIcon} placeholder="e.g. 11:00 AM" value={f.checkOutTime} onChangeText={(v) => set('checkOutTime', v)} />
      </View>

      <Field
        label="Cancellation policy"
        multiline
        inputStyle={{ minHeight: 80 }}
        placeholder="e.g. Free cancellation up to 48 hours before check-in..."
        value={f.cancellationPolicy}
        onChangeText={(v) => set('cancellationPolicy', v)}
      />

      <View style={{ gap: space.sm }}>
        <GroupLabel>House rules</GroupLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {HOUSE_RULES_OPTIONS.map((r) => {
            const isSelected = f.houseRules.includes(r);
            return <ToggleChip key={r} label={r} selected={isSelected} onPress={() => set('houseRules', isSelected ? f.houseRules.filter((x) => x !== r) : [...f.houseRules, r])} />;
          })}
        </View>
      </View>
    </View>
  );
}

export function StepDocuments({ w }) {
  const { propertyForm: f, uploading } = w;
  return (
    <View style={{ gap: space.xl }}>
      <ErrorBanner message={w.error} />
      <View style={{ gap: space.md }}>
        <Text style={[type.bodyStrong, { color: color.text }]}>Please provide the following documents</Text>
        {f.documents.map((doc, idx) => (
          <DocumentRow
            key={idx}
            name={doc.name}
            attached={Boolean(doc.fileUrl)}
            uploading={uploading === `doc_${idx}`}
            uploadDisabled={!!uploading}
            onUpload={() => w.requestUpload(`doc_${idx}`, (urls) => urls[0] && w.setDocumentUrl(idx, urls[0]))}
            onView={() => w.openDocument(doc.fileUrl)}
          />
        ))}
      </View>
    </View>
  );
}

export function StepReview({ w }) {
  const { propertyForm: f, roomTypes } = w;
  const docsAttached = f.documents.filter((d) => d.fileUrl).length;
  return (
    <View style={{ gap: space.xl }}>
      <Notice tone="success" title="Ready to submit!" message="Review your homestay details below." />

      <View style={{ gap: space.md }}>
        <View style={styles.summary}>
          {f.coverImage ? <Image source={{ uri: f.coverImage }} style={styles.summaryImg} resizeMode="cover" /> : <View style={styles.summaryImg} />}
          <View style={{ flex: 1, minWidth: 0, gap: space.xs }}>
            <Text style={[type.subheading, { color: color.text }]} numberOfLines={2}>
              {f.propertyName}
            </Text>
            <Text style={[type.small, { color: color.textMuted }]} numberOfLines={2}>
              {f.address.fullAddress}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs + 2 }}>
              <StatusBadge label="Homestay" tone="primary" />
              <StatusBadge label={`${roomTypes.length} inv. types`} tone="neutral" />
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: space.md }}>
          <InfoTile label="Host status" value={f.hostLivesOnProperty ? 'Lives on property' : 'Does not live'} />
          <InfoTile label="Target" value={f.familyFriendly ? 'Family friendly' : 'All guests'} />
        </View>

        <ReviewBlock title="Submission checklist">
          <KeyValue label="Inventory setup" value={<StatusBadge label={roomTypes.length > 0 ? 'Complete' : 'Missing'} tone={roomTypes.length > 0 ? 'success' : 'danger'} />} />
          <KeyValue label="Documents" value={`${docsAttached}/${f.documents.length} (optional)`} valueStyle={{ color: color.textSecondary }} />
          <KeyValue label="Photos" value={<StatusBadge label={`${f.propertyImages.length}/4`} tone={f.propertyImages.length >= 4 ? 'success' : 'warning'} />} />
        </ReviewBlock>
      </View>

      <ErrorBanner message={w.error} />
    </View>
  );
}

export function StepComplete({ w }) {
  return (
    <DoneState
      title="Registration submitted!"
      message="Your homestay registration has been sent for verification. Our team will review it and get back to you shortly."
      actionLabel="Go to my properties"
      onAction={() => w.navigate('/hotel/partner/properties')}
    />
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', gap: space.md, padding: space.lg, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface },
  summaryImg: { width: 80, height: 80, borderRadius: radii.md, backgroundColor: color.surfaceMuted },
});
