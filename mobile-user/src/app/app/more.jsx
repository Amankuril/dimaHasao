import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Image from '../../components/Img';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Fa from '../../components/Fa';
import { Press } from '../../components/ui';
import { Header, PatternDivider } from '../../components/dh/Header';
import { ModuleAccordion } from '../../components/dh/ModuleAccordion';
import { dhs } from '../../components/dh/ui';
import { useBooking } from '../../context/BookingContext';
import { MODULE_SECTIONS } from '../../data/moduleSections';
import { openExternal } from '../../lib/links';
import { dh, poppins, shadow, tw } from '../../theme';

// Web: DimaHasao/pages/MoreScreen.jsx (/app/more)

const AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDHxXjaqg_p2_vshVQlQARltQKITPTxRdxMMlP-3QyFF5y8e2b25l5rewGDv8hjTJT1mIeodoXkQyW5Q5DbamrNM5Wqkn9zC5hXH-uNiaqjmuWSf0eYIG090j8R2skAqbm4nCA9jzMl8Rca5t2ANsI31UQDQpgiAqnjiXgjeFcP5hsy0iTh8orLvaeTNhXhfOJY7K7F6qam7R85TVEaEb8naGgso3oEml2Ix6YFyN-Jua917AHlmZIs';

const SERVICES = [
  { title: 'Tourist Attractions', desc: 'Jatinga, Haflong, Silaikul & hidden waterfalls', icon: 'fa-solid fa-mountain-sun', color: tw.emerald700, bg: tw.emerald50, path: '/app/places' },
  { title: 'Hotels & Homestays', desc: 'Scenic resorts, traditional cottages & lodges', icon: 'fa-solid fa-hotel', color: tw.purple600, bg: tw.purple50, path: '/app/hotels' },
  { title: 'Food & Dining Delivery', desc: 'Authentic Dimasa smoked delicacies & cafes', icon: 'fa-solid fa-utensils', color: tw.rose600, bg: tw.rose50, path: '/food/user' },
  { title: 'Taxi & Auto Booking', desc: 'Verified drivers, fixed MRP & instant confirmation', icon: 'fa-solid fa-taxi', color: tw.amber600, bg: tw.amber50, path: '/taxi/user' },
  { title: 'Tour & Trek Packages', desc: 'All-inclusive guided expeditions & camps', icon: 'fa-solid fa-suitcase-rolling', color: tw.teal600, bg: tw.teal50, path: '/app/packages' },
  { title: 'Falcon Festival & Events', desc: 'Official government passes & music gala', icon: 'fa-solid fa-ticket', color: tw.orange600, bg: tw.orange50, path: '/app/festivals' },
  { title: 'Help & Support (SOS)', desc: 'Emergency hotlines, ticket raising & FAQs', icon: 'fa-solid fa-headset', color: tw.red600, bg: tw.red50, path: '/app/support' },
  { title: 'Rate & Review', desc: 'Share verified feedback for rides and stays', icon: 'fa-solid fa-star', color: tw.yellow600, bg: tw.yellow50, path: '/app/review' },
];

function SectionTitle({ icon, children, right }) {
  return (
    <View style={[dhs.row, { justifyContent: 'space-between' }]}>
      <View style={[dhs.row, { gap: 6 }]}>
        <Fa name={icon} size={12} color={tw.emerald700} />
        <Text style={styles.sectionTitle}>{children}</Text>
      </View>
      {right}
    </View>
  );
}

