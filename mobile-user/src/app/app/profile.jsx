import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Image from '../../components/Img';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Fa from '../../components/Fa';
import { Press } from '../../components/ui';
import { Dialog } from '../../components/kit';
import { Header, PatternDivider } from '../../components/dh/Header';
import { ModuleAccordion } from '../../components/dh/ModuleAccordion';
import { dhs } from '../../components/dh/ui';
import { useBooking } from '../../context/BookingContext';
import { PLACES_DATA } from '../../data/dh/tourismData';
import { MODULE_SECTIONS, PLATFORM_ACCOUNT, VEG_MODE_KEY, VEG_MODE_OPTION_KEY } from '../../data/moduleSections';
import { localStore } from '../../lib/storage';
import { dh, poppins, shadow, tw } from '../../theme';

// Web: DimaHasao/pages/ProfileScreen.jsx (/app/profile)

const AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDHxXjaqg_p2_vshVQlQARltQKITPTxRdxMMlP-3QyFF5y8e2b25l5rewGDv8hjTJT1mIeodoXkQyW5Q5DbamrNM5Wqkn9zC5hXH-uNiaqjmuWSf0eYIG090j8R2skAqbm4nCA9jzMl8Rca5t2ANsI31UQDQpgiAqnjiXgjeFcP5hsy0iTh8orLvaeTNhXhfOJY7K7F6qam7R85TVEaEb8naGgso3oEml2Ix6YFyN-Jua917AHlmZIs';

/** Food's three Veg Mode states, in the order they are offered. */
const VEG_CHOICES = [
  { id: 'off', label: 'Off', on: false, option: 'all' },
  { id: 'all', label: 'Veg dishes', on: true, option: 'all' },
  { id: 'pure-veg', label: 'Pure veg', on: true, option: 'pure-veg' },
];

const readVegChoice = () => {
  if (localStore.getItem(VEG_MODE_KEY) !== 'true') return 'off';
  return localStore.getItem(VEG_MODE_OPTION_KEY) === 'pure-veg' ? 'pure-veg' : 'all';
};

function LinkRow({ icon, iconColor = tw.emerald700, label, sub, onPress }) {
  return (
    <Press scale={0.99} onPress={onPress} style={styles.linkRow} accessibilityLabel={sub ? `${label}. ${sub}` : label}>
      <View style={[dhs.row, { gap: 12, flex: 1, minWidth: 0 }]}>
        <View style={{ width: 20 }}>
          <Fa name={icon} size={16} color={iconColor} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.linkLabel} numberOfLines={1}>{label}</Text>
          {sub ? <Text style={styles.linkSub} numberOfLines={1}>{sub}</Text> : null}
        </View>
      </View>
      <Fa name="fa-solid fa-chevron-right" size={12} color={tw.gray400} />
    </Press>
  );
}

function CardTitle({ icon, iconColor = tw.emerald700, children, right, style }) {
  return (
    <View style={[dhs.row, { justifyContent: 'space-between' }, style]}>
      <View style={[dhs.row, { gap: 6 }]}>
        <Fa name={icon} size={12} color={iconColor} />
        <Text style={styles.cardTitle}>{children}</Text>
      </View>
      {right}
    </View>
  );
}

