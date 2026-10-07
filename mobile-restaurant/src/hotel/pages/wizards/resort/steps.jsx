import { Linking, Text, View } from 'react-native';
import { BedDouble, Camera, Clock, MapPin, Plus } from 'lucide-react-native';
import { Button } from '../../../../components/ds';
import { color, space, type } from '../../../../theme';
import { Field, KeyValue, sentence } from '../../../components/dashboard/partnerUi';
import {
  AddPhotoTile,
  CoverPhoto,
  DocumentRow,
  DoneState,
  EditorActions,
  EditorPanel,
  EmptyBox,
  GroupLabel,
  Grid,
  LocationButton,
  Notice,
  NumberField,
  OptionCard,
  OrDivider,
  PhotoTile,
  PlaceRow,
  ResultList,
  ReviewBlock,
  ReviewDocLine,
  RoomCard,
  SearchField,
  SelectBox,
  ToggleChip,
  FieldPair,
} from '../../../components/wizardUi';
import { HOUSE_RULES_OPTIONS, NEARBY_TYPES, RESORT_ACTIVITIES, RESORT_AMENITIES, RESORT_TYPES, ROOM_AMENITIES_OPTIONS } from './constants';
import { ErrorBanner, SearchStatus, asText, useIsSm } from './parts';

/* Step bodies of Frontend/src/modules/Hotel/app/partner/pages/AddResortWizard.jsx (steps 1-9 and the success screen). */

const toggleIn = (list, item) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
const typeLabel = (value) => NEARBY_TYPES.find((t) => t.value === value)?.label || sentence(value);
const clockIcon = <Clock size={18} color={color.textMuted} />;
const ROOM_PHOTO = 72;

/** The web's type="number" field: digits, point and minus. */
function Num(props) {
  return <NumberField allowNegative keyboardType="numeric" {...props} value={asText(props.value)} />;
}

export function StepBasic({ w }) {
  const { propertyForm: f, updatePropertyForm: set } = w;
  return (
    <View style={{ gap: space.xl }}>
      <ErrorBanner message={w.error} />
      <View style={{ gap: space.lg }}>
        <Field label="Resort name" placeholder="e.g. Blue Lagoon Resort" value={asText(f.propertyName)} onChangeText={(v) => set('propertyName', v)} />

        <View style={{ gap: space.sm }} accessibilityRole="radiogroup">
          <GroupLabel>Resort type</GroupLabel>
          <Grid columns={2} gap={space.sm + 2}>
            {RESORT_TYPES.map((t) => (
              <OptionCard key={t.value} role="radio" icon={t.icon} label={t.label} style={{ flex: 1 }} selected={f.resortType === t.value} onPress={() => set('resortType', t.value)} />
            ))}
          </Grid>
        </View>

        <View style={{ gap: space.sm }}>
          <GroupLabel>Activities</GroupLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {RESORT_ACTIVITIES.map((act) => (
              <ToggleChip key={act} label={act} selected={f.activities.includes(act)} onPress={() => set('activities', toggleIn(f.activities, act))} />
            ))}
          </View>
        </View>

        <Field label="Short description" multiline inputStyle={{ minHeight: 72 }} placeholder="Brief summary for listings..." value={asText(f.shortDescription)} onChangeText={(v) => set('shortDescription', v)} />

        <Field label="Detailed description" multiline inputStyle={{ minHeight: 100 }} placeholder="Tell guests what makes your resort unique..." value={asText(f.description)} onChangeText={(v) => set('description', v)} />

        <Field label="Contact number (for guest inquiries)" keyboardType="phone-pad" placeholder="e.g. +91 9876543210" value={asText(f.contactNumber)} onChangeText={(v) => set('contactNumber', v)} />
      </View>
    </View>
  );
}

