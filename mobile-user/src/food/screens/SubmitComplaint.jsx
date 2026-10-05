import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AlertCircle, ArrowLeft, FileText } from 'lucide-react-native';
import { Press } from '../../components/ui';
import { SelectField } from '../../components/kit';
import { Spinner } from '../../components/Loader';
import { orderAPI } from '../../api/food';
import useAppBackNavigation from '../hooks/useAppBackNavigation';
import { useParams, navigateTo } from '../../lib/webRouter';
import { toast } from '../../lib/notify';
import { poppins, tw } from '../../theme';

const GREEN = '#0a4d2b';
const COMPLAINT_TYPES = [
  { value: '', label: 'Select complaint type' },
  { value: 'Food Quality', label: 'Food Quality Issue' },
  { value: 'Wrong Item', label: 'Wrong Item Received' },
  { value: 'Missing Item', label: 'Missing Item' },
  { value: 'Packaging Issue', label: 'Packaging Issue' },
  { value: 'Late Delivery', label: 'Late Delivery' },
  { value: 'Other', label: 'Other' },
];

export default function SubmitComplaint() {
  const goBack = useAppBackNavigation();
  const insets = useSafeAreaInsets();
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ complaintType: '', subject: '', description: '' });

  useEffect(() => {
    let timer;
    const leave = () => {
      timer = setTimeout(() => navigateTo('/user/orders'), 2000);
    };
    if (!orderId) {
      toast.error('Order ID is required');
      leave();
      return () => clearTimeout(timer);
    }
    (async () => {
      try {
        setLoading(true);
        const response = await orderAPI.getOrderDetails(orderId);
        let orderData = null;
        if (response?.data?.success && response.data.data?.order) orderData = response.data.data.order;
        else if (response?.data?.order) orderData = response.data.order;
        else {
          toast.error('Order not found');
          leave();
          return;
        }
        setOrder(orderData);
      } catch (error) {
        toast.error(error?.response?.data?.message || 'Failed to load order details');
        leave();
      } finally {
        setLoading(false);
      }
    })();
    return () => clearTimeout(timer);
  }, [orderId]);

  const handleSubmit = async () => {
    if (!formData.complaintType) {
      toast.error('Please select a complaint type');
      return;
    }
    if (!formData.subject.trim()) {
      toast.error('Please enter a subject');
      return;
    }
    if (!formData.description.trim()) {
      toast.error('Please enter a description');
      return;
    }
    try {
      setSubmitting(true);
      const orderMongoId = order?._id || orderId;
      if (!orderMongoId) {
        toast.error('Order ID not available');
        return;
      }
      const orderIdString = String(orderMongoId);
      const response = await orderAPI.submitComplaint({
        orderId: orderIdString,
        complaintType: formData.complaintType,
        subject: formData.subject,
        description: formData.description,
      });
      if (response?.data?.success) {
        toast.success('Complaint submitted successfully');
        navigateTo(`/user/orders/${order?._id || orderId}/details`);
      } else {
        toast.error(response?.data?.message || 'Failed to submit complaint');
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to submit complaint');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.page, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: tw.gray600, fontSize: 14, ...poppins(400) }}>Loading...</Text>
      </View>
    );
  }
  if (!order) return null;

  return (
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Press scale={0.9} onPress={goBack} accessibilityLabel="Back" style={{ padding: 4 }}>
          <ArrowLeft size={24} color={tw.gray700} />
        </Press>
        <Text style={styles.title}>Submit Complaint</Text>
        <Press onPress={() => navigateTo('/user/profile/support')} style={{ marginLeft: 'auto' }}>
          <Text style={{ fontSize: 14, color: GREEN, ...poppins(600) }}>View History</Text>
        </Press>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
        <View style={styles.info}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <View style={styles.infoIcon}>
              <FileText size={20} color={tw.gray600} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: tw.gray800, ...poppins(600) }}>Order #{order.orderId || order._id}</Text>
              <Text style={{ fontSize: 12, color: tw.gray500, ...poppins(400) }}>{order.restaurantName || 'Restaurant'}</Text>
            </View>
          </View>
          <Text style={{ fontSize: 14, color: tw.gray600, ...poppins(400) }}>
            {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </Text>
        </View>

        <View style={{ marginHorizontal: 16, marginTop: 16, gap: 16 }}>
          <View>
            <Text style={styles.label}>
              Complaint Type <Text style={{ color: tw.red500 }}>*</Text>
            </Text>
            <SelectField
              value={formData.complaintType}
              options={COMPLAINT_TYPES}
              onChange={(v) => setFormData({ ...formData, complaintType: v })}
              accessibilityLabel="Complaint type"
              style={styles.field}
              textStyle={{ fontSize: 16, color: formData.complaintType ? tw.gray900 : tw.gray500, ...poppins(400) }}
            />
          </View>
          <View>
            <Text style={styles.label}>
              Subject <Text style={{ color: tw.red500 }}>*</Text>
            </Text>
            <TextInput
              value={formData.subject}
              onChangeText={(t) => setFormData({ ...formData, subject: t })}
              placeholder="Brief description of your complaint"
              placeholderTextColor={tw.gray400}
              maxLength={200}
              style={[styles.field, styles.input]}
            />
          </View>
          <View>
            <Text style={styles.label}>
              Description <Text style={{ color: tw.red500 }}>*</Text>
            </Text>
            <TextInput
              value={formData.description}
              onChangeText={(t) => setFormData({ ...formData, description: t })}
              placeholder="Please provide detailed information about your complaint..."
              placeholderTextColor={tw.gray400}
              multiline
              numberOfLines={6}
              maxLength={1000}
              textAlignVertical="top"
              style={[styles.field, styles.input, { minHeight: 150 }]}
            />
            <Text style={{ fontSize: 12, color: tw.gray500, marginTop: 4, ...poppins(400) }}>{formData.description.length}/1000 characters</Text>
          </View>

          <View style={styles.infoBox}>
            <AlertCircle size={20} color={tw.blue600} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, color: tw.blue800, marginBottom: 4, ...poppins(600) }}>What happens next?</Text>
              <Text style={{ fontSize: 14, color: tw.blue700, lineHeight: 20, ...poppins(400) }}>
                Your complaint will be sent to the restaurant. They will review and respond to your complaint. You can track the status in your complaints section.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: 16 + insets.bottom }]}>
        <Press onPress={handleSubmit} disabled={submitting} style={[styles.submit, submitting ? { opacity: 0.5 } : null]}>
          {submitting ? (
            <>
              <Spinner size={16} />
              <Text style={styles.submitText}>Submitting...</Text>
            </>
          ) : (
            <Text style={styles.submitText}>Submit Complaint</Text>
          )}
        </Press>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: tw.gray50 },
  header: { backgroundColor: '#fff', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, elevation: 2 },
  title: { fontSize: 18, color: tw.gray800, ...poppins(600) },
  info: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 16, padding: 16, borderRadius: 12, elevation: 1 },
  infoIcon: { width: 40, height: 40, backgroundColor: tw.gray100, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 14, color: tw.gray700, marginBottom: 8, ...poppins(600) },
  field: { borderWidth: 1, borderColor: tw.gray300, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff' },
  input: { fontSize: 16, color: tw.gray900, ...poppins(400) },
  infoBox: { backgroundColor: tw.blue50, borderWidth: 1, borderColor: tw.blue200, borderRadius: 8, padding: 16, flexDirection: 'row', gap: 12 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: tw.gray200, padding: 16 },
  submit: { backgroundColor: GREEN, paddingVertical: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  submitText: { color: '#fff', fontSize: 16, ...poppins(600) },
});
