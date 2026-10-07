import { StyleSheet, Text, View } from 'react-native';
import { AlertCircle, ChevronRight, UserCheck } from 'lucide-react-native';
import { useNavigate } from '../../../lib/webRouter';
import { Press } from '../../../components/ui';
import { SectionHeader } from '../../../components/ds';
import { color, radii, space, tone as tones, type } from '../../../theme';

/*
 * Port of Frontend/src/modules/Hotel/app/partner/components/dashboard/ActionRequired.jsx.
 * item.link is navigated as given; usePartnerDashboard supplies /hotel/partner/... links.
 * Urgent items use the danger tone, the rest warning; each row is one 44 px+ target.
 */
const ActionRequired = ({ items }) => {
  const navigate = useNavigate();

  if (!items || items.length === 0) return null;

  return (
    <View>
      <SectionHeader title="Action required" />
      <View style={{ gap: space.md }}>
        {items.map((item, index) => {
          const t = item.urgent ? tones.danger : tones.warning;
          const Icon = item.type === 'check-in' ? UserCheck : AlertCircle;
          return (
            <Press
              key={index}
              scale={0.99}
              onPress={() => navigate(item.link)}
              accessibilityLabel={`${item.title}. ${item.description || ''}`}
              style={[styles.card, { backgroundColor: t.bg, borderColor: t.fg }]}
            >
              <View style={[styles.icon, { backgroundColor: color.surface }]}>
                <Icon size={20} color={t.fg} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[type.bodyStrong, { color: color.text }]} numberOfLines={2}>
                  {item.title}
                </Text>
                {item.description ? (
                  <Text style={[type.small, { color: color.textSecondary }]} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}
              </View>
              <View style={styles.fix}>
                <Text style={[type.label, { color: t.fg }]}>Fix now</Text>
                <ChevronRight size={16} color={t.fg} />
              </View>
            </Press>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radii.lg, borderWidth: 1 },
  icon: { width: 40, height: 40, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  fix: { flexDirection: 'row', alignItems: 'center', gap: space.xxs },
});

export { ActionRequired };
export default ActionRequired;
