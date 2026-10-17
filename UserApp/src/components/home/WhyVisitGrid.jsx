import React, {useState} from 'react';
import {Image, Modal, Pressable, Text, View} from 'react-native';
import {WHY_VISIT_DATA} from '../../data/tourismData';

export default function WhyVisitGrid() {
  const [selected, setSelected] = useState(null);

  return (
    <>
      <View className="bg-[#fcf8ed] rounded-2xl p-3 mx-3 mb-6">
        <Text className="text-center font-bold text-gray-900 mb-2.5 text-xs">Why Visit Dima Hasao?</Text>
        <View className="flex-row justify-between">
          {WHY_VISIT_DATA.map(item => (
            <Pressable key={item.id} onPress={() => setSelected(item)} className="items-center flex-1 px-0.5">
              <Image source={{uri: item.image}} className="w-9 h-9 mb-1" resizeMode="contain" />
              <Text className="text-[8.5px] font-bold text-center text-gray-800">{item.title}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <Pressable className="flex-1 bg-black/60 items-center justify-center p-4" onPress={() => setSelected(null)}>
          <Pressable className="bg-white rounded-3xl p-5 w-full max-w-sm" onPress={() => {}}>
            <View className="flex-row items-center gap-3 mb-3">
              <Image source={{uri: selected?.image}} className="w-12 h-12" resizeMode="contain" />
              <Text className="font-bold text-sm text-gray-900 flex-1">{selected?.title}</Text>
            </View>
            <Text className="text-xs text-gray-600 mb-4">{selected?.description}</Text>
            <Pressable onPress={() => setSelected(null)} className="w-full py-2.5 bg-[#0a3a22] rounded-xl items-center">
              <Text className="text-white font-bold text-xs">Explore More</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
