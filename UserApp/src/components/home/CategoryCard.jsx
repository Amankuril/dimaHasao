import React from 'react';
import {Image, Pressable, Text, View} from 'react-native';
import AppIcon from '../../utils/iconMap';

/**
 * Ported from Frontend's CategoryCard.jsx. The web version masks the hero
 * image into an arched shape with a CSS mask-image gradient — RN has no
 * cheap equivalent, so this uses a plain rounded image with a translucent
 * color wash standing in for the "feathering" effect.
 */
export default function CategoryCard({title, subtitle, icon, image, buttonText, tint, onPress}) {
  return (
    <Pressable onPress={onPress} className="w-[48%] h-[200px] rounded-[22px] overflow-hidden mb-2.5" style={{backgroundColor: tint}}>
      <View className="absolute inset-0">
        <Image source={{uri: image}} className="w-full h-full opacity-80" resizeMode="cover" />
        <View className="absolute inset-0" style={{backgroundColor: tint, opacity: 0.45}} />
      </View>

      <View className="items-center pt-3 px-1.5">
        <View className="w-9 h-9 rounded-full border-2 border-white/90 items-center justify-center mb-1.5 bg-white/20">
          <AppIcon name={icon} size={16} color="#fff" />
        </View>
        <Text className="text-white font-extrabold text-[11px] uppercase text-center">{title}</Text>
        <Text className="text-white/90 text-[9px] text-center mt-0.5">{subtitle}</Text>
      </View>

      <View className="absolute bottom-3 left-2.5 right-2.5">
        <View className="bg-black/30 rounded-full py-1.5 flex-row items-center justify-center gap-1 border border-white/25">
          <Text className="text-white text-[10px] font-bold">{buttonText}</Text>
          <AppIcon name="fa-solid fa-arrow-right" size={10} color="#fff" />
        </View>
      </View>
    </Pressable>
  );
}
