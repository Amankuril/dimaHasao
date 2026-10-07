import { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  Bell, BusFront, Check, CreditCard, FileText, Gift, HelpCircle, History, LogOut, MapPin,
  Phone, Settings, Shield, Star, Trash2, User, Wallet,
} from 'lucide-react-native';
import { Button, Card, IconButton, ListRow, SectionHeader } from '../../../components/ds';
import { useAuth } from '../../../context/AuthContext';
import { localStore } from '../../../lib/storage';
import { color, radii, space, type } from '../../../theme';
import taxiApi from '../../api/client';
import { socketService } from '../../api/socket';
import { clearCurrentRide } from '../../services/currentRideService';
import { userAuthService } from '../../services/authService';
import { PageTitle, useNavPad } from '../ui';

// Web: Taxi/modules/user/pages/Profile.jsx (/taxi/user/profile, a main tab)

const pickObject = (...values) => values.find((v) => v && typeof v === 'object' && !Array.isArray(v)) || {};
const pickNumber = (...values) => {
  for (const v of values) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
};

// Paths the web points at that no route serves (/safety/sos, /terms, /privacy, /refund, .../bus-bookings) end on
// the app home through the web's catch-all. Legal and SOS are sent to their real screens; bus bookings follow the catch-all.
const SECTIONS = [
  {
    title: 'Personal',
    items: [
      { icon: User, title: 'Profile Settings', sub: 'Manage your personal info', path: '/taxi/user/profile/settings', tone: 'primary' },
      { icon: MapPin, title: 'Saved Addresses', sub: 'Home, office & others', path: '/taxi/user/profile/addresses', tone: 'primary' },
      { icon: History, title: 'My Rides', sub: 'Rides, parcels & trips', path: '/taxi/user/activity', tone: 'info' },
    ],
  },
  {
    title: 'Financial & Rewards',
    items: [
      { icon: Wallet, title: 'My Wallet', sub: 'Balance & transactions', path: '/taxi/user/wallet', tone: 'gold' },
      { icon: Gift, title: 'Refer & Earn', sub: 'Invite friends & get rewards', path: '/taxi/user/referral', tone: 'gold' },
      { icon: BusFront, title: 'Bus Tickets', sub: 'Manage bus bookings', path: '/app', tone: 'neutral' },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { icon: Bell, title: 'Notifications', sub: 'Offers & alerts', path: '/taxi/user/profile/notifications', tone: 'info' },
      { icon: Shield, title: 'Security & SOS', sub: 'Trust & safety settings', path: '/taxi/user/safety/sos', tone: 'danger' },
      { icon: HelpCircle, title: 'Help & Support', sub: 'Help center & tickets', path: '/taxi/user/support/tickets', tone: 'primary' },
    ],
  },
  {
    title: 'Legal',
    items: [
      { icon: FileText, title: 'Terms & Conditions', sub: 'Read service terms', path: '/legal/terms?module=taxi', tone: 'neutral' },
      { icon: Shield, title: 'Privacy Policy', sub: 'How your data is handled', path: '/legal/privacy?module=taxi', tone: 'neutral' },
      { icon: CreditCard, title: 'Refund Policy', sub: 'Refunds and cancellations', path: '/legal/refund?module=taxi', tone: 'neutral' },
    ],
  },
];

