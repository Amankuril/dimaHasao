/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/wallet/WalletPayment.jsx (tools/port.js first pass). */
import React, { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { ArrowDownLeft, ArrowUpRight, ChevronRight, History, Search, Send, Truck, User, Wallet } from 'lucide-react-native';
import { adminService } from '../../services/adminService';
import { toast } from '../../../../../lib/notify';
import { Button, Div, Form, Input, Option, Select, Span, Textarea, Icon as UiIcon } from '../../../../../components/web';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  StatCard,
  LoadingState,
  EmptyState,
  Field,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../../admin/ui';

const roleOptions = [
  {
    id: 'user',
    label: 'User',
    icon: User,
  },
  {
    id: 'driver',
    label: 'Driver',
    icon: Truck,
  },
];
const WalletPayment = () => {
  const { tablet } = useLayoutWidth();
  const [role, setRole] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [searching, setSearching] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState('');
  const [operation, setOperation] = useState('credit');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.length >= 3 && role) {
        handleSearch();
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, role]);
  const handleSearch = async () => {
    setSearching(true);
    try {
      let res;
      if (role === 'user') res = await adminService.searchUsers(searchQuery);
      else if (role === 'driver') res = await adminService.searchDrivers(searchQuery);
      setSearchResults(res.data.results || []);
    } catch (err) {
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  };
  const fetchHistory = async (entity) => {
    setLoadingHistory(true);
    try {
      let res;
      if (role === 'user') res = await adminService.getUserWalletHistory(entity._id);
      else if (role === 'driver') res = await adminService.getDriverWalletHistory(entity._id);
      setHistory(res.data.results || []);
      setBalance(res.data.balance || 0);
    } catch (err) {
      toast.error('Failed to load history');
    } finally {
      setLoadingHistory(false);
    }
  };
  const handleSelectEntity = (entity) => {
    setSelectedEntity(entity);
    setSearchResults([]);
    setSearchQuery(`${entity.name || entity.owner_name} (${entity.phone || entity.mobile})`);
    fetchHistory(entity);
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || amount <= 0) return toast.error('Enter valid amount');
    if (!selectedEntity) return toast.error('Select a user or driver');
    setSubmitting(true);
    try {
      const data = {
        amount: Number(amount),
        operation,
        description,
      };
      if (role === 'user') await adminService.adjustUserWallet(selectedEntity._id, data);
      else if (role === 'driver') await adminService.adjustDriverWallet(selectedEntity._id, data);
      toast.success(`Successfully ${operation}ed ₹${amount}`);
      setAmount('');
      setDescription('');
      fetchHistory(selectedEntity);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Adjustment failed');
    } finally {
      setSubmitting(false);
    }
  };
  const entityName = selectedEntity ? selectedEntity.name || selectedEntity.owner_name : '';
  return (
    <AdminPage maxWidth={900}>
      <PageHeader
        icon={Wallet}
        title="Wallet Payment"
        subtitle="Manage and adjust balances for users and drivers"
        breadcrumb={[{ label: 'Wallet' }, { label: 'Wallet Payment' }]}
      />

      <Card className="mb-4">
        <SectionTitle>Select Account</SectionTitle>

        <Field label="Select Role" hint="Pick a role before searching">
          <Div className="flex-row gap-2">
            {roleOptions.map((roleOption) => (
              <Button
                key={roleOption.id}
                type="button"
                onClick={() => {
                  setRole(roleOption.id);
                  setSelectedEntity(null);
                  setSearchQuery('');
                  setSearchResults([]);
                  setHistory([]);
                  setBalance(0);
                }}
                className={`flex-1 flex-row items-center justify-center gap-2 h-11 px-3 rounded-lg border ${role === roleOption.id ? 'border-blue-600 bg-blue-100' : 'border-slate-300 bg-white'}`}
              >
                <UiIcon as={roleOption.icon} size={16} className={role === roleOption.id ? 'text-blue-700' : 'text-slate-500'} />
                <Span className={`text-sm font-semibold ${role === roleOption.id ? 'text-blue-700' : 'text-slate-700'}`}>{roleOption.label}</Span>
              </Button>
            ))}
          </Div>
        </Field>

        <Field label="Search Account" className="mt-3">
          <Div className={`flex-row items-center gap-2 h-11 px-3 rounded-lg border border-slate-300 bg-white ${role ? '' : 'opacity-50'}`}>
            {searching ? <ActivityIndicator size="small" color="#155DFC" /> : <UiIcon as={Search} size={16} className="text-slate-400" />}
            <Input
              type="text"
              disabled={!role}
              placeholder={role ? 'Search name, email or mobile' : 'Select role first'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 text-sm text-slate-900"
            />
            {selectedEntity ? (
              <Button
                type="button"
                onClick={() => {
                  setSelectedEntity(null);
                  setSearchQuery('');
                  setHistory([]);
                  setBalance(0);
                }}
                className="px-2 h-9 rounded-md border border-slate-200 bg-white items-center justify-center"
              >
                <Span className="text-xs font-semibold text-slate-600">Clear</Span>
              </Button>
            ) : null}
          </Div>
        </Field>

        {searchResults.length > 0 ? (
          <Div className="mt-2 rounded-lg border border-slate-200 bg-white overflow-hidden">
            {searchResults.map((item, i) => (
              <Button
                key={item._id}
                type="button"
                onClick={() => handleSelectEntity(item)}
                className={`flex-row items-center gap-3 px-3 py-3 ${i === searchResults.length - 1 ? '' : 'border-b border-slate-100'}`}
              >
                <Div className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center shrink-0">
                  <Span className="text-xs font-semibold text-slate-700">{(item.name || item.owner_name || '?')[0].toUpperCase()}</Span>
                </Div>
                <Div className="flex-1 min-w-0">
                  <Span className="text-sm font-medium text-slate-900" numberOfLines={1}>
                    {item.name || item.owner_name}
                  </Span>
                  <Span className="text-xs text-slate-500" numberOfLines={1}>
                    {item.phone || item.mobile || item.email}
                  </Span>
                </Div>
                <UiIcon as={ChevronRight} size={16} className="text-slate-400" />
              </Button>
            ))}
          </Div>
        ) : null}

        {selectedEntity && (
          <Form onSubmit={handleSubmit} className="gap-3 mt-4 pt-4 border-t border-slate-200">
            <Div className={`grid grid-cols-${tablet ? 2 : 1} gap-3`}>
              <Field label="Amount (INR)" required>
                <Input type="number" min="0" required placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className={INPUT} />
              </Field>
              <Field label="Operation">
                <Select value={operation} onChange={(e) => setOperation(e.target.value)} className={INPUT}>
                  <Option value="credit">Credit</Option>
                  <Option value="debit">Debit</Option>
                </Select>
              </Field>
            </Div>

            <Field label="Description" hint="Shown in the wallet history">
              <Textarea
                placeholder="Reason for adjustment"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
              />
            </Field>

            <Button type="submit" disabled={submitting} className={`${BTN_PRIMARY} ${submitting ? 'opacity-50' : ''}`}>
              {submitting ? <ActivityIndicator size="small" color="#FFFFFF" /> : <UiIcon as={Send} size={16} className="text-white" />}
              <Span className={BTN_TEXT_PRIMARY}>Submit Adjustment</Span>
            </Button>
          </Form>
        )}
      </Card>

      {selectedEntity ? (
        <Div className="gap-3 mb-4">
          <StatCard
            label="Current Balance"
            value={`INR ${Number(balance || 0).toLocaleString('en-IN', {
              minimumFractionDigits: 2,
            })}`}
            hint={`${entityName} · ${selectedEntity.phone || selectedEntity.mobile || ''}`}
            icon={Wallet}
            tone="info"
          />
        </Div>
      ) : null}

      <Card>
        <SectionTitle>Transaction History</SectionTitle>
        {!selectedEntity ? (
          <EmptyState
            icon={Search}
            title="No account selected"
            message="Select a role and search an account to view its wallet transactions."
            className="border-0"
          />
        ) : loadingHistory ? (
          <LoadingState label="Loading transactions…" className="border-0" />
        ) : history.length === 0 ? (
          <EmptyState icon={History} title="No transactions found" message="This account has no wallet entries yet." className="border-0" />
        ) : (
          <Div className="gap-2">
            {history.map((tx) => (
              <Div key={tx._id} className="flex-row items-center gap-3 rounded-lg border border-slate-200 px-3 py-3">
                <Div className={`w-10 h-10 rounded-lg items-center justify-center shrink-0 ${tx.type === 'credit' ? 'bg-green-100' : 'bg-red-100'}`}>
                  <UiIcon as={tx.type === 'credit' ? ArrowUpRight : ArrowDownLeft} size={18} className={tx.type === 'credit' ? 'text-green-700' : 'text-red-700'} />
                </Div>
                <Div className="flex-1 min-w-0">
                  <Span className="text-sm font-medium text-slate-900" numberOfLines={2}>
                    {tx.description || 'Wallet adjustment'}
                  </Span>
                  <Span className="text-xs text-slate-500">
                    {`${new Date(tx.createdAt).toLocaleDateString()} • ${new Date(tx.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`}
                  </Span>
                </Div>
                <Div className="items-end shrink-0">
                  <Span className={`text-sm font-semibold ${tx.type === 'credit' ? 'text-green-700' : 'text-red-600'}`}>
                    {`${tx.type === 'credit' ? '+' : '-'} INR ${Number(tx.amount || 0).toLocaleString('en-IN')}`}
                  </Span>
                  <Span className="text-xs text-slate-500">{tx.type}</Span>
                </Div>
              </Div>
            ))}
          </Div>
        )}
      </Card>
    </AdminPage>
  );
};
export default WalletPayment;
