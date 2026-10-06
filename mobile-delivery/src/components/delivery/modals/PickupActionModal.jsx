import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Camera, CheckCircle2, ChefHat, ChevronDown, ChevronUp, Image as ImageIcon, MapPin, Navigation, Package, Phone } from 'lucide-react-native';
import { ActionSlider } from '../ActionSlider';
import TripSheet from './TripSheet';
import { uploadApi } from '../../../api/delivery';
import { formatTripDistanceKm } from '../../../delivery/hooks/useProximityCheck';
import { showUserFacingApiError } from '../../../lib/apiError';
import { openCamera, openGallery } from '../../../lib/images';
import { openExternal } from '../../../lib/links';
import { toast } from '../../../lib/notify';
import { Spinner } from '../../Loader';
import { Press } from '../../ui';
import { display, poppins, shadow, tw } from '../../../theme';

/*
 * Port of components/modals/PickupActionModal.jsx. Poppins base;
 * font-extrabold and h3 are Sora. Greens/blues/oranges resolve through
 * deliveryTheme.css (text -> primary, *-50 backgrounds -> #E8F2EC,
 * *-100 borders -> #BBCCC3; bg-orange-500 slider fill -> #E8F2EC).
 */

const mapsDir = (dest) => `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;

function ActionCircle({ Icon, dark, label, onPress }) {
  return (
    <Press onPress={onPress} accessibilityLabel={label} style={[styles.circle, dark ? [styles.circleDark, shadow('md')] : [styles.circleLight, shadow('sm')]]}>
      <Icon size={20} color={dark ? '#fff' : tw.primary} />
    </Press>
  );
}

export function PickupActionModal({ order, status, distanceToTarget, eta, onReachedPickup, onPickedUp, onMinimize }) {
  const [showItems, setShowItems] = useState(false);
  const [isUploadingBill, setIsUploadingBill] = useState(false);
  const [billImageUploaded, setBillImageUploaded] = useState(false);
  const [billImageUrl, setBillImageUrl] = useState(null);

  if (!order) return null;

  const handleBillImageSelect = async (file) => {
    if (!file) return;
    if (file.size && file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }
    setIsUploadingBill(true);
    try {
      const res = await uploadApi.uploadMedia(file, { folder: 'Dima Hasao/delivery/bills' });
      if (res?.data?.success && res?.data?.data) {
        setBillImageUrl(res.data.data.url || res.data.data.secure_url);
        setBillImageUploaded(true);
      } else {
        throw new Error('Upload failed');
      }
    } catch (err) {
      showUserFacingApiError(err, 'Failed to upload bill image');
      setBillImageUploaded(false);
      setBillImageUrl(null);
    } finally {
      setIsUploadingBill(false);
    }
  };

  const isAtPickup = status === 'REACHED_PICKUP';
  const restaurant = order.restaurantId || order.restaurant || {};
  const restaurantName = order.restaurantName || order.restaurant_name || restaurant.restaurantName || restaurant.name || 'Restaurant';
  const restaurantAddress =
    order.restaurantAddress ||
    order.restaurant_address ||
    order.restaurantLocation?.address ||
    [restaurant.addressLine1, restaurant.addressLine2, restaurant.area, restaurant.city, restaurant.state, restaurant.pincode].filter(Boolean).join(', ') ||
    restaurant.location?.address ||
    '';
  const restaurantPhone = order.restaurantPhone || order.restaurant_phone || restaurant.primaryContactNumber || restaurant.ownerPhone || restaurant.phone || '';
  const restaurantCoords = order.restaurantLocation || null;
  const items = order.items || [];
  const restaurantLogo =
    order.restaurantImage ||
    restaurant.profileImage ||
    restaurant.logo ||
    order.restaurant?.logo ||
    order.restaurant?.profileImage ||
    'https://cdn-icons-png.flaticon.com/512/3170/3170733.png';
  const customerName = order.customerName || order.userId?.name || order.user?.name || order.deliveryAddress?.fullName || order.deliveryAddress?.name || 'Customer';
  const customerPhone = order.customerPhone || order.userPhone || order.userId?.phone || order.user?.phone || order.deliveryAddress?.phone || '';
  const customerAddress =
    order.customerAddress ||
    order.customer_address ||
    [
      order.deliveryAddress?.street,
      order.deliveryAddress?.additionalDetails,
      order.deliveryAddress?.landmark,
      order.deliveryAddress?.area,
      order.deliveryAddress?.city,
      order.deliveryAddress?.state,
      order.deliveryAddress?.zipCode || order.deliveryAddress?.pincode,
    ]
      .map((v) => String(v || '').trim())
      .filter(Boolean)
      .join(', ') ||
    '';
  const customerLocation = order.customerLocation || order.deliveryLocation || null;

  const call = (raw, missing) => {
    const num = String(raw || '').replace(/\D/g, '');
    if (!num) {
      toast.error(missing);
      return;
    }
    openExternal(`tel:${num}`);
  };
  const navigateTo = (coords, address, missing) => {
    const lat = parseFloat(coords?.lat ?? coords?.latitude);
    const lng = parseFloat(coords?.lng ?? coords?.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) openExternal(mapsDir(`${lat},${lng}`));
    else if (address) openExternal(mapsDir(encodeURIComponent(address)));
    else toast.error(missing);
  };
  const prefix = `bill-${order.orderId || order._id}`;

  return (
    <TripSheet onRequestClose={onMinimize}>
      <View style={styles.handleRow}>
        <Press onPress={onMinimize} accessibilityLabel="Minimise" style={styles.handleBtn}>
          <ChevronDown size={24} color={tw.gray400} strokeWidth={3} />
        </Press>
      </View>

      <View style={[styles.party, { marginBottom: 16 }]}>
        <View style={styles.partyMain}>
          <View style={[styles.logo, shadow('card')]}>
            <Image source={{ uri: restaurantLogo }} style={styles.logoImg} resizeMode="cover" />
          </View>
          <View style={styles.partyText}>
            <View style={styles.kickerRow}>
              <ChefHat size={14} color={tw.primary} />
              <Text style={styles.kicker}>Restaurant Pickup</Text>
            </View>
            <Text numberOfLines={1} style={styles.partyName}>
              {restaurantName}
            </Text>
            {restaurantAddress ? (
              <Text numberOfLines={2} style={styles.address}>
                {restaurantAddress}
              </Text>
            ) : null}
            {isAtPickup ? (
              <Text style={[styles.statusLine, styles.reached]}>Reached Location √</Text>
            ) : (
              <Text style={[styles.statusLine, { color: tw.primary }]}>
                {formatTripDistanceKm(distanceToTarget) === '--' ? 'Locating restaurant…' : `${formatTripDistanceKm(distanceToTarget)} km • ${eta || '--'} min to Store`}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.actions}>
          <ActionCircle Icon={Phone} label="Call restaurant" onPress={() => call(restaurantPhone, 'Restaurant number not available')} />
          <ActionCircle Icon={Navigation} dark label="Navigate to restaurant" onPress={() => navigateTo(restaurantCoords, restaurantAddress, 'Restaurant location not available')} />
        </View>
      </View>

      <View style={[styles.party, { marginBottom: 20 }]}>
        <View style={styles.partyMain}>
          <View style={[styles.logo, styles.dropIcon, shadow('card')]}>
            <MapPin size={24} color={tw.primary} />
          </View>
          <View style={styles.partyText}>
            <View style={styles.kickerRow}>
              <MapPin size={14} color={tw.primary} />
              <Text style={styles.kicker}>Customer Drop</Text>
            </View>
            <Text numberOfLines={1} style={styles.partyName}>
              {customerName}
            </Text>
            {customerAddress ? (
              <Text numberOfLines={2} style={styles.address}>
                {customerAddress}
              </Text>
            ) : null}
            {customerPhone ? <Text style={styles.phone}>{customerPhone}</Text> : null}
          </View>
        </View>
        <View style={styles.actions}>
          <ActionCircle Icon={Phone} label="Call customer" onPress={() => call(customerPhone, 'Customer number not available')} />
          <ActionCircle Icon={Navigation} dark label="Navigate to customer" onPress={() => navigateTo(customerLocation, customerAddress, 'Customer location not available')} />
        </View>
      </View>

      <View style={{ gap: 16 }}>
        {!isAtPickup ? (
          <View>
            <Text style={styles.hint}>Ready - Swipe to confirm arrival</Text>
            <ActionSlider key="action-reach" label="Slide to Reach" successLabel="Reached!" disabled={false} onConfirm={onReachedPickup} color="bg-green-600" />
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            <View style={styles.billRow}>
              {!billImageUploaded && !isUploadingBill ? (
                <>
                  <Press
                    onPress={() => openCamera({ onSelectFile: handleBillImageSelect, fileNamePrefix: prefix })}
                    accessibilityLabel="Camera"
                    style={[styles.billBtn, styles.billDark, shadow('card')]}
                  >
                    <Camera size={20} color="#fff" />
                    <Text style={[styles.billText, { color: '#fff' }]}>Camera</Text>
                  </Press>
                  <Press
                    onPress={() => openGallery({ onSelectFile: handleBillImageSelect, fileNamePrefix: prefix })}
                    accessibilityLabel="Gallery"
                    style={[styles.billBtn, styles.billLight, shadow('card')]}
                  >
                    <ImageIcon size={20} color={tw.primary} />
                    <Text style={[styles.billText, { color: tw.primary }]}>Gallery</Text>
                  </Press>
                </>
              ) : null}
              {isUploadingBill ? (
                <View style={[styles.billBtn, styles.billStatus, { backgroundColor: tw.gray50 }, shadow('card')]}>
                  <Spinner size={16} color={tw.gray400} />
                  <Text style={[styles.billText, { color: tw.gray400 }]}>Uploading...</Text>
                </View>
              ) : null}
              {billImageUploaded ? (
                <View style={[styles.billBtn, styles.billStatus, { backgroundColor: '#DCFCE7' }, shadow('card')]}>
                  <CheckCircle2 size={16} color={tw.green700} />
                  <Text style={[styles.billText, { color: tw.green700 }]}>Bill Uploaded</Text>
                </View>
              ) : null}
            </View>
            <View>
              <Text style={styles.hint}>Swipe to pick up</Text>
              <ActionSlider key="action-pickup" label="Slide to Pick Up" successLabel="Picked Up!" disabled={false} onConfirm={() => onPickedUp(billImageUrl)} color="bg-orange-500" />
            </View>
          </View>
        )}

        {order?.note ? (
          <View style={[styles.note, shadow('card')]}>
            <ChefHat size={20} color={tw.primary} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.noteKicker}>User Instructions</Text>
              <Text style={styles.noteText}>&quot;{order.note}&quot;</Text>
            </View>
          </View>
        ) : null}

        <Press onPress={() => setShowItems(!showItems)} scale={1} accessibilityLabel="Order Details" style={[styles.detailsBtn, shadow('card')]}>
          <View style={styles.detailsLeft}>
            <Package size={20} color={tw.gray400} />
            <Text style={styles.detailsText}>Order Details ({items.length || 0})</Text>
          </View>
          {showItems ? <ChevronDown size={16} color={tw.gray900} /> : <ChevronUp size={16} color={tw.gray900} />}
        </Press>

        {showItems ? (
          <View style={{ gap: 8, paddingHorizontal: 4 }}>
            {items.map((item, idx) => (
              <View key={idx} style={[styles.item, idx === items.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={{ flexShrink: 1 }}>
                  <Text style={styles.itemName}>{item.name || 'Item Name'}</Text>
                  {item.variantName ? <Text style={styles.itemVariant}>{item.variantName}</Text> : null}
                </View>
                <Text style={styles.qty}>x{item.quantity || 1}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </TripSheet>
  );
}

export default PickupActionModal;

const styles = StyleSheet.create({
  handleRow: { width: '100%', alignItems: 'center', paddingBottom: 8, paddingTop: 4 },
  handleBtn: { padding: 4, borderRadius: 999 },
  party: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: tw.gray100 },
  partyMain: { flexDirection: 'row', gap: 12, minWidth: 0, flex: 1 },
  // rounded-2xl: card shadow (shadow-md loses) and #E5DDC3 border
  logo: { width: 52, height: 52, backgroundColor: '#fff', borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: '#E5DDC3' },
  logoImg: { width: '100%', height: '100%' },
  // bg-blue-50 -> #E8F2EC; .border-blue-100 comes after the rounded-2xl rule -> #BBCCC3
  dropIcon: { backgroundColor: tw.primarySoft, borderColor: tw.primaryBorder },
  partyText: { minWidth: 0, flex: 1, paddingRight: 4 },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kicker: { fontSize: 10, lineHeight: 15, textTransform: 'uppercase', color: tw.primary, ...display(800, 10) },
  // h3 -> Sora
  partyName: { marginTop: 2, fontSize: 16, lineHeight: 20, color: tw.gray950, ...display(700, 16) },
  address: { marginTop: 2, fontSize: 12, lineHeight: 16.5, color: tw.gray500, ...poppins(500) },
  phone: { marginTop: 2, fontSize: 11, lineHeight: 16.5, color: tw.gray500, ...poppins(600) },
  statusLine: { marginTop: 4, fontSize: 10, lineHeight: 15, letterSpacing: 1, textTransform: 'uppercase', ...poppins(700) },
  reached: { color: tw.primary, letterSpacing: 0.1, ...display(800, 10) },
  actions: { flexDirection: 'row', gap: 8, marginLeft: 4 },
  circle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  circleLight: { backgroundColor: tw.primarySoft, borderWidth: 1, borderColor: tw.primaryBorder },
  circleDark: { backgroundColor: tw.gray900 },
  hint: { textAlign: 'center', fontSize: 10, lineHeight: 15, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12, color: tw.primary, ...poppins(700) },
  billRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, width: '100%' },
  billBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 16 },
  billDark: { backgroundColor: tw.gray900 },
  billLight: { backgroundColor: tw.primarySoft, borderWidth: 1, borderColor: tw.primaryBorder },
  billStatus: { width: '100%' },
  billText: { fontSize: 11, lineHeight: 16.5, letterSpacing: 1.1, textTransform: 'uppercase', ...poppins(700) },
  note: { backgroundColor: tw.primarySoft, borderWidth: 1, borderColor: tw.primaryBorder, borderRadius: 16, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  noteKicker: { fontSize: 10, lineHeight: 15, letterSpacing: 1, textTransform: 'uppercase', color: tw.primary, marginBottom: 6, ...poppins(700) },
  noteText: { fontSize: 14, lineHeight: 17.5, color: tw.gray800, ...poppins(700) },
  detailsBtn: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, backgroundColor: tw.gray50, borderRadius: 16 },
  detailsLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailsText: { fontSize: 12, lineHeight: 16, letterSpacing: 1.2, textTransform: 'uppercase', color: tw.gray900, ...poppins(700) },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 12, borderBottomWidth: 1, borderBottomColor: tw.gray50 },
  itemName: { fontSize: 14, lineHeight: 20, color: tw.gray700, ...poppins(700) },
  itemVariant: { marginTop: 2, fontSize: 12, lineHeight: 16, color: tw.gray500, ...poppins(500) },
  qty: { marginLeft: 8, fontSize: 12, lineHeight: 16, color: tw.primary, backgroundColor: tw.primarySoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, overflow: 'hidden', ...poppins(700) },
});
