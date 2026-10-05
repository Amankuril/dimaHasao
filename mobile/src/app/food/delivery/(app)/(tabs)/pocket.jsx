import { ScrollView, StyleSheet, View } from 'react-native';
import HomeHeader from '../../../../../components/delivery/home/HomeHeader';
import PocketV2 from '../../../../../components/delivery/pocket/PocketV2';

// Web: DeliveryHomeV2 tab="pocket" -> the dark header plus PocketV2 under `pt-[120px]`.
export default function PocketTab() {
  return (
    <View style={styles.page}>
      <HomeHeader />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 120 }} showsVerticalScrollIndicator={false}>
        <PocketV2 />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: '#fff' } });
