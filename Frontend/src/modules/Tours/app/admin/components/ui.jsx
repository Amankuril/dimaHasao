/** Small shared pieces for the tours admin pages. */
import React from 'react';
import { Check, Loader2 } from 'lucide-react';

export const currency = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export const shortDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const PageHeader = ({ title, subtitle, action }) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
    <div>
      <h2 className="text-2xl font-medium text-neutral-900">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>}
    </div>
    {action}
  </div>
);

export const Spinner = () => (
  <div className="p-12 text-center text-neutral-500">
    <Loader2 size={22} className="animate-spin inline" />
  </div>
);

export const EmptyState = ({ message }) => (
  <div className="p-10 text-center text-sm text-neutral-500">{message}</div>
);

export const StatCard = ({ label, value, tone = 'text-neutral-900' }) => (
  <div className="rounded-xl border border-neutral-900/[0.08] bg-white p-5">
    <p className="text-[13px] text-neutral-500">{label}</p>
    <p className={`mt-2 font-mono text-2xl font-medium leading-8 tabular-nums ${tone}`}>{value}</p>
  </div>
);

// Dot colour by meaning: good, waiting, bad, finished. The word carries the rest.
const STATUS_DOT = {
  approved: 'bg-green-600',
  confirmed: 'bg-green-600',
  paid: 'bg-green-600',
  live: 'bg-green-600',
  ongoing: 'bg-green-600',
  pending: 'bg-amber-500',
  advance_paid: 'bg-amber-500',
  scheduled: 'bg-amber-500',
  processing: 'bg-amber-500',
  upcoming: 'bg-[#3f6f8f]',
  rejected: 'bg-red-600',
  cancelled: 'bg-red-600',
  failed: 'bg-red-600',
  draft: 'bg-neutral-400',
  completed: 'bg-neutral-400',
  ended: 'bg-neutral-400',
};

/** A numbered progress rail for a multi-step admin form. `steps` is `[{key,label,icon}]`. */
export const StepIndicator = ({ steps, current }) => (
  <div className="flex items-center mb-1">
    {steps.map((s, i) => {
      const done = i < current;
      const active = i === current;
      const Icon = s.icon;
      return (
        <React.Fragment key={s.key}>
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors ${
                done
                  ? 'bg-[#0a4d2b] border-[#0a4d2b] text-white'
                  : active
                  ? 'border-[#0a4d2b] text-[#0a4d2b] bg-white'
                  : 'border-neutral-200 text-neutral-300 bg-white'
              }`}
            >
              {done ? <Check size={16} /> : Icon ? <Icon size={15} /> : <span className="text-xs font-medium">{i + 1}</span>}
            </div>
            <span
              className={`text-xs text-center leading-tight w-16 ${
                active ? 'text-[#0a4d2b]' : done ? 'text-neutral-500' : 'text-neutral-300'
              }`}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-0.5 rounded mb-4 mx-1 ${i < current ? 'bg-[#0a4d2b]' : 'bg-neutral-200'}`} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

export const StatusPill = ({ status }) => {
  const text = String(status || '').replace(/_/g, ' ');
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-[13px] text-neutral-700">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[status] || 'bg-neutral-400'}`} />
      {text.charAt(0).toUpperCase() + text.slice(1)}
    </span>
  );
};