export default function ProfileScreen() {
  const { user, logout, favorites, bookings, showToast, saveLocalProfile } = useBooking();
  const [selectedLang, setSelectedLang] = useState('English');
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user.name);
  const [editPhone, setEditPhone] = useState(user.phone || '+91 98765 43210');
  const [vegChoice, setVegChoice] = useState(readVegChoice);

  // Veg Mode is Food's setting; Food reads the same stored keys.
  const applyVegChoice = (choice) => {
    setVegChoice(choice.id);
    localStore.setItem(VEG_MODE_KEY, String(choice.on));
    localStore.setItem(VEG_MODE_OPTION_KEY, choice.option);
    showToast(`Veg Mode: ${choice.label}`);
  };

  const renderVegControl = (row) => (
    <View style={styles.veg}>
      <View style={[dhs.row, { gap: 12 }]}>
        <View style={{ width: 16, alignItems: 'center' }}>
          <Fa name={row.icon} size={12} color={tw.emerald700} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.linkLabel}>{row.label}</Text>
          <Text style={styles.linkSub}>{row.sub}</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {VEG_CHOICES.map((choice) => {
          const active = vegChoice === choice.id;
          return (
            <Press key={choice.id} scale={0.96} onPress={() => applyVegChoice(choice)} accessibilityState={{ selected: active }} style={[styles.vegBtn, active && styles.vegBtnActive]}>
              <Text style={[styles.vegBtnText, active && { color: tw.amber300 }]}>{choice.label}</Text>
            </Press>
          );
        })}
      </View>
    </View>
  );

  const favoritePlaces = PLACES_DATA.filter((p) => favorites.includes(p.id));

  const handleSaveProfile = () => {
    saveLocalProfile({ name: editName.trim() || user.name, phone: editPhone.trim() || user.phone });
    setIsEditing(false);
    showToast('Profile updated successfully! ✨');
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/app/login');
  };

  return (
    <View style={dhs.page}>
      <Header title="TOURIST PROFILE" subtitle="Manage your profile & preferences" showBack rightAction="none" />
      <PatternDivider variant="green-gold" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 96 }}>
        <View style={styles.userCard}>
          <LinearGradient colors={['#0A2E12', '#0F441B', '#186A43']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={[dhs.row, { justifyContent: 'space-between', gap: 8 }]}>
            <View style={[dhs.row, { gap: 14, flex: 1, minWidth: 0 }]}>
              <View style={styles.avatarWrap}>
                <Image source={{ uri: AVATAR }} style={styles.avatar} />
              </View>
              <View style={{ flex: 1, minWidth: 0, alignItems: 'flex-start' }}>
                <Text style={styles.userName} numberOfLines={1}>{user.name}</Text>
                <Text style={styles.userPhone} numberOfLines={1}>{user.phone || '+91 98765 43210'}</Text>
                <View style={styles.verified}>
                  <Fa name="fa-solid fa-certificate" size={9} color={tw.amber400} />
                  <Text style={styles.verifiedText}>Verified Tourist Explorer</Text>
                </View>
              </View>
            </View>
            <Press
              onPress={() => {
                setEditName(user.name);
                setEditPhone(user.phone || '+91 98765 43210');
                setIsEditing(true);
              }}
              style={styles.editBtn}
              accessibilityLabel="Edit Profile"
            >
              <Fa name="fa-solid fa-pen-to-square" size={12} color="#fff" />
            </Press>
          </View>

          <View style={styles.metrics}>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>BOOKED RIDES</Text>
              <Text style={styles.metricValue}>{bookings.length}</Text>
            </View>
            <View style={[styles.metric, styles.metricMid]}>
              <Text style={styles.metricLabel}>SAVED WISHLIST</Text>
              <Text style={styles.metricValue}>{favoritePlaces.length}</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>MEMBER TIER</Text>
              <Text style={styles.metricValue}>Gold</Text>
            </View>
          </View>
        </View>

        {/* One identity above, each module's own account screens below it. */}
        <View style={{ gap: 10 }}>
          <CardTitle icon="fa-solid fa-layer-group" style={{ paddingHorizontal: 4 }} right={<Text style={styles.hint}>One account, every service</Text>}>
            YOUR SERVICES
          </CardTitle>
          {MODULE_SECTIONS.map((section) => (
            <ModuleAccordion key={section.id} section={section} rows={section.account} onNavigate={(path) => router.navigate(path)} renderControl={renderVegControl} />
          ))}
        </View>

        <View style={[styles.card, { gap: 4 }]}>
          <CardTitle icon="fa-solid fa-circle-info" style={{ marginBottom: 8 }}>
            HELP &amp; FEEDBACK
          </CardTitle>
          {PLATFORM_ACCOUNT.map((row) => (
            <LinkRow key={row.path} icon={row.icon} label={row.label} sub={row.sub} onPress={() => router.navigate(row.path)} />
          ))}
        </View>

        <View style={styles.card}>
          <CardTitle
            icon="fa-solid fa-heart"
            iconColor={tw.red500}
            style={{ marginBottom: 12 }}
            right={
              favoritePlaces.length > 0 ? (
                <Text onPress={() => router.navigate('/app/places')} style={styles.viewAll} accessibilityRole="link">
                  View All &gt;
                </Text>
              ) : null
            }
          >
            SAVED WISHLIST ({favoritePlaces.length})
          </CardTitle>
          {favoritePlaces.length > 0 ? (
            <View style={{ gap: 10 }}>
              {favoritePlaces.map((p) => (
                <Press key={p.id} scale={0.98} onPress={() => router.push(`/app/places/${p.id}`)} style={styles.fav}>
                  <Image source={{ uri: p.mainImage }} style={styles.favImg} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.favName} numberOfLines={1}>{p.name}</Text>
                    <Text style={styles.linkSub} numberOfLines={1}>{p.location}</Text>
                  </View>
                  <Text style={styles.explore}>Explore →</Text>
                </Press>
              ))}
            </View>
          ) : (
            <Text style={styles.empty}>No saved destinations yet. Tap the heart icon on any place to save!</Text>
          )}
        </View>

        <View style={[styles.card, { gap: 4 }]}>
          <CardTitle icon="fa-solid fa-sliders" style={{ marginBottom: 8 }}>
            ACCOUNT SHORTCUTS
          </CardTitle>
          <LinkRow icon="fa-regular fa-calendar-check" iconColor={tw.blue600} label="My Booked Rides" onPress={() => router.navigate('/app/bookings')} />
          <LinkRow icon="fa-solid fa-map-location-dot" label="Explore Attractions" onPress={() => router.navigate('/app/places')} />
          <LinkRow icon="fa-solid fa-compass" iconColor={tw.amber600} label="All Tourism Services & Guides" onPress={() => router.navigate('/app/more')} />
        </View>

        <View style={styles.card}>
          <CardTitle icon="fa-solid fa-language" style={{ marginBottom: 12 }}>
            LANGUAGE PREFERENCE
          </CardTitle>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {['English', 'Dimasa', 'Assamese'].map((lang) => {
              const active = selectedLang === lang;
              return (
                <Press
                  key={lang}
                  scale={0.96}
                  onPress={() => {
                    setSelectedLang(lang);
                    showToast(`Language switched to ${lang}`);
                  }}
                  accessibilityState={{ selected: active }}
                  style={[styles.lang, active && styles.langActive]}
                >
                  <Text style={[styles.langText, active && { color: tw.amber300 }]}>{lang}</Text>
                </Press>
              );
            })}
          </View>
        </View>

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
      </ScrollView>

      <Dialog visible={isEditing} onClose={() => setIsEditing(false)} panelStyle={styles.modal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[dhs.row, { justifyContent: 'space-between', marginBottom: 16 }]}>
            <Text style={styles.modalTitle}>Edit Tourist Profile</Text>
            <Press onPress={() => setIsEditing(false)} style={styles.modalClose} accessibilityLabel="Close">
              <Fa name="fa-solid fa-xmark" size={12} color={tw.gray600} />
            </Press>
          </View>
          <View style={{ gap: 12 }}>
            <View>
              <Text style={styles.modalLabel}>Full Name</Text>
              <TextInput value={editName} onChangeText={setEditName} style={styles.modalInput} autoCapitalize="words" accessibilityLabel="Full Name" />
            </View>
            <View>
              <Text style={styles.modalLabel}>Phone Number</Text>
              <TextInput value={editPhone} onChangeText={setEditPhone} style={styles.modalInput} keyboardType="phone-pad" accessibilityLabel="Phone Number" />
            </View>
            <Press scale={0.97} onPress={handleSaveProfile} style={styles.save}>
              <Text style={styles.saveText}>Save Changes</Text>
            </Press>
          </View>
        </KeyboardAvoidingView>
      </Dialog>
    </View>
  );
}

