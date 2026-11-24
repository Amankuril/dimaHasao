import React, { useState, useEffect } from 'react';
import { 
  Download, 
  ChevronRight, 
  ArrowLeft
} from 'lucide-react';
import { motion } from 'framer-motion';
import { adminService } from '../../services/adminService';
import { triggerFileDownload } from '../../../../shared/utils/downloadHelper';

const DriverDutyReport = () => {
  const [filters, setFilters] = useState({
    service_location_id: '',
    driver_id: '',
    date_option: '',
    file_format: '',
    status: '',
  });

  const [drivers, setDrivers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [driversRes, locationsRes] = await Promise.all([
          adminService.getDrivers(1, 500),
          adminService.getServiceLocations()
        ]);

        if (driversRes.success) {
          const rawDrivers = driversRes.data?.results || driversRes.data || [];
          setDrivers(rawDrivers.map(d => ({
            _id: d._id,
            name: d.name || 'Unknown Driver',
            mobile: d.phone || ''
          })));
        }

        if (locationsRes.success) {
          setLocations(locationsRes.data?.results || locationsRes.data || []);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };
    fetchData();
  }, []);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await adminService.downloadDriverDutyReport(filters);
      triggerFileDownload(response, `driver_duty_${Date.now()}`, filters.file_format);
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to generate report.');
    } finally {
      setIsDownloading(false);
    }
  };

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const isFormValid = filters.service_location_id && filters.driver_id && filters.date_option && filters.file_format && (filters.date_option !== 'range' || (filters.from_date && filters.to_date));

  const inputClass = "w-full border border-neutral-200 rounded-lg px-4 py-2.5 text-sm text-neutral-800 bg-white focus:border-neutral-400 focus:ring-1 focus:ring-[#0a4d2b]/30 outline-none transition-colors appearance-none shadow-sm";
  const labelClass = "block text-[13px] font-medium text-neutral-600 mb-2";

  return (
    <div className="min-h-screen bg-[#F9FAFB] p-6 lg:p-8">
      {/* Header Block */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs text-neutral-500 mb-3">
          <span>Driver duty report</span>
          <ChevronRight size={14} className="opacity-50" />
          <span className="text-neutral-600 font-medium">Driver duty report</span>
        </div>
        <div className="flex items-center justify-between border-b border-neutral-100 pb-5">
          <h1 className="text-2xl font-medium text-[#334155]">Driver duty report</h1>
          <button 
            onClick={() => window.history.back()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-600 bg-white border border-neutral-900/[0.08] rounded-xl hover:bg-neutral-50 transition-colors"
          >
            <ArrowLeft size={16} strokeWidth={2.5} /> Back
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        {/* Filter Card */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl border border-neutral-900/[0.08] p-8 overflow-hidden"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            {/* Service Location */}
            <div className="space-y-1">
              <label className={labelClass}>
                Service location <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select 
                  value={filters.service_location_id}
                  onChange={(e) => updateFilter('service_location_id', e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select</option>
                  {locations.map(loc => (
                    <option key={loc._id} value={loc._id}>{loc.name}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                  <ChevronRight size={18} className="rotate-90 opacity-60" />
                </div>
              </div>
            </div>

            {/* Driver */}
            <div className="space-y-1">
              <label className={labelClass}>
                Driver <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select 
                  value={filters.driver_id}
                  onChange={(e) => updateFilter('driver_id', e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select</option>
                  {drivers.map(d => (
                    <option key={d._id} value={d._id}>{d.name} ({d.mobile})</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                  <ChevronRight size={18} className="rotate-90 opacity-60" />
                </div>
              </div>
            </div>

            {/* Date Option */}
            <div className="space-y-1">
              <label className={labelClass}>
                Date option <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select 
                  value={filters.date_option}
                  onChange={(e) => updateFilter('date_option', e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="this_week">This Week</option>
                  <option value="this_month">This Month</option>
                  <option value="this_year">This Year</option>
                  <option value="range">Date Range</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                  <ChevronRight size={18} className="rotate-90 opacity-60" />
                </div>
              </div>
            </div>

            {filters.date_option === 'range' && (
              <>
                <div className="space-y-1">
                  <label className={labelClass}>From date <span className="text-rose-500">*</span></label>
                  <input type="date" value={filters.from_date || ''} onChange={(e) => updateFilter('from_date', e.target.value)} className={inputClass} />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>To date <span className="text-rose-500">*</span></label>
                  <input type="date" value={filters.to_date || ''} onChange={(e) => updateFilter('to_date', e.target.value)} className={inputClass} />
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className={labelClass}>Ride status</label>
              <div className="relative">
                <select
                  value={filters.status}
                  onChange={(e) => updateFilter('status', e.target.value)}
                  className={inputClass}
                >
                  <option value="">All</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="accepted">Accepted</option>
                  <option value="ongoing">Ongoing</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                  <ChevronRight size={18} className="rotate-90 opacity-60" />
                </div>
              </div>
            </div>

            {/* File Format */}
            <div className="space-y-1">
              <label className={labelClass}>
                File format <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select 
                  value={filters.file_format}
                  onChange={(e) => updateFilter('file_format', e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select File Format</option>
                  <option value="csv">CSV</option>
                  <option value="excel">Excel</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                  <ChevronRight size={18} className="rotate-90 opacity-60" />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 flex justify-end">
            <button 
              onClick={handleDownload}
              disabled={!isFormValid || isDownloading}
              className={`flex items-center gap-3 px-8 py-3.5 rounded-xl text-[15px] font-medium  transition-colors  shadow-sm ${
                (!isFormValid || isDownloading)
                ? 'bg-neutral-100 text-neutral-500 cursor-not-allowed shadow-none'
                : 'bg-[#171717] text-white hover:bg-[#262626]'
              }`}
            >
              {isDownloading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Download size={18} strokeWidth={2.5} />
              )}
              {isDownloading ? 'Downloading...' : 'Download'}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default DriverDutyReport;
