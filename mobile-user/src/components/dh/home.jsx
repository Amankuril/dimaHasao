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
import { Button, IconButton, SectionHeader, fa } from '../ds';
import { color, elevation, radii, space, type } from '../../theme';

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
        <Fa name="fa-solid fa-magnifying-glass" size={16} color={color.textMuted} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          onSubmitEditing={() => router.navigate('/app/places')}
          returnKeyType="search"
          placeholder="Search places, hotels, cabs..."
          placeholderTextColor={color.textMuted}
          style={styles.searchInput}
          accessibilityLabel="Search"
        />
        {searchQuery ? (
          <IconButton icon={fa('fa-solid fa-xmark')} label="Clear search" onPress={() => setSearchQuery('')} size={40} iconSize={16} iconColor={color.textMuted} />
        ) : null}
        <Press onPress={handleVoiceSearch} scale={0.9} hitSlop={2} accessibilityLabel={isListening ? 'Listening' : 'Voice Search'} style={[styles.mic, isListening && { backgroundColor: color.danger }]}>
          <Fa name="fa-solid fa-microphone" size={16} color={isListening ? color.textInverse : color.primary} />
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
              accessibilityLabel={`${place.name}, ${place.location}`}
              style={[styles.suggestion, i > 0 && styles.suggestionDivider]}
            >
              <Image source={{ uri: place.mainImage }} style={styles.suggestionImg} accessibilityIgnoresInvertColors />
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

/**
 * components/home/CategoryCard.jsx, in the one heritage treatment: a photo
 * with a dark green scrim, a gold-edged icon badge, a gold Cinzel title and
 * a sentence-case action line. Every module looks the same; identity comes
 * from the photo and the icon, not from a colour.
 */
export function CategoryCard({ title, subtitle, icon, image, buttonText, onPress }) {
  return (
    <Press onPress={onPress} scale={0.97} style={styles.cat} accessibilityRole="button" accessibilityLabel={`${title}. ${subtitle}. ${buttonText}`}>
      <Image source={{ uri: image }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityIgnoresInvertColors />
      <LinearGradient colors={['rgba(6,44,22,0.15)', 'rgba(6,44,22,0.55)', 'rgba(6,44,22,0.94)']} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <View style={styles.catIcon}>
        <Fa name={icon} size={18} color={color.goldOnDark} />
      </View>
      <View style={styles.catBody}>
        <View style={styles.catTitleRow}>
          <Fa name="fa-solid fa-leaf" size={11} color={color.gold} />
          <Text style={styles.catTitle} numberOfLines={2}>
            {String(title).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.catSub} numberOfLines={2}>
          {subtitle}
        </Text>
        <View style={styles.catAction}>
          <Text style={styles.catActionText} numberOfLines={1}>
            {buttonText}
          </Text>
          <Fa name="fa-solid fa-arrow-right" size={12} color={color.goldOnDark} />
        </View>
      </View>
    </Press>
  );
}

const LINKS = [
  { id: 'guide', label: 'Local guide', icon: 'fa-solid fa-user-tie' },
  { id: 'events', label: 'Festivals', icon: 'fa-solid fa-calendar-days' },
  { id: 'packages', label: 'Packages', icon: 'fa-solid fa-suitcase-rolling' },
  { id: 'food', label: 'Food & cuisine', icon: 'fa-solid fa-bowl-food' },
  { id: 'emergency', label: 'SOS help', icon: 'fa-solid fa-phone-volume', danger: true },
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

/** components/home/QuickLinksGrid.jsx: one row of 44 px icon tiles with readable labels. */
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
        {LINKS.map((item) => (
          <Press key={item.id} scale={0.94} onPress={() => onLink(item.id)} style={styles.quickItem} accessibilityRole="button" accessibilityLabel={item.label}>
            <View style={[styles.quickIcon, item.danger && { backgroundColor: color.dangerSoft }]}>
              <Fa name={item.icon} size={18} color={item.danger ? color.danger : color.primary} />
            </View>
            <Text style={styles.quickLabel} numberOfLines={2}>
              {item.label}
            </Text>
          </Press>
        ))}
      </View>

      <Dialog visible={Boolean(detail)} onClose={() => setActiveModal(null)} panelStyle={styles.modal}>
        {detail ? (
          <>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle} accessibilityRole="header">
                {detail.title}
              </Text>
              <IconButton icon={fa('fa-solid fa-xmark')} label="Close" onPress={() => setActiveModal(null)} variant="soft" size={40} iconSize={16} />
            </View>
            <Text style={styles.modalDesc}>{detail.desc}</Text>
            <View style={styles.modalList}>
              {detail.items.map((it) => (
                <View key={it} style={styles.modalRow}>
                  <Fa name="fa-solid fa-circle-check" size={16} color={detail.isEmergency ? color.danger : color.primary} />
                  <Text style={styles.modalRowText}>{it}</Text>
                </View>
              ))}
            </View>
            <Button title={detail.actionText} icon={fa('fa-solid fa-phone')} variant={detail.isEmergency ? 'danger' : 'primary'} onPress={() => openExternal(detail.actionLink)} />
          </>
        ) : null}
      </Dialog>
    </>
  );
}

