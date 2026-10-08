/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/reports/UserReport.jsx (tools/port.js first pass). */
import React, { useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { Download, ArrowLeft, FileText } from 'lucide-react-native';
import { adminService } from '../../services/adminService';
import { triggerFileDownload } from '../../../../shared/utils/downloadHelper';
import { Button, Div, Input, Option, Select, Span, Icon as UiIcon } from '../../../../../components/web';
import { alert } from '../../../../../lib/webShim';
import { useNavigate } from '../../../../../lib/webRouter';
import { AdminPage, PageHeader, Card, SectionTitle, Field, INPUT, BTN_PRIMARY, BTN_SECONDARY, BTN_TEXT_PRIMARY, BTN_TEXT_SECONDARY, useLayoutWidth } from '../../../../../admin/ui';

const UserReport = () => {
  const navigate = useNavigate();
  const { columns } = useLayoutWidth();
  const cols = Math.min(columns, 2);
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
  const disabled = !status || !dateOption || !fileFormat || isDownloading || (dateOption === 'range' && (!fromDate || !toDate));
  return (
    <AdminPage maxWidth={720}>
      <PageHeader
        icon={FileText}
        title="User Report"
        subtitle="Export the rider list as CSV or Excel"
        breadcrumb={[{ label: 'Reports' }, { label: 'User Report' }]}
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
          <Field label="Select Status" required>
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className={INPUT} placeholder="Select User Status">
              <Option value="">Select User Status</Option>
              <Option value="active">Active Users</Option>
              <Option value="inactive">Inactive Users</Option>
            </Select>
          </Field>

          <Field label="Date Option" required>
            <Select value={dateOption} onChange={(e) => setDateOption(e.target.value)} className={INPUT} placeholder="Select">
              <Option value="">Select</Option>
              <Option value="today">Today</Option>
              <Option value="yesterday">Yesterday</Option>
              <Option value="this_week">This Week</Option>
              <Option value="this_month">This Month</Option>
              <Option value="this_year">This Year</Option>
              <Option value="range">Date Range</Option>
            </Select>
          </Field>

          {dateOption === 'range' && (
            <>
              <Field label="From Date" required>
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={INPUT} />
              </Field>
              <Field label="To Date" required>
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={INPUT} />
              </Field>
            </>
          )}

          <Field label="File Format" required>
            <Select value={fileFormat} onChange={(e) => setFileFormat(e.target.value)} className={INPUT} placeholder="Select File Format">
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
export default UserReport;
