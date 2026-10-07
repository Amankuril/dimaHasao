import { useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Bike, Camera, Eye, FileText, Image as ImageIcon, X } from 'lucide-react-native';
import { deliveryApi as deliveryAPI } from '../../../../../api/delivery';
import { mediaUrl } from '../../../../../api/client';
import { Button, Card, IconButton, ScreenHeader, StatusBadge } from '../../../../../components/ds';
import { Spinner } from '../../../../../components/Loader';
import useDeliveryBackNavigation from '../../../../../delivery/hooks/useDeliveryBackNavigation';
import { openCamera, openGallery, prepareUploadFile } from '../../../../../lib/images';
import { toast } from '../../../../../lib/notify';
import { color, elevation, radii, space, touch, type } from '../../../../../theme';

// Web: pages/profile/ProfileDocsV2.jsx. One card per document: status, preview, and re-upload.

const docStatus = (doc) => (!doc?.document ? 'Not Uploaded' : doc.verified ? 'Verified' : 'Pending Verification');
const STATUS_BADGE = {
  Verified: { tone: 'success', label: 'Verified' },
  'Pending Verification': { tone: 'warning', label: 'Pending verification' },
  'Not Uploaded': { tone: 'neutral', label: 'Not uploaded' },
};

export default function ProfileDocsV2() {
  const goBack = useDeliveryBackNavigation();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showViewer, setShowViewer] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const response = await deliveryAPI.getProfile();
        if (response?.data?.success) setProfile(response.data.data.profile);
      } catch {
        toast.error('Failed to load documents');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleUpdate = async (field, file) => {
    if (!file) return;
    const prepared = await prepareUploadFile(file, field === 'profilePhoto' ? { preset: 'profile' } : {});
    const formData = new FormData();
    formData.append(field, { uri: prepared.uri, name: prepared.name, type: prepared.type });
    try {
      const res = await deliveryAPI.updateProfileMultipart(formData);
      if (res?.data?.success) {
        toast.success('Document updated successfully');
        const updated = await deliveryAPI.getProfile();
        setProfile(updated.data.data.profile);
      }
    } catch {
      toast.error('Upload failed');
    }
  };

  if (loading) {
    return (
      <View style={styles.page}>
        <ScreenHeader title="Registration documents" onBack={goBack} />
        <View style={styles.center} accessibilityLabel="Loading documents">
          <Spinner size={32} color={color.primary} />
        </View>
      </View>
    );
  }

  const docs = [
    { label: 'Aadhar Card', field: 'aadharPhoto', data: profile?.documents?.aadhar },
    { label: 'PAN Card', field: 'panPhoto', data: profile?.documents?.pan },
    { label: 'Driving License', field: 'drivingLicensePhoto', data: profile?.documents?.drivingLicense },
  ];

  return (
    <View style={styles.page}>
      <ScreenHeader title="Registration documents" onBack={goBack} />

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: space.xxxl + insets.bottom }]}>
        <Card style={styles.vehicle}>
          <View style={styles.iconTile}>
            <Bike size={22} color={color.primary} />
          </View>
          <View style={styles.flexText}>
            <Text style={styles.caption}>Vehicle registered</Text>
            <Text style={styles.vehicleNo} numberOfLines={1}>
              {profile?.vehicle?.number || 'No number registered'}
            </Text>
            <Text style={styles.small} numberOfLines={1}>
              {(() => {
                const t = String(profile?.vehicle?.type || 'Standard Bike');
                return t.charAt(0).toUpperCase() + t.slice(1);
              })()}
            </Text>
          </View>
        </Card>

        {docs.map((doc) => {
          const badge = STATUS_BADGE[docStatus(doc.data)];
          return (
            <Card key={doc.field} style={styles.doc}>
              <View style={styles.docTop}>
                <View style={[styles.iconTile, { backgroundColor: color.surfaceMuted }]}>
                  <FileText size={20} color={color.textSecondary} />
                </View>
                <View style={styles.flexText}>
                  <Text style={styles.docLabel} numberOfLines={1}>
                    {doc.label}
                  </Text>
                  <StatusBadge tone={badge.tone} label={badge.label} />
                </View>
                {doc.data?.document ? (
                  <IconButton icon={Eye} label={`View ${doc.label}`} variant="soft" iconSize={20} onPress={() => setShowViewer({ title: doc.label, url: doc.data.document })} />
                ) : null}
              </View>
              {doc.data?.document ? (
                <View style={styles.thumb}>
                  <Image source={{ uri: mediaUrl(doc.data.document) }} resizeMode="cover" style={styles.thumbImg} accessibilityLabel={`Preview of ${doc.label}`} />
                </View>
              ) : null}
              <View style={styles.docActions}>
                <Button
                  title="Camera"
                  icon={Camera}
                  variant="secondary"
                  onPress={() => openCamera({ onSelectFile: (f) => handleUpdate(doc.field, f), fileNamePrefix: `profile-doc-${doc.field}` })}
                  accessibilityLabel={`Photograph ${doc.label}`}
                  style={styles.flex1}
                />
                <Button
                  title="Gallery"
                  icon={ImageIcon}
                  variant="outline"
                  onPress={() => openGallery({ onSelectFile: (f) => handleUpdate(doc.field, f), fileNamePrefix: `profile-doc-${doc.field}` })}
                  accessibilityLabel={`Choose ${doc.label} from gallery`}
                  style={styles.flex1}
                />
              </View>
            </Card>
          );
        })}

        <View style={styles.footer}>
          <FileText size={24} color={color.textMuted} />
          <Text style={styles.footerText}>Official fleet identity</Text>
        </View>
      </ScrollView>

      <Modal visible={Boolean(showViewer)} transparent animationType="fade" onRequestClose={() => setShowViewer(null)} statusBarTranslucent>
        <View style={[styles.viewerWrap, { paddingTop: space.xxl + insets.top, paddingBottom: space.xxl + insets.bottom }]}>
          <BlurView intensity={48} tint="dark" style={StyleSheet.absoluteFill} experimentalBlurMethod="dimezisBlurView" />
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.9)' }]} onPress={() => setShowViewer(null)} accessibilityLabel="Close" />
          <View style={styles.viewer}>
            <View style={styles.viewerHead}>
              <Text style={styles.viewerTitle} numberOfLines={1}>
                {showViewer?.title}
              </Text>
              <IconButton icon={X} label="Close" variant="soft" onPress={() => setShowViewer(null)} />
            </View>
            <View style={{ padding: space.sm }}>
              {showViewer ? <Image source={{ uri: mediaUrl(showViewer.url) }} resizeMode="contain" style={{ width: '100%', height: height * 0.7, borderRadius: radii.lg }} /> : null}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  page: { flex: 1, backgroundColor: color.bg },
  body: { padding: space.lg, gap: space.md },
  iconTile: { width: touch, height: touch, borderRadius: radii.md, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center' },
  flexText: { flex: 1, minWidth: 0, gap: space.xs },
  caption: { ...type.caption, color: color.textMuted },
  small: { ...type.small, color: color.textSecondary },
  vehicle: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  vehicleNo: { ...type.heading, color: color.text },
  doc: { gap: space.lg },
  docTop: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  docLabel: { ...type.subheading, color: color.text },
  docActions: { flexDirection: 'row', gap: space.md },
  flex1: { flex: 1 },
  thumb: { width: 128, height: 84, borderRadius: radii.md, borderWidth: 1, borderColor: color.border, overflow: 'hidden', backgroundColor: color.surfaceMuted },
  thumbImg: { width: '100%', height: '100%' },
  footer: { paddingVertical: space.xxl, alignItems: 'center', gap: space.sm },
  footerText: { ...type.caption, color: color.textMuted },
  viewerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg },
  viewer: { width: '100%', maxWidth: 512, backgroundColor: color.surface, borderRadius: radii.xl, overflow: 'hidden', ...elevation.sheet },
  viewerHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, paddingLeft: space.lg, paddingRight: space.sm, paddingVertical: space.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  viewerTitle: { flex: 1, minWidth: 0, ...type.heading, color: color.text },
});
