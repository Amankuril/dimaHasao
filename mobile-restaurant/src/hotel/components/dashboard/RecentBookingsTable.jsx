import { StyleSheet, Text, View } from 'react-native';
import { CalendarDays } from 'lucide-react-native';
import { useNavigate } from '../../../lib/webRouter';
import { Press } from '../../../components/ui';
import { Card, EmptyState, SectionHeader } from '../../../components/ds';
import { color, space, type } from '../../../theme';
import { formatINR, formatShortDate } from '../../utils/format';
import { BookingStatusBadge, sentence } from './partnerUi';

/*
 * Port of Frontend/src/modules/Hotel/app/partner/components/dashboard/RecentBookingsTable.jsx.
 * A phone only ever shows the web's md:hidden compact card list; the desktop
 * table is not drawn.
 */
const RecentBookingsTable = ({ bookings }) => {
  const navigate = useNavigate();

  if (!bookings || bookings.length === 0) {
    return (
      <View>
        <SectionHeader title="Recent activity" />
        <Card>
          <EmptyState icon={CalendarDays} title="No recent bookings found." message="New bookings will appear here." style={{ paddingVertical: space.xxl }} />
        </Card>
      </View>
    );
  }

  return (
    <View>
      <SectionHeader title="Recent activity" action="View all" onAction={() => navigate('/hotel/partner/bookings')} />
      <Card padded={false} style={{ overflow: 'hidden' }}>
        {bookings.map((booking, index) => {
          const pType = sentence(booking.propertyId?.propertyType || booking.propertyType || '');
          const guest = booking.userId?.name || booking.guestName || 'Guest';
          return (
            <Press
              key={booking._id}
              scale={1}
              onPress={() => navigate(`/hotel/partner/bookings/${booking._id}`)}
              accessibilityLabel={`Booking for ${guest}`}
              style={[styles.row, index < bookings.length - 1 ? styles.rowBorder : null]}
            >
              <View style={styles.top}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.guest} numberOfLines={1}>
                    {guest}
                  </Text>
                  <Text style={styles.muted} numberOfLines={1}>
                    {booking.userId?.phone || booking.guestPhone?.substring(0, 10) || 'No phone'}
                  </Text>
                </View>
                <BookingStatusBadge status={booking.bookingStatus} />
              </View>

              <View style={styles.bottom}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.property} numberOfLines={1}>
                    {booking.propertyId?.propertyName || booking.property?.name || 'Property'}
                    {pType ? <Text style={styles.muted}>{`  ·  ${pType}`}</Text> : null}
                  </Text>
                  <Text style={styles.muted}>
                    {formatShortDate(booking.checkInDate || booking.checkIn)}
                    {' – '}
                    {formatShortDate(booking.checkOutDate || booking.checkOut)}
                  </Text>
                </View>
                <Text style={styles.amount}>{formatINR(booking.totalAmount)}</Text>
              </View>
            </Press>
          );
        })}
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { padding: space.lg, gap: space.sm },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  bottom: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  guest: { ...type.subheading, color: color.text },
  muted: { ...type.small, color: color.textMuted },
  property: { ...type.bodyStrong, color: color.textSecondary },
  amount: { ...type.price, color: color.text },
});

export { RecentBookingsTable };
export default RecentBookingsTable;
