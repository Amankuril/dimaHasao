/**
 * Platform reports.
 *
 * Food had four report endpoints and taxi six downloads; hotel and tours had
 * none, and nothing anywhere compared them. This is the cross-module view — one
 * date range, every service, and a CSV of whatever is on screen.
 *
 * Every figure is the server's. Nothing here recomputes a price: these totals
 * are sums of what each transaction stored when it happened, so the report can
 * never drift from what the customer was actually charged.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import toast from 'react-hot-toast';

import globalService from '../../../services/globalService';
import { MODULE_COLOURS } from '../moduleColours';

const MODULES = [
  { key: 'food', label: 'Food', colour: MODULE_COLOURS.food },
  { key: 'taxi', label: 'Taxi', colour: MODULE_COLOURS.taxi },
  { key: 'hotel', label: 'Hotels', colour: MODULE_COLOURS.hotel },
  { key: 'tours', label: 'Tours', colour: MODULE_COLOURS.tours },
  { key: 'festivals', label: 'Festivals', colour: MODULE_COLOURS.festivals },
];

const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((sum, p) => sum + (Number(p.value) || 0), 0);
  return (
    <div className="min-w-44 rounded-lg border border-neutral-900/[0.08] bg-white px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
      <p className="mb-1 text-xs text-neutral-500">{label}</p>
      {[...payload].reverse().map((p) => (
        <p key={p.dataKey} className="flex items-center justify-between gap-4 text-[13px] text-neutral-700">
          <span className="inline-flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="font-mono tabular-nums text-neutral-900">{rupees(p.value)}</span>
        </p>
      ))}
      {payload.length > 1 && (
        <p className="mt-1 flex justify-between border-t border-neutral-900/[0.06] pt-1 text-[13px] text-neutral-500">
          Total <span className="font-mono tabular-nums text-neutral-900">{rupees(total)}</span>
        </p>
      )}
    </div>
  );
};

const COLOUR = Object.fromEntries(MODULES.map((m) => [m.key, m.colour]));

const rupees = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const field = 'px-3 py-2 bg-white border border-neutral-200 rounded-lg text-sm outline-none focus:border-[#0a4d2b] focus:ring-2 focus:ring-[#0a4d2b]/20 transition-colors';

/** yyyy-mm-dd, `daysAgo` days back — the format a date input wants. */
const isoDaysAgo = (daysAgo) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
};

const PRESETS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
];

