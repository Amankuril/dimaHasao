/* Ported from Frontend/src/modules/Hotel/app/admin/pages/AdminPartnerDetail.jsx (tools/port.js first pass). */
import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  CreditCard,
  Ban,
  Unlock,
  Building,
  FileText,
  CheckSquare,
  XSquare,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  TrendingUp,
  Banknote,
  Clock,
} from 'lucide-react-native';
import { useParams } from '../../../../lib/webRouter';
import ConfirmationModal from '../components/ConfirmationModal';
import adminService from '../../../services/adminService';
import walletService from '../../../services/walletService';
import { toast } from '../../../../lib/notify';
import { A, Button, Div, HScroll, Img, Link, Span, Icon as UiIcon } from '../../../../components/web';
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

const PROPERTY_COLS = [190, 160, 130, 120, 130];
const PROPERTY_LABELS = ['Property', 'Location', 'Type', 'Status', 'Added on'];

const PartnerPropertiesTab = ({ properties }) => {
  if (!properties || properties.length === 0) {
    return <EmptyState icon={Building} title="No properties listed" message="Properties this partner submits will be listed here." />;
  }
  return (
    <DataTable cols={PROPERTY_COLS}>
      <THead cols={PROPERTY_COLS} labels={PROPERTY_LABELS} />
      <TBody>
        {properties.map((property, i) => (
          <Row key={i} last={i === properties.length - 1}>
            <Cell width={PROPERTY_COLS[0]}>
              <Link to={`/hotel/admin/properties/${property._id}`} className="py-1">
                <Span className="text-sm font-medium text-slate-900" numberOfLines={2}>
                  {property.propertyName}
                </Span>
              </Link>
            </Cell>
            <Cell width={PROPERTY_COLS[1]}>
              {[property.address?.city, property.address?.state].filter(Boolean).join(', ') || 'N/A'}
            </Cell>
            <Cell width={PROPERTY_COLS[2]}>{property.propertyType || 'N/A'}</Cell>
            <Cell width={PROPERTY_COLS[3]}>
              <StatusBadge status={property.status} />
            </Cell>
            <Cell width={PROPERTY_COLS[4]} align="right">
              {new Date(property.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </Cell>
          </Row>
        ))}
      </TBody>
    </DataTable>
  );
};

const DocumentImage = ({ src, alt, missingLabel }) =>
  src ? (
    <A href={src} className="flex-1 min-w-[140px] h-32 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
      <Img src={src} alt={alt} className="w-full h-32" contentFit="cover" />
    </A>
  ) : (
    <Div className="flex-1 min-w-[140px] h-32 rounded-lg border border-slate-200 bg-slate-50 items-center justify-center">
      <Span className="text-xs text-slate-500">{missingLabel}</Span>
    </Div>
  );

const PartnerDocumentsTab = ({ partner, tablet }) => (
  <Div className={tablet ? 'flex-row items-start gap-4' : 'gap-4'}>
    <Card className={tablet ? 'flex-1' : ''}>
      <SectionTitle>Identity proof (Aadhaar)</SectionTitle>
      <Div className="gap-3">
        <Div>
          <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Aadhaar number</Span>
          <Span className="text-sm text-slate-900 mt-1">{partner.aadhaarNumber || 'Not provided'}</Span>
        </Div>
        <Div className="flex-row flex-wrap gap-3">
          <DocumentImage src={partner.aadhaarFront} alt="Aadhaar front" missingLabel="Front missing" />
          <DocumentImage src={partner.aadhaarBack} alt="Aadhaar back" missingLabel="Back missing" />
        </Div>
      </Div>
    </Card>

    <Card className={tablet ? 'flex-1' : ''}>
      <SectionTitle>Tax proof (PAN)</SectionTitle>
      <Div className="gap-3">
        <Div>
          <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">PAN number</Span>
          <Span className="text-sm text-slate-900 mt-1">{partner.panNumber || 'Not provided'}</Span>
        </Div>
        <Div className="flex-row gap-3">
          <DocumentImage src={partner.panCardImage} alt="PAN card" missingLabel="PAN image missing" />
        </Div>
      </Div>
    </Card>
  </Div>
);

const PartnerTransactionsTab = ({ partnerId }) => {
  const [wallet, setWallet] = useState(null);
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [walletError, setWalletError] = useState(null);
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
        setWalletError(null);
        if (wRes.success) setWallet(wRes.wallet);
        if (sRes.success) setStats(sRes.stats);
        if (tRes.success) setTransactions(tRes.transactions);
      } catch (error) {
        console.error('Error fetching partner wallet:', error);
        setWalletError(error?.message || 'Could not load the partner wallet');
      } finally {
        setLoading(false);
      }
    };
    fetchWalletData();
  }, [partnerId]);
  if (loading) return <LoadingState label="Loading wallet…" />;
  if (walletError) return <ErrorState title="Could not load the wallet" message={walletError} />;
  return (
    <Div className="gap-4">
      <StatGrid>
        <StatCard label="Available balance" value={`₹${wallet?.balance?.toLocaleString() || 0}`} icon={Wallet} tone="info" />
        <StatCard
          label="Total earnings"
          value={`₹${stats?.totalEarnings?.toLocaleString() || 0}`}
          hint={`+₹${stats?.thisMonthEarnings?.toLocaleString() || 0} this month`}
          icon={TrendingUp}
          tone="success"
        />
        <StatCard label="Total payouts" value={`₹${stats?.totalWithdrawals?.toLocaleString() || 0}`} icon={Banknote} tone="warning" />
        <StatCard label="Pending clearance" value={`₹${stats?.pendingClearance?.toLocaleString() || 0}`} icon={Clock} tone="info" />
      </StatGrid>

      {transactions && transactions.length > 0 ? (
        <Card>
          <SectionTitle>Recent transactions</SectionTitle>
          <Div className="gap-2">
            {transactions.map((txn, i) => {
              const isDebit = txn.type === 'debit';
              const isBooking = txn.category?.includes('booking');
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
        <EmptyState icon={CreditCard} title="No transaction history" message="Earnings and payouts will appear here." />
      )}
    </Div>
  );
};

const AdminPartnerDetail = () => {
  const { id } = useParams();
  const { tablet } = useLayoutWidth();
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
      <AdminPage maxWidth={1000}>
        <PageHeader title="Partner profile" breadcrumb={[{ label: 'Hotel' }, { label: 'Partners' }]} />
        <LoadingState label="Loading partner profile…" />
      </AdminPage>
    );
  }
  if (!partner) {
    return (
      <AdminPage maxWidth={1000}>
        <PageHeader title="Partner profile" breadcrumb={[{ label: 'Hotel' }, { label: 'Partners' }]} />
        <ErrorState
          title="Partner not found"
          message="The partner you're looking for doesn't exist or has been deleted."
          onRetry={fetchPartnerDetails}
        />
        <Link to="/hotel/admin/partners" className={`${BTN_SECONDARY} mt-3 self-center`}>
          <Span className={BTN_TEXT_SECONDARY}>Back to partners</Span>
        </Link>
      </AdminPage>
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
        icon={Building}
        title={partner.name}
        subtitle={`Partner ID #${partner._id.slice(-6)}`}
        breadcrumb={[{ label: 'Hotel' }, { label: 'Partners' }, { label: partner.name }]}
        actions={
          <>
            <Button onClick={handleBlockToggle} className={partner.isBlocked ? BTN_PRIMARY : BTN_DANGER}>
              <UiIcon as={partner.isBlocked ? Unlock : Ban} size={16} className="text-white" />
              <Span className={BTN_TEXT_PRIMARY}>{partner.isBlocked ? 'Unblock' : 'Block'}</Span>
            </Button>
            {partner.partnerApprovalStatus === 'pending' ? (
              <>
                <Button onClick={() => handleApproval('approved')} className={BTN_PRIMARY}>
                  <UiIcon as={CheckSquare} size={16} className="text-white" />
                  <Span className={BTN_TEXT_PRIMARY}>Approve</Span>
                </Button>
                <Button onClick={() => handleApproval('rejected')} className={BTN_DANGER}>
                  <UiIcon as={XSquare} size={16} className="text-white" />
                  <Span className={BTN_TEXT_PRIMARY}>Reject</Span>
                </Button>
              </>
            ) : null}
          </>
        }
      />

      <Card className="mb-4 gap-3">
        <Div className="flex-row items-center gap-3 flex-wrap">
          <Div className="w-12 h-12 rounded-full bg-slate-100 items-center justify-center overflow-hidden shrink-0">
            {partner.profileImage ? (
              <Img src={partner.profileImage} alt={partner.name} className="w-12 h-12 rounded-full" contentFit="cover" />
            ) : (
              <Span className="text-base font-semibold text-slate-600">{partner.name.charAt(0).toUpperCase()}</Span>
            )}
          </Div>
          <Div className="flex-row items-center gap-2 flex-wrap flex-1">
            <StatusBadge status={partner.isBlocked ? 'blocked' : 'active'} label={partner.isBlocked ? 'Account blocked' : 'Active'} />
            <StatusBadge status={partner.partnerApprovalStatus || 'pending'} label={partner.partnerApprovalStatus || 'pending'} />
          </Div>
        </Div>
        <Div className={tablet ? 'flex-row flex-wrap gap-4' : 'gap-3'}>
          <Div className={tablet ? 'flex-1 min-w-[260px] gap-3' : 'gap-3'}>
            <Div className="flex-row items-center gap-2">
              <UiIcon as={Mail} size={16} className="text-slate-400" />
              <Span className="text-sm text-slate-700 flex-1" numberOfLines={1}>
                {partner.email || 'N/A'}
              </Span>
            </Div>
            <Div className="flex-row items-center gap-2">
              <UiIcon as={Phone} size={16} className="text-slate-400" />
              <Span className="text-sm text-slate-700 flex-1" numberOfLines={1}>
                {partner.phone}
              </Span>
            </Div>
            <Div className="flex-row items-center gap-2">
              <UiIcon as={User} size={16} className="text-slate-400" />
              <Span className="text-sm text-slate-700 flex-1" numberOfLines={1}>
                {partner.ownerName || 'Owner name N/A'}
              </Span>
            </Div>
            <Div className="flex-row items-start gap-2">
              <UiIcon as={MapPin} size={16} className="text-slate-400" />
              <Span className="text-sm text-slate-700 flex-1" numberOfLines={2}>
                {[partner.address?.city, partner.address?.state, partner.address?.country].filter(Boolean).join(', ') || 'Address N/A'}
              </Span>
            </Div>
          </Div>
          <Div className={tablet ? 'flex-1 min-w-[260px]' : ''}>
            <Div className="flex-row items-center justify-between gap-3 h-11 px-3 rounded-lg bg-slate-50 border border-slate-200">
              <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total properties</Span>
              <Span className="text-base font-semibold text-slate-900">{properties.length}</Span>
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

      {activeTab === 'properties' ? <PartnerPropertiesTab properties={properties} /> : null}
      {activeTab === 'transactions' ? <PartnerTransactionsTab partnerId={id} /> : null}
      {activeTab === 'documents' ? <PartnerDocumentsTab partner={partner} tablet={tablet} /> : null}
    </AdminPage>
  );
};
export default AdminPartnerDetail;
