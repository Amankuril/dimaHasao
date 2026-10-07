import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Building2, Palmtree, Home, BedDouble, ArrowLeft, ChevronRight, X } from 'lucide-react-native';
import { useNavigate } from '../../lib/webRouter';
import { Press } from '../../components/ui';
import { poppins, shadow, tw } from '../../theme';
import { HT } from '../theme';

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
    color: { bg: tw.blue50, fg: tw.blue600 },
  },
  {
    key: 'resort',
    label: 'Resort',
    description: 'A destination stay with on-site activities and amenities',
    badge: 'Leisure',
    icon: Palmtree,
    route: '/hotel/partner/join-resort',
    color: { bg: tw.emerald50, fg: tw.emerald600 },
  },
  {
    key: 'homestay',
    label: 'Homestay',
    description: 'A room or the whole home, hosted by you',
    badge: 'Hosted',
    icon: Home,
    route: '/hotel/partner/join-homestay',
    color: { bg: tw.amber50, fg: tw.amber600 },
  },
  {
    key: 'lodge',
    label: 'Lodge',
    description: 'A smaller roomed property for short stays',
    badge: 'Rooms',
    icon: BedDouble,
    route: '/hotel/partner/join-lodge',
    color: { bg: tw.purple50, fg: tw.purple600 },
  },
];

const PartnerJoinPropertyType = () => {
  const navigate = useNavigate();
  const insets = useSafeAreaInsets();

  const handleSelectType = (item) => {
    navigate(item.route, { state: { categoryName: item.label, propertyType: item.key } });
  };

  return (
    <View style={{ flex: 1, backgroundColor: HT.bg }}>
      <View style={[styles.header, { paddingTop: insets.top, height: 64 + insets.top }]}>
        <Press onPress={() => navigate(-1)} accessibilityLabel="Back" style={styles.headBtn}>
          <ArrowLeft size={20} color={tw.gray600} />
        </Press>
        <Text style={styles.headTitle}>Select Property Type</Text>
        <Press onPress={() => navigate('/hotel/partner/dashboard')} accessibilityLabel="Close" style={styles.headBtn}>
          <X size={20} color={tw.gray600} />
        </Press>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 16 + insets.bottom }}>
        <View style={{ marginBottom: 24, gap: 8 }}>
          <Text style={styles.h1}>What are you listing?</Text>
          <Text style={styles.sub}>Select the type of property you want to list.</Text>
        </View>

        <View style={{ gap: 16 }}>
          {PROPERTY_TYPES.map((item) => {
            const Icon = item.icon;
            return (
              <Press key={item.key} onPress={() => handleSelectType(item)} scale={0.98} style={styles.card}>
                <View style={[styles.iconBox, { backgroundColor: item.color.bg }]}>
                  <Icon size={24} color={item.color.fg} />
                </View>

                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.label}>{item.label}</Text>
                  <Text style={styles.desc} numberOfLines={2}>
                    {item.description}
                  </Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.badge}</Text>
                  </View>
                </View>

                <View style={{ position: 'absolute', top: 16, right: 16 }}>
                  <ChevronRight size={16} color={tw.gray300} />
                </View>
              </Press>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: tw.gray100,
    ...shadow('sm'),
  },
  headBtn: { padding: 8, borderRadius: 999 },
  headTitle: { fontSize: 18, lineHeight: 28, color: tw.gray800, ...poppins(700) },
  h1: { fontSize: 24, lineHeight: 32, color: tw.gray900, ...poppins(700) },
  sub: { fontSize: 14, lineHeight: 20, color: tw.gray500, ...poppins(400) },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: tw.gray200,
    borderRadius: 16,
    ...shadow('sm'),
  },
  iconBox: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 16, lineHeight: 24, color: tw.gray900, marginBottom: 4, ...poppins(700) },
  desc: { fontSize: 12, lineHeight: 19.5, color: tw.gray500, marginBottom: 8, ...poppins(400) },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, backgroundColor: tw.gray100, borderRadius: 6 },
  badgeText: { fontSize: 10, lineHeight: 15, letterSpacing: 0.5, textTransform: 'uppercase', color: tw.gray500, ...poppins(700) },
});

export default PartnerJoinPropertyType;
