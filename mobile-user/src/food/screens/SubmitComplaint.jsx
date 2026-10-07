import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname } from 'expo-router';
import { ArrowLeft, FileText, Info } from 'lucide-react-native';
import { SelectField } from '../../components/kit';
import { Button, Card, IconButton } from '../../components/ds';
import { NAV_CLEARANCE, isImmersiveRoute } from '../../components/dh/AppBottomNav';
import { orderAPI } from '../../api/food';
import useAppBackNavigation from '../hooks/useAppBackNavigation';
import { useParams, navigateTo } from '../../lib/webRouter';
import { toast } from '../../lib/notify';
import { color, radii, space, tone, type } from '../../theme';
import { CtaBar, Field, LinkButton } from '../components/cart/parts';

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
  const pathname = usePathname();
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
      <View style={[styles.page, { alignItems: 'center', justifyContent: 'center' }]} accessibilityRole="progressbar">
        <Text style={[type.body, { color: color.textSecondary }]}>Loading...</Text>
      </View>
    );
  }
  if (!order) return null;

  const required = (label) => (
    <Text>
      {label} <Text style={{ color: color.danger }}>*</Text>
    </Text>
  );

  return (
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <IconButton icon={ArrowLeft} label="Back" onPress={goBack} />
        <Text style={[type.heading, { color: color.text, flex: 1 }]} numberOfLines={1} accessibilityRole="header">
          Submit complaint
        </Text>
        <LinkButton title="View history" onPress={() => navigateTo('/user/profile/support')} style={{ paddingHorizontal: space.sm }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg, paddingBottom: space.xxl }} keyboardShouldPersistTaps="handled">
        <Card style={styles.orderCard}>
          <View style={styles.infoIcon}>
            <FileText size={20} color={color.primary} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[type.bodyStrong, { color: color.text }]} numberOfLines={1}>
              Order #{order.orderId || order._id}
            </Text>
            <Text style={[type.small, { color: color.textSecondary }]} numberOfLines={1}>
              {order.restaurantName || 'Restaurant'}
            </Text>
            <Text style={[type.caption, { color: color.textMuted }]}>
              {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </Text>
          </View>
        </Card>

        <View style={{ gap: space.xs + 2 }}>
          <Text style={[type.label, { color: color.text }]}>{required('Complaint type')}</Text>
          <SelectField
            value={formData.complaintType}
            options={COMPLAINT_TYPES}
            onChange={(v) => setFormData({ ...formData, complaintType: v })}
            accessibilityLabel="Complaint type"
            style={styles.select}
            textStyle={[type.body, { color: formData.complaintType ? color.text : color.textDisabled }]}
          />
        </View>
        <Field
          label={required('Subject')}
          value={formData.subject}
          onChangeText={(t) => setFormData({ ...formData, subject: t })}
          placeholder="Brief description of your complaint"
          maxLength={200}
          accessibilityLabel="Subject"
        />
        <Field
          label={required('Description')}
          value={formData.description}
          onChangeText={(t) => setFormData({ ...formData, description: t })}
          placeholder="Please provide detailed information about your complaint..."
          multiline
          maxLength={1000}
          accessibilityLabel="Description"
          inputStyle={{ minHeight: 150 }}
          hint={`${formData.description.length}/1000 characters`}
        />

        <View style={styles.infoBox}>
          <Info size={20} color={color.info} style={{ marginTop: 2 }} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[type.bodyStrong, { color: color.text, marginBottom: space.xs }]}>What happens next?</Text>
            <Text style={[type.small, { color: color.textSecondary }]}>
              Your complaint will be sent to the restaurant. They will review and respond to your complaint. You can track the status in your complaints section.
            </Text>
          </View>
        </View>
      </ScrollView>

      <CtaBar extraBottom={(isImmersiveRoute(pathname) ? 0 : NAV_CLEARANCE) + insets.bottom}>
        <Button title={submitting ? 'Submitting...' : 'Submit complaint'} size="lg" loading={submitting} disabled={submitting} onPress={handleSubmit} />
      </CtaBar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.sm, paddingVertical: space.xs, minHeight: 56, backgroundColor: color.surface, borderBottomWidth: 1, borderBottomColor: color.border },
  orderCard: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  infoIcon: { width: 44, height: 44, backgroundColor: color.primarySoft, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  select: { minHeight: 48, borderWidth: 1, borderColor: color.border, borderRadius: radii.md, paddingHorizontal: space.md, justifyContent: 'center', backgroundColor: color.surface },
  infoBox: { backgroundColor: tone.info.bg, borderRadius: radii.md, padding: space.lg, flexDirection: 'row', gap: space.md },
});
