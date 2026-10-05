import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChevronDown, MapPin } from 'lucide-react-native';
import { Press } from '../../../components/ui';
import { useNavigate } from '../../../lib/webRouter';
import { events } from '../../../lib/events';
import { localStore } from '../../../lib/storage';
import { poppins, tw } from '../../../theme';
import {
  FOOD_LOCATION_UPDATED_EVENT,
  TAXI_LOCATION_STORAGE_KEY,
  TAXI_LOCATION_UPDATED_EVENT,
  getFoodStyleLocationParts,
  readSharedFoodLocation,
} from '../../../shared/utils/sharedUserLocation';

/* Port of Frontend/src/shared/components/SuperAppHomeHeader.jsx as the taxi Home renders it (activeVertical="taxi", vertical tabs hidden). */
const TAXI_THEME = { accent: '#5B9BD5', theme: '#0B172A' };

function readHelloParthLocation() {
  const food = readSharedFoodLocation();
  if (food) {
    const parts = getFoodStyleLocationParts(food);
    return {
      ...food,
      formattedAddress: food.formattedAddress || food.address || parts.title,
      area: parts.title,
      city: food.city || '',
      state: parts.state || food.state || '',
      pincode: parts.pincode,
      zipCode: parts.pincode,
      address: food.address || food.formattedAddress || parts.title,
    };
  }
  try {
    const saved = JSON.parse(localStore.getItem(TAXI_LOCATION_STORAGE_KEY) || '{}');
    const address = String(saved?.address || saved?.area || '').trim();
    if (!address) return null;
    const chunks = address.split(',').map((p) => p.trim()).filter(Boolean);
    return {
      formattedAddress: address,
      area: saved.area || chunks[0] || address,
      city: chunks.length > 2 ? chunks[chunks.length - 2] : chunks[1] || '',
      state: chunks.length > 1 ? chunks[chunks.length - 1] : '',
      address,
    };
  } catch {
    return null;
  }
}

export default function SuperAppHomeHeader() {
  const navigate = useNavigate();
  const [location, setLocation] = useState(() => readHelloParthLocation());

  useEffect(() => {
    const sync = () => setLocation(readHelloParthLocation());
    sync();
    events.on(TAXI_LOCATION_UPDATED_EVENT, sync);
    events.on(FOOD_LOCATION_UPDATED_EVENT, sync);
    return () => {
      events.off(TAXI_LOCATION_UPDATED_EVENT, sync);
      events.off(FOOD_LOCATION_UPDATED_EVENT, sync);
    };
  }, []);

  const displayTitle = useMemo(() => {
    if (location?.area) return location.area;
    return location?.city || location?.formattedAddress?.split(',')[0] || 'Select Location';
  }, [location]);

  const displaySubtitle = useMemo(() => {
    const parts = [location?.state, location?.pincode || location?.zipCode || location?.postalCode].filter(Boolean);
    if (parts.length) return parts.join(', ');
    const addr = String(location?.address || location?.formattedAddress || '');
    if (addr.length > 10) return addr.split(',').slice(1, 3).join(',').trim();
    return '';
  }, [location]);

  const onLocationClick = useCallback(() => navigate('/taxi/user/ride/select-location'), [navigate]);

  return (
    <View style={[styles.wrap, { backgroundColor: TAXI_THEME.theme }]}>
      <View style={styles.row}>
        <Press onPress={onLocationClick} scale={1} style={styles.locBtn}>
          <MapPin size={20} strokeWidth={1.5} color={TAXI_THEME.accent} fill={TAXI_THEME.accent} />
          <View style={styles.locText}>
            <View style={styles.titleRow}>
              <Text numberOfLines={1} style={styles.title}>{displayTitle}</Text>
              <ChevronDown size={14} color="#fff" style={{ opacity: 0.9 }} />
            </View>
            {displaySubtitle ? <Text numberOfLines={1} style={styles.subtitle}>{displaySubtitle}</Text> : null}
          </View>
        </Press>
        <Press onPress={() => navigate('/taxi/user/wallet')} scale={1} accessibilityLabel="Wallet" style={styles.wallet}>
          <View style={styles.rupeeBox}>
            <Text style={styles.rupee}>₹</Text>
          </View>
        </Press>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  locBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 },
  locText: { flexShrink: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 2, minWidth: 0 },
  title: { flexShrink: 1, fontSize: 14, color: '#fff', textShadowColor: 'rgba(0,0,0,0.1)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1, ...poppins(700) },
  subtitle: { fontSize: 11, color: '#fff', opacity: 0.8, maxWidth: 210, ...poppins(500) },
  wallet: { height: 40, width: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' },
  rupeeBox: { width: 20, height: 20, borderWidth: 2, borderColor: tw.gray800, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  rupee: { fontSize: 10, color: tw.gray800, fontWeight: '700', fontFamily: 'serif', includeFontPadding: false },
});
