/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/reports/DriverDutyReport.jsx (tools/port.js first pass). */
import React, { useState, useEffect } from 'react';
import { Download, ChevronRight, ArrowLeft } from 'lucide-react-native';
import { motion } from '../../../../../lib/motion';
import { adminService } from '../../services/adminService';
import { triggerFileDownload } from '../../../../shared/utils/downloadHelper';
import { Button, Div, H1, Input, Label, Option, ScrollDiv, Select, Span, Icon as UiIcon } from '../../../../../components/web';
import { alert } from '../../../../../lib/webShim';
import { useNavigate } from '../../../../../lib/webRouter';
const DriverDutyReport = () => {
  const navigate = useNavigate();
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
        const [driversRes, locationsRes] = await Promise.all([adminService.getDrivers(1, 500), adminService.getServiceLocations()]);
        if (driversRes.success) {
          const rawDrivers = driversRes.data?.results || driversRes.data || [];
          setDrivers(
            rawDrivers.map((d) => ({
              _id: d._id,
              name: d.name || 'Unknown Driver',
              mobile: d.phone || '',
            })),
          );
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
      await triggerFileDownload(response, `driver_duty_${Date.now()}`, filters.file_format);
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to generate report.');
    } finally {
      setIsDownloading(false);
    }
  };
  const updateFilter = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };
  const isFormValid =
    filters.service_location_id &&
    filters.driver_id &&
    filters.date_option &&
    filters.file_format &&
    (filters.date_option !== 'range' || (filters.from_date && filters.to_date));
  const inputClass =
    'w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-800 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors appearance-none shadow-sm';
  const labelClass = 'block text-[13px] font-bold text-gray-600 mb-2';
  return (
    <ScrollDiv className="min-h-screen bg-[#F9FAFB] p-6 lg:p-8">
      {/* Header Block */}
      <Div className="mb-8">
        <Div className="flex items-center gap-2 text-xs text-gray-400 mb-3 font-medium">
          <Span>Driver Duty Report</Span>
          <UiIcon as={ChevronRight} size={14} className="opacity-50" />
          <Span className="text-gray-600 font-semibold italic">Driver Duty Report</Span>
        </Div>
        <Div className="flex items-center justify-between border-b border-gray-100 pb-5">
          <H1 className="text-2xl font-bold text-[#334155] tracking-tight uppercase">Driver Duty Report</H1>
          <Button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm active:scale-95"
          >
            <UiIcon as={ArrowLeft} size={16} strokeWidth={2.5} /> Back
          </Button>
        </Div>
      </Div>

      <Div className="max-w-6xl mx-auto">
        {/* Filter Card */}
        <motion.div
          initial={{
            opacity: 0,
            y: 10,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="bg-white rounded-2xl border border-gray-100 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden"
        >
          <Div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            {/* Service Location */}
            <Div className="space-y-1">
              <Label className={labelClass}>
                Service Location <Span className="text-rose-500">*</Span>
              </Label>
              <Div className="relative">
                <Select value={filters.service_location_id} onChange={(e) => updateFilter('service_location_id', e.target.value)} className={inputClass}>
                  <Option value="">Select</Option>
                  {locations.map((loc) => (
                    <Option key={loc._id} value={loc._id}>
                      {loc.name}
                    </Option>
                  ))}
                </Select>
              </Div>
            </Div>

            {/* Driver */}
            <Div className="space-y-1">
              <Label className={labelClass}>
                Driver <Span className="text-rose-500">*</Span>
              </Label>
              <Div className="relative">
                <Select value={filters.driver_id} onChange={(e) => updateFilter('driver_id', e.target.value)} className={inputClass}>
                  <Option value="">Select</Option>
                  {drivers.map((d) => (
                    <Option key={d._id} value={d._id}>
                      {d.name} ({d.mobile})
                    </Option>
                  ))}
                </Select>
              </Div>
            </Div>

            {/* Date Option */}
            <Div className="space-y-1">
              <Label className={labelClass}>
                Date Option <Span className="text-rose-500">*</Span>
              </Label>
              <Div className="relative">
                <Select value={filters.date_option} onChange={(e) => updateFilter('date_option', e.target.value)} className={inputClass}>
                  <Option value="">Select</Option>
                  <Option value="today">Today</Option>
                  <Option value="yesterday">Yesterday</Option>
                  <Option value="this_week">This Week</Option>
                  <Option value="this_month">This Month</Option>
                  <Option value="this_year">This Year</Option>
                  <Option value="range">Date Range</Option>
                </Select>
              </Div>
            </Div>

            {filters.date_option === 'range' && (
              <>
                <Div className="space-y-1">
                  <Label className={labelClass}>
                    From Date <Span className="text-rose-500">*</Span>
                  </Label>
                  <Input type="date" value={filters.from_date || ''} onChange={(e) => updateFilter('from_date', e.target.value)} className={inputClass} />
                </Div>
                <Div className="space-y-1">
                  <Label className={labelClass}>
                    To Date <Span className="text-rose-500">*</Span>
                  </Label>
                  <Input type="date" value={filters.to_date || ''} onChange={(e) => updateFilter('to_date', e.target.value)} className={inputClass} />
                </Div>
              </>
            )}

            <Div className="space-y-1">
              <Label className={labelClass}>Ride Status</Label>
              <Div className="relative">
                <Select value={filters.status} onChange={(e) => updateFilter('status', e.target.value)} className={inputClass}>
                  <Option value="">All</Option>
                  <Option value="completed">Completed</Option>
                  <Option value="cancelled">Cancelled</Option>
                  <Option value="accepted">Accepted</Option>
                  <Option value="ongoing">Ongoing</Option>
                </Select>
              </Div>
            </Div>

            {/* File Format */}
            <Div className="space-y-1">
              <Label className={labelClass}>
                File Format <Span className="text-rose-500">*</Span>
              </Label>
              <Div className="relative">
                <Select value={filters.file_format} onChange={(e) => updateFilter('file_format', e.target.value)} className={inputClass}>
                  <Option value="">Select File Format</Option>
                  <Option value="csv">CSV</Option>
                  <Option value="excel">Excel</Option>
                </Select>
              </Div>
            </Div>
          </Div>

          <Div className="mt-12 flex justify-end">
            <Button
              onClick={handleDownload}
              disabled={!isFormValid || isDownloading}
              className={`flex items-center gap-3 px-8 py-3.5 rounded-xl text-[15px] font-bold tracking-wide transition-all active:scale-95 shadow-lg ${!isFormValid || isDownloading ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none' : 'bg-[#4338CA] text-white hover:bg-[#3730A3] shadow-indigo-200'}`}
            >
              {isDownloading ? (
                <Div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <UiIcon as={Download} size={18} strokeWidth={2.5} />
              )}
              {isDownloading ? 'Downloading...' : 'Download'}
            </Button>
          </Div>
        </motion.div>
      </Div>
    </ScrollDiv>
  );
};
export default DriverDutyReport;
