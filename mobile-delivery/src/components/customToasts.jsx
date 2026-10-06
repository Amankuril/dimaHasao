import { StyleSheet, Text, View } from 'react-native';
import { CheckCircle2, Trash2 } from 'lucide-react-native';
import { toast } from '../lib/notify';
import { poppins, shadow } from '../theme';

// shared/utils/customToasts.jsx showAccountDeletedToast (the toaster sits outside the delivery theme: Poppins).
export function showAccountDeletedToast() {
  toast.custom(
    () => (
      <View style={[styles.box, shadow('lg')]}>
        <View>
          <Trash2 size={24} color="#ef4444" />
          <View style={styles.check}>
            <CheckCircle2 size={14} color="#fff" fill="#22c55e" />
          </View>
        </View>
        <Text style={styles.text}>Account Deleted successfully</Text>
      </View>
    ),
    { duration: 4000 },
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, minWidth: 300 },
  check: { position: 'absolute', top: -4, right: -4, backgroundColor: '#fff', borderRadius: 999 },
  text: { color: '#15803d', fontSize: 14, lineHeight: 20, ...poppins(700) },
});
