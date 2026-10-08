/* Ported from Frontend/src/modules/Hotel/app/admin/pages/AdminFinance.jsx (tools/port.js first pass). */
import React, { useState, useMemo, useEffect } from 'react';
import { Wallet, TrendingUp, Download, ArrowUpRight, ArrowDownRight, CreditCard, Calendar, CheckCircle, Clock, Loader2, Users } from 'lucide-react-native';
import ConfirmationModal from '../components/ConfirmationModal';
import PayoutSettlements from '../components/PayoutSettlements';
import adminService from '../../../services/adminService';
import { toast } from '../../../../lib/notify';
import { getAdminToken } from '../../../../admin/session';
import {
  Button,
  Div,
  H2,
  H3,
  H4,
  Option,
  P,
  ScrollDiv,
  Select,
  Span,
  Strong,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Icon as UiIcon,
} from '../../../../components/web';
const currency = (n) => `₹${(n || 0).toLocaleString()}`;
const FinanceStatCard = ({ title, value, subtext, color, icon: Icon }) => (
  <Div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-start justify-between">
    <Div>
      <P className="text-gray-500 text-sm font-medium mb-1">{title}</P>
      <H3 className="text-2xl font-bold text-gray-900">{value}</H3>
      {subtext && <P className={`text-xs mt-1 ${color}`}>{subtext}</P>}
    </Div>
    <Div className={`p-3 rounded-lg ${color.replace('text-', 'bg-').replace('600', '50')} ${color}`}>
      <UiIcon as={Icon} size={24} className={color} />
    </Div>
  </Div>
);
const AdminFinance = () => {
  const [stats, setStats] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
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
        const [dash, reqs] = await Promise.all([adminService.getDashboardStats(), adminService.getPropertyRequests()]);
        if (dash.success) setStats(dash.stats);
        if (reqs.success) setRequests(reqs.hotels || []);
      } catch (error) {
        if (error.response?.status !== 401) {
          toast.error('Failed to load finance data');
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
    <ScrollDiv className="space-y-6">
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

      {/* Header */}
      <Div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <Div>
          <H2 className="text-2xl font-bold text-gray-900">Revenue Overview</H2>
          <P className="text-gray-500 text-sm">Track booking commissions.</P>
        </Div>
        <Button className="flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors shadow-lg">
          <UiIcon as={Download} size={16} className="text-white" />
          <Span className="text-white text-sm font-medium">Export Report</Span>
        </Button>
      </Div>

      {/* Stats */}
      <Div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FinanceStatCard title="Total Revenue" value={currency(stats?.totalRevenue)} subtext="" color="text-green-600" icon={TrendingUp} />
        <FinanceStatCard
          title="Commissions (20%)"
          value={currency(Math.round((stats?.totalRevenue || 0) * commissionRate))}
          subtext={`From ${stats?.confirmedBookings || 0} bookings`}
          color="text-purple-600"
          icon={Wallet}
        />
      </Div>

      {/* Revenue Breakdown */}
      <Div className="grid grid-cols-1 gap-6">
        {/* Booking Commission Revenue */}
        <Div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <Div className="px-6 py-4 border-b border-gray-100 bg-purple-50">
            <Div>
              <Div className="flex items-center gap-2">
                <UiIcon as={Wallet} size={16} className="text-purple-600" />
                <H3 className="font-bold text-gray-900 text-sm">Commissions</H3>
              </Div>
              <P className="text-[10px] text-gray-500 mt-0.5">20% on confirmed bookings</P>
            </Div>
          </Div>
          <Div className="p-4">
            <Div className="space-y-3">
              <Div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <P className="text-xs font-bold text-gray-900">Bookings</P>
                <P className="text-xs font-bold text-purple-600">{stats?.totalBookings || 0}</P>
              </Div>
              <Div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <P className="text-xs font-bold text-gray-900">Earnings</P>
                <P className="text-xs font-bold text-purple-600">{currency(Math.round((stats?.totalRevenue || 0) * commissionRate))}</P>
              </Div>
            </Div>
          </Div>
        </Div>
      </Div>

      <PayoutSettlements />

      {/* Pending Property Requests */}
      <Div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden min-h-[300px]">
        <Div className="px-4 py-4 border-b border-gray-100 flex flex-wrap justify-between items-center gap-2">
          <H3 className="font-bold text-gray-900 text-lg">Pending Property Requests</H3>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-md px-2 py-1 outline-none focus:ring-1 focus:ring-black"
          >
            <Option>All Status</Option>
            <Option>Active</Option>
            <Option>Pending</Option>
          </Select>
        </Div>
        <Table cols={[190, 160, 120, 110]} className="w-full text-left text-sm">
          <Thead className="bg-gray-50 border-b border-gray-100">
            <Tr>
              <Th className="p-4 font-semibold text-gray-600">Property Name</Th>
              <Th className="p-4 font-semibold text-gray-600">Owner</Th>
              <Th className="p-4 font-semibold text-gray-600">City</Th>
              <Th className="p-4 font-semibold text-gray-600">Status</Th>
            </Tr>
          </Thead>
          <Tbody className="divide-y divide-gray-100">
              {loading
                ? [1, 2, 3].map((i) => (
                    <Tr key={i}>
                      <Td colSpan="4" className="p-4">
                        <Div className="h-10 bg-gray-50 animate-pulse rounded-lg"></Div>
                      </Td>
                    </Tr>
                  ))
                : filteredRequests.map((h) => (
                    <Tr
                      key={h._id}
                      className="hover:bg-gray-50"
                    >
                      <Td className="p-4 font-medium text-gray-900">{h.name}</Td>
                      <Td className="p-4">{h.ownerId?.name || 'Partner'}</Td>
                      <Td className="p-4">{h.address?.city || '—'}</Td>
                      <Td className="p-4">
                        <Span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">{h.status}</Span>
                      </Td>
                    </Tr>
                  ))}
            {!loading && filteredRequests.length === 0 && (
              <Tr>
                <Td colSpan="4" className="p-8 text-center text-gray-400">
                  No pending requests found.
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </Div>

      {/* Info Box */}
      <Div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <Div className="mb-2 flex items-center gap-2">
          <UiIcon as={TrendingUp} size={18} className="text-blue-900" />
          <H4 className="font-bold text-blue-900">Revenue Model</H4>
        </Div>
        <Div className="text-sm text-blue-800 space-y-3">
          <P>
            <Strong>Booking Commission:</Strong> Platform earns 20% commission on every confirmed room booking.
          </P>
        </Div>
      </Div>
    </ScrollDiv>
  );
};
export default AdminFinance;
