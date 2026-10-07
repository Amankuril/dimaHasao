import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Image from '../../components/Img';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Fa from '../../components/Fa';
import { Press } from '../../components/ui';
import { Button, Card, ListRow, SectionHeader, StatusBadge, fa } from '../../components/ds';

import { Header, PatternDivider } from '../../components/dh/Header';
import { NAV_CLEARANCE } from '../../components/dh/AppBottomNav';
import { ModuleAccordion } from '../../components/dh/ModuleAccordion';
import { dhs } from '../../components/dh/ui';
import { useBooking } from '../../context/BookingContext';
import { MODULE_SECTIONS } from '../../data/moduleSections';
import { openExternal } from '../../lib/links';
import { color, elevation, radii, space, type } from '../../theme';

const FA_CHEVRON = fa('fa-solid fa-chevron-right');

// Web: DimaHasao/pages/MoreScreen.jsx (/app/more)

const AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDHxXjaqg_p2_vshVQlQARltQKITPTxRdxMMlP-3QyFF5y8e2b25l5rewGDv8hjTJT1mIeodoXkQyW5Q5DbamrNM5Wqkn9zC5hXH-uNiaqjmuWSf0eYIG090j8R2skAqbm4nCA9jzMl8Rca5t2ANsI31UQDQpgiAqnjiXgjeFcP5hsy0iTh8orLvaeTNhXhfOJY7K7F6qam7R85TVEaEb8naGgso3oEml2Ix6YFyN-Jua917AHlmZIs';

const SERVICES = [
  { title: 'Tourist Attractions', desc: 'Jatinga, Haflong, Silaikul & hidden waterfalls', icon: 'fa-solid fa-mountain-sun', path: '/app/places' },
  { title: 'Hotels & Homestays', desc: 'Scenic resorts, traditional cottages & lodges', icon: 'fa-solid fa-hotel', path: '/app/hotels' },
  { title: 'Food & Dining Delivery', desc: 'Authentic Dimasa smoked delicacies & cafes', icon: 'fa-solid fa-utensils', path: '/food/user' },
  { title: 'Taxi & Auto Booking', desc: 'Verified drivers, fixed MRP & instant confirmation', icon: 'fa-solid fa-taxi', path: '/taxi/user' },
  { title: 'Tour & Trek Packages', desc: 'All-inclusive guided expeditions & camps', icon: 'fa-solid fa-suitcase-rolling', path: '/app/packages' },
  { title: 'Falcon Festival & Events', desc: 'Official government passes & music gala', icon: 'fa-solid fa-ticket', path: '/app/festivals' },
  { title: 'Help & Support (SOS)', desc: 'Emergency hotlines, ticket raising & FAQs', icon: 'fa-solid fa-headset', tone: 'danger', path: '/app/support' },
  { title: 'Rate & Review', desc: 'Share verified feedback for rides and stays', icon: 'fa-solid fa-star', tone: 'gold', path: '/app/review' },
];