const styles = StyleSheet.create({
  userCard: { borderRadius: 16, padding: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,185,0,0.2)', ...shadow('lg') },
  avatarWrap: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: tw.amber400, padding: 2, overflow: 'hidden', backgroundColor: '#061C0A' },
  avatar: { width: '100%', height: '100%', borderRadius: 30 },
  userName: { fontSize: 16, lineHeight: 24, color: tw.amber300, ...poppins(700) },
  userPhone: { fontSize: 12, lineHeight: 16, color: tw.emerald200, marginTop: 2, ...poppins(400) },
  verified: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, backgroundColor: 'rgba(255,185,0,0.2)', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,185,0,0.3)' },
  verifiedText: { fontSize: 10, lineHeight: 15, color: tw.amber300, ...poppins(600) },
  editBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  metrics: { flexDirection: 'row', marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  metric: { flex: 1, alignItems: 'center' },
  metricMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  metricLabel: { fontSize: 10, lineHeight: 15, color: tw.emerald200, textAlign: 'center', ...poppins(400) },
  metricValue: { fontSize: 16, lineHeight: 24, color: tw.amber300, ...poppins(700) },
  hint: { fontSize: 9, lineHeight: 13.5, color: tw.gray500, ...poppins(400) },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: dh.border, ...shadow('xs') },
  cardTitle: { fontSize: 12, lineHeight: 16, letterSpacing: 0.6, color: tw.gray800, ...poppins(700) },
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: 10, borderRadius: 12 },
  linkLabel: { fontSize: 12, lineHeight: 16, color: tw.gray800, ...poppins(600) },
  linkSub: { fontSize: 10, lineHeight: 13.75, color: tw.gray500, ...poppins(400) },
  veg: { padding: 10, borderRadius: 12, backgroundColor: dh.cream, borderWidth: 1, borderColor: 'rgba(229,221,195,0.7)', gap: 8 },
  vegBtn: { flex: 1, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: tw.gray200, backgroundColor: '#fff', alignItems: 'center' },
  vegBtnActive: { backgroundColor: '#0A3A22', borderColor: '#0A3A22' },
  vegBtnText: { fontSize: 10, lineHeight: 15, color: tw.gray600, ...poppins(700) },
  viewAll: { fontSize: 10, lineHeight: 15, color: tw.blue600, ...poppins(600) },
  fav: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, borderRadius: 12, backgroundColor: tw.gray50, borderWidth: 1, borderColor: 'rgba(243,244,246,0.8)' },
  favImg: { width: 48, height: 48, borderRadius: 8 },
  favName: { fontSize: 12, lineHeight: 16, color: tw.gray900, ...poppins(700) },
  explore: { fontSize: 10, lineHeight: 15, color: tw.emerald800, ...poppins(700) },
  empty: { fontSize: 12, lineHeight: 16, color: tw.gray400, textAlign: 'center', paddingVertical: 16, fontStyle: 'italic', ...poppins(400) },
  lang: { flex: 1, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: tw.gray200, backgroundColor: tw.gray50, alignItems: 'center' },
  langActive: { backgroundColor: '#0A3A22', borderColor: '#0A3A22' },
  langText: { fontSize: 12, lineHeight: 16, color: tw.gray700, ...poppins(600) },
  logout: { paddingVertical: 12, backgroundColor: tw.red50, borderRadius: 12, borderWidth: 1, borderColor: tw.red200, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  logoutText: { fontSize: 12, lineHeight: 16, color: tw.red600, ...poppins(700) },
  signIn: { paddingVertical: 12, backgroundColor: '#0A3A22', borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, ...shadow('sm') },
  modal: { width: '100%', maxWidth: 384, backgroundColor: '#fff', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: tw.emerald100, ...shadow('2xl') },
  modalTitle: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(700) },
  modalClose: { width: 28, height: 28, borderRadius: 14, backgroundColor: tw.gray100, alignItems: 'center', justifyContent: 'center' },
  modalLabel: { fontSize: 12, lineHeight: 16, color: tw.gray700, marginBottom: 4, ...poppins(600) },
  modalInput: { height: 36, borderWidth: 1, borderColor: tw.gray300, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 0, fontSize: 12, color: tw.gray900, ...poppins(400) },
  save: { paddingVertical: 10, backgroundColor: '#0A3A22', borderRadius: 12, alignItems: 'center', ...shadow('sm') },
  saveText: { fontSize: 12, lineHeight: 16, color: '#fff', ...poppins(700) },
});
