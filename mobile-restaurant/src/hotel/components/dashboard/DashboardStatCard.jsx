import { StyleSheet, Text, View } from 'react-native';
import { Press } from '../../../components/ui';
import { poppins, shadow, tw } from '../../../theme';
import { HT } from '../../theme';

/*
 * Port of Frontend/src/modules/Hotel/app/partner/components/dashboard/DashboardStatCard.jsx
 * at the phone sizes (the sm: variants are off). `colorClass` becomes `color`,
 * the icon's colour (a hex; default HT.primary).
 */
const DashboardStatCard = ({ icon: Icon, label, value, actionLabel, onAction, color = HT.primary }) => (
  <View style={styles.card}>
    <View style={styles.top}>
      <View style={styles.iconBox}>
        <Icon size={16} color={color} />
      </View>
      {actionLabel ? (
        <Press scale={1} onPress={onAction} accessibilityLabel={actionLabel} style={{ marginLeft: 4 }}>
          <Text style={styles.action}>{actionLabel}</Text>
        </Press>
      ) : null}
    </View>
    <View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: { flex: 1, backgroundColor: '#fff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: tw.gray100, justifyContent: 'space-between', ...shadow('sm') },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  iconBox: { padding: 6, borderRadius: 8, backgroundColor: tw.gray50 },
  action: { fontSize: 9, lineHeight: 13.5, color: HT.primary, ...poppins(600) },
  value: { fontSize: 16, lineHeight: 20, color: tw.gray900, ...poppins(700) },
  label: { fontSize: 10, lineHeight: 12.5, color: tw.gray500, marginTop: 2, ...poppins(500) },
});

export { DashboardStatCard };
export default DashboardStatCard;
