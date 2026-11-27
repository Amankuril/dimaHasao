import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Building2, CheckCircle, ChevronRight, Clock, FileText, Landmark, Shield, UserCheck, XCircle } from 'lucide-react-native';
import { Button, Card, StatusBadge } from '../../components/ds';
import { color, radii, space, type } from '../../theme';
import PartnerHeader from '../components/PartnerHeader';
import { useNavigate } from '../../lib/webRouter';
import { hotelApi } from '../services/api';
import { propertyService } from '../services/apiService';
import walletService from '../services/walletService';

/*
 * Verification status for the hotel partner, from real data:
 *  - the partner account's approval (GET /auth/me → partnerApprovalStatus),
 *  - payout bank details (GET /wallet → bankDetails),
 *  - each property's approval and the documents uploaded with it
 *    (GET /properties/:id → documents).
 *
 * The earlier page was a fixed mock ported from the web ("Verified on 12 Aug
 * 2024", "Image blurred. Please re-upload cancelled cheque.") whose upload
 * buttons did nothing; every partner saw the same invented history.
 */

const STATUS = {
  approved: { tone: 'success', Icon: CheckCircle, label: 'Verified' },
  verified: { tone: 'success', Icon: CheckCircle, label: 'Verified' },
  pending: { tone: 'warning', Icon: Clock, label: 'Under review' },
  rejected: { tone: 'danger', Icon: XCircle, label: 'Action needed' },
  suspended: { tone: 'danger', Icon: XCircle, label: 'Suspended' },
};

const Status = ({ value, fallback = 'Not started' }) => {
  const s = STATUS[String(value || '').toLowerCase()];
  return s ? <StatusBadge label={s.label} tone={s.tone} icon={s.Icon} /> : <StatusBadge label={fallback} tone="neutral" />;
};

const EDIT_WIZARD_BY_TYPE = {
  hotel: '/hotel/partner/join-hotel',
  lodge: '/hotel/partner/join-lodge',
  resort: '/hotel/partner/join-resort',
  homestay: '/hotel/partner/join-homestay',
};

const hasBankDetails = (bank = {}) => Boolean(bank && (bank.accountNumber || bank.upiId || bank.ifscCode || bank.ifsc));

