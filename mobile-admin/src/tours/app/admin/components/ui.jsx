/* Ported from Frontend/src/modules/Tours/app/admin/components/ui.jsx (tools/port.js first pass). */
/** Small shared pieces for the tours admin pages. */
import React from 'react';
import { Check, Loader2 } from 'lucide-react-native';
import { Div, H2, P, Span, Icon as UiIcon } from '../../../../components/web';
export const currency = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
export const shortDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';
export const PageHeader = ({ title, subtitle, action }) => (
  <Div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
    <Div>
      <H2 className="text-2xl font-bold text-gray-900">{title}</H2>
      {subtitle && <P className="text-gray-500 text-sm mt-0.5">{subtitle}</P>}
    </Div>
    {action}
  </Div>
);
export const Spinner = () => (
  <Div className="p-12 text-center text-gray-400">
    <UiIcon as={Loader2} size={22} className="animate-spin inline" />
  </Div>
);
export const EmptyState = ({ message }) => <Div className="p-10 text-center text-gray-400 text-xs">{message}</Div>;
export const StatCard = ({ label, value, tone = 'text-gray-900' }) => (
  <Div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
    <P className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</P>
    <P className={`text-2xl font-black mt-1 ${tone}`}>{value}</P>
  </Div>
);
const STATUS_TONES = {
  approved: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  rejected: 'bg-red-100 text-red-700',
  draft: 'bg-gray-100 text-gray-600',
  confirmed: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
  ongoing: 'bg-purple-100 text-purple-700',
  processing: 'bg-blue-100 text-blue-700',
  failed: 'bg-red-100 text-red-700',
  advance_paid: 'bg-amber-100 text-amber-700',
  paid: 'bg-emerald-100 text-emerald-700',
  // Festival life-cycle, from festivalStatus() on the backend.
  live: 'bg-emerald-100 text-emerald-700',
  upcoming: 'bg-blue-100 text-blue-700',
  ended: 'bg-gray-100 text-gray-600',
  scheduled: 'bg-amber-100 text-amber-700',
};

/** A numbered progress rail for a multi-step admin form. `steps` is `[{key,label,icon}]`. */
export const StepIndicator = ({ steps, current }) => (
  <Div className="flex items-center mb-1">
    {steps.map((s, i) => {
      const done = i < current;
      const active = i === current;
      const Icon = s.icon;
      return (
        <React.Fragment key={s.key}>
          <Div className="flex flex-col items-center gap-1.5 shrink-0">
            <Div
              className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors ${done ? 'bg-[#0a4d2b] border-[#0a4d2b] text-white' : active ? 'border-[#0a4d2b] text-[#0a4d2b] bg-white' : 'border-gray-200 text-gray-300 bg-white'}`}
            >
              {done ? <UiIcon as={Check} size={16} /> : Icon ? <UiIcon as={Icon} size={15} /> : <Span className="text-xs font-bold">{i + 1}</Span>}
            </Div>
            <Span
              className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wide text-center leading-tight w-16 ${active ? 'text-[#0a4d2b]' : done ? 'text-gray-500' : 'text-gray-300'}`}
            >
              {s.label}
            </Span>
          </Div>
          {i < steps.length - 1 && <Div className={`flex-1 h-0.5 rounded mb-4 mx-1 ${i < current ? 'bg-[#0a4d2b]' : 'bg-gray-200'}`} />}
        </React.Fragment>
      );
    })}
  </Div>
);
export const StatusPill = ({ status }) => (
  <Span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${STATUS_TONES[status] || 'bg-gray-100 text-gray-600'}`}>
    {String(status || '').replace(/_/g, ' ')}
  </Span>
);
