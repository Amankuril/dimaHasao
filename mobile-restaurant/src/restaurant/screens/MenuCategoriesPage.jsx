import { ActivityIndicator, KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BadgeCheck, Clock3, Edit2, Eye, EyeOff, Globe, ImagePlus, Info, LayoutList, Plus, Trash2, XCircle } from 'lucide-react-native';
import { BottomSheet, SelectField } from '../../components/kit';
import { Button, Card, EmptyState, StatusBadge } from '../../components/ds';
import Img from '../../components/Img';
import { Press } from '../../components/ui';
import { color, radii, space, type } from '../../theme';
import ImageSourcePicker from '../components/ImageSourcePicker';
import { useMenuCategoriesPage } from '../hooks/pages/useMenuCategoriesPage';
import { CheckRow, Field, Input, Notice, PinnedBar, ScreenHeader, SheetPanel, VegMark } from './inventory/partnerKit';

const APPROVAL = {
  approved: { tone: 'success', icon: BadgeCheck },
  rejected: { tone: 'danger', icon: XCircle },
  pending: { tone: 'warning', icon: Clock3 },
};
const SCOPE_OPTIONS = ['Veg', 'Non-Veg', 'Both'].map((value) => ({ value, label: value }));

/** Diet scope: the FSSAI mark + word for Veg / Non-Veg; plain neutral pill for Both. */
function ScopePill({ scope }) {
  const veg = scope === 'Veg';
  const nonVeg = scope === 'Non-Veg';
  return (
    <View style={styles.scope}>
      {veg || nonVeg ? <VegMark veg={veg} size={14} /> : null}
      <Text style={[type.caption, { color: color.textSecondary, fontFamily: 'Poppins_600SemiBold' }]}>{veg ? 'Veg' : nonVeg ? 'Non-veg' : 'Veg and non-veg'}</Text>
    </View>
  );
}

/** Square action with icon + word (44 px tall). */
function Action({ icon: Icon, label, onPress, disabled, tone = 'neutral' }) {
  const fg = tone === 'danger' ? color.danger : color.primary;
  return (
    <Press onPress={onPress} disabled={disabled} accessibilityLabel={label} accessibilityState={{ disabled: Boolean(disabled) }} style={[styles.action, disabled && { opacity: 0.4 }]}>
      <Icon size={16} color={fg} />
      <Text style={[type.label, { color: fg }]}>{label}</Text>
    </Press>
  );
}

