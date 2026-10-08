/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/users/UserDetails.jsx (tools/port.js first pass). */
import React, { useState, useEffect } from 'react';
import { ActivityIndicator } from 'react-native';
import {
  ArrowLeft,
  Mail,
  Phone,
  Clock,
  Filter,
  CheckCircle2,
  X,
  CreditCard,
  Star,
  Car,
  TrendingUp,
  AlertCircle,
  Plus,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  History as HistoryIcon,
  User as UserIcon,
} from 'lucide-react-native';
import { useNavigate, useParams } from '../../../../../lib/webRouter';
import { A, Button, Div, HScroll, Img, Input, Option, Overlay, Select, Span, Icon as UiIcon } from '../../../../../components/web';
import { alert } from '../../../../../lib/webShim';
import { API_BASE_URL } from '../../../../shared/api/runtimeConfig';
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
  Pagination,
  LoadingState,
  EmptyState,
  ErrorState,
  Field,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_DANGER,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../../admin/ui';

const TABS = ['Request List', 'User Payment History', 'Review History'];
const REQ_COLS = [110, 110, 150, 150, 120, 100, 120];
const REQ_LABELS = ['Request Id', 'Date', 'User Name', 'Driver Name', 'Trip Status', 'Paid', 'Payment'];

const UserDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { tablet } = useLayoutWidth();
  const reviewColumns = tablet ? 2 : 1;
  const [activeTab, setActiveTab] = useState('Request List');
  const [isWalletModalOpen, setWalletModalOpen] = useState(false);
  const [walletType, setWalletType] = useState('credit'); // credit or debit
  const [walletAmount, setWalletAmount] = useState('');
  const [user, setUser] = useState(null);
  const [requests, setRequests] = useState([]);
  const [walletHistory, setWalletHistory] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const token = localStorage.getItem('adminToken');
  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Fetch User Info
      const userRes = await fetch(`${API_BASE_URL}/admin/users/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const userData = await userRes.json();
      if (userData.success) {
        let u = userData.data;
        if (Array.isArray(u)) u = u[0];
        if (u?.user) u = u.user;
        if (u) {
          setUser({
            id: u._id,
            name: u.name || u.user_id?.name || 'Anonymous',
            phone: u.mobile || u.mobile_number || u.user_id?.mobile || 'N/A',
            email: u.email || u.user_id?.email || 'N/A',
            joined:
              u.createdAt || u.user_id?.createdAt
                ? new Date(u.createdAt || u.user_id?.createdAt).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : 'N/A',
            avatar: (u.name || u.user_id?.name || 'A')
              .split(' ')
              .map((n) => n[0])
              .join(''),
            profileImage: u.profileImage || u.user_id?.profileImage || '',
            governmentIdProof: u.governmentIdProof || u.user_id?.governmentIdProof || null,
            stats: {
              completed: 0,
              cancelled: 0,
              upcoming: 0,
            },
            wallet: {
              total: u.wallet_balance || u.user_id?.wallet_balance || 0,
              spend: 0,
              balance: u.wallet_balance || u.user_id?.wallet_balance || 0,
            },
          });
        }
        const userReviews = Array.isArray(userData.data?.reviews) ? userData.data.reviews : Array.isArray(u?.reviews) ? u.reviews : [];
        setReviews(
          userReviews.map((review) => ({
            _id: review._id,
            rating: Number(review.rating || 0),
            comment: review.comment || '',
            createdAt: review.createdAt || null,
            driver_id: review.driver_id || null,
          })),
        );
      }

      // Fetch Requests
      const reqRes = await fetch(`${API_BASE_URL}/admin/users/${id}/requests`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const reqData = await reqRes.json();
      if (reqData.success) {
        const mappedRequests = (reqData.data?.results || []).map((r) => ({
          id: r.request_id || 'N/A',
          date: r.trip_start_time ? new Date(r.trip_start_time).toLocaleDateString() : 'N/A',
          user: userData.data?.name || 'User',
          driver: r.driver_id?.name || 'Pending',
          status: r.is_completed ? 'Completed' : r.is_cancelled ? 'Cancelled' : 'Ongoing',
          paid: r.is_paid ? 'Paid' : 'Not Paid',
          payment: r.payment_type || 'CASH',
        }));
        setRequests(mappedRequests);

        // Update stats
        if (userData.success) {
          setUser((prev) => ({
            ...prev,
            stats: {
              completed: mappedRequests.filter((r) => r.status === 'Completed').length,
              cancelled: mappedRequests.filter((r) => r.status === 'Cancelled').length,
              upcoming: mappedRequests.filter((r) => r.status === 'Ongoing').length,
            },
          }));
        }
      }

      // Fetch Wallet History
      const walletRes = await fetch(`${API_BASE_URL}/admin/users/${id}/wallet-history`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const walletData = await walletRes.json();
      if (walletData.success) {
        const history = (walletData.data?.results || []).map((w) => {
          // Determine type from transaction_alias or amount sign
          const isCredit = w.transaction_alias === 'ADMIN_CREDIT' || w.amount > 0;
          return {
            id: w._id,
            amount: Math.abs(w.amount),
            // Use absolute for display but sign for logic
            type: isCredit ? 'credit' : 'debit',
            remarks: w.remarks || (isCredit ? 'Credit Adjustment' : 'Debit Adjustment'),
            date: w.createdAt
              ? new Date(w.createdAt).toLocaleString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'N/A',
          };
        });
        setWalletHistory(history);

        // Calculate dynamic stats from history
        const totalCredit = history.filter((h) => h.type === 'credit').reduce((sum, h) => sum + h.amount, 0);
        const totalDebit = history.filter((h) => h.type === 'debit').reduce((sum, h) => sum + h.amount, 0);
        setUser((prev) => ({
          ...prev,
          wallet: {
            total: totalCredit,
            spend: totalDebit,
            balance: totalCredit - totalDebit,
          },
        }));
      }
    } catch (err) {
      setError('Failed to load user details');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, [id, token]);
  const handleWalletAction = async () => {
    if (!walletAmount || isSubmitting) return;
    try {
      setIsSubmitting(true);
      const res = await fetch(`${API_BASE_URL}/admin/wallet/users/${id}/adjust`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(walletAmount),
          payment_type: walletType,
          remarks: `Admin ${walletType} action`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setWalletModalOpen(false);
        setWalletAmount('');
        // Refresh data to show new balance and history
        fetchData();
      } else {
        alert(data.message || 'Failed to adjust wallet');
      }
    } catch (err) {
      console.error(err);
      alert('Network error');
    } finally {
      setIsSubmitting(false);
    }
  };
  const header = (
    <PageHeader
      icon={UserIcon}
      title="User Profile"
      subtitle={user ? user.name : 'Passenger details, rides, wallet and reviews'}
      breadcrumb={[{ label: 'Users' }, { label: 'User Profile' }]}
      actions={
        <Button onClick={() => navigate('/taxi/admin/users')} className={BTN_SECONDARY} accessibilityLabel="Back to users">
          <UiIcon as={ArrowLeft} size={16} className="text-slate-600" />
          <Span className={BTN_TEXT_SECONDARY}>Back</Span>
        </Button>
      }
    />
  );

  if (isLoading) {
    return (
      <AdminPage maxWidth={1200}>
        {header}
        <LoadingState label="Loading profile…" />
      </AdminPage>
    );
  }
  if (error || !user) {
    return (
      <AdminPage maxWidth={1200}>
        {header}
        <ErrorState title={error || 'User not found'} message="This passenger could not be loaded." onRetry={fetchData} />
      </AdminPage>
    );
  }
  const avgRating = (reviews.reduce((acc, curr) => acc + curr.rating, 0) / (reviews.length || 1)).toFixed(1);
  return (
    <AdminPage maxWidth={1200}>
      {header}

      <Card className="mb-4">
        <Div className="flex-row items-start gap-3">
          <Div className="w-16 h-16 shrink-0 rounded-full bg-slate-100 items-center justify-center overflow-hidden">
            {user.profileImage ? (
              <Img src={user.profileImage} alt={user.name} className="w-16 h-16 rounded-full" contentFit="cover" />
            ) : (
              <Span className="text-xl font-bold text-slate-600">{user.avatar}</Span>
            )}
          </Div>
          <Div className="flex-1 min-w-0 gap-1">
            <Span className="text-base font-semibold text-slate-900" numberOfLines={2}>
              {user.name}
            </Span>
            <Div className="flex-row items-center gap-1.5">
              <UiIcon as={Phone} size={14} className="text-slate-400" />
              <Span className="text-sm text-slate-500 flex-1" numberOfLines={1}>
                {user.phone}
              </Span>
            </Div>
            <Div className="flex-row items-center gap-1.5">
              <UiIcon as={Mail} size={14} className="text-slate-400" />
              <Span className="text-sm text-slate-500 flex-1" numberOfLines={1}>
                {user.email}
              </Span>
            </Div>
            <Div className="flex-row items-center gap-1.5">
              <UiIcon as={Clock} size={14} className="text-slate-400" />
              <Span className="text-sm text-slate-500 flex-1" numberOfLines={1}>
                Joined {user.joined}
              </Span>
            </Div>
          </Div>
        </Div>

        <Div className="flex-row flex-wrap items-center gap-2 mt-3">
          {user.profileImage ? (
            <A href={user.profileImage} className={BTN_SECONDARY}>
              <Span className={BTN_TEXT_SECONDARY}>View Photo</Span>
            </A>
          ) : null}
          {user.governmentIdProof?.imageUrl ? (
            <A href={user.governmentIdProof.imageUrl} className={BTN_SECONDARY}>
              <Span className={BTN_TEXT_SECONDARY}>View {String(user.governmentIdProof.type || 'ID').replace(/_/g, ' ')}</Span>
            </A>
          ) : (
            <StatusBadge tone="danger" label="ID Proof Missing" />
          )}
        </Div>
      </Card>

      <HScroll className="mb-4" contentClassName="flex-row items-center gap-2">
        {TABS.map((tab) => (
          <Button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`h-11 px-4 rounded-full items-center justify-center ${activeTab === tab ? 'bg-blue-600' : 'border border-slate-300 bg-white'}`}
          >
            <Span className={`text-sm font-semibold ${activeTab === tab ? 'text-white' : 'text-slate-700'}`}>{tab}</Span>
          </Button>
        ))}
      </HScroll>

      {activeTab === 'Request List' && (
        <>
          <StatGrid className="mb-4">
            <StatCard label="Completed Rides" value={user.stats.completed} icon={CheckCircle2} tone="success" />
            <StatCard label="Cancelled Rides" value={user.stats.cancelled} icon={AlertCircle} tone="danger" />
            <StatCard label="Upcoming Rides" value={user.stats.upcoming} icon={Clock} tone="warning" />
          </StatGrid>

          <Card className="mb-4">
            <Toolbar className="mb-0">
              <Div className="flex-row items-center gap-2">
                <Span className="text-sm text-slate-500">Show</Span>
                <Select className={`${INPUT} w-24`}>
                  <Option>15</Option>
                  <Option>30</Option>
                  <Option>50</Option>
                </Select>
              </Div>
              <Button onClick={() => setIsFilterOpen(!isFilterOpen)} className={BTN_SECONDARY}>
                <UiIcon as={Filter} size={16} className="text-slate-600" />
                <Span className={BTN_TEXT_SECONDARY}>Filters</Span>
              </Button>
            </Toolbar>
            {isFilterOpen ? (
              <Div className="mt-3 pt-3 border-t border-slate-200 gap-3">
                <SectionTitle>Filter Requests</SectionTitle>
                <Field label="Status">
                  <Select className={INPUT}>
                    <Option value="all">All Statuses</Option>
                    <Option value="completed">Completed</Option>
                    <Option value="cancelled">Cancelled</Option>
                    <Option value="ongoing">Ongoing</Option>
                  </Select>
                </Field>
                <Div className="flex-row gap-2">
                  <Button onClick={() => setIsFilterOpen(false)} className={`${BTN_SECONDARY} flex-1`}>
                    <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
                  </Button>
                  <Button onClick={() => setIsFilterOpen(false)} className={`${BTN_PRIMARY} flex-1`}>
                    <Span className={BTN_TEXT_PRIMARY}>Apply</Span>
                  </Button>
                </Div>
              </Div>
            ) : null}
          </Card>

          {requests.length > 0 ? (
            <>
              <DataTable cols={REQ_COLS}>
                <THead cols={REQ_COLS} labels={REQ_LABELS} />
                <TBody>
                  {requests.map((r, i) => (
                    <Row key={i} last={i === requests.length - 1}>
                      <Cell width={REQ_COLS[0]} numberOfLines={1}>{`#${String(r.id).slice(-8).toUpperCase()}`}</Cell>
                      <Cell width={REQ_COLS[1]}>{r.date}</Cell>
                      <Cell width={REQ_COLS[2]}>{r.user}</Cell>
                      <Cell width={REQ_COLS[3]}>{r.driver}</Cell>
                      <Cell width={REQ_COLS[4]}>
                        <StatusBadge status={r.status.toLowerCase()} label={r.status} />
                      </Cell>
                      <Cell width={REQ_COLS[5]}>
                        <StatusBadge status={r.paid === 'Paid' ? 'paid' : 'pending'} label={r.paid} />
                      </Cell>
                      <Cell width={REQ_COLS[6]}>
                        <StatusBadge tone="neutral" label={r.payment} />
                      </Cell>
                    </Row>
                  ))}
                </TBody>
              </DataTable>
              <Pagination page={1} pages={1} total={requests.length} />
            </>
          ) : (
            <EmptyState icon={Car} title="No rides yet" message="This passenger has not requested a ride." />
          )}
        </>
      )}

      {activeTab === 'User Payment History' && (
        <>
          <StatGrid className="mb-4">
            <StatCard label="Total Wallet Credit" value={`₹ ${user.wallet.total.toFixed(2)}`} icon={CreditCard} tone="info" />
            <StatCard label="Spend Amount" value={`₹ ${user.wallet.spend.toFixed(2)}`} icon={TrendingUp} tone="danger" />
            <StatCard label="Available Balance" value={`₹ ${user.wallet.balance.toFixed(2)}`} icon={CreditCard} tone="success" />
          </StatGrid>

          <Card>
            <SectionTitle>Recent Transactions</SectionTitle>
            <Toolbar>
              <Button
                onClick={() => {
                  setWalletType('credit');
                  setWalletModalOpen(true);
                }}
                className={BTN_PRIMARY}
              >
                <UiIcon as={Plus} size={16} className="text-white" />
                <Span className={BTN_TEXT_PRIMARY}>Credit</Span>
              </Button>
              <Button
                onClick={() => {
                  setWalletType('debit');
                  setWalletModalOpen(true);
                }}
                className={BTN_SECONDARY}
              >
                <UiIcon as={Minus} size={16} className="text-slate-600" />
                <Span className={BTN_TEXT_SECONDARY}>Debit</Span>
              </Button>
            </Toolbar>

            {walletHistory.length > 0 ? (
              <Div className="gap-2">
                {walletHistory.map((tr, i) => (
                  <Div key={i} className="flex-row items-center gap-3 rounded-lg border border-slate-200 p-3">
                    <Div className={`w-10 h-10 rounded-full items-center justify-center shrink-0 ${tr.type === 'credit' ? 'bg-green-100' : 'bg-red-100'}`}>
                      <UiIcon as={tr.type === 'credit' ? ArrowUpRight : ArrowDownRight} size={18} className={tr.type === 'credit' ? 'text-green-700' : 'text-red-700'} />
                    </Div>
                    <Div className="flex-1 min-w-0">
                      <Span className="text-sm font-medium text-slate-900" numberOfLines={2}>
                        {tr.remarks}
                      </Span>
                      <Span className="text-xs text-slate-500">{tr.date}</Span>
                    </Div>
                    <Span className={`text-sm font-semibold ${tr.type === 'credit' ? 'text-green-700' : 'text-red-600'}`}>
                      {tr.type === 'credit' ? '+' : '-'} ₹{parseFloat(tr.amount).toFixed(2)}
                    </Span>
                  </Div>
                ))}
              </Div>
            ) : (
              <EmptyState icon={HistoryIcon} title="No wallet transactions" message="Credits and debits on this wallet appear here." className="border-0" />
            )}
          </Card>
        </>
      )}

      {activeTab === 'Review History' && (
        <Card>
          <SectionTitle action={reviews.length > 0 ? <StatusBadge tone="warning" icon={Star} label={`${avgRating} avg`} /> : null}>Captain Reviews</SectionTitle>
          {reviews.length > 0 ? (
            <Div className={`grid grid-cols-${reviewColumns} gap-3`}>
              {reviews.map((rev, i) => (
                <Div key={rev._id || i} className="rounded-lg border border-slate-200 p-3 gap-2">
                  <Div className="flex-row items-start justify-between gap-2">
                    <Div className="flex-row items-center gap-2 flex-1 min-w-0">
                      <Div className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center shrink-0">
                        <Span className="text-xs font-semibold text-slate-600">{rev.driver_id?.name?.charAt(0) || 'C'}</Span>
                      </Div>
                      <Div className="flex-1 min-w-0">
                        <Span className="text-sm font-medium text-slate-900" numberOfLines={1}>
                          Captain {rev.driver_id?.name || 'Unknown'}
                        </Span>
                        <Span className="text-xs text-slate-500">{rev.createdAt ? new Date(rev.createdAt).toLocaleDateString() : 'N/A'}</Span>
                      </Div>
                    </Div>
                    <Div className="flex-row items-center gap-0.5 shrink-0">
                      {[...Array(5)].map((_, starIdx) => (
                        <UiIcon as={Star} key={starIdx} size={12} className={starIdx < rev.rating ? 'text-amber-500' : 'text-slate-300'} fill={starIdx < rev.rating ? '#F0B100' : 'none'} />
                      ))}
                    </Div>
                  </Div>
                  <Span className="text-sm text-slate-700" numberOfLines={4}>
                    {rev.comment || 'No comment provided'}
                  </Span>
                </Div>
              ))}
            </Div>
          ) : (
            <EmptyState icon={Star} title="No reviews yet" message="Reviews this passenger leaves for drivers appear here." className="border-0" />
          )}
        </Card>
      )}

      {isWalletModalOpen && (
        <Overlay onClose={() => setWalletModalOpen(false)} className="flex-1 items-center justify-center p-4">
          <Div className="bg-white rounded-xl border border-slate-200 w-full max-w-sm p-4" onClick={(e) => e.stopPropagation()}>
            <Div className="flex-row items-center justify-between gap-3 mb-3">
              <Span className="text-base font-semibold text-slate-900 flex-1">{walletType === 'credit' ? 'Credit Balance' : 'Debit Balance'}</Span>
              <Button onClick={() => setWalletModalOpen(false)} accessibilityLabel="Close" className="w-11 h-11 items-center justify-center rounded-lg">
                <UiIcon as={X} size={18} className="text-slate-500" />
              </Button>
            </Div>

            <Field label={`Amount to ${walletType}`} hint="Indian rupees">
              <Input type="number" value={walletAmount} onChange={(e) => setWalletAmount(e.target.value)} placeholder="0.00" className={INPUT} />
            </Field>

            <Button
              onClick={handleWalletAction}
              disabled={isSubmitting}
              className={`${walletType === 'credit' ? BTN_PRIMARY : BTN_DANGER} mt-3 ${isSubmitting ? 'opacity-50' : ''}`}
            >
              {isSubmitting ? <ActivityIndicator size="small" color="#FFFFFF" /> : null}
              <Span className={BTN_TEXT_PRIMARY}>{`Confirm ${walletType === 'credit' ? 'Credit' : 'Debit'}`}</Span>
            </Button>
          </Div>
        </Overlay>
      )}
    </AdminPage>
  );
};
export default UserDetails;
