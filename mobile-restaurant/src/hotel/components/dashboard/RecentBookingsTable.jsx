import { StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useNavigate } from '../../../lib/webRouter';
import { Press } from '../../../components/ui';
import { poppins, shadow, tw } from '../../../theme';
import { HT, bookingStatusColors, bookingStatusLabel } from '../../theme';
import { formatINR, formatShortDate } from '../../utils/format';

/*
 * Port of Frontend/src/modules/Hotel/app/partner/components/dashboard/RecentBookingsTable.jsx.
 * A phone only ever shows the web's md:hidden compact card list; the desktop
 * table is not drawn.
 */
const RecentBookingsTable = ({ bookings }) => {
  const navigate = useNavigate();

  if (!bookings || bookings.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No recent bookings found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.title}>Recent Activity</Text>
        <Press scale={1} onPress={() => navigate('/hotel/partner/bookings')} accessibilityLabel="View All" style={styles.viewAll}>
          <Text style={styles.viewAllText}>View All</Text>
          <ChevronRight size={14} color={HT.primary} />
        </Press>
      </View>

      {bookings.map((booking, index) => {
        const pType = (booking.propertyId?.propertyType || booking.propertyType || '').toLowerCase();
        const status = bookingStatusColors(booking.bookingStatus);
        return (
          <Press
            key={booking._id}
            scale={1}
            onPress={() => navigate(`/hotel/partner/bookings/${booking._id}`)}
            style={[styles.row, index < bookings.length - 1 ? styles.rowBorder : null]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                <Text style={styles.guest} numberOfLines={1}>{booking.userId?.name || booking.guestName || 'Guest'}</Text>
                <Text style={styles.phone}>{booking.userId?.phone || booking.guestPhone?.substring(0, 10) || 'No Phone'}</Text>
              </View>
              <View style={[styles.pill, { backgroundColor: status.bg }]}>
                <Text style={[styles.pillText, { color: status.fg }]}>{bookingStatusLabel(booking.bookingStatus)}</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                <Text style={styles.property} numberOfLines={1}>{booking.propertyId?.propertyName || booking.property?.name || 'Property'}</Text>
                <View style={styles.type}>
                  <Text style={styles.typeText}>{pType.toUpperCase()}</Text>
                </View>
                <Text style={styles.dates}>
                  {formatShortDate(booking.checkInDate || booking.checkIn)}
                  {' - '}
                  {formatShortDate(booking.checkOutDate || booking.checkOut)}
                </Text>
              </View>
              <Text style={styles.amount}>{formatINR(booking.totalAmount)}</Text>
            </View>
          </Press>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  empty: { backgroundColor: '#fff', borderRadius: 24, padding: 32, borderWidth: 1, borderColor: tw.gray100, alignItems: 'center' },
  emptyText: { fontSize: 14, lineHeight: 20, color: tw.gray400, ...poppins(400) },
  card: { backgroundColor: '#fff', borderRadius: 24, borderWidth: 1, borderColor: tw.gray100, overflow: 'hidden', ...shadow('sm') },
  head: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: tw.gray100, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 18, lineHeight: 28, color: tw.gray900, ...poppins(700) },
  viewAll: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewAllText: { fontSize: 12, lineHeight: 16, color: HT.primary, ...poppins(600) },
  row: { padding: 16 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: tw.gray100 },
  guest: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(700) },
  phone: { fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(400) },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  pillText: { fontSize: 10, lineHeight: 15, letterSpacing: 0.5, textTransform: 'uppercase', ...poppins(700) },
  property: { fontSize: 12, lineHeight: 16, color: tw.gray700, ...poppins(700) },
  type: { alignSelf: 'flex-start', backgroundColor: tw.gray50, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: tw.gray100 },
  typeText: { fontSize: 10, lineHeight: 15, color: tw.gray400, ...poppins(500) },
  dates: { fontSize: 10, lineHeight: 15, color: tw.gray400, ...poppins(500) },
  amount: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(900) },
});

export { RecentBookingsTable };
export default RecentBookingsTable;
