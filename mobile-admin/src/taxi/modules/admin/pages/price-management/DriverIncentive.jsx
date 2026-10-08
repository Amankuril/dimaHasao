/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/price-management/DriverIncentive.jsx (tools/port.js first pass). */
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Gift } from 'lucide-react-native';
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
import { Button, Div, Input, Span, Icon as UiIcon } from '../../../../../components/web';
const DriverIncentive = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { columns, tablet } = useLayoutWidth();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeTab, setActiveTab] = useState('daily');
  const [incentives, setIncentives] = useState([
    {
      min_rides: '0',
      amount: '0',
    },
  ]);
  const [details, setDetails] = useState({
    zone_name: '',
    vehicle_type: '',
  });
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
      console.error('Fetch incentive details failed:', err);
      setLoadError(err?.response?.data?.message || 'Failed to load incentive details');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchPriceDetails();
  }, [id]);
  const addRow = () => {
    setIncentives([
      ...incentives,
      {
        min_rides: '0',
        amount: '0',
      },
    ]);
  };
  const removeRow = (index) => {
    setIncentives(incentives.filter((_, i) => i !== index));
  };
  const updateRow = (index, field, value) => {
    const numericValue = Math.max(0, Number(value));
    const newInc = [...incentives];
    newInc[index][field] = numericValue.toString();
    setIncentives(newInc);
  };
  const handleSubmit = async () => {
    try {
      setLoading(true);
      const payload = {
        driver_incentives: {
          type: activeTab,
          data: incentives,
        },
      };
      await api.patch(`/admin/types/set-prices/${id}`, payload);
      toast.success('Incentives updated successfully!');
      navigate(-1);
    } catch (err) {
      console.error('Update failed:', err);
      toast.error('Failed to update incentives');
    } finally {
      setLoading(false);
    }
  };
  const header = (
    <PageHeader
      icon={Gift}
      title="Driver incentives"
      subtitle="Reward drivers for completing a number of rides"
      breadcrumb={[{ label: 'Taxi' }, { label: 'Pricing', onPress: () => navigate('/taxi/admin/pricing/set-price') }, { label: 'Incentives' }]}
      actions={
        <Button type="button" onClick={() => navigate(-1)} className={BTN_SECONDARY}>
          <Span className={BTN_TEXT_SECONDARY}>Back</Span>
        </Button>
      }
    />
  );
  if (loading) {
    return (
      <AdminPage maxWidth={720}>
        {header}
        <LoadingState label="Loading incentive details…" />
      </AdminPage>
    );
  }
  if (loadError) {
    return (
      <AdminPage maxWidth={720}>
        {header}
        <ErrorState title="Could not load incentives" message={loadError} onRetry={fetchPriceDetails} />
      </AdminPage>
    );
  }
  return (
    <AdminPage maxWidth={720}>
      {header}

      <StatGrid className="mb-4">
        <StatCard label="Zone" value={details.zone_name || '—'} tone="info" />
        <StatCard label="Vehicle type" value={details.vehicle_type || '—'} tone="warning" />
      </StatGrid>

      <Card className="mb-4">
        <SectionTitle>Incentive period</SectionTitle>
        <Div className="flex-row gap-2">
          {['daily', 'weekly'].map((tab) => (
            <Button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`${activeTab === tab ? BTN_PRIMARY : BTN_SECONDARY} flex-1`}>
              <Span className={activeTab === tab ? BTN_TEXT_PRIMARY : BTN_TEXT_SECONDARY}>{tab === 'daily' ? 'Daily' : 'Weekly'}</Span>
            </Button>
          ))}
        </Div>
      </Card>

      <Card className="mb-4">
        <SectionTitle
          action={
            <Button type="button" onClick={addRow} className={BTN_SECONDARY}>
              <UiIcon as={Plus} size={16} className="text-slate-600" />
              <Span className={BTN_TEXT_SECONDARY}>Add slab</Span>
            </Button>
          }
        >
          {activeTab === 'daily' ? 'Daily slabs' : 'Weekly slabs'}
        </SectionTitle>

        {incentives.length === 0 ? (
          <EmptyState
            icon={Gift}
            title="No slabs yet"
            message="Add a slab to pay drivers a bonus once they finish a number of rides."
            actionLabel="Add slab"
            onAction={addRow}
          />
        ) : (
          <Div className="gap-3">
            {incentives.map((row, idx) => (
              <Div key={idx} className="p-3 rounded-lg border border-slate-200 bg-slate-50 gap-3">
                <Div className={`grid grid-cols-${columns} gap-3`}>
                  <Field label="Minimum rides to complete">
                    <Input type="number" min="0" value={row.min_rides} onChange={(e) => updateRow(idx, 'min_rides', e.target.value)} className={INPUT} />
                  </Field>
                  <Field label="Incentive amount (₹)">
                    <Input type="number" min="0" value={row.amount} onChange={(e) => updateRow(idx, 'amount', e.target.value)} className={INPUT} />
                  </Field>
                </Div>
                <Button
                  type="button"
                  accessibilityLabel={`Remove slab ${idx + 1}`}
                  onClick={() => removeRow(idx)}
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
        <Button type="button" onClick={handleSubmit} className={BTN_PRIMARY}>
          <Span className={BTN_TEXT_PRIMARY}>Save incentives</Span>
        </Button>
      </Card>
    </AdminPage>
  );
};
export default DriverIncentive;
