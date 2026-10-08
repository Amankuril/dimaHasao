/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/reports/FinanceReport.jsx (tools/port.js first pass). */
import React, { useEffect, useMemo, useState } from 'react';
import { Download, ChevronRight, ArrowLeft } from 'lucide-react-native';
import { motion } from '../../../../../lib/motion';
import { adminService } from '../../services/adminService';
import { triggerFileDownload } from '../../../../shared/utils/downloadHelper';
import { useTaxiTransportTypes } from '../../../../shared/hooks/useTaxiTransportTypes';
import { Button, Div, H1, Input, Label, Option, ScrollDiv, Select, Span, Icon as UiIcon } from '../../../../../components/web';
import { alert } from '../../../../../lib/webShim';
import { useNavigate } from '../../../../../lib/webRouter';
const FinanceReport = () => {
  const { transportTypes } = useTaxiTransportTypes();
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    transport_type: '',
    vehicle_type: '',
    status: 'completed',
    payment_type: '',
    date_option: '',
    file_format: '',
  });
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [isDownloading, setIsDownloading] = useState(false);
  useEffect(() => {
    let active = true;
    const loadVehicleTypes = async () => {
      try {
        const selectedTransportType = filters.transport_type && !['all', 'both'].includes(filters.transport_type) ? filters.transport_type : '';
        const response = await adminService.getVehicleTypes(selectedTransportType);
        const items = response?.data?.results || response?.data || response?.results || [];
        if (!active) {
          return;
        }
        setVehicleTypes(Array.isArray(items) ? items : []);
      } catch (_error) {
        if (!active) {
          return;
        }
        setVehicleTypes([]);
      }
    };
    loadVehicleTypes();
    return () => {
      active = false;
    };
  }, [filters.transport_type]);
  useEffect(() => {
    setFilters((current) => {
      if (!current.vehicle_type) {
        return current;
      }
      const exists = vehicleTypes.some((item) => {
        const candidate = String(item?.type_name || item?.name || item?.value || '')
          .trim()
          .toLowerCase();
        return candidate === String(current.vehicle_type).trim().toLowerCase();
      });
      return exists
        ? current
        : {
            ...current,
            vehicle_type: '',
          };
    });
  }, [vehicleTypes]);
  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await adminService.downloadFinanceReport(filters);
      await triggerFileDownload(response, `finance_report_${Date.now()}`, filters.file_format);
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
  const isFormValid = filters.date_option && filters.file_format && (filters.date_option !== 'range' || (filters.from_date && filters.to_date));
  const transportTypeOptions = useMemo(() => transportTypes.filter((item) => String(item?.name || item?.value || '').trim()), [transportTypes]);
  const inputClass =
    'w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-800 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors appearance-none shadow-sm';
  const labelClass = 'block text-[13px] font-bold text-gray-600 mb-2';
  return (
    <ScrollDiv className="min-h-screen bg-[#F9FAFB] p-6 lg:p-8">
      <Div className="mb-8">
        <Div className="flex items-center gap-2 text-xs text-gray-400 mb-3 font-medium">
          <Span>Finance Report</Span>
          <UiIcon as={ChevronRight} size={14} className="opacity-50" />
          <Span className="text-gray-600 font-semibold italic">Finance Report</Span>
        </Div>
        <Div className="flex items-center justify-between border-b border-gray-100 pb-5">
          <H1 className="text-2xl font-bold text-[#334155] tracking-tight uppercase">Finance Report</H1>
          <Button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm active:scale-95"
          >
            <UiIcon as={ArrowLeft} size={16} strokeWidth={2.5} /> Back
          </Button>
        </Div>
      </Div>

      <Div className="max-w-6xl mx-auto">
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
          <Div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
            <Div className="space-y-1">
              <Label className={labelClass}>Select Transport Type</Label>
              <Div className="relative">
                <Select value={filters.transport_type} onChange={(e) => updateFilter('transport_type', e.target.value)} className={inputClass}>
                  <Option value="">All Transport Types</Option>
                  {transportTypeOptions.map((type) => {
                    const value = type?.name || type?.value || '';
                    const label = type?.display_name || type?.label || value;
                    return (
                      <Option key={value} value={value}>
                        {label}
                      </Option>
                    );
                  })}
                </Select>
              </Div>
            </Div>

            <Div className="space-y-1">
              <Label className={labelClass}>Select Vehicle Type</Label>
              <Div className="relative">
                <Select value={filters.vehicle_type} onChange={(e) => updateFilter('vehicle_type', e.target.value)} className={inputClass}>
                  <Option value="">All Vehicle Types</Option>
                  {vehicleTypes.map((item) => {
                    const value = String(item?.type_name || item?.name || item?.value || '')
                      .trim()
                      .toLowerCase();
                    const label = item?.type_name || item?.name || item?.label || value;
                    return (
                      <Option key={String(item?._id || value)} value={value}>
                        {label}
                      </Option>
                    );
                  })}
                </Select>
              </Div>
            </Div>

            <Div className="space-y-1">
              <Label className={labelClass}>Trip Status</Label>
              <Div className="flex items-center gap-8 py-2 px-1">
                <Label className="flex items-center gap-2.5 cursor-pointer">
                  <Input
                    type="radio"
                    name="status"
                    value="completed"
                    checked={filters.status === 'completed'}
                    onChange={(e) => updateFilter('status', e.target.value)}
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  />
                  <Span className="text-sm font-bold text-gray-700">Completed</Span>
                </Label>
                <Label className="flex items-center gap-2.5 cursor-pointer">
                  <Input
                    type="radio"
                    name="status"
                    value="cancelled"
                    checked={filters.status === 'cancelled'}
                    onChange={(e) => updateFilter('status', e.target.value)}
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  />
                  <Span className="text-sm font-bold text-gray-700">Cancelled</Span>
                </Label>
              </Div>
            </Div>

            <Div className="space-y-1">
              <Label className={labelClass}>Payment Type</Label>
              <Div className="relative">
                <Select value={filters.payment_type} onChange={(e) => updateFilter('payment_type', e.target.value)} className={inputClass}>
                  <Option value="">Select Payment Type</Option>
                  <Option value="cash">Cash Payment</Option>
                  <Option value="online">Card / Online</Option>
                </Select>
              </Div>
            </Div>

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

            {filters.date_option === 'range' ? (
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
            ) : null}

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
export default FinanceReport;
