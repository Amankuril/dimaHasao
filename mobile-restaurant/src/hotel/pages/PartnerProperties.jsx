import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Building2, MapPin, Pencil, PlusCircle, Trash2, Eye } from 'lucide-react-native';
import { useNavigate } from '../../lib/webRouter';
import Img from '../../components/Img';
import { Press } from '../../components/ui';
import { poppins, shadow, tw } from '../../theme';
import { propertyService } from '../services/apiService';
import PartnerHeader from '../components/PartnerHeader';
import { HT } from '../theme';

/* Port of Frontend/src/modules/Hotel/app/partner/pages/PartnerProperties.jsx. */

// A lodge is a roomed property, so it edits through the hotel wizard.
const EDIT_WIZARD_BY_TYPE = {
  hotel: '/hotel/partner/join-hotel',
  lodge: '/hotel/partner/join-lodge',
  resort: '/hotel/partner/join-resort',
  homestay: '/hotel/partner/join-homestay',
};

const STATUS_BG = { published: '#10b981', rejected: '#ef4444' };

const PartnerProperties = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [propertiesByType, setPropertiesByType] = useState({});
  const [propertyToDelete, setPropertyToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');

  const fetchProperties = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await propertyService.getMy();
      const grouped = {};
      (res.properties || []).forEach((p) => {
        const type = p.propertyType || 'other';
        if (!grouped[type]) grouped[type] = [];
        grouped[type].push(p);
      });
      setPropertiesByType(grouped);
    } catch (e) {
      setError(e?.message || 'Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const handleAddProperty = () => {
    navigate('/hotel/partner/join');
  };

  const handleEditProperty = (property) => {
    const route = EDIT_WIZARD_BY_TYPE[property.propertyType];
    if (route) navigate(route, { state: { property } });
  };

  const handleViewDetails = (property) => {
    navigate(`/hotel/partner/properties/${property._id}`);
  };

  const handleDeleteProperty = async () => {
    if (!propertyToDelete) return;
    setIsDeleting(true);
    try {
      await propertyService.delete(propertyToDelete._id);

      // Update local state without refetching
      const updatedGroups = { ...propertiesByType };
      const type = propertyToDelete.propertyType || 'other';
      if (updatedGroups[type]) {
        updatedGroups[type] = updatedGroups[type].filter((p) => p._id !== propertyToDelete._id);
        if (updatedGroups[type].length === 0) {
          delete updatedGroups[type];
        }
      }
      setPropertiesByType(updatedGroups);
      setPropertyToDelete(null);
    } catch (e) {
      setError(e?.message || 'Failed to delete property');
    } finally {
      setIsDeleting(false);
    }
  };

  const sections = Object.entries(propertiesByType);
  const filteredSections = activeFilter === 'All' ? sections : sections.filter(([type]) => type === activeFilter);

  return (
    <View style={{ flex: 1, backgroundColor: HT.bg }}>
      <PartnerHeader title="My Properties" subtitle="Manage your listings by property type" />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 80 }}>
        <View style={styles.titleRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Building2 size={14} color={tw.gray400} />
            <Text style={styles.sectionTitle}>Your Listings</Text>
          </View>
          <Press onPress={handleAddProperty} style={styles.addBtn}>
            <PlusCircle size={14} color="#fff" />
            <Text style={styles.addText}>Add New</Text>
          </Press>
        </View>

        {/* Filter Tabs */}
        {sections.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: 16 }} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
            {['All', ...Object.keys(propertiesByType)].map((filterType) => {
              const displayName =
                filterType === 'All'
                  ? 'All Properties'
                  : propertiesByType[filterType][0]?.dynamicCategory?.displayName || filterType.toUpperCase();
              const active = activeFilter === filterType;
              return (
                <Press
                  key={filterType}
                  onPress={() => setActiveFilter(filterType)}
                  style={[styles.filter, active ? styles.filterOn : styles.filterOff]}
                >
                  <Text style={[styles.filterText, { color: active ? '#fff' : tw.gray500 }]}>{displayName}</Text>
                </Press>
              );
            })}
          </ScrollView>
        ) : null}

        {error ? (
          <View style={styles.error}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {loading ? <Text style={styles.loading}>Loading properties...</Text> : null}

        {!loading && sections.length === 0 ? (
          <View style={{ marginTop: 32, alignItems: 'center' }}>
            <Text style={styles.empty}>No properties found. Start by adding your first property.</Text>
          </View>
        ) : null}

        <View style={{ gap: 24, marginTop: 8 }}>
          {filteredSections.map(([type, list]) => (
            <View key={type} style={{ gap: 12 }}>
              <View style={{ paddingHorizontal: 4 }}>
                <Text style={styles.typeTitle}>{list[0]?.dynamicCategory?.displayName || type.toUpperCase()}</Text>
                <Text style={styles.typeCount}>
                  {list.length} {list.length === 1 ? 'property' : 'properties'}
                </Text>
              </View>
              <View style={{ gap: 16 }}>
                {list.map((property) => (
                  <View key={property._id} style={styles.card}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                      {/* Left: Info */}
                      <View style={{ flex: 1, paddingTop: 4, minWidth: 0 }}>
                        <Text style={styles.name} numberOfLines={1}>
                          {property.propertyName}
                        </Text>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <MapPin size={14} color={tw.gray400} />
                          <Text style={styles.city} numberOfLines={1}>
                            {property.address?.city || 'Unknown City'}, {property.address?.state || ''}
                          </Text>
                        </View>

                        <Text style={styles.short} numberOfLines={2}>
                          {property.shortDescription || 'No description provided'}
                        </Text>
                      </View>

                      {/* Right: Image & Badge */}
                      <View style={styles.imageBox}>
                        {property.coverImage ? (
                          <Img source={{ uri: property.coverImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                        ) : (
                          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontSize: 10, lineHeight: 15, color: tw.gray400, ...poppins(400) }}>No Image</Text>
                          </View>
                        )}
                        <View style={{ position: 'absolute', top: 6, right: 6 }}>
                          <View style={[styles.statusBadge, { backgroundColor: STATUS_BG[property.status] || '#f97316' }]}>
                            <Text style={styles.statusText}>
                              {property.status === 'published'
                                ? 'Active'
                                : property.status
                                  ? property.status.charAt(0).toUpperCase() + property.status.slice(1)
                                  : 'Pending'}
                            </Text>
                          </View>
                        </View>
                        {property.propertyImages && property.propertyImages.length > 0 ? (
                          <View style={styles.dots}>
                            <View style={[styles.dot, { backgroundColor: '#fff' }]} />
                            {property.propertyImages.slice(0, 2).map((_, idx) => (
                              <View key={idx} style={[styles.dot, { backgroundColor: 'rgba(255,255,255,0.5)' }]} />
                            ))}
                          </View>
                        ) : null}
                      </View>
                    </View>

                    {/* Bottom Buttons */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <Press onPress={() => handleEditProperty(property)} style={[styles.action, { backgroundColor: tw.blue50 }]}>
                        <Pencil size={14} color={HT.primary} />
                        <Text style={[styles.actionText, { color: HT.primary }]}>Edit</Text>
                      </Press>
                      <Press onPress={() => handleViewDetails(property)} style={[styles.action, { backgroundColor: tw.slate50 }]}>
                        <Eye size={14} color={tw.slate700} />
                        <Text style={[styles.actionText, { color: tw.slate700 }]}>Details</Text>
                      </Press>
                      <Press onPress={() => setPropertyToDelete(property)} style={[styles.action, { backgroundColor: tw.red50 }]}>
                        <Trash2 size={14} color={tw.red600} />
                        <Text style={[styles.actionText, { color: tw.red600 }]}>Delete</Text>
                      </Press>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal visible={Boolean(propertyToDelete)} transparent animationType="fade" onRequestClose={() => setPropertyToDelete(null)} statusBarTranslucent>
        <View style={styles.modalWrap}>
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} onPress={() => setPropertyToDelete(null)} />
          <View style={styles.modalCard}>
            <View style={styles.trashCircle}>
              <Trash2 size={24} color={tw.red600} />
            </View>
            <Text style={styles.modalTitle}>Delete Property?</Text>
            <Text style={styles.modalBody}>
              Are you sure you want to delete <Text style={{ color: tw.gray800, ...poppins(700) }}>{propertyToDelete?.propertyName}</Text>? This action cannot be undone and will delete all associated rooms and data.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Press onPress={() => setPropertyToDelete(null)} disabled={isDeleting} style={[styles.modalBtn, { backgroundColor: tw.gray100, opacity: isDeleting ? 0.5 : 1 }]}>
                <Text style={[styles.modalBtnText, { color: tw.gray700 }]}>Cancel</Text>
              </Press>
              <Press
                onPress={handleDeleteProperty}
                disabled={isDeleting}
                style={[styles.modalBtn, { backgroundColor: tw.red600, opacity: isDeleting ? 0.5 : 1, flexDirection: 'row', gap: 8 }, shadow('0 10px 15px -3px rgba(255,201,201,1)')]}
              >
                {isDeleting ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" style={{ transform: [{ scale: 0.7 }] }} />
                    <Text style={[styles.modalBtnText, { color: '#fff' }]}>Deleting...</Text>
                  </>
                ) : (
                  <Text style={[styles.modalBtnText, { color: '#fff' }]}>Delete</Text>
                )}
              </Press>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sectionTitle: { fontSize: 12, lineHeight: 16, letterSpacing: 1.8, textTransform: 'uppercase', color: tw.gray400, ...poppins(700) },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: HT.primary },
  addText: { fontSize: 11, lineHeight: 16.5, letterSpacing: 0.55, textTransform: 'uppercase', color: '#fff', ...poppins(700) },
  filter: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  filterOn: { backgroundColor: HT.primary, borderColor: HT.primary, ...shadow('sm') },
  filterOff: { backgroundColor: '#fff', borderColor: tw.gray200 },
  filterText: { fontSize: 11, lineHeight: 16.5, letterSpacing: 0.55, textTransform: 'uppercase', ...poppins(700) },
  error: { marginBottom: 16, backgroundColor: tw.red50, borderWidth: 1, borderColor: tw.red200, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  errorText: { fontSize: 12, lineHeight: 16, color: tw.red700, ...poppins(400) },
  loading: { fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(400) },
  empty: { fontSize: 12, lineHeight: 16, color: tw.gray500, textAlign: 'center', ...poppins(400) },
  typeTitle: { fontSize: 12, lineHeight: 16, letterSpacing: 1.8, textTransform: 'uppercase', color: tw.gray500, ...poppins(700) },
  typeCount: { fontSize: 11, lineHeight: 16.5, color: tw.gray400, ...poppins(400) },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: tw.gray100, gap: 16, ...shadow('0 2px 15px rgba(0,0,0,0.03)') },
  name: { fontSize: 18, lineHeight: 22.5, color: tw.slate900, marginBottom: 10, ...poppins(700) },
  city: { flex: 1, fontSize: 13, lineHeight: 19.5, color: tw.gray500, ...poppins(500) },
  short: { paddingLeft: 20, fontSize: 13, lineHeight: 19.5, color: tw.gray400, ...poppins(500) },
  imageBox: { width: 110, height: 80, borderRadius: 12, overflow: 'hidden', backgroundColor: tw.gray100, borderWidth: 1, borderColor: tw.gray50 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  statusText: { fontSize: 10, lineHeight: 15, color: '#fff', ...poppins(700) },
  dots: { position: 'absolute', bottom: 6, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  action: { flex: 1, paddingVertical: 10, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  actionText: { fontSize: 13, lineHeight: 19.5, ...poppins(700) },
  modalWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  modalCard: { width: '100%', maxWidth: 384, backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', ...shadow('xl') },
  trashCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: tw.red100, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, lineHeight: 28, color: tw.gray900, marginBottom: 8, ...poppins(700) },
  modalBody: { fontSize: 14, lineHeight: 20, color: tw.gray500, textAlign: 'center', marginBottom: 24, ...poppins(400) },
  modalBtn: { flex: 1, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalBtnText: { fontSize: 14, lineHeight: 20, ...poppins(700) },
});

export default PartnerProperties;
