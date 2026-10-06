import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Flame, Gift, Star, Trophy, Zap } from 'lucide-react-native';
import { Spinner } from '../../components/Loader';
import { Press } from '../../components/ui';
import { toast } from '../../lib/notify';
import { useNavigate } from '../../lib/webRouter';
import { outfit as fo, tw } from '../../theme';
import DriverBottomNav from '../components/DriverBottomNav';
import { claimDriverIncentiveReward, getCurrentDriver, getDriverIncentives } from '../services/registrationService';

// Web: Taxi/modules/driver/pages/DriverIncentives.jsx (/taxi/driver/incentives)
// Web bug kept: claimDriverIncentiveReward is imported from registrationService but is not defined there,
// so a claim tap throws "not a function" and shows it in the error toast.

const unwrap = (response) => response?.data?.data || response?.data || response || {};

const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const progressPercent = (current, target) => {
  const safeTarget = Math.max(1, Number(target || 0));
  const safeCurrent = Math.max(0, Number(current || 0));
  return Math.min(100, Math.round((safeCurrent / safeTarget) * 100));
};

export default function DriverIncentives() {
  const insets = useSafeAreaInsets();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState('');
  const [claimingKey, setClaimingKey] = useState('');
  const [driverRating, setDriverRating] = useState(0);

  const fetchIncentives = async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    setError('');

    try {
      const [incentiveResponse, driverResponse] = await Promise.all([getDriverIncentives(), getCurrentDriver()]);
      setData(unwrap(incentiveResponse));
      setDriverRating(Number(unwrap(driverResponse)?.rating || 0));
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError?.message || 'Unable to load milestone progress');
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncentives();
  }, []);

  const handleClaim = async (rewardType, rewardKey) => {
    setClaimingKey(`${rewardType}:${rewardKey}`);
    try {
      const response = await claimDriverIncentiveReward({ rewardType, rewardKey });
      const claimedReward = unwrap(response)?.claimedReward;
      toast.success(`${formatCurrency(claimedReward?.amount || 0)} added to your pocket!`);
      await fetchIncentives({ quiet: true });
    } catch (requestError) {
      toast.error(requestError?.response?.data?.message || requestError?.message || 'Unable to claim reward');
    } finally {
      setClaimingKey('');
    }
  };

  const summary = useMemo(() => data?.summary || {}, [data]);
  const milestones = useMemo(() => data?.milestones || [], [data]);
  const features = useMemo(() => data?.features || [], [data]);
  const claimedRewards = useMemo(() => data?.claimedRewards || [], [data]);
  const bonusEarnings = useMemo(() => claimedRewards.reduce((sum, item) => sum + Number(item?.amount || 0), 0), [claimedRewards]);

  // Simple Level System
  const levelData = useMemo(() => {
    const totalTrips = Number(summary.totalTrips || summary.currentWeekTrips || 0);
    const level = Math.floor(totalTrips / 50) + 1;
    const currentXP = totalTrips % 50;
    const targetXP = 50;

    const levels = [
      { name: 'Bronze', color: '#B45309' },
      { name: 'Silver', color: '#64748B' },
      { name: 'Gold', color: '#D97706' },
      { name: 'Platinum', color: '#4F46E5' },
    ];

    return { level, percent: (currentXP / targetXP) * 100, currentXP, targetXP, ...levels[Math.min(level - 1, levels.length - 1)] };
  }, [summary]);

  if (loading) {
    return (
      <View style={[st.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <Spinner size={24} color="#000" />
        <Text style={st.loadingText}>Loading Rewards</Text>
      </View>
    );
  }

  return (
    <View style={st.root}>
      <View style={[st.header, { paddingTop: insets.top + 16 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 }}>
            <Press onPress={() => navigate('/taxi/driver/profile')} accessibilityLabel="Back to account" style={st.back}>
              <ArrowLeft size={18} color="#000" />
            </Press>
            <View>
              <Text style={st.title}>Incentives</Text>
              <Text style={st.sub}>Driver Earnings</Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={st.bonusLabel}>Bonus earned</Text>
            <Text style={st.bonusValue}>{formatCurrency(bonusEarnings)}</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 128 + insets.bottom, gap: 32 }} showsVerticalScrollIndicator={false}>
        {/* Level Overview */}
        <View style={st.levelCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <View style={st.trophy}>
              <Trophy size={24} color={levelData.color} />
            </View>
            <View>
              <Text style={st.levelName}>{levelData.name} Partner</Text>
              <Text style={st.levelSub}>Level {levelData.level}</Text>
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[st.xs, { color: tw.gray400 }]}>Next Level</Text>
              <Text style={[st.xs, { color: tw.gray900 }]}>
                {levelData.currentXP} / {levelData.targetXP} trips
              </Text>
            </View>
            <View style={st.track}>
              <View style={{ height: '100%', width: `${levelData.percent}%`, backgroundColor: '#000', borderRadius: 999 }} />
            </View>
          </View>

          <View style={st.stats}>
            <View style={{ flex: 1 }}>
              <Text style={st.statLabel}>Streak</Text>
              <View style={st.statRow}>
                <Text style={st.statValue}>{summary.streakDays || 0}</Text>
                <Flame size={14} color={tw.orange500} />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.statLabel}>Weekly</Text>
              <Text style={st.statValue}>{summary.currentWeekTrips || 0} trips</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.statLabel}>Rating</Text>
              <View style={st.statRow}>
                <Text style={st.statValue}>{driverRating.toFixed(1)}</Text>
                <Star size={14} color={tw.yellow500} fill={tw.yellow500} />
              </View>
            </View>
          </View>
        </View>

        {/* Active Quests */}
        <View style={{ gap: 16 }}>
          <Text style={st.sectionTitle}>Active Quests</Text>

          <View style={{ gap: 12 }}>
            {milestones.map((milestone) => {
              const claimKey = `milestone:${milestone.id}`;
              const progress = progressPercent(milestone.progress?.qualifyingDays, milestone.progress?.targetDays);
              const canClaim = milestone.isEligible && !milestone.isClaimed;
              const btn = canClaim
                ? { backgroundColor: '#000', borderWidth: 0, boxShadow: '0 10px 15px -3px rgba(229,231,235,1), 0 4px 6px -4px rgba(229,231,235,1)' }
                : milestone.isClaimed
                  ? { backgroundColor: tw.green50, borderWidth: 1, borderColor: tw.green100 }
                  : { backgroundColor: tw.gray50, borderWidth: 1, borderColor: tw.gray100 };
              const btnText = canClaim ? '#fff' : milestone.isClaimed ? tw.green600 : tw.gray400;

              return (
                <View key={milestone.id} style={st.quest}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, gap: 8 }}>
                    <View style={{ gap: 4, flexShrink: 1 }}>
                      <Text style={st.questName}>{milestone.name}</Text>
                      <Text style={st.questSub}>{milestone.required_weeks} weeks consistency challenge</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={st.statLabelNoMb}>Reward</Text>
                      <Text style={st.reward}>{formatCurrency(milestone.payout_amount)}</Text>
                    </View>
                  </View>

                  <View style={{ gap: 6, marginBottom: 20 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={st.progressText}>Progress</Text>
                      <Text style={st.progressText}>
                        {milestone.progress?.qualifyingDays || 0}/{milestone.progress?.targetDays || 0} days
                      </Text>
                    </View>
                    <View style={st.track6}>
                      <View style={{ height: '100%', width: `${progress}%`, backgroundColor: tw.blue600, borderRadius: 999 }} />
                    </View>
                  </View>

                  <Press
                    disabled={!canClaim || claimingKey === claimKey}
                    onPress={() => handleClaim('milestone', milestone.id)}
                    scale={1}
                    style={[st.claim, btn]}
                  >
                    <Text style={[st.claimText, { color: btnText }]}>{claimingKey === claimKey ? 'Claiming...' : milestone.isClaimed ? 'Reward Claimed' : 'Ongoing'}</Text>
                  </Press>
                </View>
              );
            })}
          </View>
        </View>

        {/* Referral Card */}
        <View style={st.referral}>
          <View>
            <Text style={st.refTitle}>Invite a Friend</Text>
            <Text style={st.refText}>
              {Number(data?.referralRewardAmount) > 0
                ? `Earn ${formatCurrency(data.referralRewardAmount)} for every new driver you refer.`
                : 'Invite other drivers to join. Rewards are set by the district team.'}
            </Text>
            <Press onPress={() => navigate('/taxi/driver/referral')} style={st.invite}>
              <Text style={st.inviteText}>Invite Now</Text>
            </Press>
          </View>
          <View style={st.giftWrap} pointerEvents="none">
            <Gift size={120} color="rgba(255,255,255,0.1)" />
          </View>
        </View>

        {/* Boosters */}
        <View style={{ gap: 16, paddingBottom: 40 }}>
          <Text style={st.sectionTitle}>Bonus Boosters</Text>
          <View style={{ gap: 12 }}>
            {features
              .filter((f) => f.enabled)
              .map((feature) => {
                const claimKey = `feature:${feature.key}`;
                const canClaim = feature.isEligible && !feature.isClaimed;

                return (
                  <View key={feature.key} style={st.boost}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, flexShrink: 1 }}>
                      <View style={st.boostIcon}>{feature.key.includes('streak') ? <Flame size={18} color={tw.gray400} /> : <Zap size={18} color={tw.gray400} />}</View>
                      <View style={{ flexShrink: 1 }}>
                        <Text style={st.boostLabel}>{feature.label}</Text>
                        <Text style={st.boostSub}>
                          {feature.currentValue}/{feature.targetValue} {feature.unit}
                        </Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 8 }}>
                      <Text style={st.boostReward}>{formatCurrency(feature.reward_amount)}</Text>
                      <Press
                        disabled={!canClaim || claimingKey === claimKey}
                        onPress={() => handleClaim('feature', feature.key)}
                        scale={1}
                        style={[st.boostBtn, canClaim && { backgroundColor: '#000' }]}
                      >
                        <Text style={[st.boostBtnText, { color: canClaim ? '#fff' : tw.gray300 }]}>{feature.isClaimed ? 'Done' : 'Claim'}</Text>
                      </Press>
                    </View>
                  </View>
                );
              })}
          </View>
        </View>
      </ScrollView>

      <DriverBottomNav />
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  loadingText: { marginTop: 16, fontSize: 12, letterSpacing: 1.8, textTransform: 'uppercase', color: tw.gray400, ...fo(600) },
  header: { backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 24, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: tw.gray100 },
  back: { width: 40, height: 40, borderRadius: 16, borderWidth: 1, borderColor: tw.gray100, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)' },
  title: { fontSize: 20, color: tw.gray900, ...fo(700) },
  sub: { fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase', color: tw.gray400, ...fo(500) },
  bonusLabel: { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: tw.gray400, ...fo(700) },
  bonusValue: { fontSize: 18, color: '#000', ...fo(700) },
  levelCard: { backgroundColor: tw.gray50, borderRadius: 24, padding: 24 },
  trophy: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)' },
  levelName: { fontSize: 18, color: tw.gray900, ...fo(700) },
  levelSub: { fontSize: 14, color: tw.gray500, ...fo(500) },
  xs: { fontSize: 12, ...fo(700) },
  track: { height: 8, width: '100%', backgroundColor: tw.gray200, borderRadius: 999, overflow: 'hidden' },
  track6: { height: 6, width: '100%', backgroundColor: tw.gray100, borderRadius: 999, overflow: 'hidden' },
  stats: { marginTop: 24, flexDirection: 'row', gap: 16, paddingTop: 24, borderTopWidth: 1, borderTopColor: 'rgba(229,231,235,0.5)' },
  statLabel: { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: tw.gray400, marginBottom: 4, ...fo(700) },
  statLabelNoMb: { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: tw.gray400, ...fo(700) },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statValue: { fontSize: 16, color: tw.gray900, ...fo(700) },
  sectionTitle: { fontSize: 14, letterSpacing: 1.4, textTransform: 'uppercase', color: tw.gray900, ...fo(700) },
  quest: { borderWidth: 1, borderColor: tw.gray100, borderRadius: 24, padding: 20 },
  questName: { fontSize: 16, color: tw.gray900, ...fo(700) },
  questSub: { fontSize: 12, color: tw.gray500, ...fo(400) },
  reward: { fontSize: 14, color: tw.green600, ...fo(700) },
  progressText: { fontSize: 10, color: tw.gray400, ...fo(700) },
  claim: { width: '100%', paddingVertical: 12, borderRadius: 16, alignItems: 'center' },
  claimText: { fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', ...fo(700) },
  referral: { backgroundColor: '#000', borderRadius: 24, padding: 24, overflow: 'hidden' },
  refTitle: { fontSize: 18, color: '#fff', marginBottom: 8, ...fo(700) },
  refText: { fontSize: 14, color: tw.gray400, marginBottom: 24, ...fo(400) },
  invite: { alignSelf: 'flex-start', paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#fff', borderRadius: 16 },
  inviteText: { fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: '#000', ...fo(700) },
  giftWrap: { position: 'absolute', right: -16, bottom: -16 },
  boost: { borderWidth: 1, borderColor: tw.gray100, borderRadius: 24, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  boostIcon: { width: 40, height: 40, borderRadius: 16, backgroundColor: tw.gray50, alignItems: 'center', justifyContent: 'center' },
  boostLabel: { fontSize: 14, color: tw.gray900, ...fo(700) },
  boostSub: { fontSize: 10, color: tw.gray400, ...fo(500) },
  boostReward: { fontSize: 14, color: '#000', ...fo(700) },
  boostBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12 },
  boostBtnText: { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', ...fo(700) },
});
