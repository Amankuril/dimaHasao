import { StyleSheet, Text, View } from 'react-native';
import { outfit, shadow, tw } from '../../theme';
import { DT } from '../ui/dt';
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
            <Text style={[{ fontSize: 13, color: DT.brand }, outfit(700)]}>Restoring active trip...</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  hydrate: { zIndex: 60, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(226,232,240,0.9)' },
  hydrateBox: { borderRadius: DT.radius.pill, backgroundColor: DT.card, borderWidth: 1, borderColor: DT.borderSoft, paddingHorizontal: 20, paddingVertical: 12, ...shadow('md') },
});