/** components/home/PromoBanner.jsx */
export function PromoBanner() {
  return (
    <Press scale={0.98} onPress={() => router.navigate('/app/places')} style={styles.promo} accessibilityRole="button" accessibilityLabel="Discover the untold beauty of Dima Hasao. Plan your trip now">
      <Image
        source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAu4pmPYVoooGutS4BGHL_h3AM91HWpb0p3I7_YN0nNkKK4xpIAkqN1ItQCz_Nsd7DbcowZqup9rTFIBowf5I0Jrs-It5TrdAccxzvRgaSof8HlnftQt9lj9LGKzYmk8zjtnKHKT-LCqDhuT2NBwxGfEZNfaUZp_KgB0pmGPOfzFx8k8fbx2PpkAiM0dtzfVKXnMWQIZep3NYZwMvUPV44vu4xjr9xNtuKhBw0r9VIi49A_dvZwhxmZ' }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
      <LinearGradient colors={['rgba(6,44,22,0.92)', 'rgba(6,44,22,0.6)', 'rgba(6,44,22,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <View style={styles.promoText}>
        <Text style={styles.promoTitle}>
          {'Discover the untold beauty of '}
          <Text style={{ color: color.goldOnDark }}>Dima Hasao</Text>
        </Text>
        <View style={styles.promoAction}>
          <Text style={styles.promoActionText}>Plan your trip now</Text>
          <Fa name="fa-solid fa-arrow-right" size={12} color={color.goldOnDark} />
        </View>
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
    </Press>
  );
}

/** components/home/WhyVisitGrid.jsx */
export function WhyVisitGrid() {
  const [selected, setSelected] = useState(null);
  return (
    <>
      <View style={styles.why}>
        <SectionHeader title="Why visit Dima Hasao?" />
        <View style={styles.whyRow}>
          {WHY_VISIT_DATA.map((item) => (
            <Press key={item.id} scale={0.94} onPress={() => setSelected(item)} style={styles.whyItem} accessibilityRole="button" accessibilityLabel={item.title}>
              <View style={styles.whyImgBox}>
                <Image source={{ uri: item.image }} style={{ width: 40, height: 36 }} resizeMode="contain" />
              </View>
              <Text style={styles.whyLabel} numberOfLines={2}>
                {item.title}
              </Text>
            </Press>
          ))}
        </View>
      </View>

      <Dialog visible={Boolean(selected)} onClose={() => setSelected(null)} panelStyle={styles.modal}>
        {selected ? (
          <>
            <View style={styles.modalHead}>
              <Image source={{ uri: selected.image }} style={{ width: 48, height: 48 }} resizeMode="contain" />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.modalTitle} accessibilityRole="header">
                  {selected.title}
                </Text>
                {selected.subtitle ? <Text style={styles.whySub}>{selected.subtitle}</Text> : null}
              </View>
              <IconButton icon={fa('fa-solid fa-xmark')} label="Close" onPress={() => setSelected(null)} variant="soft" size={40} iconSize={16} />
            </View>
            <Text style={[styles.modalDesc, { marginBottom: space.lg }]}>{selected.description}</Text>
            <Button title="Explore more" onPress={() => setSelected(null)} />
          </>
        ) : null}
      </Dialog>
    </>
  );
}

const styles = StyleSheet.create({
  searchWrap: { paddingHorizontal: space.lg, marginTop: -28, zIndex: 30 },
  searchStripe: { position: 'absolute', left: 0, right: 0, top: 26, opacity: 0.9 },
  searchBox: {
    height: 56, backgroundColor: color.surface, borderRadius: radii.pill, paddingLeft: space.lg, paddingRight: space.xs + 2, flexDirection: 'row', alignItems: 'center', gap: space.sm,
    borderWidth: 2, borderColor: color.primary, ...elevation.float,
  },
  searchInput: { flex: 1, minWidth: 0, height: 52, paddingVertical: 0, paddingHorizontal: 0, ...type.body, color: color.text },
  mic: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: color.primarySoft },
  suggestions: { position: 'absolute', left: space.lg, right: space.lg, top: 60, backgroundColor: color.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, overflow: 'hidden', zIndex: 50, ...elevation.float },
  suggestion: { minHeight: 56, paddingHorizontal: space.md, paddingVertical: space.sm, flexDirection: 'row', alignItems: 'center', gap: space.md },
  suggestionDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border },
  suggestionImg: { width: 40, height: 40, borderRadius: radii.sm, backgroundColor: color.surfaceMuted },
  suggestionName: { ...type.bodyStrong, color: color.text },
  suggestionLoc: { ...type.caption, color: color.textMuted },
  suggestionDist: { ...type.caption, color: color.textMuted },

  cat: { flex: 1, height: 216, borderRadius: radii.lg, overflow: 'hidden', backgroundColor: color.primaryDeep, justifyContent: 'space-between', ...elevation.card },
  catIcon: {
    margin: space.md, width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: color.gold, backgroundColor: 'rgba(6,44,22,0.7)',
    alignItems: 'center', justifyContent: 'center',
  },
  catBody: { padding: space.md, gap: space.xs },
  catTitleRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2 },
  catTitle: { ...type.sectionSerif, fontSize: 14, lineHeight: 19, letterSpacing: 0.6, color: color.goldOnDark, flexShrink: 1 },
  catSub: { ...type.caption, color: 'rgba(255,255,255,0.88)' },
  catAction: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2, marginTop: space.xs, paddingTop: space.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(202,168,62,0.5)' },
  catActionText: { ...type.label, color: color.goldOnDark, flexShrink: 1 },

  quick: { marginHorizontal: space.lg, backgroundColor: color.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, paddingVertical: space.md, paddingHorizontal: space.xs, flexDirection: 'row', ...elevation.card },
  quickItem: { flex: 1, minWidth: 0, alignItems: 'center', gap: space.xs + 2, paddingHorizontal: 2 },
  quickIcon: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { ...type.caption, color: color.text, textAlign: 'center' },

  modal: { width: '100%', maxWidth: 384, backgroundColor: color.surface, borderRadius: radii.xl, padding: space.xl, borderWidth: 1, borderColor: color.border, ...elevation.float },
  modalHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.sm },
  modalTitle: { ...type.heading, color: color.text, flex: 1 },
  modalDesc: { ...type.small, color: color.textSecondary, marginBottom: space.md },
  modalList: { gap: space.sm, marginBottom: space.lg, backgroundColor: color.surfaceMuted, padding: space.md, borderRadius: radii.md },
  modalRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  modalRowText: { flex: 1, ...type.small, color: color.text },

  promo: { marginHorizontal: space.lg, height: 136, borderRadius: radii.lg, overflow: 'hidden', backgroundColor: color.primaryDeep, ...elevation.card },
  promoText: { position: 'absolute', top: 0, bottom: 0, left: 0, width: '62%', padding: space.lg, justifyContent: 'center', gap: space.sm },
  promoTitle: { ...type.sectionSerif, color: color.textInverse },
  promoAction: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2 },
  promoActionText: { ...type.label, color: color.goldOnDark },
  promoCircles: { position: 'absolute', right: space.md, top: 0, bottom: 0, flexDirection: 'row', alignItems: 'center' },
  promoCircle: { borderWidth: 2, borderColor: color.surface, backgroundColor: color.surface },

  why: { marginHorizontal: space.lg, backgroundColor: color.surface, borderRadius: radii.lg, padding: space.lg, borderWidth: 1, borderColor: color.border, ...elevation.card },
  whyRow: { flexDirection: 'row', gap: space.xs },
  whyItem: { flex: 1, minWidth: 0, alignItems: 'center', paddingVertical: space.xs, gap: space.xs + 2 },
  whyImgBox: { width: 52, height: 52, borderRadius: radii.md, backgroundColor: color.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  whyLabel: { ...type.caption, color: color.text, textAlign: 'center' },
  whySub: { ...type.label, color: color.primary },
});
