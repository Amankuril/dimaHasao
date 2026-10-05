import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Image from '../Img';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Fa from '../Fa';
import { Press } from '../ui';
import { Dialog } from '../kit';
import { StripeBorder } from './Header';
import { useBooking } from '../../context/BookingContext';
import { PLACES_DATA, WHY_VISIT_DATA } from '../../data/dh/tourismData';
import { openExternal } from '../../lib/links';
import { montserrat, poppins, shadow, tw } from '../../theme';

/** components/common/SearchBar.jsx — overlaps the hero's bottom edge. */
export function SearchBar() {
  const { searchQuery, setSearchQuery, showToast } = useBooking();
  const [isListening, setIsListening] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // The web's mic button is a scripted demo (no speech API); same here.
  const handleVoiceSearch = () => {
    setIsListening(true);
    showToast('🎤 Listening... Try saying "Jatinga" or "Haflong"');
    setTimeout(() => {
      setIsListening(false);
      setSearchQuery('Jatinga');
      showToast('Voice matched: "Jatinga" 🌿');
      router.navigate('/app/places');
    }, 2000);
  };

  const q = searchQuery.trim().toLowerCase();
  const suggestions = q
    ? PLACES_DATA.filter((p) => p.name.toLowerCase().includes(q) || p.location.toLowerCase().includes(q) || p.subtitle.toLowerCase().includes(q))
    : [];

  return (
    <View style={styles.searchWrap}>
      <StripeBorder height={5} style={styles.searchStripe} />
      <View style={styles.searchBox}>
        <Fa name="fa-solid fa-magnifying-glass" size={12} color={tw.gray400} style={{ marginRight: 10 }} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          onSubmitEditing={() => router.navigate('/app/places')}
          returnKeyType="search"
          placeholder="Search places, hotels, cabs..."
          placeholderTextColor={tw.gray400}
          style={styles.searchInput}
          accessibilityLabel="Search"
        />
        {searchQuery ? (
          <Press onPress={() => setSearchQuery('')} style={{ padding: 4, marginRight: 4 }} accessibilityLabel="Clear search" hitSlop={8}>
            <Fa name="fa-solid fa-xmark" size={10} color={tw.gray400} />
          </Press>
        ) : null}
        <Press onPress={handleVoiceSearch} scale={0.9} accessibilityLabel="Voice Search" style={[styles.mic, isListening && { backgroundColor: tw.red500 }]}>
          <Fa name="fa-solid fa-microphone" size={12} color={isListening ? '#fff' : '#084524'} />
        </Press>
      </View>

      {isFocused && suggestions.length > 0 ? (
        <View style={styles.suggestions}>
          {suggestions.map((place, i) => (
            <Press
              key={place.id}
              scale={1}
              onPress={() => {
                setSearchQuery('');
                router.push(`/app/places/${place.id}`);
              }}
              style={[styles.suggestion, i > 0 && { borderTopWidth: 1, borderTopColor: tw.gray100 }]}
            >
              <Image source={{ uri: place.mainImage }} style={styles.suggestionImg} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.suggestionName} numberOfLines={1}>{place.name}</Text>
                <Text style={styles.suggestionLoc} numberOfLines={1}>{place.location}</Text>
              </View>
              <Text style={styles.suggestionDist}>{place.distanceFromStation}</Text>
            </Press>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** components/home/CategoryCard.jsx */
export function CategoryCard({ title, subtitle, icon, image, buttonText, buttonBg = '#044E29', gradient = ['#10B981', '#059669', '#044E29'], overlay = '#059669', onPress }) {
  return (
    <Press onPress={onPress} scale={0.96} style={styles.cat} accessibilityLabel={`${title}. ${buttonText}`}>
      <LinearGradient colors={gradient} style={StyleSheet.absoluteFill} />
      <View style={styles.catImageWrap}>
        <Image source={{ uri: image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        {/* The web fades the photo in with a mask; a gradient of the card colour does the same. */}
        <LinearGradient colors={[overlay, `${overlay}66`, `${overlay}00`]} style={styles.catFadeTop} pointerEvents="none" />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.4)']} style={styles.catFadeBottom} pointerEvents="none" />
      </View>
      <View style={styles.catTop}>
        <View style={styles.catIcon}>
          <Fa name={icon} size={14} color="#fff" />
        </View>
        <Text style={styles.catTitle}>{title}</Text>
        <Text style={styles.catSub}>{subtitle}</Text>
      </View>
      <View style={{ paddingHorizontal: 10, paddingBottom: 12 }}>
        <View style={[styles.catBtn, { backgroundColor: buttonBg }]}>
          <Text style={styles.catBtnText}>{buttonText}</Text>
          <Fa name="fa-solid fa-arrow-right" size={7.5} color="#fff" />
        </View>
      </View>
    </Press>
  );
}

const LINKS = [
  { id: 'guide', label: 'Local Guide', icon: 'fa-solid fa-user-tie', bg: '#10B981' },
  { id: 'events', label: 'Events &\nFestivals', icon: 'fa-solid fa-calendar-days', bg: '#F97316' },
  { id: 'packages', label: 'Tour\nPackages', icon: 'fa-solid fa-suitcase-rolling', bg: '#3B82F6' },
  { id: 'food', label: 'Food &\nCuisine', icon: 'fa-solid fa-bowl-food', bg: '#F43F5E' },
  { id: 'emergency', label: 'Emergency\nHelp', icon: 'fa-solid fa-phone-volume', bg: '#EF4444' },
];

const MODAL_DETAILS = {
  guide: {
    title: 'Local Certified Guides',
    desc: 'Connect with registered Dimasa eco-guides who know the secret trails, waterfalls, and folklore.',
    items: ['Government Certified Guides', 'Trekking & Forest Expeditions', 'Dimasa & English speaking', 'Nominal daily rates from ₹800/day'],
    actionText: 'Contact Tourism Desk',
    actionLink: 'tel:+919435012345',
  },
  emergency: {
    title: 'Emergency Help & SOS',
    desc: 'Direct emergency hotlines for visitors in Dima Hasao district.',
    items: ['Police Control Room: 112 / 03673-236224', 'Haflong Civil Hospital: 03673-236222', 'Tourist Police Helpline: +91 94350 99999', 'Disaster Management: 1077'],
    actionText: 'Call Emergency: 112',
    actionLink: 'tel:112',
    isEmergency: true,
  },
};

/** components/home/QuickLinksGrid.jsx */
export function QuickLinksGrid() {
  const [activeModal, setActiveModal] = useState(null);
  const detail = activeModal ? MODAL_DETAILS[activeModal] : null;

  const onLink = (id) => {
    if (id === 'events') router.navigate('/app/festivals');
    else if (id === 'packages') router.navigate('/app/packages');
    else if (id === 'food') router.navigate('/food/user');
    else setActiveModal(id);
  };

  return (
    <>
      <View style={styles.quick}>
        {LINKS.map((item, index) => (
          <Press key={item.id} scale={0.92} onPress={() => onLink(item.id)} style={[styles.quickItem, index > 0 && styles.quickDivider]} accessibilityLabel={item.label.replace('\n', ' ')}>
            <View style={[styles.quickIcon, { backgroundColor: item.bg }]}>
              <Fa name={item.icon} size={11} color="#fff" />
            </View>
            <Text style={styles.quickLabel}>{item.label}</Text>
          </Press>
        ))}
      </View>

      <Dialog visible={Boolean(detail)} onClose={() => setActiveModal(null)} panelStyle={styles.modal}>
        {detail ? (
          <>
            <Press onPress={() => setActiveModal(null)} style={styles.modalClose} accessibilityLabel="Close">
              <Fa name="fa-solid fa-xmark" size={12} color={tw.gray500} />
            </Press>
            <Text style={styles.modalTitle}>{detail.title}</Text>
            <Text style={styles.modalDesc}>{detail.desc}</Text>
            <View style={styles.modalList}>
              {detail.items.map((it) => (
                <View key={it} style={styles.modalRow}>
                  <Fa name="fa-solid fa-circle-check" size={12} color={tw.emerald600} />
                  <Text style={styles.modalRowText}>{it}</Text>
                </View>
              ))}
            </View>
            <Press onPress={() => openExternal(detail.actionLink)} style={[styles.modalBtn, detail.isEmergency && { backgroundColor: tw.red600 }]}>
              <Fa name="fa-solid fa-phone" size={12} color="#fff" />
              <Text style={styles.modalBtnText}>{detail.actionText}</Text>
            </Press>
          </>
        ) : null}
      </Dialog>
    </>
  );
}

/** components/home/PromoBanner.jsx */
export function PromoBanner() {
  return (
    <View style={styles.promo}>
      <Image
        source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAu4pmPYVoooGutS4BGHL_h3AM91HWpb0p3I7_YN0nNkKK4xpIAkqN1ItQCz_Nsd7DbcowZqup9rTFIBowf5I0Jrs-It5TrdAccxzvRgaSof8HlnftQt9lj9LGKzYmk8zjtnKHKT-LCqDhuT2NBwxGfEZNfaUZp_KgB0pmGPOfzFx8k8fbx2PpkAiM0dtzfVKXnMWQIZep3NYZwMvUPV44vu4xjr9xNtuKhBw0r9VIi49A_dvZwhxmZ' }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <LinearGradient colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.2)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <View style={styles.promoText}>
        <Text style={styles.promoTitle}>
          DISCOVER THE{'\n'}UNTOLD BEAUTY OF{'\n'}
          <Text style={{ color: tw.amber300 }}>DIMA HASAO</Text>
        </Text>
        <Press onPress={() => router.navigate('/app/places')} style={styles.promoBtn}>
          <Text style={styles.promoBtnText}>Plan Your Trip Now</Text>
          <Fa name="fa-solid fa-arrow-right" size={7} color="#fff" />
        </Press>
      </View>
      <View style={styles.promoCircles} pointerEvents="none">
        <Image
          source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC108lv_9CPfPNfOkpM5KYz_jfhw2KCYt07kDJO9hCc10qB8K4CBw33m0IYPeNQp067svXvaaUtgtWZqsYNJX2EAt0QmvJIrjhL-ek6hQlVyILxypz9DxpkYZUumfsQMkY9TWApYr6ljP1g1FD2-CREC2OFa-1Q7g8GMGvFRY5I0cwKk-ub1VaVmee3OD_xH8c37DZ2Nt0devqWwyGVP9W7rdSHzCWljEvJqszVnA4BfYJ9EBfstS3E' }}
          style={[styles.promoCircle, { width: 52, height: 52, borderRadius: 26 }]}
        />
        <Image
          source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB9OVQT2F4U3UCbj1R36Pf9RoO55plzYwcyG7CbP8Pl9iwOPzyhTlzMp8FofrKumbS1VqHdYenAWx-npU_pwVpwTPNlca73avPjigjhR4r1tHscXDy72auwr0VaOmDGW5r_M2rqUnfjQ-hVOtnQtR7WqQcDb_i7XYepyjk_hCJ6TytSEwLQxdaTjeLgQjN8z-X2IXY70QjQ3MDgvef0H90p4_nYvpLouewqmyA9YgX1M7HzBLAMoAxq' }}
          style={[styles.promoCircle, { width: 60, height: 60, borderRadius: 30, marginLeft: -12 }]}
        />
      </View>
    </View>
  );
}

/** components/home/WhyVisitGrid.jsx */
export function WhyVisitGrid() {
  const [selected, setSelected] = useState(null);
  return (
    <>
      <View style={styles.why}>
        <Text style={styles.whyTitle}>Why Visit Dima Hasao?</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {WHY_VISIT_DATA.map((item, index) => (
            <Press key={item.id} scale={0.93} onPress={() => setSelected(item)} style={[styles.whyItem, index > 0 && styles.whyDivider]}>
              <View style={styles.whyImgBox}>
                <Image source={{ uri: item.image }} style={{ width: 40, height: 36 }} resizeMode="contain" />
              </View>
              <Text style={styles.whyLabel}>{item.title}</Text>
            </Press>
          ))}
        </View>
      </View>

      <Dialog visible={Boolean(selected)} onClose={() => setSelected(null)} panelStyle={styles.modal}>
        {selected ? (
          <>
            <Press onPress={() => setSelected(null)} style={styles.modalClose} accessibilityLabel="Close">
              <Fa name="fa-solid fa-xmark" size={12} color={tw.gray500} />
            </Press>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <Image source={{ uri: selected.image }} style={{ width: 48, height: 48 }} resizeMode="contain" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { fontSize: 14, lineHeight: 20, marginBottom: 0 }]}>{selected.title}</Text>
                {selected.subtitle ? <Text style={styles.whySub}>{selected.subtitle}</Text> : null}
              </View>
            </View>
            <Text style={[styles.modalDesc, { marginBottom: 16 }]}>{selected.description}</Text>
            <Press onPress={() => setSelected(null)} style={styles.modalBtn}>
              <Text style={styles.modalBtnText}>Explore More</Text>
            </Press>
          </>
        ) : null}
      </Dialog>
    </>
  );
}

const styles = StyleSheet.create({
  searchWrap: { paddingHorizontal: 12, marginTop: -16, zIndex: 30 },
  searchStripe: { position: 'absolute', left: 0, right: 0, top: '50%', marginTop: -2.5, opacity: 0.9 },
  searchBox: { marginHorizontal: 6, backgroundColor: '#fff', borderRadius: 999, paddingVertical: 4, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 2.5, borderColor: '#084524', ...shadow('md') },
  searchInput: { flex: 1, paddingVertical: 2, paddingHorizontal: 0, fontSize: 11, color: tw.gray800, height: 26, ...poppins(400) },
  mic: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  suggestions: { position: 'absolute', left: 20, right: 20, top: 36, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: tw.emerald100, overflow: 'hidden', zIndex: 50, ...shadow('2xl') },
  suggestion: { padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  suggestionImg: { width: 32, height: 32, borderRadius: 8 },
  suggestionName: { fontSize: 12, lineHeight: 16, color: tw.gray900, ...poppins(700) },
  suggestionLoc: { fontSize: 10, lineHeight: 15, color: tw.emerald700, ...poppins(400) },
  suggestionDist: { fontSize: 9, color: tw.gray400, ...poppins(500) },

  cat: { flex: 1, height: 248, borderRadius: 22, overflow: 'hidden', justifyContent: 'space-between', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', ...shadow('md') },
  catTop: { alignItems: 'center', paddingTop: 14, paddingHorizontal: 6 },
  catIcon: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: 'rgba(255,255,255,0.9)', backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  catTitle: { color: '#fff', fontSize: 11, lineHeight: 13.75, letterSpacing: -0.275, textAlign: 'center', ...montserrat(800) },
  catSub: { color: 'rgba(255,255,255,0.9)', fontSize: 8.5, lineHeight: 10.6, marginTop: 2, textAlign: 'center', ...poppins(500) },
  catImageWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, top: '34%', borderTopLeftRadius: 36, borderTopRightRadius: 36, overflow: 'hidden' },
  catFadeTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 64, opacity: 0.9 },
  catFadeBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 64 },
  catBtn: { borderRadius: 999, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', ...shadow('md') },
  catBtnText: { color: '#fff', fontSize: 9, lineHeight: 13.5, ...poppins(700) },

  quick: { marginHorizontal: 10, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(243,244,246,0.9)', paddingVertical: 6, paddingHorizontal: 8, flexDirection: 'row', gap: 4, ...shadow('xs') },
  quickItem: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 2, borderRadius: 12 },
  quickDivider: { borderLeftWidth: 1, borderLeftColor: tw.gray100, paddingLeft: 4 },
  quickIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 7.5, lineHeight: 9.4, textAlign: 'center', color: tw.gray800, marginTop: 2, ...poppins(600) },

  modal: { width: '100%', maxWidth: 384, backgroundColor: '#fff', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: tw.emerald100, ...shadow('2xl') },
  modalClose: { position: 'absolute', top: 14, right: 14, width: 28, height: 28, borderRadius: 14, backgroundColor: tw.gray100, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  modalTitle: { fontSize: 16, lineHeight: 24, color: tw.gray900, marginBottom: 4, paddingRight: 28, ...poppins(700) },
  modalDesc: { fontSize: 12, lineHeight: 19.5, color: tw.gray600, marginBottom: 12, ...poppins(400) },
  modalList: { gap: 6, marginBottom: 16, backgroundColor: 'rgba(236,253,245,0.5)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(208,250,229,0.6)' },
  modalRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalRowText: { flex: 1, fontSize: 12, lineHeight: 16, color: tw.gray800, ...poppins(400) },
  modalBtn: { paddingVertical: 10, borderRadius: 12, backgroundColor: '#0A3A22', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, ...shadow('md') },
  modalBtnText: { color: '#fff', fontSize: 12, lineHeight: 16, ...poppins(700) },

  promo: { marginHorizontal: 12, height: 120, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,214,167,0.4)', ...shadow('sm') },
  promoText: { position: 'absolute', top: 0, bottom: 0, left: 0, width: '60%', padding: 14, justifyContent: 'center' },
  promoTitle: { color: '#fff', fontSize: 12, lineHeight: 15, letterSpacing: -0.3, marginBottom: 8, ...poppins(800) },
  promoBtn: { alignSelf: 'flex-start', backgroundColor: '#084524', paddingVertical: 4, paddingHorizontal: 12, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', ...shadow('md') },
  promoBtnText: { color: '#fff', fontSize: 9, lineHeight: 13.5, ...poppins(700) },
  promoCircles: { position: 'absolute', right: 12, top: 0, bottom: 0, flexDirection: 'row', alignItems: 'center' },
  promoCircle: { borderWidth: 2, borderColor: '#fff', backgroundColor: '#fff' },

  why: { marginHorizontal: 12, marginBottom: 96, backgroundColor: '#FCF8ED', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: 'rgba(255,214,167,0.7)', ...shadow('sm') },
  whyTitle: { textAlign: 'center', color: tw.gray900, marginBottom: 10, fontSize: 12, lineHeight: 16, ...poppins(700) },
  whyItem: { flex: 1, alignItems: 'center', padding: 4, borderRadius: 12 },
  whyDivider: { borderLeftWidth: 1, borderLeftColor: 'rgba(255,214,167,0.9)' },
  whyImgBox: { width: 40, height: 40, marginBottom: 4, alignItems: 'center', justifyContent: 'center' },
  whyLabel: { fontSize: 8.5, lineHeight: 10.6, textAlign: 'center', color: tw.gray800, ...poppins(700) },
  whySub: { fontSize: 11, lineHeight: 16.5, color: tw.emerald800, ...poppins(600) },
});
