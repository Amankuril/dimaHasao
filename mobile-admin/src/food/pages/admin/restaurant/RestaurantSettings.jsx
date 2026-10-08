/* Ported from Frontend/src/modules/Food/pages/admin/restaurant/RestaurantSettings.jsx (tools/port.js first pass). */
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Save, Loader2, Settings, Clock, Truck, ShoppingBag } from 'lucide-react-native';
import { Button } from '../../../../components/shadcn';
import { Input } from '../../../../components/shadcn';
import { Label } from '../../../../components/shadcn';
import { adminAPI } from '../../../../api/food';
import { toast } from '../../../../lib/notify';
import { Div, H1, H2, H3, P, ScrollDiv, Icon as UiIcon } from '../../../../components/web';
const MIN_MINUTES = 1;
const MAX_MINUTES = 60;
const clampMinutesString = (value) => {
  if (value == null || !Number.isFinite(Number(value))) return '';
  return String(Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, Number(value))));
};
const sanitizeMinutesInput = (value) => {
  const digits = String(value ?? '').replace(/[^\d]/g, '');
  if (digits === '') return '';
  const withoutLeadingZeros = digits.replace(/^0+/, '');
  if (withoutLeadingZeros === '') return '';
  const num = Number(withoutLeadingZeros);
  if (!Number.isFinite(num)) return '';
  if (num > MAX_MINUTES) {
    let candidate = withoutLeadingZeros;
    while (candidate.length > 0) {
      candidate = candidate.slice(0, -1);
      if (!candidate) return '';
      const candidateNum = Number(candidate);
      if (candidateNum >= MIN_MINUTES && candidateNum <= MAX_MINUTES) {
        return candidate;
      }
    }
    return '';
  }
  if (num < MIN_MINUTES) return '';
  return withoutLeadingZeros;
};
export default function RestaurantSettings() {
  const [loading, setLoading] = useState(true);
  const [savingDelivery, setSavingDelivery] = useState(false);
  const [savingTakeaway, setSavingTakeaway] = useState(false);
  const [savedDeliveryMinutes, setSavedDeliveryMinutes] = useState('');
  const [savedTakeawayMinutes, setSavedTakeawayMinutes] = useState('');
  const [deliveryAcceptOrderTimeMinutes, setDeliveryAcceptOrderTimeMinutes] = useState('');
  const [takeawayAcceptOrderTimeMinutes, setTakeawayAcceptOrderTimeMinutes] = useState('');
  const applyLoadedSettings = (data) => {
    const delivery = clampMinutesString(data.deliveryAcceptOrderTimeMinutes);
    const takeaway = clampMinutesString(data.takeawayAcceptOrderTimeMinutes);
    setSavedDeliveryMinutes(delivery);
    setSavedTakeawayMinutes(takeaway);
    setDeliveryAcceptOrderTimeMinutes(delivery);
    setTakeawayAcceptOrderTimeMinutes(takeaway);
  };
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getRestaurantSettings();
      applyLoadedSettings(res?.data?.data || {});
    } catch (_error) {
      toast.error('Failed to load restaurant settings');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchSettings();
  }, []);
  const handleMinutesChange = (setter) => (e) => {
    setter(sanitizeMinutesInput(e.target.value));
  };
  const isValidMinutesValue = (value) => {
    if (value === '' || value == null) return false;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= MIN_MINUTES && parsed <= MAX_MINUTES;
  };
  const validateMinutes = (value, label) => {
    if (value === '' || value == null) {
      toast.error(`${label} is required (${MIN_MINUTES}–${MAX_MINUTES} minutes)`);
      return null;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < MIN_MINUTES || parsed > MAX_MINUTES) {
      toast.error(`${label} must be between ${MIN_MINUTES} and ${MAX_MINUTES} minutes (0 is not allowed)`);
      return null;
    }
    return parsed;
  };
  const deliveryHasChanges = deliveryAcceptOrderTimeMinutes !== savedDeliveryMinutes;
  const takeawayHasChanges = takeawayAcceptOrderTimeMinutes !== savedTakeawayMinutes;
  const canSaveDelivery = deliveryHasChanges && isValidMinutesValue(deliveryAcceptOrderTimeMinutes);
  const canSaveTakeaway = takeawayHasChanges && isValidMinutesValue(takeawayAcceptOrderTimeMinutes);
  const handleSaveDelivery = async () => {
    const parsed = validateMinutes(deliveryAcceptOrderTimeMinutes, 'Delivery accept order time');
    if (parsed == null) return;
    try {
      setSavingDelivery(true);
      const res = await adminAPI.updateRestaurantSettings({
        deliveryAcceptOrderTimeMinutes: parsed,
      });
      if (res?.data?.success) {
        const saved = clampMinutesString(res?.data?.data?.deliveryAcceptOrderTimeMinutes ?? parsed);
        setSavedDeliveryMinutes(saved);
        setDeliveryAcceptOrderTimeMinutes(saved);
        toast.success('Delivery accept order time saved');
      } else {
        toast.error(res?.data?.message || 'Failed to save delivery settings');
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to save delivery settings');
    } finally {
      setSavingDelivery(false);
    }
  };
  const handleSaveTakeaway = async () => {
    const parsed = validateMinutes(takeawayAcceptOrderTimeMinutes, 'Takeaway accept order time');
    if (parsed == null) return;
    try {
      setSavingTakeaway(true);
      const res = await adminAPI.updateRestaurantSettings({
        takeawayAcceptOrderTimeMinutes: parsed,
      });
      if (res?.data?.success) {
        const saved = clampMinutesString(res?.data?.data?.takeawayAcceptOrderTimeMinutes ?? parsed);
        setSavedTakeawayMinutes(saved);
        setTakeawayAcceptOrderTimeMinutes(saved);
        toast.success('Takeaway accept order time saved');
      } else {
        toast.error(res?.data?.message || 'Failed to save takeaway settings');
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to save takeaway settings');
    } finally {
      setSavingTakeaway(false);
    }
  };
  return (
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
        <Div className="flex items-center gap-3 mb-2">
          <LinearGradient
            colors={['#F43F5E', '#BE123C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}
          >
            <UiIcon as={Settings} className="w-6 h-6 text-white" />
          </LinearGradient>
          <H1 className="text-2xl font-bold text-slate-900">Restaurant Settings</H1>
        </Div>
        <P className="text-sm text-slate-600">Configure platform-wide restaurant behaviour. More options will be added here over time.</P>
      </Div>

      <Div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <Div className="p-6">
          <Div className="flex items-start gap-3 mb-6">
            <Div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center shrink-0">
              <UiIcon as={Clock} className="w-5 h-5 text-rose-600" />
            </Div>
            <Div>
              <H2 className="text-lg font-semibold text-slate-900">Accept Order Time</H2>
              <P className="text-sm text-slate-500 mt-1">Set separate accept windows for delivery and takeaway orders before auto-rejection.</P>
            </Div>
          </Div>

          <Div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Div className="rounded-xl border border-slate-200 p-5 space-y-4">
              <Div className="flex items-center gap-2">
                <Div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <UiIcon as={Truck} className="w-4 h-4 text-blue-600" />
                </Div>
                <H3 className="text-base font-semibold text-slate-900">Delivery Accept Order Time</H3>
              </Div>
              <Div className="space-y-2">
                <Label htmlFor="deliveryAcceptOrderTimeMinutes">Time limit (minutes)</Label>
                <Input
                  id="deliveryAcceptOrderTimeMinutes"
                  type="text"
                  inputMode="numeric"
                  pattern="[1-9][0-9]*"
                  value={deliveryAcceptOrderTimeMinutes}
                  onChange={handleMinutesChange(setDeliveryAcceptOrderTimeMinutes)}
                  disabled={loading || savingDelivery}
                  placeholder={savedDeliveryMinutes ? undefined : 'e.g. 4'}
                />
                <P className="text-xs text-slate-500">
                  {savedDeliveryMinutes
                    ? `Currently set: ${savedDeliveryMinutes} min. Click the field, clear it, then enter a new value.`
                    : 'No time set yet. Enter a value between 1–60 minutes.'}{' '}
                  Allowed range: {MIN_MINUTES}–{MAX_MINUTES} (0 not allowed). Delivery orders only.
                </P>
              </Div>
              <Button
                onClick={handleSaveDelivery}
                disabled={!canSaveDelivery || savingDelivery || loading}
                className="bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-2"
              >
                {savingDelivery ? (
                  <>
                    <UiIcon as={Loader2} className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <UiIcon as={Save} className="w-4 h-4" />
                    Save Settings
                  </>
                )}
              </Button>
            </Div>

            <Div className="rounded-xl border border-slate-200 p-5 space-y-4">
              <Div className="flex items-center gap-2">
                <Div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                  <UiIcon as={ShoppingBag} className="w-4 h-4 text-amber-600" />
                </Div>
                <H3 className="text-base font-semibold text-slate-900">Takeaway Accept Order Time</H3>
              </Div>
              <Div className="space-y-2">
                <Label htmlFor="takeawayAcceptOrderTimeMinutes">Time limit (minutes)</Label>
                <Input
                  id="takeawayAcceptOrderTimeMinutes"
                  type="text"
                  inputMode="numeric"
                  pattern="[1-9][0-9]*"
                  value={takeawayAcceptOrderTimeMinutes}
                  onChange={handleMinutesChange(setTakeawayAcceptOrderTimeMinutes)}
                  disabled={loading || savingTakeaway}
                  placeholder={savedTakeawayMinutes ? undefined : 'e.g. 6'}
                />
                <P className="text-xs text-slate-500">
                  {savedTakeawayMinutes
                    ? `Currently set: ${savedTakeawayMinutes} min. Click the field, clear it, then enter a new value.`
                    : 'No time set yet. Enter a value between 1–60 minutes.'}{' '}
                  Allowed range: {MIN_MINUTES}–{MAX_MINUTES} (0 not allowed). Takeaway orders only.
                </P>
              </Div>
              <Button
                onClick={handleSaveTakeaway}
                disabled={!canSaveTakeaway || savingTakeaway || loading}
                className="bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-2"
              >
                {savingTakeaway ? (
                  <>
                    <UiIcon as={Loader2} className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <UiIcon as={Save} className="w-4 h-4" />
                    Save Settings
                  </>
                )}
              </Button>
            </Div>
          </Div>
        </Div>
      </Div>
    </ScrollDiv>
  );
}
