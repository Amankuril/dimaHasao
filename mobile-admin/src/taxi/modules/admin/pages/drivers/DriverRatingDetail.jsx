/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/drivers/DriverRatingDetail.jsx (tools/port.js first pass). */
import React, { useEffect, useState } from 'react';
import { ArrowLeft, ChevronRight, Mail, MapPin, Phone, Star } from 'lucide-react-native';
import { useNavigate, useParams } from '../../../../../lib/webRouter';
import { Button, Div, H1, H2, Img, P, ScrollDiv, Span, Icon as UiIcon } from '../../../../../components/web';
const DriverRatingDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const fetchDetail = async () => {
      setIsLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('adminToken');
        const res = await fetch(`${globalThis.__LEGACY_BACKEND_ORIGIN__}/api/v1/admin/driver-ratings/${id}`, {
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
  }, [id]);
  if (isLoading) {
    return <ScrollDiv className="min-h-[60vh] flex items-center justify-center text-sm text-gray-500">Loading rating...</ScrollDiv>;
  }
  if (error || !detail) {
    return (
      <ScrollDiv className="min-h-[60vh] flex items-center justify-center">
        <Div className="text-center space-y-3">
          <P className="text-sm font-semibold text-rose-600">{error || 'Rating not found'}</P>
          <Button onClick={() => navigate(-1)} className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg">
            Go Back
          </Button>
        </Div>
      </ScrollDiv>
    );
  }
  const driver = detail.driver;
  const reviews = detail.reviews || [];
  return (
    <ScrollDiv className="min-h-screen bg-gray-50 p-6 lg:p-8 font-sans text-gray-900">
      <Div className="mb-6">
        <Div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
          <Span>Drivers</Span>
          <UiIcon as={ChevronRight} size={12} />
          <Span className="text-gray-700">View Rating</Span>
        </Div>
        <Div className="flex items-center justify-between">
          <H1 className="text-xl text-gray-900 font-bold">View Rating</H1>
          <Button
            onClick={() => navigate('/taxi/admin/drivers/ratings')}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <UiIcon as={ArrowLeft} size={16} /> Back
          </Button>
        </Div>
      </Div>

      <Div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <Div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_260px] gap-6 items-center">
          <Div className="flex items-center gap-4">
            <Div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 border border-gray-200">
              <Img src={driver.image} alt={driver.name} className="w-full h-full object-cover" />
            </Div>
            <Div>
              <H2 className="text-lg text-gray-900 font-bold">{driver.name}</H2>
              <Div className="flex items-center gap-1 text-amber-400">
                {[1, 2, 3, 4, 5].map((s) => (
                  <UiIcon as={Star} key={s} size={14} className={s <= Math.round(driver.rating) ? 'fill-current' : 'text-gray-200'} />
                ))}
              </Div>
            </Div>
          </Div>

          <Div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-600">
            <Div className="flex items-center gap-2">
              <UiIcon as={Phone} size={14} className="text-gray-400" />
              <Span>{driver.phone || 'N/A'}</Span>
            </Div>
            <Div className="flex items-center gap-2">
              <UiIcon as={Mail} size={14} className="text-gray-400" />
              <Span>{driver.email || 'N/A'}</Span>
            </Div>
            <Div className="flex items-center gap-2">
              <UiIcon as={MapPin} size={14} className="text-gray-400" />
              <Span>{driver.transport_type || 'Taxi'}</Span>
            </Div>
          </Div>

          <Div className="flex items-center gap-4">
            <Div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
              <Img src={driver.vehicle_image} alt="Vehicle" className="w-full h-full object-cover" />
            </Div>
            <Div className="text-sm text-gray-600">
              <P className="text-gray-900 font-semibold">{driver.transport_type || 'Vehicle'}</P>
              <P>{driver.vehicle_make}</P>
              <P>{driver.vehicle_model}</P>
              <P>{driver.vehicle_number}</P>
            </Div>
          </Div>
        </Div>
      </Div>

      <Div className="bg-white rounded-xl border border-gray-200 p-6">
        <Div className="flex items-center gap-4 mb-4">
          <Div className="w-14 h-14 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-semibold">DRIVER RATING</Div>
          <Div className="text-sm text-gray-600">Rating history</Div>
        </Div>

        <Div className="space-y-6">
          {reviews.length === 0 ? (
            <Div className="text-sm text-gray-400">No rating history found.</Div>
          ) : (
            reviews.map((item) => (
              <Div key={item._id} className="border border-gray-100 rounded-xl p-5">
                <Div className="flex items-center justify-between text-sm text-gray-500">
                  <Span>{item.date ? new Date(item.date).toLocaleString('en-IN') : 'N/A'}</Span>
                </Div>
                <Div className="mt-4 space-y-2 text-sm">
                  <Div className="font-semibold text-gray-900">{item.request_id}</Div>
                  <Div className="text-gray-500">Pickup Address: {item.pickup_location}</Div>
                  <Div className="flex items-center gap-1 text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <UiIcon as={Star} key={s} size={14} className={s <= Math.round(item.rating) ? 'fill-current' : 'text-gray-200'} />
                    ))}
                  </Div>
                </Div>
              </Div>
            ))
          )}
        </Div>
      </Div>
    </ScrollDiv>
  );
};
export default DriverRatingDetail;
