import { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  Bell, BusFront, Check, ChevronRight, CreditCard, FileText, Gift, HelpCircle, History, LogOut, MapPin,
  Phone, Settings, Shield, Star, Trash2, User, Wallet,
} from 'lucide-react-native';
import { Press } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { localStore } from '../../../lib/storage';
import { tw } from '../../../theme';
import taxiApi from '../../api/client';
import { socketService } from '../../api/socket';
import { clearCurrentRide } from '../../services/currentRideService';
import { userAuthService } from '../../services/authService';
import { fo, useHeaderTop } from '../ui';

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
      { icon: User, title: 'Profile Settings', sub: 'Manage your personal info', path: '/taxi/user/profile/settings', bg: tw.indigo50, color: tw.indigo600 },
      { icon: MapPin, title: 'Saved Addresses', sub: 'Home, office & others', path: '/taxi/user/profile/addresses', bg: tw.emerald50, color: tw.emerald600 },
      { icon: History, title: 'My Rides', sub: 'Rides, parcels & trips', path: '/taxi/user/activity', bg: tw.blue50, color: tw.blue600 },
    ],
  },
  {
    title: 'Financial & Rewards',
    items: [
      { icon: Wallet, title: 'My Wallet', sub: 'Balance & transactions', path: '/taxi/user/wallet', bg: tw.amber50, color: tw.amber600 },
      { icon: Gift, title: 'Refer & Earn', sub: 'Invite friends & get rewards', path: '/taxi/user/referral', bg: tw.rose50, color: tw.rose600 },
      { icon: BusFront, title: 'Bus Tickets', sub: 'Manage bus bookings', path: '/app', bg: tw.orange50, color: tw.orange600 },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { icon: Bell, title: 'Notifications', sub: 'Offers & alerts', path: '/taxi/user/profile/notifications', bg: tw.purple50, color: tw.purple600 },
      { icon: Shield, title: 'Security & SOS', sub: 'Trust & safety settings', path: '/taxi/user/safety/sos', bg: tw.sky50, color: tw.sky600 },
      { icon: HelpCircle, title: 'Help & Support', sub: 'Help center & tickets', path: '/taxi/user/support/tickets', bg: tw.slate50, color: tw.slate600 },
    ],
  },
  {
    title: 'Legal',
    items: [
      { icon: FileText, title: 'Terms & Conditions', sub: 'Read service terms', path: '/legal/terms?module=taxi', bg: tw.orange50, color: tw.orange600 },
      { icon: Shield, title: 'Privacy Policy', sub: 'How your data is handled', path: '/legal/privacy?module=taxi', bg: tw.emerald50, color: tw.emerald600 },
      { icon: CreditCard, title: 'Refund Policy', sub: 'Refunds and cancellations', path: '/legal/refund?module=taxi', bg: tw.indigo50, color: tw.indigo600 },
    ],
  },
];

const BORDER = 'rgba(15,23,42,0.12)';

