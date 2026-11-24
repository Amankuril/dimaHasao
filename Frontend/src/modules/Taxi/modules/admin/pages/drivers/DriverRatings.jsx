import React, { useEffect, useState } from 'react';
import { ChevronRight, Eye, Loader2, MoreVertical, Search, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DriverRatings = () => {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenu, setActiveMenu] = useState(null);

  useEffect(() => {
    const fetchRatings = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('adminToken');
        const res = await fetch(`${globalThis.__LEGACY_BACKEND_ORIGIN__}/api/v1/admin/driver-ratings`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (res.ok && data.success) {
          const list = data.data?.results || [];
          setDrivers(list.map((d) => ({
            id: d._id,
            name: d.name || 'Unknown',
            transport: d.transport_type || 'Taxi',
            mobile: d.mobile || '',
            rating: d.rating || 0,
          })));
        }
      } catch (err) {
        console.error('Ratings fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRatings();
  }, []);

  const filtered = drivers.filter((d) =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.mobile.includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-neutral-50 p-6 lg:p-8 font-sans text-neutral-900">
      <div className="mb-6">
        <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-2">
          <span>Drivers</span>
          <ChevronRight size={12} />
          <span className="text-neutral-700">Driver rating</span>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-xl text-neutral-900 font-medium">Driver rating</h1>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span>Show</span>
            <select className="border border-neutral-200 rounded px-2 py-1 text-xs bg-white">
              <option value={10}>10</option>
            </select>
            <span>entries</span>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-neutral-200 rounded-lg w-56 focus:border-neutral-400 focus:ring-1 focus:ring-[#0a4d2b]/30 outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-100 text-xs text-neutral-500">
                <th className="px-6 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Transport type</th>
                <th className="px-4 py-3 text-left">Mobile number</th>
                <th className="px-4 py-3 text-left">Rating</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-sm text-neutral-700">
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="py-10 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-[#0a4d2b] mx-auto" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-10 text-center text-neutral-500">No data found</td>
                </tr>
              ) : (
                filtered.map((driver) => (
                  <tr key={driver.id} className="hover:bg-neutral-50/50">
                    <td className="px-6 py-3">{driver.name}</td>
                    <td className="px-4 py-3 capitalize">{driver.transport}</td>
                    <td className="px-4 py-3">{driver.mobile}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} size={14} className={s <= Math.round(driver.rating) ? 'text-[#0a4d2b]' : 'text-neutral-200'} />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setActiveMenu(activeMenu === driver.id ? null : driver.id)}
                          className="p-2 rounded-lg border border-neutral-200 text-neutral-500 hover:text-neutral-600"
                        >
                          <MoreVertical size={16} />
                        </button>
                        {activeMenu === driver.id && (
                          <div className="absolute right-0 mt-2 w-36 bg-white border border-neutral-200 rounded-lg shadow-sm z-50">
                            <button
                              onClick={() => navigate(`/taxi/admin/drivers/ratings/${driver.id}`)}
                              className="w-full text-left px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 flex items-center gap-2"
                            >
                              <Eye size={14} className="text-neutral-500" /> View
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DriverRatings;
