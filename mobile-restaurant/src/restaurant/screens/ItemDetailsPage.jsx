import { ActivityIndicator, Image, KeyboardAvoidingView, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, Check, ChevronDown, ChevronLeft, ChevronRight, ImagePlus, Plus, Search, Trash2, X } from 'lucide-react-native';
import { BottomSheet, Dialog, SelectField } from '../../components/kit';
import { Button, Card, EmptyState, IconButton, SectionHeader } from '../../components/ds';
import Img from '../../components/Img';
import { toast } from '../../lib/notify';
import { Press } from '../../components/ui';
import { color, radii, space, type } from '../../theme';
import ImageSourcePicker from '../components/ImageSourcePicker';
import { useItemDetailsPage } from '../hooks/pages/useItemDetailsPage';
import { Field, FieldLabel, Input, Notice, PinnedBar, ScreenHeader, SheetPanel, StockSwitch, Switch, VegMark } from './inventory/partnerKit';

const dishFallbackImage = require('../assets/dish_fallback.webp');

const PREP_OPTIONS = [{ value: '', label: 'Select timing' }, ...['10-20 mins', '20-25 mins', '25-35 mins', '35-45 mins'].map((value) => ({ value, label: value }))];

/** The web's onChange cleaner for price inputs: digits and one dot. */
const cleanPrice = (raw) => {
  const value = String(raw).replace(/[₹\s,]/g, '').replace(/[^0-9.]/g, '');
  const parts = value.split('.');
  return parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : value;
};

const Rupee = <Text style={[type.bodyStrong, { color: color.textMuted }]}>₹</Text>;

/** Category diet scope: the FSSAI mark + word for Veg / Non-Veg, a plain pill for Both. */
function ScopeBadge({ scope }) {
  if (scope === 'Veg' || scope === 'Non-Veg') {
    return (
      <View style={styles.scope}>
        <VegMark veg={scope === 'Veg'} size={14} />
        <Text style={[type.caption, { color: color.textSecondary }]}>{scope === 'Veg' ? 'Veg' : 'Non-veg'}</Text>
      </View>
    );
  }
  return (
    <View style={styles.scope}>
      <Text style={[type.caption, { color: color.textSecondary }]}>Both</Text>
    </View>
  );
}

/** Veg / Non-veg choice: the FSSAI mark carries the colour, selection is brand green. */
function DietOption({ veg, selected, onPress }) {
  return (
    <Press scale={0.98} onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={veg ? 'Veg' : 'Non-veg'} style={[styles.diet, selected && styles.dietOn]}>
      <VegMark veg={veg} size={18} />
      <Text style={[type.bodyStrong, { flex: 1, color: color.text }]}>{veg ? 'Veg' : 'Non-veg'}</Text>
      {selected ? <Check size={18} color={color.primary} /> : null}
    </Press>
  );
}

function ConfirmDialog({ visible, onClose, title, children, cancelLabel = 'Cancel', confirmLabel, onConfirm, busy }) {
  return (
    <Dialog visible={visible} onClose={onClose} backdrop={color.overlay} panelStyle={styles.dialog}>
      <View style={styles.dialogIcon}>
        <Trash2 size={26} color={color.danger} />
      </View>
      <Text style={[type.heading, { color: color.text, textAlign: 'center' }]} accessibilityRole="header">{title}</Text>
      <Text style={[type.small, { color: color.textSecondary, textAlign: 'center', marginTop: space.sm, marginBottom: space.xl }]}>{children}</Text>
      <View style={{ flexDirection: 'row', gap: space.md, alignSelf: 'stretch' }}>
        <Button title={cancelLabel} variant="outline" onPress={onClose} disabled={busy} style={{ flex: 1 }} />
        <Button title={confirmLabel} variant="danger" onPress={onConfirm} disabled={busy} loading={busy} style={{ flex: 1 }} />
      </View>
    </Dialog>
  );
}

