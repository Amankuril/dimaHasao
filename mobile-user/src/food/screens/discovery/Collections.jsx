import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Share2, Store, UtensilsCrossed, X } from 'lucide-react-native';
import { Press } from '../../../components/ui';
import useAppBackNavigation from '../../hooks/useAppBackNavigation';
import { Button, SegmentedControl } from '../../../components/ds';
import { NAV_CLEARANCE } from '../../../components/dh/AppBottomNav';
import { PageBar } from '../../components/discovery/bits';
import { color, elevation, radii, space, type } from '../../../theme';

// Alternating heritage tints for the collection tiles (the web's rainbow gradients are dropped).
const TILE_TINTS = [color.primarySoft, color.goldSoft];

/** Port of pages/user/Collections.jsx. The collections live in page state only, as on the web. */
export default function Collections() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const goBack = useAppBackNavigation();
  const [activeTab, setActiveTab] = useState('delivery');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [delivery, setDelivery] = useState([{ id: 'bookmarks', name: 'Bookmarks', dishes: 0, restaurants: 0, isDefault: true }]);
  const [dining, setDining] = useState([{ id: 'bookmarks', name: 'Bookmarks', dishes: 0, restaurants: 0, isDefault: true }]);

  const current = activeTab === 'delivery' ? delivery : dining;
  const setCurrent = activeTab === 'delivery' ? setDelivery : setDining;
  const cardW = (width - space.lg * 2 - space.md) / 2;

  const create = () => {
    if (!name.trim()) return;
    setCurrent((prev) => [...prev, { id: `collection-${Date.now()}`, name: name.trim(), dishes: 0, restaurants: 0, isDefault: false }]);
    setName('');
    setOpen(false);
  };
  const close = () => {
    setOpen(false);
    setName('');
  };

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <PageBar title="Collections" subtitle="Your saved restaurants and dishes" onBack={goBack} />
      <ScrollView stickyHeaderIndices={[0]} contentContainerStyle={{ paddingBottom: NAV_CLEARANCE + space.lg + insets.bottom }}>
        <View style={styles.tabs}>
          <SegmentedControl
            options={[
              { value: 'delivery', label: 'Delivery' },
              { value: 'dining', label: 'Dining' },
            ]}
            value={activeTab}
            onChange={setActiveTab}
          />
        </View>

        <View style={styles.grid}>
          {current.map((c, index) => (
            <Press key={c.id} scale={0.98} onPress={() => router.push(c.isDefault ? '/food/user/profile/favorites' : `/food/user/collections/${c.id}`)} accessibilityRole="button" accessibilityLabel={c.name} style={[styles.card, { width: cardW }]}>
              <View style={[styles.illusBox, { backgroundColor: TILE_TINTS[index % TILE_TINTS.length] }]}>
                <Pressable onPress={() => {}} accessibilityLabel="Share" style={styles.share}>
                  <Share2 size={18} color={color.textSecondary} />
                </Pressable>
                <View style={{ width: 112, height: 72 }}>
                  <View style={[styles.mini, { left: 0, top: 10, transform: [{ rotate: '-10deg' }] }]}>
                    <View style={styles.food}>
                      <UtensilsCrossed size={16} color={color.onGold} />
                    </View>
                  </View>
                  <View style={[styles.mini, { right: 0, top: 0, transform: [{ rotate: '10deg' }] }]}>
                    <Store size={22} color={color.primary} />
                  </View>
                </View>
              </View>
              <View style={styles.info}>
                <Text style={styles.cName} numberOfLines={1}>{c.name}</Text>
                <Text style={styles.cSub} numberOfLines={1}>{c.dishes} dish | {c.restaurants} restaurant</Text>
              </View>
            </Press>
          ))}

          <Press scale={0.98} onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel="Create a new Collection" style={[styles.card, styles.create, { width: cardW }]}>
            <View style={styles.plus}>
              <Plus size={24} color={color.primary} />
            </View>
            <Text style={styles.createText}>Create a new collection</Text>
          </Press>
        </View>
      </ScrollView>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close" />
          <View style={styles.modal}>
            <View style={styles.mHead}>
              <Text style={styles.mTitle} accessibilityRole="header">Create new collection</Text>
              <Press scale={0.9} onPress={close} accessibilityLabel="Close" style={styles.mClose}>
                <X size={20} color={color.text} />
              </Press>
            </View>
            <View style={{ padding: space.lg, gap: space.md }}>
              <Text style={styles.mHint}>Give your collection a unique name</Text>
              <TextInput
                autoFocus
                value={name}
                onChangeText={setName}
                onSubmitEditing={create}
                placeholder="e.g., Weekend Favorites"
                placeholderTextColor={color.textMuted}
                returnKeyType="done"
                accessibilityLabel="Collection name"
                style={styles.input}
              />
              {name.trim() ? (
                <View style={styles.preview}>
                  <Text style={styles.pLabel}>Preview</Text>
                  <Text style={styles.pName}>{name.trim()}</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.mFoot}>
              <Button title="Cancel" variant="outline" onPress={close} style={{ flex: 1 }} />
              <Button title="Create" accessibilityLabel="Create Collection" onPress={create} disabled={!name.trim()} style={{ flex: 1 }} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { paddingHorizontal: space.lg, paddingVertical: space.md, backgroundColor: color.bg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, paddingHorizontal: space.lg, paddingTop: space.sm },
  card: { height: 196, borderRadius: radii.lg, overflow: 'hidden', backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, ...elevation.card },
  illusBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  share: { position: 'absolute', top: space.xs, right: space.xs, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  mini: { position: 'absolute', width: 52, height: 42, backgroundColor: color.surface, borderRadius: radii.sm, borderWidth: 1, borderColor: color.border, alignItems: 'center', justifyContent: 'center', ...elevation.card },
  food: { width: 30, height: 30, borderRadius: 15, backgroundColor: color.goldBright, alignItems: 'center', justifyContent: 'center' },
  info: { paddingHorizontal: space.md, paddingVertical: space.md, borderTopWidth: 1, borderTopColor: color.border },
  cName: { ...type.subheading, color: color.text },
  cSub: { ...type.caption, color: color.textMuted },
  create: { borderWidth: 2, borderStyle: 'dashed', borderColor: color.borderStrong, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.lg, ...{ boxShadow: 'none' } },
  plus: { width: 48, height: 48, borderRadius: 24, backgroundColor: color.primarySoft, borderWidth: 1, borderColor: color.primaryBorder, alignItems: 'center', justifyContent: 'center' },
  createText: { ...type.bodyStrong, color: color.text, textAlign: 'center' },
  overlay: { flex: 1, backgroundColor: color.overlay, alignItems: 'center', justifyContent: 'center' },
  modal: { width: '90%', maxWidth: 384, backgroundColor: color.surface, borderRadius: radii.lg, overflow: 'hidden', ...elevation.sheet },
  mHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: space.lg, paddingRight: space.sm, paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: color.border },
  mTitle: { ...type.heading, color: color.text },
  mClose: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  mHint: { ...type.small, color: color.textSecondary },
  input: { height: 48, borderWidth: 1, borderColor: color.border, borderRadius: radii.md, paddingHorizontal: space.md, ...type.body, color: color.text, backgroundColor: color.surface },
  preview: { padding: space.md, backgroundColor: color.surfaceMuted, borderRadius: radii.md },
  pLabel: { ...type.caption, color: color.textMuted, marginBottom: space.xs },
  pName: { ...type.subheading, color: color.text },
  mFoot: { flexDirection: 'row', gap: space.md, padding: space.lg, borderTopWidth: 1, borderTopColor: color.border },
});
