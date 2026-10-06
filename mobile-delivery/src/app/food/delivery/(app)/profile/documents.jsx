import { useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { ArrowLeft, Camera, Eye, FileText, Image as ImageIcon, X } from 'lucide-react-native';
import { deliveryApi as deliveryAPI } from '../../../../../api/delivery';
import { mediaUrl } from '../../../../../api/client';
import { Spinner } from '../../../../../components/Loader';
import { Press } from '../../../../../components/ui';
import useDeliveryBackNavigation from '../../../../../delivery/hooks/useDeliveryBackNavigation';
import { openCamera, openGallery, prepareUploadFile } from '../../../../../lib/images';
import { toast } from '../../../../../lib/notify';
import { display, ff, shadow, tw } from '../../../../../theme';

// Web: pages/profile/ProfileDocsV2.jsx. `font-poppins` -> Nunito; bg-[#ff8100] -> primary.

const docStatus = (doc) => (!doc?.document ? 'Not Uploaded' : doc.verified ? 'Verified' : 'Pending Verification');

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
      <View style={styles.center}>
        <Spinner size={32} color={tw.primary} />
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
      <View style={[styles.header, shadow('sm'), { paddingTop: 20 + insets.top }]}>
        <Press onPress={goBack} accessibilityLabel="Back" hitSlop={10} style={[styles.back, shadow('sm')]}>
          <ArrowLeft size={16} color="#1F1F24" />
        </Press>
        <Text style={styles.title}>Registration Docs</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingTop: 96 + insets.top }]}>
        <View style={[styles.vehicle, shadow('card')]}>
          <View style={styles.vehicleBlob} />
          <Text style={styles.vehicleKicker}>Vehicle Registered</Text>
          <Text style={styles.vehicleNo}>{profile?.vehicle?.number || 'NO # REGISTERED'}</Text>
          <Text style={styles.vehicleType}>{profile?.vehicle?.type || 'Standard Bike'}</Text>
        </View>

        <View style={{ gap: 16 }}>
          {docs.map((doc) => (
            <View key={doc.field} style={[styles.doc, shadow('card')]}>
              <View style={styles.docTop}>
                <View>
                  <Text style={styles.docLabel}>{doc.label}</Text>
                  <Text style={styles.docStatus}>{docStatus(doc.data)}</Text>
                </View>
                <View style={styles.docActions}>
                  {doc.data?.document ? (
                    <Press onPress={() => setShowViewer({ title: doc.label, url: doc.data.document })} accessibilityLabel={`View ${doc.label}`} style={[styles.docBtn, { backgroundColor: tw.gray50 }]}>
                      <Eye size={20} color={tw.gray600} />
                    </Press>
                  ) : null}
                  <Press
                    onPress={() => openCamera({ onSelectFile: (f) => handleUpdate(doc.field, f), fileNamePrefix: `profile-doc-${doc.field}` })}
                    accessibilityLabel={`Photograph ${doc.label}`}
                    style={[styles.docBtn, { backgroundColor: tw.gray900 }]}
                  >
                    <Camera size={20} color="#fff" />
                  </Press>
                  <Press
                    onPress={() => openGallery({ onSelectFile: (f) => handleUpdate(doc.field, f), fileNamePrefix: `profile-doc-${doc.field}` })}
                    accessibilityLabel={`Choose ${doc.label} from gallery`}
                    style={[styles.docBtn, { backgroundColor: tw.primarySoft }]}
                  >
                    <ImageIcon size={20} color={tw.primary} />
                  </Press>
                </View>
              </View>
              {doc.data?.document ? (
                <View style={styles.thumb}>
                  {/* opacity-50 grayscale (grayscale needs Android's filter; iOS shows colour) */}
                  <Image source={{ uri: mediaUrl(doc.data.document) }} style={[styles.thumbImg, { filter: [{ grayscale: 1 }] }]} />
                </View>
              ) : null}
            </View>
          ))}
        </View>

        {/* mt-10 collapses with space-y-8's 32 px margin: 40 total */}
        <View style={styles.footer}>
          <FileText size={64} color="#1F1F24" style={{ marginBottom: 16 }} />
          <Text style={styles.footerText}>Official Fleet Identity</Text>
        </View>
      </ScrollView>

      <Modal visible={Boolean(showViewer)} transparent animationType="fade" onRequestClose={() => setShowViewer(null)} statusBarTranslucent>
        <View style={styles.viewerWrap}>
          <BlurView intensity={48} tint="dark" style={StyleSheet.absoluteFill} experimentalBlurMethod="dimezisBlurView" />
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.9)' }]} onPress={() => setShowViewer(null)} accessibilityLabel="Close" />
          <View style={[styles.viewer, shadow('card')]}>
            <View style={styles.viewerHead}>
              <Text style={styles.viewerTitle}>{showViewer?.title}</Text>
              <Press onPress={() => setShowViewer(null)} accessibilityLabel="Close" style={styles.viewerClose}>
                <X size={24} color={tw.gray400} />
              </Press>
            </View>
            <View style={{ padding: 8 }}>
              {showViewer ? <Image source={{ uri: mediaUrl(showViewer.url) }} resizeMode="contain" style={{ width: '100%', height: height * 0.7, borderRadius: 16 }} /> : null}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: tw.gray50 },
  page: { flex: 1, backgroundColor: tw.gray50 },
  header: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50, backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 16 },
  // w-6 h-6 p-1 rounded-full on the icon itself: a 16 px glyph in a 24 px chip
  back: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(249,250,251,0.7)', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, lineHeight: 28, color: '#1F1F24', ...display(900, 20) },
  body: { paddingHorizontal: 16, paddingBottom: 80, gap: 32 },
  vehicle: { backgroundColor: tw.primary, borderRadius: 16, padding: 17.6, gap: 8, overflow: 'hidden' },
  vehicleBlob: { position: 'absolute', top: -80, right: -80, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.1)' },
  vehicleKicker: { fontSize: 10, lineHeight: 15, color: '#fff', opacity: 0.8, textTransform: 'uppercase', ...display(900, 10) },
  vehicleNo: { fontSize: 24, lineHeight: 32, color: '#fff', ...display(900, 24) },
  vehicleType: { fontSize: 10, lineHeight: 15, color: '#fff', opacity: 0.7, letterSpacing: 1, textTransform: 'uppercase', ...ff(700) },
  doc: { backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#E5DDC3', gap: 16 },
  docTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  docLabel: { fontSize: 9, lineHeight: 13.5, textTransform: 'uppercase', color: tw.gray400, marginBottom: 4, ...display(900, 9) },
  docStatus: { fontSize: 14, lineHeight: 20, color: tw.gray800, ...display(700, 14) },
  docActions: { flexDirection: 'row', gap: 8 },
  docBtn: { padding: 12, borderRadius: 12 },
  thumb: { marginTop: 8, width: 96, height: 64, borderRadius: 12, borderWidth: 1, borderColor: tw.gray100, overflow: 'hidden', backgroundColor: tw.gray50, boxShadow: 'inset 0 2px 4px 0 rgba(0,0,0,0.05)' },
  thumbImg: { width: '100%', height: '100%', opacity: 0.5 },
  footer: { padding: 40, alignItems: 'center', opacity: 0.3, marginTop: 8 },
  footerText: { fontSize: 10, lineHeight: 15, textTransform: 'uppercase', color: '#1F1F24', ...display(900, 10) },
  viewerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  viewer: { width: '100%', maxWidth: 512, backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden' },
  viewerHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 17.6, borderBottomWidth: 1, borderBottomColor: tw.gray100 },
  viewerTitle: { fontSize: 18, lineHeight: 28, textTransform: 'uppercase', color: tw.gray950, ...display(900, 18) },
  viewerClose: { padding: 12, backgroundColor: tw.gray50, borderRadius: 999 },
});
