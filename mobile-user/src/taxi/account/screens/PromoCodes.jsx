import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { AlertCircle, CheckCircle2, Clock, Copy, Tag, Ticket, X } from 'lucide-react-native';
import { Button, Card, EmptyState, IconButton, SectionHeader } from '../../../components/ds';
import { NAV_CLEARANCE } from '../../../components/dh/AppBottomNav';
import { color, elevation, radii, space, type } from '../../../theme';
import { userService } from '../../services/userService';
import { PageTitle, Pulse, useNavPad } from '../ui';

// Web: Taxi/modules/user/pages/PromoCodes.jsx (/taxi/user/promo)

const unwrap = (r) => r?.data?.data ?? r?.data ?? r;

const formatExpiry = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const toPromoCard = (p) => ({
  id: String(p?._id || p?.code || ''),
  code: String(p?.code || ''),
  discountPercentage: Number(p?.discount_percentage || 0),
  maxDiscount: Number(p?.maximum_discount_amount || 0),
  minFare: Number(p?.minimum_trip_amount || 0),
  service: String(p?.transport_type || 'all') === 'all' ? 'All rides' : 'Taxi rides',
  expiry: formatExpiry(p?.to_date),
});

const SkeletonCard = () => (
  <Card style={{ gap: space.md }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Pulse style={{ height: 16, width: 96, borderRadius: 8, backgroundColor: color.surfaceMuted }} />
      <Pulse style={{ height: 16, width: 64, borderRadius: 8, backgroundColor: color.surfaceMuted }} />
    </View>
    <Pulse style={{ height: 12, width: '75%', borderRadius: 6, backgroundColor: color.surfaceMuted }} />
    <Pulse style={{ height: 48, borderRadius: radii.md, backgroundColor: color.surfaceMuted }} />
  </Card>
);

export default function PromoCodes() {
  const bottomPad = useNavPad(space.xxl);
  const toastBottom = NAV_CLEARANCE + useSafeAreaInsets().bottom + space.md;
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(null);
  const [toast, setToast] = useState(null);
  const [errorBanner, setErrorBanner] = useState(null);
  const timers = useRef([]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        // Offers are configured per service location; resolve the district's first.
        const locations = unwrap(await userService.getServiceLocations());
        const list = Array.isArray(locations) ? locations : (locations?.results || locations?.data || []);
        const id = list.find((i) => i?.active !== false)?._id || list[0]?._id || '';
        if (!id) {
          if (active) setPromos([]);
          return;
        }
        const payload = unwrap(await userService.getAvailablePromos({ service_location_id: id, transport_type: 'taxi', limit: 20 }));
        const rows = Array.isArray(payload) ? payload : (payload?.results || []);
        if (active) setPromos(rows.map(toPromoCard).filter((p) => p.code));
      } catch (e) {
        if (active) {
          setPromos([]);
          setErrorBanner(e?.message || 'Could not load offers right now');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    const t = timers.current;
    return () => {
      active = false;
      t.forEach(clearTimeout);
    };
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    timers.current.push(setTimeout(() => setToast(null), 2500));
  };

  const copyCode = async (code) => {
    try {
      await Clipboard.setStringAsync(code);
      setCopied(code);
      timers.current.push(setTimeout(() => setCopied((c) => (c === code ? null : c)), 2500));
      showToast(`"${code}" copied — enter it when you book`, 'success');
    } catch {
      showToast('Could not copy the code', 'error');
    }
  };

  return (
    <View style={st.flex}>
      <PageTitle title="Promo codes" subtitle="Offers & coupons" right={<View style={st.tagIcon}><Tag size={20} color={color.goldText} /></View>} />

      <ScrollView contentContainerStyle={[st.content, { paddingBottom: bottomPad }]} showsVerticalScrollIndicator={false}>
        {errorBanner ? (
          <View style={st.banner} accessibilityRole="alert">
            <AlertCircle size={18} color={color.danger} />
            <Text style={[type.small, st.grow, { color: color.danger }]}>{errorBanner}</Text>
            <IconButton icon={X} label="Dismiss" iconSize={18} iconColor={color.danger} onPress={() => setErrorBanner(null)} style={st.dismiss} />
          </View>
        ) : null}

        <View>
          <SectionHeader title="Available offers" style={{ marginBottom: space.xs }} />
          <Text style={[type.small, { color: color.textMuted }]}>Copy a code and enter it in the coupon row when you pick your vehicle.</Text>
        </View>

        {loading ? [0, 1, 2].map((i) => <SkeletonCard key={i} />) : null}

        {!loading && promos.length === 0 ? <EmptyState icon={Ticket} title="No promo codes available right now" message="New offers for your district will show up here." /> : null}

        {!loading ? promos.map((p) => {
          const isCopied = copied === p.code;
          return (
            <Card key={p.id} style={[st.card, isCopied && st.cardCopied]}>
              <View style={st.cardTop}>
                <View style={st.grow}>
                  <View style={st.codeChip}>
                    <Text style={st.code} numberOfLines={1} selectable>{p.code}</Text>
                    {isCopied ? <CheckCircle2 size={16} color={color.success} accessibilityLabel="Copied" /> : null}
                  </View>
                  <Text style={[type.small, { color: color.textMuted, marginTop: space.sm }]}>
                    {p.service}{p.minFare > 0 ? ` · Min fare ₹${p.minFare}` : ''}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[type.price, { color: color.goldText }]}>{p.discountPercentage}% off</Text>
                  {p.maxDiscount > 0 ? <Text style={[type.caption, { color: color.textMuted }]}>up to ₹{p.maxDiscount}</Text> : null}
                </View>
              </View>
              {p.expiry ? (
                <View style={st.expiry}>
                  <Clock size={14} color={color.textMuted} />
                  <Text style={[type.caption, { color: color.textMuted }]}>Expires {p.expiry}</Text>
                </View>
              ) : null}
              <Button
                title={isCopied ? 'Copied' : 'Copy code'}
                icon={isCopied ? CheckCircle2 : Copy}
                variant="secondary"
                accessibilityLabel={isCopied ? `${p.code} copied` : `Copy code ${p.code}`}
                onPress={() => copyCode(p.code)}
              />
            </Card>
          );
        }) : null}
      </ScrollView>

      {toast ? (
        <View pointerEvents="none" style={[st.toastWrap, { bottom: toastBottom }]}>
          <View style={[st.toast, { backgroundColor: toast.type === 'success' ? color.success : color.danger }]} accessibilityLiveRegion="polite">
            {toast.type === 'success' ? <CheckCircle2 size={16} color={color.textInverse} /> : <AlertCircle size={16} color={color.textInverse} />}
            <Text style={[type.label, { color: color.textInverse, flexShrink: 1 }]}>{toast.msg}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  flex: { flex: 1, backgroundColor: color.bg },
  grow: { flex: 1, minWidth: 0 },
  content: { paddingHorizontal: space.lg, paddingTop: space.xs, gap: space.md },
  tagIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: color.goldSoft, alignItems: 'center', justifyContent: 'center' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: color.dangerSoft, borderRadius: radii.md, paddingLeft: space.md },
  dismiss: { borderRadius: radii.md },
  card: { gap: space.md },
  cardCopied: { borderColor: color.success, backgroundColor: color.successSoft },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  codeChip: { alignSelf: 'flex-start', maxWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, paddingVertical: space.xs + 2, borderRadius: radii.sm, borderWidth: 1.5, borderStyle: 'dashed', borderColor: color.gold, backgroundColor: color.goldSoft },
  code: { ...type.subheading, color: color.text, flexShrink: 1 },
  expiry: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2 },
  toastWrap: { position: 'absolute', left: space.lg, right: space.lg, alignItems: 'center' },
  toast: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.md, borderRadius: radii.md, ...elevation.float },
});
