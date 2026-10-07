import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChevronDown, MapPin, Wallet } from 'lucide-react-native';
import { Press } from '../../../components/ui';
import { useNavigate } from '../../../lib/webRouter';
import { events } from '../../../lib/events';
import { localStore } from '../../../lib/storage';
import { IconButton } from '../../../components/ds';
import { color, radii, space, type } from '../../../theme';
import {
  FOOD_LOCATION_UPDATED_EVENT,
  TAXI_LOCATION_STORAGE_KEY,
  TAXI_LOCATION_UPDATED_EVENT,
  getFoodStyleLocationParts,
  readSharedFoodLocation,
} from '../../../shared/utils/sharedUserLocation';

/* Port of Frontend/src/shared/components/SuperAppHomeHeader.jsx as the taxi Home renders it (activeVertical="taxi", vertical tabs hidden).
 * Heritage look: a white location strip under the module header (it used to be a navy bar laid over the map). */

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
    <View style={styles.wrap}>
      <Press onPress={onLocationClick} scale={0.99} accessibilityLabel={`Your location: ${displayTitle}. Change`} style={styles.locBtn}>
        <View style={styles.pinTile}>
          <MapPin size={18} color={color.primary} />
        </View>
        <View style={styles.locText}>
          <View style={styles.titleRow}>
            <Text numberOfLines={1} style={styles.title}>{displayTitle}</Text>
            <ChevronDown size={16} color={color.textSecondary} />
          </View>
          {displaySubtitle ? <Text numberOfLines={1} style={styles.subtitle}>{displaySubtitle}</Text> : null}
        </View>
      </Press>
      <IconButton icon={Wallet} label="Wallet" variant="gold" onPress={() => navigate('/taxi/user/wallet')} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.sm,
    backgroundColor: color.surface, borderBottomWidth: 1, borderBottomColor: color.border,
  },
  locBtn: { flexDirection: 'row', alignItems: 'center', gap: space.md, flex: 1, minWidth: 0, minHeight: 48 },
  pinTile: { width: 36, height: 36, borderRadius: radii.md, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  locText: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minWidth: 0 },
  title: { ...type.bodyStrong, color: color.text, flexShrink: 1 },
  subtitle: { ...type.caption, color: color.textMuted },
});
