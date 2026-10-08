/* Ported from Frontend/src/modules/Hotel/app/admin/pages/AdminUserDetail.jsx (tools/port.js first pass). */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from '../../../../lib/motion';
import { Mail, Phone, Calendar, CreditCard, AlertTriangle, Ban, CheckCircle, Unlock, Loader2, ArrowDownLeft, ArrowUpRight } from 'lucide-react-native';
import { useParams } from '../../../../lib/webRouter';
import ConfirmationModal from '../components/ConfirmationModal';
import adminService from '../../../services/adminService';
import { toast } from '../../../../lib/notify';
import { Button, Div, H1, H2, H3, HScroll, Link, P, ScrollDiv, Span, Table, Tbody, Td, Th, Thead, Tr, Icon as UiIcon } from '../../../../components/web';
const UserBookingsTab = ({ bookings }) => (
  <Div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
    <Table cols={[120, 200, 130, 120, 110]} className="w-full text-left text-sm">
      <Thead className="bg-gray-50 border-b border-gray-100 uppercase text-[10px] font-bold tracking-wider text-gray-500">
        <Tr>
          <Th className="p-4 font-bold text-gray-600">Booking ID</Th>
          <Th className="p-4 font-bold text-gray-600">Hotel</Th>
          <Th className="p-4 font-bold text-gray-600">Date</Th>
          <Th className="p-4 font-bold text-gray-600">Status</Th>
          <Th className="p-4 font-bold text-gray-600 text-right">Amount</Th>
        </Tr>
      </Thead>
      <Tbody className="divide-y divide-gray-100">
        {bookings && bookings.length > 0 ? (
          bookings.map((booking, i) => (
            <Tr key={i} className="hover:bg-gray-50">
              <Td className="p-4 font-mono text-xs text-gray-500">#{booking.bookingId || booking._id.slice(-6)}</Td>
              <Td className="p-4 font-bold text-gray-900">{booking.propertyId?.propertyName || booking.propertyId?.name || 'Deleted Hotel'}</Td>
              <Td className="p-4 text-[10px] items-center font-bold text-gray-400 uppercase">{new Date(booking.createdAt).toLocaleDateString()}</Td>
              <Td className="p-4">
                <Span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${booking.status === 'confirmed' ? 'bg-green-100 text-green-700' : booking.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}
                >
                  {booking.status}
                </Span>
              </Td>
              <Td className="p-4 text-right font-bold">₹{booking.totalAmount?.toLocaleString()}</Td>
            </Tr>
          ))
        ) : (
          <Tr>
            <Td colSpan="5" className="p-8 text-center text-gray-400 text-xs font-bold uppercase">
              No bookings found
            </Td>
          </Tr>
        )}
      </Tbody>
    </Table>
  </Div>
);
const UserTransactionsTab = ({ wallet, transactions }) => (
  <Div className="space-y-6">
    <Div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <P className="text-[10px] font-bold text-gray-400 uppercase mb-1">Current Balance</P>
        <H3 className="text-2xl font-black text-gray-900">₹{wallet?.balance?.toLocaleString() || 0}</H3>
      </Div>
      <Div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <P className="text-[10px] font-bold text-gray-400 uppercase mb-1">Total Transactions</P>
        <H3 className="text-2xl font-black text-gray-900">{transactions?.length || 0}</H3>
      </Div>
    </Div>

    <Div className="bg-white border border-gray-200 rounded-xl p-6">
      <H3 className="text-xs font-bold text-gray-400 uppercase mb-4 tracking-widest">Recent Transactions</H3>
      <Div className="space-y-3">
        {transactions && transactions.length > 0 ? (
          transactions.map((txn, i) => {
            const isDebit = txn.type === 'debit';
            const isBooking = txn.category?.includes('booking') || txn.isBooking;

            // Styling Logic based on User Screenshot
            return (
              <Div key={i} className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl hover:bg-gray-50 transition-colors bg-white">
                <Div className="flex items-center gap-4">
                  <Div
                    className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border-2 border-white shadow-sm ${isBooking ? 'bg-orange-50 text-orange-500' : !isDebit ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}
                  >
                    {isBooking ? (
                      <UiIcon as={Calendar} size={20} />
                    ) : !isDebit ? (
                      <UiIcon as={ArrowDownLeft} size={20} />
                    ) : (
                      <UiIcon as={ArrowUpRight} size={20} />
                    )}
                  </Div>
                  <Div className="min-w-0">
                    <P className="text-sm font-bold text-gray-900 truncate pr-2">{txn.description}</P>
                    <P className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-tight">
                      {new Date(txn.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}{' '}
                      •{' '}
                      {new Date(txn.createdAt).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </P>
                  </Div>
                </Div>
                <Div className="text-right shrink-0">
                  <P className={`text-lg font-black tracking-tight ${isDebit ? 'text-gray-900' : 'text-green-600'}`}>
                    {isDebit ? '-' : '+'}₹{txn.amount?.toLocaleString()}
                  </P>
                  <Span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mt-1 ${txn.status === 'completed' || txn.status === 'success' ? 'bg-green-50 text-green-600' : txn.status === 'cancelled' ? 'bg-gray-100 text-gray-500' : 'bg-amber-50 text-amber-600'}`}
                  >
                    {txn.status}
                  </Span>
                </Div>
              </Div>
            );
          })
        ) : (
          <Div className="p-10 text-center border-2 border-dashed border-gray-100 rounded-xl">
            <UiIcon as={CreditCard} size={32} className="mx-auto text-gray-300 mb-2" />
            <P className="text-xs font-bold uppercase text-gray-400">No transactions history</P>
          </Div>
        )}
      </Div>
    </Div>
  </Div>
);
const AdminUserDetail = () => {
  const { id } = useParams();
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
      <ScrollDiv className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <UiIcon as={Loader2} className="animate-spin text-gray-400" size={48} />
        <P className="text-gray-500 font-bold uppercase text-xs tracking-widest">Loading user profile...</P>
      </ScrollDiv>
    );
  }
  if (!user) {
    return (
      <ScrollDiv className="text-center py-20">
        <UiIcon as={AlertTriangle} size={48} className="mx-auto text-red-400 mb-4" />
        <H2 className="text-2xl font-bold text-gray-900">User Not Found</H2>
        <P className="text-gray-500 mt-2">{"The user you're looking for doesn't exist or has been deleted."}</P>
        <Link to="/hotel/admin/users" className="mt-6 inline-block text-black font-bold uppercase text-xs border-b-2 border-black pb-1">
          Back to Users
        </Link>
      </ScrollDiv>
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
  return (
    <ScrollDiv className="max-w-5xl mx-auto space-y-8 pb-10">
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

      <Div className="flex items-center gap-2 text-[10px] font-bold uppercase text-gray-500 mb-2">
        <Link to="/hotel/admin/users" className="hover:text-black transition-colors">
          Users
        </Link>
        <Span>/</Span>
        <Span className="text-black">{user.name}</Span>
      </Div>

      <Div
        className={`rounded-2xl p-8 border shadow-sm flex flex-col md:flex-row gap-8 transition-colors ${user.isBlocked ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}
      >
        <Div className="flex flex-col items-center md:items-start gap-4 min-w-[200px]">
          <Div className="w-24 h-24 rounded-full bg-black text-white flex items-center justify-center text-3xl font-bold border-4 border-white shadow-lg relative uppercase">
            {user.name.charAt(0)}
            {user.isBlocked && (
              <Div className="absolute -bottom-2 -right-2 bg-red-600 text-white p-1.5 rounded-full border-4 border-white">
                <UiIcon as={Ban} size={16} />
              </Div>
            )}
          </Div>
          <Div className="text-center md:text-left">
            <H1 className="text-2xl font-bold text-gray-900">{user.name}</H1>
            <P className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">User ID: #{user._id.slice(-6)}</P>
            {user.isBlocked && <Span className="text-xs font-bold text-red-600 mt-1 block uppercase">ACCOUNT BLOCKED</Span>}
          </Div>
        </Div>

        <Div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <Div className="space-y-4">
            <Div className="flex items-center gap-3 text-sm">
              <UiIcon as={Mail} size={16} className="text-gray-400" />
              <Span className="text-gray-900 font-bold">{user.email || 'N/A'}</Span>
              {user.isVerified && <UiIcon as={CheckCircle} size={14} className="text-green-500" />}
            </Div>
            <Div className="flex items-center gap-3 text-sm">
              <UiIcon as={Phone} size={16} className="text-gray-400" />
              <Span className="text-gray-900 font-bold">{user.phone}</Span>
              <UiIcon as={CheckCircle} size={14} className="text-green-500" />
            </Div>
            <Div className="flex items-center gap-3 text-sm pt-2">
              <Span
                className={`text-[10px] font-bold uppercase py-1 px-3 rounded-md ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : user.role === 'partner' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}
              >
                {user.role} Account
              </Span>
            </Div>
          </Div>

          <Div className="flex flex-col gap-2">
            <Div className="p-3 bg-white/50 rounded-lg border border-gray-200/50 flex justify-between items-center">
              <Span className="text-[10px] text-gray-500 uppercase font-bold">Total Spend</Span>
              <Span className="text-lg font-bold text-gray-900">₹{bookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0).toLocaleString()}</Span>
            </Div>
          </Div>
        </Div>

        <Div className="flex flex-col gap-3 min-w-[160px]">
          <Button
            onClick={handleBlockToggle}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2 border rounded-lg text-xs font-bold uppercase transition-colors ${user.isBlocked ? 'bg-green-600 text-white border-green-600 hover:bg-green-700' : 'bg-white text-red-600 border-red-200 hover:bg-red-50'}`}
          >
            {user.isBlocked ? <UiIcon as={Unlock} size={16} /> : <UiIcon as={Ban} size={16} />}
            {user.isBlocked ? 'Unblock User' : 'Block User'}
          </Button>
        </Div>
      </Div>

      <Div>
        <HScroll className="border-b border-gray-200 mb-6" contentClassName="flex">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 text-xs font-bold uppercase transition-colors relative whitespace-nowrap ${activeTab === tab.id ? 'text-black' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <UiIcon as={tab.icon} size={16} />
              {tab.label}
              {activeTab === tab.id && <motion.div layoutId="activeTabBadgeUser" className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />}
            </Button>
          ))}
        </HScroll>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{
              opacity: 0,
              y: 5,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              y: -5,
            }}
            transition={{
              duration: 0.15,
            }}
          >
            {activeTab === 'bookings' && <UserBookingsTab bookings={bookings} />}
            {activeTab === 'transactions' && <UserTransactionsTab wallet={wallet} transactions={transactions} />}
          </motion.div>
        </AnimatePresence>
      </Div>
    </ScrollDiv>
  );
};
export default AdminUserDetail;
