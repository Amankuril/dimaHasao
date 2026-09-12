/**
 * Partner revenue and settlement report.
 *
 * The scope of work asks the hotel panel for revenue reports and payment /
 * settlement reports. The dashboard only ever showed live counters, so a
 * partner had no way to see what a month actually earned them.
 *
 * Only bookings that were paid count: a confirmed pay-at-hotel booking that was
 * never collected would otherwise show as revenue that does not exist.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Download, Loader2, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { bookingService } from '../../../services/apiService';
import PartnerHeader from '../components/PartnerHeader';
import toast from 'react-hot-toast';

const currency = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const toInputDate = (value) => new Date(value).toISOString().slice(0, 10);

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const EMPTY = { bookings: 0, gross: 0, taxes: 0, discount: 0, commission: 0, payout: 0 };

const PartnerRevenueReport = () => {
    const navigate = useNavigate();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [range, setRange] = useState(() => {
        const to = new Date();
        const from = new Date(to.getFullYear(), to.getMonth() - 11, 1);
        return { from: toInputDate(from), to: toInputDate(to) };
    });

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const data = await bookingService.getPartnerRevenueReport(range);
            setReport(data);
        } catch (error) {
            toast.error(error?.message || 'Failed to load the revenue report');
        } finally {
            setLoading(false);
        }
    }, [range]);

    useEffect(() => {
        load();
    }, [load]);

    const totals = report?.totals || EMPTY;
    const byMonth = report?.byMonth || [];
    const byProperty = report?.byProperty || [];
    const peak = Math.max(1, ...byMonth.map((m) => m.payout || 0));

    const exportCsv = () => {
        const rows = [
            ['Month', 'Bookings', 'Gross', 'Taxes', 'Discount', 'Commission', 'Payout'],
            ...byMonth.map((m) => [
                `${MONTH_NAMES[m.month - 1]} ${m.year}`,
                m.bookings,
                m.gross,
                m.taxes,
                m.discount,
                m.commission,
                m.payout,
            ]),
        ];
        const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `revenue-${range.from}-to-${range.to}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <PartnerHeader />

            <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
                        <ArrowLeft size={18} />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-xl font-black text-gray-900">Revenue Report</h1>
                        <p className="text-xs text-gray-500">Paid bookings only</p>
                    </div>
                    <button
                        type="button"
                        onClick={exportCsv}
                        disabled={byMonth.length === 0}
                        className="flex items-center gap-2 px-3 py-2 bg-neutral-950 text-white rounded-lg text-xs font-bold disabled:opacity-50"
                    >
                        <Download size={14} /> CSV
                    </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">From</span>
                    <input
                        type="date"
                        value={range.from}
                        onChange={(event) => setRange((r) => ({ ...r, from: event.target.value }))}
                        className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-black"
                    />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">To</span>
                    <input
                        type="date"
                        value={range.to}
                        onChange={(event) => setRange((r) => ({ ...r, to: event.target.value }))}
                        className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-black"
                    />
                </div>

                {loading ? (
                    <div className="p-16 text-center text-gray-400">
                        <Loader2 size={22} className="animate-spin inline" />
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                                ['Bookings', totals.bookings, 'text-gray-900'],
                                ['Gross collected', currency(totals.gross), 'text-gray-900'],
                                ['Platform commission', currency(totals.commission), 'text-amber-700'],
                                ['Your payout', currency(totals.payout), 'text-[#0a4d2b]'],
                            ].map(([label, value, tone]) => (
                                <div key={label} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
                                    <p className={`text-xl font-black mt-1 ${tone}`}>{value}</p>
                                </div>
                            ))}
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                            <h2 className="font-bold text-gray-900 text-sm flex items-center gap-2 mb-4">
                                <TrendingUp size={16} className="text-[#0a4d2b]" /> Payout by month
                            </h2>
                            {byMonth.length === 0 ? (
                                <p className="text-xs text-gray-400 py-6 text-center">
                                    No paid bookings in this range yet.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {byMonth.map((month) => (
                                        <div key={`${month.year}-${month.month}`} className="flex items-center gap-3">
                                            <span className="w-16 shrink-0 text-[11px] font-bold text-gray-500">
                                                {MONTH_NAMES[month.month - 1]} {String(month.year).slice(-2)}
                                            </span>
                                            <div className="flex-1 h-6 bg-gray-50 rounded-md overflow-hidden">
                                                <div
                                                    className="h-full bg-[#0a4d2b] rounded-md"
                                                    style={{ width: `${Math.max(4, (month.payout / peak) * 100)}%` }}
                                                />
                                            </div>
                                            <span className="w-24 shrink-0 text-right text-xs font-bold text-gray-900">
                                                {currency(month.payout)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <h2 className="font-bold text-gray-900 text-sm px-5 py-4 border-b border-gray-100">
                                By property
                            </h2>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm min-w-[34rem]">
                                    <thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500">
                                        <tr>
                                            <th className="text-left p-4 font-semibold">Property</th>
                                            <th className="text-right p-4 font-semibold">Bookings</th>
                                            <th className="text-right p-4 font-semibold">Gross</th>
                                            <th className="text-right p-4 font-semibold">Commission</th>
                                            <th className="text-right p-4 font-semibold">Payout</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {byProperty.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="p-8 text-center text-gray-400 text-xs">
                                                    Nothing to report yet.
                                                </td>
                                            </tr>
                                        ) : (
                                            byProperty.map((row) => (
                                                <tr key={row.propertyId}>
                                                    <td className="p-4 font-semibold text-gray-900">{row.propertyName}</td>
                                                    <td className="p-4 text-right">{row.bookings}</td>
                                                    <td className="p-4 text-right">{currency(row.gross)}</td>
                                                    <td className="p-4 text-right text-amber-700">{currency(row.commission)}</td>
                                                    <td className="p-4 text-right font-bold text-[#0a4d2b]">
                                                        {currency(row.payout)}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default PartnerRevenueReport;
