import { ActivityIndicator, Image, KeyboardAvoidingView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Camera, Check, ChevronDown, ChevronLeft, ChevronRight, Edit, Plus, Search, Trash2, X } from 'lucide-react-native';
import { BottomSheet, Dialog, SelectField } from '../../components/kit';
import Img from '../../components/Img';
import { toast } from '../../lib/notify';
import { Press } from '../../components/ui';
import { poppins, shadow, tw } from '../../theme';
import ImageSourcePicker from '../components/ImageSourcePicker';
import { Toggle } from '../components/ui';
import { useItemDetailsPage } from '../hooks/pages/useItemDetailsPage';
import { RT, RT_GRADIENT } from '../theme';

const dishFallbackImage = require('../assets/dish_fallback.webp');

const PREP_OPTIONS = [{ value: '', label: 'Select timing' }, ...['10-20 mins', '20-25 mins', '25-35 mins', '35-45 mins'].map((value) => ({ value, label: value }))];

/** The web's onChange cleaner for price inputs: digits and one dot. */
const cleanPrice = (raw) => {
  const value = String(raw).replace(/[₹\s,]/g, '').replace(/[^0-9.]/g, '');
  const parts = value.split('.');
  return parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : value;
};

function Field({ label, small, children }) {
  return (
    <View>
      <Text style={small ? styles.labelSm : styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function ScopeBadge({ scope, selected }) {
  if (scope === 'Veg' || scope === 'Non-Veg') {
    const veg = scope === 'Veg';
    const border = selected ? (veg ? tw.green400 : '#fff') : veg ? tw.green600 : tw.red600;
    const box = selected ? (veg ? { borderColor: tw.green400, backgroundColor: 'rgba(20,83,45,0.4)', color: tw.green300 } : { borderColor: 'rgba(255,255,255,0.4)', backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff' }) : veg ? { borderColor: RT.softBorder, backgroundColor: tw.green50, color: RT.primaryStrong } : { borderColor: tw.red300, backgroundColor: tw.red50, color: tw.red700 };
    return (
      <View style={[styles.badge, { borderColor: box.borderColor, backgroundColor: box.backgroundColor }]}>
        <View style={[styles.badgeBox, { borderColor: border }]}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: border }} />
        </View>
        <Text style={[styles.badgeText, { color: box.color }]}>{scope}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.badge, selected ? { borderColor: 'rgba(255,255,255,0.4)', backgroundColor: 'rgba(255,255,255,0.15)' } : { borderColor: tw.slate200, backgroundColor: tw.slate100 }]}>
      <Text style={[styles.badgeText, { color: selected ? '#fff' : tw.slate600 }]}>Both</Text>
    </View>
  );
}

/** Port of Food/pages/restaurant/ItemDetailsPage.jsx (/food/restaurant/hub-menu/item/:id). */
export default function ItemDetailsPage() {
  const insets = useSafeAreaInsets();
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
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={[styles.header, { paddingTop: 12 + insets.top }]}>
        <Press onPress={goBack} accessibilityLabel="Go back" hitSlop={8} style={{ padding: 4 }}>
          <ArrowLeft size={20} color={tw.gray700} />
        </Press>
        <Text style={styles.title} accessibilityRole="header">Item details</Text>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
        {!isNewItem && currentApprovalStatus === 'rejected' && currentRejectionReason ? (
          <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
            <View style={styles.rejected}>
              <Text style={{ fontSize: 14, lineHeight: 20, color: tw.red700, ...poppins(600) }}>Approval rejected</Text>
              <Text style={{ marginTop: 4, fontSize: 14, lineHeight: 20, color: RT.primary, ...poppins(400) }}>Reason: {currentRejectionReason}</Text>
              <Text style={{ marginTop: 8, fontSize: 12, lineHeight: 16, letterSpacing: 2.2, color: RT.primary, ...poppins(500) }}>UPDATE THE DISH AND SAVE TO SEND IT FOR APPROVAL AGAIN</Text>
            </View>
          </View>
        ) : null}

        <View style={{ backgroundColor: '#fff' }}>
          {images.length > 0 ? (
            <View>
              <View style={{ width: '100%', height: 320, overflow: 'hidden', backgroundColor: tw.gray100 }} onTouchStart={touch(onTouchStart)} onTouchMove={touch(onTouchMove)} onTouchEnd={onTouchEnd}>
                {images[currentImageIndex] ? <Img source={{ uri: images[currentImageIndex] }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityLabel={`${itemName} - Image ${currentImageIndex + 1}`} /> : null}
                {images.length > 1 ? (
                  <>
                    <Press onPress={goToPrevious} accessibilityLabel="Previous image" style={[styles.arrow, { left: 12 }]}>
                      <ChevronLeft size={20} color={tw.gray900} />
                    </Press>
                    <Press onPress={goToNext} accessibilityLabel="Next image" style={[styles.arrow, { right: 12 }]}>
                      <ChevronRight size={20} color={tw.gray900} />
                    </Press>
                  </>
                ) : null}
                <Press onPress={() => setShowRemoveImageConfirm(true)} accessibilityLabel="Remove Dish Photo" style={styles.removePhoto}>
                  <Trash2 size={20} color="#fff" strokeWidth={2.2} />
                </Press>
                {images.length > 1 ? (
                  <View style={styles.counter}>
                    <Text style={{ fontSize: 12, lineHeight: 16, color: '#fff', ...poppins(500) }}>{currentImageIndex + 1} / {images.length}</Text>
                  </View>
                ) : null}
              </View>
              {images.length > 1 ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, backgroundColor: '#fff' }}>
                  {images.map((_, index) => (
                    <Press
                      key={index}
                      scale={1}
                      accessibilityLabel={`Image ${index + 1}`}
                      onPress={() => {
                        setDirection(index > currentImageIndex ? 1 : -1);
                        setCurrentImageIndex(index);
                      }}
                    >
                      {index === currentImageIndex ? (
                        <LinearGradient colors={RT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 32, height: 8, borderRadius: 4 }} />
                      ) : (
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tw.gray300 }} />
                      )}
                    </Press>
                  ))}
                </View>
              ) : null}
            </View>
          ) : (
            <View style={{ width: '100%', height: 320, backgroundColor: tw.gray100, overflow: 'hidden' }}>
              <Image source={dishFallbackImage} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityLabel="Dish Fallback" />
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' }]}>
                <View style={styles.noImage}>
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: tw.gray100, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                    <Camera size={24} color={tw.gray600} />
                  </View>
                  <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(700) }}>No Image Uploaded</Text>
                  <Text style={{ marginTop: 2, fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(400) }}>Optional: Tap button below to add a photo</Text>
                </View>
              </View>
            </View>
          )}

          <View style={{ paddingHorizontal: 16, paddingVertical: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: tw.gray100 }}>
            <Press scale={0.95} onPress={handleCameraClick} style={shadow('md')}>
              <LinearGradient colors={RT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.addImage}>
                <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={16} color="#fff" />
                </View>
                <Text style={{ fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(600) }}>{images.length > 0 ? 'Replace Image' : 'Add Image (Optional)'}</Text>
              </LinearGradient>
            </Press>
          </View>
        </View>

        <View style={{ padding: 16, gap: 12 }}>
          <Field label="Category">
            <Press scale={1} onPress={() => setIsCategoryPopupOpen(true)} style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 8 }]}>
              <Text style={{ fontSize: 14, lineHeight: 20, color: selectedCategoryId ? tw.gray900 : tw.gray400, ...poppins(400) }}>{selectedCategoryId ? category : 'Select category'}</Text>
              <ChevronDown size={20} color={tw.gray500} />
            </Press>
          </Field>

          <Field label="Item name">
            <View>
              <TextInput value={itemName} onChangeText={setItemName} maxLength={maxNameLength} placeholder="Enter item name" placeholderTextColor={tw.gray400} style={[styles.input, styles.text, { paddingRight: 48 }]} />
              <View style={styles.editIcon} pointerEvents="none"><Edit size={16} color={tw.gray500} /></View>
            </View>
            <View style={{ alignItems: 'flex-end', marginTop: 4 }}>
              <Text style={styles.count}>{nameLength} / {maxNameLength}</Text>
            </View>
          </Field>

          <View style={{ marginTop: -4 }}>
            <Text style={styles.label}>Item description</Text>
            <View>
              <TextInput
                value={itemDescription}
                onChangeText={setItemDescription}
                maxLength={maxDescriptionLength}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholder="Eg: Yummy veg paneer burger with a soft patty, veggies, cheese, and special sauce"
                placeholderTextColor={tw.gray400}
                style={[styles.input, styles.text, { paddingRight: 48, minHeight: 112 }]}
              />
              <View style={[styles.editIcon, { top: 12 }]} pointerEvents="none"><Edit size={16} color={tw.gray500} /></View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={[styles.count, descriptionLength < minDescriptionLength ? { color: RT.primary } : null]}>{descriptionLength < minDescriptionLength ? 'Min 5 characters required' : ''}</Text>
              <Text style={styles.count}>{descriptionLength} / {maxDescriptionLength}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <Press scale={1} onPress={() => setFoodType('Veg')} style={[styles.diet, foodType === 'Veg' ? { borderColor: tw.green600, borderWidth: 2 } : { backgroundColor: tw.gray100 }]}>
                {foodType === 'Veg' ? <Check size={16} color={tw.green600} /> : null}
                <Text style={[styles.dietText, { color: foodType === 'Veg' ? tw.green600 : tw.gray700 }]}>Veg</Text>
              </Press>
              {!isPureVegRestaurant ? (
                <Press scale={1} onPress={() => setFoodType('Non-Veg')} style={[styles.diet, foodType === 'Non-Veg' ? { borderColor: tw.red600, borderWidth: 2 } : { backgroundColor: tw.gray100 }]}>
                  {foodType === 'Non-Veg' ? <Check size={16} color={RT.primary} /> : null}
                  <Text style={[styles.dietText, { color: foodType === 'Non-Veg' ? RT.primary : tw.gray700 }]}>Non-Veg</Text>
                </Press>
              ) : null}
            </View>
          </View>

          <Field label="Item price">
            <View style={{ gap: 12 }}>
              {variants.length === 0 ? (
                <Field label="Base price" small>
                  <View>
                    <TextInput value={basePrice} onChangeText={(v) => setBasePrice(cleanPrice(v))} placeholder="Enter price" placeholderTextColor={tw.gray400} keyboardType="decimal-pad" style={[styles.input, styles.text, { backgroundColor: tw.gray50, paddingLeft: 32, paddingRight: 48 }]} />
                    <Text style={styles.rupee}>{'₹'}</Text>
                    <View style={styles.editIcon} pointerEvents="none"><Edit size={16} color={tw.gray500} /></View>
                  </View>
                </Field>
              ) : (
                <View style={{ borderRadius: 8, borderWidth: 1, borderColor: RT.accentBorder, backgroundColor: RT.primarySoft, paddingHorizontal: 12, paddingVertical: 8 }}>
                  <Text style={{ fontSize: 14, lineHeight: 20, color: RT.primaryStrong, ...poppins(400) }}>Customers will see the lowest variant price first.</Text>
                </View>
              )}

              <View style={styles.variants}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(500) }}>Variants</Text>
                    <Text style={styles.count}>Optional. Add multiple names and prices like Half, Full, Small, Large.</Text>
                  </View>
                  <Press scale={1} onPress={handleAddVariant} style={styles.addVariant}>
                    <Plus size={14} color={RT.primaryStrong} />
                    <Text style={{ fontSize: 12, lineHeight: 16, color: RT.primaryStrong, ...poppins(600) }}>Add variant</Text>
                  </Press>
                </View>

                {variants.length > 0 ? (
                  <View style={{ gap: 12 }}>
                    {variants.map((variant, index) => (
                      <View key={variant.localId} style={styles.variant}>
                        <View style={{ flex: 1, gap: 12 }}>
                          <Field label="Variant name" small>
                            <TextInput value={variant.name} onChangeText={(v) => handleVariantChange(variant.localId, 'name', v)} placeholder={index === 0 ? 'e.g., Half' : 'e.g., Full'} placeholderTextColor={tw.gray400} style={[styles.input, styles.text, { backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 12 }]} />
                          </Field>
                          <Field label="Variant price" small>
                            <View>
                              <TextInput value={variant.price} onChangeText={(v) => handleVariantChange(variant.localId, 'price', cleanPrice(v))} placeholder="Enter price" placeholderTextColor={tw.gray400} keyboardType="decimal-pad" style={[styles.input, styles.text, { backgroundColor: '#fff', paddingVertical: 10, paddingLeft: 32, paddingRight: 12 }]} />
                              <Text style={styles.rupee}>{'₹'}</Text>
                            </View>
                          </Field>
                        </View>
                        <Press onPress={() => handleRemoveVariant(variant.localId)} accessibilityLabel="Remove variant" style={styles.removeVariant}>
                          <X size={16} color={tw.gray500} />
                        </Press>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.count}>No variants added. This item will use the base price only.</Text>
                )}
              </View>

              <Field label="Preparation Time" small>
                <SelectField value={preparationTime} options={PREP_OPTIONS} onChange={setPreparationTime} accessibilityLabel="Preparation time" chevronColor={tw.gray500} style={[styles.input, { backgroundColor: tw.gray50, paddingHorizontal: 16 }]} textStyle={{ fontSize: 14, color: tw.gray900, ...poppins(400) }} />
              </Field>
            </View>
          </Field>
        </View>

        <View style={{ gap: 16, paddingVertical: 16, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: tw.gray200 }}>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Recommended</Text>
            <Toggle value={Boolean(isRecommended)} onValueChange={setIsRecommended} onColor="#16a34a" accessibilityLabel="Recommended" />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>In stock</Text>
            <Toggle value={Boolean(isInStock)} onValueChange={setIsInStock} onColor="#16a34a" accessibilityLabel="In stock" />
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom }]}>
        {!isNewItem ? (
          <View style={{ paddingTop: 8, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: tw.gray100 }}>
            <Press scale={1} onPress={() => setShowDeleteItemConfirm(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12 }}>
              <Trash2 size={14} color={tw.rose600} />
              <Text style={{ fontSize: 12, lineHeight: 16, color: tw.rose600, ...poppins(600) }}>Delete Entire Item from Menu</Text>
            </Press>
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 12 }}>
          <Press scale={1} onPress={goBack} style={styles.cancel}>
            <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray900, textTransform: 'uppercase', ...poppins(700) }}>Cancel</Text>
          </Press>
          <Press scale={1} onPress={handleSave} disabled={uploadingImages} style={{ flex: 1 }}>
            {uploadingImages ? (
              <View style={[styles.save, { backgroundColor: tw.gray300 }]}>
                <ActivityIndicator size="small" color={tw.gray500} />
                <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray500, textTransform: 'uppercase', ...poppins(700) }}>Saving...</Text>
              </View>
            ) : (
              <LinearGradient colors={RT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.save}>
                <Text style={{ fontSize: 14, lineHeight: 20, color: '#fff', textTransform: 'uppercase', ...poppins(700) }}>Save</Text>
              </LinearGradient>
            )}
          </Press>
        </View>
      </View>

      <BottomSheet visible={isCategoryPopupOpen} onClose={() => setIsCategoryPopupOpen(false)} backdrop="rgba(0,0,0,0.5)">
        <View style={[styles.sheet, { paddingBottom: insets.bottom }]}>
          <View style={styles.sheetHead}>
            <Text style={{ fontSize: 18, lineHeight: 28, color: tw.gray900, ...poppins(700) }}>Select category</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Press onPress={openAddCategory} accessibilityLabel="Add Category">
                <LinearGradient colors={RT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: 8 }}>
                  <Plus size={16} color="#fff" />
                  <Text style={{ fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(500) }}>Add</Text>
                </LinearGradient>
              </Press>
              <Press onPress={() => setIsCategoryPopupOpen(false)} accessibilityLabel="Close" hitSlop={8} style={{ padding: 4 }}>
                <X size={20} color={tw.gray600} />
              </Press>
            </View>
          </View>
          <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: tw.gray200, backgroundColor: '#fff' }}>
            <View>
              <View style={{ position: 'absolute', left: 14, top: 0, bottom: 0, justifyContent: 'center', zIndex: 1 }} pointerEvents="none"><Search size={16} color={tw.gray400} /></View>
              <TextInput ref={categorySearchInputRef} value={categorySearchQuery} onChangeText={setCategorySearchQuery} placeholder="Search categories..." placeholderTextColor={tw.gray400} style={styles.search} />
              {categorySearchQuery ? (
                <Press onPress={() => setCategorySearchQuery('')} accessibilityLabel="Clear search" style={{ position: 'absolute', right: 10, top: 0, bottom: 0, justifyContent: 'center' }}>
                  <X size={16} color={tw.gray400} />
                </Press>
              ) : null}
            </View>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1 }} contentContainerStyle={{ padding: 8, flexGrow: 1 }}>
            {loadingCategories ? (
              <View style={styles.center}><ActivityIndicator size="small" color={tw.gray600} /></View>
            ) : categories.length === 0 ? (
              <View style={[styles.center, { gap: 16 }]}>
                <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray500, ...poppins(400) }}>No categories available</Text>
                <Press onPress={openAddCategory}>
                  <LinearGradient colors={RT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}>
                    <Plus size={20} color="#fff" />
                    <Text style={{ fontSize: 16, lineHeight: 24, color: '#fff', ...poppins(600) }}>Add Category</Text>
                  </LinearGradient>
                </Press>
              </View>
            ) : filteredCategories.length === 0 ? (
              <View style={styles.center}><Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray500, ...poppins(400) }}>No matching categories found.</Text></View>
            ) : (
              <View style={{ gap: 6 }}>
                {filteredCategories.map((cat) => {
                  const isSelected = String(selectedCategoryId || '') === String(cat.id);
                  return (
                    <Press key={cat.id} scale={1} onPress={() => handleCategorySelect(cat.id, cat.name)} style={isSelected ? shadow('md') : null}>
                      {isSelected ? (
                        <LinearGradient colors={RT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.catRow}>
                          <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(500) }}>{cat.name}</Text>
                          <ScopeBadge scope={cat.foodTypeScope} selected />
                        </LinearGradient>
                      ) : (
                        <View style={[styles.catRow, { backgroundColor: tw.gray50 }]}>
                          <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(500) }}>{cat.name}</Text>
                          <ScopeBadge scope={cat.foodTypeScope} />
                        </View>
                      )}
                    </Press>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </View>
      </BottomSheet>

      <Dialog visible={showRemoveImageConfirm} onClose={() => setShowRemoveImageConfirm(false)} blur={8} panelStyle={styles.dialog}>
        <View style={styles.dialogIcon}><Trash2 size={28} color={tw.rose600} /></View>
        <Text style={styles.dialogTitle}>Remove Dish Photo?</Text>
        <Text style={styles.dialogBody}>
          Are you sure you want to remove this dish photo? The photo will be removed once you click <Text style={poppins(700)}>SAVE</Text>.
        </Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Press scale={1} onPress={() => setShowRemoveImageConfirm(false)} style={styles.dialogCancel}>
            <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray700, ...poppins(600) }}>Cancel</Text>
          </Press>
          <Press
            scale={1}
            onPress={() => {
              setImages([]);
              setImageFiles(new Map());
              setCurrentImageIndex(0);
              setShowRemoveImageConfirm(false);
              toast.info('Photo removed. Click SAVE to apply changes.');
            }}
            style={styles.dialogDanger}
          >
            <Text style={{ fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(600) }}>Yes, Remove</Text>
          </Press>
        </View>
      </Dialog>

      <Dialog visible={showDeleteItemConfirm} onClose={() => (isDeletingItem ? null : setShowDeleteItemConfirm(false))} blur={8} panelStyle={styles.dialog}>
        <View style={styles.dialogIcon}><Trash2 size={28} color={tw.rose600} /></View>
        <Text style={styles.dialogTitle}>Delete Dish Item?</Text>
        <Text style={styles.dialogBody}>
          Are you sure you want to delete <Text style={poppins(700)}>{itemName || 'this item'}</Text> from your restaurant menu? This action cannot be undone.
        </Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Press scale={1} disabled={isDeletingItem} onPress={() => setShowDeleteItemConfirm(false)} style={[styles.dialogCancel, isDeletingItem ? { opacity: 0.5 } : null]}>
            <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray700, ...poppins(600) }}>Cancel</Text>
          </Press>
          <Press scale={1} disabled={isDeletingItem} onPress={handleDeleteItem} style={[styles.dialogDanger, { flexDirection: 'row', gap: 8 }, isDeletingItem ? { opacity: 0.5 } : null]}>
            {isDeletingItem ? <ActivityIndicator size="small" color="#fff" /> : null}
            <Text style={{ fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(600) }}>{isDeletingItem ? 'Deleting...' : 'Yes, Delete'}</Text>
          </Press>
        </View>
      </Dialog>

      <ImageSourcePicker isOpen={isPhotoPickerOpen} onClose={() => setIsPhotoPickerOpen(false)} onFileSelect={handleImageAdd} title="Item Image" description="Choose how to upload your item image" fileNamePrefix="item-photo" />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: tw.gray200, paddingHorizontal: 16, paddingBottom: 12 },
  title: { fontSize: 20, lineHeight: 28, color: tw.gray900, ...poppins(700) },
  rejected: { borderRadius: 16, borderWidth: 1, borderColor: tw.red200, backgroundColor: tw.red50, paddingHorizontal: 16, paddingVertical: 12 },
  arrow: { position: 'absolute', top: '50%', marginTop: -20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center', ...shadow('lg') },
  removePhoto: { position: 'absolute', top: 16, right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: RT.primary, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center', ...shadow('md') },
  counter: { position: 'absolute', top: 16, left: 16, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  noImage: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 24, paddingVertical: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', ...shadow('xl') },
  addImage: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  label: { marginBottom: 8, fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(500) },
  labelSm: { marginBottom: 4, fontSize: 12, lineHeight: 16, color: tw.gray600, ...poppins(400) },
  input: { borderWidth: 1, borderColor: tw.gray300, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff' },
  text: { fontSize: 14, color: tw.gray900, ...poppins(400) },
  count: { fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(400) },
  editIcon: { position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center', padding: 4 },
  rupee: { position: 'absolute', left: 12, top: 0, bottom: 0, textAlignVertical: 'center', fontSize: 14, color: tw.gray600, ...poppins(400) },
  diet: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  dietText: { fontSize: 14, lineHeight: 20, ...poppins(500) },
  variants: { borderRadius: 12, borderWidth: 1, borderColor: tw.gray200, backgroundColor: '#fff', padding: 12, gap: 12 },
  addVariant: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, borderWidth: 1, borderColor: RT.accentBorder, backgroundColor: RT.primarySoft, paddingHorizontal: 12, paddingVertical: 6 },
  variant: { flexDirection: 'row', gap: 12, borderRadius: 8, borderWidth: 1, borderColor: tw.gray200, backgroundColor: tw.gray50, padding: 12 },
  removeVariant: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: tw.gray200, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switchLabel: { fontSize: 14, lineHeight: 20, color: tw.gray700, ...poppins(500) },
  footer: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: tw.gray200 },
  cancel: { flex: 1, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: tw.gray300, borderRadius: 8, backgroundColor: '#fff', alignItems: 'center' },
  save: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, overflow: 'hidden' },
  sheet: { height: '85%', backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: 'hidden' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: tw.gray200 },
  search: { borderRadius: 12, borderWidth: 1, borderColor: tw.gray200, backgroundColor: tw.gray50, paddingLeft: 40, paddingRight: 40, paddingVertical: 10, fontSize: 14, color: tw.gray900, ...poppins(400) },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 160 },
  catRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  badgeBox: { width: 14, height: 14, borderRadius: 2, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 11, lineHeight: 16, ...poppins(600) },
  dialog: { width: 320, maxWidth: '90%', backgroundColor: '#fff', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: tw.gray100, alignItems: 'center', ...shadow('2xl') },
  dialogIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: tw.rose50, borderWidth: 1, borderColor: tw.rose100, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  dialogTitle: { fontSize: 18, lineHeight: 28, color: tw.gray900, marginBottom: 8, textAlign: 'center', ...poppins(700) },
  dialogBody: { fontSize: 12, lineHeight: 20, color: tw.gray500, marginBottom: 24, textAlign: 'center', ...poppins(400) },
  dialogCancel: { flex: 1, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: tw.gray200, alignItems: 'center' },
  dialogDanger: { flex: 1, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, backgroundColor: tw.rose600, alignItems: 'center', justifyContent: 'center' },
});
