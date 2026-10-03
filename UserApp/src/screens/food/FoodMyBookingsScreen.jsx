/**
 * Ported from Frontend/src/modules/Food/pages/user/dining/MyBookings.jsx
 * (263 lines): bookings list with status badges, 15s polling, and the
 * rate-and-review modal for completed bookings via `diningApi.createReview`.
 */
import React, {useCallback, useEffect, useState} from 'react';
import {ActivityIndicator, FlatList, Image, Modal, Pressable, Text, TextInput, View} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {ArrowLeft, Calendar, Clock, MapPin, Star, Users, UtensilsCrossed, X} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import diningApi from '../../services/food/diningApi';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop';

const STATUS_STYLE = {
  pending: {label: 'Approval Reqd', bg: 'bg-amber-100', text: 'text-amber-700'},
  accepted: {label: 'Confirmed', bg: 'bg-green-100', text: 'text-green-700'},
  confirmed: {label: 'Confirmed', bg: 'bg-green-100', text: 'text-green-700'},
  'checked-in': {label: 'Checked-in', bg: 'bg-orange-50', text: 'text-[#0a4d2b]'},
  completed: {label: 'Completed', bg: 'bg-blue-100', text: 'text-blue-700'},
  cancelled: {label: 'Cancelled', bg: 'bg-red-100', text: 'text-red-700'},
};

