import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Image from '../../components/Img';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Fa from '../../components/Fa';
import { Press } from '../../components/ui';
import { Dialog } from '../../components/kit';
import { Button, Card, IconButton, ListRow, SectionHeader, SegmentedControl, StatusBadge, fa } from '../../components/ds';

import { Header, PatternDivider } from '../../components/dh/Header';
import { NAV_CLEARANCE } from '../../components/dh/AppBottomNav';
import { ModuleAccordion } from '../../components/dh/ModuleAccordion';
import { Field, dhs } from '../../components/dh/ui';
import { useBooking } from '../../context/BookingContext';
import { PLACES_DATA } from '../../data/dh/tourismData';
import { MODULE_SECTIONS, PLATFORM_ACCOUNT, VEG_MODE_KEY, VEG_MODE_OPTION_KEY } from '../../data/moduleSections';
import { localStore } from '../../lib/storage';
import { color, elevation, radii, space, type } from '../../theme';

const FA_CHEVRON = fa('fa-solid fa-chevron-right');

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

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
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
      <View style={[dhs.row, { gap: space.md }]}>
        <View style={styles.vegIcon}>
          <Fa name={row.icon} size={16} color={color.primary} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.linkLabel}>{row.label}</Text>
          <Text style={styles.linkSub}>{row.sub}</Text>
        </View>
      </View>
      <SegmentedControl
        options={VEG_CHOICES.map((choice) => ({ value: choice.id, label: choice.label }))}
        value={vegChoice}
        onChange={(id) => applyVegChoice(VEG_CHOICES.find((choice) => choice.id === id))}
      />
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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: space.lg, gap: space.xxl, paddingBottom: NAV_CLEARANCE + insets.bottom + space.lg }}>
        <View style={styles.userCard}>
          <View style={[dhs.row, { justifyContent: 'space-between', gap: space.sm }]}>
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
                <StatusBadge label="Verified tourist explorer" tone="gold" icon={fa('fa-solid fa-certificate')} style={{ marginTop: space.xs }} />
              </View>
            </View>
            <IconButton
              icon={fa('fa-solid fa-pen-to-square')}
              label="Edit Profile"
              variant="inverse"
              iconSize={18}
              onPress={() => {
                setEditName(user.name);
                setEditPhone(user.phone || '+91 98765 43210');
                setIsEditing(true);
              }}
            />
          </View>

          <View style={styles.metrics}>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{bookings.length}</Text>
              <Text style={styles.metricLabel}>Booked rides</Text>
            </View>
            <View style={[styles.metric, styles.metricMid]}>
              <Text style={styles.metricValue}>{favoritePlaces.length}</Text>
              <Text style={styles.metricLabel}>Saved wishlist</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>Gold</Text>
              <Text style={styles.metricLabel}>Member tier</Text>
            </View>
          </View>
        </View>

        {/* One identity above, each module's own account screens below it. */}
        <View style={{ gap: space.md }}>
          <View>
            <SectionHeader title="Your services" style={{ marginBottom: space.xs }} />
            <Text style={styles.hint}>One account, every service</Text>
          </View>
          {MODULE_SECTIONS.map((section) => (
            <ModuleAccordion key={section.id} section={section} rows={section.account} onNavigate={(path) => router.navigate(path)} renderControl={renderVegControl} />
          ))}
        </View>

        <View>
          <SectionHeader title="Help & feedback" />
          <Card padded={false}>
            {PLATFORM_ACCOUNT.map((row, i) => (
              <ListRow chevronIcon={FA_CHEVRON} key={row.path} icon={fa(row.icon)} title={row.label} subtitle={row.sub} onPress={() => router.navigate(row.path)} divider={i < PLATFORM_ACCOUNT.length - 1} />
            ))}
          </Card>
        </View>

        <View>
          <SectionHeader
            title={`Saved wishlist (${favoritePlaces.length})`}
            action={favoritePlaces.length > 0 ? 'View all' : undefined}
            onAction={() => router.navigate('/app/places')}
          />
          <Card padded={false}>
            {favoritePlaces.length > 0 ? (
              favoritePlaces.map((p, i) => (
                <Press key={p.id} scale={0.99} onPress={() => router.push(`/app/places/${p.id}`)} style={[styles.fav, i < favoritePlaces.length - 1 && styles.favDivider]} accessibilityLabel={`${p.name}, ${p.location}. Explore`}>
                  <Image source={{ uri: p.mainImage }} style={styles.favImg} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.favName} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Text style={styles.linkSub} numberOfLines={1}>
                      {p.location}
                    </Text>
                  </View>
                  <Text style={styles.explore}>Explore</Text>
                  <Fa name="fa-solid fa-chevron-right" size={14} color={color.primary} />
                </Press>
              ))
            ) : (
              <View style={styles.empty}>
                <Fa name="fa-regular fa-heart" size={22} color={color.textMuted} />
                <Text style={styles.emptyText}>No saved destinations yet. Tap the heart icon on any place to save it.</Text>
              </View>
            )}
          </Card>
        </View>

        <View>
          <SectionHeader title="Account shortcuts" />
          <Card padded={false}>
            <ListRow chevronIcon={FA_CHEVRON} icon={fa('fa-regular fa-calendar-check')} iconTone="info" title="My Booked Rides" onPress={() => router.navigate('/app/bookings')} divider />
            <ListRow chevronIcon={FA_CHEVRON} icon={fa('fa-solid fa-map-location-dot')} title="Explore Attractions" onPress={() => router.navigate('/app/places')} divider />
            <ListRow chevronIcon={FA_CHEVRON} icon={fa('fa-solid fa-compass')} iconTone="gold" title="All Tourism Services & Guides" onPress={() => router.navigate('/app/more')} />
          </Card>
        </View>

        <View>
          <SectionHeader title="Language preference" />
          <SegmentedControl
            options={LANGS.map((lang) => ({ value: lang, label: lang }))}
            value={selectedLang}
            onChange={(lang) => {
              setSelectedLang(lang);
              showToast(`Language switched to ${lang}`);
            }}
          />
        </View>

        {user.isLoggedIn ? (
          <Button title="Log out" variant="dangerSoft" icon={fa('fa-solid fa-right-from-bracket')} onPress={handleLogout} accessibilityLabel="Log Out" />
        ) : (
          <Button title="Sign in / Register" icon={fa('fa-solid fa-right-to-bracket')} onPress={() => router.replace('/app/login')} />
        )}
      </ScrollView>

      <Dialog visible={isEditing} onClose={() => setIsEditing(false)} panelStyle={styles.modal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[dhs.row, { justifyContent: 'space-between', gap: space.sm, marginBottom: space.lg }]}>
            <Text style={styles.modalTitle} accessibilityRole="header">
              Edit tourist profile
            </Text>
            <IconButton icon={fa('fa-solid fa-xmark')} label="Close" variant="soft" size={40} iconSize={16} onPress={() => setIsEditing(false)} />
          </View>
          <View style={{ gap: space.md }}>
            <Field label="Full name" value={editName} onChangeText={setEditName} autoCapitalize="words" autoComplete="name" accessibilityLabel="Full Name" />
            <Field label="Phone number" value={editPhone} onChangeText={setEditPhone} keyboardType="phone-pad" autoComplete="tel" accessibilityLabel="Phone Number" />
            <Button title="Save changes" onPress={handleSaveProfile} style={{ marginTop: space.xs }} />
          </View>
        </KeyboardAvoidingView>
      </Dialog>
    </View>
  );
}

