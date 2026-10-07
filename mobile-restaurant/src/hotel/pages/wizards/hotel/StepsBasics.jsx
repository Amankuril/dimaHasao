import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { CheckCircle, Home, MapPin, Wifi } from 'lucide-react-native';
import { Press } from '../../../../components/ui';
import { poppins, tw } from '../../../../theme';
import { HT, wizard } from '../../../theme';
import { ErrorBanner, HOTEL_AMENITIES, Label, SearchStatus, SectionHeading, WInput, useGridCell } from './shared';

/*
 * Steps 1-3 (Basic Info, Location, Amenities) of
 * Frontend/src/modules/Hotel/app/partner/pages/AddHotelWizard.jsx.
 */

export function StepBasicInfo({ propertyForm, updatePropertyForm, error }) {
  return (
    <View style={{ gap: 20 }}>
      <SectionHeading icon={Home} title="About your property" description="This is the first thing a guest sees in search results." />

      <ErrorBanner message={error} />

      <View style={{ gap: 20 }}>
        <View>
          <Label required>Property name</Label>
          <WInput placeholder="e.g. Grand Royal Hotel" value={propertyForm.propertyName} onChangeText={(v) => updatePropertyForm('propertyName', v)} />
          <Text style={wizard.hint}>The name guests will see on the listing.</Text>
        </View>

        <View>
          <Label>Short description</Label>
          <WInput
            multiline
            style={{ minHeight: 72 }}
            maxLength={160}
            placeholder="A riverside stay a short walk from Maibang station."
            value={propertyForm.shortDescription}
            onChangeText={(v) => updatePropertyForm('shortDescription', v)}
          />
          <View style={[styles.hintRow]}>
            <Text style={[wizard.hint, { marginTop: 0, flex: 1 }]}>One line, shown under the name in listings.</Text>
            <Text style={[wizard.hint, { marginTop: 0 }]}>{(propertyForm.shortDescription || '').length}/160</Text>
          </View>
        </View>

        <View>
          <Label>Detailed description</Label>
          <WInput
            multiline
            style={{ minHeight: 128 }}
            placeholder={`Tell guests what makes your ${propertyForm.propertyType || 'hotel'} unique — the rooms, the view, what is nearby...`}
            value={propertyForm.description}
            onChangeText={(v) => updatePropertyForm('description', v)}
          />
          <Text style={wizard.hint}>Appears on the property page. Take your time with this one.</Text>
        </View>

        <View>
          <Label>Contact number</Label>
          <WInput keyboardType="phone-pad" placeholder="+91 98765 43210" value={propertyForm.contactNumber} onChangeText={(v) => updatePropertyForm('contactNumber', v)} />
          <Text style={wizard.hint}>Used for guest enquiries about this property.</Text>
        </View>
      </View>
    </View>
  );
}

