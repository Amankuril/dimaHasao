import { StyleSheet, Text, View } from 'react-native';
import { Calendar as CalendarIcon, Image as ImageIcon, ShoppingBag } from 'lucide-react-native';
import Img from '../../../components/Img';
import { Press } from '../../../components/ui';
import { color, radii, space, type } from '../../../theme';
import { Toggle } from '../../components/ui';
import { Field, Hint, Label, RemoveButton, Section, TimeSelector, UploadButton } from './parts';

/** Step 2 of the wizard: menu and profile photos, timings, open days and takeaway. */
export default function Step2({ o }) {
  const {
    step2, setStep2, openImageSourcePicker, getPreviewImageUrl, isUploadableFile, handleMenuImagesSelected, handleProfileImageSelected,
    handleRemoveMenuImage, handleRemoveProfileImage, daysOfWeek, toggleDay, setError,
    normalizeTimeValue, timeStringToMinutes, stringToTime, timeToString, formatTime12Hour,
  } = o;

  // The web refuses an opening/closing pair that is equal or backwards, with an inline message, and keeps the old value.
  const changeTime = (field, val) => {
    const next = normalizeTimeValue(val) || '';
    const opening = timeStringToMinutes(field === 'openingTime' ? next : step2.openingTime);
    const closing = timeStringToMinutes(field === 'closingTime' ? next : step2.closingTime);
    if (opening !== null && closing !== null) {
      if (opening === closing) {
        setError('Opening time and closing time cannot be same');
        return;
      }
      if (closing < opening) {
        setError('Closing time cannot be less than opening time');
        return;
      }
    }
    setStep2((prev) => ({ ...prev, [field]: next }));
  };

  const profileSrc = step2.profileImage ? getPreviewImageUrl(step2.profileImage) : null;

  return (
    <View style={{ gap: space.xxl }}>
      <Section title="Menu & photos" style={{ gap: space.xl }}>
        <Text style={styles.intro}>Add clear photos of your printed menu and a primary profile image. This helps customers understand what you serve.</Text>

        <View style={{ gap: space.sm }}>
          <Label>Menu images</Label>
          <View style={styles.dropzone}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={styles.dropIcon}>
                <ImageIcon size={20} color={color.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.dropTitle}>Upload menu images</Text>
                <Hint>JPG, PNG, WebP · You can add several photos</Hint>
              </View>
            </View>
            <UploadButton
              style={{ alignSelf: 'stretch' }}
              onPress={() =>
                openImageSourcePicker({
                  title: 'Add menu image',
                  fileNamePrefix: 'menu-image',
                  onSelectFile: (file) => handleMenuImagesSelected(file ? [file] : []),
                })
              }
            />
          </View>

          {step2.menuImages.length > 0 ? (
            <View style={styles.grid}>
              {step2.menuImages.map((file, idx) => {
                let imageUrl = null;
                let imageName = `Image ${idx + 1}`;
                if (isUploadableFile(file)) {
                  imageUrl = getPreviewImageUrl(file);
                  imageName = file.name || imageName;
                } else if (file?.url) {
                  imageUrl = file.url;
                  imageName = file.name || imageName;
                } else if (typeof file === 'string') {
                  imageUrl = file;
                }
                return (
                  <View key={`${idx}-${imageUrl || ''}`} style={styles.tile}>
                    <RemoveButton onPress={() => handleRemoveMenuImage(idx)} label={`Remove menu image ${idx + 1}`} style={{ position: 'absolute', top: space.xs + 2, right: space.xs + 2, zIndex: 30 }} />
                    {imageUrl ? (
                      <Img source={{ uri: imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityLabel={`Menu ${idx + 1}`} />
                    ) : (
                      <View style={styles.center}>
                        <Text style={[styles.dropHint, { textAlign: 'center' }]}>Preview unavailable</Text>
                      </View>
                    )}
                    <View style={styles.caption}>
                      <Text numberOfLines={1} style={styles.captionText}>{imageName}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>

        <View style={{ gap: space.sm }}>
          <Label>Restaurant profile image</Label>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View>
              <View style={styles.avatar}>
                {profileSrc ? (
                  <Img source={{ uri: profileSrc }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityLabel="Restaurant profile" />
                ) : (
                  <ImageIcon size={24} color={color.textMuted} />
                )}
              </View>
              {step2.profileImage ? <RemoveButton onPress={handleRemoveProfileImage} label="Remove profile image" style={{ position: 'absolute', top: -space.xs, right: -space.xs, zIndex: 10 }} /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.dropTitle}>Upload profile image</Text>
              <Hint>This will be shown on your listing card and restaurant page.</Hint>
            </View>
          </View>
          <UploadButton
            onPress={() =>
              openImageSourcePicker({
                title: 'Upload profile image',
                fileNamePrefix: 'profile-image',
                onSelectFile: handleProfileImageSelected,
              })
            }
          />
        </View>
      </Section>

      <Section style={{ gap: space.xl }}>
        <View style={{ gap: space.md }}>
          <Label>Outlet timings</Label>
          <View style={{ gap: space.lg }}>
            <TimeSelector label="Opening time" value={step2.openingTime || ''} onChange={(val) => changeTime('openingTime', val)} stringToTime={stringToTime} timeToString={timeToString} formatTime12Hour={formatTime12Hour} />
            <TimeSelector label="Closing time" value={step2.closingTime || ''} onChange={(val) => changeTime('closingTime', val)} stringToTime={stringToTime} timeToString={timeToString} formatTime12Hour={formatTime12Hour} />
          </View>
          <View>
            <Label>Estimated delivery time*</Label>
            <Field
              value={step2.estimatedDeliveryTime || ''}
              onChangeText={(text) => setStep2((prev) => ({ ...prev, estimatedDeliveryTime: text }))}
              style={{ marginTop: 4 }}
              placeholder="e.g., 25-30 mins"
              accessibilityLabel="Estimated delivery time"
            />
          </View>
        </View>

        <View style={{ gap: space.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <CalendarIcon size={16} color={color.textSecondary} />
            <Label>Open days</Label>
          </View>
          <Hint>Select the days your restaurant accepts delivery orders.</Hint>
          <View style={styles.days}>
            {daysOfWeek.map((day) => {
              const active = step2.openDays.includes(day);
              return (
                <Press key={day} scale={0.95} onPress={() => toggleDay(day)} accessibilityRole="checkbox" accessibilityLabel={day} accessibilityState={{ checked: active }} style={styles.dayWrap}>
                  <View style={[styles.day, active ? styles.dayOn : styles.dayOff]}>
                    <Text style={[styles.dayText, { color: active ? color.onPrimary : color.text }]}>{day.charAt(0)}</Text>
                  </View>
                </Press>
              );
            })}
          </View>
        </View>
      </Section>

      <Section style={{ gap: space.xl }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <ShoppingBag size={18} color={color.primary} />
              <Text style={styles.toggleTitle}>Takeaway (pickup) orders</Text>
            </View>
            <Hint style={{ marginTop: 2 }}>Enable this to allow customers to pick up orders themselves from your restaurant.</Hint>
          </View>
          <Toggle value={step2.isTakeawayEnabled} onValueChange={() => setStep2((prev) => ({ ...prev, isTakeawayEnabled: !prev.isTakeawayEnabled }))} accessibilityLabel="Takeaway orders" />
        </View>
      </Section>
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { ...type.small, color: color.textSecondary },
  dropzone: { marginTop: space.xs, borderWidth: 1.5, borderStyle: 'dashed', borderColor: color.borderStrong, borderRadius: radii.md, backgroundColor: color.surfaceMuted, padding: space.lg, gap: space.md, alignItems: 'stretch' },
  dropIcon: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' },
  dropTitle: { ...type.bodyStrong, color: color.text },
  dropHint: { ...type.caption, color: color.textMuted },
  grid: { marginTop: space.sm, flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  tile: { width: '47.5%', aspectRatio: 4 / 5, borderRadius: radii.md, overflow: 'hidden', backgroundColor: color.surfaceMuted },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.sm },
  caption: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: space.sm, paddingVertical: space.xs },
  captionText: { ...type.caption, color: color.textInverse },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: color.surfaceMuted, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: color.border },
  days: { marginTop: space.xs, flexDirection: 'row', gap: space.xs + 2 },
  dayWrap: { flex: 1 },
  day: { minHeight: 44, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, borderWidth: 1 },
  dayOn: { backgroundColor: color.primary, borderColor: color.primary },
  dayOff: { backgroundColor: color.surface, borderColor: color.borderStrong },
  dayText: { ...type.label },
  toggleTitle: { ...type.bodyStrong, color: color.text },
});
