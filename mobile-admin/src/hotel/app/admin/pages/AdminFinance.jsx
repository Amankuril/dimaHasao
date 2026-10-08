/* Ported from Frontend/src/modules/Hotel/app/admin/pages/AdminFinance.jsx (tools/port.js first pass). */
import React, { useState, useMemo, useEffect } from 'react';
import { Wallet, TrendingUp, Download } from 'lucide-react-native';
import ConfirmationModal from '../components/ConfirmationModal';
import PayoutSettlements from '../components/PayoutSettlements';
import adminService from '../../../services/adminService';
import { toast } from '../../../../lib/notify';
import { getAdminToken } from '../../../../admin/session';
import { Button, Div, Option, P, Select, Span, Strong, Icon as UiIcon } from '../../../../components/web';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  StatCard,
  StatGrid,
  Toolbar,
  DataTable,
  THead,
  TBody,
  Row,
  Cell,
  StatusBadge,
  TableSkeleton,
  EmptyState,
  ErrorState,
  INPUT,
  BTN_SECONDARY,
  BTN_TEXT_SECONDARY,
} from '../../../../admin/ui';
const currency = (n) => `₹${(n || 0).toLocaleString()}`;
const COLS = [190, 160, 130, 130];
const AdminFinance = () => {
  const [stats, setStats] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'success',
    onConfirm: () => {},
  });
  const commissionRate = 0.2;
  useEffect(() => {
    const fetchData = async () => {
      // The web reads its module token here; this app's hotel calls ride the admin session token.
      const token = getAdminToken();
      if (!token) return;
      try {
        setLoading(true);
        setLoadError(null);
        const [dash, reqs] = await Promise.all([adminService.getDashboardStats(), adminService.getPropertyRequests()]);
        if (dash.success) setStats(dash.stats);
        if (reqs.success) setRequests(reqs.hotels || []);
      } catch (error) {
        if (error.response?.status !== 401) {
          toast.error('Failed to load finance data');
          setLoadError(error.response?.data?.message || error.message || 'Failed to load finance data.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter Logic
  const filteredRequests = useMemo(() => {
    if (statusFilter === 'All Status') return requests;
    return requests.filter((s) => (statusFilter === 'Active' ? s.status === 'approved' : s.status !== 'approved'));
  }, [requests, statusFilter]);
  return (
    <AdminPage maxWidth={1200}>
      <ConfirmationModal
        isOpen={modalConfig.isOpen}
        onClose={() =>
          setModalConfig({
            ...modalConfig,
            isOpen: false,
          })
        }
        {...modalConfig}
      />

      <PageHeader
        icon={Wallet}
        title="Revenue Overview"
        subtitle="Track booking commissions and partner payouts."
        breadcrumb={[{ label: 'Hotel' }, { label: 'Finance & Payouts' }]}
        actions={
          <Button className={BTN_SECONDARY}>
            <UiIcon as={Download} size={16} className="text-slate-600" />
            <Span className={BTN_TEXT_SECONDARY}>Export Report</Span>
          </Button>
        }
      />

      {loadError ? (
        <ErrorState title="Could not load finance data" message={loadError} />
      ) : (
        <>
          <StatGrid className="mb-4">
            <StatCard label="Total Revenue" value={loading ? '—' : currency(stats?.totalRevenue)} hint="Confirmed booking totals" icon={TrendingUp} tone="success" />
            <StatCard
              label="Commissions (20%)"
              value={loading ? '—' : currency(Math.round((stats?.totalRevenue || 0) * commissionRate))}
              hint={`From ${stats?.confirmedBookings || 0} bookings`}
              icon={Wallet}
              tone="info"
            />
          </StatGrid>

          {/* Commission breakdown */}
          <Card className="mb-4">
            <SectionTitle>Commissions</SectionTitle>
            <P className="text-sm text-slate-500 -mt-2 mb-3">20% on confirmed bookings</P>
            <Div className="gap-2">
              <Div className="flex-row justify-between items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <P className="text-sm text-slate-700">Bookings</P>
                <P className="text-sm font-semibold text-slate-900">{stats?.totalBookings || 0}</P>
              </Div>
              <Div className="flex-row justify-between items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <P className="text-sm text-slate-700">Earnings</P>
                <P className="text-sm font-semibold text-slate-900">{currency(Math.round((stats?.totalRevenue || 0) * commissionRate))}</P>
              </Div>
            </Div>
          </Card>

          <Div className="mb-4">
            <PayoutSettlements />
          </Div>

          {/* Pending Property Requests */}
          <Card className="mb-4">
            <SectionTitle>Pending Property Requests</SectionTitle>
            <Toolbar>
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${INPUT} flex-1 min-w-[160px]`}>
                <Option>All Status</Option>
                <Option>Active</Option>
                <Option>Pending</Option>
              </Select>
            </Toolbar>
            {loading ? (
              <TableSkeleton rows={3} className="border-0 p-0" />
            ) : filteredRequests.length === 0 ? (
              <EmptyState
                title="No property requests"
                message={statusFilter === 'All Status' ? 'Partner property submissions appear here.' : `No requests match “${statusFilter}”.`}
                actionLabel={statusFilter === 'All Status' ? undefined : 'Clear filter'}
                onAction={statusFilter === 'All Status' ? undefined : () => setStatusFilter('All Status')}
                className="border-0"
              />
            ) : (
              <DataTable cols={COLS}>
                <THead cols={COLS} labels={['Property Name', 'Owner', 'City', 'Status']} />
                <TBody>
                  {filteredRequests.map((h, i) => (
                    <Row key={h._id} last={i === filteredRequests.length - 1}>
                      <Cell width={COLS[0]}>
                        <Span numberOfLines={2} className="text-sm font-semibold text-slate-900">
                          {h.name}
                        </Span>
                      </Cell>
                      <Cell width={COLS[1]}>{h.ownerId?.name || 'Partner'}</Cell>
                      <Cell width={COLS[2]}>{h.address?.city || '—'}</Cell>
                      <Cell width={COLS[3]}>
                        <StatusBadge status={h.status} />
                      </Cell>
                    </Row>
                  ))}
                </TBody>
              </DataTable>
            )}
          </Card>

          {/* Revenue model */}
          <Card className="bg-blue-50 border-blue-200">
            <Div className="flex-row items-center gap-2 mb-2">
              <UiIcon as={TrendingUp} size={18} className="text-blue-700" />
              <Span className="text-base font-semibold text-slate-900">Revenue Model</Span>
            </Div>
            <P className="text-sm text-slate-700">
              <Strong>Booking Commission:</Strong> Platform earns 20% commission on every confirmed room booking.
            </P>
          </Card>
        </>
      )}
    </AdminPage>
  );
};
export default AdminFinance;