export default function Profile() {
  const bottomPad = useNavPad(space.xxl);
  const { logout } = useAuth();
  const [profile, setProfile] = useState({ name: '', phone: '', profileImage: '', stats: { trips: 0, rating: 4.9, wallet: 0 } });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        let stored = {};
        try {
          stored = JSON.parse(localStore.getItem('userInfo') || '{}') || {};
        } catch {
          stored = {};
        }
        const [pr, wr, rr] = await Promise.allSettled([
          userAuthService.getCurrentUser(),
          userAuthService.getWallet(),
          taxiApi.get('/rides', { params: { page: 1, limit: 1 } }),
        ]);
        const pp = pr.status === 'fulfilled' ? pr.value : {};
        const wp = wr.status === 'fulfilled' ? wr.value : {};
        const rp = rr.status === 'fulfilled' ? rr.value : {};
        const pd = pickObject(pp?.data, pp?.result, pp);
        const user = pickObject(pd?.user, pd?.data?.user, pd?.profile, pd);
        const wd = pickObject(wp?.data, wp?.wallet, wp);
        const rd = pickObject(rp?.data, rp?.result, rp);
        const pg = pickObject(rd?.pagination, rd?.data?.pagination);
        const trips = pickNumber(pg.total, rd?.total, rd?.count, user.totalRides, user.total_trips, user.totalTrips, stored?.totalRides);
        const wallet = pickNumber(wd.balance, wd.walletBalance, wd.amount, user.walletBalance, user.wallet?.balance, user.wallet_amount, stored?.walletBalance);
        const rating = pickNumber(user.rating, user.avgRating, user.average_rating, stored?.rating, 4.9);
        if (!alive) return;
        setProfile({
          name: user.name || stored?.name || 'User',
          phone: user.phone || stored?.phone || '',
          profileImage: user.profileImage || user.profile_image || stored?.profileImage || '',
          stats: { trips, rating, wallet },
        });
        localStore.setItem('userInfo', JSON.stringify({ ...stored, ...user, walletBalance: wallet, totalRides: trips, rating }));
      } catch {
        // keep defaults
      }
    })();
    return () => { alive = false; };
  }, []);

  const handleLogout = async () => {
    clearCurrentRide();
    socketService.disconnect();
    await logout();
    router.replace('/app/login');
  };

  const initials = (profile.name || 'User').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('');

  return (
    <View style={st.flex}>
      <PageTitle
        title="Profile"
        showBack={false}
        right={<IconButton icon={Settings} label="Profile settings" variant="soft" onPress={() => router.push('/taxi/user/profile/settings')} />}
      />
      <ScrollView contentContainerStyle={[st.content, { paddingBottom: bottomPad }]} showsVerticalScrollIndicator={false}>
        <Card style={{ gap: space.lg }}>
          <View style={st.identity}>
            <View>
              <View style={st.avatar}>
                {profile.profileImage ? (
                  <Image source={{ uri: profile.profileImage }} style={st.avatarImg} resizeMode="cover" accessibilityIgnoresInvertColors />
                ) : (
                  <Text style={st.initials}>{initials || 'U'}</Text>
                )}
              </View>
              <View style={st.tick} accessibilityLabel="Verified account">
                <Check size={12} color={color.onPrimary} strokeWidth={3.5} />
              </View>
            </View>
            <View style={st.idText}>
              <Text style={[type.heading, { color: color.text, textTransform: 'capitalize' }]} numberOfLines={2}>
                {profile.name}
              </Text>
              <View style={st.phoneRow}>
                <Phone size={14} color={color.textMuted} />
                <Text style={[type.small, { color: color.textSecondary }]} numberOfLines={1}>
                  {profile.phone ? `+91 ${profile.phone}` : 'Account Active'}
                </Text>
              </View>
            </View>
          </View>

          <View style={st.stats}>
            <View style={st.stat} accessible accessibilityLabel={`Total trips ${profile.stats.trips}`}>
              <Text style={[type.caption, { color: color.textMuted }]}>Total trips</Text>
              <Text style={[type.price, { color: color.text }]}>{profile.stats.trips}</Text>
            </View>
            <View style={[st.stat, st.statMid]} accessible accessibilityLabel={`Rating ${profile.stats.rating}`}>
              <Text style={[type.caption, { color: color.textMuted }]}>Rating</Text>
              <View style={st.ratingRow}>
                <Star size={14} color={color.gold} fill={color.gold} />
                <Text style={[type.price, { color: color.text }]}>{profile.stats.rating}</Text>
              </View>
            </View>
            <View style={st.stat} accessible accessibilityLabel={`Credits ₹${profile.stats.wallet}`}>
              <Text style={[type.caption, { color: color.textMuted }]}>Credits</Text>
              <Text style={[type.price, { color: color.goldText }]}>₹{profile.stats.wallet}</Text>
            </View>
          </View>
        </Card>

        {SECTIONS.map((section) => (
          <View key={section.title} style={st.section}>
            <SectionHeader title={section.title} />
            <Card padded={false} style={st.group}>
              {section.items.map((item, i) => (
                <ListRow
                  key={item.title}
                  icon={item.icon}
                  iconTone={item.tone}
                  title={item.title}
                  subtitle={item.sub}
                  onPress={() => router.push(item.path)}
                  divider={i < section.items.length - 1}
                />
              ))}
            </Card>
          </View>
        ))}

        <View style={st.section}>
          <SectionHeader title="Account" />
          <Card padded={false} style={st.group}>
            <ListRow
              icon={Trash2}
              tone="danger"
              title="Delete account"
              subtitle="Permanently remove your account and data"
              onPress={() => router.push('/taxi/user/profile/delete-account')}
            />
          </Card>
          <Button title="Sign out" icon={LogOut} variant="outline" onPress={handleLogout} style={{ marginTop: space.md }} />
          <Text style={st.version}>Version 2.4.1 • Built with Love</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  flex: { flex: 1, backgroundColor: color.bg },
  content: { paddingHorizontal: space.lg, paddingTop: space.xs, gap: space.xxl },
  identity: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  avatar: { width: 72, height: 72, borderRadius: radii.lg, backgroundColor: color.primaryDeep, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  initials: { ...type.heading, fontSize: 24, lineHeight: 30, color: color.goldOnDark },
  tick: { position: 'absolute', bottom: -4, right: -4, width: 22, height: 22, borderRadius: 11, backgroundColor: color.success, borderWidth: 2, borderColor: color.surface, alignItems: 'center', justifyContent: 'center' },
  idText: { flex: 1, minWidth: 0, gap: space.xs },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2 },
  stats: { flexDirection: 'row', paddingTop: space.lg, borderTopWidth: 1, borderTopColor: color.border },
  stat: { flex: 1, alignItems: 'center', gap: space.xxs },
  statMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: color.border },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  section: {},
  group: { overflow: 'hidden' },
  version: { ...type.caption, color: color.textMuted, textAlign: 'center', marginTop: space.xl },
});