const LANGS = ['English', 'Dimasa', 'Assamese'];

const styles = StyleSheet.create({
  userCard: { borderRadius: radii.lg, padding: space.xl, backgroundColor: color.primaryDeep, borderWidth: 1, borderColor: 'rgba(202,168,62,0.45)', ...elevation.card },
  avatarWrap: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: color.gold, padding: 2, overflow: 'hidden', backgroundColor: color.primaryDeep },
  avatar: { width: '100%', height: '100%', borderRadius: 30 },
  userName: { ...type.heading, color: color.goldOnDark },
  userPhone: { ...type.small, color: color.textOnDarkMuted },
  metrics: { flexDirection: 'row', marginTop: space.lg, paddingTop: space.lg, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)' },
  metric: { flex: 1, alignItems: 'center', gap: 2 },
  metricMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  metricLabel: { ...type.caption, color: color.textOnDarkMuted, textAlign: 'center' },
  metricValue: { ...type.price, color: color.goldOnDark },
  hint: { ...type.caption, color: color.textMuted },
  linkLabel: { ...type.bodyStrong, color: color.text },
  linkSub: { ...type.caption, color: color.textMuted },
  veg: { padding: space.md, borderRadius: radii.md, backgroundColor: color.surfaceMuted, gap: space.md },
  vegIcon: { width: 32, height: 32, borderRadius: radii.sm, backgroundColor: color.surface, alignItems: 'center', justifyContent: 'center' },
  fav: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md },
  favDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  favImg: { width: 48, height: 48, borderRadius: radii.sm, backgroundColor: color.surfaceMuted },
  favName: { ...type.bodyStrong, color: color.text },
  explore: { ...type.label, color: color.primary },
  empty: { alignItems: 'center', gap: space.sm, paddingVertical: space.xl, paddingHorizontal: space.xl },
  emptyText: { ...type.small, color: color.textMuted, textAlign: 'center' },
  modal: { width: '100%', maxWidth: 400, backgroundColor: color.surface, borderRadius: radii.xl, padding: space.xl, borderWidth: 1, borderColor: color.border, ...elevation.float },
  modalTitle: { ...type.heading, color: color.text, flex: 1 },
});
