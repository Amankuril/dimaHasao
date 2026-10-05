import { useEffect, useMemo, useState } from 'react';
import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft, CircleCheck, CircleX, Clock3, Share2, Users, Wallet } from 'lucide-react-native';
import { Press } from '../../../components/ui';
import { toast } from '../../../lib/notify';
import { navigateTo } from '../../../lib/webRouter';
import { API_ORIGIN } from '../../../api/client';
import { userAPI } from '../../../api/food';
import { useCompanyName } from '../../hooks/useCompanyName';
import { useProfile } from '../../context/ProfileContext';
import { Card, CardContent } from '../../components/cart/ui';
import { F } from '../../components/shell';
import { poppins, shadow, tw } from '../../../theme';

const statusMeta = {
  credited: { label: 'Credited', Icon: CircleCheck, bg: tw.green100, color: tw.green700 },
  pending: { label: 'Pending', Icon: Clock3, bg: tw.amber100, color: tw.amber700 },
  rejected: { label: 'Rejected', Icon: CircleX, bg: tw.red100, color: tw.red700 },
};

const RUPEE = '₹';

/** Port of pages/user/profile/ReferEarn.jsx. */
export default function ReferEarn() {
  const { userProfile } = useProfile();
  const companyName = useCompanyName();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ referralCount: 0, totalReferralEarnings: 0, rewardAmount: 0, totalInvited: 0, creditedCount: 0, pendingCount: 0, rejectedCount: 0 });
  const [invitedFriends, setInvitedFriends] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const res = await userAPI.getReferralDetails();
        const nextStats = res?.data?.data?.stats || {};
        const nextInvited = res?.data?.data?.invitedFriends || [];
        if (!cancelled) {
          setStats({
            referralCount: Number(nextStats.referralCount) || 0,
            totalReferralEarnings: Number(nextStats.totalReferralEarnings) || 0,
            rewardAmount: Number(nextStats.rewardAmount) || 0,
            totalInvited: Number(nextStats.totalInvited) || 0,
            creditedCount: Number(nextStats.creditedCount) || 0,
            pendingCount: Number(nextStats.pendingCount) || 0,
            rejectedCount: Number(nextStats.rejectedCount) || 0,
          });
          setInvitedFriends(Array.isArray(nextInvited) ? nextInvited : []);
        }
      } catch {
        if (!cancelled) {
          setInvitedFriends([]);
          toast.error('Failed to load referral details');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const refId = userProfile?._id || userProfile?.id || userProfile?.referralCode || '';
  // Web: window.location.origin; the app's site origin is the API's.
  const referralLink = refId ? `${API_ORIGIN}/login?ref=${encodeURIComponent(String(refId))}` : '';

  const shareText = useMemo(() => {
    const rewardText = stats.rewardAmount > 0 ? `${RUPEE}${stats.rewardAmount}` : 'rewards';
    return `Join ${companyName} and earn ${rewardText}.`;
  }, [companyName, stats.rewardAmount]);

  const handleShare = async () => {
    if (!referralLink) {
      toast.error('Referral link unavailable');
      return;
    }
    try {
      await Share.share({ title: `${companyName} referral`, message: `${shareText} ${referralLink}` });
    } catch {
      toast.error('Unable to share right now');
    }
  };

  const miniStats = [
    { Icon: Users, label: 'Invited', value: stats.totalInvited },
    { Icon: CircleCheck, label: 'Credited', value: stats.creditedCount },
    { Icon: Wallet, label: 'Total', value: `${RUPEE}${stats.totalReferralEarnings}` },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#faf6ed' }} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Press onPress={() => navigateTo('/user/profile')} accessibilityLabel="Back" style={styles.back}>
          <ArrowLeft size={20} color="#000" />
        </Press>
        <Text style={styles.h1}>Refer & Earn</Text>
      </View>

      <Card style={[styles.card, { borderRadius: 16, marginBottom: 12 }]}>
        <CardContent style={{ padding: 16 }}>
          <Text style={styles.intro}>Invite friends and earn when they sign up.</Text>
          <View style={{ marginTop: 12, flexDirection: 'row', gap: 8 }}>
            <View style={styles.tile}>
              <Text style={styles.tileLabel}>Reward per invite</Text>
              <Text style={[styles.tileValue, { color: F.green }]}>{RUPEE}{stats.rewardAmount}</Text>
            </View>
            <View style={styles.tile}>
              <Text style={styles.tileLabel}>Referral earnings</Text>
              <Text style={[styles.tileValue, { color: tw.green600 }]}>{RUPEE}{stats.totalReferralEarnings}</Text>
            </View>
          </View>
          <Press onPress={handleShare} disabled={!referralLink} scale={0.98} accessibilityLabel="Share Invite" style={[styles.shareBtn, !referralLink ? { opacity: 0.5 } : null]}>
            <Share2 size={16} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.shareText}>Share Invite</Text>
          </Press>
        </CardContent>
      </Card>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        {miniStats.map(({ Icon, label, value }) => (
          <Card key={label} style={[styles.card, { flex: 1 }]}>
            <CardContent style={{ padding: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon size={14} color={tw.gray500} />
                <Text style={styles.miniLabel}>{label}</Text>
              </View>
              <Text style={styles.miniValue}>{value}</Text>
            </CardContent>
          </Card>
        ))}
      </View>

      <Card style={[styles.card, { borderRadius: 16 }]}>
        <CardContent style={{ padding: 16 }}>
          <Text style={styles.listTitle}>Invited Friends Status</Text>
          {loading ? (
            <Text style={styles.muted}>Loading referrals...</Text>
          ) : invitedFriends.length === 0 ? (
            <Text style={styles.muted}>No invited friends yet. Share your referral to start earning.</Text>
          ) : (
            <View style={{ gap: 8 }}>
              {invitedFriends.map((item, i) => {
                const meta = statusMeta[item?.status] || statusMeta.pending;
                const StatusIcon = meta.Icon;
                const invitedDate = item?.invitedAt ? new Date(item.invitedAt) : null;
                const dateText = invitedDate && !Number.isNaN(invitedDate.getTime()) ? invitedDate.toLocaleDateString() : '-';
                return (
                  <View key={item?.id || item?.refereeId || i} style={styles.friend}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.friendName} numberOfLines={1}>{item?.name || 'Friend'}</Text>
                        <Text style={styles.friendPhone}>{item?.phone || 'Phone hidden'}</Text>
                        <Text style={styles.friendDate}>Invited on {dateText}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <View style={[styles.badge, { backgroundColor: meta.bg }]}>
                          <StatusIcon size={12} color={meta.color} />
                          <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
                        </View>
                        <Text style={styles.earned}>Earned: {RUPEE}{Number(item?.earnedAmount) || 0}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </CardContent>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 96 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  back: { height: 32, width: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  h1: { fontSize: 20, lineHeight: 28, color: '#000', ...poppins(700) },
  card: { backgroundColor: '#fff', borderWidth: 0, ...shadow('sm') },
  intro: { fontSize: 14, lineHeight: 20, color: tw.gray600, ...poppins(400) },
  tile: { flex: 1, borderRadius: 12, backgroundColor: tw.gray50, padding: 12 },
  tileLabel: { fontSize: 11, lineHeight: 16.5, color: tw.gray500, ...poppins(400) },
  tileValue: { fontSize: 18, lineHeight: 28, ...poppins(700) },
  shareBtn: { marginTop: 12, height: 44, borderRadius: 12, backgroundColor: F.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%' },
  shareText: { fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(500) },
  miniLabel: { fontSize: 11, lineHeight: 16.5, color: tw.gray500, ...poppins(400) },
  miniValue: { marginTop: 4, fontSize: 20, lineHeight: 28, color: tw.gray900, ...poppins(700) },
  listTitle: { fontSize: 14, lineHeight: 20, color: tw.gray900, marginBottom: 12, ...poppins(600) },
  muted: { fontSize: 14, lineHeight: 20, color: tw.gray500, ...poppins(400) },
  friend: { borderRadius: 12, borderWidth: 1, borderColor: tw.gray200, padding: 12 },
  friendName: { fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(600) },
  friendPhone: { marginTop: 2, fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(400) },
  friendDate: { marginTop: 4, fontSize: 11, lineHeight: 16.5, color: tw.gray500, ...poppins(400) },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 11, lineHeight: 16.5, ...poppins(500) },
  earned: { marginTop: 8, fontSize: 12, lineHeight: 16, color: tw.gray700, ...poppins(400) },
});
