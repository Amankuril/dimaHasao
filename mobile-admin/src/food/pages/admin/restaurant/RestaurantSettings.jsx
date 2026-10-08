/* Ported from Frontend/src/modules/Food/pages/admin/restaurant/RestaurantSettings.jsx (tools/port.js first pass). */
import { useEffect, useState } from 'react';
import { Save, Loader2, Settings, Clock, Truck, ShoppingBag } from 'lucide-react-native';
import { adminAPI } from '../../../../api/food';
import { toast } from '../../../../lib/notify';
import { Button, Div, Icon as UiIcon, Input, Span } from '../../../../components/web';
import { AdminPage, PageHeader, Card, SectionTitle, Field, LoadingState, INPUT, BTN_PRIMARY, BTN_TEXT_PRIMARY, useLayoutWidth } from '../../../../admin/ui';
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
  const { tablet } = useLayoutWidth();
  return (
    <AdminPage maxWidth={900}>
      <PageHeader
        icon={Settings}
        title="Restaurant Settings"
        subtitle="Configure platform-wide restaurant behaviour. More options will be added here over time."
        breadcrumb={[{ label: 'Food' }, { label: 'Restaurants' }, { label: 'Settings' }]}
      />

      {loading ? (
        <LoadingState label="Loading restaurant settings…" />
      ) : (
        <Card>
          <SectionTitle>Accept Order Time</SectionTitle>
          <Div className="flex-row items-start gap-2 mb-4">
            <UiIcon as={Clock} size={16} className="text-slate-400 mt-0.5" />
            <Span className="text-sm text-slate-500 flex-1">Set separate accept windows for delivery and takeaway orders before auto-rejection.</Span>
          </Div>

          <Div className={tablet ? 'flex-row gap-3' : 'gap-3'}>
            <Div className="flex-1 rounded-xl border border-slate-200 p-4 gap-3">
              <Div className="flex-row items-center gap-2">
                <UiIcon as={Truck} size={16} className="text-blue-600" />
                <Span className="text-base font-semibold text-slate-900 flex-1">Delivery</Span>
              </Div>
              <Field
                label="Time limit (minutes)"
                required
                hint={`${savedDeliveryMinutes ? `Currently set: ${savedDeliveryMinutes} min.` : 'No time set yet.'} Allowed range: ${MIN_MINUTES}\u2013${MAX_MINUTES} (0 not allowed). Delivery orders only.`}
              >
                <Input
                  type="text"
                  inputMode="numeric"
                  value={deliveryAcceptOrderTimeMinutes}
                  onChange={handleMinutesChange(setDeliveryAcceptOrderTimeMinutes)}
                  disabled={loading || savingDelivery}
                  placeholder={savedDeliveryMinutes ? undefined : 'e.g. 4'}
                  className={INPUT}
                />
              </Field>
              <Button
                onClick={handleSaveDelivery}
                disabled={!canSaveDelivery || savingDelivery || loading}
                className={BTN_PRIMARY}
                accessibilityLabel="Save delivery accept order time"
              >
                <UiIcon as={savingDelivery ? Loader2 : Save} size={16} className="text-white" />
                <Span className={BTN_TEXT_PRIMARY}>{savingDelivery ? 'Saving\u2026' : 'Save settings'}</Span>
              </Button>
            </Div>

            <Div className="flex-1 rounded-xl border border-slate-200 p-4 gap-3">
              <Div className="flex-row items-center gap-2">
                <UiIcon as={ShoppingBag} size={16} className="text-blue-600" />
                <Span className="text-base font-semibold text-slate-900 flex-1">Takeaway</Span>
              </Div>
              <Field
                label="Time limit (minutes)"
                required
                hint={`${savedTakeawayMinutes ? `Currently set: ${savedTakeawayMinutes} min.` : 'No time set yet.'} Allowed range: ${MIN_MINUTES}\u2013${MAX_MINUTES} (0 not allowed). Takeaway orders only.`}
              >
                <Input
                  type="text"
                  inputMode="numeric"
                  value={takeawayAcceptOrderTimeMinutes}
                  onChange={handleMinutesChange(setTakeawayAcceptOrderTimeMinutes)}
                  disabled={loading || savingTakeaway}
                  placeholder={savedTakeawayMinutes ? undefined : 'e.g. 6'}
                  className={INPUT}
                />
              </Field>
              <Button
                onClick={handleSaveTakeaway}
                disabled={!canSaveTakeaway || savingTakeaway || loading}
                className={BTN_PRIMARY}
                accessibilityLabel="Save takeaway accept order time"
              >
                <UiIcon as={savingTakeaway ? Loader2 : Save} size={16} className="text-white" />
                <Span className={BTN_TEXT_PRIMARY}>{savingTakeaway ? 'Saving\u2026' : 'Save settings'}</Span>
              </Button>
            </Div>
          </Div>
        </Card>
      )}
    </AdminPage>
  );
}
