import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Plus, Share2, Store, UtensilsCrossed, X } from 'lucide-react-native';
import { Press } from '../../../components/ui';
import useAppBackNavigation from '../../hooks/useAppBackNavigation';
import { F } from '../../components/shell';
import { poppins, tw } from '../../../theme';

/*
 * The web's collectionspagebanner.png is damaged in the repository (it does
 * not decode), so the browser shows a broken image over the amber-50 -> white
 * gradient behind it; the app shows that gradient.
 * `to-#06381e` in two of the web's gradient classes is not a valid Tailwind
 * class, so those cards fade to transparent.
 */
const GRADIENTS = [
  [tw.red400, tw.red600],
  [tw.orange400, 'rgba(255,137,4,0)'],
  [tw.purple500, tw.pink600],
  [tw.green400, tw.emerald600],
  [tw.orange400, tw.red500],
  [tw.amber400, tw.yellow600],
  [tw.pink400 || '#F472B6', tw.rose600],
  [tw.amber400, 'rgba(255,185,0,0)'],
];

/** Port of pages/user/Collections.jsx. The collections live in page state only, as on the web. */
export default function Collections() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const goBack = useAppBackNavigation();
  const [activeTab, setActiveTab] = useState('delivery');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [delivery, setDelivery] = useState([{ id: 'bookmarks', name: 'Bookmarks', dishes: 0, restaurants: 0, isDefault: true }]);
  const [dining, setDining] = useState([{ id: 'bookmarks', name: 'Bookmarks', dishes: 0, restaurants: 0, isDefault: true }]);

  const current = activeTab === 'delivery' ? delivery : dining;
  const setCurrent = activeTab === 'delivery' ? setDelivery : setDining;
  const cardW = (width - 32 - 16) / 2;

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
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView stickyHeaderIndices={[1]} contentContainerStyle={{ paddingBottom: 96 + insets.bottom }}>
        <LinearGradient colors={[tw.amber50, '#fff']} style={{ height: height * 0.25 }} />

        <View style={styles.tabs}>
          {['delivery', 'dining'].map((t) => (
            <Press key={t} scale={1} onPress={() => setActiveTab(t)} accessibilityRole="tab" accessibilityState={{ selected: activeTab === t }} style={styles.tab}>
              <Text style={[styles.tabText, activeTab === t ? { color: tw.gray900 } : null]}>{t === 'delivery' ? 'Delivery' : 'Dining'}</Text>
              {activeTab === t ? <View style={styles.tabBar} /> : null}
            </Press>
          ))}
        </View>

        <View style={styles.grid}>
          {current.map((c, index) => (
            <Press key={c.id} scale={0.98} onPress={() => router.push(c.isDefault ? '/food/user/profile/favorites' : `/food/user/collections/${c.id}`)} accessibilityLabel={c.name} style={{ width: cardW }}>
              <LinearGradient colors={GRADIENTS[index % GRADIENTS.length]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
                <Pressable onPress={() => {}} hitSlop={8} accessibilityLabel="Share" style={styles.share}>
                  <Share2 size={20} color="rgba(255,255,255,0.8)" />
                </Pressable>
                <View style={styles.illus}>
                  <View style={{ width: 128, height: 96 }}>
                    <View style={[styles.mini, { left: 0, top: 8, transform: [{ rotate: '-12deg' }] }]}>
                      <View style={styles.miniIn}>
                        <View style={styles.food}>
                          <UtensilsCrossed size={16} color="#fff" />
                        </View>
                      </View>
                      <View style={styles.flag} />
                    </View>
                    <View style={[styles.mini, { right: 0, top: 0, transform: [{ rotate: '12deg' }] }]}>
                      <View style={styles.miniIn}>
                        <Store size={24} color={F.green} />
                      </View>
                      <View style={styles.awning}>
                        {Array.from({ length: 7 }).map((_, i) => (
                          <View key={i} style={{ flex: 1, backgroundColor: i % 2 === 0 ? '#fb923c' : '#fff' }} />
                        ))}
                      </View>
                    </View>
                  </View>
                </View>
                <View style={styles.info}>
                  <Text style={styles.cName}>{c.name}</Text>
                  <Text style={styles.cSub}>{c.dishes} dish | {c.restaurants} restaurant</Text>
                </View>
              </LinearGradient>
            </Press>
          ))}

          <Press scale={0.98} onPress={() => setOpen(true)} accessibilityLabel="Create a new Collection" style={[styles.card, styles.create, { width: cardW }]}>
            <View style={styles.plus}>
              <Plus size={24} color={F.green} />
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.createText}>Create a new</Text>
              <Text style={styles.createText}>Collection</Text>
            </View>
          </Press>
        </View>
      </ScrollView>

      <Press scale={0.9} onPress={goBack} accessibilityLabel="Back" style={[styles.back, { top: 16 }]}>
        <ArrowLeft size={20} color="#fff" />
      </Press>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close" />
          <View style={styles.modal}>
            <View style={styles.mHead}>
              <Text style={styles.mTitle}>Create New Collection</Text>
              <Press scale={0.9} onPress={close} accessibilityLabel="Close" style={styles.mClose}>
                <X size={20} color={tw.gray500} />
              </Press>
            </View>
            <View style={{ padding: 16, gap: 16 }}>
              <Text style={styles.mHint}>Give your collection a unique name</Text>
              <TextInput
                autoFocus
                value={name}
                onChangeText={setName}
                onSubmitEditing={create}
                placeholder="e.g., Weekend Favorites"
                placeholderTextColor={tw.gray500}
                returnKeyType="done"
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
              <Press scale={0.98} onPress={close} accessibilityLabel="Cancel" style={[styles.mBtn, { borderWidth: 1, borderColor: tw.gray200, backgroundColor: '#fff' }]}>
                <Text style={[styles.mBtnText, { color: tw.gray700 }]}>Cancel</Text>
              </Press>
              <Press scale={0.98} onPress={create} disabled={!name.trim()} accessibilityLabel="Create Collection" style={[styles.mBtn, { backgroundColor: F.green }, !name.trim() ? { opacity: 0.5 } : null]}>
                <Text style={[styles.mBtnText, { color: '#fff' }]}>Create Collection</Text>
              </Press>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { position: 'absolute', left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(30,41,57,0.6)', alignItems: 'center', justifyContent: 'center', zIndex: 20 },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: tw.gray200 },
  tab: { flex: 1, paddingVertical: 16, alignItems: 'center' },
  tabText: { fontSize: 16, lineHeight: 24, color: tw.gray400, ...poppins(600) },
  tabBar: { position: 'absolute', bottom: 0, width: 80, height: 4, borderRadius: 2, backgroundColor: F.green },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, padding: 16, paddingTop: 24 },
  card: { height: 192, borderRadius: 16, padding: 16, overflow: 'hidden' },
  share: { position: 'absolute', top: 12, right: 12, zIndex: 10 },
  illus: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', paddingBottom: 40 },
  mini: { position: 'absolute', width: 56, height: 44, backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden', ...{ boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' } },
  miniIn: { flex: 1, backgroundColor: tw.gray50, alignItems: 'center', justifyContent: 'center', padding: 4 },
  food: { width: 32, height: 32, borderRadius: 16, backgroundColor: tw.amber400, alignItems: 'center', justifyContent: 'center' },
  flag: { position: 'absolute', top: -4, right: 8, width: 10, height: 14, backgroundColor: tw.red500 },
  awning: { position: 'absolute', top: -2, left: 0, right: 0, height: 8, flexDirection: 'row' },
  info: { position: 'absolute', bottom: 16, left: 16, right: 16 },
  cName: { fontSize: 18, lineHeight: 28, color: '#fff', marginBottom: 4, ...poppins(700) },
  cSub: { fontSize: 14, lineHeight: 20, color: 'rgba(255,255,255,0.8)', ...poppins(400) },
  create: { backgroundColor: '#fff', borderWidth: 2, borderStyle: 'dashed', borderColor: tw.gray200, alignItems: 'center', justifyContent: 'center', gap: 12 },
  plus: { width: 48, height: 48, borderRadius: 24, backgroundColor: F.cream, borderWidth: 2, borderColor: 'rgba(10,77,43,0.3)', alignItems: 'center', justifyContent: 'center' },
  createText: { fontSize: 16, lineHeight: 24, color: tw.gray700, ...poppins(600) },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  modal: { width: '90%', maxWidth: 384, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', ...{ boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' } },
  mHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: tw.gray200 },
  mTitle: { fontSize: 18, lineHeight: 28, color: tw.gray900, ...poppins(700) },
  mClose: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  mHint: { fontSize: 14, lineHeight: 20, color: tw.gray500, ...poppins(400) },
  input: { height: 48, borderWidth: 2, borderColor: tw.gray200, borderRadius: 12, paddingHorizontal: 12, fontSize: 16, color: tw.gray900, backgroundColor: '#fff', ...poppins(400) },
  preview: { padding: 12, backgroundColor: tw.gray50, borderRadius: 12 },
  pLabel: { fontSize: 12, lineHeight: 16, color: tw.gray400, marginBottom: 4, ...poppins(400) },
  pName: { fontSize: 16, lineHeight: 24, color: tw.gray800, ...poppins(600) },
  mFoot: { flexDirection: 'row', gap: 12, padding: 16, backgroundColor: tw.gray50 },
  mBtn: { flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  mBtnText: { fontSize: 14, lineHeight: 20, ...poppins(600) },
});