export default function MoreScreen() {
  const { user, logout, showToast } = useBooking();

  const cultural = [
    { title: 'Local Certified Guides', desc: 'Expert local Dimasa eco-guides & trekking experts', icon: 'fa-solid fa-user-tie', color: tw.green600, action: () => showToast('Connecting to Certified Dimasa Guides Desk (+91 94350 12345)') },
    { title: 'Events & Falcon Festival', desc: 'Annual wildlife festival & cultural passes', icon: 'fa-solid fa-calendar-days', color: tw.orange500, action: () => router.navigate('/app/festivals') },
    { title: 'Curated Tour Packages', desc: 'All-inclusive 2-Day & 3-Day scenic nature treks', icon: 'fa-solid fa-suitcase-rolling', color: tw.teal600, action: () => router.navigate('/app/packages') },
    { title: 'Authentic Dimasa Cuisine', desc: 'Judima rice brew, smoked meat & organic herbs', icon: 'fa-solid fa-utensils', color: tw.red500, action: () => router.navigate('/food/user') },
  ];

  const handleLogout = async () => {
    await logout();
    router.replace('/app/login');
  };

  return (
    <View style={dhs.page}>
      <Header title="MORE & SERVICES" subtitle="Explore all Dima Hasao services" showBack rightAction="none" />
      <PatternDivider variant="green-gold" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 96 }}>
        <View style={styles.userCard}>
          <LinearGradient colors={['#0A2E12', '#186A43']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={[dhs.row, { gap: 14, flex: 1, minWidth: 0 }]}>
            <View style={styles.avatarWrap}>
              <Image source={{ uri: AVATAR }} style={styles.avatar} />
            </View>
            <View style={{ flex: 1, minWidth: 0, alignItems: 'flex-start' }}>
              <Text style={styles.userName} numberOfLines={1}>{user.name}</Text>
              <Text style={styles.userPhone} numberOfLines={1}>{user.phone || '+91 98765 43210'}</Text>
              <Text style={styles.loggedIn}>Logged In</Text>
            </View>
          </View>
          <Press onPress={() => router.navigate('/app/profile')} style={styles.viewProfile}>
            <Text style={styles.viewProfileText}>View Profile →</Text>
          </Press>
        </View>

        <View style={styles.section}>
          <SectionTitle icon="fa-solid fa-compass">TRAVEL MODULES</SectionTitle>
          <View style={{ gap: 10, marginTop: 12 }}>
            {SERVICES.map((item) => (
              <Press key={item.title} scale={0.98} onPress={() => router.navigate(item.path)} style={styles.service} accessibilityLabel={`${item.title}. ${item.desc}`}>
                <View style={[styles.serviceIcon, { backgroundColor: item.bg }]}>
                  <Fa name={item.icon} size={18} color={item.color} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.serviceTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.serviceDesc} numberOfLines={1}>{item.desc}</Text>
                </View>
                <Fa name="fa-solid fa-chevron-right" size={12} color={tw.gray400} />
              </Press>
            ))}
          </View>
        </View>

        {/* Each module's own navigation (what used to live in its own bottom bar). */}
        <View style={{ gap: 10 }}>
          <View style={{ paddingHorizontal: 4 }}>
            <SectionTitle icon="fa-solid fa-compass" right={<Text style={styles.hint}>Every module’s own tabs</Text>}>
              INSIDE EACH SERVICE
            </SectionTitle>
          </View>
          {MODULE_SECTIONS.map((section) => (
            <ModuleAccordion key={section.id} section={section} rows={section.services} onNavigate={(path) => router.navigate(path)} />
          ))}
        </View>

        <View style={styles.section}>
          <SectionTitle icon="fa-solid fa-leaf">TOURISM &amp; CULTURE</SectionTitle>
          <View style={{ gap: 8, marginTop: 12 }}>
            {cultural.map((item) => (
              <Press key={item.title} scale={0.98} onPress={item.action} style={styles.cultural}>
                <View style={[dhs.row, { gap: 12, flex: 1, minWidth: 0 }]}>
                  <View style={styles.culturalIcon}>
                    <Fa name={item.icon} size={14} color={item.color} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.serviceTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={[styles.serviceDesc, { marginTop: 0 }]} numberOfLines={1}>{item.desc}</Text>
                  </View>
                </View>
                <Text style={styles.inquire}>Inquire →</Text>
              </Press>
            ))}
          </View>
        </View>

        <View style={styles.emergency}>
          <View style={[dhs.row, { justifyContent: 'space-between', marginBottom: 10 }]}>
            <View style={[dhs.row, { gap: 8 }]}>
              <Fa name="fa-solid fa-shield-heart" size={16} color={tw.red600} />
              <Text style={[styles.sectionTitle, { color: tw.red900 }]}>EMERGENCY NUMBERS</Text>
            </View>
            <Text style={styles.assist}>24x7 Assistance</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Press scale={0.97} onPress={() => openExternal('tel:112')} style={styles.sos} accessibilityRole="link" accessibilityLabel="Call Police SOS 112">
              <Text style={styles.sosLabel}>Police SOS</Text>
              <Text style={[styles.sosNumber, { fontSize: 14 }]}>112</Text>
            </Press>
            <Press scale={0.97} onPress={() => openExternal('tel:03673236222')} style={styles.sos} accessibilityRole="link" accessibilityLabel="Call Civil Hospital 03673-236222">
              <Text style={styles.sosLabel}>Civil Hospital</Text>
              <Text style={styles.sosNumber}>03673-236222</Text>
            </Press>
          </View>
        </View>

        <View style={{ gap: 8 }}>
          {user.isLoggedIn ? (
            <Press scale={0.98} onPress={handleLogout} style={styles.logout} accessibilityLabel="Log Out">
              <Fa name="fa-solid fa-right-from-bracket" size={12} color={tw.red600} />
              <Text style={styles.logoutText}>Log Out</Text>
            </Press>
          ) : (
            <Press scale={0.98} onPress={() => router.replace('/app/login')} style={styles.signIn}>
              <Fa name="fa-solid fa-right-to-bracket" size={12} color="#fff" />
              <Text style={[styles.logoutText, { color: '#fff' }]}>Sign In / Register</Text>
            </Press>
          )}
          <Text style={styles.version}>Dima Hasao Tourism Official Web App • v2.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  userCard: { borderRadius: 16, padding: 16, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, ...shadow('md') },
  avatarWrap: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: tw.amber400, padding: 2, overflow: 'hidden' },
  avatar: { width: '100%', height: '100%', borderRadius: 26 },
  userName: { fontSize: 14, lineHeight: 20, color: tw.amber300, ...poppins(700) },
  userPhone: { fontSize: 11, lineHeight: 16.5, color: tw.emerald200, ...poppins(400) },
  loggedIn: { marginTop: 2, fontSize: 9, lineHeight: 13.5, color: tw.amber300, backgroundColor: 'rgba(255,185,0,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,185,0,0.3)', overflow: 'hidden', ...poppins(600) },
  viewProfile: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  viewProfileText: { fontSize: 12, lineHeight: 16, color: '#fff', ...poppins(600) },
  section: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: dh.border, ...shadow('sm') },
  sectionTitle: { fontSize: 12, lineHeight: 16, letterSpacing: 0.6, color: tw.gray800, ...poppins(700) },
  hint: { fontSize: 9, lineHeight: 13.5, color: tw.gray500, ...poppins(400) },
  service: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: tw.gray100, backgroundColor: 'rgba(249,250,251,0.5)' },
  serviceIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  serviceTitle: { fontSize: 12, lineHeight: 15, color: tw.gray900, ...poppins(700) },
  serviceDesc: { fontSize: 10, lineHeight: 13.75, color: tw.gray500, marginTop: 2, ...poppins(400) },
  cultural: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: 10, borderRadius: 12, backgroundColor: tw.gray50 },
  culturalIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadow('xs') },
  inquire: { fontSize: 10, lineHeight: 15, color: tw.emerald800, ...poppins(700) },
  emergency: { backgroundColor: 'rgba(254,242,242,0.8)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: tw.red200, ...shadow('sm') },
  assist: { fontSize: 10, lineHeight: 15, color: tw.red700, ...poppins(600) },
  sos: { flex: 1, padding: 10, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: tw.red200, alignItems: 'center' },
  sosLabel: { fontSize: 10, lineHeight: 15, color: tw.gray500, ...poppins(400) },
  sosNumber: { fontSize: 12, lineHeight: 20, color: tw.red600, ...poppins(700) },
  logout: { paddingVertical: 12, backgroundColor: tw.red50, borderRadius: 12, borderWidth: 1, borderColor: tw.red200, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  logoutText: { fontSize: 12, lineHeight: 16, color: tw.red600, ...poppins(700) },
  signIn: { paddingVertical: 12, backgroundColor: '#0A3A22', borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, ...shadow('sm') },
  version: { textAlign: 'center', fontSize: 10, lineHeight: 15, color: tw.gray400, paddingTop: 8, ...poppins(500) },
});
