export const getOrderLocation = (ref, keysLat, keysLng) => {
  if (!ref) return null;
  if (ref.location) {
    if (Array.isArray(ref.location.coordinates) && ref.location.coordinates.length >= 2) {
      return {
        lat: ref.location.coordinates[1],
        lng: ref.location.coordinates[0],
      };
    }
    return {
      lat: ref.location.latitude || ref.location.lat,
      lng: ref.location.longitude || ref.location.lng,
    };
  }
  for (const k of keysLat) {
    if (ref[k] != null) {
      return { lat: ref[k], lng: ref[keysLng[keysLat.indexOf(k)]] };
    }
  }
  return null;
};

export const mapOrderLocations = (serverData) => {
  if (!serverData) return null;
  const restaurant = serverData.restaurantId || serverData.restaurant || {};
  const resLoc =
    getOrderLocation(serverData.restaurantId, ['latitude', 'lat'], ['longitude', 'lng']) ||
    getOrderLocation(
      serverData,
      ['restaurant_lat', 'restaurantLat', 'latitude'],
      ['restaurant_lng', 'restaurantLng', 'longitude'],
    );
  const cusLoc =
    getOrderLocation(serverData.deliveryAddress, ['latitude', 'lat'], ['longitude', 'lng']) ||
    getOrderLocation(
      serverData,
      ['customer_lat', 'customerLat', 'latitude'],
      ['customer_lng', 'customerLng', 'longitude'],
    );

  const restaurantAddress =
    serverData.restaurantAddress ||
    serverData.restaurant_address ||
    [restaurant.addressLine1, restaurant.addressLine2, restaurant.area, restaurant.city, restaurant.state, restaurant.pincode]
      .filter(Boolean)
      .join(', ') ||
    restaurant.location?.address ||
    null;

  const restaurantPhone =
    serverData.restaurantPhone ||
    serverData.restaurant_phone ||
    restaurant.primaryContactNumber ||
    restaurant.ownerPhone ||
    restaurant.phone ||
    null;

  const customerPhone =
    serverData.userPhone ||
    serverData.customerPhone ||
    serverData.userId?.phone ||
    serverData.user?.phone ||
    serverData.deliveryAddress?.phone ||
    null;

  const deliveryAddress = serverData.deliveryAddress || {};
  const customerAddress =
    serverData.customerAddress ||
    [
      deliveryAddress.street,
      deliveryAddress.additionalDetails,
      deliveryAddress.landmark,
      deliveryAddress.area,
      deliveryAddress.city,
      deliveryAddress.state,
      deliveryAddress.zipCode || deliveryAddress.pincode,
    ]
      .map((v) => String(v || '').trim())
      .filter(Boolean)
      .join(', ') ||
    null;

  const customerName =
    serverData.customerName ||
    serverData.userId?.name ||
    serverData.user?.name ||
    deliveryAddress.fullName ||
    deliveryAddress.name ||
    null;

  return {
    ...serverData,
    _id: serverData._id,
    orderId: serverData.orderId || serverData.order_id || serverData._id,
    restaurantLocation: resLoc
      ? { ...resLoc, address: restaurantAddress || undefined }
      : resLoc,
    customerLocation: cusLoc
      ? { ...cusLoc, address: customerAddress || undefined }
      : cusLoc,
    restaurantName:
      serverData.restaurantName ||
      restaurant.restaurantName ||
      restaurant.name ||
      null,
    restaurantAddress,
    restaurantPhone,
    restaurantImage:
      serverData.restaurantImage ||
      restaurant.profileImage ||
      restaurant.logo ||
      null,
    userPhone: customerPhone,
    customerPhone,
    customerName,
    customerAddress,
  };
};

// The human order code (FOD-…) for display. Socket and push payloads often put
// the Mongo _id in `orderId`, which riders saw as "Order ref: 6b09…"; skip
// 24-hex ids and fall back to them only when nothing readable exists.
const MONGO_ID = /^[a-f0-9]{24}$/i;
export function displayOrderRef(order) {
  if (!order) return '';
  const candidates = [order.displayOrderId, order.order_id, order.orderId, order.orderNumber];
  const readable = candidates.find((v) => v && !MONGO_ID.test(String(v)));
  return String(readable || order.orderId || order._id || '');
}
