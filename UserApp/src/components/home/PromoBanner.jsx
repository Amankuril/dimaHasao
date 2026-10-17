import React from 'react';
import {Image, Pressable, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import AppIcon from '../../utils/iconMap';

const BG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAu4pmPYVoooGutS4BGHL_h3AM91HWpb0p3I7_YN0nNkKK4xpIAkqN1ItQCz_Nsd7DbcowZqup9rTFIBowf5I0Jrs-It5TrdAccxzvRgaSof8HlnftQt9lj9LGKzYmk8zjtnKHKT-LCqDhuT2NBwxGfEZNfaUZp_KgB0pmGPOfzFx8k8fbx2PpkAiM0dtzfVKXnMWQIZep3NYZwMvUPV44vu4xjr9xNtuKhBw0r9VIi49A_dvZwhxmZ';

export default function PromoBanner() {
  const navigation = useNavigation();

  return (
    <Pressable
      onPress={() => navigation.navigate('Explore')}
      className="mx-3 h-[120px] rounded-2xl overflow-hidden">
      <Image source={{uri: BG}} className="absolute inset-0 w-full h-full" resizeMode="cover" />
      <View className="absolute inset-0 bg-black/40" />

      <View className="flex-1 justify-center w-3/5 p-3.5">
        <Text className="text-white font-extrabold text-xs leading-tight mb-2">
          DISCOVER THE{'\n'}UNTOLD BEAUTY OF{'\n'}
          <Text className="text-amber-300">DIMA HASAO</Text>
        </Text>
        <View className="bg-[#084524] rounded-full py-1 px-3 flex-row items-center gap-1.5 self-start">
          <Text className="text-white text-[9px] font-bold">Plan Your Trip Now</Text>
          <AppIcon name="fa-solid fa-arrow-right" size={8} color="#fff" />
        </View>
      </View>
    </Pressable>
  );
}
