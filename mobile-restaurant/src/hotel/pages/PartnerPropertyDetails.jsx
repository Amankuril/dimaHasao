import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  MapPin, IndianRupee, Users, BedDouble, ArrowLeft, CheckCircle,
  X, ChevronRight, Info, FileText, Image as ImageIcon, List,
  Clock, Map, Calendar, ChevronLeft, Download, AlertTriangle,
} from 'lucide-react-native';
import { useNavigate, useParams } from '../../lib/webRouter';
import { openExternal } from '../../lib/links';
import Img from '../../components/Img';
import { BottomSheet } from '../../components/kit';
import { Press } from '../../components/ui';
import { Button, EmptyState, IconButton, Money, SectionHeader, StatusBadge } from '../../components/ds';
import { color, elevation, radii, space, type } from '../../theme';
import { propertyService } from '../services/apiService';
import { InfoTile, KeyValue, PageLoader, approvalTone, sentence } from '../components/dashboard/partnerUi';

/* Port of Frontend/src/modules/Hotel/app/partner/pages/PartnerPropertyDetails.jsx. */


const PartnerPropertyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const insets = useSafeAreaInsets();
  const { height: screenH, width: screenW } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [property, setProperty] = useState(null);
  const [roomTypes, setRoomTypes] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showPricing, setShowPricing] = useState(false);
  const [activeSection, setActiveSection] = useState(null);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [docFailed, setDocFailed] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await propertyService.getDetails(id);

        // Merge documents into property if they exist separately
        const propData = res.property || {};
        if (res.documents && res.documents.documents) {
          propData.documents = res.documents.documents;
        }

        setProperty(propData);
        setRoomTypes(res.roomTypes || []);
      } catch (e) {
        setError(e?.message || 'Failed to load property details');
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

  const totalImages = (property?.coverImage ? 1 : 0) + (property?.propertyImages?.length || 0);

  const sections = [
    { id: 'basic', label: 'Basic Info', icon: Info, desc: property?.propertyType || 'Property Details' },
    { id: 'location', label: 'Location', icon: MapPin, desc: property?.address?.city || 'Address Info' },
    { id: 'images', label: 'Photos', icon: ImageIcon, desc: `${totalImages} Items` },
    { id: 'amenities', label: 'Amenities', icon: List, desc: `${property?.amenities?.length || 0} Items` },
    { id: 'rooms', label: 'Rooms & Price', icon: BedDouble, desc: `${roomTypes.length} Types` },
    { id: 'nearby', label: 'Nearby', icon: Map, desc: `${property?.nearbyPlaces?.length || 0} Places` },
    { id: 'rules', label: 'Rules', icon: Clock, desc: 'Policies' },
    { id: 'documents', label: 'Docs', icon: FileText, desc: `${property?.documents?.length || 0} Files` },
  ];

  if (loading) {
    return <PageLoader />;
  }

  if (error || !property) {
    return (
      <View style={[styles.center, { backgroundColor: color.bg, padding: space.xxl, gap: space.lg }]}>
        <View style={styles.errIcon}>
          <AlertTriangle size={24} color={color.danger} />
        </View>
        <Text style={[type.body, { color: color.danger, textAlign: 'center' }]}>{error || 'Property not found'}</Text>
        <Button title="Go back" variant="outline" fullWidth={false} onPress={() => navigate(-1)} />
      </View>
    );
  }

  const closeRoom = () => {
    setSelectedRoom(null);
    setCurrentImageIndex(0);
  };

  const roomImages = selectedRoom?.images || [];

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    if (isLeftSwipe && currentImageIndex < (selectedRoom.images?.length || 1) - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    }
    if (isRightSwipe && currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };

  const card = [styles.card];
  const live = property.isLive ? { tone: 'success', label: 'Live' } : approvalTone(property.status);

  const renderSection = () => {
    switch (activeSection) {
      case 'basic':
        return (
          <View style={{ gap: space.md }}>
            <View style={[card, { gap: space.xs }]}>
              <Text style={styles.label}>Property name</Text>
              <Text style={[type.subheading, { color: color.text }]}>{property.propertyName}</Text>
            </View>
            <View style={[card, { gap: space.xs }]}>
              <Text style={styles.label}>Description</Text>
              <Text style={[type.body, { color: color.textSecondary }]}>{property.description}</Text>
            </View>
            <View style={[card, { gap: space.xs }]}>
              <Text style={styles.label}>Contact number</Text>
              <Text style={[type.bodyStrong, { color: color.text }]}>{property.contactNumber || 'Not provided'}</Text>
            </View>
          </View>
        );
      case 'location':
        return (
          <View style={card}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
              <MapPin size={20} color={color.primary} style={{ marginTop: 2 }} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[type.bodyStrong, { color: color.text }]}>Address</Text>
                <Text style={[type.body, { color: color.textSecondary, marginTop: space.xs }]}>{property.address?.fullAddress}</Text>
                <Text style={[type.small, { color: color.textMuted, marginTop: space.sm }]}>
                  {property.address?.city}, {property.address?.state} - {property.address?.pincode}
                </Text>
              </View>
            </View>
          </View>
        );
      case 'images': {
        const imgW = (screenW - space.lg * 2 - space.md) / 2;
        return (
          <View style={{ gap: space.md, paddingBottom: space.lg }}>
            <View style={styles.rowBetween}>
              <View style={styles.rowGap}>
                <ImageIcon size={18} color={color.primary} />
                <Text style={[type.bodyStrong, { color: color.text }]}>Property photos</Text>
              </View>
              <Text style={[type.caption, { color: color.textMuted }]}>
                {(property.coverImage ? 1 : 0) + (property.propertyImages?.length || 0)} images
              </Text>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
              {property.coverImage ? (
                <View style={{ width: '100%', aspectRatio: 16 / 10, borderRadius: radii.lg, overflow: 'hidden', backgroundColor: color.surfaceMuted }}>
                  <Img source={{ uri: property.coverImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  <LinearGradient colors={['rgba(0,0,0,0.4)', 'transparent']} start={{ x: 0, y: 1 }} end={{ x: 0, y: 0.5 }} style={StyleSheet.absoluteFill} />
                  <View style={styles.coverTag}>
                    <ImageIcon size={14} color={color.text} />
                    <Text style={[type.caption, { color: color.text }]}>Cover photo</Text>
                  </View>
                </View>
              ) : null}

              {property.propertyImages?.map((img, i) => (
                <View key={i} style={{ width: imgW, aspectRatio: 1, borderRadius: radii.md, overflow: 'hidden', backgroundColor: color.surfaceMuted }}>
                  <Img source={{ uri: img }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                </View>
              ))}
            </View>

            {!property.coverImage && (!property.propertyImages || property.propertyImages.length === 0) ? (
              <EmptyState icon={ImageIcon} title="No property photos added." style={styles.dashed} />
            ) : null}
          </View>
        );
      }
      case 'amenities':
        return (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {property.amenities?.map((am, i) => (
              <View key={i} style={styles.amenity}>
                <CheckCircle size={14} color={color.success} />
                <Text style={[type.label, { color: color.text }]}>{am}</Text>
              </View>
            ))}
            {!property.amenities || property.amenities.length === 0 ? <EmptyState icon={List} title="No amenities added." style={{ flex: 1 }} /> : null}
          </View>
        );
      case 'nearby':
        return (
          <View style={{ gap: space.md }}>
            {property.nearbyPlaces?.map((place, i) => (
              <View key={i} style={[card, { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md }]}>
                <View style={styles.nearbyCircle}>
                  <Text style={[type.subheading, { color: color.primary }]}>{place.name?.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[type.bodyStrong, { color: color.text }]}>{place.name}</Text>
                  <Text style={[type.small, { color: color.textMuted, textTransform: 'capitalize' }]}>
                    {place.type?.replace('_', ' ')} • {place.distanceKm}km
                  </Text>
                </View>
              </View>
            ))}
            {!property.nearbyPlaces || property.nearbyPlaces.length === 0 ? <EmptyState icon={Map} title="No nearby places added." /> : null}
          </View>
        );
      case 'rooms':
        return (
          <View style={{ gap: space.md }}>
            {roomTypes.length > 0 ? (
              roomTypes.map((room) => (
                <Press key={room._id} onPress={() => setSelectedRoom(room)} scale={0.98} accessibilityLabel={`${room.name}, view details`} style={[card, { gap: space.md }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.lg }}>
                    <View style={{ flex: 1, minWidth: 0, gap: space.sm }}>
                      <Text style={[type.subheading, { color: color.text }]}>{room.name}</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                        {room.roomCategory ? <StatusBadge label={sentence(room.roomCategory)} tone="primary" /> : null}
                        {room.inventoryType ? <StatusBadge label={sentence(room.inventoryType)} tone="neutral" /> : null}
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Money value={`₹${room.pricePerNight}`} style={{ color: color.primary }} />
                      <Text style={[type.caption, { color: color.textMuted }]}>/ night</Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: space.lg, rowGap: space.xs }}>
                    <View style={styles.cap}>
                      <Users size={16} color={color.textMuted} />
                      <Text style={styles.capText}>{room.maxAdults} Adults</Text>
                    </View>
                    <View style={styles.cap}>
                      <Users size={16} color={color.textMuted} />
                      <Text style={styles.capText}>{room.maxChildren} Children</Text>
                    </View>
                    <View style={styles.cap}>
                      <BedDouble size={16} color={color.textMuted} />
                      <Text style={styles.capText}>{room.totalInventory} Units</Text>
                    </View>
                  </View>

                  {room.amenities && room.amenities.length > 0 ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs + 2 }}>
                      {room.amenities.slice(0, 3).map((am, idx) => (
                        <View key={idx} style={styles.miniChip}>
                          <Text style={[type.caption, { color: color.textSecondary }]}>{am}</Text>
                        </View>
                      ))}
                      {room.amenities.length > 3 ? (
                        <View style={styles.miniChip}>
                          <Text style={[type.caption, { color: color.textMuted }]}>+{room.amenities.length - 3} more</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  <View style={[styles.rowBetween, { paddingTop: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border }]}>
                    <Text style={[type.label, { color: color.primary }]}>View full details</Text>
                    <ChevronRight size={16} color={color.primary} />
                  </View>
                </Press>
              ))
            ) : (
              <EmptyState icon={BedDouble} title="No room types added yet." />
            )}
          </View>
        );
      case 'rules':
        return (
          <View style={{ gap: space.md }}>
            <View style={{ flexDirection: 'row', gap: space.md }}>
              <InfoTile label="Check-in" value={property.checkInTime || 'N/A'} />
              <InfoTile label="Check-out" value={property.checkOutTime || 'N/A'} />
            </View>

            <View style={[card, { gap: space.sm }]}>
              <Text style={[type.bodyStrong, { color: color.text }]}>Cancellation policy</Text>
              <Text style={[type.body, { color: color.textSecondary }]}>{property.cancellationPolicy || 'No policy specified.'}</Text>
            </View>

            <View style={[card, { gap: space.sm }]}>
              <Text style={[type.bodyStrong, { color: color.text }]}>House rules</Text>
              {property.houseRules && property.houseRules.length > 0 ? (
                <View style={{ gap: space.xs }}>
                  {property.houseRules.map((rule, i) => (
                    <View key={i} style={{ flexDirection: 'row', gap: space.sm }}>
                      <Text style={[type.body, { color: color.textSecondary }]}>{'•'}</Text>
                      <Text style={[type.body, { flex: 1, color: color.textSecondary }]}>{rule}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={[type.body, { color: color.textMuted }]}>No specific house rules.</Text>
              )}
            </View>
          </View>
        );
      case 'documents':
        return (
          <View style={{ gap: space.md }}>
            {property.documents?.map((doc, i) => (
              <Press
                key={i}
                onPress={() => {
                  if (doc.fileUrl) {
                    setDocFailed(false);
                    setSelectedDocument(doc);
                  }
                }}
                scale={0.98}
                accessibilityLabel={`${doc.name}, ${doc.fileUrl ? 'uploaded' : 'missing'}`}
                style={[card, { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md }]}
              >
                <View style={[styles.docIcon, { backgroundColor: doc.fileUrl ? color.successSoft : color.dangerSoft }]}>
                  <FileText size={18} color={doc.fileUrl ? color.success : color.danger} />
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: space.xxs }}>
                  <Text style={[type.bodyStrong, { color: color.text }]} numberOfLines={2}>
                    {doc.name}
                  </Text>
                  <StatusBadge label={doc.fileUrl ? 'Uploaded' : 'Missing'} tone={doc.fileUrl ? 'success' : 'danger'} />
                </View>
                {doc.fileUrl ? <ChevronRight size={18} color={color.textMuted} /> : null}
              </Press>
            ))}
            {!property.documents || property.documents.length === 0 ? <EmptyState icon={FileText} title="No documents uploaded." /> : null}
          </View>
        );
      default:
        return null;
    }
  };

  const heroH = Math.round(screenH * 0.35);
  const gridW = (screenW - space.lg * 2 - space.md) / 2;

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: space.xxxl + insets.bottom }}>
        <View style={[styles.hero, { height: Math.max(heroH, 220 + insets.top) }]}>
          {property.coverImage ? (
            <Img source={{ uri: property.coverImage }} accessibilityLabel={property.propertyName} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surfaceMuted }}>
              <ImageIcon size={48} color={color.textDisabled} />
            </View>
          )}
          <LinearGradient colors={['rgba(0,0,0,0.45)', 'transparent', 'rgba(0,0,0,0.7)']} style={StyleSheet.absoluteFill} />

          <View style={styles.heroText}>
            {property.propertyType ? (
              <View style={styles.typeChip}>
                <Text style={[type.caption, { color: color.textInverse }]}>{sentence(property.propertyType)}</Text>
              </View>
            ) : null}
            <Text style={styles.heroTitle} numberOfLines={2}>
              {property.propertyName}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs + 2 }}>
              <MapPin size={14} color={color.textInverse} />
              <Text style={[type.small, { flex: 1, color: color.textInverse }]} numberOfLines={2}>
                {property.address?.fullAddress}
              </Text>
            </View>
          </View>
        </View>

        {/* Sections Grid */}
        <View style={{ paddingHorizontal: space.lg, paddingTop: space.xxl, gap: space.md }}>
          <Press onPress={() => navigate(`/hotel/partner/inventory/${id}`)} scale={0.99} accessibilityLabel="Manage inventory" style={styles.inventoryBtn}>
            <View style={styles.inventoryIcon}>
              <Calendar size={24} color={color.goldOnDark} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[type.subheading, { color: color.textInverse }]}>Manage inventory</Text>
              <Text style={[type.small, { color: color.textOnDarkMuted }]}>Availability & manual blocks</Text>
            </View>
            <ChevronRight size={20} color={color.textInverse} />
          </Press>

          <SectionHeader title="Listing details" style={{ marginTop: space.md, marginBottom: 0 }} />

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <Press key={section.id} onPress={() => setActiveSection(section.id)} scale={0.98} accessibilityLabel={`${section.label}, ${section.desc}`} style={[styles.gridCard, { width: gridW }]}>
                  <View style={styles.rowBetween}>
                    <View style={styles.gridIcon}>
                      <Icon size={18} color={color.primary} />
                    </View>
                    <ChevronRight size={16} color={color.textDisabled} />
                  </View>
                  <View style={{ width: '100%' }}>
                    <Text style={[type.bodyStrong, { color: color.text }]} numberOfLines={1}>
                      {section.label}
                    </Text>
                    <Text style={[type.caption, { color: color.textMuted, textTransform: 'capitalize' }]} numberOfLines={1}>
                      {section.desc}
                    </Text>
                  </View>
                </Press>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Custom header over the hero */}
      <View pointerEvents="box-none" style={[styles.topBar, { paddingTop: space.sm + insets.top }]}>
        <IconButton icon={ArrowLeft} label="Back" variant="soft" onPress={() => navigate(-1)} style={styles.onPhoto} />
        <StatusBadge label={live.label} tone={live.tone} style={styles.liveChip} />
      </View>

      {/* Main Sections Bottom Sheet */}
      <BottomSheet
        visible={Boolean(activeSection)}
        onClose={() => setActiveSection(null)}
        backdrop={color.overlay}
        blur={8}
        panelStyle={[styles.sheet, { height: Math.round(screenH * 0.85) }]}
      >
        <View style={styles.sheetHead}>
          <View style={styles.handle} />
          <View style={styles.rowBetween}>
            <View style={{ width: 44 }} />
            <Text style={[type.heading, { color: color.text, textAlign: 'center', flex: 1 }]} numberOfLines={1}>
              {sections.find((s) => s.id === activeSection)?.label}
            </Text>
            <IconButton icon={X} label="Close" variant="soft" onPress={() => setActiveSection(null)} />
          </View>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: space.lg, paddingBottom: space.lg + insets.bottom }} showsVerticalScrollIndicator={false}>
          {renderSection()}
        </ScrollView>
      </BottomSheet>

      {/* Room Details Bottom Sheet */}
      <BottomSheet
        visible={Boolean(selectedRoom)}
        onClose={closeRoom}
        backdrop={color.overlay}
        blur={8}
        panelStyle={[styles.sheet, { height: Math.round(screenH * 0.9) }]}
      >
        {selectedRoom ? (
          <>
            {/* Image Carousel */}
            <View
              style={styles.carousel}
              onTouchStart={(e) => {
                setTouchEnd(null);
                setTouchStart(e.nativeEvent.pageX);
              }}
              onTouchMove={(e) => setTouchEnd(e.nativeEvent.pageX)}
              onTouchEnd={onTouchEnd}
            >
              {roomImages.length > 0 ? (
                <Img source={{ uri: roomImages[currentImageIndex] }} accessibilityLabel={selectedRoom.name} style={StyleSheet.absoluteFill} resizeMode="cover" />
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <BedDouble size={48} color={color.textDisabled} />
                </View>
              )}

              <IconButton icon={X} label="Close" variant="soft" onPress={closeRoom} style={[styles.carBtn, { top: space.lg, right: space.lg }]} />

              {roomImages.length > 1 ? (
                <>
                  <IconButton
                    icon={ChevronLeft}
                    label="Previous image"
                    variant="soft"
                    onPress={() => setCurrentImageIndex(Math.max(0, currentImageIndex - 1))}
                    disabled={currentImageIndex === 0}
                    style={[styles.carBtn, { left: space.lg, top: 106 }]}
                  />
                  <IconButton
                    icon={ChevronRight}
                    label="Next image"
                    variant="soft"
                    onPress={() => setCurrentImageIndex(Math.min(roomImages.length - 1, currentImageIndex + 1))}
                    disabled={currentImageIndex === roomImages.length - 1}
                    style={[styles.carBtn, { right: space.lg, top: 106 }]}
                  />

                  <View style={styles.counter}>
                    <Text style={[type.caption, { color: color.textInverse }]}>
                      {currentImageIndex + 1} / {roomImages.length}
                    </Text>
                  </View>
                </>
              ) : null}

              {roomImages.length > 1 && roomImages.length <= 5 ? (
                <View style={styles.dotsRow}>
                  {roomImages.map((_, idx) => (
                    <Pressable
                      key={idx}
                      onPress={() => setCurrentImageIndex(idx)}
                      accessibilityRole="button"
                      accessibilityLabel={`Image ${idx + 1}`}
                      hitSlop={10}
                      style={{ height: 8, width: idx === currentImageIndex ? 24 : 8, borderRadius: 4, backgroundColor: idx === currentImageIndex ? color.surface : 'rgba(255,255,255,0.5)' }}
                    />
                  ))}
                </View>
              ) : null}
            </View>

            {/* Room Details Body */}
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: space.xl, paddingBottom: space.xl + insets.bottom }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: space.xxl }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space.lg }}>
                  <View style={{ flex: 1, minWidth: 0, gap: space.sm }}>
                    <Text style={[type.heading, { color: color.text }]}>{selectedRoom.name}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                      {selectedRoom.roomCategory ? <StatusBadge label={sentence(selectedRoom.roomCategory)} tone="primary" /> : null}
                      {selectedRoom.inventoryType ? <StatusBadge label={sentence(selectedRoom.inventoryType)} tone="neutral" /> : null}
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Money value={`₹${selectedRoom.pricePerNight}`} style={{ color: color.primary }} />
                    <Text style={[type.caption, { color: color.textMuted }]}>/ night</Text>
                  </View>
                </View>

                <View>
                  <Text style={styles.sub}>Room capacity</Text>
                  <View style={{ flexDirection: 'row', gap: space.md }}>
                    {[
                      { Icon: Users, value: selectedRoom.maxAdults, label: 'Adults' },
                      { Icon: Users, value: selectedRoom.maxChildren, label: 'Children' },
                      { Icon: BedDouble, value: selectedRoom.totalInventory, label: 'Units' },
                    ].map(({ Icon, value, label }) => (
                      <View key={label} style={styles.capBox}>
                        <Icon size={20} color={color.textMuted} />
                        <Text style={[type.price, { color: color.text }]}>{value}</Text>
                        <Text style={[type.caption, { color: color.textMuted }]}>{label}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Pricing Breakdown (Expandable) */}
                <View style={{ borderWidth: 1, borderColor: color.border, borderRadius: radii.lg, overflow: 'hidden' }}>
                  <Pressable onPress={() => setShowPricing(!showPricing)} accessibilityRole="button" accessibilityState={{ expanded: showPricing }} style={styles.pricingHead}>
                    <View style={styles.rowGap}>
                      <IndianRupee size={18} color={color.primary} />
                      <Text style={[type.bodyStrong, { color: color.text }]}>Pricing details</Text>
                    </View>
                    <ChevronRight size={18} color={color.textMuted} style={{ transform: [{ rotate: showPricing ? '90deg' : '0deg' }] }} />
                  </Pressable>
                  {showPricing ? (
                    <View style={{ padding: space.lg, backgroundColor: color.surface, borderTopWidth: 1, borderTopColor: color.border, gap: space.sm }}>
                      {[
                        ['Base price (per night)', selectedRoom.pricePerNight],
                        ['Extra adult price', selectedRoom.extraAdultPrice],
                        ['Extra child price', selectedRoom.extraChildPrice],
                      ].map(([label, value]) => (
                        <KeyValue key={label} label={label} value={`₹${value}`} />
                      ))}
                    </View>
                  ) : null}
                </View>

                {selectedRoom.amenities && selectedRoom.amenities.length > 0 ? (
                  <View>
                    <Text style={styles.sub}>Room amenities</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
                      {selectedRoom.amenities.map((am, idx) => (
                        <View key={idx} style={styles.roomAmenity}>
                          <CheckCircle size={16} color={color.success} />
                          <Text style={[type.small, { flex: 1, color: color.text }]} numberOfLines={2}>
                            {am}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}
              </View>
            </ScrollView>
          </>
        ) : null}
      </BottomSheet>

      {/* Document Viewer Modal */}
      <Modal visible={Boolean(selectedDocument)} transparent animationType="fade" onRequestClose={() => setSelectedDocument(null)} statusBarTranslucent>
        <View style={[styles.docWrap, { paddingTop: space.lg + insets.top, paddingBottom: space.lg + insets.bottom }]}>
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.9)' }]} onPress={() => setSelectedDocument(null)} accessibilityLabel="Close" />
          {selectedDocument ? (
            <View style={[styles.docCard, { height: Math.round(screenH * 0.9) - insets.top - insets.bottom }]}>
              <View style={styles.docHead}>
                <View style={styles.docHeadIcon}>
                  <FileText size={20} color={color.primary} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[type.subheading, { color: color.text }]} numberOfLines={1}>
                    {selectedDocument.name}
                  </Text>
                  <Text style={[type.caption, { color: color.textMuted }]}>Document preview</Text>
                </View>
                <IconButton icon={Download} label="Download" variant="primary" onPress={() => openExternal(selectedDocument.fileUrl)} />
                <IconButton icon={X} label="Close" variant="soft" onPress={() => setSelectedDocument(null)} />
              </View>

              <View style={styles.docBody}>
                {!docFailed ? (
                  <Img
                    source={{ uri: selectedDocument.fileUrl }}
                    style={{ width: '100%', height: '100%', borderRadius: radii.sm }}
                    resizeMode="contain"
                    onError={() => setDocFailed(true)}
                  />
                ) : (
                  <EmptyState icon={FileText} title="Unable to preview this document" actionLabel="Open in new tab" onAction={() => openExternal(selectedDocument.fileUrl)} />
                )}
              </View>

              <View style={styles.docFoot}>
                <Text style={[type.caption, { color: color.textMuted, flex: 1 }]}>Tap outside to close</Text>
                <Text style={[type.caption, { color: color.primary }]}>{selectedDocument.type?.toUpperCase() || 'DOCUMENT'}</Text>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errIcon: { width: 56, height: 56, borderRadius: radii.lg, backgroundColor: color.dangerSoft, alignItems: 'center', justifyContent: 'center' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  rowGap: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  hero: { width: '100%', backgroundColor: color.surfaceMuted, borderBottomLeftRadius: radii.xl, borderBottomRightRadius: radii.xl, overflow: 'hidden' },
  heroText: { position: 'absolute', bottom: space.xl, left: space.xl, right: space.xl, gap: space.xs },
  heroTitle: { ...type.heading, fontSize: 24, lineHeight: 30, color: color.textInverse },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: space.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  onPhoto: { backgroundColor: 'rgba(255,255,255,0.92)', ...elevation.card },
  liveChip: { alignSelf: 'center', ...elevation.card },
  typeChip: { alignSelf: 'flex-start', paddingHorizontal: space.sm, height: 24, justifyContent: 'center', borderRadius: radii.pill, backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  inventoryBtn: { backgroundColor: color.primaryDeep, padding: space.lg, borderRadius: radii.lg, flexDirection: 'row', alignItems: 'center', gap: space.lg, ...elevation.card },
  inventoryIcon: { width: 48, height: 48, borderRadius: radii.md, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  gridCard: { backgroundColor: color.surface, padding: space.md, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border, gap: space.md, minHeight: 104, ...elevation.card },
  gridIcon: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  sheet: { backgroundColor: color.surface, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, overflow: 'hidden', position: 'absolute', bottom: 0, left: 0, right: 0, ...elevation.sheet },
  sheetHead: { paddingHorizontal: space.sm, paddingTop: space.sm, paddingBottom: space.xs, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border, backgroundColor: color.surface },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: color.borderStrong, alignSelf: 'center', marginBottom: space.xs },
  card: { backgroundColor: color.surface, padding: space.lg, borderRadius: radii.lg, borderWidth: 1, borderColor: color.border },
  label: { ...type.caption, color: color.textMuted },
  sub: { ...type.overline, color: color.textMuted, marginBottom: space.md },
  coverTag: { position: 'absolute', bottom: space.md, left: space.md, flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.md, height: 28, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: radii.pill },
  dashed: { backgroundColor: color.surfaceMuted, borderRadius: radii.md, borderWidth: 1, borderStyle: 'dashed', borderColor: color.borderStrong, paddingVertical: space.xxl },
  amenity: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, minHeight: 36, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, borderRadius: radii.pill },
  nearbyCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  miniChip: { paddingHorizontal: space.sm, height: 24, justifyContent: 'center', backgroundColor: color.surfaceMuted, borderRadius: radii.pill },
  cap: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  capText: { ...type.small, color: color.textSecondary },
  docIcon: { width: 40, height: 40, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  carousel: { height: 256, width: '100%', backgroundColor: color.surfaceMuted, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, overflow: 'hidden' },
  carBtn: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.92)', ...elevation.card },
  counter: { position: 'absolute', bottom: space.lg, right: space.lg, paddingHorizontal: space.md, height: 24, justifyContent: 'center', backgroundColor: color.overlay, borderRadius: radii.pill },
  dotsRow: { position: 'absolute', bottom: space.lg, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  capBox: { flex: 1, padding: space.md, backgroundColor: color.surfaceMuted, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', gap: space.xxs },
  pricingHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: space.lg, minHeight: 52, backgroundColor: color.surfaceMuted },
  roomAmenity: { width: '48.5%', flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md, backgroundColor: color.surface, borderWidth: 1, borderColor: color.border, borderRadius: radii.md },
  docWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg },
  docCard: { width: '100%', maxWidth: 896, backgroundColor: color.surface, borderRadius: radii.lg, overflow: 'hidden', ...elevation.sheet },
  docHead: { paddingLeft: space.lg, paddingRight: space.sm, paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: color.border, backgroundColor: color.surface, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  docHeadIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  docBody: { flex: 1, backgroundColor: color.surfaceMuted, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  docFoot: { paddingHorizontal: space.lg, paddingVertical: space.md, borderTopWidth: 1, borderTopColor: color.border, backgroundColor: color.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
});

export default PartnerPropertyDetails;
