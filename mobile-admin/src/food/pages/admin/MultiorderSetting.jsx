/* Ported from Frontend/src/modules/Food/pages/admin/MultiorderSetting.jsx (tools/port.js first pass). */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Package, Loader2, Bike } from 'lucide-react-native';
import { adminAPI } from '../../../api/food';
import { toast } from '../../../lib/notify';
import { AdminPage, PageHeader, Card, SectionTitle, Field, INPUT, BTN_PRIMARY, BTN_TEXT_PRIMARY, LoadingState, useLayoutWidth } from '../../../admin/ui';
import { Button, Div, Input, Span, Icon as UiIcon } from '../../../components/web';
const debugError = (...args) => {};
export default function MultiorderSetting() {
  const [loading, setLoading] = useState(true);
  const [savingConcurrent, setSavingConcurrent] = useState(false);
  const [maxConcurrentOrders, setMaxConcurrentOrders] = useState('1');
  const isMountedRef = useRef(true);
  const { tablet } = useLayoutWidth();
  const fetchSetting = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const response = await adminAPI.getDeliveryCashLimit();
      const data = response?.data?.data || response?.data || {};
      const maxOrders = data.maxConcurrentOrders ?? 1;
      if (!isMountedRef.current) return;
      setMaxConcurrentOrders(maxOrders !== undefined && maxOrders !== null ? String(maxOrders) : '1');
    } catch (error) {
      debugError('Error fetching multiorder setting:', error);
      if (!isMountedRef.current) return;
      if (!silent) {
        toast.error(error.response?.data?.message || 'Failed to load multiorder setting');
      }
      setMaxConcurrentOrders('1');
    } finally {
      if (!silent && isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);
  const saveConcurrentLimit = async () => {
    const value = Number(maxConcurrentOrders);
    if (!Number.isFinite(value) || value < 1 || value > 5) {
      toast.error('Concurrent order limit must be between 1 and 5');
      return;
    }
    try {
      setSavingConcurrent(true);
      const response = await adminAPI.updateDeliveryCashLimit({
        maxConcurrentOrders: value,
      });
      const saved = response?.data?.data?.maxConcurrentOrders ?? response?.data?.maxConcurrentOrders ?? value;
      setMaxConcurrentOrders(String(saved));
      toast.success('Concurrent order limit updated successfully');
      await fetchSetting({
        silent: true,
      });
    } catch (error) {
      debugError('Error saving concurrent order limit:', error);
      toast.error(error.response?.data?.message || 'Failed to update concurrent order limit');
    } finally {
      setSavingConcurrent(false);
    }
  };
  useEffect(() => {
    isMountedRef.current = true;
    fetchSetting();
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchSetting]);
  return (
    <AdminPage maxWidth={720}>
      <PageHeader
        icon={Package}
        title="Multiorder setting"
        subtitle="How many orders one delivery partner may work on at the same time. A global setting — it applies to every partner."
        breadcrumb={[{ label: 'Food' }, { label: 'Delivery' }, { label: 'Multiorder setting' }]}
      />
      {loading ? (
        <LoadingState label="Loading current setting…" />
      ) : (
        <Card>
          <SectionTitle>Delivery boy order limit</SectionTitle>
          <Div className="flex-row items-start gap-3 mb-4">
            <Div className="w-11 h-11 rounded-lg bg-blue-100 items-center justify-center shrink-0">
              <UiIcon as={Bike} size={20} className="text-blue-700" />
            </Div>
            <Span className="text-sm text-slate-700 flex-1">
              Maximum number of orders a delivery partner can accept and work on at the same time. Allowed range is 1 to 5.
            </Span>
          </Div>
          <Div className={tablet ? 'flex-row items-end gap-3' : 'gap-3'}>
            <Field label="Order limit per delivery boy" hint="Between 1 and 5" className={tablet ? 'flex-1' : null}>
              <Input
                type="number"
                min="1"
                max="5"
                step="1"
                value={maxConcurrentOrders}
                onChange={(e) => setMaxConcurrentOrders(e.target.value)}
                className={INPUT}
                placeholder="e.g., 3"
                disabled={loading || savingConcurrent}
              />
            </Field>
            <Button onClick={saveConcurrentLimit} disabled={loading || savingConcurrent} className={BTN_PRIMARY}>
              {savingConcurrent ? <UiIcon as={Loader2} size={16} className="text-white" /> : null}
              <Span className={BTN_TEXT_PRIMARY}>Save</Span>
            </Button>
          </Div>
        </Card>
      )}
    </AdminPage>
  );
}