const PartnerKYC = () => {
  const insets = useSafeAreaInsets();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [partnerStatus, setPartnerStatus] = useState('');
  const [bank, setBank] = useState(null);
  const [properties, setProperties] = useState([]);

  const load = useCallback(async () => {
    setError('');
    try {
      const [meRes, walletRes, mine] = await Promise.all([
        hotelApi.get('/auth/me').then((r) => r.data).catch(() => null),
        walletService.getWallet().catch(() => null),
        propertyService.getMy().catch(() => []),
      ]);
      const me = meRes?.user || meRes?.data || meRes || {};
      setPartnerStatus(me.partnerApprovalStatus || '');
      const wallet = walletRes?.wallet || walletRes?.data || walletRes || {};
      setBank(wallet.bankDetails || null);

      const list = Array.isArray(mine) ? mine : mine?.properties || mine?.data || [];
      const detailed = await Promise.all(
        list.map(async (p) => {
          const d = await propertyService.getDetails(p._id).catch(() => null);
          const docs = d?.documents?.documents || [];
          return { ...p, docs };
        }),
      );
      setProperties(detailed);
    } catch (e) {
      setError(e?.message || 'Could not load verification status');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const bankAdded = hasBankDetails(bank);

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <PartnerHeader title="KYC Verification" subtitle="Account, bank and property documents" />

      <ScrollView
        contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: space.xxxl + insets.bottom }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[color.primary]} />}
      >
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Shield size={24} color={color.goldOnDark} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.heroTitle}>Verification status</Text>
            <Text style={styles.heroSub}>Your account, payout details and each property&apos;s documents.</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={color.primary} style={{ padding: space.xl }} />
        ) : (
          <>
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Card padded={false} style={styles.card}>
              <View style={styles.step}>
                <View style={styles.row}>
                  <View style={styles.stepIcon}><UserCheck size={18} color={color.primary} /></View>
                  <View style={{ flex: 1, minWidth: 0, gap: space.xs }}>
                    <Text style={styles.stepLabel}>Partner account</Text>
                    <Status value={partnerStatus} />
                    <Text style={styles.stepDesc}>
                      {partnerStatus === 'approved'
                        ? 'Your partner account is verified.'
                        : partnerStatus === 'rejected'
                          ? 'Your account was not approved. Contact support to resolve it.'
                          : 'The Dima Hasao team is reviewing your account.'}
                    </Text>
                    {partnerStatus === 'rejected' ? (
                      <Button title="Contact support" iconRight={ChevronRight} size="sm" fullWidth={false} onPress={() => navigate('/hotel/partner/support')} style={styles.btn} />
                    ) : null}
                  </View>
                </View>
              </View>

              <View style={[styles.step, styles.divider]}>
                <View style={styles.row}>
                  <View style={styles.stepIcon}><Landmark size={18} color={color.primary} /></View>
                  <View style={{ flex: 1, minWidth: 0, gap: space.xs }}>
                    <Text style={styles.stepLabel}>Payout bank details</Text>
                    {bankAdded ? <Status value={bank?.verified ? 'verified' : 'pending'} /> : <StatusBadge label="Not added" tone="neutral" />}
                    <Text style={styles.stepDesc}>
                      {bankAdded ? 'Payouts go to the account you added.' : 'Add a bank account or UPI ID to receive payouts.'}
                    </Text>
                    <Button
                      title={bankAdded ? 'View bank details' : 'Add bank details'}
                      iconRight={ChevronRight}
                      size="sm"
                      variant={bankAdded ? 'secondary' : 'primary'}
                      fullWidth={false}
                      onPress={() => navigate('/hotel/partner/bank-details')}
                      style={styles.btn}
                    />
                  </View>
                </View>
              </View>
            </Card>

            <Text style={styles.section}>Properties</Text>
            {properties.length === 0 ? (
              <Card style={styles.card}>
                <Text style={styles.stepDesc}>No properties yet. Documents are uploaded with each property.</Text>
                <Button title="Add property" iconRight={ChevronRight} size="sm" fullWidth={false} onPress={() => navigate('/hotel/partner/join')} style={styles.btn} />
              </Card>
            ) : (
              properties.map((p) => {
                const uploaded = p.docs.filter((d) => d.fileUrl).length;
                const missingRequired = p.docs.filter((d) => d.isRequired && !d.fileUrl).length;
                const editRoute = EDIT_WIZARD_BY_TYPE[String(p.propertyType || '').toLowerCase()];
                return (
                  <Card key={p._id} padded={false} style={styles.card}>
                    <View style={styles.step}>
                      <View style={styles.row}>
                        <View style={styles.stepIcon}><Building2 size={18} color={color.primary} /></View>
                        <View style={{ flex: 1, minWidth: 0, gap: space.xs }}>
                          <Text style={styles.stepLabel} numberOfLines={2}>{p.propertyName}</Text>
                          <Status value={p.status} fallback="Draft" />
                          <Text style={styles.stepDesc}>
                            {p.docs.length ? `${uploaded} of ${p.docs.length} documents uploaded${missingRequired ? ` · ${missingRequired} required missing` : ''}` : 'No documents requested for this property.'}
                          </Text>
                        </View>
                      </View>
                    </View>
                    {p.docs.map((d) => (
                      <View key={d._id || d.type} style={[styles.docRow, styles.divider]}>
                        <FileText size={16} color={color.textMuted} />
                        <Text style={styles.docName} numberOfLines={2}>{d.name || d.type}{d.isRequired ? '' : ' (optional)'}</Text>
                        {d.fileUrl ? <StatusBadge label="Uploaded" tone="success" icon={CheckCircle} /> : <StatusBadge label="Not uploaded" tone={d.isRequired ? 'danger' : 'neutral'} />}
                      </View>
                    ))}
                    {editRoute && uploaded < p.docs.length ? (
                      <View style={[styles.step, styles.divider]}>
                        <Button title="Upload documents" iconRight={ChevronRight} size="sm" fullWidth={false} onPress={() => navigate(editRoute, { state: { property: p } })} style={styles.btn} />
                      </View>
                    ) : null}
                  </Card>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: space.lg, backgroundColor: color.primaryDeep, padding: space.xl, borderRadius: radii.xl },
  heroIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { ...type.subheading, color: color.textInverse },
  heroSub: { ...type.small, color: color.textOnDarkMuted },
  card: { maxWidth: 768, width: '100%', alignSelf: 'center' },
  step: { padding: space.lg },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border },
  stepIcon: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  stepLabel: { ...type.bodyStrong, color: color.text },
  stepDesc: { ...type.small, color: color.textMuted },
  section: { ...type.subheading, color: color.text },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.md },
  docName: { ...type.small, color: color.text, flex: 1, minWidth: 0 },
  btn: { minHeight: 44, marginTop: space.xs },
  error: { ...type.small, color: color.danger },
});

export default PartnerKYC;
