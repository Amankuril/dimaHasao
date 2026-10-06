import { ActivityIndicator, KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, BadgeCheck, Check, Clock3, Edit2, Eye, EyeOff, Globe, Plus, Trash2, Upload, X } from 'lucide-react-native';
import { BottomSheet, SelectField } from '../../components/kit';
import Img from '../../components/Img';
import { Press } from '../../components/ui';
import { poppins, shadow, tw } from '../../theme';
import ImageSourcePicker from '../components/ImageSourcePicker';
import { PrimaryButton } from '../components/ui';
import { useMenuCategoriesPage } from '../hooks/pages/useMenuCategoriesPage';
import { RT } from '../theme';

/* approvalBadgeClass() / scopePillClass() answer with class names; these are the same looks. (amber-* is repainted by the restaurant theme.) */
const APPROVAL = {
  approved: { bg: tw.emerald50, fg: RT.primaryStrong, border: tw.emerald200 },
  rejected: { bg: tw.rose50, fg: tw.rose700, border: tw.rose200 },
  pending: { bg: RT.primarySoft, fg: RT.primaryStrong, border: tw.amber200 },
};
const SCOPE = {
  Veg: { bg: tw.green50, fg: RT.primaryStrong, border: tw.green200 },
  'Non-Veg': { bg: tw.red50, fg: tw.red700, border: tw.red200 },
  Both: { bg: tw.slate100, fg: tw.slate700, border: tw.slate200 },
};
const SCOPE_OPTIONS = ['Veg', 'Non-Veg', 'Both'].map((value) => ({ value, label: value }));