/** Port of Food/pages/restaurant/MenuCategoriesPage.jsx (/food/restaurant/menu-categories). */
export default function MenuCategoriesPage() {
  const insets = useSafeAreaInsets();
  const {
    goBack, loading, isPureVegRestaurant, showModal, editingCategory, formData, setFormData, imagePreview, uploadingImage, isPhotoPickerOpen, setIsPhotoPickerOpen, ownCategories,
    resetModal, openCreateModal, openEditModal, handleImageFileChange, handleImageClick, handleSaveCategory, handleDeleteCategory, handleToggleActive,
  } = useMenuCategoriesPage();
  const preview = imagePreview || formData.image;

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <ScreenHeader title="Menu categories" subtitle="Create, track approval and resubmit" onBack={goBack} />

      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxxl + insets.bottom, gap: space.md }}>
        <Notice tone="info" icon={Info} title="How approval works">
          New categories stay pending until an admin approves them. Editing an approved category sends it back for review. Only approved categories can hold dishes.
        </Notice>

        <Button title="Add category" icon={Plus} onPress={openCreateModal} />

        {loading ? (
          <ActivityIndicator size="small" color={color.primary} style={{ paddingVertical: space.xxxl + space.lg }} />
        ) : ownCategories.length === 0 ? (
          <EmptyState
            icon={LayoutList}
            title="No categories yet"
            message={`Start with a category${isPureVegRestaurant ? ' for your pure veg menu.' : ' and choose whether it takes veg, non-veg or both kinds of dishes.'}`}
          />
        ) : (
          ownCategories.map((category) => {
            const status = category?.approvalStatus || 'pending';
            const approval = APPROVAL[String(status).toLowerCase()] || APPROVAL.pending;
            const isEditable = category?.canEdit;
            const active = category?.isActive !== false;
            const count = category?.itemCount || 0;
            return (
              <Card key={category._id || category.id} style={{ gap: space.md }}>
                <View style={{ flexDirection: 'row', gap: space.md }}>
                  <View style={styles.thumb}>
                    {category?.image ? (
                      <Img source={{ uri: category.image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    ) : (
                      <Text style={[type.heading, { color: color.primary }]}>{String(category?.name || 'C').slice(0, 1).toUpperCase()}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text style={[type.subheading, { color: color.text }]} numberOfLines={2}>{category.name}</Text>
                    <Text style={[type.small, { color: color.textMuted }]}>
                      {count} item{count !== 1 ? 's' : ''} linked{active ? '' : ' · hidden'}
                    </Text>
                  </View>
                </View>
                <View style={styles.badges}>
                  <StatusBadge label={status.charAt(0).toUpperCase() + status.slice(1)} tone={approval.tone} icon={approval.icon} />
                  <ScopePill scope={category?.foodTypeScope || 'Both'} />
                  {category?.isGlobal ? <StatusBadge label="Global" tone="info" icon={Globe} /> : null}
                </View>
                <Text style={[type.small, { color: color.textSecondary }]}>
                  {category?.isGlobal
                    ? 'Admin controls this category now, so you can use it but not rename or delete it.'
                    : status === 'approved'
                      ? 'Editing this category will send it back for admin approval.'
                      : 'Foods can be added only after approval.'}
                </Text>
                {status === 'rejected' && category?.rejectionReason ? <Text style={[type.small, { color: color.danger }]}>Reason: {category.rejectionReason}</Text> : null}

                <View style={styles.actions}>
                  <Action icon={active ? Eye : EyeOff} label={active ? 'Deactivate' : 'Activate'} onPress={() => handleToggleActive(category)} disabled={!isEditable} />
                  <Action icon={Edit2} label="Edit" onPress={() => openEditModal(category)} disabled={!isEditable} />
                  <Action icon={Trash2} label="Delete" tone="danger" onPress={() => handleDeleteCategory(category)} disabled={!category?.canDelete} />
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      <BottomSheet visible={showModal && !isPhotoPickerOpen} onClose={resetModal} backdrop={color.overlay}>
        <KeyboardAvoidingView behavior="padding">
          <SheetPanel
            title={editingCategory ? 'Edit category' : 'Create category'}
            subtitle={editingCategory ? 'Any edit sends this category back for admin approval.' : 'Choose the diet scope carefully before sending it for approval.'}
            onClose={resetModal}
            style={{ maxHeight: '100%' }}
          >
            <ScrollView keyboardShouldPersistTaps="handled" style={styles.sheetScroll} contentContainerStyle={{ padding: space.lg, gap: space.lg }}>
              <Field label="Category name">
                <Input value={formData.name} onChangeText={(name) => setFormData((prev) => ({ ...prev, name }))} placeholder="Enter category name" accessibilityLabel="Category name" />
              </Field>
              <Field label="Diet scope">
                {isPureVegRestaurant ? (
                  <View style={[styles.select, { backgroundColor: color.surfaceMuted }]}>
                    <VegMark veg size={16} />
                    <Text style={[type.body, { color: color.text }]}>Veg (pure veg restaurant)</Text>
                  </View>
                ) : (
                  <SelectField value={formData.foodTypeScope} options={SCOPE_OPTIONS} onChange={(foodTypeScope) => setFormData((prev) => ({ ...prev, foodTypeScope }))} accessibilityLabel="Diet scope" chevronColor={color.textMuted} style={styles.select} textStyle={[type.body, { color: color.text }]} />
                )}
              </Field>
              <Field label="Type label" optional>
                <Input value={formData.type} onChangeText={(type_) => setFormData((prev) => ({ ...prev, type: type_ }))} placeholder="E.g. Starters, Desserts, Drinks" accessibilityLabel="Type label" />
              </Field>
              <Field label="Image" optional>
                <Press scale={0.98} onPress={handleImageClick} accessibilityLabel={preview ? 'Change image' : 'Upload image'} style={styles.upload}>
                  {preview ? (
                    <Img source={{ uri: preview }} style={styles.preview} resizeMode="cover" accessibilityLabel="Category preview" />
                  ) : (
                    <View style={[styles.preview, styles.previewEmpty]}>
                      <ImagePlus size={22} color={color.primary} />
                    </View>
                  )}
                  <Text style={[type.bodyStrong, { color: color.primary }]}>{preview ? 'Change image' : 'Upload image'}</Text>
                </Press>
              </Field>
              <CheckRow label="Keep category active" checked={Boolean(formData.isActive)} onPress={() => setFormData((prev) => ({ ...prev, isActive: !prev.isActive }))} />
            </ScrollView>
            <PinnedBar style={{ flexDirection: 'row', gap: space.md, elevation: 0, boxShadow: 'none' }}>
              <Button title="Cancel" variant="outline" onPress={resetModal} style={{ flex: 1 }} />
              <Button
                title={uploadingImage ? 'Uploading…' : editingCategory ? 'Save & resubmit' : 'Create'}
                onPress={handleSaveCategory}
                disabled={uploadingImage}
                loading={uploadingImage}
                style={{ flex: 2 }}
              />
            </PinnedBar>
          </SheetPanel>
        </KeyboardAvoidingView>
      </BottomSheet>

      <ImageSourcePicker isOpen={isPhotoPickerOpen} onClose={() => setIsPhotoPickerOpen(false)} onFileSelect={handleImageFileChange} title="Category Image" description="Choose how to upload your category image" fileNamePrefix="category-photo" />
    </View>
  );
}

const styles = StyleSheet.create({
  thumb: { width: 56, height: 56, borderRadius: radii.md, overflow: 'hidden', backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs + 2 },
  scope: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.sm + 2, height: 24, borderRadius: radii.pill, backgroundColor: color.surfaceMuted },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border, paddingTop: space.md },
  action: { flexGrow: 1, flexBasis: '30%', minWidth: 104, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs + 2, borderRadius: radii.md, backgroundColor: color.surfaceMuted, paddingHorizontal: space.sm },
  sheetScroll: { maxHeight: 520 },
  select: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface },
  upload: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radii.md, borderWidth: 1, borderStyle: 'dashed', borderColor: color.borderStrong, backgroundColor: color.surfaceMuted },
  preview: { width: 56, height: 56, borderRadius: radii.md },
  previewEmpty: { backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
});
