/**
 * Ported from Frontend/src/modules/Taxi/modules/user/pages/profile/DeleteAccount.jsx.
 */
import React, {useState} from 'react';
import {ActivityIndicator, Modal, Pressable, SafeAreaView, ScrollView, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {AlertTriangle, ArrowLeft, X} from 'lucide-react-native';

import {clearLocalUserSession, userAuthService} from '../../services/taxi/authService';
import {clearCurrentRide} from '../../services/taxi/currentRideService';
import socketService from '../../services/taxi/socket';

const REASONS = ['I use another app', 'Too expensive', 'Privacy concerns', 'Technical issues', 'Taking a break', 'Other'];
const CONSEQUENCES = [
  'An admin will review your deletion request',
  'Your account stays active until the request is approved',
  'After approval, ride history, addresses, and preferences may be removed',
  'Active bookings may be cancelled after approval',
  'Rejected requests keep your account unchanged',
];

export default function TaxiDeleteAccountScreen() {
  const navigation = useNavigation();
  const [reason, setReason] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      await userAuthService.requestAccountDeletion(reason);
      await clearCurrentRide();
      socketService.disconnect();
      await clearLocalUserSession();
      setLoading(false);
      setShowConfirm(false);
      navigation.replace('Login');
    } catch (requestError) {
      setError(requestError?.message || 'Something went wrong. Please try again.');
      setLoading(false);
      setShowConfirm(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      <View className="px-5 pt-4 pb-4 border-b border-white/80 bg-white">
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => navigation.navigate('TaxiProfile')} className="w-9 h-9 rounded-xl border border-white/80 bg-white items-center justify-center">
            <ArrowLeft size={18} color="#0f172a" />
          </Pressable>
          <View>
            <Text className="text-[9px] font-black uppercase text-red-400">Danger Zone</Text>
            <Text className="text-[19px] font-black text-red-600">Delete Account</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{padding: 20, gap: 16}}>
        {!!error && (
          <View className="flex-row items-center gap-3 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
            <AlertTriangle size={14} color="#ef4444" />
            <Text className="flex-1 text-[12px] font-black text-red-600">{error}</Text>
            <Pressable onPress={() => setError(null)}>
              <X size={13} color="#f87171" />
            </Pressable>
          </View>
        )}

        <View className="rounded-[20px] border-2 border-red-100 bg-red-50/60 p-5">
          <View className="flex-row items-center gap-3 mb-3">
            <View className="w-10 h-10 rounded-xl bg-red-100 items-center justify-center">
              <AlertTriangle size={18} color="#ef4444" />
            </View>
            <View>
              <Text className="text-[14px] font-black text-red-700">Delete account</Text>
              <Text className="text-[11px] font-bold text-red-400">Admin approval is required</Text>
            </View>
          </View>
          <View style={{gap: 8}}>
            {CONSEQUENCES.map(c => (
              <View key={c} className="flex-row items-start gap-2">
                <View className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5" />
                <Text className="flex-1 text-[12px] font-bold text-red-600">{c}</Text>
              </View>
            ))}
          </View>
        </View>

        <View>
          <Text className="text-[10px] font-black uppercase text-slate-400 mb-2">Why are you leaving?</Text>
          <View className="rounded-[20px] border border-white/80 bg-white overflow-hidden">
            {REASONS.map((r, index) => (
              <Pressable
                key={r}
                onPress={() => setReason(r)}
                className="flex-row items-center gap-3 px-4 py-3.5"
                style={[index > 0 ? {borderTopWidth: 1, borderTopColor: '#f8fafc'} : null, reason === r ? {backgroundColor: 'rgba(254,242,242,0.6)'} : null]}>
                <View className="w-5 h-5 rounded-full border-2 items-center justify-center" style={{borderColor: reason === r ? '#ef4444' : '#e2e8f0', backgroundColor: reason === r ? '#ef4444' : 'transparent'}}>
                  {reason === r && <View className="w-2 h-2 rounded-full bg-white" />}
                </View>
                <Text className="text-[13px] font-black" style={{color: reason === r ? '#dc2626' : '#334155'}}>{r}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{gap: 10}} className="pt-2">
          <Pressable
            onPress={() => setShowConfirm(true)}
            disabled={!reason}
            className="py-4 rounded-[18px] flex-row items-center justify-center gap-2"
            style={{backgroundColor: reason ? '#ef4444' : '#f1f5f9'}}>
            <AlertTriangle size={15} color={reason ? '#fff' : '#94a3b8'} />
            <Text className="text-[14px] font-black uppercase" style={{color: reason ? '#fff' : '#94a3b8'}}>Delete My Account</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('TaxiProfile')} className="py-4 rounded-[18px] border border-slate-100 bg-white items-center">
            <Text className="text-[14px] font-black text-slate-500 uppercase">Cancel</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal visible={showConfirm} transparent animationType="fade" onRequestClose={() => setShowConfirm(false)}>
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <View className="w-full max-w-sm bg-white rounded-[28px] p-7 items-center">
            <View className="w-16 h-16 bg-red-50 rounded-[20px] items-center justify-center mb-4">
              <AlertTriangle size={30} color="#ef4444" />
            </View>
            <Text className="text-[18px] font-black text-slate-900 mb-2 text-center">Send deletion request?</Text>
            <Text className="text-[13px] font-bold text-slate-500 mb-1 text-center">Admin will review this request before your account is deleted.</Text>
            <Text className="text-[12px] font-bold text-red-400 mb-6 text-center">Your account remains active until approval.</Text>
            <View style={{gap: 10}} className="w-full">
              <Pressable onPress={handleDelete} disabled={loading} className="bg-red-500 py-3.5 rounded-[16px] items-center flex-row justify-center gap-2">
                {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white text-[13px] font-black uppercase">Yes, Send Request</Text>}
              </Pressable>
              <Pressable onPress={() => setShowConfirm(false)} className="py-3.5 items-center">
                <Text className="text-[13px] font-black text-slate-400 uppercase">No, Keep My Account</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