export function StepLocation({ w }) {
  const { propertyForm: f, updatePropertyForm: set, locationSearch: ls } = w;
  return (
    <View style={{ gap: space.lg }}>
      <ErrorBanner message={w.error} />
      <View style={{ gap: space.sm }}>
        <SearchField label="Search address" placeholder="Search location..." value={ls.query} onChangeText={ls.setQuery} onSearch={ls.searchNow} />
        <SearchStatus search={ls} />
        <ResultList results={ls.results} onSelect={w.selectLocationResult} secondary={(p) => p.formatted_address} maxHeight={192} />
      </View>

      <OrDivider label="Or enter manually" />

      <View style={{ gap: space.md }}>
        <Field label="Full address" placeholder="Full Address" value={asText(f.address.fullAddress)} onChangeText={(v) => set(['address', 'fullAddress'], v)} />
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <Field style={{ flex: 1 }} label="City" placeholder="City" value={asText(f.address.city)} onChangeText={(v) => set(['address', 'city'], v)} />
          <Field style={{ flex: 1 }} label="State" placeholder="State" value={asText(f.address.state)} onChangeText={(v) => set(['address', 'state'], v)} />
        </View>
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <Field style={{ flex: 1 }} label="Pincode" placeholder="Pincode" value={asText(f.address.pincode)} onChangeText={(v) => set(['address', 'pincode'], v)} />
          <View style={{ flex: 1 }} />
        </View>
      </View>

      <LocationButton onPress={w.fetchCurrentLocation} loading={w.loadingLocation} label="Use current location" loadingLabel="Fetching location..." icon={MapPin} />
    </View>
  );
}

export function StepAmenities({ w }) {
  const { propertyForm: f, updatePropertyForm: set } = w;
  const isSm = useIsSm();
  return (
    <View style={{ gap: space.lg }}>
      <ErrorBanner message={w.error} />
      <Grid columns={isSm ? 3 : 2}>
        {RESORT_AMENITIES.map((am) => (
          <OptionCard key={am} label={am} style={{ flex: 1 }} selected={f.amenities.includes(am)} onPress={() => set('amenities', toggleIn(f.amenities, am))} />
        ))}
      </Grid>
    </View>
  );
}

export function StepNearby({ w }) {
  const { propertyForm: f, nearbySearch: ns, tempNearbyPlace: temp, setTempNearbyPlace: setTemp } = w;
  const editing = w.editingNearbyIndex !== null;
  return (
    <View style={{ gap: space.lg }}>
      <ErrorBanner message={w.error} />

      {!editing && (
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

          {f.nearbyPlaces.length === 0 && <EmptyBox icon={MapPin} title="No nearby places added yet" hint="Add tourist spots, transport hubs, etc." />}

          <Button title="Add nearby place" variant="secondary" icon={Plus} onPress={w.startAddNearbyPlace} disabled={f.nearbyPlaces.length >= 5} />
        </View>
      )}

      {editing && (
        <EditorPanel title={w.editingNearbyIndex === -1 ? 'Add new place' : 'Edit place'} onClose={w.cancelEditNearbyPlace}>
          <View style={{ gap: space.sm }}>
            <SearchField label="Search place" placeholder="Type to search..." value={ns.query} onChangeText={ns.setQuery} onSearch={ns.searchNow} />
            <SearchStatus search={ns} />
            <ResultList results={ns.results.slice(0, 6)} onSelect={w.selectNearbyPlace} secondary={(p) => p.address || p.formatted_address} maxHeight={192} />
          </View>

          <Field label="Name" accessibilityLabel="Place name" value={asText(temp.name)} onChangeText={(v) => setTemp({ ...temp, name: v })} />
          <FieldPair>
            <SelectBox label="Type" title="Type" value={temp.type} options={NEARBY_TYPES} onChange={(v) => setTemp({ ...temp, type: v })} />
            <Num label="Distance (km)" accessibilityLabel="Distance in km" value={temp.distanceKm} onChangeText={(v) => setTemp({ ...temp, distanceKm: v })} />
          </FieldPair>

          <EditorActions onCancel={w.cancelEditNearbyPlace} onConfirm={w.saveNearbyPlace} confirmLabel="Save place" />
        </EditorPanel>
      )}
    </View>
  );
}

