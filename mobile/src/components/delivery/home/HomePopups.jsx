import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertTriangle, Bell } from 'lucide-react-native';
import { useDeliveryHome } from '../../../delivery/DeliveryHomeContext';
import { BottomSheet } from '../../kit';
import { Press } from '../../ui';
import { openExternal } from '../../../lib/links';
import { toast } from '../../../lib/notify';
import { display, poppins, shadow, tw } from '../../../theme';

/*
 * The two BottomPopup sheets of pages/DeliveryHomeV2.jsx: Emergency Help and
 * Notifications. `p-6` -> 17.6 px; rounded-2xl / rounded-3xl get the theme's
 * card shadow (and #E5DDC3 where they have a border).
 */

function Sheet({ visible, onClose, title, children }) {
  const insets = useSafeAreaInsets();
  return (
    <BottomSheet visible={visible} onClose={onClose} spring={{ stiffness: 300, damping: 30 }}>
      <View style={[styles.panel, shadow('2xl'), { paddingBottom: 17.6 + insets.bottom }]}>
        <View style={styles.head}>
          <Text style={styles.title}>{title}</Text>
          {/* The web's close button really shows an AlertTriangle. */}
          <Press onPress={onClose} accessibilityLabel="Close" style={styles.close}>
            <AlertTriangle size={16} color={tw.gray500} />
          </Press>
        </View>
        {children}
      </View>
    </BottomSheet>
  );
}

