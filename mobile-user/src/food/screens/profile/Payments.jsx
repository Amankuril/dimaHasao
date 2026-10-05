import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, CreditCard, Edit, Plus, Trash2 } from 'lucide-react-native';
import { Press } from '../../../components/ui';
import { confirm } from '../../../lib/notify';
import { navigateTo } from '../../../lib/webRouter';
import { useProfile } from '../../context/ProfileContext';
import { Badge, Card, CardContent, CardHeader, CardTitle, UI } from '../../components/cart/ui';
import { poppins, shadow, tw } from '../../../theme';

const formatCardNumber = (cardNumber) => (cardNumber ? `**** **** **** ${cardNumber}` : '****');
const formatExpiry = (month, year) => (!month || !year ? '' : `${String(month).padStart(2, '0')}/${String(year).slice(-2)}`);
// The web's source literally holds "??" here (a mangled emoji), so that is what renders.
const getCardTypeIcon = () => '??';
const getCardTypeName = (type) => (type === 'visa' ? 'Visa' : type === 'mastercard' ? 'Mastercard' : 'Card');

function AddButton({ label, style }) {
  return (
    <Press scale={1} onPress={() => navigateTo('/user/profile/payments/new')} accessibilityLabel={label} style={[styles.addWrap, style]}>
      <LinearGradient colors={[tw.yellow500, '#0A4D2B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.addBtn}>
        <Plus size={16} color="#fff" />
        <Text style={styles.addText}>{label}</Text>
      </LinearGradient>
    </Press>
  );
}

function SmallButton({ Icon, label, onPress, color = UI.foreground }) {
  return (
    <Press scale={0.98} onPress={onPress} accessibilityLabel={label} style={styles.smallBtn}>
      <Icon size={16} color={color} />
      <Text style={[styles.smallText, { color }]}>{label}</Text>
    </Press>
  );
}

/** Port of pages/user/profile/Payments.jsx. */
export default function Payments() {
  const { paymentMethods, deletePaymentMethod, setDefaultPaymentMethod } = useProfile();

  const handleDelete = async (id) => {
    if (await confirm('Are you sure you want to delete this payment method?', '', { confirmText: 'OK', cancelText: 'Cancel' })) deletePaymentMethod(id);
  };

  return (
    <LinearGradient colors={['rgba(254,252,232,0.3)', '#FFFFFF', 'rgba(255,247,237,0.2)']} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={{ gap: 12 }}>
          <View>
            <Text style={styles.h1}>Payment Methods</Text>
            <Text style={styles.sub}>Manage your payment methods</Text>
          </View>
          <AddButton label="Add Payment Method" />
        </View>

        {paymentMethods.length === 0 ? (
          <Card style={shadow('lg')}>
            <CardContent style={{ paddingVertical: 48, alignItems: 'center' }}>
              <CreditCard size={64} color={UI.mutedForeground} style={{ marginBottom: 16 }} />
              <Text style={styles.emptyTitle}>No payment methods saved yet</Text>
              <Text style={styles.emptySub}>Add your first payment method to get started with orders</Text>
              <AddButton label="Add Your First Payment Method" style={{ width: undefined }} />
            </CardContent>
          </Card>
        ) : (
          <View style={{ gap: 16 }}>
            {paymentMethods.map((payment) => (
              <Card key={payment.id} style={[shadow('lg'), payment.isDefault ? { borderColor: tw.yellow500, borderWidth: 2, backgroundColor: 'rgba(254,252,232,0.5)' } : null]}>
                <CardHeader>
                  <View style={styles.rowBetween}>
                    <CardTitle row>
                      <CreditCard size={20} color={payment.isDefault ? tw.yellow600 : UI.mutedForeground} />
                      <Text style={styles.cardTitle}>{getCardTypeName(payment.type)} Card</Text>
                    </CardTitle>
                    {payment.isDefault ? <Badge style={{ backgroundColor: tw.yellow500 }} textStyle={{ color: '#fff' }}>Default</Badge> : null}
                  </View>
                </CardHeader>
                <CardContent style={{ gap: 16 }}>
                  <View style={styles.cardFace}>
                    <View style={styles.faceTop}>
                      <Text style={{ fontSize: 30, lineHeight: 36 }}>{getCardTypeIcon(payment.type)}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.number}>{formatCardNumber(payment.cardNumber)}</Text>
                        <Text style={styles.holder}>{payment.cardHolder}</Text>
                      </View>
                    </View>
                    <View style={styles.faceBottom}>
                      <Text style={styles.meta}>
                        <Text style={{ color: UI.mutedForeground }}>Expires: </Text>
                        <Text style={poppins(600)}>{formatExpiry(payment.expiryMonth, payment.expiryYear)}</Text>
                      </Text>
                      <Text style={styles.meta}>
                        <Text style={{ color: UI.mutedForeground }}>Type: </Text>
                        <Text style={poppins(600)}>{getCardTypeName(payment.type)}</Text>
                      </Text>
                    </View>
                  </View>
                  <View style={styles.actions}>
                    {!payment.isDefault ? <SmallButton Icon={Check} label="Set as Default" onPress={() => setDefaultPaymentMethod(payment.id)} /> : null}
                    <SmallButton Icon={Edit} label="Edit" onPress={() => navigateTo(`/user/profile/payments/${payment.id}/edit`)} />
                    <SmallButton Icon={Trash2} label="Delete" color={tw.red600} onPress={() => handleDelete(payment.id)} />
                  </View>
                </CardContent>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  h1: { fontSize: 18, lineHeight: 28, color: UI.foreground, ...poppins(700) },
  sub: { marginTop: 4, fontSize: 14, lineHeight: 20, color: UI.mutedForeground, ...poppins(400) },
  addWrap: { width: '100%', borderRadius: 6 },
  addBtn: { height: 36, borderRadius: 6, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  addText: { fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(500) },
  emptyTitle: { fontSize: 20, lineHeight: 28, color: UI.foreground, marginBottom: 8, textAlign: 'center', ...poppins(600) },
  emptySub: { color: UI.mutedForeground, marginBottom: 24, textAlign: 'center', fontSize: 16, lineHeight: 24, ...poppins(400) },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 16, lineHeight: 16, color: UI.foreground, ...poppins(600) },
  cardFace: { padding: 16, borderRadius: 8, borderWidth: 1, borderColor: tw.yellow200, backgroundColor: tw.yellow50 },
  faceTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  number: { fontSize: 20, lineHeight: 28, color: UI.foreground, ...poppins(700) },
  holder: { marginTop: 4, fontSize: 14, lineHeight: 20, color: UI.mutedForeground, ...poppins(400) },
  faceBottom: { flexDirection: 'row', gap: 24, paddingTop: 12, borderTopWidth: 1, borderTopColor: tw.yellow200 },
  meta: { fontSize: 14, lineHeight: 20, color: UI.foreground, ...poppins(400) },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: UI.border },
  smallBtn: { height: 32, borderRadius: 6, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: UI.input, backgroundColor: '#fff', ...shadow('xs') },
  smallText: { fontSize: 14, lineHeight: 20, ...poppins(500) },
});
