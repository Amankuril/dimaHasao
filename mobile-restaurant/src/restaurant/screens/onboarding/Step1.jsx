import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { Press } from '../../../components/ui';
import { color, elevation, radii, space, type } from '../../../theme';
import { Dropdown, Field, Hint, Label, Pill, Section } from './parts';

// The web's city list (a fixed Select).
const CITIES = ['Indore', 'Bhopal', 'Gwalior', 'Jabalpur', 'Mumbai', 'Pune', 'Delhi', 'Bangalore', 'Ahmedabad', 'Hyderabad', 'Chennai', 'Kolkata'];

/** Step 1 of the wizard: restaurant information, owner details, contact and location. */
export default function Step1({ o }) {
  const {
    step1, setStep1, isEditing, verifiedPhoneNumber, companyName, zones, zonesLoading,
    locationSearchValue, setLocationSearchValue, setIsLocationSearchFocused, isLocationSearchFocused, locationSuggestions, isSearchingLocation, selectLocationSuggestion,
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
    <View style={{ gap: space.xxl }}>
      <Section title="Restaurant information" style={{ gap: 0 }}>
        <View style={{ gap: space.lg, marginTop: space.lg }}>
          <View>
            <Label>Restaurant name*</Label>
            <Field
              value={step1.restaurantName || ''}
              onChangeText={(text) => setStep1({ ...step1, restaurantName: formatNameToCapital(text.replace(/[/-]/g, '')) })}
              style={{ marginTop: space.xs + 2 }}
              placeholder="Customers will see this name"
              editable={isEditing}
              accessibilityLabel="Restaurant name"
            />
          </View>
          <View>
            <Label>Pure veg restaurant?*</Label>
            <View style={{ marginTop: space.sm, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm }}>
              <Pill label="Yes, Pure Veg" active={step1.pureVegRestaurant === true} activeColors={[color.veg]} disabled={!isEditing} onPress={() => setStep1({ ...step1, pureVegRestaurant: true })} />
              <Pill label="No, Mixed Menu" active={step1.pureVegRestaurant === false} activeColors={[color.nonVeg]} disabled={!isEditing} onPress={() => setStep1({ ...step1, pureVegRestaurant: false })} />
            </View>
            <Hint style={{ marginTop: space.xs + 2 }}>This helps users filter restaurants by dietary preference.</Hint>
          </View>
        </View>
      </Section>

      <Section title="Owner details" style={{ gap: 0 }}>
        <Text style={styles.lead}>These details will be used for all business communications and updates.</Text>
        <View style={{ gap: space.lg }}>
          <View>
            <Label>Full name*</Label>
            <Field
              value={step1.ownerName || ''}
              onChangeText={(text) => setStep1({ ...step1, ownerName: formatNameToCapital(text.replace(/[^A-Za-z ]/g, '')) })}
              style={{ marginTop: space.xs + 2 }}
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
              style={{ marginTop: space.xs + 2 }}
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
              style={{ marginTop: space.xs + 2 }}
              placeholder="10 digit mobile number"
              keyboardType="number-pad"
              readOnly={Boolean(verifiedPhoneNumber)}
              editable={isEditing}
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
            style={{ marginTop: space.xs + 2 }}
            placeholder="Restaurant's primary contact number"
            keyboardType="number-pad"
            maxLength={10}
            editable={isEditing}
            accessibilityLabel="Primary contact number"
          />
          <Hint style={{ marginTop: space.xs + 2 }}>Customers, delivery partners and {companyName} may call on this number for order support.</Hint>
        </View>

        <View style={{ gap: space.md }}>
          <Text style={styles.body}>Add your restaurant&apos;s location for order pick-up.</Text>
          <View>
            <Label>Service zone*</Label>
            <View style={{ marginTop: space.xs + 2 }}>
              <Dropdown
                value={step1.zoneId || ''}
                options={zoneOptions}
                onChange={(zoneId) => setStep1({ ...step1, zoneId })}
                placeholder={zonesLoading ? 'Loading zones...' : 'Select a zone'}
                disabled={zonesLoading || !isEditing}
                accessibilityLabel="Service zone"
              />
            </View>
            <Hint style={{ marginTop: space.xs + 2 }}>Choose the service zone where your restaurant will be available.</Hint>
          </View>

          <View>
            <Label>Search location</Label>
            <View style={{ marginTop: 4, justifyContent: 'center' }}>
              <Field
                value={locationSearchValue}
                onChangeText={setLocationSearchValue}
                placeholder={isLocationSearchFocused ? '' : 'Start typing your restaurant address...'}
                onFocus={() => setIsLocationSearchFocused(true)}
                onBlur={() => setIsLocationSearchFocused(false)}
                autoCorrect={false}
                accessibilityLabel="Search location"
                style={{ paddingRight: 40 }}
              />
              {isSearchingLocation ? <ActivityIndicator size="small" color={color.primary} style={{ position: 'absolute', right: space.md }} /> : null}
            </View>
            {locationSuggestions.length > 0 ? (
              <ScrollView style={styles.suggestions} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {locationSuggestions.map((s, index) => (
                  <Press
                    key={s.id || index}
                    scale={1}
                    onPress={() => selectLocationSuggestion(s)}
                    accessibilityLabel={s.display}
                    style={[styles.suggestion, index < locationSuggestions.length - 1 ? styles.suggestionDivider : null]}
                  >
                    <MapPin size={18} color={color.primary} />
                    <Text numberOfLines={2} style={styles.suggestionText}>{s.display}</Text>
                  </Press>
                ))}
              </ScrollView>
            ) : null}
            <Hint style={{ marginTop: space.xs + 2 }}>Select a suggestion to auto-fill area/city/state/pincode and coordinates.</Hint>
          </View>

          <Field value={loc.addressLine1 || ''} onChangeText={(text) => setLoc({ addressLine1: text })} placeholder="Shop no. / building no. (optional)" accessibilityLabel="Shop or building number" />
          <Field value={loc.addressLine2 || ''} onChangeText={(text) => setLoc({ addressLine2: text })} placeholder="Floor / tower (optional)" accessibilityLabel="Floor or tower" />
          <Field value={loc.landmark || ''} onChangeText={(text) => setLoc({ landmark: text })} placeholder="Nearby landmark (optional)" accessibilityLabel="Nearby landmark" />
          <Field value={loc.area || ''} onChangeText={(text) => setLoc({ area: text })} placeholder="Area / Sector / Locality*" accessibilityLabel="Area, sector or locality" />
          <Dropdown value={loc.city || ''} options={cityOptions} onChange={(city) => setLoc({ city })} placeholder="Select City*" accessibilityLabel="City" />
          <Field value={loc.state || ''} onChangeText={(text) => setLoc({ state: text })} placeholder="State" accessibilityLabel="State" />
          <Field value={loc.pincode || ''} onChangeText={(text) => setLoc({ pincode: normalizePincode(text) })} placeholder="Pincode" keyboardType="number-pad" accessibilityLabel="Pincode" />
          <Hint style={{ marginTop: space.xs + 2 }}>Please ensure that this address is the same as mentioned on your FSSAI license.</Hint>
        </View>
      </Section>
    </View>
  );
}

const styles = StyleSheet.create({
  lead: { ...type.small, color: color.textSecondary, marginTop: space.md, marginBottom: space.lg },
  body: { ...type.body, color: color.textSecondary },
  suggestions: { marginTop: space.xs + 2, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, borderRadius: radii.md, padding: space.xs, maxHeight: 280, ...elevation.float },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 48, paddingVertical: space.sm, paddingHorizontal: space.sm },
  suggestionDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  suggestionText: { flex: 1, ...type.small, color: color.text },
});
