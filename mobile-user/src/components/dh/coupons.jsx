import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Fa from '../Fa';
import { Press } from '../ui';
import { Header, PatternDivider } from './Header';
import { dhs, rupees } from './ui';
import { color, radii, space, type } from '../../theme';

/** "20% off, up to ₹500" / "₹300 off". Missing fields are simply left out. */
const discountLine = (offer) => {
  const value = Number(offer?.discountValue);
  if (!value) return '';
  if (offer.discountType === 'flat') return `${rupees(value)} off`;
  return offer.maxDiscount ? `${value}% off, up to ${rupees(offer.maxDiscount)}` : `${value}% off`;
};

const conditionsLine = (offer) => {
  const parts = [];
  if (Number(offer?.minBookingAmount) > 0) parts.push(`On bookings above ${rupees(offer.minBookingAmount)}`);
  if (offer?.endDate) {
    const end = new Date(offer.endDate);
    if (!Number.isNaN(end.getTime())) parts.push(`Valid till ${end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`);
  }
  return parts.join(' · ');
};

/** One coupon row: code, what it gives, and an Apply action. */
export function CouponCard({ offer, onApply, detailed = false }) {
  const discount = discountLine(offer);
  const conditions = detailed ? conditionsLine(offer) : '';
  return (
    <Press
      scale={0.98}
      onPress={() => onApply(offer)}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={`Apply ${offer.code}: ${offer.title}`}
    >
      <Fa name="fa-solid fa-ticket" size={16} color={color.goldText} />
      <View style={styles.body}>
        <Text style={styles.code} numberOfLines={1}>
          {offer.code}
        </Text>
        <Text style={styles.title} numberOfLines={detailed ? 3 : 1}>
          {offer.title}
        </Text>
        {detailed && offer.description ? (
          <Text style={styles.desc} numberOfLines={3}>
            {offer.description}
          </Text>
        ) : null}
        {discount ? <Text style={styles.discount}>{discount}</Text> : null}
        {conditions ? <Text style={styles.cond}>{conditions}</Text> : null}
      </View>
      <Text style={styles.apply}>Apply</Text>
    </Press>
  );
}

/**
 * Every coupon for the package, as a full screen over the booking form.
 * It is a modal rather than a route so the form the traveller has filled in
 * (date, travellers, pickup) is still there when they come back.
 */
export function CouponsScreen({ visible, offers, onClose, onApply }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={dhs.page}>
        <Header
          title="OFFERS & COUPONS"
          subtitle={`${offers.length} available for this package`}
          showBack
          onBack={onClose}
          rightAction="none"
        />
        <PatternDivider variant="green-gold" />
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + space.xxl }]} showsVerticalScrollIndicator={false}>
          {offers.map((offer) => (
            <CouponCard
              key={offer._id || offer.code}
              offer={offer}
              detailed
              onApply={(o) => {
                onApply(o);
                onClose();
              }}
            />
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: color.goldSoft,
    borderWidth: 1, borderStyle: 'dashed', borderColor: color.gold, borderRadius: radii.md, paddingHorizontal: space.md, paddingVertical: space.sm + 2,
  },
  body: { flex: 1, minWidth: 0, gap: 2 },
  code: { ...type.bodyStrong, letterSpacing: 0.3, color: color.text },
  title: { ...type.caption, color: color.textSecondary },
  desc: { ...type.caption, color: color.textMuted },
  discount: { ...type.label, color: color.goldText, marginTop: 2 },
  cond: { ...type.caption, color: color.textMuted },
  apply: { ...type.label, color: color.primary },
  list: { padding: space.lg, gap: space.md },
});
