import { Image, StyleSheet, Text, View } from 'react-native';
import { ChevronDown, ChevronUp, Pencil, Star } from 'lucide-react-native';
import { Button, IconButton, StatusBadge, formatINR } from '../../../components/ds';
import Img from '../../../components/Img';
import { Press } from '../../../components/ui';
import { color, elevation, radii, space, type } from '../../../theme';
import { getFoodDisplayPrice, hasFoodVariants } from '../../utils/foodVariants';
import { StockSwitch, VegMark } from './partnerKit';

const dishFallbackImage = require('../../assets/dish_fallback.webp');

/** getApprovalDisplayMeta().label -> badge tone (word + colour). */
const APPROVAL_TONE = { Rejected: 'danger', Pending: 'warning', Approved: 'success' };

function ItemRow({ category, item, getApprovalDisplayMeta, getRuleStatusLabel, handleEditItem, handleToggleChange, last }) {
  const approvalMeta = getApprovalDisplayMeta(item.approvalStatus);
  const isRejectedItem = item.approvalStatus === 'rejected';
  const price = getFoodDisplayPrice(item);
  const priceLabel = price > 0 ? `${hasFoodVariants(item) ? 'from ' : ''}${formatINR(price)}` : '';
  return (
    <View style={[styles.item, !last && styles.itemDivider]}>
      <View style={styles.itemTop}>
        <View style={styles.thumb}>
          {item.image ? (
            <Img source={{ uri: item.image }} style={styles.fill} resizeMode="cover" accessibilityLabel={item.name} />
          ) : (
            <Image source={dishFallbackImage} style={styles.fill} resizeMode="cover" accessibilityLabel={item.name} />
          )}
        </View>
        <View style={styles.itemText}>
          <View style={styles.nameRow}>
            <View style={{ marginTop: 3 }}>
              <VegMark veg={item.isVeg} />
            </View>
            <Text numberOfLines={2} style={[type.bodyStrong, { flex: 1, color: color.text }]}>
              {item.name}
            </Text>
          </View>
          {priceLabel ? <Text style={[type.price, { color: color.text }]}>{priceLabel}</Text> : null}
          <View style={styles.badges}>
            <StatusBadge label={approvalMeta.label} tone={APPROVAL_TONE[approvalMeta.label] || 'neutral'} />
            {item.isRecommended ? <StatusBadge label="Recommended" tone="gold" icon={Star} /> : null}
          </View>
        </View>
      </View>

      {!item.inStock ? <Text style={[type.caption, { color: color.warning }]}>{getRuleStatusLabel(item.stockRule)}</Text> : null}
      {isRejectedItem && item.rejectionReason ? (
        <View style={styles.reason}>
          <Text style={[type.small, { color: color.danger }]}>Reason: {item.rejectionReason}</Text>
        </View>
      ) : null}

      <View style={styles.itemActions}>
        <Button
          title={isRejectedItem ? 'Fix item' : 'Edit'}
          icon={Pencil}
          size="sm"
          variant={isRejectedItem ? 'dangerSoft' : 'secondary'}
          fullWidth={false}
          onPress={() => handleEditItem(category, item)}
          accessibilityLabel={`${isRejectedItem ? 'Fix' : 'Edit'} ${item.name}`}
          style={{ minHeight: 44 }}
        />
        <StockSwitch value={Boolean(item.inStock)} onValueChange={(checked) => handleToggleChange('item', category.id, item.id, checked)} accessibilityLabel={`${item.name} in stock`} />
      </View>
    </View>
  );
}

/** One category accordion of the inventory list: header with stock switch, then the item rows when expanded. */
export default function CategoryCard({ category, isExpanded, isLoading, toggleCategory, handleToggleChange, getOutOfStockCount, onLayout, ...rowProps }) {
  const categoryItems = category.items || [];
  const total = category.items?.length || category.itemCount || 0;
  const recommended = categoryItems.filter((item) => item.isRecommended).length;
  return (
    <View onLayout={onLayout} style={[styles.card, isLoading ? { opacity: 0.6 } : null]}>
      <View style={styles.head}>
        <View style={styles.headTop}>
          <Press scale={1} onPress={() => toggleCategory(category.id)} accessibilityRole="button" accessibilityState={{ expanded: isExpanded }} accessibilityLabel={`${category.name}, ${total} items`} style={styles.headText}>
            <Text style={[type.subheading, { color: color.text }]} numberOfLines={2}>
              {category.name}
            </Text>
            <Text style={[type.small, { color: color.textMuted }]}>
              {total} item{total !== 1 ? 's' : ''}
              {recommended ? ` · ${recommended} recommended` : ''}
            </Text>
          </Press>
          <IconButton icon={isExpanded ? ChevronUp : ChevronDown} label={isExpanded ? 'Collapse category' : 'Expand category'} variant={isExpanded ? 'primary' : 'soft'} onPress={() => toggleCategory(category.id)} />
        </View>
        <View style={styles.headBottom}>
          {category.inStock ? <StatusBadge label="All items in stock" tone="primary" /> : <StatusBadge label={`${getOutOfStockCount(category)} out of stock`} tone="warning" />}
          <StockSwitch value={Boolean(category.inStock)} onValueChange={(checked) => handleToggleChange('category', category.id, null, checked)} accessibilityLabel={`${category.name} in stock`} />
        </View>
      </View>

      {isExpanded ? (
        <View style={styles.items}>
          {categoryItems.map((item, index) => (
            <ItemRow key={item.id} category={category} item={item} handleToggleChange={handleToggleChange} last={index === categoryItems.length - 1} {...rowProps} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden', borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface, ...elevation.card },
  head: { paddingLeft: space.lg, paddingRight: space.md, paddingVertical: space.md, gap: space.xs },
  headTop: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  headText: { flex: 1, minWidth: 0, gap: 2, paddingTop: space.xs },
  headBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, flexWrap: 'wrap' },
  items: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border, backgroundColor: color.surface },
  item: { paddingHorizontal: space.lg, paddingVertical: space.md, gap: space.sm },
  itemDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  itemTop: { flexDirection: 'row', gap: space.md },
  thumb: { width: 64, height: 64, borderRadius: radii.md, overflow: 'hidden', backgroundColor: color.surfaceMuted },
  fill: { width: '100%', height: '100%' },
  itemText: { flex: 1, minWidth: 0, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginTop: 2 },
  reason: { backgroundColor: color.dangerSoft, borderRadius: radii.sm, paddingHorizontal: space.md, paddingVertical: space.sm },
  itemActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
});
