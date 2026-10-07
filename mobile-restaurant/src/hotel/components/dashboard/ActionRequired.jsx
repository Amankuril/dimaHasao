import { StyleSheet, Text, View } from 'react-native';
import { AlertCircle, UserCheck } from 'lucide-react-native';
import { useNavigate } from '../../../lib/webRouter';
import { Press } from '../../../components/ui';
import { poppins, shadow, tw } from '../../../theme';

/*
 * Port of Frontend/src/modules/Hotel/app/partner/components/dashboard/ActionRequired.jsx.
 * item.link is navigated as given; usePartnerDashboard supplies /hotel/partner/... links.
 */
const ActionRequired = ({ items }) => {
  const navigate = useNavigate();

  if (!items || items.length === 0) return null;

  return (
    <View style={{ marginBottom: 32 }}>
      <Text style={styles.heading}>Action Required</Text>
      <View style={{ gap: 12 }}>
        {items.map((item, index) => {
          const urgent = Boolean(item.urgent);
          return (
            <Press
              key={index}
              scale={1}
              onPress={() => navigate(item.link)}
              style={[styles.card, { backgroundColor: urgent ? tw.red50 : tw.orange50, borderColor: urgent ? tw.red100 : tw.orange100 }]}
            >
              <View style={[styles.icon, { backgroundColor: urgent ? tw.red100 : tw.orange100 }]}>
                {item.type === 'check-in' ? (
                  <UserCheck size={24} color={urgent ? tw.red600 : tw.orange600} />
                ) : (
                  <AlertCircle size={24} color={urgent ? tw.red600 : tw.orange600} />
                )}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.title, { color: urgent ? tw.red800 : tw.orange900 }]}>{item.title}</Text>
                <Text style={[styles.desc, { color: urgent ? tw.red600 : tw.orange700 }]}>{item.description}</Text>
              </View>
              <View style={styles.fix}>
                <Text style={[styles.fixText, { color: urgent ? tw.red600 : tw.orange600 }]}>Fix Now</Text>
              </View>
            </Press>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  heading: { fontSize: 16, lineHeight: 24, color: tw.gray900, marginBottom: 16, paddingHorizontal: 4, ...poppins(700) },
  card: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1 },
  icon: { padding: 12, borderRadius: 12, marginRight: 16 },
  title: { fontSize: 16, lineHeight: 24, ...poppins(700) },
  desc: { fontSize: 14, lineHeight: 20, ...poppins(400) },
  fix: { marginLeft: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: '#fff', ...shadow('sm') },
  fixText: { fontSize: 14, lineHeight: 20, ...poppins(700) },
});

export { ActionRequired };
export default ActionRequired;
