import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { Upload } from 'lucide-react-native';
import Img from '../../../components/Img';
import { Press } from '../../../components/ui';
import { poppins, shadow, tw } from '../../../theme';
import { PrimaryButton, Toggle } from '../../components/ui';
import { RT } from '../../theme';

/** The "Add ons" tab body: the add-on form (when open), then the add-on cards. */
export default function AddonsPanel({
  isAddAddonOpen, addonName, setAddonName, addonDescription, setAddonDescription, addonPrice, setAddonPrice, addonImageFile, addonImagePreview, savingAddon,
  handleAddonImagePick, handleSaveAddon, resetAddonForm, setIsAddAddonOpen, loadingAddons, filteredAddons, hasActiveTools, handleAddonToggle,
}) {
  return (
    <>
      {isAddAddonOpen ? (
        <View style={styles.form}>
          <View style={{ gap: 16 }}>
            <View>
              <Text style={styles.label}>Add-on Name *</Text>
              <TextInput value={addonName} onChangeText={setAddonName} placeholder="e.g., Coke, Chips" placeholderTextColor={tw.gray400} style={styles.input} />
            </View>
            <View>
              <Text style={styles.label}>Description</Text>
              <TextInput value={addonDescription} onChangeText={setAddonDescription} multiline numberOfLines={3} textAlignVertical="top" placeholder="Describe the add-on..." placeholderTextColor={tw.gray400} style={[styles.input, { minHeight: 84 }]} />
            </View>
            <View>
              <Text style={styles.label}>Price (₹) *</Text>
              <TextInput value={addonPrice} onChangeText={setAddonPrice} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={tw.gray400} style={styles.input} />
            </View>
            <View>
              <Text style={styles.label}>Image (1 only)</Text>
              {addonImagePreview ? (
                <View style={{ marginBottom: 8 }}>
                  <Img source={{ uri: addonImagePreview }} style={{ width: 96, height: 96, borderRadius: 4, borderWidth: 1, borderColor: tw.gray200 }} resizeMode="cover" accessibilityLabel="Preview" />
                </View>
              ) : null}
              <Press scale={1} onPress={handleAddonImagePick} style={styles.pick}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Upload size={16} color={tw.gray500} />
                  <Text numberOfLines={1} style={{ flex: 1, fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(500) }}>{addonImageFile?.name || 'Upload image'}</Text>
                </View>
                <Text style={{ marginTop: 4, fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(400) }}>{addonImageFile ? 'Image selected successfully' : 'Tap to choose 1 image from your device'}</Text>
              </Press>
              <Text style={{ marginTop: 4, fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(400) }}>PNG, JPG, WEBP, HEIC up to 5MB.</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Press
                scale={1}
                onPress={() => {
                  resetAddonForm();
                  setIsAddAddonOpen(false);
                }}
                style={styles.cancel}
              >
                <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray700, ...poppins(500) }}>Cancel</Text>
              </Press>
              <PrimaryButton title="Submit for approval" loadingTitle="Saving..." loading={savingAddon} onPress={handleSaveAddon} style={{ borderRadius: 6, overflow: 'hidden' }} textStyle={{ fontSize: 14, lineHeight: 20, ...poppins(500) }} />
            </View>
          </View>
        </View>
      ) : null}

      {loadingAddons ? (
        <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
          <ActivityIndicator size="large" color={tw.slate400} />
        </View>
      ) : filteredAddons.length === 0 ? (
        <View style={[styles.empty, { paddingVertical: 80 }]}>
          <Text style={{ fontSize: 18, lineHeight: 28, color: tw.slate700, textAlign: 'center', ...poppins(600) }}>{hasActiveTools ? 'No matching add-ons found' : 'No add-ons available'}</Text>
          <Text style={{ marginTop: 8, fontSize: 14, lineHeight: 20, color: tw.slate500, textAlign: 'center', ...poppins(400) }}>{hasActiveTools ? 'Try changing your search or filters' : 'All add-ons will appear here'}</Text>
        </View>
      ) : (
        <View style={{ gap: 16 }}>
          {filteredAddons.map((addon) => {
            const live = addon.isAvailable !== false;
            return (
              <View key={addon.id} style={styles.card}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <Text style={{ fontSize: 16, lineHeight: 24, color: tw.slate950, ...poppins(600) }}>{addon.name}</Text>
                      <Chip bg={live ? tw.emerald50 : tw.slate100} fg={live ? RT.primaryStrong : tw.slate600} label={live ? 'Live' : 'Paused'} />
                      {addon.approvalStatus === 'approved' ? <Chip bg={tw.green100} fg={tw.green800} label="Approved" /> : null}
                      {addon.approvalStatus === 'pending' ? <Chip bg={tw.yellow100} fg={tw.yellow800} label="Pending" /> : null}
                      {addon.approvalStatus === 'rejected' ? <Chip bg={tw.red100} fg={tw.red800} label="Rejected" /> : null}
                    </View>
                    {addon.description ? <Text style={{ marginBottom: 8, fontSize: 14, lineHeight: 24, color: tw.slate600, ...poppins(400) }}>{addon.description}</Text> : null}
                    <Text style={{ fontSize: 16, lineHeight: 24, color: tw.slate950, ...poppins(700) }}>Rs. {addon.price}</Text>
                    {addon.approvalStatus === 'rejected' && addon.rejectionReason ? <Text style={{ marginTop: 8, fontSize: 12, lineHeight: 16, color: '#0A4D2B', ...poppins(500) }}>Reason: {addon.rejectionReason}</Text> : null}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                    {addon.images && addon.images.length > 0 && addon.images[0] ? (
                      <Img source={{ uri: addon.images[0] }} style={{ width: 80, height: 80, borderRadius: 16, borderWidth: 1, borderColor: tw.slate200 }} resizeMode="cover" accessibilityLabel={addon.name} />
                    ) : null}
                    <View style={{ borderRadius: 999, backgroundColor: tw.slate100, paddingHorizontal: 8, paddingVertical: 4 }}>
                      <Toggle value={live} onValueChange={(checked) => handleAddonToggle(addon.id, checked)} onColor="#16a34a" accessibilityLabel={`${addon.name} available`} />
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </>
  );
}

function Chip({ bg, fg, label }) {
  return (
    <View style={{ borderRadius: 999, backgroundColor: bg, paddingHorizontal: 10, paddingVertical: 4 }}>
      <Text style={{ fontSize: 11, lineHeight: 16, color: fg, ...poppins(600) }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { backgroundColor: '#fff', borderWidth: 1, borderColor: tw.gray200, borderRadius: 8, padding: 16, marginBottom: 16, ...shadow('sm') },
  label: { marginBottom: 4, fontSize: 14, lineHeight: 20, color: tw.gray700, ...poppins(500) },
  input: { borderWidth: 1, borderColor: tw.gray300, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8, fontSize: 16, color: tw.gray900, ...poppins(400) },
  pick: { borderWidth: 1, borderColor: tw.gray300, borderRadius: 6, backgroundColor: tw.gray50, paddingHorizontal: 12, paddingVertical: 12 },
  cancel: { borderWidth: 1, borderColor: tw.gray300, borderRadius: 6, paddingHorizontal: 16, paddingVertical: 8 },
  empty: { borderRadius: 28, borderWidth: 1, borderStyle: 'dashed', borderColor: tw.slate200, backgroundColor: 'rgba(255,255,255,0.7)', paddingHorizontal: 16 },
  card: { borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', backgroundColor: '#fff', padding: 16, ...shadow('xl') },
});