/** Port of Food/pages/restaurant/ItemDetailsPage.jsx (/food/restaurant/hub-menu/item/:id). */
export default function ItemDetailsPage() {
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const h = useItemDetailsPage();
  const {
    goBack, navigate, location, isNewItem, itemName, setItemName, category, selectedCategoryId, itemDescription, setItemDescription, foodType, setFoodType, isPureVegRestaurant,
    basePrice, setBasePrice, variants, preparationTime, setPreparationTime, isRecommended, setIsRecommended, isInStock, setIsInStock, images, setImages, setImageFiles, uploadingImages,
    isPhotoPickerOpen, setIsPhotoPickerOpen, currentImageIndex, setCurrentImageIndex, setDirection, direction, isCategoryPopupOpen, setIsCategoryPopupOpen, categorySearchQuery, setCategorySearchQuery,
    categorySearchInputRef, showRemoveImageConfirm, setShowRemoveImageConfirm, showDeleteItemConfirm, setShowDeleteItemConfirm, isDeletingItem, categories, loadingCategories,
    handleDeleteItem, maxNameLength, maxDescriptionLength, descriptionLength, minDescriptionLength, nameLength, currentApprovalStatus, currentRejectionReason, filteredCategories,
    handleImageAdd, handleCameraClick, onTouchStart, onTouchMove, onTouchEnd, goToNext, goToPrevious, handleCategorySelect, handleSave, handleVariantChange, handleAddVariant, handleRemoveVariant,
  } = h;
  void direction;
  const touch = (fn) => (e) => fn({ targetTouches: [{ clientX: e.nativeEvent.pageX }] });
  const openAddCategory = () => {
    setIsCategoryPopupOpen(false);
    navigate('/restaurant/menu-categories', { state: { backTo: location.pathname, openCategoryPopup: true } });
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: color.bg }}>
      <ScreenHeader title="Item details" subtitle={isNewItem ? 'Add a dish to your menu' : undefined} onBack={goBack} />

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        {!isNewItem && currentApprovalStatus === 'rejected' && currentRejectionReason ? (
          <Notice tone="danger" icon={X} title="Approval rejected">
            <Text style={[type.small, { color: color.text }]}>Reason: {currentRejectionReason}</Text>
            <Text style={[type.small, { color: color.textSecondary, marginTop: space.xs }]}>Update the dish and save to send it for approval again.</Text>
          </Notice>
        ) : null}

        <Card padded={false} style={{ overflow: 'hidden' }}>
          {images.length > 0 ? (
            <View>
              <View style={styles.photo} onTouchStart={touch(onTouchStart)} onTouchMove={touch(onTouchMove)} onTouchEnd={onTouchEnd}>
                {images[currentImageIndex] ? <Img source={{ uri: images[currentImageIndex] }} style={styles.fill} resizeMode="cover" accessibilityLabel={`${itemName} - Image ${currentImageIndex + 1}`} /> : null}
                {images.length > 1 ? (
                  <>
                    <IconButton icon={ChevronLeft} label="Previous image" variant="soft" onPress={goToPrevious} style={[styles.arrow, { left: space.md }]} />
                    <IconButton icon={ChevronRight} label="Next image" variant="soft" onPress={goToNext} style={[styles.arrow, { right: space.md }]} />
                    <View style={styles.counter}>
                      <Text style={[type.caption, { color: color.textInverse }]}>{currentImageIndex + 1} / {images.length}</Text>
                    </View>
                  </>
                ) : null}
                <IconButton icon={Trash2} label="Remove dish photo" variant="danger" onPress={() => setShowRemoveImageConfirm(true)} style={styles.removePhoto} />
              </View>
              {images.length > 1 ? (
                <View style={styles.dots}>
                  {images.map((_, index) => (
                    <Press
                      key={index}
                      scale={1}
                      hitSlop={10}
                      accessibilityLabel={`Image ${index + 1}`}
                      onPress={() => {
                        setDirection(index > currentImageIndex ? 1 : -1);
                        setCurrentImageIndex(index);
                      }}
                    >
                      <View style={[styles.dot, index === currentImageIndex && styles.dotOn]} />
                    </Press>
                  ))}
                </View>
              ) : null}
            </View>
          ) : (
            <View style={styles.photo}>
              <Image source={dishFallbackImage} style={[styles.fill, { opacity: 0.35 }]} resizeMode="cover" accessibilityLabel="Dish Fallback" />
              <View style={[StyleSheet.absoluteFill, styles.noPhoto]}>
                <View style={styles.noPhotoIcon}>
                  <Camera size={24} color={color.primary} />
                </View>
                <Text style={[type.bodyStrong, { color: color.text }]}>No photo yet</Text>
                <Text style={[type.caption, { color: color.textSecondary }]}>Optional · dishes with a photo sell better</Text>
              </View>
            </View>
          )}
          <View style={{ padding: space.md }}>
            <Button title={images.length > 0 ? 'Replace photo' : 'Add photo'} icon={ImagePlus} variant="secondary" onPress={handleCameraClick} />
          </View>
        </Card>

        <View>
          <SectionHeader title="Item" />
          <Card style={{ gap: space.lg }}>
            <Field label="Category">
              <Press scale={1} onPress={() => setIsCategoryPopupOpen(true)} accessibilityRole="button" accessibilityLabel={`Category: ${selectedCategoryId ? category : 'not selected'}`} style={styles.select}>
                <Text style={[type.body, { flex: 1, color: selectedCategoryId ? color.text : color.textMuted }]} numberOfLines={1}>{selectedCategoryId ? category : 'Select category'}</Text>
                <ChevronDown size={20} color={color.textMuted} />
              </Press>
            </Field>

            <View>
              <FieldLabel>Item name</FieldLabel>
              <Input value={itemName} onChangeText={setItemName} maxLength={maxNameLength} placeholder="Enter item name" accessibilityLabel="Item name" />
              <Text style={[styles.counterText, { textAlign: 'right' }]}>{nameLength} / {maxNameLength}</Text>
            </View>

            <View>
              <FieldLabel>Item description</FieldLabel>
              <Input
                value={itemDescription}
                onChangeText={setItemDescription}
                maxLength={maxDescriptionLength}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholder="E.g. Soft paneer patty with veggies, cheese and our special sauce"
                accessibilityLabel="Item description"
              />
              <View style={styles.counterRow}>
                <Text style={[styles.counterText, descriptionLength < minDescriptionLength ? { color: color.danger } : null]}>{descriptionLength < minDescriptionLength ? 'Min 5 characters required' : ''}</Text>
                <Text style={styles.counterText}>{descriptionLength} / {maxDescriptionLength}</Text>
              </View>
            </View>

            <View>
              <FieldLabel>Food type</FieldLabel>
              <View style={{ flexDirection: 'row', gap: space.sm }} accessibilityRole="radiogroup">
                <DietOption veg selected={foodType === 'Veg'} onPress={() => setFoodType('Veg')} />
                {!isPureVegRestaurant ? <DietOption veg={false} selected={foodType === 'Non-Veg'} onPress={() => setFoodType('Non-Veg')} /> : null}
              </View>
            </View>
          </Card>
        </View>

        <View>
          <SectionHeader title="Price" />
          <Card style={{ gap: space.lg }}>
            {variants.length === 0 ? (
              <Field label="Base price">
                <Input value={basePrice} onChangeText={(v) => setBasePrice(cleanPrice(v))} placeholder="Enter price" keyboardType="decimal-pad" accessibilityLabel="Base price" left={Rupee} style={styles.priceInput} />
              </Field>
            ) : (
              <Notice tone="primary">Customers will see the lowest variant price first.</Notice>
            )}

            <View style={styles.variants}>
              <View style={styles.variantsHead}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[type.bodyStrong, { color: color.text }]}>Variants</Text>
                  <Text style={[type.caption, { color: color.textMuted }]}>Optional · e.g. Half, Full, Small, Large</Text>
                </View>
                <Button title="Add variant" icon={Plus} size="sm" variant="secondary" fullWidth={false} onPress={handleAddVariant} style={{ minHeight: 44 }} />
              </View>

              {variants.length > 0 ? (
                <View style={{ gap: space.md }}>
                  {variants.map((variant, index) => (
                    <View key={variant.localId} style={styles.variant}>
                      <View style={{ flex: 1, minWidth: 0, gap: space.md }}>
                        <Field label="Variant name">
                          <Input value={variant.name} onChangeText={(v) => handleVariantChange(variant.localId, 'name', v)} placeholder={index === 0 ? 'e.g. Half' : 'e.g. Full'} accessibilityLabel={`Variant ${index + 1} name`} />
                        </Field>
                        <Field label="Variant price">
                          <Input value={variant.price} onChangeText={(v) => handleVariantChange(variant.localId, 'price', cleanPrice(v))} placeholder="Enter price" keyboardType="decimal-pad" accessibilityLabel={`Variant ${index + 1} price`} left={Rupee} style={styles.priceInput} />
                        </Field>
                      </View>
                      <IconButton icon={X} label={`Remove variant ${index + 1}`} variant="soft" onPress={() => handleRemoveVariant(variant.localId)} />
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={[type.small, { color: color.textMuted }]}>No variants added. This item uses the base price only.</Text>
              )}
            </View>

            <Field label="Preparation time">
              <SelectField value={preparationTime} options={PREP_OPTIONS} onChange={setPreparationTime} accessibilityLabel="Preparation time" chevronColor={color.textMuted} style={styles.select} textStyle={[type.body, { color: preparationTime ? color.text : color.textMuted }]} />
            </Field>
          </Card>
        </View>

        <View>
          <SectionHeader title="Availability" />
          <Card padded={false}>
            <View style={[styles.switchRow, styles.switchDivider]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[type.bodyStrong, { color: color.text }]}>Recommended</Text>
                <Text style={[type.caption, { color: color.textMuted }]}>Highlight this dish to customers</Text>
              </View>
              <Switch value={Boolean(isRecommended)} onValueChange={setIsRecommended} accessibilityLabel="Recommended" />
            </View>
            <View style={styles.switchRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[type.bodyStrong, { color: color.text }]}>Stock</Text>
                <Text style={[type.caption, { color: color.textMuted }]}>Out-of-stock items are hidden from customers</Text>
              </View>
              <StockSwitch value={Boolean(isInStock)} onValueChange={setIsInStock} accessibilityLabel="In stock" />
            </View>
          </Card>
        </View>

        {!isNewItem ? (
          <Button title="Delete item from menu" icon={Trash2} variant="dangerSoft" onPress={() => setShowDeleteItemConfirm(true)} />
        ) : null}
      </ScrollView>

      <PinnedBar style={{ flexDirection: 'row', gap: space.md }}>
        <Button title="Cancel" variant="outline" onPress={goBack} style={{ flex: 1 }} />
        <Button title={uploadingImages ? 'Saving…' : 'Save item'} loading={uploadingImages} disabled={uploadingImages} onPress={handleSave} style={{ flex: 2 }} />
      </PinnedBar>

      <BottomSheet visible={isCategoryPopupOpen} onClose={() => setIsCategoryPopupOpen(false)} backdrop={color.overlay}>
        <SheetPanel
          title="Select category"
          onClose={() => setIsCategoryPopupOpen(false)}
          right={<Button title="Add" icon={Plus} size="sm" variant="secondary" fullWidth={false} onPress={openAddCategory} accessibilityLabel="Add Category" style={{ minHeight: 44 }} />}
          style={{ height: winH * 0.85, paddingBottom: insets.bottom }}
        >
          <View style={{ paddingHorizontal: space.lg, paddingVertical: space.md }}>
            <Input
              ref={categorySearchInputRef}
              value={categorySearchQuery}
              onChangeText={setCategorySearchQuery}
              placeholder="Search categories"
              accessibilityLabel="Search categories"
              left={<Search size={18} color={color.textMuted} />}
              right={
                categorySearchQuery ? (
                  <Press onPress={() => setCategorySearchQuery('')} accessibilityLabel="Clear search" style={styles.clearBtn}>
                    <X size={18} color={color.textMuted} />
                  </Press>
                ) : null
              }
            />
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.lg, flexGrow: 1 }}>
            {loadingCategories ? (
              <View style={styles.center}><ActivityIndicator size="small" color={color.primary} /></View>
            ) : categories.length === 0 ? (
              <EmptyState title="No categories yet" message="Create a category, then add dishes to it." actionLabel="Add category" onAction={openAddCategory} />
            ) : filteredCategories.length === 0 ? (
              <View style={styles.center}><Text style={[type.body, { color: color.textMuted }]}>No matching categories found.</Text></View>
            ) : (
              <View style={{ gap: space.sm }}>
                {filteredCategories.map((cat) => {
                  const isSelected = String(selectedCategoryId || '') === String(cat.id);
                  return (
                    <Press key={cat.id} scale={1} onPress={() => handleCategorySelect(cat.id, cat.name)} accessibilityRole="radio" accessibilityState={{ selected: isSelected }} accessibilityLabel={cat.name} style={[styles.catRow, isSelected && styles.catRowOn]}>
                      <Text style={[type.bodyStrong, { flex: 1, minWidth: 0, color: color.text }]} numberOfLines={2}>{cat.name}</Text>
                      <ScopeBadge scope={cat.foodTypeScope} />
                      {isSelected ? <Check size={18} color={color.primary} /> : null}
                    </Press>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </SheetPanel>
      </BottomSheet>

      <ConfirmDialog
        visible={showRemoveImageConfirm}
        onClose={() => setShowRemoveImageConfirm(false)}
        title="Remove dish photo?"
        confirmLabel="Remove"
        onConfirm={() => {
          setImages([]);
          setImageFiles(new Map());
          setCurrentImageIndex(0);
          setShowRemoveImageConfirm(false);
          toast.info('Photo removed. Click SAVE to apply changes.');
        }}
      >
        The photo is removed once you tap <Text style={{ fontFamily: 'Poppins_600SemiBold' }}>Save item</Text>.
      </ConfirmDialog>

      <ConfirmDialog
        visible={showDeleteItemConfirm}
        onClose={() => (isDeletingItem ? null : setShowDeleteItemConfirm(false))}
        title="Delete this dish?"
        confirmLabel={isDeletingItem ? 'Deleting…' : 'Delete'}
        onConfirm={handleDeleteItem}
        busy={isDeletingItem}
      >
        <Text style={{ fontFamily: 'Poppins_600SemiBold' }}>{itemName || 'This item'}</Text> will be removed from your menu. This can&apos;t be undone.
      </ConfirmDialog>

      <ImageSourcePicker isOpen={isPhotoPickerOpen} onClose={() => setIsPhotoPickerOpen(false)} onFileSelect={handleImageAdd} title="Item Image" description="Choose how to upload your item image" fileNamePrefix="item-photo" />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: space.lg, gap: space.xxl, paddingBottom: space.xxxl },
  fill: { width: '100%', height: '100%' },
  photo: { width: '100%', aspectRatio: 4 / 3, backgroundColor: color.surfaceMuted, overflow: 'hidden' },
  arrow: { position: 'absolute', top: '50%', marginTop: -22, backgroundColor: 'rgba(255,255,255,0.92)' },
  removePhoto: { position: 'absolute', top: space.md, right: space.md },
  counter: { position: 'absolute', top: space.md, left: space.md, backgroundColor: color.overlay, paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: radii.pill },
  dots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, paddingTop: space.md },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.borderStrong },
  dotOn: { width: 24, backgroundColor: color.primary },
  noPhoto: { alignItems: 'center', justifyContent: 'center', gap: space.xs, padding: space.lg },
  noPhotoIcon: { width: 52, height: 52, borderRadius: radii.lg, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: space.xs },
  select: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface },
  counterRow: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md },
  counterText: { ...type.caption, color: color.textMuted, marginTop: space.xs },
  diet: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface },
  dietOn: { borderColor: color.primary, borderWidth: 2, backgroundColor: color.primarySoft },
  priceInput: { backgroundColor: color.surface },
  variants: { gap: space.md, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surfaceMuted, padding: space.md },
  variantsHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  variant: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface, padding: space.md },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, minHeight: 64 },
  switchDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  clearBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginRight: -space.xs },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 160 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 52, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, paddingHorizontal: space.lg, paddingVertical: space.sm },
  catRowOn: { borderColor: color.primary, borderWidth: 2, backgroundColor: color.primarySoft },
  scope: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.sm, height: 24, borderRadius: radii.pill, backgroundColor: color.surfaceMuted },
  dialog: { width: 340, maxWidth: '90%', backgroundColor: color.surface, borderRadius: radii.lg, padding: space.xxl, alignItems: 'center' },
  dialogIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: color.dangerSoft, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
});