export default function FoodMyBookingsScreen() {
  const navigation = useNavigation();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const fetchBookings = useCallback(async ({silent = false} = {}) => {
    try {
      if (!silent) setLoading(true);
      const response = await diningApi.getBookings();
      if (response.data.success) setBookings(response.data.data);
    } catch {
      // keep showing the last known list; polling will retry
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
      const interval = setInterval(() => fetchBookings({silent: true}), 15000);
      return () => clearInterval(interval);
    }, [fetchBookings]),
  );

  const handleReviewSubmit = async ({bookingId, rating, comment}) => {
    try {
      const response = await diningApi.createReview({bookingId, rating, comment});
      if (response.data.success) {
        Toast.show({type: 'success', text1: 'Review submitted! Thank you for your feedback.'});
        setSelectedBooking(null);
      }
    } catch (err) {
      Toast.show({type: 'error', text1: err?.response?.data?.message || 'Failed to submit review'});
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator color="#0a4d2b" size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <View className="bg-white flex-row items-center gap-3 px-4 py-3 border-b border-gray-100">
        <Pressable onPress={() => navigation.goBack()} className="w-9 h-9 items-center justify-center">
          <ArrowLeft size={20} color="#374151" />
        </Pressable>
        <Text className="text-lg font-semibold text-gray-800">My Table Bookings</Text>
      </View>

      <FlatList
        data={bookings}
        keyExtractor={b => String(b._id)}
        contentContainerStyle={{padding: 16, paddingBottom: 24}}
        ItemSeparatorComponent={() => <View style={{height: 12}} />}
        ListEmptyComponent={
          <View className="items-center py-20">
            <View className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center mb-4">
              <UtensilsCrossed size={28} color="#cbd5e1" />
            </View>
            <Text className="text-lg font-bold text-gray-800">No bookings yet</Text>
            <Text className="text-gray-500 text-sm mt-2 text-center">Book your favorite restaurant for a great dining experience!</Text>
            <Pressable onPress={() => navigation.navigate('Dining')} className="mt-6 bg-red-500 px-6 py-2.5 rounded-xl">
              <Text className="text-white font-bold">Book a table</Text>
            </Pressable>
          </View>
        }
        renderItem={({item: booking}) => {
          const style = STATUS_STYLE[String(booking.status || '').toLowerCase()] || {label: booking.status, bg: 'bg-slate-100', text: 'text-slate-700'};
          const location =
            typeof booking.restaurant?.location === 'string'
              ? booking.restaurant.location
              : booking.restaurant?.location?.addressLine1 || booking.restaurant?.location?.formattedAddress || booking.restaurant?.location?.address || '';
          return (
            <View className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex-row items-start gap-4">
              <Image source={{uri: booking.restaurant?.image || booking.restaurant?.profileImage?.url || FALLBACK_IMAGE}} className="w-20 h-20 rounded-xl" resizeMode="cover" />
              <View className="flex-1 min-w-0">
                <View className="flex-row justify-between items-start gap-2">
                  <Text className="font-bold text-gray-900 flex-1" numberOfLines={1}>
                    {booking.restaurant?.name}
                  </Text>
                  <View className={`px-2 py-1 rounded-md ${style.bg}`}>
                    <Text className={`text-[10px] font-bold ${style.text}`}>{style.label}</Text>
                  </View>
                </View>
                <View className="flex-row items-center gap-1 mt-0.5">
                  <MapPin size={12} color="#9ca3af" />
                  <Text className="text-xs text-gray-500 flex-1" numberOfLines={1}>
                    {location}
                  </Text>
                </View>
                <View className="flex-row flex-wrap gap-2 mt-2.5">
                  <View className="flex-row items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-lg">
                    <Calendar size={11} color="#475569" />
                    <Text className="text-[11px] font-bold text-gray-600">{new Date(booking.date).toLocaleDateString('en-GB', {day: '2-digit', month: 'short'})}</Text>
                  </View>
                  <View className="flex-row items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-lg">
                    <Clock size={11} color="#475569" />
                    <Text className="text-[11px] font-bold text-gray-600">{booking.timeSlot}</Text>
                  </View>
                  <View className="flex-row items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-lg">
                    <Users size={11} color="#475569" />
                    <Text className="text-[11px] font-bold text-gray-600">{booking.guests} Guests</Text>
                  </View>
                </View>
                {booking.status === 'completed' && (
                  <Pressable onPress={() => setSelectedBooking(booking)} className="mt-3 py-2 bg-red-50 border border-red-100 rounded-lg items-center">
                    <Text className="text-[11px] font-bold text-red-600">RATE & REVIEW</Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        }}
      />

      <ReviewModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} onSubmit={handleReviewSubmit} />
    </View>
  );
}

function ReviewModal({booking, onClose, onSubmit}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!comment.trim()) {
      Toast.show({type: 'error', text1: 'Please add a comment'});
      return;
    }
    setSubmitting(true);
    await onSubmit({bookingId: booking._id, rating, comment});
    setSubmitting(false);
  };

  return (
    <Modal visible={!!booking} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/50 items-center justify-center p-4" onPress={onClose}>
        {booking && (
          <Pressable onPress={e => e.stopPropagation()} className="bg-white rounded-3xl w-full max-w-md p-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-bold text-slate-900">Review your experience</Text>
              <Pressable onPress={onClose}>
                <X size={20} color="#94a3b8" />
              </Pressable>
            </View>

            <Text className="text-sm font-medium text-slate-500 mb-3 text-center">How was your visit to {booking.restaurant?.name}?</Text>
            <View className="flex-row justify-center gap-2 mb-5">
              {[1, 2, 3, 4, 5].map(star => (
                <Pressable key={star} onPress={() => setRating(star)}>
                  <Star size={32} color={star <= rating ? '#facc15' : '#e2e8f0'} fill={star <= rating ? '#facc15' : 'none'} />
                </Pressable>
              ))}
            </View>

            <Text className="text-sm font-bold text-slate-700 mb-2">Share your feedback</Text>
            <TextInput value={comment} onChangeText={setComment} placeholder="Write about the food, service, and atmosphere..." placeholderTextColor="#94a3b8" multiline className="h-28 p-4 bg-slate-50 rounded-2xl text-sm text-slate-900" />

            <Pressable onPress={handleSubmit} disabled={submitting} className={`h-12 rounded-2xl items-center justify-center mt-5 ${submitting ? 'bg-gray-300' : 'bg-red-500'}`}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold">Submit Review</Text>}
            </Pressable>
          </Pressable>
        )}
      </Pressable>
    </Modal>
  );
}
