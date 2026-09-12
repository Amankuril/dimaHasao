/**
 * Property type picker for a partner adding a listing.
 *
 * The scope of work covers hotels, resorts, homestays and lodges. This page
 * used to offer PG/Co-living, Rent, Sell and Plot — the real-estate types the
 * module was ported with — and routed to wizards that were never mounted, so
 * every option dead-ended at the admin dashboard. The four options below map to
 * routes that exist.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Palmtree, Home, BedDouble, ArrowLeft, ChevronRight, X } from 'lucide-react';

const PROPERTY_TYPES = [
  {
    key: 'hotel',
    label: 'Hotel',
    description: 'Rooms sold nightly, with a front desk and shared facilities',
    badge: 'Rooms',
    icon: Building2,
    route: '/hotel/partner/join-hotel',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    key: 'resort',
    label: 'Resort',
    description: 'A destination stay with on-site activities and amenities',
    badge: 'Leisure',
    icon: Palmtree,
    route: '/hotel/partner/join-resort',
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    key: 'homestay',
    label: 'Homestay',
    description: 'A room or the whole home, hosted by you',
    badge: 'Hosted',
    icon: Home,
    route: '/hotel/partner/join-homestay',
    color: 'bg-amber-50 text-amber-600',
  },
  {
    key: 'lodge',
    label: 'Lodge',
    description: 'A smaller roomed property for short stays',
    badge: 'Rooms',
    icon: BedDouble,
    route: '/hotel/partner/join-lodge',
    color: 'bg-purple-50 text-purple-600',
  },
];

const PartnerJoinPropertyType = () => {
  const navigate = useNavigate();

  const handleSelectType = (item) => {
    navigate(item.route, { state: { categoryName: item.label, propertyType: item.key } });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="font-bold text-lg text-gray-800">Select Property Type</div>
          <button onClick={() => navigate('/hotel/partner/dashboard')} className="p-2 -mr-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
      </div>

      <main className="flex-1 max-w-2xl mx-auto w-full p-4 md:p-6">
        <div className="space-y-2 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">What are you listing?</h1>
          <p className="text-gray-500 text-sm">Select the type of property you want to list.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PROPERTY_TYPES.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => handleSelectType(item)}
                className="group relative flex items-start gap-4 p-4 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-200 text-left active:scale-[0.98]"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}>
                  <Icon size={24} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                      {item.label}
                    </h3>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed mb-2 line-clamp-2">
                    {item.description}
                  </p>
                  <span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-500 bg-gray-100 rounded-md">
                    {item.badge}
                  </span>
                </div>

                <div className="absolute top-4 right-4 text-gray-300 group-hover:text-emerald-500 transition-colors">
                  <ChevronRight size={16} />
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default PartnerJoinPropertyType;
