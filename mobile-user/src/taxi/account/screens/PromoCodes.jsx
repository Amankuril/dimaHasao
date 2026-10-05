import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { CheckCircle2, Copy, Tag, Ticket, X } from 'lucide-react-native';
import { Press } from '../../../components/ui';
import { tw } from '../../../theme';
import { userService } from '../../services/userService';
import { BackBtn, Eyebrow, Pulse, fo, headerShadow, sh, useHeaderTop } from '../ui';

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
  <View style={[st.card, { backgroundColor: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.8)', gap: 12 }]}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Pulse style={{ height: 16, width: 96, borderRadius: 8, backgroundColor: tw.slate200 }} />
      <Pulse style={{ height: 16, width: 64, borderRadius: 8, backgroundColor: tw.slate100 }} />
    </View>
    <Pulse style={{ height: 12, width: '75%', borderRadius: 6, backgroundColor: tw.slate100 }} />
    <Pulse style={{ height: 32, borderRadius: 10, backgroundColor: tw.slate100 }} />
  </View>
);

export default function PromoCodes() {
  const top = useHeaderTop();
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
    <LinearGradient colors={['#F8FAFC', '#F3F4F6', '#EEF2F7']} locations={[0, 0.38, 1]} style={st.flex}>
      <View style={[st.header, headerShadow, { paddingTop: top }]}>
        <BackBtn />
        <View style={st.flex}>
          <Eyebrow>Offers & coupons</Eyebrow>
          <Text style={st.title}>Promo Codes</Text>
        </View>
        <Tag size={20} color={tw.yellow500} strokeWidth={2} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 112, gap: 16 }} showsVerticalScrollIndicator={false}>
        {errorBanner ? (
          <View style={st.banner}>
            <X size={14} color={tw.red500} strokeWidth={2.5} />
            <Text style={st.bannerText}>{errorBanner}</Text>
            <Press onPress={() => setErrorBanner(null)} accessibilityLabel="Dismiss"><X size={13} color={tw.red400} /></Press>
          </View>
        ) : null}

        <View>
          <Eyebrow style={{ fontSize: 10, letterSpacing: 2.6 }}>Available Offers</Eyebrow>
          <Text style={st.h2}>Copy a code</Text>
          <Text style={st.hint}>Enter it in the coupon row when you pick your vehicle.</Text>
        </View>

        {loading ? [0, 1, 2].map((i) => <SkeletonCard key={i} />) : null}

        {!loading && promos.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 64, gap: 16 }}>
            <View style={st.emptyIcon}><Ticket size={28} color={tw.slate300} strokeWidth={1.5} /></View>
            <Text style={{ fontSize: 14, color: tw.slate500, ...fo(900) }}>No promo codes available right now</Text>
          </View>
        ) : null}

        {!loading ? promos.map((p) => {
          const isCopied = copied === p.code;
          return (
            <View key={p.id} style={[st.card, isCopied ? { backgroundColor: 'rgba(236,253,245,0.8)', borderColor: tw.emerald200, boxShadow: '0 4px 14px rgba(16,185,129,0.10)' } : [sh, { backgroundColor: 'rgba(255,255,255,0.9)', borderColor: 'rgba(255,255,255,0.8)' }]]}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                <View style={st.flex}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={st.code}>{p.code}</Text>
                    {isCopied ? <CheckCircle2 size={16} color={tw.emerald500} strokeWidth={2.5} /> : null}
                  </View>
                  <Text style={st.meta}>{p.service}{p.minFare > 0 ? ` · Min fare ₹${p.minFare}` : ''}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={st.pct}>{p.discountPercentage}%<Text style={st.off}> off</Text></Text>
                  {p.maxDiscount > 0 ? <Text style={st.small}>up to ₹{p.maxDiscount}</Text> : null}
                  {p.expiry ? <Text style={st.small}>Expires {p.expiry}</Text> : null}
                </View>
              </View>
              <Press onPress={() => copyCode(p.code)} scale={0.97} style={[st.copyBtn, { backgroundColor: isCopied ? tw.emerald100 : tw.slate900 }]}>
                {isCopied ? <CheckCircle2 size={13} color={tw.emerald700} strokeWidth={2.5} /> : <Copy size={13} color="#fff" strokeWidth={2.5} />}
                <Text style={[st.copyText, { color: isCopied ? tw.emerald700 : '#fff' }]}>{isCopied ? 'Copied' : 'Copy Code'}</Text>
              </Press>
            </View>
          );
        }) : null}
      </ScrollView>

      {toast ? (
        <View pointerEvents="none" style={st.toastWrap}>
          <View style={[st.toast, { backgroundColor: toast.type === 'success' ? tw.emerald600 : tw.red600 }]}>
            <Text style={st.toastText}>{toast.type === 'success' ? '✓ ' : '✗ '}{toast.msg}</Text>
          </View>
        </View>
      ) : null}
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  flex: { flex: 1 },
  header: { backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 20, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.8)' },
  title: { fontSize: 19, color: tw.slate900, lineHeight: 21, ...fo(900) },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: tw.red50, borderWidth: 1, borderColor: tw.red100, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
  bannerText: { flex: 1, fontSize: 12, color: tw.red600, ...fo(900) },
  h2: { marginTop: 2, fontSize: 16, color: tw.slate900, ...fo(900) },
  hint: { marginTop: 4, fontSize: 12, color: tw.slate400, ...fo(700) },
  emptyIcon: { width: 64, height: 64, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.8)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: 20, borderWidth: 1, padding: 16 },
  code: { fontSize: 16, letterSpacing: 0.8, color: tw.slate900, ...fo(900) },
  meta: { fontSize: 11, color: tw.slate400, marginTop: 2, ...fo(700) },
  pct: { fontSize: 18, color: tw.slate900, ...fo(900) },
  off: { fontSize: 11, color: tw.slate400, ...fo(700) },
  small: { fontSize: 9, color: tw.slate400, ...fo(700) },
  copyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 12 },
  copyText: { fontSize: 12, letterSpacing: 1.8, textTransform: 'uppercase', ...fo(900) },
  toastWrap: { position: 'absolute', bottom: 96, left: 0, right: 0, alignItems: 'center' },
  toast: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' },
  toastText: { color: '#fff', fontSize: 12, ...fo(900) },
});
