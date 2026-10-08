/* Ported from Frontend/src/modules/Tours/app/admin/pages/../components/ui.jsx (tools/port.js first pass). */
/**
 * Small shared pieces for the tours admin pages.
 *
 * These are now thin adapters over the admin design system in
 * `src/admin/ui.jsx`, so the tours and festivals screens get the same card,
 * header, badge and empty-state treatment as the other four panels without
 * every page having to be rewritten against the kit by hand. The exported
 * shapes are unchanged — only what they paint is.
 */
import React from 'react';
import { Check } from 'lucide-react-native';
import {
  Card,
  EmptyState as KitEmptyState,
  LoadingState,
  PageHeader as KitPageHeader,
  StatCard as KitStatCard,
  StatusBadge,
  toneFor,
} from '../../../../admin/ui';
import { Div, Span, Icon as UiIcon } from '../../../../components/web';

export const currency = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
export const shortDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';

export const PageHeader = ({ title, subtitle, action }) => <KitPageHeader title={title} subtitle={subtitle} actions={action} />;

export const Spinner = () => <LoadingState />;

export const EmptyState = ({ message }) => <KitEmptyState title="Nothing here yet" message={message} />;

/**
 * The old `tone` was a tailwind text colour; the kit colours a tile by meaning
 * instead, so the colour is mapped rather than passed through.
 */
const TONE_FROM_CLASS = (tone) => {
  const value = String(tone || '');
  if (value.includes('amber') || value.includes('orange')) return 'warning';
  if (value.includes('red')) return 'danger';
  if (value.includes('0a4d2b') || value.includes('emerald') || value.includes('green')) return 'success';
  return 'info';
};

export const StatCard = ({ label, value, tone }) => <KitStatCard label={label} value={value} tone={TONE_FROM_CLASS(tone)} />;

/**
 * Status words the kit's own table does not know about yet — the festival
 * life-cycle and the tours payment states — mapped onto a kit tone so the same
 * word is never two colours across the panels.
 */
const EXTRA_TONE = {
  live: 'success',
  upcoming: 'info',
  ended: 'neutral',
  draft: 'neutral',
  advance_paid: 'warning',
  no_show: 'danger',
};

export const StatusPill = ({ status }) => {
  const key = String(status || '')
    .trim()
    .toLowerCase();
  if (!key) return null;
  return <StatusBadge status={key} tone={EXTRA_TONE[key] || toneFor(key)} label={key.replace(/_/g, ' ')} />;
};

/** A numbered progress rail for a multi-step admin form. `steps` is `[{key,label,icon}]`. */
export const StepIndicator = ({ steps, current }) => (
  <Card>
    <Div className="flex-row items-start">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        const Icon = s.icon;
        return (
          <React.Fragment key={s.key}>
            <Div className="items-center gap-1.5 shrink-0" style={{ width: 72 }}>
              <Div
                className={`w-9 h-9 rounded-full items-center justify-center border-2 ${done ? 'bg-blue-600 border-blue-600' : active ? 'border-blue-600 bg-white' : 'border-slate-200 bg-white'}`}
              >
                {done ? (
                  <UiIcon as={Check} size={16} className="text-white" />
                ) : Icon ? (
                  <UiIcon as={Icon} size={15} className={active ? 'text-blue-600' : 'text-slate-400'} />
                ) : (
                  <Span className={`text-xs font-semibold ${active ? 'text-blue-600' : 'text-slate-400'}`}>{i + 1}</Span>
                )}
              </Div>
              <Span
                className={`text-xs font-semibold text-center ${active ? 'text-blue-600' : done ? 'text-slate-600' : 'text-slate-400'}`}
                numberOfLines={2}
              >
                {s.label}
              </Span>
            </Div>
            {i < steps.length - 1 && <Div className={`flex-1 h-0.5 rounded mt-4 ${i < current ? 'bg-blue-600' : 'bg-slate-200'}`} />}
          </React.Fragment>
        );
      })}
    </Div>
  </Card>
);
