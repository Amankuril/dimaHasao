import React, {useState} from 'react';
import {Linking, Modal, Pressable, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import AppIcon from '../../utils/iconMap';
import {useBooking} from '../../context/BookingContext';

const LINKS = [
  {id: 'guide', label: 'Local Guide', icon: 'fa-solid fa-user-tie', bg: '#10B981'},
  {id: 'events', label: 'Events &\nFestivals', icon: 'fa-solid fa-calendar-days', bg: '#F97316'},
  {id: 'packages', label: 'Tour\nPackages', icon: 'fa-solid fa-suitcase-rolling', bg: '#3B82F6'},
  {id: 'food', label: 'Food &\nCuisine', icon: 'fa-solid fa-bowl-food', bg: '#F43F5E'},
  {id: 'emergency', label: 'Emergency\nHelp', icon: 'fa-solid fa-phone-volume', bg: '#EF4444'},
];

const MODAL_DETAILS = {
  guide: {
    title: 'Local Certified Guides',
    desc: 'Connect with registered Dimasa eco-guides who know the secret trails, waterfalls, and folklore.',
    items: [
      'Government Certified Guides',
      'Trekking & Forest Expeditions',
      'Dimasa & English speaking',
      'Nominal daily rates from ₹800/day',
    ],
    actionText: 'Contact Tourism Desk',
    actionLink: 'tel:+919435012345',
  },
  events: {
    title: 'Events & Festivals',
    desc: 'Experience the colorful cultural heritage of Dima Hasao.',
    items: [
      'Falcon Festival (Umrangso) - Nov/Dec',
      'Busu Dima (Harvest Festival) - Jan',
      'Judima Tribal Festival - Dec',
      'Haflong Hills Music Fest - Spring',
    ],
    actionText: 'Explore Festival Calendar',
  },
  food: {
    title: 'Authentic Dimasa Cuisine',
    desc: 'Savor traditional ethnic delicacies prepared with organic local herbs.',
    items: [
      'Judima (Traditional Dimasa Rice Wine - GI Tagged)',
      'Muri (Smoked Meat in Bamboo)',
      'Mai-ju (Sticky Rice in Leaves)',
      'Khar & Dry Fish with Bamboo Shoot',
    ],
    actionText: 'View Food Spots',
  },
  emergency: {
    title: 'Emergency Help & SOS',
    desc: 'Direct emergency hotlines for visitors in Dima Hasao district.',
    items: [
      'Police Control Room: 112 / 03673-236224',
      'Haflong Civil Hospital: 03673-236222',
      'Tourist Police Helpline: +91 94350 99999',
      'Disaster Management: 1077',
    ],
    actionText: 'Call Emergency: 112',
    actionLink: 'tel:112',
    isEmergency: true,
  },
};

export default function QuickLinksGrid() {
  const [activeModal, setActiveModal] = useState(null);
  const {showToast} = useBooking();
  const navigation = useNavigation();

  const openLink = id => {
    if (id === 'events') return navigation.navigate('FestivalList');
    if (id === 'packages') return navigation.navigate('PackageList');
    if (id === 'food') return navigation.navigate('FoodHome');
    setActiveModal(id);
  };

  const detail = activeModal ? MODAL_DETAILS[activeModal] : null;

  return (
    <>
      <View className="bg-white rounded-2xl mx-2.5 py-2 px-1 flex-row justify-between">
        {LINKS.map(item => (
          <Pressable key={item.id} onPress={() => openLink(item.id)} className="flex-1 items-center px-0.5">
            <View className="w-8 h-8 rounded-full items-center justify-center" style={{backgroundColor: item.bg}}>
              <AppIcon name={item.icon} size={14} color="#fff" />
            </View>
            <Text className="text-[8px] font-semibold text-center text-gray-800 mt-1">{item.label}</Text>
          </Pressable>
        ))}
      </View>

      <Modal visible={!!activeModal} transparent animationType="fade" onRequestClose={() => setActiveModal(null)}>
        <Pressable className="flex-1 bg-black/60 items-center justify-center p-4" onPress={() => setActiveModal(null)}>
          <Pressable className="bg-white rounded-3xl p-5 w-full max-w-sm" onPress={() => {}}>
            <Text className="font-bold text-base text-gray-900 mb-1">{detail?.title}</Text>
            <Text className="text-xs text-gray-600 mb-3">{detail?.desc}</Text>

            <View className="bg-emerald-50 p-3 rounded-xl mb-4">
              {detail?.items.map((it, idx) => (
                <View key={idx} className="flex-row items-center gap-2 mb-1.5">
                  <AppIcon name="fa-solid fa-circle-check" size={12} color="#059669" />
                  <Text className="text-xs text-gray-800 flex-1">{it}</Text>
                </View>
              ))}
            </View>

            <Pressable
              onPress={() => {
                if (detail?.actionLink) {
                  Linking.openURL(detail.actionLink);
                  return;
                }
                setActiveModal(null);
                showToast(`Opening ${detail?.title}`);
              }}
              className="w-full py-2.5 rounded-xl items-center"
              style={{backgroundColor: detail?.isEmergency ? '#dc2626' : '#0a3a22'}}>
              <Text className="text-white font-bold text-xs">{detail?.actionText || 'Close'}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
