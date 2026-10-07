import { useEffect, useMemo, useState } from 'react';
import { FlatList, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CircleCheck, CircleX, Clock3, Share2, Users, Wallet } from 'lucide-react-native';
import { toast } from '../../../lib/notify';
import { navigateTo } from '../../../lib/webRouter';
import { API_ORIGIN } from '../../../api/client';
import { userAPI } from '../../../api/food';
import { useCompanyName } from '../../hooks/useCompanyName';
import { useProfile } from '../../context/ProfileContext';
import { Button, Card, SectionHeader, StatusBadge } from '../../../components/ds';
import { NAV_CLEARANCE } from '../../../components/dh/AppBottomNav';
import { PageHeader } from '../../components/profile/ProfileChrome';
import { color, radii, space, type } from '../../../theme';

const statusMeta = {
  credited: { label: 'Credited', Icon: CircleCheck, tone: 'success' },
  pending: { label: 'Pending', Icon: Clock3, tone: 'warning' },
  rejected: { label: 'Rejected', Icon: CircleX, tone: 'danger' },
};

const RUPEE = '₹';

/** Port of pages/user/profile/ReferEarn.jsx. */
export default function ReferEarn() {
  const insets = useSafeAreaInsets();
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

  const renderFriend = ({ item }) => {
    const meta = statusMeta[item?.status] || statusMeta.pending;
    const invitedDate = item?.invitedAt ? new Date(item.invitedAt) : null;
    const dateText = invitedDate && !Number.isNaN(invitedDate.getTime()) ? invitedDate.toLocaleDateString() : '-';
    return (
      <View style={styles.friend}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.friendName} numberOfLines={1}>
            {item?.name || 'Friend'}
          </Text>
          <Text style={styles.friendPhone}>{item?.phone || 'Phone hidden'}</Text>
          <Text style={styles.friendDate}>Invited on {dateText}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: space.sm }}>
          <StatusBadge icon={meta.Icon} label={meta.label} tone={meta.tone} />
          <Text style={styles.earned}>Earned: {RUPEE}{Number(item?.earnedAmount) || 0}</Text>
        </View>
      </View>
    );
  };

  const header = (
    <View style={{ gap: space.md, marginBottom: space.md }}>
      <Card style={{ gap: space.md }}>
        <Text style={styles.intro}>Invite friends and earn when they sign up.</Text>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <View style={styles.tile}>
            <Text style={styles.tileLabel}>Reward per invite</Text>
            <Text style={[styles.tileValue, { color: color.goldText }]}>{RUPEE}{stats.rewardAmount}</Text>
          </View>
          <View style={styles.tile}>
            <Text style={styles.tileLabel}>Referral earnings</Text>
            <Text style={[styles.tileValue, { color: color.success }]}>{RUPEE}{stats.totalReferralEarnings}</Text>
          </View>
        </View>
        <Button title="Share Invite" icon={Share2} onPress={handleShare} disabled={!referralLink} accessibilityLabel="Share Invite" />
      </Card>

      <View style={{ flexDirection: 'row', gap: space.sm }}>
        {miniStats.map(({ Icon, label, value }) => (
          <Card key={label} style={{ flex: 1, padding: space.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
              <Icon size={14} color={color.textMuted} />
              <Text style={styles.miniLabel} numberOfLines={1}>
                {label}
              </Text>
            </View>
            <Text style={styles.miniValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {value}
            </Text>
          </Card>
        ))}
      </View>

      <SectionHeader title="Invited friends status" style={{ marginTop: space.md, marginBottom: 0 }} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <PageHeader title="Refer & Earn" onBack={() => navigateTo('/user/profile')} />
      <FlatList
        data={loading ? [] : invitedFriends}
        keyExtractor={(item, i) => String(item?.id || item?.refereeId || i)}
        renderItem={renderFriend}
        ListHeaderComponent={header}
        ItemSeparatorComponent={Separator}
        ListEmptyComponent={
          <Card>
            <Text style={styles.muted}>{loading ? 'Loading referrals...' : 'No invited friends yet. Share your referral to start earning.'}</Text>
          </Card>
        }
        contentContainerStyle={{ padding: space.lg, paddingBottom: NAV_CLEARANCE + space.lg + insets.bottom }}
      />
    </View>
  );
}

const Separator = () => <View style={{ height: space.sm }} />;

const styles = StyleSheet.create({
  intro: { ...type.body, color: color.textSecondary },
  tile: { flex: 1, borderRadius: radii.md, backgroundColor: color.surfaceMuted, padding: space.md },
  tileLabel: { ...type.caption, color: color.textMuted },
  tileValue: { ...type.price },
  miniLabel: { ...type.caption, color: color.textMuted, flexShrink: 1 },
  miniValue: { marginTop: space.xs, ...type.price, color: color.text },
  muted: { ...type.body, color: color.textMuted },
  friend: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, backgroundColor: color.surface, padding: space.md },
  friendName: { ...type.bodyStrong, color: color.text },
  friendPhone: { marginTop: space.xxs, ...type.small, color: color.textMuted },
  friendDate: { marginTop: space.xxs, ...type.caption, color: color.textMuted },
  earned: { ...type.caption, color: color.textSecondary },
});
