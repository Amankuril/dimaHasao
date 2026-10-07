import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, Building2, CalendarDays, ChevronRight, ImageOff, MapPin } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigate } from '../../lib/webRouter';
import Img from '../../components/Img';
import { Card, EmptyState, SectionHeader, StatusBadge } from '../../components/ds';
import { color, radii, space, type } from '../../theme';
import { propertyService } from '../services/apiService';
import PartnerHeader from '../components/PartnerHeader';
import { approvalTone, sentence } from '../components/dashboard/partnerUi';

/* Port of Frontend/src/modules/Hotel/app/partner/pages/PartnerInventoryProperties.jsx. */

const PartnerInventoryProperties = () => {
  const navigate = useNavigate();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [propertiesByType, setPropertiesByType] = useState({});

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

  const handleManageInventory = (property) => {
    navigate(`/hotel/partner/inventory/${property._id}`);
  };

  const sections = Object.entries(propertiesByType);

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <PartnerHeader title="Manage Inventory" subtitle="Select a property to update availability" />

      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxxl + insets.bottom }}>
        <SectionHeader title="My properties" />
        <Text style={[type.small, { color: color.textMuted, marginTop: -space.xs, marginBottom: space.lg }]}>Select a property to update availability.</Text>

        {error ? (
          <View style={styles.error} accessibilityRole="alert">
            <AlertTriangle size={18} color={color.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: space.xxxl + space.lg, gap: space.sm }}>
            <ActivityIndicator size="large" color={color.primary} />
            <Text style={[type.small, { color: color.textMuted }]}>Loading properties...</Text>
          </View>
        ) : null}

        {!loading && sections.length === 0 ? <EmptyState icon={Building2} title="No properties found to manage." /> : null}

        <View style={{ gap: space.xxl }}>
          {sections.map(([pType, list]) => (
            <Card key={pType} padded={false} style={{ overflow: 'hidden' }}>
              <View style={styles.groupHead}>
                <Text style={[type.subheading, { color: color.text }]}>{sentence(pType)}</Text>
                <Text style={[type.caption, { color: color.textMuted }]}>
                  {list.length} {list.length === 1 ? 'property' : 'properties'}
                </Text>
              </View>
              {list.map((property, index) => {
                const st = approvalTone(property.status);
                return (
                  <Pressable
                    key={property._id}
                    onPress={() => handleManageInventory(property)}
                    accessibilityRole="button"
                    accessibilityLabel={`Manage inventory for ${property.propertyName}, ${st.label}`}
                    style={[styles.row, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border }]}
                  >
                    <View style={styles.thumb}>
                      {property.coverImage ? (
                        <Img source={{ uri: property.coverImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      ) : (
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                          <ImageOff size={20} color={color.textDisabled} />
                        </View>
                      )}
                    </View>
                    <View style={{ flex: 1, minWidth: 0, gap: space.xxs }}>
                      <Text style={[type.subheading, { color: color.text }]} numberOfLines={2}>
                        {property.propertyName}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                        <MapPin size={14} color={color.textMuted} />
                        <Text style={[type.small, { color: color.textMuted, flex: 1 }]} numberOfLines={1}>
                          {property.address?.city || 'Unknown City'}
                          {property.address?.state ? `, ${property.address.state}` : ''}
                        </Text>
                      </View>
                      <View style={styles.rowFoot}>
                        <StatusBadge label={st.label} tone={st.tone} />
                        <View style={styles.manage}>
                          <CalendarDays size={16} color={color.primary} />
                          <Text style={[type.label, { color: color.primary }]}>Manage</Text>
                          <ChevronRight size={16} color={color.primary} />
                        </View>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </Card>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  error: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.lg, backgroundColor: color.dangerSoft, borderRadius: radii.md, padding: space.md },
  errorText: { ...type.small, color: color.danger, flex: 1 },
  groupHead: { paddingHorizontal: space.lg, paddingVertical: space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border, backgroundColor: color.surfaceMuted },
  row: { padding: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.lg },
  thumb: { width: 72, height: 72, borderRadius: radii.md, backgroundColor: color.surfaceMuted, overflow: 'hidden' },
  rowFoot: { marginTop: space.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  manage: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: 32 },
});

export default PartnerInventoryProperties;
