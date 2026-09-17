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

const MODULES = [
  { key: 'food', label: 'Food', colour: '#f97316' },
  { key: 'taxi', label: 'Taxi', colour: '#eab308' },
  { key: 'hotel', label: 'Hotels', colour: '#0ea5e9' },
  { key: 'tours', label: 'Tours', colour: '#0a4d2b' },
  { key: 'festivals', label: 'Festivals', colour: '#8b5cf6' },
];

const COLOUR = Object.fromEntries(MODULES.map((m) => [m.key, m.colour]));

const rupees = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const field = 'px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-[#0a4d2b] focus:ring-4 focus:ring-[#0a4d2b]/10 transition';

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
          <h1 className="text-xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Every service, one date range. Settled transactions only.
          </p>
        </div>

        <button
          type="button"
          onClick={() => download('overview')}
          disabled={downloading === 'overview'}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#0a4d2b] text-white rounded-xl font-bold text-sm hover:bg-[#06381e] disabled:opacity-60"
        >
          {downloading === 'overview' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          Export CSV
        </button>
      </div>

      {/* Range */}
      <div className="flex flex-wrap items-center gap-2">
        <input type="date" className={field} value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        <span className="text-sm text-gray-400">to</span>
        <input type="date" className={field} value={to} min={from} onChange={(e) => setTo(e.target.value)} />

        {PRESETS.map((preset) => (
          <button
            key={preset.days}
            type="button"
            onClick={() => applyPreset(preset.days)}
            className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-600 hover:bg-gray-50"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 grid place-items-center"><Loader2 className="animate-spin text-gray-400" /></div>
      ) : (
        <>
          {/* Platform totals */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Gross value', value: rupees(overview?.total?.gross), tone: 'text-gray-900' },
              { label: 'Platform commission', value: rupees(overview?.total?.commission), tone: 'text-[#0a4d2b]' },
              { label: 'Taxes collected', value: rupees(overview?.total?.taxes), tone: 'text-gray-900' },
              { label: 'Owed to vendors', value: rupees(overview?.total?.vendorPayout), tone: 'text-gray-900' },
            ].map((card) => (
              <div key={card.label} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                <p className="text-xs font-semibold text-gray-500">{card.label}</p>
                <p className={`text-xl font-black mt-1 ${card.tone}`}>{card.value}</p>
              </div>
            ))}
          </div>

          {/* Trend */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold text-gray-900 text-sm">Gross value over time</h3>
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
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  <Download size={14} /> CSV
                </button>
              </div>
            </div>

            {points.length === 0 ? (
              <p className="py-12 text-center text-sm text-gray-400">
                Nothing settled in this period.
              </p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      {activeModules.map((m) => (
                        <linearGradient key={m.key} id={`fill-${m.key}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={m.colour} stopOpacity={0.35} />
                          <stop offset="95%" stopColor={m.colour} stopOpacity={0} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="bucket" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" width={64}
                      tickFormatter={(v) => (v === 0 ? '₹0' : `₹${(v / 1000).toFixed(v >= 1000 ? 0 : 1)}k`)} />
                    <Tooltip formatter={(value, name) => [rupees(value), name]} />
                    {activeModules.map((m) => (
                      <Area
                        key={m.key}
                        type="monotone"
                        dataKey={m.key}
                        name={m.label}
                        stackId="1"
                        stroke={m.colour}
                        fill={`url(#fill-${m.key})`}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Per module */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <h3 className="font-bold text-gray-900 text-sm p-4 pb-3 border-b border-gray-100">
              By service
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    {['Service', 'Settled', 'Pending', 'Gross', 'Commission', 'Taxes', 'To vendors', 'Average'].map((h, i) => (
                      <th key={h} className={`px-4 py-2.5 text-xs font-bold ${i === 0 ? 'text-left' : 'text-right'}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(overview?.rows || []).map((row) => (
                    <tr key={row.module} className="hover:bg-gray-50/60">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-2 font-semibold text-gray-800">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLOUR[row.module] }} />
                          {row.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">{row.count} {row.unit}</td>
                      <td className="px-4 py-3 text-right text-gray-400">{row.pending}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{rupees(row.gross)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-[#0a4d2b]">{rupees(row.commission)}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{rupees(row.taxes)}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{rupees(row.vendorPayout)}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{rupees(row.averageOrderValue)}</td>
                    </tr>
                  ))}
                  {overview?.total && (
                    <tr className="bg-gray-50 font-bold text-gray-900">
                      <td className="px-4 py-3">Total</td>
                      <td className="px-4 py-3 text-right">{overview.total.count}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{overview.total.pending}</td>
                      <td className="px-4 py-3 text-right">{rupees(overview.total.gross)}</td>
                      <td className="px-4 py-3 text-right text-[#0a4d2b]">{rupees(overview.total.commission)}</td>
                      <td className="px-4 py-3 text-right">{rupees(overview.total.taxes)}</td>
                      <td className="px-4 py-3 text-right">{rupees(overview.total.vendorPayout)}</td>
                      <td className="px-4 py-3" />
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top earners */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 p-4 pb-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-sm">Top earners</h3>
              <div className="flex items-center gap-2">
                <select className={`${field} text-xs`} value={topModule} onChange={(e) => setTopModule(e.target.value)}>
                  {MODULES.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => download('top', { module: topModule })}
                  disabled={downloading === 'top'}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  <Download size={14} /> CSV
                </button>
              </div>
            </div>

            {vendors.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-400">
                No settled transactions for this service in this period.
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {vendors.map((vendor, index) => (
                  <div key={vendor.id} className="px-4 py-3 flex items-center gap-3">
                    <span className="w-6 text-xs font-bold text-gray-400">{index + 1}</span>
                    <span className="flex-1 font-semibold text-gray-800 truncate">{vendor.name}</span>
                    <span className="text-xs text-gray-500">{vendor.count}</span>
                    <span className="w-28 text-right font-semibold text-gray-900">{rupees(vendor.gross)}</span>
                    <span className="w-24 text-right text-xs font-semibold text-[#0a4d2b]">
                      {rupees(vendor.commission)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Reports;
