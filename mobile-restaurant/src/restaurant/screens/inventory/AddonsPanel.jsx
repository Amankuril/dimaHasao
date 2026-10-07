import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { ImagePlus, PackagePlus } from 'lucide-react-native';
import { Button, Card, EmptyState, StatusBadge, formatINR } from '../../../components/ds';
import Img from '../../../components/Img';
import { Press } from '../../../components/ui';
import { color, radii, space, type } from '../../../theme';
import { Field, Input, StockSwitch } from './partnerKit';

const APPROVAL = { approved: ['Approved', 'success'], pending: ['Pending', 'warning'], rejected: ['Rejected', 'danger'] };

/** The "Add ons" tab body: the add-on form (when open), then the add-on cards. */
export default function AddonsPanel({
  isAddAddonOpen, addonName, setAddonName, addonDescription, setAddonDescription, addonPrice, setAddonPrice, addonImageFile, addonImagePreview, savingAddon,
  handleAddonImagePick, handleSaveAddon, resetAddonForm, setIsAddAddonOpen, loadingAddons, filteredAddons, hasActiveTools, handleAddonToggle,
}) {
  return (
    <>
      {isAddAddonOpen ? (
        <Card style={{ gap: space.lg }}>
          <Text style={[type.heading, { color: color.text }]} accessibilityRole="header">New add-on</Text>
          <Field label="Add-on name *">
            <Input value={addonName} onChangeText={setAddonName} placeholder="e.g. Coke, Chips" accessibilityLabel="Add-on name" />
          </Field>
          <Field label="Description" optional>
            <Input value={addonDescription} onChangeText={setAddonDescription} multiline numberOfLines={3} placeholder="Describe the add-on" accessibilityLabel="Description" />
          </Field>
          <Field label="Price (₹) *">
            <Input value={addonPrice} onChangeText={setAddonPrice} keyboardType="decimal-pad" placeholder="0.00" accessibilityLabel="Price in rupees" left={<Text style={[type.bodyStrong, { color: color.textMuted }]}>₹</Text>} />
          </Field>
          <Field label="Image" optional hint="One image · PNG, JPG, WEBP or HEIC up to 5 MB.">
            <Press scale={0.98} onPress={handleAddonImagePick} accessibilityLabel={addonImageFile ? 'Change image' : 'Upload image'} style={styles.pick}>
              {addonImagePreview ? (
                <Img source={{ uri: addonImagePreview }} style={styles.preview} resizeMode="cover" accessibilityLabel="Preview" />
              ) : (
                <View style={[styles.preview, styles.previewEmpty]}>
                  <ImagePlus size={24} color={color.primary} />
                </View>
              )}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={[type.bodyStrong, { color: color.text }]}>{addonImageFile?.name || 'Upload image'}</Text>
                <Text style={[type.caption, { color: addonImageFile ? color.success : color.textMuted }]}>{addonImageFile ? 'Image selected · tap to change' : 'Tap to choose from your device'}</Text>
              </View>
            </Press>
          </Field>
          <View style={styles.formActions}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => {
                resetAddonForm();
                setIsAddAddonOpen(false);
              }}
              style={{ flex: 1 }}
            />
            <Button title={savingAddon ? 'Saving…' : 'Submit for approval'} loading={savingAddon} onPress={handleSaveAddon} style={{ flex: 2 }} />
          </View>
        </Card>
      ) : null}

      {loadingAddons ? (
        <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: space.xxxl * 2 }}>
          <ActivityIndicator size="large" color={color.primary} />
        </View>
      ) : filteredAddons.length === 0 ? (
        <EmptyState icon={PackagePlus} title={hasActiveTools ? 'No matching add-ons' : 'No add-ons yet'} message={hasActiveTools ? 'Try a different search or filter.' : 'Add-ons you create will appear here.'} />
      ) : (
        <View style={{ gap: space.md }}>
          {filteredAddons.map((addon) => {
            const live = addon.isAvailable !== false;
            const approval = APPROVAL[addon.approvalStatus];
            const image = addon.images && addon.images.length > 0 && addon.images[0] ? addon.images[0] : null;
            return (
              <Card key={addon.id} style={{ gap: space.sm }}>
                <View style={styles.addonTop}>
                  {image ? <Img source={{ uri: image }} style={styles.addonImg} resizeMode="cover" accessibilityLabel={addon.name} /> : null}
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text style={[type.subheading, { color: color.text }]} numberOfLines={2}>{addon.name}</Text>
                    <Text style={[type.price, { color: color.text }]}>{formatINR(addon.price)}</Text>
                    {addon.description ? <Text style={[type.small, { color: color.textMuted }]} numberOfLines={3}>{addon.description}</Text> : null}
                  </View>
                </View>
                {approval ? <StatusBadge label={approval[0]} tone={approval[1]} /> : null}
                {addon.approvalStatus === 'rejected' && addon.rejectionReason ? <Text style={[type.small, { color: color.danger }]}>Reason: {addon.rejectionReason}</Text> : null}
                <View style={styles.addonFoot}>
                  <StockSwitch value={live} onLabel="Available" offLabel="Paused" onValueChange={(checked) => handleAddonToggle(addon.id, checked)} accessibilityLabel={`${addon.name} available`} />
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  pick: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radii.md, borderWidth: 1, borderStyle: 'dashed', borderColor: color.borderStrong, backgroundColor: color.surfaceMuted },
  preview: { width: 64, height: 64, borderRadius: radii.md },
  previewEmpty: { backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  formActions: { flexDirection: 'row', gap: space.md },
  addonTop: { flexDirection: 'row', gap: space.md },
  addonImg: { width: 72, height: 72, borderRadius: radii.md, backgroundColor: color.surfaceMuted },
  addonFoot: { flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border, paddingTop: space.xs },
});
