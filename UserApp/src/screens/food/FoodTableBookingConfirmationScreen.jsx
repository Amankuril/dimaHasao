/**
 * Ported from Frontend/src/modules/Food/pages/user/dining/TableBookingConfirmation.jsx
 * (456 lines): booking summary, special-request modal, your-details card
 * (name/phone) with edit, terms list, and `diningApi.createBooking`.
 * Dropped: the "Edit User" and "Policy" modals in that file — neither is
 * ever opened (no button sets `showUserModal`/`showPolicyModal` to true;
 * the Edit button navigates to a separate page instead, and nothing
 * triggers the policy modal at all), confirmed dead the same way
 * ProductDetail.jsx was. The modification-policy/cancellation-policy
 * screens they'd have shown are still ported as their own routes,
 * reachable from "Modification available" below.
 */
import React, {useEffect, useState} from 'react';
import {ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {ArrowLeft, Calendar, ChevronRight, Edit2, Info, MapPin, Users} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import diningApi from '../../services/food/diningApi';
import userApi from '../../services/food/userApi';

export default function FoodTableBookingConfirmationScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params || {};
  const {restaurant, guests, date, timeSlot} = params;

  const [specialRequest, setSpecialRequest] = useState(params.specialRequest || '');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [tempRequest, setTempRequest] = useState('');
  const [user, setUser] = useState(params.user || null);
  const [loading, setLoading] = useState(!params.user);
  const [bookingInProgress, setBookingInProgress] = useState(false);

  useEffect(() => {
    if (!restaurant) {
      navigation.navigate('Dining');
      return;
    }
    if (params.user) return;
    userApi
      .getProfile()
      .then(res => setUser(res?.data?.data?.user || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [restaurant, navigation, params.user]);

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator color="#0a4d2b" size="large" />
      </View>
    );
  }
  if (!restaurant) return null;

  const bookingDate = new Date(date);
  const formattedDate = Number.isNaN(bookingDate.getTime()) ? 'Today' : bookingDate.toLocaleDateString('en-GB', {day: '2-digit', month: 'short'});
  const restaurantLocation =
    typeof restaurant.location === 'string'
      ? restaurant.location
      : restaurant.location?.addressLine1 || restaurant.location?.formattedAddress || restaurant.location?.address || `${restaurant.location?.city || ''}${restaurant.location?.area ? ', ' + restaurant.location.area : ''}`;

  const handleBooking = async () => {
    setBookingInProgress(true);
    try {
      const restaurantId = restaurant?._id || restaurant?.id || restaurant?.restaurant?._id || restaurant?.restaurant?.id || restaurant?.restaurantId;
      if (!restaurantId) {
        Toast.show({type: 'error', text1: 'Unable to proceed. Restaurant ID is missing.'});
        return;
      }
      const response = await diningApi.createBooking({restaurant: restaurantId, restaurantRef: restaurant, userRef: user, guests, date, timeSlot, specialRequest});
      if (response.data.success) {
        Toast.show({type: 'success', text1: 'Table booked successfully!'});
        navigation.replace('FoodTableBookingSuccess', {booking: response.data.data});
      }
    } catch (err) {
      Toast.show({type: 'error', text1: err?.response?.data?.message || 'Failed to confirm booking'});
    } finally {
      setBookingInProgress(false);
    }
  };

  return (
    <View className="flex-1 bg-slate-50">
      <View className="bg-[#0a4d2b] px-4 py-4 flex-row items-center gap-3">
        <Pressable onPress={() => navigation.goBack()} className="p-1">
          <ArrowLeft size={22} color="#fff" />
        </Pressable>
        <Text className="font-semibold text-sm text-white flex-1">Reach the restaurant 15 minutes before your booking time for a hassle-free experience</Text>
      </View>

      <ScrollView contentContainerStyle={{padding: 16, paddingBottom: 100}}>
        <View className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4" style={{gap: 14}}>
          <View className="flex-row items-start gap-3">
            <View className="bg-orange-50 p-2 rounded-xl">
              <Calendar size={18} color="#0a4d2b" />
            </View>
            <View>
              <Text className="font-bold text-gray-900">
                {formattedDate} at {timeSlot}
              </Text>
              <View className="flex-row items-center gap-2 mt-0.5">
                <Users size={14} color="#6b7280" />
                <Text className="text-sm text-gray-500">{guests} guests</Text>
              </View>
            </View>
          </View>
          <View className="flex-row items-start gap-3 pt-3 border-t border-dashed border-slate-100">
            <View className="bg-red-50 p-2 rounded-xl">
              <MapPin size={18} color="#ef4444" />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-gray-900">{restaurant.name}</Text>
              <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={1}>
                {restaurantLocation}
              </Text>
            </View>
          </View>
        </View>

        <Pressable
          onPress={() => {
            setTempRequest(specialRequest);
            setShowRequestModal(true);
          }}
          className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mt-3 flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <View className={`p-2 rounded-xl ${specialRequest ? 'bg-purple-50' : 'bg-slate-100'}`}>
              <Info size={18} color={specialRequest ? '#0a4d2b' : '#64748b'} />
            </View>
            <View>
              <Text className="font-bold text-gray-700">{specialRequest ? 'Special Request Added' : 'Add special request'}</Text>
              {specialRequest ? (
                <Text className="text-xs text-slate-500 mt-0.5" numberOfLines={1}>
                  {specialRequest}
                </Text>
              ) : null}
            </View>
          </View>
          <ChevronRight size={18} color="#94a3b8" />
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate('FoodTableModificationPolicy', {restaurant, guests, date, timeSlot, specialRequest, user})}
          className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mt-5 flex-row items-center justify-between">
          <View className="flex-row items-start gap-3">
            <Edit2 size={18} color="#0a4d2b" />
            <View>
              <Text className="font-bold text-gray-800 text-sm">Modification available</Text>
              <Text className="text-xs text-slate-400">Valid till {timeSlot}, today</Text>
            </View>
          </View>
          <ChevronRight size={16} color="#cbd5e1" />
        </Pressable>

        <Text className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest mt-6 mb-3">Your Details</Text>
        <View className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex-row items-center justify-between">
          <View>
            <Text className="font-bold text-gray-900">{user?.name || 'Guest'}</Text>
            <Text className="text-sm text-slate-400 mt-1">{user?.phone || user?.email || 'Add your phone'}</Text>
          </View>
          <Pressable onPress={() => navigation.navigate('FoodTableEditUser', {restaurant, guests, date, timeSlot, specialRequest, user})}>
            <Text className="text-red-500 text-sm font-bold">Edit</Text>
          </Pressable>
        </View>

        <Text className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest mt-6 mb-3">Terms and Conditions</Text>
        <View className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100" style={{gap: 14}}>
          {[
            'Please arrive 15 minutes prior to your reservation time.',
            'Booking valid for the specified number of guests entered during reservation',
            "Cover charges upon entry are subject to the discretion of the restaurant",
            'House rules are to be observed at all times',
            "Special requests will be accommodated at the restaurant's discretion",
          ].map((term, i) => (
            <View key={i} className="flex-row gap-3">
              <View className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5" />
              <Text className="text-xs text-slate-600 flex-1 leading-relaxed">{term}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4">
        <Pressable onPress={handleBooking} disabled={bookingInProgress} className={`h-14 rounded-2xl items-center justify-center ${bookingInProgress ? 'bg-gray-300' : 'bg-[#0a4d2b]'}`}>
          {bookingInProgress ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-lg">Confirm your seat</Text>}
        </Pressable>
      </View>

      <Modal visible={showRequestModal} transparent animationType="fade" onRequestClose={() => setShowRequestModal(false)}>
        <Pressable className="flex-1 bg-black/50 items-center justify-center p-4" onPress={() => setShowRequestModal(false)}>
          <Pressable onPress={e => e.stopPropagation()} className="bg-white rounded-3xl p-6 w-full max-w-sm">
            <Text className="text-lg font-black text-gray-900 uppercase mb-3">Special Request</Text>
            <Text className="text-sm text-slate-500 mb-3">Let the restaurant know if you have any allergies or special requirements (e.g. Birthday, Anniversary).</Text>
            <TextInput
              value={tempRequest}
              onChangeText={setTempRequest}
              placeholder="E.g. I have a peanut allergy, or we are celebrating a birthday..."
              placeholderTextColor="#9ca3af"
              multiline
              autoFocus
              className="w-full h-28 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-gray-900"
            />
            <View className="flex-row gap-3 mt-4">
              <Pressable onPress={() => setShowRequestModal(false)} className="flex-1 h-12 rounded-xl bg-slate-100 items-center justify-center">
                <Text className="text-slate-600 font-bold text-sm uppercase">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setSpecialRequest(tempRequest);
                  setShowRequestModal(false);
                }}
                className="flex-1 h-12 rounded-xl bg-[#0a4d2b] items-center justify-center">
                <Text className="text-white font-bold text-sm uppercase">Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
