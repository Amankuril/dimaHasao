import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, CreditCard, Edit, Plus, Trash2 } from 'lucide-react-native';
import { confirm } from '../../../lib/notify';
import { navigateTo } from '../../../lib/webRouter';
import { useProfile } from '../../context/ProfileContext';
import { Button, Card, EmptyState, StatusBadge } from '../../../components/ds';
import { NAV_CLEARANCE } from '../../../components/dh/AppBottomNav';
import { PageHeader } from '../../components/profile/ProfileChrome';
import { color, radii, space, type } from '../../../theme';

const formatCardNumber = (cardNumber) => (cardNumber ? `**** **** **** ${cardNumber}` : '****');
const formatExpiry = (month, year) => (!month || !year ? '' : `${String(month).padStart(2, '0')}/${String(year).slice(-2)}`);
const getCardTypeName = (type) => (type === 'visa' ? 'Visa' : type === 'mastercard' ? 'Mastercard' : 'Card');

function AddButton({ label, variant }) {
  return <Button title={label} icon={Plus} variant={variant} onPress={() => navigateTo('/user/profile/payments/new')} accessibilityLabel={label} />;
}

/** Payment card actions: 44 px tall outline buttons. */
function SmallButton({ Icon, label, onPress, danger }) {
  return <Button title={label} icon={Icon} variant={danger ? 'dangerSoft' : 'outline'} size="sm" fullWidth={false} onPress={onPress} style={{ minHeight: 44 }} />;
}

/** Port of pages/user/profile/Payments.jsx. */
export default function Payments() {
  const insets = useSafeAreaInsets();
  const { paymentMethods, deletePaymentMethod, setDefaultPaymentMethod } = useProfile();

  const handleDelete = async (id) => {
    if (await confirm('Are you sure you want to delete this payment method?', '', { confirmText: 'OK', cancelText: 'Cancel' })) deletePaymentMethod(id);
  };

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <PageHeader title="Payment Methods" subtitle="Manage your payment methods" onBack={() => navigateTo('/user/profile')} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: NAV_CLEARANCE + space.lg + insets.bottom }]}>
        <AddButton label="Add Payment Method" variant={paymentMethods.length === 0 ? 'secondary' : 'primary'} />

        {paymentMethods.length === 0 ? (
          <Card>
            <EmptyState icon={CreditCard} title="No payment methods saved yet" message="Add your first payment method to get started with orders" />
            <AddButton label="Add Your First Payment Method" />
          </Card>
        ) : (
          <View style={{ gap: space.md }}>
            {paymentMethods.map((payment) => (
              <Card key={payment.id} style={[{ gap: space.md }, payment.isDefault ? styles.defaultCard : null]}>
                <View style={styles.rowBetween}>
                  <View style={styles.titleRow}>
                    <CreditCard size={20} color={payment.isDefault ? color.goldText : color.textMuted} />
                    <Text style={styles.cardTitle}>{getCardTypeName(payment.type)} Card</Text>
                  </View>
                  {payment.isDefault ? <StatusBadge label="Default" tone="gold" /> : null}
                </View>
                <View style={styles.cardFace}>
                  <View style={styles.faceTop}>
                    <View style={styles.faceIcon}>
                      <CreditCard size={22} color={color.goldOnDark} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.number}>{formatCardNumber(payment.cardNumber)}</Text>
                      <Text style={styles.holder} numberOfLines={1}>
                        {payment.cardHolder}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.faceBottom}>
                    <Text style={styles.meta}>
                      <Text style={styles.metaKey}>Expires </Text>
                      {formatExpiry(payment.expiryMonth, payment.expiryYear)}
                    </Text>
                    <Text style={styles.meta}>
                      <Text style={styles.metaKey}>Type </Text>
                      {getCardTypeName(payment.type)}
                    </Text>
                  </View>
                </View>
                <View style={styles.actions}>
                  {!payment.isDefault ? <SmallButton Icon={Check} label="Set as Default" onPress={() => setDefaultPaymentMethod(payment.id)} /> : null}
                  <SmallButton Icon={Edit} label="Edit" onPress={() => navigateTo(`/user/profile/payments/${payment.id}/edit`)} />
                  <SmallButton Icon={Trash2} label="Delete" danger onPress={() => handleDelete(payment.id)} />
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.lg },
  defaultCard: { borderColor: color.gold, borderWidth: 1.5 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  cardTitle: { ...type.subheading, color: color.text },
  cardFace: { padding: space.lg, borderRadius: radii.md, backgroundColor: color.primaryDeep },
  faceTop: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.md },
  faceIcon: { width: 44, height: 32, borderRadius: radii.sm, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  number: { ...type.price, color: color.textInverse, letterSpacing: 1 },
  holder: { marginTop: space.xxs, ...type.small, color: color.textOnDarkMuted },
  faceBottom: { flexDirection: 'row', gap: space.xxl, paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.25)' },
  meta: { ...type.bodyStrong, color: color.textInverse },
  metaKey: { ...type.small, color: color.textOnDarkMuted },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
