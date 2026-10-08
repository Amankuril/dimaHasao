/* Ported from Frontend/src/modules/Food/pages/admin/DeliveryCashLimit.jsx (tools/port.js first pass). */
import { useCallback, useEffect, useRef, useState } from 'react';
import { IndianRupee, Loader2, Wallet } from 'lucide-react-native';
import { adminAPI } from '../../../api/food';
import { toast } from '../../../lib/notify';
import { AdminPage, PageHeader, Card, SectionTitle, Field, INPUT, BTN_PRIMARY, BTN_TEXT_PRIMARY, LoadingState, useLayoutWidth } from '../../../admin/ui';
import { Button, Div, Input, Span, Icon as UiIcon } from '../../../components/web';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
export default function DeliveryCashLimit() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingWithdrawal, setSavingWithdrawal] = useState(false);
  const [deliveryCashLimit, setDeliveryCashLimit] = useState('');
  const [deliveryWithdrawalLimit, setDeliveryWithdrawalLimit] = useState('');
  const isMountedRef = useRef(true);
  const { tablet } = useLayoutWidth();
  const fetchLimit = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const response = await adminAPI.getDeliveryCashLimit();
      const data = response?.data?.data || response?.data || {};
      const limit = data.deliveryCashLimit;
      const wl = data.deliveryWithdrawalLimit ?? 100;
      if (!isMountedRef.current) return;
      setDeliveryCashLimit(limit !== undefined && limit !== null ? String(limit) : '');
      setDeliveryWithdrawalLimit(wl !== undefined && wl !== null ? String(wl) : '100');
    } catch (error) {
      debugError('Error fetching delivery cash limit:', error);
      if (!isMountedRef.current) return;
      if (!silent) {
        toast.error(error.response?.data?.message || 'Failed to load delivery cash limit');
      }
      setDeliveryCashLimit('');
      setDeliveryWithdrawalLimit('100');
    } finally {
      if (!silent && isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);
  const saveLimit = async () => {
    const value = Number(deliveryCashLimit);
    if (!Number.isFinite(value) || value < 0) {
      toast.error('Cash limit must be a number (>= 0)');
      return;
    }
    const withdrawalValue = Number(deliveryWithdrawalLimit);
    if (!Number.isFinite(withdrawalValue) || withdrawalValue < 0) {
      toast.error('Withdrawal limit must be a number (>= 0)');
      return;
    }
    try {
      setSaving(true);
      // Send both fields to avoid unintentionally overwriting the other value
      const response = await adminAPI.updateDeliveryCashLimit({
        deliveryCashLimit: value,
        deliveryWithdrawalLimit: withdrawalValue,
      });
      const saved = response?.data?.data?.deliveryCashLimit ?? response?.data?.deliveryCashLimit ?? value;
      setDeliveryCashLimit(String(saved));
      toast.success('Delivery cash limit updated successfully');
      await fetchLimit({
        silent: true,
      });
    } catch (error) {
      debugError('Error saving delivery cash limit:', error);
      toast.error(error.response?.data?.message || 'Failed to update delivery cash limit');
    } finally {
      setSaving(false);
    }
  };
  const saveWithdrawalLimit = async () => {
    const value = Number(deliveryWithdrawalLimit);
    if (!Number.isFinite(value) || value < 0) {
      toast.error('Withdrawal limit must be a number (>= 0)');
      return;
    }
    const cashValue = Number(deliveryCashLimit);
    if (!Number.isFinite(cashValue) || cashValue < 0) {
      toast.error('Cash limit must be a number (>= 0)');
      return;
    }
    try {
      setSavingWithdrawal(true);
      // Send both fields to avoid unintentionally overwriting the other value
      const response = await adminAPI.updateDeliveryCashLimit({
        deliveryCashLimit: cashValue,
        deliveryWithdrawalLimit: value,
      });
      const saved = response?.data?.data?.deliveryWithdrawalLimit ?? response?.data?.deliveryWithdrawalLimit ?? value;
      setDeliveryWithdrawalLimit(String(saved));
      toast.success('Withdrawal limit updated successfully');
      await fetchLimit({
        silent: true,
      });
    } catch (error) {
      debugError('Error saving withdrawal limit:', error);
      toast.error(error.response?.data?.message || 'Failed to update withdrawal limit');
    } finally {
      setSavingWithdrawal(false);
    }
  };
  useEffect(() => {
    isMountedRef.current = true;
    fetchLimit();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchLimit]);
  return (
    <AdminPage maxWidth={720}>
      <PageHeader
        icon={IndianRupee}
        title="Delivery cash limit"
        subtitle="A global COD cash limit and minimum withdrawal amount for every delivery partner."
        breadcrumb={[{ label: 'Food' }, { label: 'Delivery' }, { label: 'Cash limit' }]}
      />
      {loading ? (
        <LoadingState label="Loading current limits…" />
      ) : (
        <Div className="gap-3">
          <Card>
            <SectionTitle>Available cash limit</SectionTitle>
            <Div className="flex-row items-start gap-3 mb-4">
              <Div className="w-11 h-11 rounded-lg bg-green-100 items-center justify-center shrink-0">
                <UiIcon as={IndianRupee} size={20} className="text-green-700" />
              </Div>
              <Span className="text-sm text-slate-700 flex-1">
                The cash limit shown in the delivery app. As COD cash is collected, a partner&apos;s remaining limit decreases automatically.
              </Span>
            </Div>
            <Div className={tablet ? 'flex-row items-end gap-3' : 'gap-3'}>
              <Field label="Cash limit" hint="Rupees, 0 or more" className={tablet ? 'flex-1' : null}>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={deliveryCashLimit}
                  onChange={(e) => setDeliveryCashLimit(e.target.value)}
                  className={INPUT}
                  placeholder="e.g., 2000"
                  disabled={loading || saving}
                />
              </Field>
              <Button onClick={saveLimit} disabled={loading || saving} className={BTN_PRIMARY}>
                {saving ? <UiIcon as={Loader2} size={16} className="text-white" /> : null}
                <Span className={BTN_TEXT_PRIMARY}>Save</Span>
              </Button>
            </Div>
          </Card>

          <Card>
            <SectionTitle>Minimum withdrawal amount</SectionTitle>
            <Div className="flex-row items-start gap-3 mb-4">
              <Div className="w-11 h-11 rounded-lg bg-amber-100 items-center justify-center shrink-0">
                <UiIcon as={Wallet} size={20} className="text-amber-700" />
              </Div>
              <Span className="text-sm text-slate-700 flex-1">
                A delivery partner can withdraw only once their withdrawable amount is above this value.
              </Span>
            </Div>
            <Div className={tablet ? 'flex-row items-end gap-3' : 'gap-3'}>
              <Field label="Withdrawal limit" hint="Rupees, 0 or more" className={tablet ? 'flex-1' : null}>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={deliveryWithdrawalLimit}
                  onChange={(e) => setDeliveryWithdrawalLimit(e.target.value)}
                  className={INPUT}
                  placeholder="e.g., 100"
                  disabled={loading || savingWithdrawal}
                />
              </Field>
              <Button onClick={saveWithdrawalLimit} disabled={loading || savingWithdrawal} className={BTN_PRIMARY}>
                {savingWithdrawal ? <UiIcon as={Loader2} size={16} className="text-white" /> : null}
                <Span className={BTN_TEXT_PRIMARY}>Save</Span>
              </Button>
            </Div>
          </Card>
        </Div>
      )}
    </AdminPage>
  );
}