export function StepImages({ w }) {
  const { propertyForm: f, uploading } = w;
  const isSm = useIsSm();
  return (
    <View style={{ gap: space.xl }}>
      <ErrorBanner message={w.error} />
      <View style={{ gap: space.sm }}>
        <GroupLabel>Cover image</GroupLabel>
        <CoverPhoto
          uri={f.coverImage}
          uploading={uploading === 'cover'}
          onPick={() => !uploading && w.uploadCover()}
          onRemove={() => w.handleRemoveImage(f.coverImage, 'cover')}
          emptyLabel="Take/upload cover photo"
          uploadingLabel="Uploading..."
          height={isSm ? 256 : 192}
        />
      </View>

      <View style={{ gap: space.md }}>
        <GroupLabel right={`${f.propertyImages.length} images`}>Property gallery</GroupLabel>
        <Grid columns={isSm ? 4 : 3} gap={space.sm + 2}>
          {f.propertyImages.map((img, i) => (
            <PhotoTile key={i} uri={img} onRemove={() => w.handleRemoveImage(img, 'gallery', i)} />
          ))}
          <AddPhotoTile key="add" onPress={w.uploadGallery} disabled={!!uploading} loading={uploading === 'gallery'} label="Add gallery images" icon={Camera} />
        </Grid>
      </View>
    </View>
  );
}

export function StepRooms({ w }) {
  const { roomTypes, editingRoomType: rt, uploading } = w;
  return (
    <View style={{ gap: space.lg }}>
      <ErrorBanner message={w.error} />

      {!rt && (
        <View style={{ gap: space.md }}>
          {roomTypes.length === 0 ? (
            <EmptyBox icon={BedDouble} title="No cottages or rooms added yet" hint="Add details for at least one category." />
          ) : (
            roomTypes.map((r, index) => (
              <RoomCard
                key={r.id || index}
                name={r.name}
                price={`₹${r.pricePerNight}`}
                facts={[`Inventory: ${r.totalInventory}`, `Capacity: ${r.maxAdults}A, ${r.maxChildren}C`]}
                amenities={r.amenities || []}
                onEdit={() => w.startEditRoomType(index)}
                onDelete={() => w.deleteRoomType(index)}
                deleteLabel="Delete room"
              />
            ))
          )}

          <Button title="Add cottage / room" variant="secondary" icon={Plus} onPress={w.startAddRoomType} />
        </View>
      )}

      {rt && (
        <EditorPanel title={w.editingRoomTypeIndex === -1 || w.editingRoomTypeIndex == null ? 'Add cottage/room' : 'Edit cottage/room'} onClose={w.cancelEditRoomType}>
          <Field label="Name" accessibilityLabel="Cottage or room name" placeholder="e.g. Deluxe Beach Cottage" value={asText(rt.name)} onChangeText={(v) => w.setEditingRoomType({ ...rt, name: v })} />

          <View style={{ flexDirection: 'row', gap: space.md }}>
            <Num style={{ flex: 1 }} label="Price / night (₹)" accessibilityLabel="Price per night" value={rt.pricePerNight} onChangeText={(v) => w.setEditingRoomType({ ...rt, pricePerNight: v })} />
            <Num style={{ flex: 1 }} label="Total units" value={rt.totalInventory} onChangeText={(v) => w.setEditingRoomType({ ...rt, totalInventory: v })} />
          </View>
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <Num style={{ flex: 1 }} label="Max adults" value={rt.maxAdults} onChangeText={(v) => w.setEditingRoomType({ ...rt, maxAdults: v })} />
            <Num style={{ flex: 1 }} label="Max children" value={rt.maxChildren} onChangeText={(v) => w.setEditingRoomType({ ...rt, maxChildren: v })} />
          </View>
          <View style={{ flexDirection: 'row', gap: space.md }}>
            <Num style={{ flex: 1 }} label="Extra adult price (₹)" accessibilityLabel="Extra adult price" value={rt.extraAdultPrice} onChangeText={(v) => w.setEditingRoomType({ ...rt, extraAdultPrice: v })} />
            <Num style={{ flex: 1 }} label="Extra child price (₹)" accessibilityLabel="Extra child price" value={rt.extraChildPrice} onChangeText={(v) => w.setEditingRoomType({ ...rt, extraChildPrice: v })} />
          </View>

          <View style={{ gap: space.sm }}>
            <GroupLabel right={`${(rt.images || []).filter(Boolean).length} / 3 min`}>Photos</GroupLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {(rt.images || []).filter(Boolean).map((img, i) => (
                <PhotoTile key={i} uri={img} size={ROOM_PHOTO} removeLabel="Remove photo" onRemove={() => w.handleRemoveImage(img, 'room', i)} />
              ))}
              <AddPhotoTile size={ROOM_PHOTO} onPress={w.uploadRoomImages} disabled={!!uploading} loading={uploading === 'room'} label="Add room photos" />
            </View>
          </View>

          <View style={{ gap: space.sm }}>
            <GroupLabel>Amenities</GroupLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {ROOM_AMENITIES_OPTIONS.map((opt) => (
                <ToggleChip key={opt.key} label={opt.label} icon={opt.icon} selected={rt.amenities.includes(opt.label)} onPress={() => w.toggleRoomAmenity(opt.label)} />
              ))}
            </View>
          </View>

          <EditorActions onCancel={w.cancelEditRoomType} onConfirm={w.saveRoomType} confirmLabel="Save" />
        </EditorPanel>
      )}
    </View>
  );
}

