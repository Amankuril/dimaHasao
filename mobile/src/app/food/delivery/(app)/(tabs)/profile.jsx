import { ScrollView, StyleSheet, View } from 'react-native';
import HomeHeader from '../../../../../components/delivery/home/HomeHeader';
import ProfileV2 from '../../../../../components/delivery/profile/ProfileV2';

// Web: DeliveryHomeV2 tab="profile" -> the dark header plus ProfileV2 under `pt-[120px]`.
export default function ProfileTab() {
  return (
    <View style={styles.page}>
      <HomeHeader />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 120, flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <ProfileV2 />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: '#fff' } });
