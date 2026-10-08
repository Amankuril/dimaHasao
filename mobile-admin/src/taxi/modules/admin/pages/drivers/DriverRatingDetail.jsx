/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/drivers/DriverRatingDetail.jsx (tools/port.js first pass). */
import React, { useEffect, useState } from 'react';
import { ArrowLeft, Mail, MapPin, Phone, Star } from 'lucide-react-native';
import { useNavigate, useParams } from '../../../../../lib/webRouter';
import { AdminPage, PageHeader, Card, SectionTitle, LoadingState, EmptyState, ErrorState, BTN_SECONDARY, BTN_TEXT_SECONDARY, useLayoutWidth } from '../../../../../admin/ui';
import { Button, Div, Img, P, Span, Icon as UiIcon } from '../../../../../components/web';
import { API_BASE_URL } from '../../../../shared/api/runtimeConfig';

const Stars = ({ value }) => (
  <Div className="flex-row items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <UiIcon as={Star} key={s} size={14} className={s <= Math.round(value || 0) ? 'text-amber-500' : 'text-slate-200'} />
    ))}
  </Div>
);

const DriverRatingDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const { tablet } = useLayoutWidth();
  useEffect(() => {
    const fetchDetail = async () => {
      setIsLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('adminToken');
        const res = await fetch(`${API_BASE_URL}/admin/driver-ratings/${id}`, {
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {},
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setDetail(data.data);
        } else {
          setError(data.message || 'Unable to load rating');
        }
      } catch (err) {
        setError('Unable to load rating');
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetail();
  }, [id, reloadKey]);
  const header = (
    <PageHeader
      icon={Star}
      title="View Rating"
      subtitle="Driver profile and rating history"
      breadcrumb={[{ label: 'Drivers', onPress: () => navigate('/taxi/admin/drivers/ratings') }, { label: 'View Rating' }]}
      actions={
        <Button onClick={() => navigate('/taxi/admin/drivers/ratings')} className={BTN_SECONDARY}>
          <UiIcon as={ArrowLeft} size={16} className="text-slate-700" />
          <Span className={BTN_TEXT_SECONDARY}>Back</Span>
        </Button>
      }
    />
  );
  if (isLoading) {
    return (
      <AdminPage maxWidth={900}>
        {header}
        <LoadingState label="Loading rating…" />
      </AdminPage>
    );
  }
  if (error || !detail) {
    return (
      <AdminPage maxWidth={900}>
        {header}
        <ErrorState title="Rating not available" message={error || 'Rating not found'} onRetry={() => setReloadKey((k) => k + 1)} />
      </AdminPage>
    );
  }
  const driver = detail.driver;
  const reviews = detail.reviews || [];
  return (
    <AdminPage maxWidth={900}>
      {header}

      <Card className="mb-4 gap-4">
        <Div className={tablet ? 'flex-row items-start gap-4' : 'gap-4'}>
          <Div className="flex-row items-center gap-3 flex-1">
            <Div className="w-16 h-16 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
              <Img src={driver.image} alt={driver.name} className="w-full h-full" contentFit="cover" />
            </Div>
            <Div className="flex-1 min-w-0 gap-1">
              <P className="text-base font-semibold text-slate-900">{driver.name}</P>
              <Stars value={driver.rating} />
            </Div>
          </Div>

          <Div className="flex-1 gap-2">
            <Div className="flex-row items-center gap-2">
              <UiIcon as={Phone} size={14} className="text-slate-400" />
              <Span className="text-sm text-slate-700 flex-1">{driver.phone || 'N/A'}</Span>
            </Div>
            <Div className="flex-row items-center gap-2">
              <UiIcon as={Mail} size={14} className="text-slate-400" />
              <Span className="text-sm text-slate-700 flex-1">{driver.email || 'N/A'}</Span>
            </Div>
            <Div className="flex-row items-center gap-2">
              <UiIcon as={MapPin} size={14} className="text-slate-400" />
              <Span className="text-sm text-slate-700 flex-1">{driver.transport_type || 'Taxi'}</Span>
            </Div>
          </Div>
        </Div>

        <Div className="flex-row items-center gap-3 border-t border-slate-100 pt-4">
          <Div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
            <Img src={driver.vehicle_image} alt="Vehicle" className="w-full h-full" contentFit="cover" />
          </Div>
          <Div className="flex-1 min-w-0">
            <P className="text-sm font-semibold text-slate-900">{driver.transport_type || 'Vehicle'}</P>
            <P className="text-sm text-slate-500">{[driver.vehicle_make, driver.vehicle_model].filter(Boolean).join(' · ') || '—'}</P>
            <P className="text-sm text-slate-500">{driver.vehicle_number || '—'}</P>
          </Div>
        </Div>
      </Card>

      <Card className="gap-3">
        <SectionTitle>Rating history</SectionTitle>
        {reviews.length === 0 ? (
          <EmptyState icon={Star} title="No rating history" message="This driver has not been rated on a completed trip yet." className="py-8" />
        ) : (
          reviews.map((item) => (
            <Div key={item._id} className="rounded-lg border border-slate-200 p-3 gap-2">
              <P className="text-xs text-slate-500">{item.date ? new Date(item.date).toLocaleString('en-IN') : 'N/A'}</P>
              <P className="text-sm font-semibold text-slate-900">{item.request_id}</P>
              <P className="text-sm text-slate-500">Pickup: {item.pickup_location || '—'}</P>
              <Stars value={item.rating} />
            </Div>
          ))
        )}
      </Card>
    </AdminPage>
  );
};
export default DriverRatingDetail;
