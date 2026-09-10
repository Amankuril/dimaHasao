import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BedDouble, Landmark, Home, TreePine, ArrowLeft, ChevronRight, X } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { categoryService } from '../../../services/categoryService';
import { propertyService } from '../../../services/apiService';
import subscriptionService from '../../../services/subscriptionService';
import toast from 'react-hot-toast';

// Only these 4 options, in this order. No duplicates.
const FOUR_OPTIONS = [
  { key: 'pg-coliving', label: 'PG/Co-living', description: 'Long-stay beds or rooms with shared facilities', badge: 'Long Term', icon: BedDouble, route: '/hotel/join-pg', color: 'bg-purple-50 text-purple-600' },
  { key: 'rent', label: 'Rent', description: 'List your property for rent', badge: 'Rental', icon: Home, color: 'bg-emerald-50 text-emerald-600' },
  { key: 'buy', label: 'Sell', description: 'List your property for sale', badge: 'Sale', icon: Landmark, color: 'bg-blue-50 text-blue-600' },
  { key: 'plot', label: 'Plot', description: 'List land or plot', badge: 'Land', icon: TreePine, color: 'bg-amber-50 text-amber-600' },
];

const PartnerJoinPropertyType = () => {
  const navigate = useNavigate();
  const [allTypes, setAllTypes] = useState(FOUR_OPTIONS);
  const [subscription, setSubscription] = useState(null);
  const [propertyCount, setPropertyCount] = useState(0);

  useEffect(() => {
    const fetchSubData = async () => {
      try {
        const subRes = await subscriptionService.getCurrentSubscription();
        if (subRes?.subscription) {
          setSubscription(subRes.subscription);
        }
        const propRes = await propertyService.getPartnerProperties();
        const list = Array.isArray(propRes) ? propRes : (propRes?.properties || []);
        setPropertyCount(list.length);
      } catch (err) {
        console.error("Failed to check subscription status", err);
      }
    };
    fetchSubData();
  }, []);

  useEffect(() => {
    const buildFourOptions = async () => {
      try {
        const categories = await categoryService.getActiveCategories();

        // Helper to find category by name/display name
        const findCat = (names) => {
          const searchNames = Array.isArray(names) ? names : [names];
          return categories.find(c =>
            searchNames.some(n =>
              (c.displayName || '').toLowerCase() === n.toLowerCase() ||
              (c.name || '').toLowerCase() === n.toLowerCase()
            )
          );
        };

        const pgCat = findCat(['hostel', 'pg', 'pg/co-living', 'pg/co-living']);
        const rentCat = findCat('Rent');
        const buyCat = findCat('Buy');
        const plotCat = findCat(['Plot', 'Plots']);

        // Construct the 4 options with IDs if available
        const newOptions = [
          {
            ...FOUR_OPTIONS[0],
            route: '/hotel/join-pg', // specific route for PG
            categoryId: pgCat?._id
          },
          {
            ...FOUR_OPTIONS[1],
            // key: rentCat?._id || 'rent',
            route: rentCat ? `/hotel/join-dynamic/${rentCat._id}` : null,
            categoryId: rentCat?._id
          },
          {
            ...FOUR_OPTIONS[2],
            // key: buyCat?._id || 'buy',
            route: buyCat ? `/hotel/join-dynamic/${buyCat._id}` : null,
            categoryId: buyCat?._id
          },
          {
            ...FOUR_OPTIONS[3],
            // key: plotCat?._id || 'plot',
            route: plotCat ? `/hotel/join-dynamic/${plotCat._id}` : null,
            categoryId: plotCat?._id
          }
        ];

        setAllTypes(newOptions);
      } catch (error) {
        console.error("Failed to load categories", error);
        // Fallback: keep options but disable routes if IDs are missing (except maybe PG which has a static route? 
        // actually PG wizard might need ID too, but let's stick to the current structure where PG route is static '/hotel/join-pg')
        setAllTypes(FOUR_OPTIONS.map((o, i) => i === 0 ? { ...o, route: '/hotel/join-pg' } : { ...o, route: null }));
      }
    };
    buildFourOptions();
  }, []);

  const handleSelectType = (item) => {
    if (!item.route) return;

    if (subscription) {
      const isActive =
        subscription?.status === 'active' &&
        subscription?.expiryDate &&
        new Date(subscription.expiryDate) > new Date();

      const maxAllowed = subscription?.planId?.maxProperties;

      if (!isActive) {
        toast.error("Your subscription plan has expired. Please choose a subscription plan.");
        navigate('/hotel/subscriptions');
        return;
      }

      if (maxAllowed && propertyCount >= maxAllowed) {
        toast.error(`Property limit reached! Your plan allows ${maxAllowed} properties.`);
        navigate('/hotel/subscriptions');
        return;
      }
    }

    navigate(item.route, { state: { categoryName: item.label, categoryId: item.categoryId } });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="font-bold text-lg text-gray-800">Select Property Type</div>
          <button onClick={() => navigate('/partner/dashboard')} className="p-2 -mr-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
      </div>

      <main className="flex-1 max-w-2xl mx-auto w-full p-4 md:p-6">
        <div className="space-y-2 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">What keeps you busy?</h1>
          <p className="text-gray-500 text-sm">Select the type of property you want to list on HoomZo.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {allTypes.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => handleSelectType(item)}
                disabled={!item.route}
                className="group relative flex items-start gap-4 p-4 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-200 text-left active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
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
