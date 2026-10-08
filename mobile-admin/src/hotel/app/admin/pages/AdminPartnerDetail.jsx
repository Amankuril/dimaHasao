/* Ported from Frontend/src/modules/Hotel/app/admin/pages/AdminPartnerDetail.jsx (tools/port.js first pass). */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from '../../../../lib/motion';
import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  CreditCard,
  AlertTriangle,
  Ban,
  CheckCircle,
  Unlock,
  Loader2,
  Building,
  FileText,
  CheckSquare,
  XSquare,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react-native';
import { useParams } from '../../../../lib/webRouter';
import ConfirmationModal from '../components/ConfirmationModal';
import adminService from '../../../services/adminService';
import walletService from '../../../services/walletService';
import { toast } from '../../../../lib/notify';
import { A, Button, Div, H1, H2, H3, HScroll, Img, Link, P, ScrollDiv, Span, Table, Tbody, Td, Th, Thead, Tr, Icon as UiIcon } from '../../../../components/web';
const PartnerPropertiesTab = ({ properties }) => (
  <Div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
    <Table cols={[200, 170, 130, 120, 130]} className="w-full text-left text-sm">
      <Thead className="bg-gray-50 border-b border-gray-100 uppercase text-[10px] font-bold tracking-wider text-gray-500">
        <Tr>
          <Th className="p-4 font-bold text-gray-600">Property Name</Th>
          <Th className="p-4 font-bold text-gray-600">Location</Th>
          <Th className="p-4 font-bold text-gray-600">Type</Th>
          <Th className="p-4 font-bold text-gray-600">Status</Th>
          <Th className="p-4 font-bold text-gray-600 text-right">Added On</Th>
        </Tr>
      </Thead>
      <Tbody className="divide-y divide-gray-100">
        {properties && properties.length > 0 ? (
          properties.map((property, i) => (
            <Tr key={i} className="hover:bg-gray-50">
              <Td className="p-4 font-bold text-gray-900">
                <Link to={`/hotel/admin/properties/${property._id}`} className="hover:text-blue-600 hover:underline">
                  {property.propertyName}
                </Link>
              </Td>
              <Td className="p-4 text-xs font-bold text-gray-500 uppercase">
                {property.address?.city}, {property.address?.state}
              </Td>
              <Td className="p-4 text-xs font-bold text-gray-500 uppercase">{property.propertyType}</Td>
              <Td className="p-4">
                <Span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${property.status === 'approved' ? 'bg-green-100 text-green-700' : property.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}
                >
                  {property.status}
                </Span>
              </Td>
              <Td className="p-4 text-right font-bold text-xs uppercase text-gray-400">{new Date(property.createdAt).toLocaleDateString()}</Td>
            </Tr>
          ))
        ) : (
          <Tr>
            <Td colSpan="5" className="p-8 text-center text-gray-400 text-xs font-bold uppercase">
              No properties listed
            </Td>
          </Tr>
        )}
      </Tbody>
    </Table>
  </Div>
);
const PartnerDocumentsTab = ({ partner }) => (
  <Div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <Div className="bg-white p-6 border border-gray-200 rounded-xl">
      <H3 className="text-sm font-bold uppercase text-gray-500 mb-4 flex items-center gap-2">
        <UiIcon as={FileText} size={16} /> Identity Proof (Aadhaar)
      </H3>
      <Div className="space-y-4">
        <Div>
          <Span className="text-xs text-gray-400 font-bold uppercase block">Aadhaar Number</Span>
          <Span className="text-sm font-bold text-gray-900">{partner.aadhaarNumber || 'Not provided'}</Span>
        </Div>
        <Div className="flex gap-4">
          {partner.aadhaarFront ? (
            <A
              href={partner.aadhaarFront}
              className="block w-full h-32 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity"
            >
              <Img src={partner.aadhaarFront} alt="Aadhaar Front" className="w-full h-full object-cover" />
            </A>
          ) : (
            <Div className="w-full h-32 bg-gray-50 rounded-lg border border-dashed border-gray-300 flex items-center justify-center text-xs font-bold text-gray-400 uppercase">
              Front Missing
            </Div>
          )}
          {partner.aadhaarBack ? (
            <A
              href={partner.aadhaarBack}
              className="block w-full h-32 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity"
            >
              <Img src={partner.aadhaarBack} alt="Aadhaar Back" className="w-full h-full object-cover" />
            </A>
          ) : (
            <Div className="w-full h-32 bg-gray-50 rounded-lg border border-dashed border-gray-300 flex items-center justify-center text-xs font-bold text-gray-400 uppercase">
              Back Missing
            </Div>
          )}
        </Div>
      </Div>
    </Div>

    <Div className="bg-white p-6 border border-gray-200 rounded-xl">
      <H3 className="text-sm font-bold uppercase text-gray-500 mb-4 flex items-center gap-2">
        <UiIcon as={FileText} size={16} /> Tax Proof (PAN)
      </H3>
      <Div className="space-y-4">
        <Div>
          <Span className="text-xs text-gray-400 font-bold uppercase block">PAN Number</Span>
          <Span className="text-sm font-bold text-gray-900">{partner.panNumber || 'Not provided'}</Span>
        </Div>
        <Div>
          {partner.panCardImage ? (
            <A
              href={partner.panCardImage}
              className="block w-full h-32 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity"
            >
              <Img src={partner.panCardImage} alt="PAN Card" className="w-full h-full object-cover" />
            </A>
          ) : (
            <Div className="w-full h-32 bg-gray-50 rounded-lg border border-dashed border-gray-300 flex items-center justify-center text-xs font-bold text-gray-400 uppercase">
              PAN Image Missing
            </Div>
          )}
        </Div>
      </Div>
    </Div>
  </Div>
);
const PartnerTransactionsTab = ({ partnerId }) => {
  const [wallet, setWallet] = useState(null);
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchWalletData = async () => {
      try {
        setLoading(true);
        const [wRes, sRes, tRes] = await Promise.all([
          walletService.getWallet({
            ownerId: partnerId,
            viewAs: 'partner',
          }),
          walletService.getWalletStats({
            ownerId: partnerId,
            viewAs: 'partner',
          }),
          walletService.getTransactions({
            ownerId: partnerId,
            viewAs: 'partner',
            limit: 50,
          }),
        ]);
        if (wRes.success) setWallet(wRes.wallet);
        if (sRes.success) setStats(sRes.stats);
        if (tRes.success) setTransactions(tRes.transactions);
      } catch (error) {
        console.error('Error fetching partner wallet:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchWalletData();
  }, [partnerId]);
  if (loading)
    return (
      <Div className="flex justify-center p-10">
        <UiIcon as={Loader2} className="animate-spin text-gray-300" />
      </Div>
    );
  return (
    <Div className="space-y-6">
      <Div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <P className="text-[10px] font-bold text-gray-400 uppercase mb-1">Available Balance</P>
          <H3 className="text-xl font-black text-gray-900">₹{wallet?.balance?.toLocaleString() || 0}</H3>
        </Div>
        <Div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <P className="text-[10px] font-bold text-gray-400 uppercase mb-1">Total Earnings</P>
          <H3 className="text-xl font-black text-green-600">₹{stats?.totalEarnings?.toLocaleString() || 0}</H3>
          <P className="text-[10px] text-gray-400 font-bold mt-1">+₹{stats?.thisMonthEarnings?.toLocaleString() || 0} this month</P>
        </Div>
        <Div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <P className="text-[10px] font-bold text-gray-400 uppercase mb-1">Total Payouts</P>
          <H3 className="text-xl font-black text-orange-600">₹{stats?.totalWithdrawals?.toLocaleString() || 0}</H3>
        </Div>
        <Div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <P className="text-[10px] font-bold text-gray-400 uppercase mb-1">Pending Clearance</P>
          <H3 className="text-xl font-black text-blue-600">₹{stats?.pendingClearance?.toLocaleString() || 0}</H3>
        </Div>
      </Div>

      <Div className="bg-white border border-gray-200 rounded-xl p-6">
        <H3 className="text-xs font-bold text-gray-400 uppercase mb-4 tracking-widest">Recent Transactions</H3>
        <Div className="space-y-3">
          {transactions && transactions.length > 0 ? (
            transactions.map((txn, i) => {
              const isDebit = txn.type === 'debit';
              const isBooking = txn.category?.includes('booking');
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
};
const AdminPartnerDetail = () => {
  const { id } = useParams();
  const [partner, setPartner] = useState(null);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('properties');
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'danger',
    onConfirm: () => {},
  });
  const fetchPartnerDetails = async () => {
    try {
      setLoading(true);
      const data = await adminService.getPartnerDetails(id);
      if (data.success) {
        setPartner(data.partner);
        setProperties(data.properties);
      }
    } catch (error) {
      console.error('Error fetching partner details:', error);
      toast.error('Failed to load partner information');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchPartnerDetails();
  }, [id]);
  const handleBlockToggle = async () => {
    const isBlocked = partner.isBlocked;
    setModalConfig({
      isOpen: true,
      title: isBlocked ? 'Unblock Partner?' : 'Block Partner?',
      message: isBlocked
        ? `Partner ${partner.name} will regain access to their dashboard.`
        : `Blocking ${partner.name} will prevent them from managing properties.`,
      type: isBlocked ? 'success' : 'danger',
      confirmText: isBlocked ? 'Unblock' : 'Block',
      onConfirm: async () => {
        try {
          const res = await adminService.updatePartnerStatus(partner._id, !isBlocked);
          if (res.success) {
            toast.success(`Partner ${!isBlocked ? 'blocked' : 'unblocked'} successfully`);
            fetchPartnerDetails();
          }
        } catch {
          toast.error('Failed to update partner status');
        }
      },
    });
  };
  const handleApproval = async (status) => {
    setModalConfig({
      isOpen: true,
      title: `${status === 'approved' ? 'Approve' : 'Reject'} Partner?`,
      message: `Are you sure you want to ${status} ${partner.name}?`,
      type: status === 'approved' ? 'success' : 'danger',
      confirmText: status === 'approved' ? 'Approve' : 'Reject',
      onConfirm: async () => {
        try {
          const res = await adminService.updatePartnerApproval(partner._id, status);
          if (res.success) {
            toast.success(`Partner ${status} successfully`);
            fetchPartnerDetails();
          }
        } catch {
          toast.error(`Failed to ${status} partner`);
        }
      },
    });
  };
  if (loading) {
    return (
      <ScrollDiv className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <UiIcon as={Loader2} className="animate-spin text-gray-400" size={48} />
        <P className="text-gray-500 font-bold uppercase text-xs tracking-widest">Loading partner profile...</P>
      </ScrollDiv>
    );
  }
  if (!partner) {
    return (
      <ScrollDiv className="text-center py-20">
        <UiIcon as={AlertTriangle} size={48} className="mx-auto text-red-400 mb-4" />
        <H2 className="text-2xl font-bold text-gray-900">Partner Not Found</H2>
        <P className="text-gray-500 mt-2">{"The partner you're looking for doesn't exist or has been deleted."}</P>
        <Link to="/hotel/admin/partners" className="mt-6 inline-block text-black font-bold uppercase text-xs border-b-2 border-black pb-1">
          Back to Partners
        </Link>
      </ScrollDiv>
    );
  }
  const tabs = [
    {
      id: 'properties',
      label: 'Properties',
      icon: Building,
    },
    {
      id: 'transactions',
      label: 'Transactions',
      icon: CreditCard,
    },
    {
      id: 'documents',
      label: 'Documents',
      icon: FileText,
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
        <Link to="/hotel/admin/partners" className="hover:text-black transition-colors">
          Partners
        </Link>
        <Span>/</Span>
        <Span className="text-black">{partner.name}</Span>
      </Div>

      <Div
        className={`rounded-2xl p-8 border shadow-sm flex flex-col md:flex-row gap-8 transition-colors ${partner.isBlocked ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}
      >
        <Div className="flex flex-col items-center md:items-start gap-4 min-w-[200px]">
          <Div className="w-24 h-24 rounded-full bg-black text-white flex items-center justify-center text-3xl font-bold border-4 border-white shadow-lg relative uppercase">
            {partner.profileImage ? (
              <Img src={partner.profileImage} alt={partner.name} className="w-full h-full object-cover rounded-full" />
            ) : (
              partner.name.charAt(0)
            )}
            {partner.isBlocked && (
              <Div className="absolute -bottom-2 -right-2 bg-red-600 text-white p-1.5 rounded-full border-4 border-white">
                <UiIcon as={Ban} size={16} />
              </Div>
            )}
            {partner.partnerApprovalStatus === 'approved' && !partner.isBlocked && (
              <Div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-1.5 rounded-full border-4 border-white">
                <UiIcon as={CheckCircle} size={16} />
              </Div>
            )}
          </Div>
          <Div className="text-center md:text-left">
            <H1 className="text-2xl font-bold text-gray-900">{partner.name}</H1>
            <P className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">ID: #{partner._id.slice(-6)}</P>
            <Div className="flex flex-col gap-1 mt-2">
              {partner.isBlocked && <Span className="text-xs font-bold text-red-600 uppercase">ACCOUNT BLOCKED</Span>}
              <Span
                className={`text-xs font-bold uppercase px-2 py-0.5 rounded w-fit mx-auto md:mx-0 ${partner.partnerApprovalStatus === 'approved' ? 'bg-green-100 text-green-700' : partner.partnerApprovalStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}
              >
                {partner.partnerApprovalStatus}
              </Span>
            </Div>
          </Div>
        </Div>

        <Div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <Div className="space-y-4">
            <Div className="flex items-center gap-3 text-sm">
              <UiIcon as={Mail} size={16} className="text-gray-400" />
              <Span className="text-gray-900 font-bold">{partner.email || 'N/A'}</Span>
            </Div>
            <Div className="flex items-center gap-3 text-sm">
              <UiIcon as={Phone} size={16} className="text-gray-400" />
              <Span className="text-gray-900 font-bold">{partner.phone}</Span>
            </Div>
            <Div className="flex items-center gap-3 text-sm">
              <UiIcon as={User} size={16} className="text-gray-400" />
              <Span className="text-gray-900 font-bold">{partner.ownerName || 'Owner Name N/A'}</Span>
            </Div>
            <Div className="flex items-center gap-3 text-sm">
              <UiIcon as={MapPin} size={16} className="text-gray-400" />
              <Span className="text-gray-900 font-bold">
                {[partner.address?.city, partner.address?.state, partner.address?.country].filter(Boolean).join(', ') || 'Address N/A'}
              </Span>
            </Div>
          </Div>

          <Div className="flex flex-col gap-2">
            <Div className="p-3 bg-white/50 rounded-lg border border-gray-200/50 flex justify-between items-center">
              <Span className="text-[10px] text-gray-500 uppercase font-bold">Total Properties</Span>
              <Span className="text-lg font-bold text-gray-900">{properties.length}</Span>
            </Div>
          </Div>
        </Div>

        <Div className="flex flex-col gap-3 min-w-[160px]">
          <Button
            onClick={handleBlockToggle}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2 border rounded-lg text-xs font-bold uppercase transition-colors ${partner.isBlocked ? 'bg-green-600 text-white border-green-600 hover:bg-green-700' : 'bg-white text-red-600 border-red-200 hover:bg-red-50'}`}
          >
            {partner.isBlocked ? <UiIcon as={Unlock} size={16} /> : <UiIcon as={Ban} size={16} />}
            {partner.isBlocked ? 'Unblock' : 'Block'}
          </Button>

          {partner.partnerApprovalStatus === 'pending' && (
            <>
              <Button
                onClick={() => handleApproval('approved')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg text-xs font-bold uppercase transition-colors"
              >
                <UiIcon as={CheckSquare} size={16} /> Approve
              </Button>
              <Button
                onClick={() => handleApproval('rejected')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg text-xs font-bold uppercase transition-colors"
              >
                <UiIcon as={XSquare} size={16} /> Reject
              </Button>
            </>
          )}
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
              {activeTab === tab.id && <motion.div layoutId="activeTabBadgePartner" className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />}
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
            {activeTab === 'properties' && <PartnerPropertiesTab properties={properties} />}
            {activeTab === 'transactions' && <PartnerTransactionsTab partnerId={id} />}
            {activeTab === 'documents' && <PartnerDocumentsTab partner={partner} />}
          </motion.div>
        </AnimatePresence>
      </Div>
    </ScrollDiv>
  );
};
export default AdminPartnerDetail;
