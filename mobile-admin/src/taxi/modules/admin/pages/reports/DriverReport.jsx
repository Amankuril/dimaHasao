/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/reports/DriverReport.jsx (tools/port.js first pass). */
import React, { useState, useEffect } from 'react';
import { ActivityIndicator } from 'react-native';
import { Download, ArrowLeft, FileText } from 'lucide-react-native';
import { adminService } from '../../services/adminService';
import { triggerFileDownload } from '../../../../shared/utils/downloadHelper';
import { Button, Div, Input, Option, Select, Span, Icon as UiIcon } from '../../../../../components/web';
import { alert } from '../../../../../lib/webShim';
import { useNavigate } from '../../../../../lib/webRouter';
import { AdminPage, PageHeader, Card, SectionTitle, Field, INPUT, BTN_PRIMARY, BTN_SECONDARY, BTN_TEXT_PRIMARY, BTN_TEXT_SECONDARY, useLayoutWidth } from '../../../../../admin/ui';

const DriverReport = () => {
  const navigate = useNavigate();
  const { columns } = useLayoutWidth();
  const cols = Math.min(columns, 2);
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
  const disabled = !isFormValid || isDownloading;
  return (
    <AdminPage maxWidth={720}>
      <PageHeader
        icon={FileText}
        title="Driver Report"
        subtitle="Export the driver list as CSV or Excel"
        breadcrumb={[{ label: 'Reports' }, { label: 'Driver Report' }]}
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
            <Select value={filters.transport_type} onChange={(e) => updateFilter('transport_type', e.target.value)} className={INPUT} placeholder="Select">
              <Option value="">Select</Option>
              <Option value="taxi">Taxi</Option>
              <Option value="bike">Bike</Option>
              <Option value="both">Both (Taxi & Bike)</Option>
            </Select>
          </Field>

          <Field label="Select Vehicle Type" hint={vehicleTypes.length ? undefined : 'Pick a transport type to list its vehicles'}>
            <Select value={filters.vehicle_type} onChange={(e) => updateFilter('vehicle_type', e.target.value)} className={INPUT} placeholder="Select Vehicle Type">
              <Option value="">Select Vehicle Type</Option>
              {vehicleTypes.map((type) => (
                <Option key={type._id || type.id} value={type.name}>
                  {type.name}
                </Option>
              ))}
            </Select>
          </Field>

          <Field label="Select Approval Status" required>
            <Select value={filters.approval_status} onChange={(e) => updateFilter('approval_status', e.target.value)} className={INPUT} placeholder="Select">
              <Option value="">Select</Option>
              <Option value="approved">Approved</Option>
              <Option value="pending">Pending</Option>
              <Option value="disapproved">Disapproved</Option>
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

          {filters.date_option === 'range' && (
            <>
              <Field label="From Date" required>
                <Input type="date" value={filters.from_date || ''} onChange={(e) => updateFilter('from_date', e.target.value)} className={INPUT} />
              </Field>
              <Field label="To Date" required>
                <Input type="date" value={filters.to_date || ''} onChange={(e) => updateFilter('to_date', e.target.value)} className={INPUT} />
              </Field>
            </>
          )}

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
export default DriverReport;
