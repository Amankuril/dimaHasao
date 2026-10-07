import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronDown, ChevronUp, Pencil } from 'lucide-react-native';
import Img from '../../../components/Img';
import { Press } from '../../../components/ui';
import { poppins, shadow, tw } from '../../../theme';
import { Toggle } from '../../components/ui';
import { RT, RT_GRADIENT } from '../../theme';

const dishFallbackImage = require('../../assets/dish_fallback.webp');

/** getApprovalDisplayMeta().className with the page's `.replace()` applied: white pill, status text and border. */
const APPROVAL_PILL = {
  Rejected: { fg: tw.red700, border: tw.red200 },
  Pending: { fg: RT.primaryStrong, border: tw.amber200 },
  Approved: { fg: RT.primaryStrong, border: tw.emerald200 },
};

/* Labels are upper-cased in JS: textTransform + letterSpacing can clip the last letter on Android. */
function Pill({ children, style, textStyle }) {
  return (
    <View style={[styles.pill, style, { minWidth: 28 }]}>
      <Text style={[styles.pillText, textStyle]}>{String(children).toUpperCase()}</Text>
    </View>
  );
}

function ItemRow({ category, item, getApprovalDisplayMeta, getRuleStatusLabel, handleEditItem, handleToggleChange }) {
  const approvalMeta = getApprovalDisplayMeta(item.approvalStatus);
  const approval = APPROVAL_PILL[approvalMeta.label] || APPROVAL_PILL.Approved;
  const isRejectedItem = item.approvalStatus === 'rejected';
  const vegColor = item.isVeg ? tw.green600 : tw.red600;
  return (
    <View style={{ paddingHorizontal: 4 }}>
      <View style={styles.item}>
        <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={styles.thumb}>
            {item.image ? (
              <Img source={{ uri: item.image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityLabel={item.name} />
            ) : (
              <Image source={dishFallbackImage} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityLabel={item.name} />
            )}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ fontSize: 14, lineHeight: 18, color: tw.slate950, marginBottom: 6, letterSpacing: -0.35, ...poppins(700) }}>{item.name}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <View style={[styles.pill, { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', borderColor: item.isVeg ? tw.green100 : tw.red100, paddingHorizontal: 8, paddingVertical: 2 }]}>
                <View style={{ width: 10, height: 10, borderRadius: 2, borderWidth: 1, borderColor: vegColor, alignItems: 'center', justifyContent: 'center' }}>
                  {item.isVeg ? <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: vegColor }} /> : <LinearGradient colors={RT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 4, height: 4, borderRadius: 2 }} />}
                </View>
                <Text style={[styles.pillText, { color: item.isVeg ? tw.green600 : RT.primary }]}>{item.isVeg ? 'VEG' : 'NON-VEG'}</Text>
              </View>
              <Pill style={{ backgroundColor: '#fff', borderColor: approval.border }} textStyle={{ color: approval.fg }}>{approvalMeta.label}</Pill>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
              <Text style={{ flexShrink: 1, minWidth: 56, fontSize: 9, lineHeight: 14, letterSpacing: 1.4, color: item.inStock ? tw.green500 : tw.rose500, ...poppins(700) }}>
                {(item.inStock ? '● Live' : `● ${getRuleStatusLabel(item.stockRule)}`).toUpperCase()}
              </Text>
              <Press scale={1} onPress={() => handleEditItem(category, item)} accessibilityLabel={isRejectedItem ? 'Fix item' : 'Edit item'} style={{ borderRadius: 8, overflow: 'hidden', ...shadow('sm') }}>
                {isRejectedItem ? (
                  <LinearGradient colors={RT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.edit}>
                    <Pencil size={12} color="#fff" />
                    <Text style={[styles.editText, { color: '#fff' }]}>FIX</Text>
                  </LinearGradient>
                ) : (
                  <View style={[styles.edit, { backgroundColor: tw.slate100 }]}>
                    <Pencil size={12} color={tw.slate800} />
                    <Text style={[styles.editText, { color: tw.slate800 }]}>EDIT</Text>
                  </View>
                )}
              </Press>
            </View>
            {item.isRecommended ? (
              <View style={{ marginTop: 10, flexDirection: 'row' }}>
                <Pill style={{ backgroundColor: tw.blue50, borderColor: tw.blue100, paddingHorizontal: 10, paddingVertical: 4 }} textStyle={{ color: tw.blue600 }}>★ Recommended</Pill>
              </View>
            ) : null}
            {item.approvalStatus === 'rejected' && item.rejectionReason ? (
              <Text style={{ marginTop: 10, alignSelf: 'flex-start', fontSize: 9, lineHeight: 13, color: '#0A4D2B', fontStyle: 'italic', backgroundColor: 'rgba(254,242,242,0.5)', borderWidth: 1, borderColor: 'rgba(254,226,226,0.5)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, overflow: 'hidden', ...poppins(700) }}>
                {item.rejectionReason}
              </Text>
            ) : null}
          </View>
        </View>
        <Toggle value={Boolean(item.inStock)} onValueChange={(checked) => handleToggleChange('item', category.id, item.id, checked)} onColor={tw.green500} accessibilityLabel={`${item.name} in stock`} />
      </View>
    </View>
  );
}

/** One category accordion of the inventory list: header with stock toggle, then the item rows when expanded. */
export default function CategoryCard({ category, isExpanded, isLoading, toggleCategory, handleToggleChange, getOutOfStockCount, onLayout, ...rowProps }) {
  const categoryItems = category.items || [];
  return (
    <View onLayout={onLayout} style={[styles.card, isLoading ? { opacity: 0.6 } : null]}>
      <Press scale={1} onPress={() => toggleCategory(category.id)} accessibilityRole="button" accessibilityState={{ expanded: isExpanded }} style={{ backgroundColor: '#fff', paddingHorizontal: 24, paddingVertical: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <Text style={{ fontSize: 20, lineHeight: 28, color: tw.slate950, letterSpacing: -0.5, ...poppins(700) }}>{category.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Pill style={{ backgroundColor: tw.slate100, paddingHorizontal: 12, paddingVertical: 4 }} textStyle={{ color: tw.slate500, fontSize: 10, letterSpacing: 0.5 }}>
                  {category.items?.length || category.itemCount || 0} items
                </Pill>
                <Pill
                  style={{ paddingHorizontal: 12, paddingVertical: 4, backgroundColor: category.inStock ? tw.green50 : RT.primarySoft, borderColor: category.inStock ? tw.green100 : tw.amber100 }}
                  textStyle={{ color: RT.primaryStrong, fontSize: 10, letterSpacing: 0.5 }}
                >
                  {category.inStock ? 'Healthy' : 'Needs attention'}
                </Pill>
              </View>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginTop: 16 }}>
              {category.inStock ? (
                <View style={[styles.stat, { backgroundColor: 'rgba(240,253,244,0.5)', borderColor: 'rgba(220,252,231,0.5)' }]}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: tw.green500 }} />
                  <Text style={[styles.statText, { color: RT.primaryStrong }]}>All items live</Text>
                </View>
              ) : (
                <View style={[styles.stat, { backgroundColor: 'rgba(255,241,242,0.5)', borderColor: 'rgba(255,228,230,0.5)' }]}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: tw.rose500 }} />
                  <Text style={[styles.statText, { color: tw.rose700 }]}>{getOutOfStockCount(category)} Items paused</Text>
                </View>
              )}
              <View style={[styles.stat, { backgroundColor: 'rgba(239,246,255,0.5)', borderColor: 'rgba(219,234,254,0.5)' }]}>
                <Text style={[styles.statText, { color: tw.blue700 }]}>{categoryItems.filter((item) => item.isRecommended).length} Recommended</Text>
              </View>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <Toggle value={Boolean(category.inStock)} onValueChange={(checked) => handleToggleChange('category', category.id, null, checked)} onColor={tw.green500} accessibilityLabel={`${category.name} in stock`} />
            <Press scale={1} onPress={() => toggleCategory(category.id)} accessibilityLabel={isExpanded ? 'Collapse category' : 'Expand category'} style={{ width: 40, height: 40, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: isExpanded ? tw.slate900 : tw.slate200 }}>
              {isExpanded ? (
                <LinearGradient colors={RT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.chev}><ChevronUp size={20} color="#fff" /></LinearGradient>
              ) : (
                <View style={[styles.chev, { backgroundColor: '#fff' }]}><ChevronDown size={20} color={tw.slate600} /></View>
              )}
            </Press>
          </View>
        </View>
      </Press>

      {isExpanded ? (
        <View style={{ backgroundColor: 'rgba(248,250,252,0.3)', paddingHorizontal: 24, paddingBottom: 24, paddingTop: 8, gap: 16 }}>
          {categoryItems.map((item) => (
            <ItemRow key={item.id} category={category} item={item} handleToggleChange={handleToggleChange} {...rowProps} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden', borderRadius: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', backgroundColor: '#fff', ...shadow('xl') },
  pill: { borderRadius: 999, borderWidth: 1, borderColor: 'transparent', paddingHorizontal: 8, paddingVertical: 2 },
  pillText: { fontSize: 9, lineHeight: 14, letterSpacing: 0.9, ...poppins(700) },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
  statText: { fontSize: 10, lineHeight: 15, ...poppins(700) },
  chev: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderRadius: 28, borderWidth: 1, borderColor: 'rgba(241,245,249,0.8)', backgroundColor: '#fff', padding: 12, ...shadow('sm') },
  thumb: { width: 64, height: 64, borderRadius: 20, overflow: 'hidden', borderWidth: 2, borderColor: '#fff', backgroundColor: tw.slate100, ...shadow('md') },
  edit: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  editText: { fontSize: 9, lineHeight: 14, letterSpacing: 1.4, ...poppins(700) },
});
