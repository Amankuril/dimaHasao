/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/wallet/WalletPayment.jsx (tools/port.js first pass). */
import React, { useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, ChevronRight, Clock, History, Loader2, Search, Send, Truck, User, Wallet } from 'lucide-react-native';
import { adminService } from '../../services/adminService';
import { toast } from '../../../../../lib/notify';
import { Button, Div, Form, H1, H2, H3, H4, Input, Label, Option, P, ScrollDiv, Select, Span, Textarea, Icon as UiIcon } from '../../../../../components/web';
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
const inputClass =
  'w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-800 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors disabled:bg-gray-50 disabled:text-gray-400';
const labelClass = 'block text-xs font-semibold text-gray-500 mb-1.5';
const WalletPayment = () => {
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
  return (
    <ScrollDiv className="min-h-screen bg-gray-50 p-4 lg:p-6">
      <Div className="mb-4">
        <Div className="mb-2 flex items-center gap-1.5 text-xs text-gray-400">
          <Span>Wallet</Span>
          <UiIcon as={ChevronRight} size={12} />
          <Span className="text-gray-700 font-medium">Wallet Payment</Span>
        </Div>
        <Div className="flex items-start justify-between gap-4">
          <Div>
            <H1 className="text-lg text-gray-900 font-bold">Wallet Payment</H1>
            <P className="mt-1 text-sm text-gray-500">Manage and adjust balances for Users, Drivers, and Fleet Owners</P>
          </Div>
        </Div>
      </Div>

      <Div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Div className="space-y-6 lg:col-span-5">
          <Div className="rounded-xl border border-gray-200 bg-white p-6">
            <Div className="mb-6 flex items-center gap-3 border-b border-gray-100 pb-4">
              <Div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <UiIcon as={Search} size={18} />
              </Div>
              <Div>
                <H2 className="text-sm text-gray-900 font-bold">Select Account</H2>
                <P className="text-xs text-gray-400">Choose role and search account before wallet adjustment</P>
              </Div>
            </Div>

            <Div className="space-y-5">
              <Div>
                <Label className={labelClass}>Select Role</Label>
                <Div className="grid grid-cols-3 gap-2">
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
                      className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${role === roleOption.id ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}
                    >
                      <UiIcon as={roleOption.icon} size={15} />
                      <Span>{roleOption.label}</Span>
                    </Button>
                  ))}
                </Div>
              </Div>

              <Div className="relative">
                <Label className={labelClass}>Search Account</Label>
                <Div className="relative">
                  <Div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {searching ? <UiIcon as={Loader2} className="animate-spin" size={16} /> : <UiIcon as={Search} size={16} />}
                  </Div>
                  <Input
                    type="text"
                    disabled={!role}
                    placeholder={role ? 'Search name, email or mobile...' : 'Select role first'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`${inputClass} pl-10 pr-20`}
                  />
                  {selectedEntity && (
                    <Button
                      type="button"
                      onClick={() => {
                        setSelectedEntity(null);
                        setSearchQuery('');
                        setHistory([]);
                        setBalance(0);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-500 hover:bg-gray-50"
                    >
                      Clear
                    </Button>
                  )}
                </Div>

                {searchResults.length > 0 && (
                  <ScrollDiv className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
                    {searchResults.map((item) => (
                      <Button
                        key={item._id}
                        type="button"
                        onClick={() => handleSelectEntity(item)}
                        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-gray-50"
                      >
                        <Div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-700">
                          {(item.name || item.owner_name || '?')[0].toUpperCase()}
                        </Div>
                        <Div className="min-w-0 flex-1">
                          <P className="truncate text-sm font-medium text-gray-900">{item.name || item.owner_name}</P>
                          <P className="truncate text-xs text-gray-500">{item.phone || item.mobile || item.email}</P>
                        </Div>
                        <UiIcon as={ChevronRight} size={14} className="text-gray-300" />
                      </Button>
                    ))}
                  </ScrollDiv>
                )}
              </Div>

              {selectedEntity && (
                <Form onSubmit={handleSubmit} className="space-y-4 border-t border-gray-100 pt-5">
                  <Div className="grid grid-cols-2 gap-4">
                    <Div>
                      <Label className={labelClass}>Amount (INR)</Label>
                      <Input
                        type="number"
                        min="0"
                        required
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className={inputClass}
                      />
                    </Div>
                    <Div>
                      <Label className={labelClass}>Operation</Label>
                      <Select value={operation} onChange={(e) => setOperation(e.target.value)} className={inputClass}>
                        <Option value="credit">Credit</Option>
                        <Option value="debit">Debit</Option>
                      </Select>
                    </Div>
                  </Div>

                  <Div>
                    <Label className={labelClass}>Description</Label>
                    <Textarea
                      placeholder="Reason for adjustment..."
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className={inputClass}
                    />
                  </Div>

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? <UiIcon as={Loader2} className="animate-spin" size={16} /> : <UiIcon as={Send} size={16} />}
                    Submit Adjustment
                  </Button>
                </Form>
              )}
            </Div>
          </Div>
        </Div>

        <Div className="space-y-6 lg:col-span-7">
          {selectedEntity && (
            <Div className="rounded-xl border border-gray-200 bg-white p-6">
              <Div className="flex items-start justify-between gap-4">
                <Div>
                  <P className="text-xs font-semibold uppercase tracking-wide text-gray-500">Current Balance</P>
                  <H3 className="mt-2 text-3xl text-gray-900 font-bold">
                    INR{' '}
                    {Number(balance || 0).toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                    })}
                  </H3>
                </Div>
                <Div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <UiIcon as={Wallet} size={18} />
                </Div>
              </Div>
              <Div className="mt-4 flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                <Div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-700">
                  {(selectedEntity.name || selectedEntity.owner_name || '?')[0].toUpperCase()}
                </Div>
                <Div>
                  <P className="text-sm font-medium text-gray-900">{selectedEntity.name || selectedEntity.owner_name}</P>
                  <P className="text-xs text-gray-500">{selectedEntity.phone || selectedEntity.mobile}</P>
                </Div>
              </Div>
            </Div>
          )}

          <Div className="min-h-[420px] rounded-xl border border-gray-200 bg-white p-6">
            <Div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-4">
              <H2 className="flex items-center gap-2 text-sm text-gray-900 font-bold">
                <UiIcon as={Clock} size={16} className="text-gray-400" /> Transaction History
              </H2>
              {loadingHistory && <UiIcon as={Loader2} className="animate-spin text-indigo-500" size={16} />}
            </Div>

            {!selectedEntity ? (
              <Div className="flex flex-col items-center justify-center py-16 text-center">
                <Div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-50 text-gray-300">
                  <UiIcon as={Search} size={26} />
                </Div>
                <H3 className="text-sm text-gray-900 font-bold">No Account Selected</H3>
                <P className="mt-1 max-w-xs text-xs text-gray-500">Select a role and search an account to view wallet transactions.</P>
              </Div>
            ) : history.length === 0 && !loadingHistory ? (
              <Div className="flex flex-col items-center justify-center py-16 text-center">
                <Div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-50 text-gray-300">
                  <UiIcon as={History} size={26} />
                </Div>
                <H3 className="text-sm text-gray-900 font-bold">No Transactions Found</H3>
                <P className="mt-1 text-xs text-gray-500">This account has no wallet entries yet.</P>
              </Div>
            ) : (
              <Div className="space-y-4">
                {history.map((tx) => (
                  <Div
                    key={tx._id}
                    className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3 transition-colors hover:bg-gray-50"
                  >
                    <Div className="flex items-center gap-4">
                      <Div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg ${tx.type === 'credit' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}
                      >
                        {tx.type === 'credit' ? <UiIcon as={ArrowUpRight} size={18} /> : <UiIcon as={ArrowDownLeft} size={18} />}
                      </Div>
                      <Div className="min-w-0">
                        <H4 className="truncate text-sm text-gray-900 font-bold">{tx.description || 'Wallet adjustment'}</H4>
                        <P className="mt-1 text-xs text-gray-500">
                          {new Date(tx.createdAt).toLocaleDateString()} {' • '}
                          {new Date(tx.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </P>
                      </Div>
                    </Div>
                    <Div className="text-right">
                      <P className={`text-sm font-semibold ${tx.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {tx.type === 'credit' ? '+' : '-'} INR {Number(tx.amount || 0).toLocaleString('en-IN')}
                      </P>
                      <P className="mt-0.5 text-[11px] uppercase text-gray-400">{tx.type}</P>
                    </Div>
                  </Div>
                ))}
              </Div>
            )}
          </Div>
        </Div>
      </Div>
    </ScrollDiv>
  );
};
export default WalletPayment;