export default function Profile() {
  const top = useHeaderTop();
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
    <View style={[st.flex, { backgroundColor: '#f6f7fb' }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 24, paddingTop: top + 8, paddingBottom: 32 }}>
          <View style={st.topRow}>
            <Text style={st.h1}>Profile</Text>
            <Press onPress={() => router.push('/taxi/user/profile/settings')} accessibilityLabel="Settings" style={st.cog}>
              <Settings size={20} color="#0b1220" />
            </Press>
          </View>

          <View style={st.hero}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
              <View>
                <View style={st.avatar}>
                  {profile.profileImage ? (
                    <Image source={{ uri: profile.profileImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  ) : (
                    <Text style={st.initials}>{initials || 'U'}</Text>
                  )}
                </View>
                <View style={st.tick}><Check size={14} color="#fff" strokeWidth={4} /></View>
              </View>
              <View style={st.flex}>
                <Text style={st.name} numberOfLines={1}>{profile.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <Phone size={14} color="#334155" style={{ opacity: 0.6 }} />
                  <Text style={st.phone}>{profile.phone ? `+91 ${profile.phone}` : 'Account Active'}</Text>
                </View>
              </View>
            </View>

            <View style={st.stats}>
              <View style={st.stat}>
                <Text style={st.statLabel}>Total Trips</Text>
                <Text style={st.statVal}>{profile.stats.trips}</Text>
              </View>
              <View style={[st.stat, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#FEF3C7' }]}>
                <Text style={st.statLabel}>Rating</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <Star size={14} color={tw.yellow400} fill={tw.yellow400} />
                  <Text style={[st.statVal, { marginTop: 0 }]}>{profile.stats.rating}</Text>
                </View>
              </View>
              <View style={st.stat}>
                <Text style={st.statLabel}>Credits</Text>
                <Text style={[st.statVal, { color: '#ffc400' }]}>₹{profile.stats.wallet}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 24, gap: 32 }}>
          {SECTIONS.map((section) => (
            <View key={section.title} style={{ gap: 16 }}>
              <Text style={st.sectionTitle}>{section.title}</Text>
              <View style={st.group}>
                {section.items.map((item, i) => (
                  <Press
                    key={item.title}
                    scale={1}
                    onPress={() => router.push(item.path)}
                    style={[st.item, i > 0 && { borderTopWidth: 1, borderTopColor: 'rgba(226,232,240,0.5)' }]}
                  >
                    <View style={[st.itemIcon, { backgroundColor: item.bg }]}>
                      <item.icon size={20} color={item.color} strokeWidth={2.5} />
                    </View>
                    <View style={st.flex}>
                      <Text style={st.itemTitle}>{item.title}</Text>
                      <Text style={st.itemSub}>{item.sub}</Text>
                    </View>
                    <View style={st.chev}><ChevronRight size={18} color="#334155" strokeWidth={3} /></View>
                  </Press>
                ))}
              </View>
            </View>
          ))}

          <View style={{ paddingTop: 16, paddingBottom: 144, gap: 16 }}>
            <Press onPress={() => router.push('/taxi/user/profile/delete-account')} scale={0.98} style={st.danger}>
              <View style={st.dangerIcon}><Trash2 size={18} color={tw.red500} strokeWidth={2.5} /></View>
              <Text style={st.dangerText}>Delete account</Text>
            </Press>
            <Press onPress={handleLogout} scale={0.98} style={st.logout}>
              <LogOut size={18} color="#fff" strokeWidth={3} />
              <Text style={st.logoutText}>Sign Out Securely</Text>
            </Press>
            <View style={{ alignItems: 'center', paddingTop: 24 }}>
              <Text style={st.version}>Version 2.4.1 • Built with Love</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  flex: { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 },
  h1: { fontSize: 24, color: '#0b1220', letterSpacing: -0.3, ...fo(800) },
  cog: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 30px -10px rgba(0,0,0,0.15)' },
  hero: { borderRadius: 32, padding: 24, backgroundColor: '#FFFDF0', borderWidth: 1, borderColor: '#FEF3C7', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' },
  avatar: { width: 80, height: 80, borderRadius: 28, backgroundColor: tw.slate950, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 2, borderColor: BORDER },
  initials: { fontSize: 24, color: '#fff', opacity: 0.4, ...fo(900) },
  tick: { position: 'absolute', bottom: -4, right: -4, width: 24, height: 24, borderRadius: 8, backgroundColor: tw.emerald500, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 22, color: '#0b1220', textTransform: 'capitalize', ...fo(800) },
  phone: { fontSize: 14, color: '#334155', ...fo(700) },
  stats: { flexDirection: 'row', marginTop: 32, paddingTop: 24, borderTopWidth: 1, borderTopColor: '#FEF3C7' },
  stat: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: 10, letterSpacing: 1.5, color: '#334155', ...fo(900) },
  statVal: { fontSize: 18, color: '#0b1220', marginTop: 4, ...fo(800) },
  sectionTitle: { fontSize: 12, letterSpacing: 3, color: '#334155', marginLeft: 4, ...fo(900) },
  group: { borderRadius: 32, borderWidth: 1, borderColor: BORDER, backgroundColor: '#fff', overflow: 'hidden', boxShadow: '0 12px 30px -10px rgba(0,0,0,0.15)' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 20, paddingHorizontal: 24, paddingVertical: 20 },
  itemIcon: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontSize: 15, color: '#0b1220', ...fo(700) },
  itemSub: { fontSize: 12, color: '#334155', marginTop: 2, ...fo(600) },
  chev: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f6f7fb', alignItems: 'center', justifyContent: 'center' },
  danger: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 24, paddingVertical: 16, borderRadius: 24, borderWidth: 1, borderColor: tw.red100, backgroundColor: '#fff' },
  dangerIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.1)', alignItems: 'center', justifyContent: 'center' },
  dangerText: { fontSize: 14, color: tw.red600, ...fo(700) },
  logout: { height: 64, borderRadius: 24, backgroundColor: tw.slate900, borderWidth: 1, borderColor: tw.slate900, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, boxShadow: '0 4px 6px -1px rgba(15,23,42,0.1)' },
  logoutText: { fontSize: 15, color: '#fff', ...fo(900) },
  version: { fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', opacity: 0.3, color: '#0b1220', ...fo(900) },
});