export default function MoreScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout, showToast } = useBooking();

  const cultural = [
    { title: 'Local Certified Guides', desc: 'Expert local Dimasa eco-guides & trekking experts', icon: 'fa-solid fa-user-tie', action: () => showToast('Connecting to Certified Dimasa Guides Desk (+91 94350 12345)') },
    { title: 'Events & Falcon Festival', desc: 'Annual wildlife festival & cultural passes', icon: 'fa-solid fa-calendar-days', action: () => router.navigate('/app/festivals') },
    { title: 'Curated Tour Packages', desc: 'All-inclusive 2-Day & 3-Day scenic nature treks', icon: 'fa-solid fa-suitcase-rolling', action: () => router.navigate('/app/packages') },
    { title: 'Authentic Dimasa Cuisine', desc: 'Judima rice brew, smoked meat & organic herbs', icon: 'fa-solid fa-utensils', action: () => router.navigate('/food/user') },
  ];

  const handleLogout = async () => {
    await logout();
    router.replace('/app/login');
  };

  return (
    <View style={dhs.page}>
      <Header title="MORE & SERVICES" subtitle="Explore all Dima Hasao services" showBack rightAction="none" />
      <PatternDivider variant="green-gold" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: space.lg, gap: space.xxl, paddingBottom: NAV_CLEARANCE + insets.bottom + space.lg }}>
        <View style={styles.userCard}>
          <View style={[dhs.row, { gap: space.md, flex: 1, minWidth: 0 }]}>
            <View style={styles.avatarWrap}>
              <Image source={{ uri: AVATAR }} style={styles.avatar} />
            </View>
            <View style={{ flex: 1, minWidth: 0, alignItems: 'flex-start', gap: 2 }}>
              <Text style={styles.userName} numberOfLines={1}>
                {user.name}
              </Text>
              <Text style={styles.userPhone} numberOfLines={1}>
                {user.phone || '+91 98765 43210'}
              </Text>
              <StatusBadge label="Logged in" tone="gold" icon={fa('fa-solid fa-circle-check')} style={{ marginTop: space.xs }} />
            </View>
          </View>
          <Press onPress={() => router.navigate('/app/profile')} style={styles.viewProfile} accessibilityLabel="View profile">
            <Text style={styles.viewProfileText}>View profile</Text>
            <Fa name="fa-solid fa-arrow-right" size={12} color={color.goldOnDark} />
          </Press>
        </View>

        <View>
          <SectionHeader title="Travel modules" />
          <Card padded={false}>
            {SERVICES.map((item, i) => (
              <ListRow chevronIcon={FA_CHEVRON}
                key={item.title}
                icon={fa(item.icon)}
                iconTone={item.tone || 'primary'}
                title={item.title}
                subtitle={item.desc}
                onPress={() => router.navigate(item.path)}
                divider={i < SERVICES.length - 1}
              />
            ))}
          </Card>
        </View>

        {/* Each module's own navigation (what used to live in its own bottom bar). */}
        <View style={{ gap: space.md }}>
          <View>
            <SectionHeader title="Inside each service" style={{ marginBottom: space.xs }} />
            <Text style={styles.hint}>Every module’s own tabs</Text>
          </View>
          {MODULE_SECTIONS.map((section) => (
            <ModuleAccordion key={section.id} section={section} rows={section.services} onNavigate={(path) => router.navigate(path)} />
          ))}
        </View>

        <View>
          <SectionHeader title="Tourism & culture" />
          <Card padded={false}>
            {cultural.map((item, i) => (
              <ListRow chevronIcon={FA_CHEVRON} key={item.title} icon={fa(item.icon)} iconTone="gold" title={item.title} subtitle={item.desc} onPress={item.action} divider={i < cultural.length - 1} />
            ))}
          </Card>
        </View>

        <View style={styles.emergency}>
          <View style={[dhs.row, { justifyContent: 'space-between', gap: space.sm, marginBottom: space.md, flexWrap: 'wrap' }]}>
            <View style={[dhs.row, { gap: space.sm }]}>
              <Fa name="fa-solid fa-shield-heart" size={18} color={color.danger} />
              <Text style={styles.emergencyTitle} accessibilityRole="header">
                Emergency numbers
              </Text>
            </View>
            <StatusBadge label="24x7 assistance" tone="danger" />
          </View>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Press scale={0.97} onPress={() => openExternal('tel:112')} style={styles.sos} accessibilityRole="link" accessibilityLabel="Call Police SOS 112">
              <Fa name="fa-solid fa-phone" size={14} color={color.danger} />
              <Text style={styles.sosLabel}>Police SOS</Text>
              <Text style={styles.sosNumber}>112</Text>
            </Press>
            <Press scale={0.97} onPress={() => openExternal('tel:03673236222')} style={styles.sos} accessibilityRole="link" accessibilityLabel="Call Civil Hospital 03673-236222">
              <Fa name="fa-solid fa-phone" size={14} color={color.danger} />
              <Text style={styles.sosLabel}>Civil Hospital</Text>
              <Text style={styles.sosNumber}>03673-236222</Text>
            </Press>
          </View>
        </View>

        <View style={{ gap: space.md }}>
          {user.isLoggedIn ? (
            <Button title="Log out" variant="dangerSoft" icon={fa('fa-solid fa-right-from-bracket')} onPress={handleLogout} accessibilityLabel="Log Out" />
          ) : (
            <Button title="Sign in / Register" icon={fa('fa-solid fa-right-to-bracket')} onPress={() => router.replace('/app/login')} />
          )}
          <Text style={styles.version}>Dima Hasao Tourism Official Web App • v2.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  userCard: { borderRadius: radii.lg, padding: space.lg, backgroundColor: color.primaryDeep, borderWidth: 1, borderColor: 'rgba(202,168,62,0.45)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, ...elevation.card },
  avatarWrap: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: color.gold, padding: 2, overflow: 'hidden' },
  avatar: { width: '100%', height: '100%', borderRadius: 26 },
  userName: { ...type.subheading, color: color.goldOnDark },
  userPhone: { ...type.small, color: color.textOnDarkMuted },
  viewProfile: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: space.xs + 2, backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: space.md, borderRadius: radii.md },
  viewProfileText: { ...type.label, color: color.goldOnDark },
  hint: { ...type.caption, color: color.textMuted },
  emergency: { backgroundColor: color.dangerSoft, borderRadius: radii.lg, padding: space.lg },
  emergencyTitle: { ...type.subheading, color: color.danger },
  sos: { flex: 1, minHeight: 72, padding: space.md, borderRadius: radii.md, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center', gap: 2 },
  sosLabel: { ...type.caption, color: color.textSecondary },
  sosNumber: { ...type.bodyStrong, color: color.danger },
  version: { textAlign: 'center', ...type.caption, color: color.textMuted },
});
