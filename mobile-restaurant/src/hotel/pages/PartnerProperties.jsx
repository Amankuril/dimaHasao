import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertTriangle, Building2, ImageOff, MapPin, Pencil, PlusCircle, Trash2, Eye } from 'lucide-react-native';
import { useNavigate } from '../../lib/webRouter';
import Img from '../../components/Img';
import { Button, Card, Chip, ChipRow, EmptyState, IconButton, SectionHeader, StatusBadge } from '../../components/ds';
import { color, elevation, radii, space, type } from '../../theme';
import { propertyService } from '../services/apiService';
import PartnerHeader from '../components/PartnerHeader';
import { approvalTone, sentence } from '../components/dashboard/partnerUi';

/* Port of Frontend/src/modules/Hotel/app/partner/pages/PartnerProperties.jsx. */

// A lodge is a roomed property, so it edits through the hotel wizard.
const EDIT_WIZARD_BY_TYPE = {
  hotel: '/hotel/partner/join-hotel',
  lodge: '/hotel/partner/join-lodge',
  resort: '/hotel/partner/join-resort',
  homestay: '/hotel/partner/join-homestay',
};

const PartnerProperties = () => {
  const navigate = useNavigate();
  const insets = useSafeAreaInsets();
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

  const renderCard = (property) => {
    const st = approvalTone(property.status);
    return (
      <Card key={property._id} style={styles.card}>
        {/* Photo & status */}
        <View style={styles.imageBox}>
          {property.coverImage ? (
            <Img source={{ uri: property.coverImage }} accessibilityLabel={property.propertyName} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <View style={styles.noImage}>
              <ImageOff size={24} color={color.textDisabled} />
              <Text style={[type.caption, { color: color.textMuted }]}>No image</Text>
            </View>
          )}
          <StatusBadge label={st.label} tone={st.tone} style={styles.statusBadge} />
          {property.propertyImages && property.propertyImages.length > 0 ? (
            <View style={styles.photoCount}>
              <Text style={[type.caption, { color: color.textInverse }]}>
                {property.propertyImages.length} photo{property.propertyImages.length === 1 ? '' : 's'}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Info */}
        <View style={{ gap: space.xs }}>
          <Text style={styles.name} numberOfLines={2}>
            {property.propertyName}
          </Text>
          <View style={styles.cityRow}>
            <MapPin size={16} color={color.textMuted} />
            <Text style={styles.city} numberOfLines={1}>
              {property.address?.city || 'Unknown City'}
              {property.address?.state ? `, ${property.address.state}` : ''}
            </Text>
          </View>
          <Text style={styles.short} numberOfLines={2}>
            {property.shortDescription || 'No description provided'}
          </Text>
        </View>

        {/* Bottom Buttons */}
        <View style={styles.actions}>
          <Button title="Edit" icon={Pencil} variant="secondary" size="md" onPress={() => handleEditProperty(property)} style={{ flex: 1 }} accessibilityLabel={`Edit ${property.propertyName}`} />
          <Button title="Details" icon={Eye} variant="outline" size="md" onPress={() => handleViewDetails(property)} style={{ flex: 1 }} accessibilityLabel={`Details of ${property.propertyName}`} />
          <IconButton icon={Trash2} variant="danger" label={`Delete ${property.propertyName}`} size={48} onPress={() => setPropertyToDelete(property)} style={{ borderRadius: radii.md }} />
        </View>
      </Card>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <PartnerHeader title="My Properties" subtitle="Manage your listings by property type" />

      <ScrollView contentContainerStyle={{ paddingTop: space.lg, paddingBottom: space.xxxl + insets.bottom }}>
        <View style={styles.titleRow}>
          <SectionHeader title="Your listings" style={{ marginBottom: 0, flex: 1 }} />
          <Button title="Add new" icon={PlusCircle} size="sm" fullWidth={false} onPress={handleAddProperty} style={{ minHeight: 44 }} />
        </View>

        {/* Filter Tabs */}
        {sections.length > 0 ? (
          <ChipRow style={{ flexGrow: 0, marginBottom: space.lg }}>
            {['All', ...Object.keys(propertiesByType)].map((filterType) => {
              const displayName =
                filterType === 'All' ? 'All properties' : propertiesByType[filterType][0]?.dynamicCategory?.displayName || sentence(filterType);
              return (
                <Chip
                  key={filterType}
                  label={displayName}
                  count={filterType === 'All' ? undefined : propertiesByType[filterType].length}
                  selected={activeFilter === filterType}
                  onPress={() => setActiveFilter(filterType)}
                />
              );
            })}
          </ChipRow>
        ) : null}

        <View style={{ paddingHorizontal: space.lg }}>
          {error ? (
            <View style={styles.error} accessibilityRole="alert">
              <AlertTriangle size={18} color={color.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator size="small" color={color.primary} />
              <Text style={[type.small, { color: color.textMuted }]}>Loading properties...</Text>
            </View>
          ) : null}

          {!loading && sections.length === 0 ? (
            <EmptyState icon={Building2} title="No properties yet" message="No properties found. Start by adding your first property." actionLabel="Add property" onAction={handleAddProperty} />
          ) : null}

          <View style={{ gap: space.xxl }}>
            {filteredSections.map(([type, list]) => (
              <View key={type} style={{ gap: space.md }}>
                <View>
                  <Text style={styles.typeTitle}>{list[0]?.dynamicCategory?.displayName || sentence(type)}</Text>
                  <Text style={styles.typeCount}>
                    {list.length} {list.length === 1 ? 'property' : 'properties'}
                  </Text>
                </View>
                {list.map(renderCard)}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal visible={Boolean(propertyToDelete)} transparent animationType="fade" onRequestClose={() => setPropertyToDelete(null)} statusBarTranslucent>
        <View style={styles.modalWrap}>
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: color.overlay }]} onPress={() => setPropertyToDelete(null)} accessibilityLabel="Cancel" />
          <View style={styles.modalCard}>
            <View style={styles.trashCircle}>
              <Trash2 size={24} color={color.danger} />
            </View>
            <Text style={styles.modalTitle}>Delete property?</Text>
            <Text style={styles.modalBody}>
              Are you sure you want to delete <Text style={{ ...type.bodyStrong, color: color.text }}>{propertyToDelete?.propertyName}</Text>? This action cannot be undone and will delete all associated rooms and data.
            </Text>
            <View style={{ flexDirection: 'row', gap: space.md, alignSelf: 'stretch' }}>
              <Button title="Cancel" variant="outline" onPress={() => setPropertyToDelete(null)} disabled={isDeleting} style={{ flex: 1 }} />
              <Button title={isDeleting ? 'Deleting...' : 'Delete'} icon={Trash2} variant="danger" onPress={handleDeleteProperty} loading={isDeleting} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, paddingHorizontal: space.lg, marginBottom: space.md },
  error: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.lg, backgroundColor: color.dangerSoft, borderRadius: radii.md, padding: space.md },
  errorText: { ...type.small, color: color.danger, flex: 1 },
  loading: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.lg },
  typeTitle: { ...type.subheading, color: color.text },
  typeCount: { ...type.caption, color: color.textMuted },
  card: { gap: space.md },
  imageBox: { width: '100%', aspectRatio: 16 / 9, borderRadius: radii.lg, overflow: 'hidden', backgroundColor: color.surfaceMuted },
  noImage: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.xs },
  statusBadge: { position: 'absolute', top: space.sm, left: space.sm },
  photoCount: { position: 'absolute', bottom: space.sm, right: space.sm, paddingHorizontal: space.sm, height: 24, borderRadius: radii.pill, backgroundColor: color.overlay, justifyContent: 'center' },
  name: { ...type.subheading, color: color.text },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2 },
  city: { ...type.small, color: color.textSecondary, flex: 1, minWidth: 0 },
  short: { ...type.small, color: color.textMuted },
  actions: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  modalWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg },
  modalCard: { width: '100%', maxWidth: 384, backgroundColor: color.surface, borderRadius: radii.xl, padding: space.xxl, alignItems: 'center', ...elevation.sheet },
  trashCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: color.dangerSoft, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg },
  modalTitle: { ...type.heading, color: color.text, marginBottom: space.sm },
  modalBody: { ...type.body, color: color.textSecondary, textAlign: 'center', marginBottom: space.xxl },
});

export default PartnerProperties;
