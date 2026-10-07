import { useWindowDimensions, View } from 'react-native';
import { Home, MapPin, Wifi } from 'lucide-react-native';
import { space } from '../../../../theme';
import { Field } from '../../../components/dashboard/partnerUi';
import { Grid, LocationButton, OptionCard, OrDivider, ResultList, SearchField, requiredLabel } from '../../../components/wizardUi';
import { ErrorBanner, HOTEL_AMENITIES, SearchStatus, SectionHeading } from './shared';

/*
 * Steps 1-3 (Basic Info, Location, Amenities) of
 * Frontend/src/modules/Hotel/app/partner/pages/AddHotelWizard.jsx.
 */

export function StepBasicInfo({ propertyForm, updatePropertyForm, error }) {
  return (
    <View style={{ gap: space.xl }}>
      <SectionHeading icon={Home} title="About your property" description="This is the first thing a guest sees in search results." />

      <ErrorBanner message={error} />

      <View style={{ gap: space.xl }}>
        <Field
          label={requiredLabel('Property name')}
          accessibilityLabel="Property name"
          placeholder="e.g. Grand Royal Hotel"
          value={propertyForm.propertyName}
          onChangeText={(v) => updatePropertyForm('propertyName', v)}
          hint="The name guests will see on the listing."
        />

        <Field
          label="Short description"
          accessibilityLabel="Short description"
          multiline
          maxLength={160}
          placeholder="A riverside stay a short walk from Maibang station."
          value={propertyForm.shortDescription}
          onChangeText={(v) => updatePropertyForm('shortDescription', v)}
          inputStyle={{ minHeight: 72 }}
          hint={`One line, shown under the name in listings. ${(propertyForm.shortDescription || '').length}/160`}
        />

        <Field
          label="Detailed description"
          accessibilityLabel="Detailed description"
          multiline
          inputStyle={{ minHeight: 128 }}
          placeholder={`Tell guests what makes your ${propertyForm.propertyType || 'hotel'} unique — the rooms, the view, what is nearby...`}
          value={propertyForm.description}
          onChangeText={(v) => updatePropertyForm('description', v)}
          hint="Appears on the property page. Take your time with this one."
        />

        <Field
          label="Contact number"
          accessibilityLabel="Contact number"
          keyboardType="phone-pad"
          placeholder="+91 98765 43210"
          value={propertyForm.contactNumber}
          onChangeText={(v) => updatePropertyForm('contactNumber', v)}
          hint="Used for guest enquiries about this property."
        />
      </View>
    </View>
  );
}

export function StepLocation({ propertyForm, updatePropertyForm, error, locationSearch, selectLocationResult, useCurrentLocation, loadingLocation }) {
  return (
    <View style={{ gap: space.lg }}>
      <SectionHeading icon={MapPin} title="Where is it?" description="Search for the address, then drop the pin exactly on the property." />
      <ErrorBanner message={error} />

      <View style={{ gap: space.sm }}>
        <SearchField
          label="Search address"
          placeholder="Search location..."
          value={locationSearch.query}
          onChangeText={locationSearch.setQuery}
          onSearch={locationSearch.searchNow}
        />
        <SearchStatus search={locationSearch} />
        <ResultList results={locationSearch.results} onSelect={selectLocationResult} secondary={(p) => p.formatted_address} />
      </View>

      <OrDivider label="Or enter manually" />

      <View style={{ gap: space.md }}>
        <Field label="Full address" placeholder="Full Address" value={propertyForm.address.fullAddress} onChangeText={(v) => updatePropertyForm(['address', 'fullAddress'], v)} />
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <Field style={{ flex: 1 }} label="City" placeholder="City" value={propertyForm.address.city} onChangeText={(v) => updatePropertyForm(['address', 'city'], v)} />
          <Field style={{ flex: 1 }} label="State" placeholder="State" value={propertyForm.address.state} onChangeText={(v) => updatePropertyForm(['address', 'state'], v)} />
        </View>
        <View style={{ flexDirection: 'row', gap: space.md }}>
          <Field style={{ flex: 1 }} label="Pincode" placeholder="Pincode" value={propertyForm.address.pincode} onChangeText={(v) => updatePropertyForm(['address', 'pincode'], v)} />
          <View style={{ flex: 1 }} />
        </View>
      </View>

      <LocationButton onPress={useCurrentLocation} loading={loadingLocation} label="Use current location" loadingLabel="Fetching location..." icon={MapPin} />
    </View>
  );
}

export function StepAmenities({ propertyForm, updatePropertyForm }) {
  const { width } = useWindowDimensions();
  return (
    <View style={{ gap: space.xl }}>
      <SectionHeading icon={Wifi} title="What do you offer?" description="Tap everything available to guests on the property." />

      <Grid columns={width >= 640 ? 3 : 2}>
        {HOTEL_AMENITIES.map((am) => (
          <OptionCard
            key={am}
            label={am}
            style={{ flex: 1 }}
            selected={propertyForm.amenities.includes(am)}
            onPress={() => {
              const has = propertyForm.amenities.includes(am);
              updatePropertyForm('amenities', has ? propertyForm.amenities.filter((x) => x !== am) : [...propertyForm.amenities, am]);
            }}
          />
        ))}
      </Grid>
    </View>
  );
}
