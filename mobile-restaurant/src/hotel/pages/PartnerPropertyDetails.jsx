import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  MapPin, IndianRupee, Users, BedDouble, ArrowLeft, CheckCircle,
  X, ChevronRight, Info, FileText, Image as ImageIcon, List,
  Clock, Map, Calendar, ChevronLeft, Download,
} from 'lucide-react-native';
import { useNavigate, useParams } from '../../lib/webRouter';
import { openExternal } from '../../lib/links';
import Img from '../../components/Img';
import { BottomSheet } from '../../components/kit';
import { Press } from '../../components/ui';
import { poppins, shadow, tw } from '../../theme';
import { propertyService } from '../services/apiService';
import { HT } from '../theme';

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
    return (
      <View style={[styles.center, { backgroundColor: HT.bg }]}>
        <ActivityIndicator size="large" color={tw.emerald600} />
      </View>
    );
  }

  if (error || !property) {
    return (
      <View style={[styles.center, { backgroundColor: HT.bg, padding: 16 }]}>
        <Text style={{ color: tw.red500, marginBottom: 16, textAlign: 'center', fontSize: 16, lineHeight: 24, ...poppins(400) }}>{error || 'Property not found'}</Text>
        <Pressable onPress={() => navigate(-1)} accessibilityRole="button">
          <Text style={{ color: tw.gray600, textDecorationLine: 'underline', fontSize: 16, lineHeight: 24, ...poppins(400) }}>Go Back</Text>
        </Pressable>
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

  const renderSection = () => {
    switch (activeSection) {
      case 'basic':
        return (
          <View style={{ gap: 16 }}>
            <View style={[card, { gap: 8 }]}>
              <Text style={styles.label}>Property Name</Text>
              <Text style={{ fontSize: 18, lineHeight: 28, color: tw.gray900, ...poppins(500) }}>{property.propertyName}</Text>
            </View>
            <View style={[card, { gap: 8 }]}>
              <Text style={styles.label}>Description</Text>
              <Text style={{ fontSize: 14, lineHeight: 22.75, color: tw.gray600, ...poppins(400) }}>{property.description}</Text>
            </View>
            <View style={[card, { gap: 8 }]}>
              <Text style={styles.label}>Contact Number</Text>
              <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(500) }}>{property.contactNumber || 'Not provided'}</Text>
            </View>
          </View>
        );
      case 'location':
        return (
          <View style={{ gap: 16 }}>
            <View style={card}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                <MapPin size={20} color={tw.emerald600} style={{ marginTop: 4 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(700) }}>Address</Text>
                  <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray600, marginTop: 4, ...poppins(400) }}>{property.address?.fullAddress}</Text>
                  <Text style={{ fontSize: 12, lineHeight: 16, color: tw.gray400, marginTop: 8, ...poppins(400) }}>
                    {property.address?.city}, {property.address?.state} - {property.address?.pincode}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        );
      case 'images': {
        const imgW = (screenW - 32 - 12) / 2;
        return (
          <View style={{ gap: 12, paddingBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ImageIcon size={16} color={tw.emerald600} />
                <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(700) }}>Property Photos</Text>
              </View>
              <Text style={{ fontSize: 12, lineHeight: 16, color: tw.gray400, ...poppins(500) }}>
                {(property.coverImage ? 1 : 0) + (property.propertyImages?.length || 0)} images
              </Text>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {property.coverImage ? (
                <View style={{ width: '100%', aspectRatio: 16 / 10, borderRadius: 16, overflow: 'hidden', backgroundColor: tw.gray100, ...shadow('md') }}>
                  <Img source={{ uri: property.coverImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  <LinearGradient colors={['rgba(0,0,0,0.4)', 'transparent']} start={{ x: 0, y: 1 }} end={{ x: 0, y: 0.5 }} style={StyleSheet.absoluteFill} />
                  <View style={styles.coverTag}>
                    <ImageIcon size={12} color={tw.gray900} />
                    <Text style={{ fontSize: 12, lineHeight: 16, color: tw.gray900, ...poppins(700) }}>Cover Photo</Text>
                  </View>
                </View>
              ) : null}

              {property.propertyImages?.map((img, i) => (
                <View key={i} style={{ width: imgW, aspectRatio: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: tw.gray100, ...shadow('sm') }}>
                  <Img source={{ uri: img }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                </View>
              ))}
            </View>

            {!property.coverImage && (!property.propertyImages || property.propertyImages.length === 0) ? (
              <View style={styles.noPhotos}>
                <ImageIcon size={32} color={tw.gray400} style={{ opacity: 0.3, marginBottom: 8 }} />
                <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray400, ...poppins(400) }}>No property photos added.</Text>
              </View>
            ) : null}
          </View>
        );
      }
      case 'amenities':
        return (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {property.amenities?.map((am, i) => (
              <View key={i} style={styles.amenity}>
                <CheckCircle size={12} color={tw.emerald500} />
                <Text style={{ fontSize: 12, lineHeight: 16, color: tw.gray700, ...poppins(700) }}>{am}</Text>
              </View>
            ))}
          </View>
        );
      case 'nearby':
        return (
          <View style={{ gap: 12 }}>
            {property.nearbyPlaces?.map((place, i) => (
              <View key={i} style={[card, { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12 }]}>
                <View style={styles.nearbyCircle}>
                  <Text style={{ color: tw.emerald600, fontSize: 16, lineHeight: 24, ...poppins(700) }}>{place.name?.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(700) }}>{place.name}</Text>
                  <Text style={{ fontSize: 12, lineHeight: 16, color: tw.gray500, textTransform: 'capitalize', ...poppins(400) }}>
                    {place.type?.replace('_', ' ')} • {place.distanceKm}km
                  </Text>
                </View>
              </View>
            ))}
            {!property.nearbyPlaces || property.nearbyPlaces.length === 0 ? (
              <Text style={{ textAlign: 'center', fontSize: 14, lineHeight: 20, color: tw.gray400, paddingVertical: 16, ...poppins(400) }}>No nearby places added.</Text>
            ) : null}
          </View>
        );
      case 'rooms':
        return (
          <View style={{ gap: 12, paddingHorizontal: 16 }}>
            {roomTypes.length > 0 ? (
              roomTypes.map((room) => (
                <Press key={room._id} onPress={() => setSelectedRoom(room)} scale={0.98} style={[styles.roomCard]}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray900, marginBottom: 4, ...poppins(700) }}>{room.name}</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                        <View style={[styles.chip, { backgroundColor: tw.emerald50 }]}>
                          <Text style={{ fontSize: 10, lineHeight: 15, textTransform: 'uppercase', color: tw.emerald700, ...poppins(700) }}>{room.roomCategory}</Text>
                        </View>
                        <View style={[styles.chip, { backgroundColor: tw.gray100 }]}>
                          <Text style={{ fontSize: 10, lineHeight: 15, textTransform: 'capitalize', color: tw.gray600, ...poppins(500) }}>{room.inventoryType}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 18, lineHeight: 28, color: tw.emerald700, ...poppins(700) }}>₹{room.pricePerNight}</Text>
                      <Text style={{ fontSize: 10, lineHeight: 15, color: tw.gray400, ...poppins(500) }}>/ night</Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={styles.cap}>
                      <Users size={12} color={tw.gray500} />
                      <Text style={styles.capText}>{room.maxAdults} Adults</Text>
                    </View>
                    <View style={styles.cap}>
                      <Users size={12} color={tw.gray500} />
                      <Text style={styles.capText}>{room.maxChildren} Children</Text>
                    </View>
                    <View style={styles.cap}>
                      <BedDouble size={12} color={tw.gray500} />
                      <Text style={styles.capText}>{room.totalInventory} Units</Text>
                    </View>
                  </View>

                  {room.amenities && room.amenities.length > 0 ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                      {room.amenities.slice(0, 3).map((am, idx) => (
                        <View key={idx} style={styles.miniChip}>
                          <Text style={{ fontSize: 10, lineHeight: 15, color: tw.gray600, ...poppins(500) }}>{am}</Text>
                        </View>
                      ))}
                      {room.amenities.length > 3 ? (
                        <View style={styles.miniChip}>
                          <Text style={{ fontSize: 10, lineHeight: 15, color: tw.gray500, ...poppins(500) }}>+{room.amenities.length - 3} more</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: tw.gray100, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 12, lineHeight: 16, color: tw.gray400, ...poppins(500) }}>Tap to view full details</Text>
                    <ChevronRight size={14} color={tw.gray300} />
                  </View>
                </Press>
              ))
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <BedDouble size={48} color={tw.gray400} style={{ opacity: 0.2, marginBottom: 8 }} />
                <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray400, ...poppins(400) }}>No room types added yet.</Text>
              </View>
            )}
          </View>
        );
      case 'rules':
        return (
          <View style={{ gap: 16 }}>
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <View style={[card, { flex: 1, padding: 12 }]}>
                <Text style={[styles.label, { marginBottom: 4 }]}>Check-in</Text>
                <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(700) }}>{property.checkInTime || 'N/A'}</Text>
              </View>
              <View style={[card, { flex: 1, padding: 12 }]}>
                <Text style={[styles.label, { marginBottom: 4 }]}>Check-out</Text>
                <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(700) }}>{property.checkOutTime || 'N/A'}</Text>
              </View>
            </View>

            <View style={[card, { gap: 8 }]}>
              <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(700) }}>Cancellation Policy</Text>
              <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray600, ...poppins(400) }}>{property.cancellationPolicy || 'No policy specified.'}</Text>
            </View>

            <View style={[card, { gap: 8 }]}>
              <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(700) }}>House Rules</Text>
              {property.houseRules && property.houseRules.length > 0 ? (
                <View style={{ gap: 4 }}>
                  {property.houseRules.map((rule, i) => (
                    <View key={i} style={{ flexDirection: 'row', gap: 8 }}>
                      <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray600, ...poppins(400) }}>{'•'}</Text>
                      <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: tw.gray600, ...poppins(400) }}>{rule}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray400, fontStyle: 'italic', ...poppins(400) }}>No specific house rules.</Text>
              )}
            </View>
          </View>
        );
      case 'documents':
        return (
          <View style={{ gap: 12 }}>
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
                style={[card, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 12 }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                  <View style={[styles.docIcon, { backgroundColor: doc.fileUrl ? tw.emerald50 : tw.red50 }]}>
                    <FileText size={16} color={doc.fileUrl ? tw.emerald600 : tw.red500} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, lineHeight: 16, color: tw.gray900, ...poppins(700) }}>{doc.name}</Text>
                    <Text style={{ fontSize: 10, lineHeight: 15, textTransform: 'uppercase', color: doc.fileUrl ? tw.emerald600 : tw.red500, ...poppins(700) }}>
                      {doc.fileUrl ? 'Uploaded' : 'Missing'}
                    </Text>
                  </View>
                </View>
                {doc.fileUrl ? (
                  <View style={{ padding: 8, backgroundColor: tw.gray50, borderRadius: 8 }}>
                    <ChevronRight size={16} color={tw.gray500} />
                  </View>
                ) : null}
              </Press>
            ))}
          </View>
        );
      default:
        return null;
    }
  };

  const heroH = Math.round(screenH * 0.35);

  return (
    <View style={{ flex: 1, backgroundColor: HT.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 80 + insets.bottom }}>
        <View style={[styles.hero, { height: heroH }]}>
          {property.coverImage ? (
            <Img source={{ uri: property.coverImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: tw.gray100 }}>
              <ImageIcon size={48} color={tw.gray400} style={{ opacity: 0.2 }} />
            </View>
          )}
          <LinearGradient colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(0,0,0,0.6)']} style={StyleSheet.absoluteFill} />

          <View style={{ position: 'absolute', bottom: 24, left: 24, right: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <View style={styles.typeChip}>
                <Text style={{ fontSize: 10, lineHeight: 15, letterSpacing: 1.5, textTransform: 'uppercase', color: '#fff', ...poppins(700) }}>{property.propertyType}</Text>
              </View>
            </View>
            <Text style={{ fontSize: 24, lineHeight: 30, color: '#fff', marginBottom: 4, textShadowColor: 'rgba(0,0,0,0.25)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 3, ...poppins(700) }}>{property.propertyName}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, opacity: 0.9 }}>
              <MapPin size={12} color={tw.gray100} />
              <Text style={{ flex: 1, fontSize: 12, lineHeight: 16, color: tw.gray100, ...poppins(500) }} numberOfLines={1}>
                {property.address?.fullAddress}
              </Text>
            </View>
          </View>
        </View>

        {/* Sections Grid */}
        <View style={{ paddingHorizontal: 16, paddingTop: 24, gap: 12 }}>
          <Press onPress={() => navigate(`/hotel/partner/inventory/${id}`)} scale={0.99} style={styles.inventoryBtn}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1 }}>
              <View style={styles.inventoryIcon}>
                <Calendar size={24} color="#fff" />
              </View>
              <View>
                <Text style={{ fontSize: 16, lineHeight: 24, color: '#fff', ...poppins(700) }}>Manage Inventory</Text>
                <Text style={{ fontSize: 12, lineHeight: 16, color: 'rgba(255,255,255,0.8)', marginTop: 2, ...poppins(400) }}>Availability & Manual Blocks</Text>
              </View>
            </View>
            <ChevronRight size={20} color="rgba(255,255,255,0.8)" />
          </Press>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <Press key={section.id} onPress={() => setActiveSection(section.id)} scale={0.98} style={[styles.gridCard, { width: (screenW - 32 - 12) / 2 }]}>
                  <View style={styles.gridIcon}>
                    <Icon size={16} color={tw.gray500} />
                  </View>
                  <View style={{ width: '100%' }}>
                    <Text style={{ fontSize: 12, lineHeight: 16, color: tw.gray900, marginBottom: 2, ...poppins(700) }}>{section.label}</Text>
                    <Text style={{ fontSize: 10, lineHeight: 15, color: tw.gray400, ...poppins(500) }} numberOfLines={1}>{section.desc}</Text>
                  </View>
                  <View style={{ position: 'absolute', top: 12, right: 12 }}>
                    <ChevronRight size={14} color={tw.gray200} />
                  </View>
                </Press>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Custom header over the hero */}
      <View pointerEvents="box-none" style={[styles.topBar, { paddingTop: 16 + insets.top }]}>
        <Press onPress={() => navigate(-1)} accessibilityLabel="Back" style={styles.backBtn}>
          <ArrowLeft size={20} color={tw.gray700} />
        </Press>
        <View style={styles.liveChip}>
          <Text style={{ fontSize: 12, lineHeight: 16, letterSpacing: 0.6, textTransform: 'uppercase', color: property.isLive ? tw.emerald600 : tw.orange500, ...poppins(700) }}>
            {property.isLive ? 'Live' : property.status || 'Pending'}
          </Text>
        </View>
      </View>

      {/* Main Sections Bottom Sheet */}
      <BottomSheet
        visible={Boolean(activeSection)}
        onClose={() => setActiveSection(null)}
        backdrop="rgba(0,0,0,0.6)"
        blur={8}
        panelStyle={[styles.sheet, { height: Math.round(screenH * 0.85) }]}
      >
        <View style={styles.sheetHead}>
          <View style={styles.handle} />
          <Text style={{ fontSize: 16, lineHeight: 24, color: tw.gray800, textAlign: 'center', ...poppins(700) }}>
            {sections.find((s) => s.id === activeSection)?.label}
          </Text>
          <Press onPress={() => setActiveSection(null)} accessibilityLabel="Close" scale={0.9} style={styles.sheetClose}>
            <X size={16} color={tw.gray500} />
          </Press>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 + insets.bottom }} showsVerticalScrollIndicator={false}>
          {renderSection()}
        </ScrollView>
      </BottomSheet>

      {/* Room Details Bottom Sheet */}
      <BottomSheet
        visible={Boolean(selectedRoom)}
        onClose={closeRoom}
        backdrop="rgba(0,0,0,0.6)"
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
                <Img source={{ uri: roomImages[currentImageIndex] }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <BedDouble size={48} color={tw.gray400} style={{ opacity: 0.3 }} />
                </View>
              )}

              <Pressable onPress={closeRoom} accessibilityRole="button" accessibilityLabel="Close" style={[styles.carBtn, { top: 16, right: 16 }]}>
                <X size={20} color={tw.gray800} />
              </Pressable>

              {roomImages.length > 1 ? (
                <>
                  <Pressable
                    onPress={() => setCurrentImageIndex(Math.max(0, currentImageIndex - 1))}
                    disabled={currentImageIndex === 0}
                    accessibilityRole="button"
                    accessibilityLabel="Previous image"
                    style={[styles.carBtn, { left: 16, top: 112, opacity: currentImageIndex === 0 ? 0.3 : 1 }]}
                  >
                    <ChevronLeft size={20} color={tw.gray800} />
                  </Pressable>
                  <Pressable
                    onPress={() => setCurrentImageIndex(Math.min(roomImages.length - 1, currentImageIndex + 1))}
                    disabled={currentImageIndex === roomImages.length - 1}
                    accessibilityRole="button"
                    accessibilityLabel="Next image"
                    style={[styles.carBtn, { right: 16, top: 112, opacity: currentImageIndex === roomImages.length - 1 ? 0.3 : 1 }]}
                  >
                    <ChevronRight size={20} color={tw.gray800} />
                  </Pressable>

                  <View style={styles.counter}>
                    <Text style={{ fontSize: 12, lineHeight: 16, color: '#fff', ...poppins(500) }}>
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
                      style={{ height: 8, width: idx === currentImageIndex ? 24 : 8, borderRadius: 4, backgroundColor: idx === currentImageIndex ? '#fff' : 'rgba(255,255,255,0.5)' }}
                    />
                  ))}
                </View>
              ) : null}
            </View>

            {/* Room Details Body */}
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24, paddingBottom: 24 + insets.bottom }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 24 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 24, lineHeight: 30, color: tw.gray900, ...poppins(700) }}>{selectedRoom.name}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                      <View style={[styles.chip, { backgroundColor: tw.emerald50, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }]}>
                        <Text style={{ fontSize: 12, lineHeight: 16, letterSpacing: 0.6, textTransform: 'uppercase', color: tw.emerald700, ...poppins(700) }}>{selectedRoom.roomCategory}</Text>
                      </View>
                      <View style={[styles.chip, { backgroundColor: tw.gray100, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }]}>
                        <Text style={{ fontSize: 12, lineHeight: 16, textTransform: 'capitalize', color: tw.gray600, ...poppins(500) }}>{selectedRoom.inventoryType}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 20, lineHeight: 28, color: tw.emerald700, ...poppins(700) }}>₹{selectedRoom.pricePerNight}</Text>
                    <Text style={{ fontSize: 12, lineHeight: 16, color: tw.gray400, ...poppins(500) }}>/ night</Text>
                  </View>
                </View>

                <View>
                  <Text style={styles.sub}>Room Capacity</Text>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    {[
                      { Icon: Users, value: selectedRoom.maxAdults, label: 'Adults' },
                      { Icon: Users, value: selectedRoom.maxChildren, label: 'Children' },
                      { Icon: BedDouble, value: selectedRoom.totalInventory, label: 'Units' },
                    ].map(({ Icon, value, label }) => (
                      <View key={label} style={styles.capBox}>
                        <Icon size={20} color={tw.gray400} style={{ marginBottom: 4 }} />
                        <Text style={{ fontSize: 18, lineHeight: 28, color: tw.gray900, ...poppins(700) }}>{value}</Text>
                        <Text style={{ fontSize: 10, lineHeight: 15, textTransform: 'uppercase', color: tw.gray500, ...poppins(500) }}>{label}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Pricing Breakdown (Expandable) */}
                <View style={{ borderWidth: 1, borderColor: tw.gray100, borderRadius: 16, overflow: 'hidden' }}>
                  <Pressable onPress={() => setShowPricing(!showPricing)} accessibilityRole="button" style={styles.pricingHead}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <IndianRupee size={16} color={tw.emerald600} />
                      <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray700, ...poppins(700) }}>Pricing Details</Text>
                    </View>
                    <ChevronRight size={16} color={tw.gray400} style={{ transform: [{ rotate: showPricing ? '90deg' : '0deg' }] }} />
                  </Pressable>
                  {showPricing ? (
                    <View style={{ padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: tw.gray100, gap: 12 }}>
                      {[
                        ['Base Price (Per Night)', selectedRoom.pricePerNight],
                        ['Extra Adult Price', selectedRoom.extraAdultPrice],
                        ['Extra Child Price', selectedRoom.extraChildPrice],
                      ].map(([label, value]) => (
                        <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray500, ...poppins(400) }}>{label}</Text>
                          <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray900, ...poppins(500) }}>₹{value}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>

                {selectedRoom.amenities && selectedRoom.amenities.length > 0 ? (
                  <View>
                    <Text style={styles.sub}>Room Amenities</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {selectedRoom.amenities.map((am, idx) => (
                        <View key={idx} style={styles.roomAmenity}>
                          <View style={styles.amenityDot}>
                            <CheckCircle size={12} color={tw.emerald600} />
                          </View>
                          <Text style={{ flex: 1, fontSize: 12, lineHeight: 16, color: tw.gray700, ...poppins(500) }} numberOfLines={1}>{am}</Text>
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
        <View style={styles.docWrap}>
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.9)' }]} onPress={() => setSelectedDocument(null)} />
          {selectedDocument ? (
            <View style={[styles.docCard, { height: Math.round(screenH * 0.9) }]}>
              <View style={styles.docHead}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                  <View style={styles.docHeadIcon}>
                    <FileText size={20} color={tw.emerald600} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(700) }} numberOfLines={1}>{selectedDocument.name}</Text>
                    <Text style={{ fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(400) }}>Document Preview</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Press onPress={() => openExternal(selectedDocument.fileUrl)} style={styles.download}>
                    <Download size={16} color={tw.emerald700} />
                    <Text style={{ fontSize: 14, lineHeight: 20, color: tw.emerald700, ...poppins(600) }}>Download</Text>
                  </Press>
                  <Press onPress={() => setSelectedDocument(null)} accessibilityLabel="Close" style={{ padding: 8, backgroundColor: tw.gray100, borderRadius: 8 }}>
                    <X size={20} color={tw.gray600} />
                  </Press>
                </View>
              </View>

              <View style={styles.docBody}>
                {!docFailed ? (
                  <Img
                    source={{ uri: selectedDocument.fileUrl }}
                    style={{ width: '100%', height: '100%', borderRadius: 8 }}
                    resizeMode="contain"
                    onError={() => setDocFailed(true)}
                  />
                ) : (
                  <View style={{ width: '100%', height: 256, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <FileText size={48} color={tw.gray400} style={{ opacity: 0.3 }} />
                    <Text style={{ fontSize: 14, lineHeight: 20, color: tw.gray400, ...poppins(400) }}>Unable to preview this document</Text>
                    <Press onPress={() => openExternal(selectedDocument.fileUrl)} style={{ marginTop: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: tw.emerald600 }}>
                      <Text style={{ fontSize: 14, lineHeight: 20, color: '#fff', ...poppins(600) }}>Open in New Tab</Text>
                    </Press>
                  </View>
                )}
                <Press onPress={() => setSelectedDocument(null)} accessibilityLabel="Close" scale={0.95} style={styles.docFloatClose}>
                  <X size={24} color={tw.gray800} />
                </Press>
              </View>

              <View style={styles.docFoot}>
                <Text style={{ fontSize: 12, lineHeight: 16, color: tw.gray500, flex: 1, ...poppins(400) }}>Tap outside to close</Text>
                <Text style={{ fontSize: 12, lineHeight: 16, color: tw.emerald600, ...poppins(600) }}>
                  {selectedDocument.type?.toUpperCase() || 'DOCUMENT'}
                </Text>
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
  hero: { width: '100%', backgroundColor: tw.gray200, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: 'hidden', ...shadow('sm') },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 16, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center', ...shadow('sm') },
  liveChip: { paddingHorizontal: 12, paddingVertical: 4, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 999, ...shadow('sm') },
  typeChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  inventoryBtn: { backgroundColor: HT.primary, padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, ...shadow('0 10px 15px -3px rgba(6,56,30,0.1)') },
  inventoryIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  gridCard: { backgroundColor: '#fff', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: tw.gray100, gap: 12, alignItems: 'flex-start', overflow: 'hidden', ...shadow('0 2px 8px rgba(0,0,0,0.02)') },
  gridIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: tw.gray50, alignItems: 'center', justifyContent: 'center' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden', position: 'absolute', bottom: 0, left: 0, right: 0, ...shadow('0 -4px 30px rgba(0,0,0,0.15)') },
  sheetHead: { padding: 16, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: tw.gray50, backgroundColor: '#fff' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: tw.gray200, alignSelf: 'center', marginBottom: 16 },
  sheetClose: { position: 'absolute', top: 16, right: 16, padding: 6, backgroundColor: tw.gray100, borderRadius: 999 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: tw.gray100, ...shadow('sm') },
  label: { fontSize: 12, lineHeight: 16, textTransform: 'uppercase', color: tw.gray500, ...poppins(700) },
  sub: { fontSize: 12, lineHeight: 16, letterSpacing: 1.8, textTransform: 'uppercase', color: tw.gray400, marginBottom: 12, ...poppins(700) },
  coverTag: { position: 'absolute', bottom: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 8, ...shadow('lg') },
  noPhotos: { alignItems: 'center', paddingVertical: 32, backgroundColor: tw.gray50, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: tw.gray200 },
  amenity: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: tw.gray200, borderRadius: 8, ...shadow('sm') },
  nearbyCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: tw.emerald50, alignItems: 'center', justifyContent: 'center' },
  roomCard: { backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: tw.gray100, ...shadow('sm') },
  chip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  miniChip: { paddingHorizontal: 8, paddingVertical: 2, backgroundColor: tw.gray50, borderWidth: 1, borderColor: tw.gray100, borderRadius: 4 },
  cap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  capText: { fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(400) },
  docIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  carousel: { height: 256, width: '100%', backgroundColor: tw.gray100, borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' },
  carBtn: { position: 'absolute', padding: 8, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 999, ...shadow('lg') },
  counter: { position: 'absolute', bottom: 16, right: 16, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 999 },
  dotsRow: { position: 'absolute', bottom: 16, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  capBox: { flex: 1, padding: 12, backgroundColor: tw.gray50, borderRadius: 16, borderWidth: 1, borderColor: tw.gray100, alignItems: 'center', justifyContent: 'center', gap: 4 },
  pricingHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: 'rgba(249,250,251,0.5)' },
  roomAmenity: { width: '48.5%', flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: tw.gray100, borderRadius: 12 },
  amenityDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: tw.emerald50, alignItems: 'center', justifyContent: 'center' },
  docWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  docCard: { width: '100%', maxWidth: 896, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', ...shadow('2xl') },
  docHead: { paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: tw.gray100, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  docHeadIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: tw.emerald50, alignItems: 'center', justifyContent: 'center' },
  download: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: tw.emerald50, borderRadius: 8 },
  docBody: { flex: 1, backgroundColor: tw.gray50, alignItems: 'center', justifyContent: 'center', padding: 24 },
  docFloatClose: { position: 'absolute', top: 16, right: 16, padding: 12, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 999, ...shadow('lg') },
  docFoot: { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: tw.gray100, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
});

export default PartnerPropertyDetails;
