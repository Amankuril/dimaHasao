/* Ported from Frontend/src/modules/Food/pages/admin/DeliveryCashLimit.jsx (tools/port.js first pass). */
import { useCallback, useEffect, useRef, useState } from 'react';
import { IndianRupee, Loader2, Wallet } from 'lucide-react-native';
import { adminAPI } from '../../../api/food';
import { toast } from '../../../lib/notify';
import { Button, Div, H1, Input, P, ScrollDiv, Strong, Icon as UiIcon } from '../../../components/web';
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
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen">
      <Div className="max-w-5xl mx-auto">
        <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <Div className="flex items-center gap-3 mb-2">
            <UiIcon as={IndianRupee} className="w-5 h-5 text-slate-700" />
            <H1 className="text-2xl font-bold text-slate-900">Delivery Cash Limit</H1>
          </Div>

          <P className="text-sm text-slate-600 mb-6">
            Set a <Strong>global COD cash limit</Strong> and <Strong>minimum withdrawal amount</Strong> for all delivery partners. Cash limit is used for
            Available cash limit in the delivery app; withdrawal is allowed only when withdrawable amount is above the withdrawal limit.
          </P>

          <Div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg mb-6">
            <Div className="flex items-start gap-3">
              <UiIcon as={IndianRupee} className="w-5 h-5 text-emerald-700 mt-0.5" />
              <Div className="flex-1">
                <Div className="font-semibold text-emerald-900 mb-1">Delivery Boy Available Cash Limit (Global)</Div>
                <Div className="text-sm text-emerald-800/80 mb-3">
                  When COD cash is collected, delivery partner&apos;s remaining limit will decrease automatically.
                </Div>

                <Div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                  <Div className="flex-1">
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={deliveryCashLimit}
                      onChange={(e) => setDeliveryCashLimit(e.target.value)}
                      className="w-full px-4 py-2.5 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm border-emerald-200"
                      placeholder={loading ? 'Loading...' : 'e.g., 2000'}
                      disabled={loading || saving}
                    />
                    {loading && (
                      <P className="text-xs text-emerald-700/80 mt-1 flex items-center gap-2">
                        <UiIcon as={Loader2} className="w-3.5 h-3.5 animate-spin" />
                        Loading current limit�
                      </P>
                    )}
                  </Div>
                  <Button
                    onClick={saveLimit}
                    disabled={loading || saving}
                    className="px-4 py-2.5 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {saving && <UiIcon as={Loader2} className="w-4 h-4 animate-spin" />}
                    Save
                  </Button>
                </Div>
              </Div>
            </Div>
          </Div>

          <Div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <Div className="flex items-start gap-3">
              <UiIcon as={Wallet} className="w-5 h-5 text-amber-700 mt-0.5" />
              <Div className="flex-1">
                <Div className="font-semibold text-amber-900 mb-1">Minimum Withdrawal Amount (Global)</Div>
                <Div className="text-sm text-amber-800/80 mb-3">
                  Delivery boy can withdraw only when withdrawable amount is <Strong>above</Strong> this value. Utni amount ke upar rahega tabhi withdrawal
                  hoga.
                </Div>

                <Div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                  <Div className="flex-1">
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={deliveryWithdrawalLimit}
                      onChange={(e) => setDeliveryWithdrawalLimit(e.target.value)}
                      className="w-full px-4 py-2.5 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm border-amber-200"
                      placeholder={loading ? 'Loading...' : 'e.g., 100'}
                      disabled={loading || savingWithdrawal}
                    />
                    {loading && (
                      <P className="text-xs text-amber-700/80 mt-1 flex items-center gap-2">
                        <UiIcon as={Loader2} className="w-3.5 h-3.5 animate-spin" />
                        Loading�
                      </P>
                    )}
                  </Div>
                  <Button
                    onClick={saveWithdrawalLimit}
                    disabled={loading || savingWithdrawal}
                    className="px-4 py-2.5 text-sm font-medium rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {savingWithdrawal && <UiIcon as={Loader2} className="w-4 h-4 animate-spin" />}
                    Save
                  </Button>
                </Div>
              </Div>
            </Div>
          </Div>
        </Div>
      </Div>
    </ScrollDiv>
  );
}