export default function HomePopups() {
  const { height } = useWindowDimensions();
  const home = useDeliveryHome();
  const { emergencyNumbers, inbox } = home;
  const items = inbox.items;

  // text-red-600 stays red; orange/blue/green-600 are repainted to the primary.
  const emergencyOptions = [
    { title: 'Medical Emergency', subtitle: 'Call an ambulance', color: tw.red600, phone: emergencyNumbers.medicalEmergency },
    { title: 'Accident Helpline', subtitle: 'Report an accident', color: tw.primary, phone: emergencyNumbers.accidentHelpline },
    { title: 'Contact Police', subtitle: 'Nearest police support', color: tw.primary, phone: emergencyNumbers.contactPolice },
    { title: 'Insurance', subtitle: 'Policy & claim help', color: tw.primary, phone: emergencyNumbers.insurance },
  ];

  return (
    <>
      <Sheet visible={home.showEmergencyPopup} title="Emergency Help" onClose={() => home.setShowEmergencyPopup(false)}>
        <View style={{ gap: 16, paddingVertical: 8 }}>
          {emergencyOptions.map((opt) => (
            <Press
              key={opt.title}
              onPress={() => {
                const num = opt.phone?.replace(/\D/g, '');
                if (num) openExternal(`tel:${num}`);
                else toast.error('Number not configured');
              }}
              accessibilityLabel={opt.title}
              style={[styles.option, shadow('card')]}
            >
              <View style={[styles.optionIcon, shadow('sm')]}>
                <AlertTriangle size={24} color={opt.color} />
              </View>
              <View>
                <Text style={styles.optionTitle}>{opt.title}</Text>
                <Text style={styles.optionSub}>{opt.subtitle}</Text>
              </View>
            </Press>
          ))}
        </View>
      </Sheet>

      <Sheet visible={home.showNotifications} title="Notifications" onClose={() => home.setShowNotifications(false)}>
        <ScrollView style={{ marginTop: -8, maxHeight: height * 0.6 }} contentContainerStyle={{ gap: 12, paddingRight: 4 }}>
          {items && items.length > 0 ? (
            <>
              <View style={{ alignItems: 'flex-end', marginBottom: 4 }}>
                <Press
                  onPress={() => {
                    inbox.dismissAll();
                    toast.success('All notifications cleared');
                  }}
                  accessibilityLabel="Clear All"
                  style={styles.clearAll}
                >
                  <Text style={styles.clearAllText}>Clear All</Text>
                </Press>
              </View>
              <View style={{ gap: 10 }}>
                {items.map((item) => (
                  <Press
                    key={item.id}
                    scale={0.98}
                    onPress={() => {
                      inbox.markAsRead(item.id);
                      if (item.link) {
                        const path = item.link.startsWith('/') ? item.link : `/${item.link}`;
                        router.push(path);
                        home.setShowNotifications(false);
                      }
                    }}
                    accessibilityLabel={item.title}
                    style={[styles.item, shadow('card'), { backgroundColor: item.read ? tw.gray50 : tw.primarySoft }]}
                  >
                    <View style={[styles.itemIcon, item.read ? { backgroundColor: tw.gray200 } : [{ backgroundColor: '#EB590E' }, shadow('lg')]]}>
                      <Bell size={16} color={item.read ? tw.gray500 : '#fff'} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={styles.itemHead}>
                        <Text numberOfLines={1} style={[styles.itemTitle, { color: item.read ? tw.gray600 : tw.gray950 }]}>
                          {item.title}
                        </Text>
                        <Text style={styles.itemTime}>
                          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                      <Text numberOfLines={item.read ? 2 : undefined} style={[styles.itemMsg, { color: item.read ? tw.gray500 : tw.gray700 }]}>
                        {item.message}
                      </Text>
                    </View>
                  </Press>
                ))}
              </View>
            </>
          ) : (
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, shadow('card')]}>
                <Bell size={28} color={tw.gray300} />
              </View>
              <Text style={styles.emptyTitle}>No Notifications</Text>
              <Text style={styles.emptyText}>System notifications for order requests and updates will appear here.</Text>
            </View>
          )}
        </ScrollView>
        <View style={{ marginTop: 32, marginBottom: 8 }}>
          <Press
            onPress={() => {
              home.setShowNotifications(false);
              router.push('/food/delivery/notifications');
            }}
            accessibilityLabel="View Notification History"
            style={[styles.history, shadow('card')]}
          >
            <Text style={styles.historyText}>View Notification History</Text>
          </Press>
        </View>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 17.6 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  title: { fontSize: 20, lineHeight: 28, color: tw.gray900, textTransform: 'uppercase', ...display(900, 20) },
  close: { width: 32, height: 32, borderRadius: 16, backgroundColor: tw.gray100, alignItems: 'center', justifyContent: 'center' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 20, padding: 16, backgroundColor: tw.gray50, borderRadius: 16 },
  optionIcon: { width: 48, height: 48, backgroundColor: '#fff', borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  // h4 -> Sora
  optionTitle: { fontSize: 16, lineHeight: 24, color: tw.gray900, ...display(700, 16) },
  optionSub: { fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(500) },
  clearAll: { backgroundColor: tw.red50, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  clearAllText: { fontSize: 10, lineHeight: 15, textTransform: 'uppercase', color: tw.red500, ...display(900, 10) },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E5DDC3' },
  itemIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  itemHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  itemTitle: { flex: 1, fontSize: 14, lineHeight: 20, ...display(700, 14) },
  itemTime: { fontSize: 9, lineHeight: 13.5, textTransform: 'uppercase', color: tw.gray400, paddingTop: 2, ...display(900, 9) },
  itemMsg: { marginTop: 2, fontSize: 12, lineHeight: 19.5, ...poppins(400) },
  empty: { paddingVertical: 80, paddingHorizontal: 40, alignItems: 'center' },
  emptyIcon: { width: 64, height: 64, backgroundColor: tw.gray50, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#E5DDC3' },
  emptyTitle: { fontSize: 14, lineHeight: 14, textTransform: 'uppercase', color: tw.gray900, marginBottom: 8, textAlign: 'center', ...display(900, 14) },
  emptyText: { fontSize: 12, lineHeight: 19.5, letterSpacing: -0.3, textTransform: 'uppercase', color: tw.gray400, textAlign: 'center', ...poppins(700) },
  history: { width: '100%', paddingVertical: 16, borderRadius: 16, backgroundColor: tw.gray950, alignItems: 'center' },
  historyText: { fontSize: 12, lineHeight: 16, textTransform: 'uppercase', color: '#fff', ...display(900, 12) },
});
