import { StyleSheet, View } from 'react-native';
import Skeleton from '../../../components/Skeleton';
import { tw } from '../../../theme';

/** Stand-in for the web's RestaurantGridSkeleton: stacked card placeholders. */
export function RestaurantGridSkeleton({ count = 4, compact = false }) {
  return (
    <View style={{ gap: 16 }} accessibilityLabel="Loading restaurants">
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.card}>
          <Skeleton style={{ height: compact ? 128 : 160, borderRadius: 0 }} />
          <View style={{ padding: 16, gap: 12 }}>
            <Skeleton style={{ height: 20, width: '80%', borderRadius: 10 }} />
            <Skeleton style={{ height: 16, width: '66%', borderRadius: 8 }} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Skeleton style={{ height: 16, width: 64, borderRadius: 8 }} />
              <Skeleton style={{ height: 16, width: 96, borderRadius: 8 }} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: tw.gray200, overflow: 'hidden' },
});
