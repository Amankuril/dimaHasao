import React, {useState} from 'react';
import {Image, Pressable, Text, TextInput, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import AppIcon from '../../utils/iconMap';
import {useBooking} from '../../context/BookingContext';
import {PLACES_DATA} from '../../data/tourismData';

export default function SearchBar() {
  const {searchQuery, setSearchQuery, showToast} = useBooking();
  const [isFocused, setIsFocused] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const navigation = useNavigation();

  const handleVoiceSearch = () => {
    setIsListening(true);
    showToast('🎤 Listening... Try saying "Jatinga" or "Haflong"');
    setTimeout(() => {
      setIsListening(false);
      setSearchQuery('Jatinga');
      showToast('Voice matched: "Jatinga" 🌿');
      navigation.navigate('Explore');
    }, 2000);
  };

  const suggestions = searchQuery.trim()
    ? PLACES_DATA.filter(
        p =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.subtitle.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : [];

  return (
    <View className="px-3 -mt-4 z-10">
      <View className="bg-white rounded-full shadow py-1 px-3 flex-row items-center border-2 border-[#084524]">
        <AppIcon name="fa-solid fa-magnifying-glass" size={12} color="#9ca3af" style={{marginRight: 8}} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          onSubmitEditing={() => navigation.navigate('Explore')}
          placeholder="Search places, hotels, cabs..."
          placeholderTextColor="#9ca3af"
          className="flex-1 text-xs text-gray-800 py-1"
        />
        {!!searchQuery && (
          <Pressable onPress={() => setSearchQuery('')} className="mr-1">
            <AppIcon name="fa-solid fa-xmark" size={12} color="#9ca3af" />
          </Pressable>
        )}
        <Pressable
          onPress={handleVoiceSearch}
          className="w-6 h-6 rounded-full items-center justify-center"
          style={{backgroundColor: isListening ? '#ef4444' : 'transparent'}}>
          <AppIcon name="fa-solid fa-microphone" size={12} color={isListening ? '#fff' : '#084524'} />
        </Pressable>
      </View>

      {isFocused && suggestions.length > 0 && (
        <View className="absolute left-5 right-5 top-10 bg-white rounded-2xl shadow-lg border border-emerald-100 overflow-hidden z-50">
          {suggestions.map(place => (
            <Pressable
              key={place.id}
              onPress={() => {
                setSearchQuery('');
                navigation.navigate('PlaceDetail', {id: place.id});
              }}
              className="p-2.5 flex-row items-center gap-2.5 border-b border-gray-100">
              <Image source={{uri: place.mainImage}} className="w-8 h-8 rounded-lg" />
              <View className="flex-1">
                <Text className="text-xs font-bold text-gray-900" numberOfLines={1}>
                  {place.name}
                </Text>
                <Text className="text-[10px] text-emerald-700" numberOfLines={1}>
                  {place.location}
                </Text>
              </View>
              <Text className="text-[9px] text-gray-400">{place.distanceFromStation}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
