import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Flame, Gift, Star, Trophy, Zap } from 'lucide-react-native';
import { Spinner } from '../../components/Loader';
import { Press } from '../../components/ui';
import { toast } from '../../lib/notify';
import { useNavigate } from '../../lib/webRouter';
import { outfit as fo, playfair, tw } from '../../theme';
import DriverBottomNav, { NAV_BAR_HEIGHT } from '../components/DriverBottomNav';
import { claimDriverIncentiveReward, getCurrentDriver, getDriverIncentives } from '../services/registrationService';
import { DT } from '../ui/dt';
import ScreenHeader from '../ui/ScreenHeader';
import { Card, CtaButton, SectionLabel } from '../ui/Surface';

// Web: Taxi/modules/driver/pages/DriverIncentives.jsx (/taxi/driver/incentives)

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
        <Spinner size={24} color={DT.brand} />
        <Text style={st.loadingText}>LOADING REWARDS</Text>
      </View>
    );
  }

  return (
    <View style={st.root}>
      <ScreenHeader
        title="Incentives"
        subtitle="Driver earnings"
        onBack={() => navigate('/taxi/driver/profile')}
        right={
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={st.bonusLabel}>BONUS EARNED</Text>
            <Text style={st.bonusValue}>{formatCurrency(bonusEarnings)}</Text>
          </View>
        }
      />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: NAV_BAR_HEIGHT + insets.bottom + 16, gap: 24 }} showsVerticalScrollIndicator={false}>
        {/* Level Overview */}
        <Card tone="dark" style={st.levelCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 22 }}>
            <View style={st.trophy}>
              <Trophy size={24} color={DT.gold} />
            </View>
            <View style={{ flexShrink: 1 }}>
              <Text style={st.levelName}>{levelData.name} Partner</Text>
              <Text style={st.levelSub}>Level {levelData.level}</Text>
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[st.xs, { color: DT.onBrandMuted }]}>Next Level</Text>
              <Text style={[st.xs, { color: DT.onBrand }]}>
                {levelData.currentXP} / {levelData.targetXP} trips
              </Text>
            </View>
            <View style={st.track}>
              <View style={{ height: '100%', width: `${levelData.percent}%`, backgroundColor: DT.gold, borderRadius: 999 }} />
            </View>
          </View>

          <View style={st.stats}>
            <View style={{ flex: 1 }}>
              <Text style={st.statLabel}>STREAK</Text>
              <View style={st.statRow}>
                <Text style={st.statValue}>{summary.streakDays || 0}</Text>
                <Flame size={14} color={tw.orange500} />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.statLabel}>WEEKLY</Text>
              <Text style={st.statValue}>{summary.currentWeekTrips || 0} trips</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.statLabel}>RATING</Text>
              <View style={st.statRow}>
                <Text style={st.statValue}>{driverRating.toFixed(1)}</Text>
                <Star size={14} color={DT.accent} fill={DT.accent} />
              </View>
            </View>
          </View>
        </Card>

        {/* Active Quests */}
        <View style={{ gap: 12 }}>
          <SectionLabel>ACTIVE QUESTS</SectionLabel>

          <View style={{ gap: 12 }}>
            {milestones.map((milestone) => {
              const claimKey = `milestone:${milestone.id}`;
              const progress = progressPercent(milestone.progress?.qualifyingDays, milestone.progress?.targetDays);
              const canClaim = milestone.isEligible && !milestone.isClaimed;
              const btn = canClaim
                ? { backgroundColor: DT.cta, borderWidth: 0 }
                : milestone.isClaimed
                  ? { backgroundColor: DT.successSoft, borderWidth: 1, borderColor: DT.successSoft }
                  : { backgroundColor: DT.bgSoft, borderWidth: 1, borderColor: DT.border };
              const btnText = canClaim ? DT.ctaInk : milestone.isClaimed ? DT.successInk : DT.inkSoft;

              return (
                <Card key={milestone.id} style={st.quest}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, gap: 8 }}>
                    <View style={{ gap: 4, flexShrink: 1 }}>
                      <Text style={st.questName}>{milestone.name}</Text>
                      <Text style={st.questSub}>{milestone.required_weeks} weeks consistency challenge</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                      <Text style={st.statLabelNoMb}>REWARD</Text>
                      <Text style={st.reward}>{formatCurrency(milestone.payout_amount)}</Text>
                    </View>
                  </View>

                  <View style={{ gap: 6, marginBottom: 18 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={st.progressText}>Progress</Text>
                      <Text style={st.progressText}>
                        {milestone.progress?.qualifyingDays || 0}/{milestone.progress?.targetDays || 0} days
                      </Text>
                    </View>
                    <View style={st.track6}>
                      <View style={{ height: '100%', width: `${progress}%`, backgroundColor: DT.brandMid, borderRadius: 999 }} />
                    </View>
                  </View>

                  <Press
                    disabled={!canClaim || claimingKey === claimKey}
                    onPress={() => handleClaim('milestone', milestone.id)}
                    scale={1}
                    style={[st.claim, btn]}
                  >
                    <Text style={[st.claimText, { color: btnText }]}>{claimingKey === claimKey ? 'CLAIMING...' : milestone.isClaimed ? 'REWARD CLAIMED' : 'ONGOING'}</Text>
                  </Press>
                </Card>
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
            <CtaButton title="INVITE NOW" onPress={() => navigate('/taxi/driver/referral')} style={{ alignSelf: 'flex-start' }} />
          </View>
          <View style={st.giftWrap} pointerEvents="none">
            <Gift size={120} color="rgba(255,255,255,0.1)" />
          </View>
        </View>

        {/* Boosters */}
        <View style={{ gap: 12 }}>
          <SectionLabel>BONUS BOOSTERS</SectionLabel>
          <View style={{ gap: 12 }}>
            {features
              .filter((f) => f.enabled)
              .map((feature) => {
                const claimKey = `feature:${feature.key}`;
                const canClaim = feature.isEligible && !feature.isClaimed;

                return (
                  <Card key={feature.key} style={st.boost}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flexShrink: 1 }}>
                      <View style={st.boostIcon}>{feature.key.includes('streak') ? <Flame size={18} color={DT.gold} /> : <Zap size={18} color={DT.gold} />}</View>
                      <View style={{ flexShrink: 1 }}>
                        <Text style={st.boostLabel}>{feature.label}</Text>
                        <Text style={st.boostSub}>
                          {feature.currentValue}/{feature.targetValue} {feature.unit}
                        </Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                      <Text style={st.boostReward}>{formatCurrency(feature.reward_amount)}</Text>
                      <Press
                        disabled={!canClaim || claimingKey === claimKey}
                        onPress={() => handleClaim('feature', feature.key)}
                        scale={1}
                        style={[st.boostBtn, canClaim && { backgroundColor: DT.cta }]}
                      >
                        <Text style={[st.boostBtnText, { color: canClaim ? DT.ctaInk : DT.inkSoft }]}>{feature.isClaimed ? 'DONE' : 'CLAIM'}</Text>
                      </Press>
                    </View>
                  </Card>
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
  root: { flex: 1, backgroundColor: DT.bg },
  loadingText: { marginTop: 16, fontSize: 12, letterSpacing: 1.8, minWidth: 130, color: DT.muted, ...fo(600) },
  bonusLabel: { fontSize: 10, letterSpacing: 1, minWidth: 90, textAlign: 'right', color: DT.onBrandMuted, ...fo(700) },
  bonusValue: { fontSize: 18, color: DT.accent, fontVariant: ['tabular-nums'], ...fo(800) },
  levelCard: { borderRadius: DT.radius.xl, padding: 22 },
  trophy: { width: 52, height: 52, borderRadius: 18, backgroundColor: 'rgba(202,168,62,0.14)', borderWidth: 1, borderColor: 'rgba(202,168,62,0.35)', alignItems: 'center', justifyContent: 'center' },
  levelName: { fontSize: 20, color: DT.onBrand, ...fo(800) },
  levelSub: { fontSize: 14, color: DT.gold, ...fo(600) },
  xs: { fontSize: 12, ...fo(700) },
  track: { height: 10, width: '100%', backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 999, overflow: 'hidden' },
  track6: { height: 8, width: '100%', backgroundColor: DT.bgSoft, borderRadius: 999, overflow: 'hidden' },
  stats: { marginTop: 22, flexDirection: 'row', gap: 16, paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)' },
  statLabel: { fontSize: 10, letterSpacing: 1, minWidth: 50, color: DT.onBrandMuted, marginBottom: 4, ...fo(700) },
  statLabelNoMb: { fontSize: 10, letterSpacing: 1, minWidth: 50, textAlign: 'right', color: DT.muted, ...fo(700) },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statValue: { fontSize: 16, color: DT.onBrand, ...fo(800) },
  quest: { borderRadius: DT.radius.xl, padding: 20 },
  questName: { fontSize: 16, color: DT.ink, ...fo(800) },
  questSub: { fontSize: 12, color: DT.inkSoft, ...fo(500) },
  reward: { fontSize: 16, color: DT.successInk, fontVariant: ['tabular-nums'], ...fo(800) },
  progressText: { fontSize: 11, color: DT.muted, ...fo(700) },
  claim: { width: '100%', minHeight: 48, justifyContent: 'center', borderRadius: DT.radius.lg, alignItems: 'center' },
  claimText: { fontSize: 12, letterSpacing: 1, minWidth: 80, ...fo(800) },
  referral: { backgroundColor: DT.brand, borderRadius: DT.radius.xl, padding: 24, overflow: 'hidden' },
  refTitle: { fontSize: 18, color: DT.gold, marginBottom: 8, ...playfair(700) },
  refText: { fontSize: 14, lineHeight: 20, color: DT.onBrandMuted, marginBottom: 20, ...fo(500) },
  giftWrap: { position: 'absolute', right: -16, bottom: -16 },
  boost: { borderRadius: DT.radius.xl, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  boostIcon: { width: 44, height: 44, borderRadius: 16, backgroundColor: DT.brandSoft, alignItems: 'center', justifyContent: 'center' },
  boostLabel: { fontSize: 14, color: DT.ink, ...fo(800) },
  boostSub: { fontSize: 11, color: DT.muted, ...fo(600) },
  boostReward: { fontSize: 15, color: DT.ink, fontVariant: ['tabular-nums'], ...fo(800) },
  boostBtn: { minHeight: 36, minWidth: 72, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 999, backgroundColor: DT.bgSoft },
  boostBtnText: { fontSize: 11, letterSpacing: 0.8, minWidth: 40, textAlign: 'center', ...fo(800) },
});