export function StepRules({ w }) {
  const { propertyForm: f, updatePropertyForm: set } = w;
  return (
    <View style={{ gap: space.xl }}>
      <ErrorBanner message={w.error} />
      <View style={{ gap: space.lg }}>
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <Field style={{ flex: 1 }} label="Check-in time" right={clockIcon} placeholder="3:00 PM" value={asText(f.checkInTime)} onChangeText={(v) => set('checkInTime', v)} />
          <Field style={{ flex: 1 }} label="Check-out time" right={clockIcon} placeholder="11:00 AM" value={asText(f.checkOutTime)} onChangeText={(v) => set('checkOutTime', v)} />
        </View>

        <Field
          label="Cancellation policy"
          multiline
          inputStyle={{ minHeight: 100 }}
          placeholder="e.g., Free cancellation before 10 days..."
          value={asText(f.cancellationPolicy)}
          onChangeText={(v) => set('cancellationPolicy', v)}
        />

        <View style={{ gap: space.sm }}>
          <GroupLabel>Resort rules</GroupLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {HOUSE_RULES_OPTIONS.map((r) => (
              <ToggleChip key={r} label={r} selected={f.houseRules.includes(r)} onPress={() => set('houseRules', toggleIn(f.houseRules, r))} />
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
            onUpload={() => w.uploadDocument(idx)}
            onView={() => Linking.openURL(doc.fileUrl).catch(() => {})}
          />
        ))}
      </View>
    </View>
  );
}

export function StepReview({ w }) {
  const { propertyForm: f, roomTypes } = w;
  const resortTypeLabel = RESORT_TYPES.find((t) => t.value === f.resortType)?.label || `${f.resortType} resort`;
  return (
    <View style={{ gap: space.xl }}>
      <Notice tone="success" title="Review compliance" message="Please review the details below carefully before submitting." />

      <ErrorBanner message={w.error} />

      <View style={{ gap: space.md }}>
        <ReviewBlock title="Property details">
          <Text style={[type.subheading, { color: color.text }]}>{f.propertyName || 'No name'}</Text>
          <Text style={[type.label, { color: color.primary }]}>{resortTypeLabel}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.xs + 2 }}>
            <MapPin size={16} color={color.textMuted} style={{ marginTop: 2 }} />
            <Text style={[type.small, { flex: 1, color: color.textSecondary }]} numberOfLines={2}>
              {f.address.fullAddress || 'No address'}
            </Text>
          </View>
        </ReviewBlock>

        <ReviewBlock title={`Cottages & rooms (${roomTypes.length})`}>
          {roomTypes.length > 0 ? roomTypes.map((r, i) => <KeyValue key={i} label={r.name} value={`₹${r.pricePerNight}`} />) : <Notice tone="danger" message="No room types added!" />}
        </ReviewBlock>

        <ReviewBlock title={`Documents (${f.documents.filter((d) => d.fileUrl).length}/${f.documents.length})`}>
          {f.documents.map((doc, i) => (
            <ReviewDocLine key={i} name={doc.name} attached={Boolean(doc.fileUrl)} />
          ))}
        </ReviewBlock>
      </View>
    </View>
  );
}

export function StepDone({ w }) {
  return (
    <DoneState
      title="Registration submitted!"
      message="Your resort registration has been sent for verification. Our team will review it and get back to you shortly."
      actionLabel="Go to my properties"
      onAction={() => w.navigate('/hotel/partner/properties')}
    />
  );
}
