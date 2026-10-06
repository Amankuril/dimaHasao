import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { Press } from '../../../components/ui';
import { poppins, shadow, tw } from '../../../theme';
import { RT } from '../../theme';
import { Dropdown, Field, Hint, Label, Pill, Section } from './parts';

// The web's city list (a fixed Select).
const CITIES = ['Indore', 'Bhopal', 'Gwalior', 'Jabalpur', 'Mumbai', 'Pune', 'Delhi', 'Bangalore', 'Ahmedabad', 'Hyderabad', 'Chennai', 'Kolkata'];

/** Step 1 of the wizard: restaurant information, owner details, contact and location. */
export default function Step1({ o }) {
  const {
    step1, setStep1, isEditing, verifiedPhoneNumber, companyName, zones, zonesLoading,
    locationSearchValue, setLocationSearchValue, locationSuggestions, isSearchingLocation, selectLocationSuggestion,
    normalizeEmail, normalizePincode, formatNameToCapital,
  } = o;
  const loc = step1.location || {};
  const setLoc = (patch) => setStep1({ ...step1, location: { ...step1.location, ...patch } });
  const cityOptions = CITIES.map((c) => ({ value: c, label: c }));
  // A city filled in from the picked place that is not in the web's list still has to show.
  if (loc.city && !CITIES.includes(loc.city)) cityOptions.unshift({ value: loc.city, label: loc.city });
  const zoneOptions = zones.map((z) => {
    const id = String(z?._id || z?.id || '');
    return { value: id, label: z?.name || z?.zoneName || z?.serviceLocation || id };
  });

  return (
    <View style={{ gap: 24 }}>
      <Section title="Restaurant information" style={{ gap: 0 }}>
        <View style={{ gap: 12, marginTop: 16 }}>
          <View>
            <Label>Restaurant name*</Label>
            <Field
              value={step1.restaurantName || ''}
              onChangeText={(text) => setStep1({ ...step1, restaurantName: formatNameToCapital(text.replace(/[/-]/g, '')) })}
              style={{ marginTop: 4 }}
              placeholder="Customers will see this name"
              editable={isEditing}
              accessibilityLabel="Restaurant name"
            />
          </View>
          <View>
            <Label>Pure veg restaurant?*</Label>
            <View style={{ marginTop: 8, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
              <Pill label="Yes, Pure Veg" active={step1.pureVegRestaurant === true} activeColors={[tw.green600, tw.green600]} disabled={!isEditing} onPress={() => setStep1({ ...step1, pureVegRestaurant: true })} />
              <Pill label="No, Mixed Menu" active={step1.pureVegRestaurant === false} activeColors={[RT.nonVeg, RT.nonVeg]} disabled={!isEditing} onPress={() => setStep1({ ...step1, pureVegRestaurant: false })} />
            </View>
            <Hint style={{ marginTop: 4 }}>This helps users filter restaurants by dietary preference.</Hint>
          </View>
        </View>
      </Section>

      <Section title="Owner details" style={{ gap: 0 }}>
        <Text style={styles.lead}>These details will be used for all business communications and updates.</Text>
        <View style={{ gap: 16 }}>
          <View>
            <Label>Full name*</Label>
            <Field
              value={step1.ownerName || ''}
              onChangeText={(text) => setStep1({ ...step1, ownerName: formatNameToCapital(text.replace(/[^A-Za-z ]/g, '')) })}
              style={{ marginTop: 4 }}
              placeholder="Owner full name"
              editable={isEditing}
              accessibilityLabel="Owner full name"
            />
          </View>
          <View>
            <Label>Email address*</Label>
            <Field
              value={step1.ownerEmail || ''}
              onChangeText={(text) => setStep1({ ...step1, ownerEmail: normalizeEmail(text) })}
              style={{ marginTop: 4 }}
              placeholder="ritu@gmail.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={isEditing}
              accessibilityLabel="Email address"
            />
          </View>
          <View>
            <Label>Phone number*</Label>
            <Field
              value={step1.ownerPhone || ''}
              onChangeText={(text) => setStep1({ ...step1, ownerPhone: text.replace(/\D/g, '').slice(0, 10) })}
              style={{ marginTop: 4 }}
              placeholder="10 digit mobile number"
              keyboardType="number-pad"
              editable={isEditing && !verifiedPhoneNumber}
              accessibilityLabel="Phone number"
            />
          </View>
        </View>
      </Section>

      <Section title="Restaurant contact & location">
        <View>
          <Label>Primary contact number*</Label>
          <Field
            value={step1.primaryContactNumber || ''}
            onChangeText={(text) => setStep1({ ...step1, primaryContactNumber: text.replace(/\D/g, '').slice(0, 10) })}
            style={{ marginTop: 4 }}
            placeholder="Restaurant's primary contact number"
            keyboardType="number-pad"
            maxLength={10}
            editable={isEditing}
            accessibilityLabel="Primary contact number"
          />
          <Hint style={{ marginTop: 4 }}>Customers, delivery partners and {companyName} may call on this number for order support.</Hint>
        </View>

        <View style={{ gap: 12 }}>
          <Text style={styles.body}>Add your restaurant&apos;s location for order pick-up.</Text>
          <View>
            <Label>Service zone*</Label>
            <View style={{ marginTop: 4 }}>
              <Dropdown
                value={step1.zoneId || ''}
                options={zoneOptions}
                onChange={(zoneId) => setStep1({ ...step1, zoneId })}
                placeholder={zonesLoading ? 'Loading zones...' : 'Select a zone'}
                disabled={zonesLoading || !isEditing}
                accessibilityLabel="Service zone"
              />
            </View>
            <Hint style={{ marginTop: 4 }}>Choose the service zone where your restaurant will be available.</Hint>
          </View>

          <View>
            <Label>Search location</Label>
            <View style={{ marginTop: 4, justifyContent: 'center' }}>
              <Field
                value={locationSearchValue}
                onChangeText={setLocationSearchValue}
                placeholder="Start typing your restaurant address..."
                autoCorrect={false}
                accessibilityLabel="Search location"
                style={{ color: '#000', paddingRight: 36 }}
              />
              {isSearchingLocation ? <ActivityIndicator size="small" color={RT.accent} style={{ position: 'absolute', right: 12 }} /> : null}
            </View>
            {locationSuggestions.length > 0 ? (
              <View style={styles.suggestions}>
                {locationSuggestions.map((s, index) => (
                  <Press
                    key={s.id || index}
                    scale={1}
                    onPress={() => selectLocationSuggestion(s)}
                    accessibilityLabel={s.display}
                    style={[styles.suggestion, index < locationSuggestions.length - 1 ? { borderBottomWidth: 1, borderBottomColor: tw.gray100 } : null]}
                  >
                    <MapPin size={20} color="#DC2626" strokeWidth={2.5} />
                    <Text numberOfLines={2} style={styles.suggestionText}>{s.display}</Text>
                  </Press>
                ))}
              </View>
            ) : null}
            <Hint style={{ marginTop: 4 }}>Select a suggestion to auto-fill area/city/state/pincode and coordinates.</Hint>
          </View>

          <Field value={loc.addressLine1 || ''} onChangeText={(text) => setLoc({ addressLine1: text })} placeholder="Shop no. / building no. (optional)" accessibilityLabel="Shop or building number" />
          <Field value={loc.addressLine2 || ''} onChangeText={(text) => setLoc({ addressLine2: text })} placeholder="Floor / tower (optional)" accessibilityLabel="Floor or tower" />
          <Field value={loc.landmark || ''} onChangeText={(text) => setLoc({ landmark: text })} placeholder="Nearby landmark (optional)" accessibilityLabel="Nearby landmark" />
          <Field value={loc.area || ''} onChangeText={(text) => setLoc({ area: text })} placeholder="Area / Sector / Locality*" accessibilityLabel="Area, sector or locality" />
          <Dropdown value={loc.city || ''} options={cityOptions} onChange={(city) => setLoc({ city })} placeholder="Select City*" accessibilityLabel="City" />
          <Field value={loc.state || ''} onChangeText={(text) => setLoc({ state: text })} placeholder="State" accessibilityLabel="State" />
          <Field value={loc.pincode || ''} onChangeText={(text) => setLoc({ pincode: normalizePincode(text) })} placeholder="Pincode" keyboardType="number-pad" accessibilityLabel="Pincode" />
          <Hint style={{ marginTop: 4 }}>Please ensure that this address is the same as mentioned on your FSSAI license.</Hint>
        </View>
      </Section>
    </View>
  );
}

const styles = StyleSheet.create({
  lead: { fontSize: 14, lineHeight: 20, color: tw.gray600, marginTop: 16, marginBottom: 16, ...poppins(400) },
  body: { fontSize: 14, lineHeight: 20, color: tw.gray700, ...poppins(400) },
  suggestions: { marginTop: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: tw.gray200, borderRadius: 16, padding: 4, maxHeight: 280, ...shadow('lg') },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 6 },
  suggestionText: { flex: 1, fontSize: 14, lineHeight: 20, color: tw.gray800, ...poppins(600) },
});
