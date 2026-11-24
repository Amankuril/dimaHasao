import React, { useEffect, useState } from 'react';
import { ArrowLeft, ChevronRight, Mail, MapPin, Phone, Star } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

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
          headers: token ? { Authorization: `Bearer ${token}` } : {},
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
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-sm text-neutral-500">
        Loading rating...
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-sm font-medium text-rose-600">{error || 'Rating not found'}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 text-sm text-white bg-neutral-900 rounded-lg"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  const driver = detail.driver;
  const reviews = detail.reviews || [];

  return (
    <div className="min-h-screen bg-neutral-50 p-6 lg:p-8 font-sans text-neutral-900">
      <div className="mb-6">
        <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-2">
          <span>Drivers</span>
          <ChevronRight size={12} />
          <span className="text-neutral-700">View rating</span>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-xl text-neutral-900 font-medium">View rating</h1>
          <button
            onClick={() => navigate('/taxi/admin/drivers/ratings')}
            className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-600 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            <ArrowLeft size={16} /> Back
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 p-6 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_260px] gap-6 items-center">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-neutral-100 border border-neutral-200">
              <img src={driver.image} alt={driver.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="text-lg text-neutral-900 font-medium">{driver.name}</h2>
              <div className="flex items-center gap-1 text-[#0a4d2b]">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={14} className={s <= Math.round(driver.rating) ? 'fill-current' : 'text-neutral-200'} />
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-neutral-600">
            <div className="flex items-center gap-2">
              <Phone size={14} className="text-neutral-500" />
              <span>{driver.phone || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail size={14} className="text-neutral-500" />
              <span>{driver.email || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-neutral-500" />
              <span>{driver.transport_type || 'Taxi'}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200">
              <img src={driver.vehicle_image} alt="Vehicle" className="w-full h-full object-cover" />
            </div>
            <div className="text-sm text-neutral-600">
              <p className="text-neutral-900 font-medium">{driver.transport_type || 'Vehicle'}</p>
              <p>{driver.vehicle_make}</p>
              <p>{driver.vehicle_model}</p>
              <p>{driver.vehicle_number}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs font-medium">
            Driver rating
          </div>
          <div className="text-sm text-neutral-600">Rating history</div>
        </div>

        <div className="space-y-6">
          {reviews.length === 0 ? (
            <div className="text-sm text-neutral-500">No rating history found</div>
          ) : (
            reviews.map((item) => (
              <div key={item._id} className="border border-neutral-100 rounded-xl p-5">
                <div className="flex items-center justify-between text-sm text-neutral-500">
                  <span>{item.date ? new Date(item.date).toLocaleString('en-IN') : 'N/A'}</span>
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="font-medium text-neutral-900">{item.request_id}</div>
                  <div className="text-neutral-500">Pickup Address: {item.pickup_location}</div>
                  <div className="flex items-center gap-1 text-[#0a4d2b]">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} size={14} className={s <= Math.round(item.rating) ? 'fill-current' : 'text-neutral-200'} />
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DriverRatingDetail;
