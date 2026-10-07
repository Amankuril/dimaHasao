import { View, useWindowDimensions } from 'react-native';
import { Image, MapPin, Plus } from 'lucide-react-native';
import { Button, StatusBadge } from '../../../../components/ds';
import { space } from '../../../../theme';
import { Field, sentence } from '../../../components/dashboard/partnerUi';
import {
  AddPhotoTile,
  CoverPhoto,
  EditorActions,
  EditorPanel,
  EmptyBox,
  GroupLabel,
  Grid,
  NumberField,
  PhotoTile,
  PlaceRow,
  ResultList,
  SearchField,
  FieldPair,
} from '../../../components/wizardUi';
import { ErrorBanner, NEARBY_TYPES, SearchStatus, SectionHeading, Select } from './shared';

/*
 * Steps 4-5 (Nearby Places, Property Images) of
 * Frontend/src/modules/Hotel/app/partner/pages/AddHotelWizard.jsx.
 */

const typeLabel = (value) => NEARBY_TYPES.find((t) => t.value === value)?.label || sentence(value);

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
    <View style={{ gap: space.xl }}>
      <SectionHeading icon={MapPin} title="What's nearby?" description="Stations, airports and landmarks help guests judge the location." />

      <ErrorBanner message={error} />

      {!isEditingSubItem ? (
        <View style={{ gap: space.md }}>
          {propertyForm.nearbyPlaces.map((place, idx) => (
            <PlaceRow
              key={idx}
              name={place.name}
              kind={typeLabel(place.type)}
              distanceKm={place.distanceKm}
              onEdit={() => startEditNearbyPlace(idx)}
              onDelete={() => deleteNearbyPlace(idx)}
            />
          ))}

          {propertyForm.nearbyPlaces.length === 0 ? <EmptyBox icon={MapPin} title="No nearby places added yet" hint="Add tourist spots, transport hubs, etc." /> : null}

          <Button title="Add nearby place" variant="secondary" icon={Plus} onPress={startAddNearbyPlace} disabled={propertyForm.nearbyPlaces.length >= 5} />
        </View>
      ) : (
        <EditorPanel title={editingNearbyIndex === -1 ? 'Add new place' : 'Edit place'} onClose={cancelEditNearbyPlace}>
          <View style={{ gap: space.sm }}>
            <SearchField label="Search place" placeholder="Type to search..." value={nearbySearch.query} onChangeText={nearbySearch.setQuery} onSearch={nearbySearch.searchNow} />
            <SearchStatus search={nearbySearch} />
            <ResultList results={nearbySearch.results.slice(0, 6)} onSelect={selectNearbyPlace} secondary={(p) => p.address || p.formatted_address} />
          </View>

          <Field label="Name" accessibilityLabel="Place name" value={tempNearbyPlace.name} onChangeText={(v) => setTempNearbyPlace({ ...tempNearbyPlace, name: v })} />
          <FieldPair>
            <Select label="Type" title="Type" value={tempNearbyPlace.type} options={NEARBY_TYPES} onChange={(v) => setTempNearbyPlace({ ...tempNearbyPlace, type: v })} />
            <NumberField
              label="Distance (km)"
              accessibilityLabel="Distance in km"
              value={String(tempNearbyPlace.distanceKm ?? '')}
              onChangeText={(v) => setTempNearbyPlace({ ...tempNearbyPlace, distanceKm: v })}
            />
          </FieldPair>

          <EditorActions onCancel={cancelEditNearbyPlace} onConfirm={saveNearbyPlace} confirmLabel="Save place" />
        </EditorPanel>
      )}
    </View>
  );
}

export function StepImages({ propertyForm, error, uploading, pickCover, pickGallery, handleRemoveImage }) {
  const { width } = useWindowDimensions();
  const wide = width >= 640;
  return (
    <View style={{ gap: space.xl }}>
      <SectionHeading icon={Image} title="Show the property" description="A strong cover photo is the single biggest driver of bookings." />

      <ErrorBanner message={error} />

      <View style={{ gap: space.sm }}>
        <GroupLabel right={<StatusBadge label="Required" tone="primary" />}>Cover image</GroupLabel>
        <CoverPhoto
          uri={propertyForm.coverImage}
          uploading={uploading === 'cover'}
          onPick={pickCover}
          onRemove={() => handleRemoveImage(propertyForm.coverImage, 'cover')}
          emptyLabel="Upload cover photo"
          uploadingLabel="Uploading..."
          changeLabel="Change image"
          height={wide ? 256 : 192}
        />
      </View>

      <View style={{ gap: space.md }}>
        <GroupLabel right={`${propertyForm.propertyImages.length} / 4 minimum`}>Gallery</GroupLabel>
        <Grid columns={wide ? 4 : 3} gap={space.sm + 2}>
          {propertyForm.propertyImages.map((img, i) => (
            <PhotoTile key={`${img}-${i}`} uri={img} onRemove={() => handleRemoveImage(img, 'gallery', i)} />
          ))}
          <AddPhotoTile key="add" onPress={pickGallery} disabled={!!uploading} loading={uploading === 'gallery'} label="Add gallery images" />
        </Grid>
      </View>
    </View>
  );
}
