import React, { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import operatorService from '../../../services/operatorService';
import toast from 'react-hot-toast';

const currency = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const shortDate = (v) => (v ? new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—');

const OperatorWallet = () => {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [bank, setBank] = useState({ accountNumber: '', ifscCode: '', accountHolderName: '', bankName: '' });
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [w, t, wd] = await Promise.all([
        operatorService.getWallet(),
        operatorService.getTransactions().catch(() => ({ transactions: [] })),
        operatorService.getWithdrawals().catch(() => ({ withdrawals: [] })),
      ]);
      setWallet(w.wallet);
      setTransactions(t.transactions || []);
      setWithdrawals(wd.withdrawals || []);
      if (w.wallet?.bankDetails?.accountNumber) setBank(w.wallet.bankDetails);
    } catch (error) {
      toast.error(error.message || 'Failed to load your wallet');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveBank = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      await operatorService.updateBankDetails(bank);
      toast.success('Bank details saved');
      await load();
    } catch (error) {
      toast.error(error.message || 'Could not save bank details');
    } finally {
      setSaving(false);
    }
  };

  const withdraw = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      const result = await operatorService.requestWithdrawal(Number(amount));
      toast.success(result.message || 'Payout requested');
      setAmount('');
      await load();
    } catch (error) {
      toast.error(error.message || 'Could not request a payout');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-center py-12 text-gray-400"><Loader2 size={20} className="animate-spin inline" /></p>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Wallet</h1>
        <p className="text-sm text-gray-500 mt-1">
          This holds what the platform collected online, less commission and tax. Balances you
          collect in person never pass through here.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="to-card p-5 bg-gradient-to-br from-[#0a4d2b] to-[#06381e] text-white border-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/60">Available</p>
          <p className="text-3xl font-black mt-1">{currency(wallet?.balance)}</p>
        </div>
        <div className="to-card p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total earned</p>
          <p className="text-2xl font-black text-gray-900 mt-1">{currency(wallet?.totalEarnings)}</p>
        </div>
        <div className="to-card p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Paid out</p>
          <p className="text-2xl font-black text-gray-900 mt-1">{currency(wallet?.totalWithdrawals)}</p>
        </div>
      </div>

      <form onSubmit={saveBank} className="to-card p-5 space-y-4">
        <h2 className="font-bold text-gray-900 text-sm">Bank account</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><label className="to-label">Account holder</label>
            <input className="to-input" value={bank.accountHolderName || ''}
              onChange={(e) => setBank((b) => ({ ...b, accountHolderName: e.target.value }))} /></div>
          <div><label className="to-label">Bank</label>
            <input className="to-input" value={bank.bankName || ''}
              onChange={(e) => setBank((b) => ({ ...b, bankName: e.target.value }))} /></div>
          <div><label className="to-label">Account number</label>
            <input className="to-input" value={bank.accountNumber || ''}
              onChange={(e) => setBank((b) => ({ ...b, accountNumber: e.target.value }))} /></div>
          <div><label className="to-label">IFSC</label>
            <input className="to-input" value={bank.ifscCode || ''}
              onChange={(e) => setBank((b) => ({ ...b, ifscCode: e.target.value }))} /></div>
        </div>
        <button type="submit" disabled={saving} className="to-btn">Save bank details</button>
      </form>

      <form onSubmit={withdraw} className="to-card p-5 space-y-3">
        <h2 className="font-bold text-gray-900 text-sm">Request a payout</h2>
        <p className="text-xs text-gray-500">Minimum ₹500. An admin settles it to your bank account.</p>
        <div className="flex gap-2">
          <input className="to-input" type="number" min="500" placeholder="Amount"
            value={amount} onChange={(e) => setAmount(e.target.value)} />
          <button type="submit" disabled={saving || !amount} className="to-btn shrink-0">Request</button>
        </div>
      </form>

      {withdrawals.length > 0 && (
        <div className="to-card p-5">
          <h2 className="font-bold text-gray-900 text-sm mb-3">Payout history</h2>
          <div className="space-y-2">
            {withdrawals.map((w) => (
              <div key={w._id} className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="font-mono text-[11px] text-gray-500">{w.withdrawalId}</p>
                  <p className="text-[10px] text-gray-400">{shortDate(w.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{currency(w.amount)}</p>
                  <p className="text-[10px] font-bold uppercase text-gray-400">{w.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {transactions.length > 0 && (
        <div className="to-card p-5">
          <h2 className="font-bold text-gray-900 text-sm mb-3">Recent activity</h2>
          <div className="space-y-2">
            {transactions.slice(0, 15).map((t) => (
              <div key={t._id} className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0">
                <div className="min-w-0 pr-3">
                  <p className="text-gray-800 truncate">{t.description}</p>
                  <p className="text-[10px] text-gray-400">{shortDate(t.createdAt)} · {String(t.category).replace(/_/g, ' ')}</p>
                </div>
                <p className={`font-bold shrink-0 ${t.type === 'credit' ? 'text-[#0a4d2b]' : 'text-red-600'}`}>
                  {t.type === 'credit' ? '+' : '−'}{currency(t.amount)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OperatorWallet;
