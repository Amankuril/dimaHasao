import { View } from 'react-native';
import { BedDouble, Coffee, Plus, ShowerHead, Snowflake, Tv, Wifi } from 'lucide-react-native';
import { Button } from '../../../../components/ds';
import { space } from '../../../../theme';
import { Field } from '../../../components/dashboard/partnerUi';
import { AddPhotoTile, EditorActions, EditorPanel, EmptyBox, GroupLabel, NumberField, PhotoTile, RoomCard, ToggleChip } from '../../../components/wizardUi';
import { ErrorBanner, SectionHeading } from './shared';

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

const PHOTO = 72;

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
    <View style={{ gap: space.xl }}>
      <SectionHeading icon={BedDouble} title="Rooms and rates" description="Add each room you sell, with its nightly rate and how many you have." />

      <ErrorBanner message={error} />

      {!editingRoomType ? (
        <View style={{ gap: space.md }}>
          {roomTypes.length === 0 ? (
            <EmptyBox icon={BedDouble} title="No room types added yet" hint="Add details for at least one room type." />
          ) : (
            roomTypes.map((rt, index) => (
              <RoomCard
                key={rt.id || index}
                name={rt.name || `Room type ${index + 1}`}
                price={`₹${rt.pricePerNight}`}
                facts={[`Inventory: ${rt.totalInventory}`, `Capacity: ${rt.maxAdults}A, ${rt.maxChildren}C`]}
                amenities={rt.amenities || []}
                onEdit={() => startEditRoomType(index)}
                onDelete={() => deleteRoomType(index)}
              />
            ))
          )}

          <Button title="Add room type" variant="secondary" icon={Plus} onPress={startAddRoomType} />
        </View>
      ) : (
        <EditorPanel title={editingRoomTypeIndex === -1 || editingRoomTypeIndex == null ? 'Add room type' : 'Edit room type'} onClose={cancelEditRoomType}>
          <Field label="Name" accessibilityLabel="Room type name" placeholder="e.g. Deluxe Suite" value={editingRoomType.name} onChangeText={set('name')} />

          <View style={{ flexDirection: 'row', gap: space.md }}>
            <NumberField style={{ flex: 1 }} label="Price / night (₹)" accessibilityLabel="Price per night" value={String(editingRoomType.pricePerNight ?? '')} onChangeText={set('pricePerNight')} />
            <NumberField style={{ flex: 1 }} label="Total rooms" accessibilityLabel="Total rooms" value={String(editingRoomType.totalInventory ?? '')} onChangeText={set('totalInventory')} />
          </View>

          <View style={{ flexDirection: 'row', gap: space.md }}>
            <NumberField style={{ flex: 1 }} label="Max adults" accessibilityLabel="Max adults" value={String(editingRoomType.maxAdults ?? '')} onChangeText={set('maxAdults')} />
            <NumberField style={{ flex: 1 }} label="Max children" accessibilityLabel="Max children" value={String(editingRoomType.maxChildren ?? '')} onChangeText={set('maxChildren')} />
          </View>

          <View style={{ flexDirection: 'row', gap: space.md }}>
            <NumberField style={{ flex: 1 }} label="Extra adult price (₹)" accessibilityLabel="Extra adult price" value={String(editingRoomType.extraAdultPrice ?? '')} onChangeText={set('extraAdultPrice')} />
            <NumberField style={{ flex: 1 }} label="Extra child price (₹)" accessibilityLabel="Extra child price" value={String(editingRoomType.extraChildPrice ?? '')} onChangeText={set('extraChildPrice')} />
          </View>

          <View style={{ gap: space.sm }}>
            <GroupLabel right={`${(editingRoomType.images || []).filter(Boolean).length} / 3 min`}>Room photos</GroupLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {(editingRoomType.images || []).filter(Boolean).map((img, i) => (
                <PhotoTile key={`${img}-${i}`} uri={img} size={PHOTO} removeLabel="Remove photo" onRemove={() => handleRemoveImage(img, 'room', i)} />
              ))}
              <AddPhotoTile size={PHOTO} onPress={pickRoomImages} disabled={!!uploading} loading={uploading === 'room'} label="Add room photos" />
            </View>
          </View>

          <View style={{ gap: space.sm }}>
            <GroupLabel>Amenities</GroupLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {ROOM_AMENITIES.map((opt) => (
                <ToggleChip key={opt.key} label={opt.label} icon={opt.icon} selected={editingRoomType.amenities.includes(opt.label)} onPress={() => toggleRoomAmenity(opt.label)} />
              ))}
            </View>
          </View>

          <EditorActions onCancel={cancelEditRoomType} onConfirm={saveRoomType} confirmLabel="Save room" />
        </EditorPanel>
      )}
    </View>
  );
}
