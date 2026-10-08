/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/reports/DriverReport.jsx (tools/port.js first pass). */
import React, { useState, useEffect } from 'react';
import { Download, ChevronRight, ArrowLeft } from 'lucide-react-native';
import { motion } from '../../../../../lib/motion';
import { adminService } from '../../services/adminService';
import { triggerFileDownload } from '../../../../shared/utils/downloadHelper';
import { Button, Div, H1, Input, Label, Option, ScrollDiv, Select, Span, Icon as UiIcon } from '../../../../../components/web';
import { alert } from '../../../../../lib/webShim';
import { useNavigate } from '../../../../../lib/webRouter';
const DriverReport = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    transport_type: '',
    vehicle_type: '',
    approval_status: '',
    date_option: '',
    file_format: '',
  });
  const [isDownloading, setIsDownloading] = useState(false);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  useEffect(() => {
    const fetchVehicleTypes = async () => {
      try {
        const response = await adminService.getVehicleTypes(filters.transport_type);
        if (response.success) {
          const results = Array.isArray(response.data) ? response.data : response.data?.results || response.data?.data || [];
          setVehicleTypes(results);
        }
      } catch (err) {
        console.error('Error fetching vehicle types:', err);
      }
    };
    fetchVehicleTypes();
  }, [filters.transport_type]);
  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await adminService.downloadDriverReport(filters);
      const success = await triggerFileDownload(response, `driver_report_${Date.now()}`, filters.file_format);
      if (!success) {
        throw new Error('Trigger failed');
      }
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to generate report. Please try again later.');
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
    filters.approval_status && filters.date_option && filters.file_format && (filters.date_option !== 'range' || (filters.from_date && filters.to_date));
  const inputClass =
    'w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-800 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors appearance-none shadow-sm';
  const labelClass = 'block text-[13px] font-bold text-gray-600 mb-2';
  return (
    <ScrollDiv className="min-h-screen bg-[#F9FAFB] p-6 lg:p-8">
      {/* Breadcrumbs & Header */}
      <Div className="mb-8">
        <Div className="flex items-center gap-2 text-xs text-gray-400 mb-3 font-medium">
          <Span>Driver Report</Span>
          <UiIcon as={ChevronRight} size={14} className="opacity-50" />
          <Span className="text-gray-600 font-semibold italic">Driver Report</Span>
        </Div>
        <Div className="flex items-center justify-between border-b border-gray-100 pb-5">
          <H1 className="text-2xl font-bold text-[#334155] tracking-tight uppercase">Driver Report</H1>
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
            {/* Select Transport Type */}
            <Div className="space-y-1">
              <Label className={labelClass}>Select Transport Type</Label>
              <Div className="relative">
                <Select value={filters.transport_type} onChange={(e) => updateFilter('transport_type', e.target.value)} className={inputClass}>
                  <Option value="">Select</Option>
                  <Option value="taxi">Taxi</Option>
                  <Option value="bike">Bike</Option>
                  <Option value="both">Both (Taxi & Bike)</Option>
                </Select>
              </Div>
            </Div>

            {/* Select Vehicle Type */}
            <Div className="space-y-1">
              <Label className={labelClass}>Select Vehicle Type</Label>
              <Div className="relative">
                <Select value={filters.vehicle_type} onChange={(e) => updateFilter('vehicle_type', e.target.value)} className={inputClass}>
                  <Option value="">Select Vehicle Type</Option>
                  {vehicleTypes.map((type) => (
                    <Option key={type._id || type.id} value={type.name}>
                      {type.name}
                    </Option>
                  ))}
                </Select>
              </Div>
            </Div>

            {/* Select Approval Status */}
            <Div className="space-y-1">
              <Label className={labelClass}>
                Select Approval Status <Span className="text-rose-500">*</Span>
              </Label>
              <Div className="relative">
                <Select value={filters.approval_status} onChange={(e) => updateFilter('approval_status', e.target.value)} className={inputClass}>
                  <Option value="">Select</Option>
                  <Option value="approved">Approved</Option>
                  <Option value="pending">Pending</Option>
                  <Option value="disapproved">Disapproved</Option>
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
export default DriverReport;
