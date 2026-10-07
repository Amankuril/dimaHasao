import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Camera, CheckCircle2, ChefHat, ChevronDown, ChevronUp, Image as ImageIcon, MapPin, MessageSquareText, Navigation, Navigation2, Package, Phone } from 'lucide-react-native';
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
import { Button, IconButton } from '../../ds';
import { color, radii, space, type } from '../../../theme';

/*
 * The pickup leg: heading to the restaurant, then at the restaurant (bill
 * photo + slide to pick up). Status first, then pickup and drop stops,
 * then the step's action, then notes and the item list.
 */

const mapsDir = (dest) => `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;

function ActionCircle({ Icon, dark, label, onPress }) {
  return <IconButton icon={Icon} label={label} onPress={onPress} variant={dark ? 'solid' : 'primary'} size={44} iconSize={20} />;
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

  const distanceLabel = formatTripDistanceKm(distanceToTarget);

  return (
    <TripSheet onRequestClose={onMinimize}>
      <Press onPress={onMinimize} scale={1} accessibilityLabel="Minimise pickup panel" style={styles.handleRow}>
        <View style={styles.grabber} />
        <ChevronDown size={20} color={color.textMuted} />
      </Press>

      <View style={[styles.statusRow, isAtPickup && { backgroundColor: color.successSoft }]} accessibilityLiveRegion="polite">
        {isAtPickup ? <CheckCircle2 size={18} color={color.success} /> : <Navigation2 size={18} color={color.primary} />}
        <Text style={[styles.statusText, { color: isAtPickup ? color.success : color.primary }]}>
          {isAtPickup ? 'Reached the restaurant' : distanceLabel === '--' ? 'Locating restaurant…' : `${distanceLabel} km · ${eta || '--'} min to store`}
        </Text>
      </View>

      <View style={styles.party}>
        <View style={styles.logo}>
          <Image source={{ uri: restaurantLogo }} style={styles.logoImg} resizeMode="cover" />
        </View>
        <View style={styles.partyText}>
          <View style={styles.kickerRow}>
            <ChefHat size={14} color={color.primary} />
            <Text style={[styles.kicker, { color: color.primary }]}>Pickup</Text>
          </View>
          <Text numberOfLines={2} style={styles.partyName}>
            {restaurantName}
          </Text>
          {restaurantAddress ? (
            <Text numberOfLines={2} style={styles.address}>
              {restaurantAddress}
            </Text>
          ) : null}
        </View>
        <View style={styles.actions}>
          <ActionCircle Icon={Phone} label="Call restaurant" onPress={() => call(restaurantPhone, 'Restaurant number not available')} />
          <ActionCircle Icon={Navigation} dark label="Navigate to restaurant" onPress={() => navigateTo(restaurantCoords, restaurantAddress, 'Restaurant location not available')} />
        </View>
      </View>

      <View style={[styles.party, styles.partyLast]}>
        <View style={[styles.logo, styles.dropIcon]}>
          <MapPin size={22} color={color.info} />
        </View>
        <View style={styles.partyText}>
          <View style={styles.kickerRow}>
            <MapPin size={14} color={color.info} />
            <Text style={[styles.kicker, { color: color.info }]}>Drop</Text>
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
        <View style={styles.actions}>
          <ActionCircle Icon={Phone} label="Call customer" onPress={() => call(customerPhone, 'Customer number not available')} />
          <ActionCircle Icon={Navigation} dark label="Navigate to customer" onPress={() => navigateTo(customerLocation, customerAddress, 'Customer location not available')} />
        </View>
      </View>

      <View style={{ gap: space.lg }}>
        {!isAtPickup ? (
          <View style={{ gap: space.sm }}>
            <Text style={styles.hint}>Swipe when you reach the restaurant</Text>
            <ActionSlider key="action-reach" label="Slide to Reach" successLabel="Reached!" disabled={false} onConfirm={onReachedPickup} color="bg-green-600" />
          </View>
        ) : (
          <View style={{ gap: space.lg }}>
            <View style={{ gap: space.sm }}>
              <Text style={styles.sectionLabel}>Bill photo</Text>
              <View style={styles.billRow}>
                {!billImageUploaded && !isUploadingBill ? (
                  <>
                    <Button
                      title="Camera"
                      icon={Camera}
                      variant="secondary"
                      onPress={() => openCamera({ onSelectFile: handleBillImageSelect, fileNamePrefix: prefix })}
                      accessibilityLabel="Camera"
                      style={{ flex: 1 }}
                    />
                    <Button
                      title="Gallery"
                      icon={ImageIcon}
                      variant="outline"
                      onPress={() => openGallery({ onSelectFile: handleBillImageSelect, fileNamePrefix: prefix })}
                      accessibilityLabel="Gallery"
                      style={{ flex: 1 }}
                    />
                  </>
                ) : null}
                {isUploadingBill ? (
                  <View style={[styles.billStatus, { backgroundColor: color.surfaceMuted }]}>
                    <Spinner size={16} color={color.textMuted} />
                    <Text style={[styles.billText, { color: color.textSecondary }]}>Uploading…</Text>
                  </View>
                ) : null}
                {billImageUploaded ? (
                  <View style={[styles.billStatus, { backgroundColor: color.successSoft }]}>
                    <CheckCircle2 size={18} color={color.success} />
                    <Text style={[styles.billText, { color: color.success }]}>Bill uploaded</Text>
                  </View>
                ) : null}
              </View>
            </View>
            <View style={{ gap: space.sm }}>
              <Text style={styles.hint}>Swipe once you have the order</Text>
              <ActionSlider key="action-pickup" label="Slide to Pick Up" successLabel="Picked Up!" disabled={false} onConfirm={() => onPickedUp(billImageUrl)} color="bg-orange-500" />
            </View>
          </View>
        )}

        {order?.note ? (
          <View style={styles.note}>
            <MessageSquareText size={18} color={color.info} style={{ marginTop: 1 }} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.noteKicker}>Customer instructions</Text>
              <Text style={styles.noteText}>{order.note}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.details}>
          <Press
            onPress={() => setShowItems(!showItems)}
            scale={1}
            accessibilityLabel={`Order details, ${items.length || 0} items`}
            accessibilityState={{ expanded: showItems }}
            style={styles.detailsBtn}
          >
            <View style={styles.detailsLeft}>
              <Package size={20} color={color.textSecondary} />
              <Text style={styles.detailsText}>Order details ({items.length || 0})</Text>
            </View>
            {showItems ? <ChevronUp size={20} color={color.textSecondary} /> : <ChevronDown size={20} color={color.textSecondary} />}
          </Press>

          {showItems
            ? items.map((item, idx) => (
                <View key={idx} style={styles.item}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.itemName}>{item.name || 'Item Name'}</Text>
                    {item.variantName ? <Text style={styles.itemVariant}>{item.variantName}</Text> : null}
                  </View>
                  <Text style={styles.qty}>×{item.quantity || 1}</Text>
                </View>
              ))
            : null}
        </View>
      </View>
    </TripSheet>
  );
}

export default PickupActionModal;

const styles = StyleSheet.create({
  handleRow: { alignSelf: 'center', alignItems: 'center', paddingHorizontal: space.xl, minHeight: 36, marginTop: -space.sm },
  grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: color.borderStrong, marginTop: space.sm },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: color.primarySoft, borderRadius: radii.md, paddingHorizontal: space.md, paddingVertical: space.sm + 2, marginBottom: space.md },
  statusText: { ...type.bodyStrong, flex: 1 },
  party: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, paddingVertical: space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border },
  partyLast: { marginBottom: space.lg },
  logo: { width: 48, height: 48, backgroundColor: color.surfaceMuted, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logoImg: { width: '100%', height: '100%' },
  dropIcon: { backgroundColor: color.infoSoft },
  partyText: { minWidth: 0, flex: 1 },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  kicker: { ...type.overline },
  partyName: { ...type.subheading, color: color.text, marginTop: 2 },
  address: { ...type.small, color: color.textSecondary, marginTop: 2 },
  phone: { ...type.small, color: color.textSecondary, marginTop: 2 },
  actions: { flexDirection: 'row', gap: space.sm },
  hint: { ...type.caption, color: color.textMuted, textAlign: 'center' },
  sectionLabel: { ...type.label, color: color.textSecondary },
  billRow: { flexDirection: 'row', gap: space.sm },
  billStatus: { flex: 1, height: 48, borderRadius: radii.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  billText: { ...type.bodyStrong },
  note: { backgroundColor: color.infoSoft, borderRadius: radii.md, padding: space.md, flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  noteKicker: { ...type.label, color: color.info },
  noteText: { ...type.body, color: color.text, marginTop: 2 },
  details: { borderRadius: radii.md, backgroundColor: color.surfaceMuted, overflow: 'hidden' },
  detailsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.md, minHeight: 52 },
  detailsLeft: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  detailsText: { ...type.bodyStrong, color: color.text },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: space.sm, paddingHorizontal: space.md, paddingVertical: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border, backgroundColor: color.surface },
  itemName: { ...type.bodyStrong, color: color.text },
  itemVariant: { ...type.small, color: color.textMuted, marginTop: 2 },
  qty: { ...type.label, color: color.primary, backgroundColor: color.primarySoft, paddingHorizontal: space.sm + 2, paddingVertical: space.xxs, borderRadius: radii.sm, overflow: 'hidden' },
});
