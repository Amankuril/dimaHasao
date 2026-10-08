/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/reports/UserReport.jsx (tools/port.js first pass). */
import React, { useState } from 'react';
import { Download, ChevronRight, ArrowLeft } from 'lucide-react-native';
import { motion } from '../../../../../lib/motion';
import { adminService } from '../../services/adminService';
import { triggerFileDownload } from '../../../../shared/utils/downloadHelper';
import { Button, Div, H1, Input, Label, Option, ScrollDiv, Select, Span, Icon as UiIcon } from '../../../../../components/web';
import { alert } from '../../../../../lib/webShim';
import { useNavigate } from '../../../../../lib/webRouter';
const UserReport = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const [dateOption, setDateOption] = useState('');
  const [fileFormat, setFileFormat] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await adminService.downloadUserReport({
        status,
        date_option: dateOption,
        from_date: fromDate,
        to_date: toDate,
        file_format: fileFormat,
      });
      const success = await triggerFileDownload(response, `user_report_${Date.now()}`, fileFormat);
      if (!success) {
        throw new Error('Trigger failed');
      }
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to generate report. Please check server availability.');
    } finally {
      setIsDownloading(false);
    }
  };
  const inputClass =
    'w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-800 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors appearance-none shadow-sm';
  const labelClass = 'block text-[13px] font-bold text-gray-600 mb-2';
  return (
    <ScrollDiv className="min-h-screen bg-[#F9FAFB] p-6 lg:p-8">
      {/* Header Block */}
      <Div className="mb-8">
        <Div className="flex items-center gap-2 text-xs text-gray-400 mb-3 font-medium">
          <Span>User Report</Span>
          <UiIcon as={ChevronRight} size={14} className="opacity-50" />
          <Span className="text-gray-600 font-semibold">User Report</Span>
        </Div>
        <Div className="flex items-center justify-between border-b border-gray-100 pb-5">
          <H1 className="text-2xl font-bold text-[#334155] tracking-tight uppercase">User Report</H1>
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
          className="bg-white rounded-2xl border border-gray-100 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
        >
          <Div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Select Status */}
            <Div className="space-y-1">
              <Label className={labelClass}>
                Select Status <Span className="text-rose-500">*</Span>
              </Label>
              <Div className="relative">
                <Select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
                  <Option value="">Select User Status</Option>
                  <Option value="active">Active Users</Option>
                  <Option value="inactive">Inactive Users</Option>
                </Select>
              </Div>
            </Div>

            {/* Date Option */}
            <Div className="space-y-1">
              <Label className={labelClass}>
                Date Option <Span className="text-rose-500">*</Span>
              </Label>
              <Div className="relative">
                <Select value={dateOption} onChange={(e) => setDateOption(e.target.value)} className={inputClass}>
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

            {dateOption === 'range' && (
              <>
                <Div className="space-y-1">
                  <Label className={labelClass}>
                    From Date <Span className="text-rose-500">*</Span>
                  </Label>
                  <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={inputClass} />
                </Div>
                <Div className="space-y-1">
                  <Label className={labelClass}>
                    To Date <Span className="text-rose-500">*</Span>
                  </Label>
                  <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={inputClass} />
                </Div>
              </>
            )}

            {/* File Format */}
            <Div className="space-y-1">
              <Label className={labelClass}>
                File Format <Span className="text-rose-500">*</Span>
              </Label>
              <Div className="relative">
                <Select value={fileFormat} onChange={(e) => setFileFormat(e.target.value)} className={inputClass}>
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
              disabled={!status || !dateOption || !fileFormat || isDownloading || (dateOption === 'range' && (!fromDate || !toDate))}
              className={`flex items-center gap-3 px-8 py-3.5 rounded-xl text-[15px] font-bold tracking-wide transition-all active:scale-95 shadow-lg ${!status || !dateOption || !fileFormat || isDownloading || (dateOption === 'range' && (!fromDate || !toDate)) ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none' : 'bg-[#4338CA] text-white hover:bg-[#3730A3] shadow-indigo-200'}`}
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
export default UserReport;
