import { StyleSheet, Text, View } from 'react-native';
import { tw, outfit } from '../../theme';
import { useActiveTrip } from '../hooks/useActiveTrip';
import TripMap from '../components/TripMap';
import TripPhaseSheets from '../components/TripPhaseSheets';

// Web: Taxi/modules/driver/pages/ActiveTrip.jsx (/taxi/driver/active-trip)

export default function ActiveTrip() {
  const t = useActiveTrip();
  return (
    <View style={{ flex: 1, backgroundColor: tw.slate200, overflow: 'hidden' }}>
      <TripMap t={t} />
      <TripPhaseSheets t={t} />
      {t.isHydratingTrip ? (
        <View style={[StyleSheet.absoluteFill, st.hydrate]}>
          <View style={st.hydrateBox}>
            <Text style={[{ fontSize: 12, color: tw.slate700 }, outfit(600)]}>Restoring active trip...</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  hydrate: { zIndex: 60, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(226,232,240,0.9)' },
  hydrateBox: { borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 16, paddingVertical: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
});
