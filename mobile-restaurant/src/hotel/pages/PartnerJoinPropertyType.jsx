import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Building2, Palmtree, Home, BedDouble, ChevronRight, X } from 'lucide-react-native';
import { Card, IconButton, StatusBadge } from '../../components/ds';
import HeritageHeader from '../../components/HeritageHeader';
import { useNavigate } from '../../lib/webRouter';
import { color, radii, space, tone, type } from '../../theme';

/*
 * Port of Frontend/src/modules/Hotel/app/partner/pages/PartnerJoinPropertyType.jsx.
 *
 * Property type picker for a partner adding a listing: hotels, resorts,
 * homestays and lodges, each routing to its wizard.
 */

const PROPERTY_TYPES = [
  {
    key: 'hotel',
    label: 'Hotel',
    description: 'Rooms sold nightly, with a front desk and shared facilities',
    badge: 'Rooms',
    icon: Building2,
    route: '/hotel/partner/join-hotel',
    tone: 'primary',
  },
  {
    key: 'resort',
    label: 'Resort',
    description: 'A destination stay with on-site activities and amenities',
    badge: 'Leisure',
    icon: Palmtree,
    route: '/hotel/partner/join-resort',
    tone: 'success',
  },
  {
    key: 'homestay',
    label: 'Homestay',
    description: 'A room or the whole home, hosted by you',
    badge: 'Hosted',
    icon: Home,
    route: '/hotel/partner/join-homestay',
    tone: 'gold',
  },
  {
    key: 'lodge',
    label: 'Lodge',
    description: 'A smaller roomed property for short stays',
    badge: 'Rooms',
    icon: BedDouble,
    route: '/hotel/partner/join-lodge',
    tone: 'info',
  },
];

const PartnerJoinPropertyType = () => {
  const navigate = useNavigate();
  const insets = useSafeAreaInsets();

  const handleSelectType = (item) => {
    navigate(item.route, { state: { categoryName: item.label, propertyType: item.key } });
  };

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <StatusBar style="light" />
      <HeritageHeader
        title="Select property type"
        onBack={() => navigate(-1)}
        right={<IconButton icon={X} label="Close" onPress={() => navigate('/hotel/partner/dashboard')} iconColor={color.textInverse} />}
      />

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: space.xxl + insets.bottom }]}>
        <View style={{ gap: space.xs }}>
          <Text style={styles.h1} accessibilityRole="header">
            What are you listing?
          </Text>
          <Text style={styles.sub}>Select the type of property you want to list.</Text>
        </View>

        <View style={{ gap: space.md }}>
          {PROPERTY_TYPES.map((item) => {
            const Icon = item.icon;
            const t = tone[item.tone];
            return (
              <Card key={item.key} onPress={() => handleSelectType(item)} accessibilityLabel={`${item.label}. ${item.description}`} style={styles.card}>
                <View style={[styles.iconBox, { backgroundColor: t.bg }]}>
                  <Icon size={24} color={t.fg} />
                </View>

                <View style={{ flex: 1, minWidth: 0, gap: space.xs }}>
                  <Text style={styles.label}>{item.label}</Text>
                  <Text style={styles.desc} numberOfLines={2}>
                    {item.description}
                  </Text>
                  <StatusBadge label={item.badge} tone="neutral" />
                </View>

                <ChevronRight size={20} color={color.textMuted} />
              </Card>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 768, alignSelf: 'center', padding: space.lg, gap: space.xl },
  h1: { ...type.heading, color: color.text },
  sub: { ...type.body, color: color.textSecondary },
  card: { flexDirection: 'row', alignItems: 'center', gap: space.lg, minHeight: 88 },
  iconBox: { width: 48, height: 48, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  label: { ...type.subheading, color: color.text },
  desc: { ...type.small, color: color.textSecondary },
});

export default PartnerJoinPropertyType;
