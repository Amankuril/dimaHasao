/**
 * Ported from Frontend/src/modules/DimaHasao/pages/HomeScreen.jsx.
 */
import React, {useEffect, useRef, useState} from 'react';
import {Dimensions, Image, Pressable, ScrollView, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import AppIcon from '../utils/iconMap';
import {useBooking} from '../context/BookingContext';
import SearchBar from '../components/common/SearchBar';
import CategoryCard from '../components/home/CategoryCard';
import QuickLinksGrid from '../components/home/QuickLinksGrid';
import PromoBanner from '../components/home/PromoBanner';
import WhyVisitGrid from '../components/home/WhyVisitGrid';

const BRAND_LOGO = require('../assets/images/brand-logo.png');
const HERO_SLIDES = [
  {id: 1, image: require('../assets/images/carousel-1.png')},
  {id: 2, image: require('../assets/images/carousel-2.png')},
];

const {width: SCREEN_WIDTH} = Dimensions.get('window');

export default function HomeScreen() {
  const navigation = useNavigation();
  const {setIsNotificationsOpen} = useBooking();
  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setHeroIndex(prev => (prev + 1) % HERO_SLIDES.length), 4500);
    return () => clearInterval(timer);
  }, []);

  return (
    <ScrollView className="flex-1 bg-[#FDFBF7]" showsVerticalScrollIndicator={false}>
      {/* Hero header */}
      <View style={{height: 300}} className="relative overflow-hidden">
        <Image source={HERO_SLIDES[heroIndex].image} style={{width: SCREEN_WIDTH, height: 300}} resizeMode="cover" />
        <View className="absolute inset-0 bg-black/30" />

        <View className="absolute bottom-4 left-0 right-0 flex-row justify-center gap-1.5">
          {HERO_SLIDES.map((slide, index) => (
            <Pressable
              key={slide.id}
              onPress={() => setHeroIndex(index)}
              className="h-1.5 rounded-full"
              style={{width: index === heroIndex ? 24 : 6, backgroundColor: index === heroIndex ? '#fbbf24' : 'rgba(255,255,255,0.6)'}}
            />
          ))}
        </View>

        <View className="absolute top-3.5 left-3.5 right-3.5 flex-row justify-between">
          <Pressable
            onPress={() => navigation.navigate('More')}
            className="w-9 h-9 bg-[#06381e]/90 rounded-full items-center justify-center border border-white/30">
            <AppIcon name="fa-solid fa-bars" size={14} color="#fff" />
          </Pressable>
          <Pressable
            onPress={() => setIsNotificationsOpen(true)}
            className="w-9 h-9 bg-[#06381e]/90 rounded-full items-center justify-center border border-white/30">
            <AppIcon name="fa-solid fa-bell" size={14} color="#fff" />
          </Pressable>
        </View>

        <View className="absolute top-4 left-3.5 right-3.5 flex-row items-center gap-3">
          <Pressable onPress={() => navigation.navigate('Explore')}>
            <Image source={BRAND_LOGO} style={{width: 90, height: 90}} resizeMode="contain" />
          </Pressable>
          <View className="flex-1">
            <Text className="font-black text-2xl text-white">JUTHAI!</Text>
            <Text className="text-[9px] font-black tracking-widest text-amber-200 uppercase">WELCOME TO</Text>
            <Text className="font-black text-xl text-white">DIMA HASAO</Text>
            <Text className="text-amber-100 italic text-[11px]">Explore • Experience • Discover</Text>
          </View>
        </View>
      </View>

      <SearchBar />

      <View className="pt-3 gap-4">
        {/* Category grid */}
        <View className="flex-row flex-wrap justify-between px-3">
          <CategoryCard
            title="Tourist Places"
            subtitle={'Scenic Spots &\nHidden Trails'}
            icon="fa-solid fa-location-dot"
            image="https://lh3.googleusercontent.com/aida-public/AB6AXuDNCBOtk-v5CpAuzZ1kd7mndMkJZKKwMy00a2zicQ0HpEEfpw427eAibYCSi2nD2wHFUkrbD1pzwIzejGOFn5WqC6zu_oE1z2PO5Z2B1LMuzEvrGDcapXZ2xU8jST_VXGR9TxKd25HsrNfffLqEY_Xm1289lDT9d4F7I68sPPhKOmC33cLzcrcIo7RfCXTsf-KCLrE92u-ebldONSuUSfat64_5N4AFn8Z0bfjeYXSmC8Y2I5u8t3g1"
            buttonText="Explore Places"
            tint="#059669"
            onPress={() => navigation.navigate('Explore')}
          />
          <CategoryCard
            title="Taxi / Auto"
            subtitle={'Book Your Ride,\nTravel with Ease'}
            icon="fa-solid fa-car"
            image="https://lh3.googleusercontent.com/aida-public/AB6AXuDCJDblprWgYBvh1_FLMSBqIvOXSdwgS_fPcH_MyWvag50_LwhLZums5qzaDWSIT0HbG0SJMToG7JpPvejlX3Qy5bLkCG38QZIqu5mBcSGP2wl3HGzM_X0PCK0xdHmNkET-dGu7TRc-monu00rabiXzQRo3EhbHNOkDMNkXrPK1awEDEd4ZGfwJUS4cVNDcKYVkqKl3pjgKMkPrLtYQA-IL07hjQc-c-KZlD6NT-lo8WH27nCiKI8JN"
            buttonText="Book Ride"
            tint="#ea580c"
            onPress={() => navigation.navigate('Taxi')}
          />
          <CategoryCard
            title="Hotels & Stays"
            subtitle={'Resorts, Cottages\n& Homestays'}
            icon="fa-solid fa-hotel"
            image="https://lh3.googleusercontent.com/aida-public/AB6AXuDu5Pbf3ToUuNDG3Ykr_oqb6a2-hh7vSE60pCjbagFjqrigh7ETKBYtUYP7bOC8sCPqF0oHQXdi1TbZ6LCZblOychxaZYt5SDhg9YBw8bMVPI1wmeURSYs_MNOhhGyoCRPAC9-VGTQdSfd8KZYlU0HzlecyFoFwn74vcZ8e1vWAXxYQSCHsoElObyZAiJJcMFxfV2a_b6cT4dn9fzfOO2k4ySEorPC6hLD-PnNLxB8w9sDFxhc1j9FU"
            buttonText="Book Stays"
            tint="#6d28d9"
            onPress={() => navigation.navigate('HotelList')}
          />
          <CategoryCard
            title="Food & Dining"
            subtitle={'Authentic Dimasa\n& Local Eateries'}
            icon="fa-solid fa-utensils"
            image="https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80"
            buttonText="Order Food"
            tint="#be123c"
            onPress={() => navigation.navigate('FoodHome')}
          />
        </View>

        <QuickLinksGrid />

        {/* Falcon Festival banner */}
        <Pressable
          onPress={() => navigation.navigate('FestivalList')}
          className="mx-3 rounded-2xl overflow-hidden border border-[#caa83e]/50 bg-black">
          <Image
            source={{uri: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1000&q=80'}}
            className="w-full h-36 opacity-80"
            resizeMode="cover"
          />
          <View className="absolute inset-0 bg-black/60" />
          <View className="absolute inset-0 p-3.5 justify-between">
            <View className="flex-row items-center gap-1.5">
              <Text className="bg-red-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-md uppercase">
                Official Gala
              </Text>
              <Text className="text-[10px] text-amber-300 font-bold">Nov 14 - 17, 2026</Text>
            </View>
            <View>
              <Text className="font-bold text-sm text-white">Falcon Festival Umrangso 2026</Text>
              <Text className="text-[10.5px] text-gray-200">Live concerts, lake kayaking & Amur Falcon trails.</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-[11px] font-bold text-amber-400">Passes from ₹250</Text>
              <View className="bg-amber-400 px-3 py-1 rounded-lg">
                <Text className="text-emerald-950 font-black text-[10px]">Book Passes →</Text>
              </View>
            </View>
          </View>
        </Pressable>

        {/* Tour packages banner */}
        <Pressable
          onPress={() => navigation.navigate('PackageList')}
          className="mx-3 rounded-2xl p-3.5 flex-row items-center justify-between"
          style={{backgroundColor: '#06381e'}}>
          <View className="flex-1">
            <Text className="text-[10px] font-bold text-amber-300 uppercase">Curated Expeditions</Text>
            <Text className="font-bold text-sm text-white mt-0.5">Guided Treks & Heritage Tours</Text>
            <Text className="text-[11px] text-emerald-100 mt-0.5">All-inclusive packages from ₹3,600/person</Text>
          </View>
          <View className="w-10 h-10 rounded-full bg-amber-400 items-center justify-center">
            <AppIcon name="fa-solid fa-arrow-right" size={14} color="#06381e" />
          </View>
        </Pressable>

        <PromoBanner />
        <WhyVisitGrid />
      </View>
    </ScrollView>
  );
}