/** Port of Food/pages/restaurant/MenuCategoriesPage.jsx (/food/restaurant/menu-categories). */
export default function MenuCategoriesPage() {
  const insets = useSafeAreaInsets();
  const {
    goBack, loading, isPureVegRestaurant, showModal, editingCategory, formData, setFormData, imagePreview, uploadingImage, isPhotoPickerOpen, setIsPhotoPickerOpen, ownCategories,
    resetModal, openCreateModal, openEditModal, handleImageFileChange, handleImageClick, handleSaveCategory, handleDeleteCategory, handleToggleActive,
  } = useMenuCategoriesPage();
  const preview = imagePreview || formData.image;

  return (
    <View style={{ flex: 1, backgroundColor: tw.slate50 }}>
      <View style={[styles.header, { paddingTop: 12 + insets.top }]}>
        <Press onPress={goBack} accessibilityLabel="Go back" hitSlop={8} style={{ padding: 4 }}>
          <ArrowLeft size={20} color={tw.slate700} />
        </Press>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} accessibilityRole="header">Menu Categories</Text>
          <Text style={styles.subtitle}>Create categories, track approvals, and resubmit edits safely.</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 96 + insets.bottom, gap: 16 }}>
        <View style={styles.info}>
          <Text style={{ fontSize: 14, lineHeight: 20, color: tw.slate900, ...poppins(600) }}>How this works</Text>
          <Text style={{ marginTop: 8, fontSize: 14, lineHeight: 20, color: tw.slate600, ...poppins(400) }}>
            New categories stay pending until admin approval. Editing an approved category sends it back for review. Only approved categories can be used for food uploads.
          </Text>
        </View>

        <PrimaryButton title="Add Category" onPress={openCreateModal} style={{ borderRadius: 12, overflow: 'hidden' }} textStyle={{ fontSize: 16, lineHeight: 24 }}>
          <Plus size={20} color="#fff" />
        </PrimaryButton>

        {loading ? (
          <ActivityIndicator size="small" color={tw.slate500} style={{ paddingVertical: 48 }} />
        ) : ownCategories.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 18, lineHeight: 28, color: tw.slate900, textAlign: 'center', ...poppins(600) }}>No restaurant categories yet</Text>
            <Text style={{ marginTop: 8, fontSize: 14, lineHeight: 20, color: tw.slate500, textAlign: 'center', ...poppins(400) }}>
              Start with a category{isPureVegRestaurant ? ' for your pure veg menu.' : ' and choose whether it should accept veg, non-veg, or both kinds of dishes.'}
            </Text>
          </View>
        ) : (
          ownCategories.map((category) => {
            const status = category?.approvalStatus || 'pending';
            const approval = APPROVAL[String(status).toLowerCase()] || APPROVAL.pending;
            const scope = SCOPE[category?.foodTypeScope] || SCOPE.Both;
            const isEditable = category?.canEdit;
            const active = category?.isActive !== false;
            return (
              <View key={category._id || category.id} style={styles.card}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={styles.thumb}>
                    {category?.image ? (
                      <Img source={{ uri: category.image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    ) : (
                      <Text style={{ fontSize: 18, color: tw.slate500, ...poppins(700) }}>{String(category?.name || 'C').slice(0, 1).toUpperCase()}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 16, lineHeight: 24, color: tw.slate900, ...poppins(600) }}>{category.name}</Text>
                      <View style={[styles.pill, { backgroundColor: approval.bg, borderColor: approval.border }]}>
                        {status === 'approved' ? <BadgeCheck size={14} color={approval.fg} /> : <Clock3 size={14} color={approval.fg} />}
                        <Text style={[styles.pillText, { color: approval.fg }]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Text>
                      </View>
                      <View style={[styles.pill, { backgroundColor: scope.bg, borderColor: scope.border }]}>
                        <Text style={[styles.pillText, { color: scope.fg }]}>{category?.foodTypeScope || 'Both'}</Text>
                      </View>
                      {category?.isGlobal ? (
                        <View style={[styles.pill, { backgroundColor: '#f0f9ff', borderColor: '#bae6fd' }]}>
                          <Globe size={14} color="#0369a1" />
                          <Text style={[styles.pillText, { color: '#0369a1' }]}>Global</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={{ marginTop: 8, gap: 4 }}>
                      <Text style={styles.meta}>{category?.itemCount || 0} item(s) linked</Text>
                      <Text style={styles.meta}>
                        {category?.isGlobal
                          ? 'Admin controls this category now, so you can use it but not rename or delete it.'
                          : status === 'approved'
                            ? 'Editing this category will send it back for admin approval.'
                            : 'Foods can be added only after approval.'}
                      </Text>
                      {status === 'rejected' && category?.rejectionReason ? <Text style={[styles.meta, { color: tw.rose600 }]}>Reason: {category.rejectionReason}</Text> : null}
                    </View>
                  </View>
                </View>

                <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Press onPress={() => handleToggleActive(category)} disabled={!isEditable} accessibilityLabel={active ? 'Deactivate' : 'Activate'} style={[styles.action, { backgroundColor: tw.slate100 }, isEditable ? null : { opacity: 0.5 }]}>
                    {active ? <Eye size={16} color={tw.slate700} /> : <EyeOff size={16} color={tw.slate700} />}
                  </Press>
                  <Press onPress={() => openEditModal(category)} disabled={!isEditable} accessibilityLabel="Edit category" style={[styles.action, { backgroundColor: tw.blue50 }, isEditable ? null : { opacity: 0.5 }]}>
                    <Edit2 size={16} color={tw.blue700} />
                  </Press>
                  <Press onPress={() => handleDeleteCategory(category)} disabled={!category?.canDelete} accessibilityLabel="Delete category" style={[styles.action, { backgroundColor: tw.rose50 }, category?.canDelete ? null : { opacity: 0.5 }]}>
                    <Trash2 size={16} color={tw.rose700} />
                  </Press>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <BottomSheet visible={showModal && !isPhotoPickerOpen} onClose={resetModal} backdrop="rgba(0,0,0,0.5)">
        <KeyboardAvoidingView behavior="padding">
          <ScrollView keyboardShouldPersistTaps="handled" style={styles.sheet} contentContainerStyle={{ padding: 16, paddingBottom: 16 + insets.bottom }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, lineHeight: 28, color: tw.slate900, ...poppins(700) }}>{editingCategory ? 'Edit Category' : 'Create Category'}</Text>
                <Text style={styles.subtitle}>{editingCategory ? 'Any edit sends this category back for admin approval.' : 'Choose the diet scope carefully before sending it for approval.'}</Text>
              </View>
              <Press onPress={resetModal} accessibilityLabel="Close" hitSlop={8}>
                <X size={20} color={tw.slate600} />
              </Press>
            </View>

            <View style={{ gap: 16 }}>
              <View>
                <Text style={styles.label}>Category Name</Text>
                <TextInput value={formData.name} onChangeText={(name) => setFormData((prev) => ({ ...prev, name }))} placeholder="Enter category name" placeholderTextColor={tw.slate400} style={styles.input} />
              </View>
              <View>
                <Text style={styles.label}>Diet Scope</Text>
                {isPureVegRestaurant ? (
                  <Text style={styles.pureVeg}>Veg (Pure veg restaurant)</Text>
                ) : (
                  <SelectField value={formData.foodTypeScope} options={SCOPE_OPTIONS} onChange={(foodTypeScope) => setFormData((prev) => ({ ...prev, foodTypeScope }))} accessibilityLabel="Diet scope" style={styles.input} textStyle={{ fontSize: 16, color: tw.slate900, ...poppins(400) }} />
                )}
              </View>
              <View>
                <Text style={styles.label}>Optional Type Label</Text>
                <TextInput value={formData.type} onChangeText={(type) => setFormData((prev) => ({ ...prev, type }))} placeholder="Examples: Starters, Desserts, Drinks" placeholderTextColor={tw.slate400} style={styles.input} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {preview ? <Img source={{ uri: preview }} style={{ width: 64, height: 64, borderRadius: 16 }} resizeMode="cover" accessibilityLabel="Category preview" /> : null}
                <Press scale={0.98} onPress={handleImageClick} style={styles.upload}>
                  <Upload size={16} color={tw.slate700} />
                  <Text style={{ fontSize: 14, lineHeight: 20, color: tw.slate700, ...poppins(500) }}>Upload Image</Text>
                </Press>
              </View>
              <Press scale={1} onPress={() => setFormData((prev) => ({ ...prev, isActive: !prev.isActive }))} accessibilityRole="checkbox" accessibilityState={{ checked: Boolean(formData.isActive) }} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.check, formData.isActive ? { backgroundColor: RT.primary, borderColor: RT.primary } : null]}>{formData.isActive ? <Check size={12} color="#fff" strokeWidth={3} /> : null}</View>
                <Text style={{ fontSize: 14, lineHeight: 20, color: tw.slate700, ...poppins(400) }}>Keep category active</Text>
              </Press>
            </View>

            <View style={{ marginTop: 24, flexDirection: 'row', gap: 12 }}>
              <Press scale={0.98} onPress={resetModal} style={styles.cancel}>
                <Text style={{ fontSize: 16, lineHeight: 24, color: tw.slate700, ...poppins(500) }}>Cancel</Text>
              </Press>
              <PrimaryButton
                title={uploadingImage ? 'Uploading...' : editingCategory ? 'Save & Resubmit' : 'Create'}
                onPress={handleSaveCategory}
                disabled={uploadingImage}
                style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }}
                textStyle={{ fontSize: 16, lineHeight: 24, ...poppins(500) }}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </BottomSheet>

      <ImageSourcePicker isOpen={isPhotoPickerOpen} onClose={() => setIsPhotoPickerOpen(false)} onFileSelect={handleImageFileChange} title="Category Image" description="Choose how to upload your category image" fileNamePrefix="category-photo" />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.95)', borderBottomWidth: 1, borderBottomColor: tw.slate200, paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontSize: 20, lineHeight: 28, color: tw.slate900, ...poppins(700) },
  subtitle: { fontSize: 12, lineHeight: 16, color: tw.slate500, ...poppins(400) },
  info: { borderRadius: 16, borderWidth: 1, borderColor: tw.slate200, backgroundColor: '#fff', padding: 16 },
  empty: { borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: tw.slate300, backgroundColor: '#fff', paddingHorizontal: 24, paddingVertical: 48 },
  card: { borderRadius: 16, borderWidth: 1, borderColor: tw.slate200, backgroundColor: '#fff', padding: 16, ...shadow('sm') },
  thumb: { width: 64, height: 64, borderRadius: 16, overflow: 'hidden', backgroundColor: tw.slate100, alignItems: 'center', justifyContent: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 11, lineHeight: 16, ...poppins(600) },
  meta: { fontSize: 14, lineHeight: 20, color: tw.slate500, ...poppins(400) },
  action: { borderRadius: 12, padding: 8 },
  sheet: { maxHeight: '90%', backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  label: { marginBottom: 8, fontSize: 14, lineHeight: 20, color: tw.slate700, ...poppins(500) },
  input: { borderRadius: 12, borderWidth: 1, borderColor: tw.slate300, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: tw.slate900, ...poppins(400) },
  pureVeg: { borderRadius: 12, borderWidth: 1, borderColor: tw.green200, backgroundColor: tw.green50, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, lineHeight: 20, color: RT.primaryStrong, overflow: 'hidden', ...poppins(500) },
  upload: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, borderColor: tw.slate300, paddingHorizontal: 16, paddingVertical: 10 },
  check: { width: 16, height: 16, borderRadius: 3, borderWidth: 1, borderColor: tw.slate400, alignItems: 'center', justifyContent: 'center' },
  cancel: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: tw.slate300, paddingVertical: 12, alignItems: 'center' },
});
