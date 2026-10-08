/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/drivers/DriverDeleteRequests.jsx (tools/port.js first pass). */
import React, { useEffect, useState } from 'react';
import { useNavigate } from '../../../../../lib/webRouter';
import { AlertCircle, ArrowLeft, Search, UserX, CheckCircle2, XCircle } from 'lucide-react-native';
import { adminService } from '../../services/adminService';
import { Button, Div, Input, P, Span, Icon as UiIcon } from '../../../../../components/web';
import { alert, window } from '../../../../../lib/webShim';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  Toolbar,
  DataTable,
  THead,
  TBody,
  Row,
  Cell,
  TableSkeleton,
  EmptyState,
  ErrorState,
  INPUT,
  BTN_SECONDARY,
  BTN_TEXT_SECONDARY,
} from '../../../../../admin/ui';
const COLS = [190, 130, 200, 150, 220];
const DriverDeleteRequests = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [drivers, setDrivers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fetchDeleteRequests = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await adminService.getDriverDeleteRequests();
      if (response?.success) {
        setDrivers(response?.data?.results || []);
      } else {
        setError(response?.message || 'Unable to load driver delete requests');
      }
    } catch (requestError) {
      setError(requestError?.message || 'Unable to load driver delete requests');
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    fetchDeleteRequests();
  }, []);
  const handleApprove = async (id) => {
    if (!(await window.confirmAsync('Approve this driver account deletion request?'))) return;
    setIsSubmitting(true);
    try {
      const response = await adminService.approveDriverDeleteRequest(id);
      if (response?.success) {
        fetchDeleteRequests();
      } else {
        alert(response?.message || 'Failed to approve delete request');
      }
    } catch (requestError) {
      alert(requestError?.message || 'Failed to approve delete request');
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleReject = async (id) => {
    if (!(await window.confirmAsync('Reject this driver account deletion request?'))) return;
    setIsSubmitting(true);
    try {
      const response = await adminService.rejectDriverDeleteRequest(id);
      if (response?.success) {
        fetchDeleteRequests();
      } else {
        alert(response?.message || 'Failed to reject delete request');
      }
    } catch (requestError) {
      alert(requestError?.message || 'Failed to reject delete request');
    } finally {
      setIsSubmitting(false);
    }
  };
  const filteredDrivers = drivers.filter((item) => {
    const name = String(item.name || '').toLowerCase();
    const mobile = String(item.mobile || item.phone || '');
    const reason = String(item.deletionRequest?.reason || '').toLowerCase();
    const needle = searchTerm.toLowerCase();
    return name.includes(needle) || mobile.includes(searchTerm) || reason.includes(needle);
  });
  const formatDate = (value) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  const driverCodeOf = (item) =>
    item.driver_code ||
    item.referralCode ||
    (item.mobile || item.phone
      ? `DRV${String(item.mobile || item.phone).slice(-4)}${String(item._id || '')
          .slice(-6)
          .toUpperCase()}`.replace(/\W/g, '')
      : 'N/A');
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={UserX}
        title="Delete requests"
        subtitle={`${drivers.length} driver account deletion requests waiting for review`}
        breadcrumb={[{ label: 'Driver management' }, { label: 'Delete requests' }]}
        actions={
          <Button type="button" onClick={() => navigate('/taxi/admin/drivers')} className={BTN_SECONDARY}>
            <UiIcon as={ArrowLeft} size={16} className="text-slate-700" />
            <Span className={BTN_TEXT_SECONDARY}>Back to drivers</Span>
          </Button>
        }
      />

      <Card className="mb-4">
        <Toolbar className="mb-0">
          <Div className="flex-1 min-w-[200px] flex-row items-center gap-2">
            <UiIcon as={Search} size={16} className="text-slate-400" />
            <Input
              type="text"
              placeholder="Search by driver, mobile or reason"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className={`${INPUT} flex-1`}
            />
          </Div>
        </Toolbar>
      </Card>

      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchDeleteRequests} />
      ) : filteredDrivers.length === 0 ? (
        <EmptyState
          icon={UserX}
          title={searchTerm ? 'No matching requests' : 'No delete requests'}
          message={
            searchTerm
              ? 'No deletion request matches that search. Clear it to see the whole queue.'
              : 'There are currently no driver account deletion requests. New requests appear here automatically.'
          }
          actionLabel={searchTerm ? 'Clear search' : 'Refresh'}
          onAction={searchTerm ? () => setSearchTerm('') : fetchDeleteRequests}
        />
      ) : (
        <DataTable cols={COLS}>
          <THead cols={COLS} labels={['Driver', 'Mobile', 'Reason', 'Requested at', 'Action']} />
          <TBody>
            {filteredDrivers.map((item, index) => (
              <Row key={item._id} last={index === filteredDrivers.length - 1}>
                <Cell width={COLS[0]}>
                  <Div>
                    <P className="text-sm font-medium text-slate-900" numberOfLines={1}>
                      {item.name || 'Unknown'}
                    </P>
                    <P className="text-xs text-slate-500 mt-0.5" numberOfLines={1}>
                      {driverCodeOf(item)}
                    </P>
                    <P className="text-xs text-slate-500" numberOfLines={1}>
                      {item.email || 'No email'}
                    </P>
                  </Div>
                </Cell>
                <Cell width={COLS[1]}>{item.mobile || item.phone || 'N/A'}</Cell>
                <Cell width={COLS[2]}>{item.deletionRequest?.reason || 'N/A'}</Cell>
                <Cell width={COLS[3]}>{formatDate(item.deletionRequest?.requestedAt)}</Cell>
                <Cell width={COLS[4]}>
                  <Div className="flex-row items-center gap-2">
                    <Button
                      disabled={isSubmitting}
                      onClick={() => handleApprove(item._id)}
                      accessibilityLabel={`Approve deletion for ${item.name || 'driver'}`}
                      className={`flex-row items-center justify-center gap-1.5 h-11 px-3 rounded-lg bg-red-600 ${isSubmitting ? 'opacity-50' : ''}`}
                    >
                      <UiIcon as={CheckCircle2} size={14} className="text-white" />
                      <Span className="text-sm font-semibold text-white">Approve</Span>
                    </Button>
                    <Button
                      disabled={isSubmitting}
                      onClick={() => handleReject(item._id)}
                      accessibilityLabel={`Reject deletion for ${item.name || 'driver'}`}
                      className={`flex-row items-center justify-center gap-1.5 h-11 px-3 rounded-lg border border-slate-300 bg-white ${isSubmitting ? 'opacity-50' : ''}`}
                    >
                      <UiIcon as={XCircle} size={14} className="text-slate-700" />
                      <Span className="text-sm font-semibold text-slate-700">Reject</Span>
                    </Button>
                  </Div>
                </Cell>
              </Row>
            ))}
          </TBody>
        </DataTable>
      )}

      <Card className="mt-4">
        <SectionTitle>Delete review protocol</SectionTitle>
        <Div className="flex-row items-start gap-3">
          <UiIcon as={AlertCircle} size={16} className="text-amber-700 mt-0.5" />
          <Div className="flex-1 gap-1">
            <P className="text-sm text-slate-700">{"Approving a request permanently deactivates the driver's account and removes access to the platform."}</P>
            <P className="text-sm text-slate-700">Rejecting a request keeps the account active. Review all submitted information before taking action.</P>
          </Div>
        </Div>
      </Card>
    </AdminPage>
  );
};
export default DriverDeleteRequests;