const Reports = () => {
  const [from, setFrom] = useState(isoDaysAgo(30));
  const [to, setTo] = useState(isoDaysAgo(0));
  const [interval, setInterval] = useState('day');
  const [topModule, setTopModule] = useState('food');

  const [overview, setOverview] = useState(null);
  const [points, setPoints] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState('');

  const range = useMemo(() => ({ from, to }), [from, to]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [summary, trend] = await Promise.all([
        globalService.getReportOverview(range),
        globalService.getReportTimeseries({ ...range, interval }),
      ]);
      setOverview(summary);
      setPoints(trend.points || []);
    } catch (error) {
      toast.error(error.message || 'Could not build this report');
    } finally {
      setLoading(false);
    }
  }, [range, interval]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    globalService.getReportTopVendors({ ...range, module: topModule })
      .then((data) => setVendors(data.vendors || []))
      .catch(() => setVendors([]));
  }, [range, topModule]);

  const download = async (report, params = {}) => {
    try {
      setDownloading(report);
      await globalService.downloadReport(report, { ...range, ...params });
    } catch (error) {
      toast.error(error.message || 'Could not export that report');
    } finally {
      setDownloading('');
    }
  };

  const applyPreset = (days) => { setFrom(isoDaysAgo(days)); setTo(isoDaysAgo(0)); };

  // Only draw a band for a module that actually traded in this period —
  // five flat lines at zero make the chart harder to read, not more complete.
  const activeModules = useMemo(
    () => MODULES.filter((m) => points.some((p) => (p[m.key] || 0) > 0)),
    [points],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium text-neutral-900">Reports</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Every service over one date range, settled transactions only
          </p>
        </div>

        <button
          type="button"
          onClick={() => download('overview')}
          disabled={downloading === 'overview'}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#0a4d2b] text-white rounded-xl font-medium text-sm hover:bg-[#06381e] disabled:opacity-60"
        >
          {downloading === 'overview' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          Export CSV
        </button>
      </div>

      {/* Range */}
      <div className="flex flex-wrap items-center gap-2">
        <input type="date" className={field} value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        <span className="text-sm text-neutral-500">to</span>
        <input type="date" className={field} value={to} min={from} onChange={(e) => setTo(e.target.value)} />

        {PRESETS.map((preset) => (
          <button
            key={preset.days}
            type="button"
            onClick={() => applyPreset(preset.days)}
            className="px-3 py-2 rounded-xl border border-neutral-200 bg-white text-xs font-medium text-neutral-600 hover:bg-neutral-50"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 grid place-items-center"><Loader2 className="animate-spin text-neutral-500" /></div>
      ) : (
        <>
          {/* Platform totals */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Gross value', value: rupees(overview?.total?.gross), tone: 'text-neutral-900' },
              { label: 'Platform commission', value: rupees(overview?.total?.commission), tone: 'text-[#0a4d2b]' },
              { label: 'Taxes collected', value: rupees(overview?.total?.taxes), tone: 'text-neutral-900' },
              { label: 'Owed to vendors', value: rupees(overview?.total?.vendorPayout), tone: 'text-neutral-900' },
            ].map((card) => (
              <div key={card.label} className="bg-white p-4 rounded-xl border border-neutral-900/[0.08]">
                <p className="text-xs text-neutral-500">{card.label}</p>
                <p className={`mt-2 font-mono text-[28px] font-medium leading-9 tabular-nums ${card.tone}`}>{card.value}</p>
              </div>
            ))}
          </div>

          {/* Trend */}
          <div className="bg-white p-4 rounded-xl border border-neutral-900/[0.08] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-medium text-neutral-900 text-sm">Gross value over time</h3>
              <div className="flex items-center gap-2">
                <select className={`${field} text-xs`} value={interval} onChange={(e) => setInterval(e.target.value)}>
                  <option value="day">By day</option>
                  <option value="week">By week</option>
                  <option value="month">By month</option>
                </select>
                <button
                  type="button"
                  onClick={() => download('timeseries', { interval })}
                  disabled={downloading === 'timeseries'}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-200 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
                >
                  <Download size={14} /> CSV
                </button>
              </div>
            </div>

            {activeModules.length > 0 && (
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {activeModules.map((m) => (
                  <span key={m.key} className="inline-flex items-center gap-2 text-xs text-neutral-600">
                    <span className="h-2 w-2 rounded-sm" style={{ background: m.colour }} />
                    {m.label}
                  </span>
                ))}
              </div>
            )}

            {points.length === 0 ? (
              <p className="py-12 text-center text-sm text-neutral-500">
                Nothing settled in this period
              </p>
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="rgba(23,23,23,0.06)" />
                    <XAxis dataKey="bucket" axisLine={false} tickLine={false} dy={8} tick={{ fontSize: 12, fill: '#737373', fontFamily: MONO }} />
                    <YAxis axisLine={false} tickLine={false} width={64} tick={{ fontSize: 12, fill: '#737373', fontFamily: MONO }}
                      tickFormatter={(v) => (v === 0 ? '₹0' : `₹${(v / 1000).toFixed(v >= 1000 ? 0 : 1)}k`)} />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(23,23,23,0.12)' }} />
                    {activeModules.map((m) => (
                      <Area
                        key={m.key}
                        type="monotone"
                        dataKey={m.key}
                        name={m.label}
                        stackId="1"
                        stroke={m.colour}
                        strokeWidth={1.5}
                        fill={m.colour}
                        fillOpacity={0.14}
                        isAnimationActive={false}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Per module */}
          <div className="bg-white rounded-xl border border-neutral-900/[0.08] overflow-hidden">
            <h3 className="font-medium text-neutral-900 text-sm p-4 pb-3 border-b border-neutral-100">
              By service
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead className="bg-neutral-50 text-neutral-500">
                  <tr>
                    {['Service', 'Settled', 'Pending', 'Gross', 'Commission', 'Taxes', 'To vendors', 'Average'].map((h, i) => (
                      <th key={h} className={`px-4 py-2.5 text-xs font-medium ${i === 0 ? 'text-left' : 'text-right'}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {(overview?.rows || []).map((row) => (
                    <tr key={row.module} className="hover:bg-neutral-50">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-2 font-medium text-neutral-800">
                          <span className="h-2 w-2 rounded-sm" style={{ background: COLOUR[row.module] }} />
                          {row.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-neutral-700">{row.count} {row.unit}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-neutral-500">{row.pending}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums font-medium text-neutral-900">{rupees(row.gross)}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums font-medium text-[#0a4d2b]">{rupees(row.commission)}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-neutral-600">{rupees(row.taxes)}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-neutral-600">{rupees(row.vendorPayout)}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-neutral-600">{rupees(row.averageOrderValue)}</td>
                    </tr>
                  ))}
                  {overview?.total && (
                    <tr className="bg-neutral-50 font-medium text-neutral-900">
                      <td className="px-4 py-3">Total</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">{overview.total.count}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-neutral-500">{overview.total.pending}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">{rupees(overview.total.gross)}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-[#0a4d2b]">{rupees(overview.total.commission)}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">{rupees(overview.total.taxes)}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">{rupees(overview.total.vendorPayout)}</td>
                      <td className="px-4 py-3" />
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top earners */}
          <div className="bg-white rounded-xl border border-neutral-900/[0.08] overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 p-4 pb-3 border-b border-neutral-100">
              <h3 className="font-medium text-neutral-900 text-sm">Top earners</h3>
              <div className="flex items-center gap-2">
                <select className={`${field} text-xs`} value={topModule} onChange={(e) => setTopModule(e.target.value)}>
                  {MODULES.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => download('top', { module: topModule })}
                  disabled={downloading === 'top'}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-200 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
                >
                  <Download size={14} /> CSV
                </button>
              </div>
            </div>

            {vendors.length === 0 ? (
              <p className="py-10 text-center text-sm text-neutral-500">
                No settled transactions for this service in this period
              </p>
            ) : (
              <div className="divide-y divide-neutral-100">
                {vendors.map((vendor, index) => {
                  const top = Math.max(...vendors.map((v) => Number(v.gross) || 0), 1);
                  return (
                    <div key={vendor.id} className="flex items-center gap-4 px-5 py-3">
                      <span className="w-5 font-mono text-xs text-neutral-500 tabular-nums">{index + 1}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="truncate text-sm text-neutral-900">{vendor.name}</span>
                          <span className="font-mono text-sm text-neutral-900 tabular-nums">{rupees(vendor.gross)}</span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-3">
                          <div className="h-1 flex-1 overflow-hidden rounded-full bg-neutral-100">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${((Number(vendor.gross) || 0) / top) * 100}%`, background: COLOUR[topModule] }}
                            />
                          </div>
                          <span className="w-40 text-right text-xs text-neutral-500 tabular-nums">
                            {vendor.count} {(overview?.rows || []).find((r) => r.module === topModule)?.unit || 'sales'} · <span className="font-mono text-[#0a4d2b]">{rupees(vendor.commission)}</span> commission
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Reports;
