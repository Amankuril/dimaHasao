import { ScrollView, StyleSheet, View } from 'react-native';
import HomeHeader from '../../../../../components/delivery/home/HomeHeader';
import PocketV2 from '../../../../../components/delivery/pocket/PocketV2';
import { color } from '../../../../../theme';

// The shared top bar sits in normal flow on this tab, so content starts right below it.
export default function PocketTab() {
  return (
    <View style={styles.page}>
      <HomeHeader />
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <PocketV2 />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: color.bg } });
