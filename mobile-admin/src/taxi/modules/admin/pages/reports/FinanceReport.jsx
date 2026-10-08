/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/reports/FinanceReport.jsx (tools/port.js first pass). */
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { Download, ArrowLeft, IndianRupee } from 'lucide-react-native';
import { adminService } from '../../services/adminService';
import { triggerFileDownload } from '../../../../shared/utils/downloadHelper';
import { useTaxiTransportTypes } from '../../../../shared/hooks/useTaxiTransportTypes';
import { Button, Div, Input, Option, Select, Span, Icon as UiIcon } from '../../../../../components/web';
import { alert } from '../../../../../lib/webShim';
import { useNavigate } from '../../../../../lib/webRouter';
import { AdminPage, PageHeader, Card, SectionTitle, Field, INPUT, BTN_PRIMARY, BTN_SECONDARY, BTN_TEXT_PRIMARY, BTN_TEXT_SECONDARY, useLayoutWidth } from '../../../../../admin/ui';

const FinanceReport = () => {
  const { transportTypes } = useTaxiTransportTypes();
  const navigate = useNavigate();
  const { columns } = useLayoutWidth();
  const cols = Math.min(columns, 2);
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
  const disabled = !isFormValid || isDownloading;
  return (
    <AdminPage maxWidth={720}>
      <PageHeader
        icon={IndianRupee}
        title="Finance Report"
        subtitle="Trip earnings and payment mix, exported for accounts"
        breadcrumb={[{ label: 'Reports' }, { label: 'Finance Report' }]}
        actions={
          <Button onClick={() => navigate(-1)} className={BTN_SECONDARY} accessibilityLabel="Go back">
            <UiIcon as={ArrowLeft} size={16} className="text-slate-600" />
            <Span className={BTN_TEXT_SECONDARY}>Back</Span>
          </Button>
        }
      />

      <Card>
        <SectionTitle>Report filters</SectionTitle>
        <Div className={`grid grid-cols-${cols} gap-3`}>
          <Field label="Select Transport Type">
            <Select value={filters.transport_type} onChange={(e) => updateFilter('transport_type', e.target.value)} className={INPUT} placeholder="All Transport Types">
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
          </Field>

          <Field label="Select Vehicle Type">
            <Select value={filters.vehicle_type} onChange={(e) => updateFilter('vehicle_type', e.target.value)} className={INPUT} placeholder="All Vehicle Types">
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
          </Field>

          <Field label="Trip Status">
            <Div className="flex-row flex-wrap items-center gap-5 h-11">
              <Div className="flex-row items-center gap-2">
                <Input
                  type="radio"
                  name="status"
                  value="completed"
                  checked={filters.status === 'completed'}
                  onChange={(e) => updateFilter('status', e.target.value)}
                  className="w-5 h-5"
                  accessibilityLabel="Completed trips"
                />
                <Span className="text-sm text-slate-700">Completed</Span>
              </Div>
              <Div className="flex-row items-center gap-2">
                <Input
                  type="radio"
                  name="status"
                  value="cancelled"
                  checked={filters.status === 'cancelled'}
                  onChange={(e) => updateFilter('status', e.target.value)}
                  className="w-5 h-5"
                  accessibilityLabel="Cancelled trips"
                />
                <Span className="text-sm text-slate-700">Cancelled</Span>
              </Div>
            </Div>
          </Field>

          <Field label="Payment Type">
            <Select value={filters.payment_type} onChange={(e) => updateFilter('payment_type', e.target.value)} className={INPUT} placeholder="Select Payment Type">
              <Option value="">Select Payment Type</Option>
              <Option value="cash">Cash Payment</Option>
              <Option value="online">Card / Online</Option>
            </Select>
          </Field>

          <Field label="Date Option" required>
            <Select value={filters.date_option} onChange={(e) => updateFilter('date_option', e.target.value)} className={INPUT} placeholder="Select">
              <Option value="">Select</Option>
              <Option value="today">Today</Option>
              <Option value="yesterday">Yesterday</Option>
              <Option value="this_week">This Week</Option>
              <Option value="this_month">This Month</Option>
              <Option value="this_year">This Year</Option>
              <Option value="range">Date Range</Option>
            </Select>
          </Field>

          {filters.date_option === 'range' ? (
            <>
              <Field label="From Date" required>
                <Input type="date" value={filters.from_date || ''} onChange={(e) => updateFilter('from_date', e.target.value)} className={INPUT} />
              </Field>
              <Field label="To Date" required>
                <Input type="date" value={filters.to_date || ''} onChange={(e) => updateFilter('to_date', e.target.value)} className={INPUT} />
              </Field>
            </>
          ) : null}

          <Field label="File Format" required>
            <Select value={filters.file_format} onChange={(e) => updateFilter('file_format', e.target.value)} className={INPUT} placeholder="Select File Format">
              <Option value="">Select File Format</Option>
              <Option value="csv">CSV</Option>
              <Option value="excel">Excel</Option>
            </Select>
          </Field>
        </Div>

        <Div className="mt-4">
          <Button onClick={handleDownload} disabled={disabled} className={`${BTN_PRIMARY} ${disabled ? 'opacity-50' : ''}`}>
            {isDownloading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <UiIcon as={Download} size={16} className="text-white" />}
            <Span className={BTN_TEXT_PRIMARY}>{isDownloading ? 'Downloading…' : 'Download'}</Span>
          </Button>
        </Div>
      </Card>
    </AdminPage>
  );
};
export default FinanceReport;
