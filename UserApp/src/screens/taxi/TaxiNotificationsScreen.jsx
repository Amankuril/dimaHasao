/**
 * Ported from Frontend/src/modules/Taxi/modules/user/pages/Notifications.jsx.
 * window.confirm becomes Alert.alert; react-hot-toast becomes
 * react-native-toast-message. Dark mode is dropped — this app has no theme
 * toggle, consistent with every other screen in this port.
 */
import React, {useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, Alert, DeviceEventEmitter, FlatList, Image, Pressable, SafeAreaView, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {AlertCircle, ArrowLeft, Bell, Megaphone, RefreshCw, Trash2} from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import {userAuthService} from '../../services/taxi/authService';
import {
  USER_NOTIFICATIONS_UPDATED_EVENT,
  clearRealtimeNotifications,
  getRealtimeNotifications,
  isRealtimeNotification,
  removeRealtimeNotification,
} from '../../utils/realtimeNotificationStore';

const formatNotificationTime = value => {
  if (!value) return 'Recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  return date.toLocaleString('en-IN', {day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'});
};

export default function TaxiNotificationsScreen() {
  const navigation = useNavigation();
  const [serverNotifications, setServerNotifications] = useState([]);
  const [realtime, setRealtime] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clearing, setClearing] = useState(false);

  const notifications = useMemo(() => {
    const merged = [...serverNotifications, ...realtime];
    return merged
      .filter(notification => notification?.id)
      .sort((left, right) => new Date(right.sentAt || 0).getTime() - new Date(left.sentAt || 0).getTime());
  }, [serverNotifications, realtime]);

  const refreshRealtime = async () => setRealtime(await getRealtimeNotifications());

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await userAuthService.getNotifications();
      setServerNotifications(response?.data?.results || []);
    } catch (err) {
      setError(err?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    refreshRealtime();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(USER_NOTIFICATIONS_UPDATED_EVENT, refreshRealtime);
    return () => sub.remove();
  }, []);

  const handleClearAll = () => {
    if (notifications.length === 0) return;
    Alert.alert('Clear all notifications', 'Are you sure you want to clear all notifications?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Clear all',
        style: 'destructive',
        onPress: async () => {
          setClearing(true);
          try {
            await userAuthService.clearAllNotifications();
            await clearRealtimeNotifications();
            setServerNotifications([]);
            Toast.show({type: 'success', text1: 'All notifications cleared'});
          } catch (err) {
            Toast.show({type: 'error', text1: err?.message || 'Failed to clear notifications'});
          } finally {
            setClearing(false);
          }
        },
      },
    ]);
  };

  const handleRemoveSingle = async id => {
    if (await isRealtimeNotification(id)) {
      await removeRealtimeNotification(id);
      Toast.show({type: 'success', text1: 'Notification removed'});
      return;
    }
    try {
      await userAuthService.deleteNotification(id);
      setServerNotifications(prev => prev.filter(notification => notification.id !== id));
      Toast.show({type: 'success', text1: 'Notification removed'});
    } catch {
      Toast.show({type: 'error', text1: 'Failed to remove notification'});
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      <View className="px-5 pt-4 pb-4 border-b border-white/80 bg-white">
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => navigation.navigate('TaxiProfile')} className="w-9 h-9 rounded-xl border border-white/80 bg-white items-center justify-center">
            <ArrowLeft size={18} color="#0f172a" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-[9px] font-black uppercase text-slate-400">Inbox</Text>
            <Text className="text-[19px] font-black text-slate-900">Notifications</Text>
          </View>
          <View className="bg-slate-900 rounded-full px-2.5 py-1">
            <Text className="text-[10px] font-black text-white">{notifications.length}</Text>
          </View>
        </View>
      </View>

      <View className="px-5 pt-4 flex-row items-center justify-between">
        <Text className="text-[10px] font-black uppercase text-slate-400">Admin & System Alerts</Text>
        <View className="flex-row items-center gap-4">
          {notifications.length > 0 && (
            <Pressable onPress={handleClearAll} disabled={clearing || loading} className="flex-row items-center gap-1.5">
              <Trash2 size={12} color="#f43f5e" />
              <Text className="text-[10px] font-black uppercase text-rose-500">Clear All</Text>
            </Pressable>
          )}
          <Pressable onPress={fetchNotifications} className="flex-row items-center gap-1">
            <RefreshCw size={12} color="#64748b" />
            <Text className="text-[10px] font-black uppercase text-slate-500">Refresh</Text>
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View className="py-20 items-center">
          <ActivityIndicator color="#0f172a" />
        </View>
      ) : error ? (
        <View className="items-center py-20 gap-4">
          <View className="w-16 h-16 bg-white border border-white/80 rounded-3xl items-center justify-center">
            <AlertCircle size={28} color="#f87171" />
          </View>
          <Text className="text-[14px] font-black text-slate-700">{error}</Text>
          <Pressable onPress={fetchNotifications} className="flex-row items-center gap-2 bg-slate-900 px-6 py-3 rounded-full">
            <RefreshCw size={13} color="#fff" />
            <Text className="text-white text-[12px] font-black uppercase">Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={n => n.id}
          contentContainerStyle={{padding: 20, gap: 10}}
          ListEmptyComponent={
            <View className="items-center py-20 gap-4">
              <View className="w-20 h-20 bg-white border border-white/80 rounded-3xl items-center justify-center">
                <Bell size={36} color="#cbd5e1" />
              </View>
              <View className="items-center">
                <Text className="text-[16px] font-black text-slate-700">You're all caught up</Text>
                <Text className="text-[12px] font-bold text-slate-400 mt-1">No new notifications right now</Text>
              </View>
            </View>
          }
          renderItem={({item: n}) => (
            <View className="rounded-[20px] border border-white/80 bg-white p-4 flex-row items-start gap-3">
              <View className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center">
                <Megaphone size={16} color="#3b82f6" />
              </View>
              <View className="flex-1">
                <View className="flex-row items-start justify-between gap-2">
                  <Text className="flex-1 text-[13px] font-black text-slate-900" numberOfLines={2}>{n.title || 'Notification'}</Text>
                  <View className="flex-row items-center gap-3">
                    <Text className="text-[9px] font-bold text-slate-400">{formatNotificationTime(n.sentAt)}</Text>
                    <Pressable onPress={() => handleRemoveSingle(n.id)} className="p-1.5">
                      <Trash2 size={13} color="#cbd5e1" />
                    </Pressable>
                  </View>
                </View>
                <Text className="text-[11px] font-bold text-slate-500 mt-1">{n.body || 'No message'}</Text>
                {!!n.image && <Image source={{uri: n.image}} className="mt-3 w-full h-[140px] rounded-2xl bg-slate-50" resizeMode="cover" />}
                {!!n.serviceLocationName && <Text className="text-[9px] font-black text-slate-300 uppercase mt-2">{n.serviceLocationName}</Text>}
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
