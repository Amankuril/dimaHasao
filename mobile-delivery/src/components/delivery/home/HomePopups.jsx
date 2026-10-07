import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ambulance, Bell, CarFront, FileText, Phone, ShieldAlert, X } from 'lucide-react-native';
import { useDeliveryHome } from '../../../delivery/DeliveryHomeContext';
import { BottomSheet } from '../../kit';
import { Press } from '../../ui';
import { Button, EmptyState, IconButton } from '../../ds';
import { openExternal } from '../../../lib/links';
import { toast } from '../../../lib/notify';
import { color, elevation, radii, space, type } from '../../../theme';

/*
 * The two sheets opened from the home header: Emergency help (one tap to
 * call each service) and the notification inbox.
 */

function Sheet({ visible, onClose, title, subtitle, children }) {
  const insets = useSafeAreaInsets();
  return (
    <BottomSheet visible={visible} onClose={onClose} spring={{ stiffness: 300, damping: 30 }} backdrop={color.overlay}>
      <View style={[styles.panel, elevation.sheet, { paddingBottom: space.lg + insets.bottom }]}>
        <View style={styles.grabber} />
        <View style={styles.head}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.title} accessibilityRole="header">
              {title}
            </Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          <IconButton icon={X} label="Close" variant="soft" size={40} iconSize={20} onPress={onClose} />
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

  const emergencyOptions = [
    { title: 'Medical Emergency', subtitle: 'Call an ambulance', Icon: Ambulance, tone: 'danger', phone: emergencyNumbers.medicalEmergency },
    { title: 'Accident Helpline', subtitle: 'Report an accident', Icon: CarFront, tone: 'warning', phone: emergencyNumbers.accidentHelpline },
    { title: 'Contact Police', subtitle: 'Nearest police support', Icon: ShieldAlert, tone: 'info', phone: emergencyNumbers.contactPolice },
    { title: 'Insurance', subtitle: 'Policy & claim help', Icon: FileText, tone: 'neutral', phone: emergencyNumbers.insurance },
  ];
  const toneBg = { danger: color.dangerSoft, warning: color.warningSoft, info: color.infoSoft, neutral: color.surfaceMuted };
  const toneFg = { danger: color.danger, warning: color.warning, info: color.info, neutral: color.textSecondary };

  return (
    <>
      <Sheet visible={home.showEmergencyPopup} title="Emergency help" subtitle="Tap a service to call it" onClose={() => home.setShowEmergencyPopup(false)}>
        <View style={{ gap: space.sm }}>
          {emergencyOptions.map((opt) => (
            <Press
              key={opt.title}
              onPress={() => {
                const num = opt.phone?.replace(/\D/g, '');
                if (num) openExternal(`tel:${num}`);
                else toast.error('Number not configured');
              }}
              scale={0.98}
              accessibilityLabel={`Call ${opt.title}`}
              style={styles.option}
            >
              <View style={[styles.optionIcon, { backgroundColor: toneBg[opt.tone] }]}>
                <opt.Icon size={24} color={toneFg[opt.tone]} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.optionTitle}>{opt.title}</Text>
                <Text style={styles.optionSub}>{opt.subtitle}</Text>
              </View>
              <View style={[styles.callIcon, opt.tone === 'danger' && { backgroundColor: color.danger }]}>
                <Phone size={18} color={opt.tone === 'danger' ? color.textInverse : color.primary} />
              </View>
            </Press>
          ))}
        </View>
      </Sheet>

      <Sheet visible={home.showNotifications} title="Notifications" onClose={() => home.setShowNotifications(false)}>
        <ScrollView style={{ maxHeight: height * 0.55 }} contentContainerStyle={{ gap: space.sm }}>
          {items && items.length > 0 ? (
            <>
              <View style={{ alignItems: 'flex-end' }}>
                <Button
                  title="Clear all"
                  variant="ghost"
                  size="sm"
                  fullWidth={false}
                  onPress={() => {
                    inbox.dismissAll();
                    toast.success('All notifications cleared');
                  }}
                  accessibilityLabel="Clear All"
                  style={{ alignSelf: 'flex-end' }}
                />
              </View>
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
                  accessibilityLabel={item.read ? item.title : `Unread. ${item.title}`}
                  style={[styles.item, { backgroundColor: item.read ? color.surface : color.primarySoft, borderColor: item.read ? color.border : color.primaryBorder }]}
                >
                  <View style={[styles.itemIcon, { backgroundColor: item.read ? color.surfaceMuted : color.primary }]}>
                    <Bell size={16} color={item.read ? color.textMuted : color.onPrimary} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={styles.itemHead}>
                      <Text numberOfLines={1} style={[styles.itemTitle, { color: color.text }, item.read && { fontFamily: 'NunitoSans_600SemiBold' }]}>
                        {item.title}
                      </Text>
                      <Text style={styles.itemTime}>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    </View>
                    <Text numberOfLines={item.read ? 2 : undefined} style={styles.itemMsg}>
                      {item.message}
                    </Text>
                  </View>
                </Press>
              ))}
            </>
          ) : (
            <EmptyState icon={Bell} title="No notifications" message="Order requests and updates will appear here." style={{ paddingVertical: space.xxxl }} />
          )}
        </ScrollView>
        <Button
          title="View notification history"
          variant="outline"
          onPress={() => {
            home.setShowNotifications(false);
            router.push('/food/delivery/notifications');
          }}
          accessibilityLabel="View Notification History"
          style={{ marginTop: space.lg }}
        />
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: color.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, paddingHorizontal: space.lg, paddingTop: space.sm },
  grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: color.borderStrong, alignSelf: 'center', marginBottom: space.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.lg },
  title: { ...type.heading, color: color.text },
  subtitle: { ...type.small, color: color.textMuted, marginTop: 2 },
  option: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, minHeight: 72, backgroundColor: color.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border },
  optionIcon: { width: 48, height: 48, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  optionTitle: { ...type.subheading, color: color.text },
  optionSub: { ...type.small, color: color.textMuted },
  callIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, padding: space.md, borderRadius: radii.lg, borderWidth: 1 },
  itemIcon: { width: 36, height: 36, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  itemHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: space.sm },
  itemTitle: { ...type.bodyStrong, flex: 1 },
  itemTime: { ...type.caption, color: color.textMuted, paddingTop: 2 },
  itemMsg: { ...type.small, color: color.textSecondary, marginTop: 2 },
});
