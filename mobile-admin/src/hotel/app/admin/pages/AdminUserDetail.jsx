/* Ported from Frontend/src/modules/Hotel/app/admin/pages/AdminUserDetail.jsx (tools/port.js first pass). */
import React, { useState, useEffect } from 'react';
import { Mail, Phone, Calendar, CreditCard, Ban, CheckCircle, Unlock, User as UserIcon, Wallet, ArrowDownLeft, ArrowUpRight } from 'lucide-react-native';
import { useParams } from '../../../../lib/webRouter';
import ConfirmationModal from '../components/ConfirmationModal';
import adminService from '../../../services/adminService';
import { toast } from '../../../../lib/notify';
import { Button, Div, HScroll, Link, Span, Icon as UiIcon } from '../../../../components/web';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  StatCard,
  StatGrid,
  DataTable,
  THead,
  TBody,
  Row,
  Cell,
  StatusBadge,
  LoadingState,
  EmptyState,
  ErrorState,
  BTN_DANGER,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../admin/ui';

const BOOKING_COLS = [110, 190, 130, 120, 110];
const BOOKING_LABELS = ['Booking', 'Hotel', 'Date', 'Status', 'Amount'];

const UserBookingsTab = ({ bookings }) => {
  if (!bookings || bookings.length === 0) {
    return <EmptyState icon={Calendar} title="No bookings yet" message="Stays this guest books will be listed here." />;
  }
  return (
    <DataTable cols={BOOKING_COLS}>
      <THead cols={BOOKING_COLS} labels={BOOKING_LABELS} />
      <TBody>
        {bookings.map((booking, i) => (
          <Row key={i} last={i === bookings.length - 1}>
            <Cell width={BOOKING_COLS[0]}>#{booking.bookingId || booking._id.slice(-6)}</Cell>
            <Cell width={BOOKING_COLS[1]}>
              <Span className="text-sm font-medium text-slate-900" numberOfLines={2}>
                {booking.propertyId?.propertyName || booking.propertyId?.name || 'Deleted Hotel'}
              </Span>
            </Cell>
            <Cell width={BOOKING_COLS[2]}>{new Date(booking.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Cell>
            <Cell width={BOOKING_COLS[3]}>
              <StatusBadge status={booking.status} />
            </Cell>
            <Cell width={BOOKING_COLS[4]} align="right">
              <Span className="text-sm font-semibold text-slate-900">₹{booking.totalAmount?.toLocaleString()}</Span>
            </Cell>
          </Row>
        ))}
      </TBody>
    </DataTable>
  );
};

const UserTransactionsTab = ({ wallet, transactions }) => (
  <Div className="gap-4">
    <StatGrid>
      <StatCard label="Current balance" value={`₹${wallet?.balance?.toLocaleString() || 0}`} icon={Wallet} tone="success" />
      <StatCard label="Total transactions" value={transactions?.length || 0} icon={CreditCard} tone="info" />
    </StatGrid>

    {transactions && transactions.length > 0 ? (
      <Card>
        <SectionTitle>Recent transactions</SectionTitle>
        <Div className="gap-2">
          {transactions.map((txn, i) => {
            const isDebit = txn.type === 'debit';
            const isBooking = txn.category?.includes('booking') || txn.isBooking;
            return (
              <Div key={i} className="flex-row items-center gap-3 p-3 rounded-lg border border-slate-200">
                <Div className={`w-10 h-10 rounded-full items-center justify-center shrink-0 ${isBooking ? 'bg-amber-100' : !isDebit ? 'bg-green-100' : 'bg-red-100'}`}>
                  <UiIcon
                    as={isBooking ? Calendar : isDebit ? ArrowUpRight : ArrowDownLeft}
                    size={18}
                    className={isBooking ? 'text-amber-700' : !isDebit ? 'text-green-700' : 'text-red-700'}
                  />
                </Div>
                <Div className="flex-1 min-w-0">
                  <Span className="text-sm font-medium text-slate-900" numberOfLines={2}>
                    {txn.description}
                  </Span>
                  <Span className="text-xs text-slate-500" numberOfLines={1}>
                    {new Date(txn.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                    {' · '}
                    {new Date(txn.createdAt).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Span>
                </Div>
                <Div className="items-end gap-1 shrink-0">
                  <Span className={`text-sm font-semibold ${isDebit ? 'text-slate-900' : 'text-green-700'}`}>
                    {isDebit ? '-' : '+'}₹{txn.amount?.toLocaleString()}
                  </Span>
                  <StatusBadge status={txn.status} />
                </Div>
              </Div>
            );
          })}
        </Div>
      </Card>
    ) : (
      <EmptyState icon={CreditCard} title="No transaction history" message="Wallet top-ups and payments will appear here." />
    )}
  </Div>
);

const AdminUserDetail = () => {
  const { id } = useParams();
  const { tablet } = useLayoutWidth();
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('bookings');
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'danger',
    onConfirm: () => {},
  });
  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      const data = await adminService.getUserDetails(id);
      if (data.success) {
        setUser(data.user);
        setBookings(data.bookings);
        setWallet(data.wallet);
        setTransactions(data.transactions);
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
      toast.error('Failed to load user information');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchUserDetails();
  }, [id]);
  const handleBlockToggle = async () => {
    const isBlocked = user.isBlocked;
    setModalConfig({
      isOpen: true,
      title: isBlocked ? 'Unblock User?' : 'Block User?',
      message: isBlocked
        ? `User ${user.name} will regain access to booking and account features.`
        : `Blocking ${user.name} will prevent them from logging in or making new bookings.`,
      type: isBlocked ? 'success' : 'danger',
      confirmText: isBlocked ? 'Unblock' : 'Block',
      onConfirm: async () => {
        try {
          const res = await adminService.updateUserStatus(user._id, !isBlocked);
          if (res.success) {
            toast.success(`User ${!isBlocked ? 'blocked' : 'unblocked'} successfully`);
            fetchUserDetails();
          }
        } catch {
          toast.error('Failed to update user status');
        }
      },
    });
  };
  if (loading) {
    return (
      <AdminPage maxWidth={1000}>
        <PageHeader title="User profile" breadcrumb={[{ label: 'Hotel' }, { label: 'Users' }]} />
        <LoadingState label="Loading user profile…" />
      </AdminPage>
    );
  }
  if (!user) {
    return (
      <AdminPage maxWidth={1000}>
        <PageHeader title="User profile" breadcrumb={[{ label: 'Hotel' }, { label: 'Users' }]} />
        <ErrorState
          title="User not found"
          message="The user you're looking for doesn't exist or has been deleted."
          onRetry={fetchUserDetails}
        />
        <Link to="/hotel/admin/users" className={`${BTN_SECONDARY} mt-3 self-center`}>
          <Span className={BTN_TEXT_SECONDARY}>Back to users</Span>
        </Link>
      </AdminPage>
    );
  }
  const tabs = [
    {
      id: 'bookings',
      label: 'Booking History',
      icon: Calendar,
    },
    {
      id: 'transactions',
      label: 'Transactions',
      icon: CreditCard,
    },
  ];
  const totalSpend = bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  return (
    <AdminPage maxWidth={1000}>
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
        icon={UserIcon}
        title={user.name}
        subtitle={`User ID #${user._id.slice(-6)}`}
        breadcrumb={[{ label: 'Hotel' }, { label: 'Users' }, { label: user.name }]}
        actions={
          <Button onClick={handleBlockToggle} className={user.isBlocked ? BTN_PRIMARY : BTN_DANGER}>
            <UiIcon as={user.isBlocked ? Unlock : Ban} size={16} className="text-white" />
            <Span className={BTN_TEXT_PRIMARY}>{user.isBlocked ? 'Unblock user' : 'Block user'}</Span>
          </Button>
        }
      />

      <Card className="mb-4 gap-3">
        <Div className="flex-row items-center justify-between gap-3 flex-wrap">
          <SectionTitle className="mb-0">Account</SectionTitle>
          <StatusBadge status={user.isBlocked ? 'blocked' : 'active'} label={user.isBlocked ? 'Account blocked' : 'Active'} />
        </Div>
        <Div className={tablet ? 'flex-row flex-wrap gap-4' : 'gap-3'}>
          <Div className={tablet ? 'flex-1 min-w-[260px] gap-3' : 'gap-3'}>
            <Div className="flex-row items-center gap-2">
              <UiIcon as={Mail} size={16} className="text-slate-400" />
              <Span className="text-sm text-slate-700 flex-1" numberOfLines={1}>
                {user.email || 'N/A'}
              </Span>
              {user.isVerified ? <UiIcon as={CheckCircle} size={14} className="text-green-700" /> : null}
            </Div>
            <Div className="flex-row items-center gap-2">
              <UiIcon as={Phone} size={16} className="text-slate-400" />
              <Span className="text-sm text-slate-700 flex-1" numberOfLines={1}>
                {user.phone}
              </Span>
              <UiIcon as={CheckCircle} size={14} className="text-green-700" />
            </Div>
            <StatusBadge tone={user.role === 'user' ? 'neutral' : 'info'} label={`${user.role} account`} />
          </Div>
          <Div className={tablet ? 'flex-1 min-w-[260px]' : ''}>
            <Div className="flex-row items-center justify-between gap-3 h-11 px-3 rounded-lg bg-slate-50 border border-slate-200">
              <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total spend</Span>
              <Span className="text-base font-semibold text-slate-900">₹{totalSpend.toLocaleString()}</Span>
            </Div>
          </Div>
        </Div>
      </Card>

      <HScroll className="mb-4" contentClassName="flex-row gap-2">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-row items-center gap-2 h-11 px-4 rounded-lg border ${activeTab === tab.id ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}
          >
            <UiIcon as={tab.icon} size={16} className={activeTab === tab.id ? 'text-white' : 'text-slate-500'} />
            <Span className={`text-sm font-semibold ${activeTab === tab.id ? 'text-white' : 'text-slate-700'}`}>{tab.label}</Span>
          </Button>
        ))}
      </HScroll>

      {activeTab === 'bookings' ? <UserBookingsTab bookings={bookings} /> : null}
      {activeTab === 'transactions' ? <UserTransactionsTab wallet={wallet} transactions={transactions} /> : null}
    </AdminPage>
  );
};
export default AdminUserDetail;
