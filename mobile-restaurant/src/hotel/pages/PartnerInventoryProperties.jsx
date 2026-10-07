import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Building2, MapPin, CalendarDays } from 'lucide-react-native';
import { useNavigate } from '../../lib/webRouter';
import Img from '../../components/Img';
import { Press } from '../../components/ui';
import { poppins, shadow, tw } from '../../theme';
import { propertyService } from '../services/apiService';
import PartnerHeader from '../components/PartnerHeader';
import { HT } from '../theme';

/* Port of Frontend/src/modules/Hotel/app/partner/pages/PartnerInventoryProperties.jsx. */

const STATUS_STYLE = {
  approved: { bg: tw.emerald50, fg: tw.emerald700, border: tw.emerald100 },
  rejected: { bg: tw.red50, fg: tw.red700, border: tw.red100 },
};
const STATUS_DEFAULT = { bg: tw.yellow50, fg: tw.yellow700, border: tw.yellow100 };

const PartnerInventoryProperties = () => {
  const navigate = useNavigate();
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
    <View style={{ flex: 1, backgroundColor: HT.bg }}>
      <PartnerHeader title="Manage Inventory" subtitle="Select a property to update availability" />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 80 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Building2 size={14} color={tw.gray400} />
          <Text style={styles.sectionTitle}>My Properties</Text>
        </View>

        {error ? (
          <View style={styles.error}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 48 }}>
            <ActivityIndicator size="large" color={tw.emerald600} style={{ marginBottom: 8 }} />
            <Text style={styles.small}>Loading properties...</Text>
          </View>
        ) : null}

        {!loading && sections.length === 0 ? (
          <View style={{ marginTop: 32, alignItems: 'center' }}>
            <Text style={styles.small}>No properties found to manage.</Text>
          </View>
        ) : null}

        <View style={{ gap: 24 }}>
          {sections.map(([type, list]) => (
            <View key={type} style={styles.group}>
              <View style={styles.groupHead}>
                <Text style={styles.typeTitle}>{type.toUpperCase()}</Text>
                <Text style={styles.typeCount}>{list.length} properties</Text>
              </View>
              {list.map((property, index) => {
                const st = STATUS_STYLE[property.status] || STATUS_DEFAULT;
                return (
                  <Pressable
                    key={property._id}
                    onPress={() => handleManageInventory(property)}
                    style={[styles.row, index > 0 && { borderTopWidth: 1, borderTopColor: tw.gray100 }]}
                  >
                    <View style={styles.thumb}>
                      {property.coverImage ? (
                        <Img source={{ uri: property.coverImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      ) : (
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontSize: 10, lineHeight: 15, color: tw.gray400, ...poppins(400) }}>No Image</Text>
                        </View>
                      )}
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.name} numberOfLines={1}>
                        {property.propertyName}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <MapPin size={12} color={tw.gray400} />
                        <Text style={styles.city} numberOfLines={1}>
                          {property.address?.city || 'Unknown City'}, {property.address?.state || ''}
                        </Text>
                      </View>
                      <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={[styles.pill, { backgroundColor: st.bg, borderColor: st.border }]}>
                          <Text style={[styles.pillText, { color: st.fg }]}>{property.status}</Text>
                        </View>
                        <Press onPress={() => handleManageInventory(property)} style={styles.manage}>
                          <CalendarDays size={14} color="#fff" />
                          <Text style={styles.manageText}>Manage Inventory</Text>
                        </Press>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 12, lineHeight: 16, letterSpacing: 1.8, textTransform: 'uppercase', color: tw.gray400, ...poppins(700) },
  error: { marginBottom: 16, backgroundColor: tw.red50, borderWidth: 1, borderColor: tw.red200, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  errorText: { fontSize: 12, lineHeight: 16, color: tw.red700, ...poppins(400) },
  small: { fontSize: 12, lineHeight: 16, color: tw.gray500, textAlign: 'center', ...poppins(400) },
  group: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: tw.gray100, overflow: 'hidden', ...shadow('sm') },
  groupHead: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: tw.gray100 },
  typeTitle: { fontSize: 11, lineHeight: 16.5, letterSpacing: 1.65, color: tw.gray400, ...poppins(700) },
  typeCount: { fontSize: 11, lineHeight: 16.5, color: tw.gray500, ...poppins(400) },
  row: { paddingHorizontal: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 16 },
  thumb: { width: 64, height: 64, borderRadius: 16, backgroundColor: tw.gray100, overflow: 'hidden', borderWidth: 1, borderColor: tw.gray100, ...shadow('sm') },
  name: { fontSize: 16, lineHeight: 24, color: tw.gray900, ...poppins(700) },
  city: { flex: 1, fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(400) },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, borderWidth: 1 },
  pillText: { fontSize: 10, lineHeight: 15, textTransform: 'uppercase', ...poppins(700) },
  manage: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: tw.emerald600, ...shadow('0 4px 6px -1px rgba(167,243,208,1)') },
  manageText: { fontSize: 11, lineHeight: 16.5, color: '#fff', ...poppins(700) },
});

export default PartnerInventoryProperties;
