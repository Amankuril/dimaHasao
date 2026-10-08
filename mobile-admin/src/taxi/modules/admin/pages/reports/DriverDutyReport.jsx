/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/reports/DriverDutyReport.jsx (tools/port.js first pass). */
import React, { useState, useEffect } from 'react';
import { ActivityIndicator } from 'react-native';
import { Download, ArrowLeft, ClipboardList } from 'lucide-react-native';
import { adminService } from '../../services/adminService';
import { triggerFileDownload } from '../../../../shared/utils/downloadHelper';
import { Button, Div, Input, Option, Select, Span, Icon as UiIcon } from '../../../../../components/web';
import { alert } from '../../../../../lib/webShim';
import { useNavigate } from '../../../../../lib/webRouter';
import { AdminPage, PageHeader, Card, SectionTitle, Field, INPUT, BTN_PRIMARY, BTN_SECONDARY, BTN_TEXT_PRIMARY, BTN_TEXT_SECONDARY, useLayoutWidth } from '../../../../../admin/ui';

const DriverDutyReport = () => {
  const navigate = useNavigate();
  const { columns } = useLayoutWidth();
  const cols = Math.min(columns, 2);
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
  const disabled = !isFormValid || isDownloading;
  return (
    <AdminPage maxWidth={720}>
      <PageHeader
        icon={ClipboardList}
        title="Driver Duty Report"
        subtitle="Duty hours and ride outcomes per driver"
        breadcrumb={[{ label: 'Reports' }, { label: 'Driver Duty Report' }]}
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
          <Field label="Service Location" required hint={locations.length ? undefined : 'No service locations loaded yet'}>
            <Select value={filters.service_location_id} onChange={(e) => updateFilter('service_location_id', e.target.value)} className={INPUT} placeholder="Select">
              <Option value="">Select</Option>
              {locations.map((loc) => (
                <Option key={loc._id} value={loc._id}>
                  {loc.name}
                </Option>
              ))}
            </Select>
          </Field>

          <Field label="Driver" required hint={drivers.length ? undefined : 'No drivers loaded yet'}>
            <Select value={filters.driver_id} onChange={(e) => updateFilter('driver_id', e.target.value)} className={INPUT} placeholder="Select">
              <Option value="">Select</Option>
              {drivers.map((d) => (
                <Option key={d._id} value={d._id}>
                  {d.name} ({d.mobile})
                </Option>
              ))}
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

          <Field label="Ride Status">
            <Select value={filters.status} onChange={(e) => updateFilter('status', e.target.value)} className={INPUT} placeholder="All">
              <Option value="">All</Option>
              <Option value="completed">Completed</Option>
              <Option value="cancelled">Cancelled</Option>
              <Option value="accepted">Accepted</Option>
              <Option value="ongoing">Ongoing</Option>
            </Select>
          </Field>

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
export default DriverDutyReport;
