/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/price-management/SurgePricing.jsx (tools/port.js first pass). */
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ArrowLeft, TrendingUp } from 'lucide-react-native';
import { useParams, useNavigate } from '../../../../../lib/webRouter';
import api from '../../../../shared/api/axiosInstance';
import { toast } from '../../../../../lib/notify';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  StatCard,
  StatGrid,
  EmptyState,
  ErrorState,
  LoadingState,
  Field,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../../admin/ui';
import { Button, Div, HScroll, Input, Span, Icon as UiIcon } from '../../../../../components/web';
const SurgePricing = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { columns, tablet } = useLayoutWidth();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeTab, setActiveTab] = useState('Sunday');
  const [surges, setSurges] = useState([]);
  const [details, setDetails] = useState({
    zone_name: '',
    vehicle_type: '',
  });
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const fetchPriceDetails = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const res = await api.get(`/admin/types/set-prices/${id}`);
      const target = res.data || res.results || res;
      if (target) {
        setDetails({
          zone_name: target.zone_id?.name || target.zone_name || 'Global',
          vehicle_type: target.vehicle_type?.name || target.vehicle_type_name || 'Vehicle',
        });
      }
    } catch (err) {
      console.error('Fetch surge details failed:', err);
      setLoadError(err?.response?.data?.message || 'Failed to load surge details');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchPriceDetails();
  }, [id]);
  const addSurge = () => {
    const currentTime = new Date().toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
    setSurges([
      ...surges,
      {
        start_time: currentTime,
        end_time: currentTime,
        surge_price: '',
      },
    ]);
  };
  const removeSurge = (index) => {
    setSurges(surges.filter((_, i) => i !== index));
  };
  const updateSurge = (index, field, value) => {
    const newSurges = [...surges];
    if (field === 'surge_price') {
      newSurges[index][field] = Math.max(0, Number(value)).toString();
    } else {
      newSurges[index][field] = value;
    }
    setSurges(newSurges);
  };
  const handleUpdate = async () => {
    try {
      setLoading(true);
      const payload = {
        surge_prices: {
          day: activeTab,
          slots: surges,
        },
      };
      await api.patch(`/admin/types/set-prices/${id}`, payload);
      toast.success(`${activeTab} surge prices updated!`);
      navigate(-1);
    } catch (err) {
      console.error('Update failed:', err);
      toast.error('Failed to update surge prices');
    } finally {
      setLoading(false);
    }
  };
  const header = (
    <PageHeader
      icon={TrendingUp}
      title="Surge pricing"
      subtitle="Time-of-day surge percentages, one set of slots per weekday"
      breadcrumb={[{ label: 'Taxi' }, { label: 'Pricing', onPress: () => navigate('/taxi/admin/pricing/set-price') }, { label: 'Surge' }]}
      actions={
        <Button type="button" onClick={() => navigate(-1)} className={BTN_SECONDARY}>
          <UiIcon as={ArrowLeft} size={16} className="text-slate-600" />
          <Span className={BTN_TEXT_SECONDARY}>Back</Span>
        </Button>
      }
    />
  );
  if (loading) {
    return (
      <AdminPage maxWidth={720}>
        {header}
        <LoadingState label="Loading surge details…" />
      </AdminPage>
    );
  }
  if (loadError) {
    return (
      <AdminPage maxWidth={720}>
        {header}
        <ErrorState title="Could not load surge pricing" message={loadError} onRetry={fetchPriceDetails} />
      </AdminPage>
    );
  }
  return (
    <AdminPage maxWidth={720}>
      {header}

      <StatGrid className="mb-4">
        <StatCard label="Active zone" value={details.zone_name || '—'} tone="info" />
        <StatCard label="Vehicle type" value={details.vehicle_type || '—'} tone="warning" />
      </StatGrid>

      <Card className="mb-4">
        <SectionTitle>Day</SectionTitle>
        <HScroll contentClassName="flex-row gap-2">
          {days.map((day) => (
            <Button key={day} type="button" onClick={() => setActiveTab(day)} className={activeTab === day ? BTN_PRIMARY : BTN_SECONDARY}>
              <Span className={activeTab === day ? BTN_TEXT_PRIMARY : BTN_TEXT_SECONDARY}>{day.substring(0, 3)}</Span>
            </Button>
          ))}
        </HScroll>
      </Card>

      <Card className="mb-4">
        <SectionTitle
          action={
            <Button type="button" onClick={addSurge} className={BTN_SECONDARY}>
              <UiIcon as={Plus} size={16} className="text-slate-600" />
              <Span className={BTN_TEXT_SECONDARY}>Add slot</Span>
            </Button>
          }
        >
          {`${activeTab} slots`}
        </SectionTitle>

        {surges.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="No surge slots for this day"
            message={`Add a slot to raise fares during busy hours on ${activeTab}.`}
            actionLabel="Add slot"
            onAction={addSurge}
          />
        ) : (
          <Div className="gap-3">
            {surges.map((row, idx) => (
              <Div key={idx} className="p-3 rounded-lg border border-slate-200 bg-slate-50 gap-3">
                <Div className={`grid grid-cols-${columns} gap-3`}>
                  <Field label="Start time">
                    <Input type="time" value={row.start_time} onChange={(e) => updateSurge(idx, 'start_time', e.target.value)} className={INPUT} />
                  </Field>
                  <Field label="End time">
                    <Input type="time" value={row.end_time} onChange={(e) => updateSurge(idx, 'end_time', e.target.value)} className={INPUT} />
                  </Field>
                  <Field label="Surge price (%)">
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={row.surge_price}
                      onChange={(e) => updateSurge(idx, 'surge_price', e.target.value)}
                      className={INPUT}
                    />
                  </Field>
                </Div>
                <Button
                  type="button"
                  accessibilityLabel={`Remove slot ${idx + 1}`}
                  onClick={() => removeSurge(idx)}
                  className={`${BTN_SECONDARY} ${tablet ? 'self-end' : ''}`}
                >
                  <UiIcon as={Trash2} size={16} className="text-red-600" />
                  <Span className="text-sm font-semibold text-red-600">Remove</Span>
                </Button>
              </Div>
            ))}
          </Div>
        )}
      </Card>

      <Card className={`${tablet ? 'flex-row justify-end' : ''} gap-3`}>
        <Button type="button" onClick={() => navigate(-1)} className={BTN_SECONDARY}>
          <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
        </Button>
        <Button type="button" onClick={handleUpdate} className={BTN_PRIMARY}>
          <Span className={BTN_TEXT_PRIMARY}>Update surge</Span>
        </Button>
      </Card>
    </AdminPage>
  );
};
export default SurgePricing;
