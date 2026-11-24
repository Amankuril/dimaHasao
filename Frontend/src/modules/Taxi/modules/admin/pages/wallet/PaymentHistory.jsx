import React from 'react';
import { ArrowRight, CreditCard, Wallet } from 'lucide-react';

const PaymentHistory = () => {
  const [role, setRole] = React.useState('Driver');
  const [month, setMonth] = React.useState('April 2026');

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium text-neutral-400">Wallet</p>
        <h1 className="mt-1 text-[22px] font-medium text-neutral-900">Payment history</h1>
      </div>

      <div className="rounded-xl border border-neutral-900/[0.08] bg-white p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
          <div className="space-y-2">
            <label className="text-[13px] font-medium text-neutral-900">Select role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="h-12 w-full rounded-xl border-2 border-neutral-200 bg-white px-4 text-[14px] font-medium text-neutral-800 outline-none"
            >
              <option>Select</option>
              <option>User</option>
              <option>Driver</option>
              <option>Owner</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[13px] font-medium text-neutral-900">Select month</label>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="h-12 w-full rounded-xl border-2 border-neutral-200 bg-white px-4 text-[14px] font-medium text-neutral-800 outline-none"
            >
              <option>April 2026</option>
              <option>March 2026</option>
              <option>February 2026</option>
              <option>January 2026</option>
            </select>
          </div>

          <button className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#4054b2] px-5 text-[13px] font-medium text-white">
            <Wallet size={16} />
            View wallet
          </button>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl bg-neutral-50 p-4">
            <p className="text-xs font-medium text-neutral-400">Role</p>
            <p className="mt-2 text-[16px] font-medium text-neutral-900">{role}</p>
          </div>
          <div className="rounded-2xl bg-neutral-50 p-4">
            <p className="text-xs font-medium text-neutral-400">Selected month</p>
            <p className="mt-2 text-[16px] font-medium text-neutral-900">{month}</p>
          </div>
          <div className="rounded-2xl bg-neutral-50 p-4">
            <p className="text-xs font-medium text-neutral-400">Action</p>
            <p className="mt-2 text-[16px] font-medium text-neutral-900">Open payment ledger</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500">
              <CreditCard size={18} />
            </div>
            <div>
              <p className="text-[13px] font-medium text-neutral-900">Payment history</p>
              <p className="text-[12px] font-medium text-neutral-500">
                This screen is ready for wallet transactions, balance checks, and role-based payment filters
              </p>
            </div>
            <button className="ml-auto inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-[12px] font-medium text-neutral-700">
              Next <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentHistory;