export function StepLocation({ propertyForm, updatePropertyForm, error, locationSearch, selectLocationResult, useCurrentLocation, loadingLocation }) {
  return (
    <View style={{ gap: 16 }}>
      <SectionHeading icon={MapPin} title="Where is it?" description="Search for the address, then drop the pin exactly on the property." />
      <ErrorBanner message={error} />

      <View style={{ gap: 8 }}>
        <Label>Search Address</Label>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <WInput
            style={{ flex: 1, width: undefined }}
            placeholder="Search location..."
            value={locationSearch.query}
            onChangeText={locationSearch.setQuery}
            returnKeyType="search"
            onSubmitEditing={locationSearch.searchNow}
          />
          <Press scale={0.97} onPress={locationSearch.searchNow} style={styles.searchBtn}>
            <Text style={styles.searchBtnText}>Search</Text>
          </Press>
        </View>
        <SearchStatus search={locationSearch} />
        {locationSearch.results.length > 0 ? (
          <View style={styles.results}>
            {locationSearch.results.map((p, i) => (
              <Press key={i} scale={1} onPress={() => selectLocationResult(p)} style={[styles.resultRow, i === locationSearch.results.length - 1 ? { borderBottomWidth: 0 } : null]}>
                <Text style={styles.resultName}>{p.name}</Text>
                <Text style={styles.resultAddr}>{p.formatted_address}</Text>
              </Press>
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.dividerWrap}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>Or Enter Manually</Text>
      </View>

      <View style={{ gap: 12 }}>
        <WInput placeholder="Full Address" value={propertyForm.address.fullAddress} onChangeText={(v) => updatePropertyForm(['address', 'fullAddress'], v)} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <WInput style={{ flex: 1, width: undefined }} placeholder="City" value={propertyForm.address.city} onChangeText={(v) => updatePropertyForm(['address', 'city'], v)} />
          <WInput style={{ flex: 1, width: undefined }} placeholder="State" value={propertyForm.address.state} onChangeText={(v) => updatePropertyForm(['address', 'state'], v)} />
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <WInput style={{ flex: 1, width: undefined }} placeholder="Pincode" value={propertyForm.address.pincode} onChangeText={(v) => updatePropertyForm(['address', 'pincode'], v)} />
          <View style={{ flex: 1 }} />
        </View>
      </View>

      <Press scale={0.98} onPress={useCurrentLocation} disabled={loadingLocation} style={[styles.locBtn, loadingLocation ? { opacity: 0.5 } : null]}>
        {loadingLocation ? (
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

export function StepAmenities({ propertyForm, updatePropertyForm }) {
  const cell = useGridCell(2, 3);
  return (
    <View style={{ gap: 20 }}>
      <SectionHeading icon={Wifi} title="What do you offer?" description="Tap everything available to guests on the property." />

      <View style={styles.grid}>
        {HOTEL_AMENITIES.map((am) => {
          const isSelected = propertyForm.amenities.includes(am);
          return (
            <Press
              key={am}
              scale={0.98}
              onPress={() => {
                const has = propertyForm.amenities.includes(am);
                updatePropertyForm('amenities', has ? propertyForm.amenities.filter((x) => x !== am) : [...propertyForm.amenities, am]);
              }}
              style={[styles.amenity, { width: cell }, isSelected ? styles.amenityOn : null]}
            >
              <Text style={[styles.amenityText, isSelected ? { color: '#fff' } : null]}>{am}</Text>
              {isSelected ? (
                <View style={styles.amenityCheck}>
                  <CheckCircle size={14} color="rgba(255,255,255,0.8)" />
                </View>
              ) : null}
            </Press>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hintRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 6 },
  searchBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: HT.primary, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  searchBtnText: { fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(700) },
  results: { borderWidth: 1, borderColor: tw.gray200, borderRadius: 12, overflow: 'hidden', marginTop: 4, backgroundColor: '#fff' },
  resultRow: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: tw.gray50 },
  resultName: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(500) },
  resultAddr: { fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(400) },
  dividerWrap: { paddingVertical: 8, alignItems: 'center', justifyContent: 'center' },
  dividerLine: { position: 'absolute', left: 0, right: 0, top: '50%', height: 1, backgroundColor: tw.gray200 },
  dividerText: { backgroundColor: '#fff', paddingHorizontal: 8, fontSize: 12, lineHeight: 16, color: tw.gray400, textTransform: 'uppercase', ...poppins(500) },
  locBtn: { width: '100%', paddingVertical: 16, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: HT.primary, backgroundColor: HT.primaryTint, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  locBtnText: { fontSize: 16, lineHeight: 24, color: HT.primary, ...poppins(700) },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  amenity: { padding: 16, borderRadius: 16, borderWidth: 1, borderColor: tw.gray200, backgroundColor: '#fff' },
  amenityOn: { backgroundColor: HT.primary, borderColor: HT.primary },
  amenityText: { fontSize: 14, lineHeight: 20, color: tw.gray600, ...poppins(600) },
  amenityCheck: { position: 'absolute', top: 8, right: 8 },
});
