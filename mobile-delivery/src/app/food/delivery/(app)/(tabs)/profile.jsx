import { ScrollView, StyleSheet, View } from 'react-native';
import HomeHeader from '../../../../../components/delivery/home/HomeHeader';
import ProfileV2 from '../../../../../components/delivery/profile/ProfileV2';
import { color } from '../../../../../theme';

// The shared top bar sits in normal flow on this tab, so content starts right below it.
export default function ProfileTab() {
  return (
    <View style={styles.page}>
      <HomeHeader />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <ProfileV2 />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: color.bg } });
