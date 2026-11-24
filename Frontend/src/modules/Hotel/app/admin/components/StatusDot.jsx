/**
 * One status marker for the whole hotel admin: a small dot and the word.
 *
 * Every list page used to carry its own pill with a border, a tinted fill and
 * a 10px icon, in five slightly different colour maps. The tone of a status is
 * decided here once, so "pending" reads the same on bookings, properties,
 * partners and reviews.
 */
const TONES = {
    positive: 'bg-green-600',
    warning: 'bg-amber-500',
    negative: 'bg-red-600',
    neutral: 'bg-neutral-400',
};

const TONE_BY_STATUS = {
    confirmed: 'positive',
    approved: 'positive',
    active: 'positive',
    paid: 'positive',
    success: 'positive',
    pending: 'warning',
    flagged: 'negative',
    cancelled: 'negative',
    rejected: 'negative',
    blocked: 'negative',
    failed: 'negative',
    completed: 'neutral',
    checked_out: 'neutral',
    refunded: 'neutral',
    suspended: 'neutral',
    draft: 'neutral',
    inactive: 'neutral',
};

const toLabel = (value) => {
    const text = String(value || '').replace(/[_-]+/g, ' ').trim().toLowerCase();
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
};

export default function StatusDot({ status, label, tone, className = '' }) {
    const key = String(status || '').toLowerCase();
    const dot = TONES[tone || TONE_BY_STATUS[key] || 'neutral'];
    return (
        <span className={`inline-flex items-center gap-2 whitespace-nowrap text-[13px] text-neutral-700 ${className}`}>
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
            {label ?? toLabel(status)}
        </span>
    );
}
