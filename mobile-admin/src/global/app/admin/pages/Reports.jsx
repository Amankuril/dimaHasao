/* Ported from Frontend/src/modules/Global/app/admin/pages/Reports.jsx (tools/port.js first pass). */
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
import { Download, Loader2 } from 'lucide-react-native';
// PORT: recharts: rebuild the chart with react-native-gifted-charts (same data, colours and chart type)
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { toast } from '../../../../lib/notify';
import globalService from '../../../services/globalService';
import { Button, Div, H1, H3, Input, Option, P, ScrollDiv, Select, Span, Table, Tbody, Td, Th, Thead, Tr, Icon as UiIcon } from '../../../../components/web';
import { Defs, LinearGradient, Stop } from 'react-native-svg';
const MODULES = [
  {
    key: 'food',
    label: 'Food',
    colour: '#f97316',
  },
  {
    key: 'taxi',
    label: 'Taxi',
    colour: '#eab308',
  },
  {
    key: 'hotel',
    label: 'Hotels',
    colour: '#0ea5e9',
  },
  {
    key: 'tours',
    label: 'Tours',
    colour: '#0a4d2b',
  },
  {
    key: 'festivals',
    label: 'Festivals',
    colour: '#8b5cf6',
  },
];
const COLOUR = Object.fromEntries(MODULES.map((m) => [m.key, m.colour]));
const rupees = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const field =
  'px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-[#0a4d2b] transition';

/** yyyy-mm-dd, `daysAgo` days back — the format a date input wants. */
const isoDaysAgo = (daysAgo) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
};
const PRESETS = [
  {
    label: 'Last 7 days',
    days: 7,
  },
  {
    label: 'Last 30 days',
    days: 30,
  },
  {
    label: 'Last 90 days',
    days: 90,
  },
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
  const range = useMemo(
    () => ({
      from,
      to,
    }),
    [from, to],
  );
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [summary, trend] = await Promise.all([
        globalService.getReportOverview(range),
        globalService.getReportTimeseries({
          ...range,
          interval,
        }),
      ]);
      setOverview(summary);
      setPoints(trend.points || []);
    } catch (error) {
      toast.error(error.message || 'Could not build this report');
    } finally {
      setLoading(false);
    }
  }, [range, interval]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    globalService
      .getReportTopVendors({
        ...range,
        module: topModule,
      })
      .then((data) => setVendors(data.vendors || []))
      .catch(() => setVendors([]));
  }, [range, topModule]);
  const download = async (report, params = {}) => {
    try {
      setDownloading(report);
      await globalService.downloadReport(report, {
        ...range,
        ...params,
      });
    } catch (error) {
      toast.error(error.message || 'Could not export that report');
    } finally {
      setDownloading('');
    }
  };
  const applyPreset = (days) => {
    setFrom(isoDaysAgo(days));
    setTo(isoDaysAgo(0));
  };

  // Only draw a band for a module that actually traded in this period —
  // five flat lines at zero make the chart harder to read, not more complete.
  const activeModules = useMemo(() => MODULES.filter((m) => points.some((p) => (p[m.key] || 0) > 0)), [points]);
  // PORT: overflow-x-auto: this row scrolls sideways on the web -> use <HScroll> (tables: <Table cols>)
  // PORT: <Table>: set cols={[...]} widths (px) for each column; the table scrolls sideways like the web's overflow-x-auto
  // PORT: inline style object: check every property is valid in React Native (no backgroundImage, cursor, gridTemplate..., strings like "1rem")
  return (
    <ScrollDiv className="p-4 pb-20 space-y-5">
      <Div className="flex flex-wrap items-start justify-between gap-4">
        <Div>
          <H1 className="text-xl font-bold text-gray-900">Reports</H1>
          <P className="text-sm text-gray-500 mt-0.5">Every service, one date range. Settled transactions only.</P>
        </Div>

        <Button
          type="button"
          onClick={() => download('overview')}
          disabled={downloading === 'overview'}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#0a4d2b] text-white rounded-xl font-bold text-sm hover:bg-[#06381e] disabled:opacity-60"
        >
          {downloading === 'overview' ? <UiIcon as={Loader2} size={16} className="animate-spin" /> : <UiIcon as={Download} size={16} />}
          Export CSV
        </Button>
      </Div>

      {/* Range */}
      <Div className="flex flex-wrap items-center gap-2">
        <Input type="date" className={field} value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        <Span className="text-sm text-gray-400">to</Span>
        <Input type="date" className={field} value={to} min={from} onChange={(e) => setTo(e.target.value)} />

        {PRESETS.map((preset) => (
          <Button
            key={preset.days}
            type="button"
            onClick={() => applyPreset(preset.days)}
            className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-600 hover:bg-gray-50"
          >
            {preset.label}
          </Button>
        ))}
      </Div>

      {loading ? (
        <Div className="py-20 grid place-items-center">
          <UiIcon as={Loader2} className="animate-spin text-gray-400" />
        </Div>
      ) : (
        <>
          {/* Platform totals */}
          <Div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                label: 'Gross value',
                value: rupees(overview?.total?.gross),
                tone: 'text-gray-900',
              },
              {
                label: 'Platform commission',
                value: rupees(overview?.total?.commission),
                tone: 'text-[#0a4d2b]',
              },
              {
                label: 'Taxes collected',
                value: rupees(overview?.total?.taxes),
                tone: 'text-gray-900',
              },
              {
                label: 'Owed to vendors',
                value: rupees(overview?.total?.vendorPayout),
                tone: 'text-gray-900',
              },
            ].map((card) => (
              <Div key={card.label} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                <P className="text-xs font-semibold text-gray-500">{card.label}</P>
                <P className={`text-xl font-black mt-1 ${card.tone}`}>{card.value}</P>
              </Div>
            ))}
          </Div>

          {/* Trend */}
          <Div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
            <Div className="flex flex-wrap items-center justify-between gap-2">
              <H3 className="font-bold text-gray-900 text-sm">Gross value over time</H3>
              <Div className="flex items-center gap-2">
                <Select className={`${field} text-xs`} value={interval} onChange={(e) => setInterval(e.target.value)}>
                  <Option value="day">By day</Option>
                  <Option value="week">By week</Option>
                  <Option value="month">By month</Option>
                </Select>
                <Button
                  type="button"
                  onClick={() =>
                    download('timeseries', {
                      interval,
                    })
                  }
                  disabled={downloading === 'timeseries'}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  <UiIcon as={Download} size={14} /> CSV
                </Button>
              </Div>
            </Div>

            {points.length === 0 ? (
              <P className="py-12 text-center text-sm text-gray-400">Nothing settled in this period.</P>
            ) : (
              <Div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={points}
                    margin={{
                      top: 8,
                      right: 8,
                      left: 0,
                      bottom: 0,
                    }}
                  >
                    <Defs>
                      {activeModules.map((m) => (
                        <LinearGradient key={m.key} id={`fill-${m.key}`} x1="0" y1="0" x2="0" y2="1">
                          <Stop offset="5%" stopColor={m.colour} stopOpacity={0.35} />
                          <Stop offset="95%" stopColor={m.colour} stopOpacity={0} />
                        </LinearGradient>
                      ))}
                    </Defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="bucket"
                      tick={{
                        fontSize: 11,
                      }}
                      stroke="#94a3b8"
                    />
                    <YAxis
                      tick={{
                        fontSize: 11,
                      }}
                      stroke="#94a3b8"
                      width={64}
                      tickFormatter={(v) => (v === 0 ? '₹0' : `₹${(v / 1000).toFixed(v >= 1000 ? 0 : 1)}k`)}
                    />
                    <Tooltip formatter={(value, name) => [rupees(value), name]} />
                    {activeModules.map((m) => (
                      <Area key={m.key} type="monotone" dataKey={m.key} name={m.label} stackId="1" stroke={m.colour} fill={`url(#fill-${m.key})`} />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </Div>
            )}
          </Div>

          {/* Per module */}
          <Div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <H3 className="font-bold text-gray-900 text-sm p-4 pb-3 border-b border-gray-100">By service</H3>
            <Div className="overflow-x-auto">
              <Table className="w-full text-sm min-w-[720px]">
                <Thead className="bg-gray-50 text-gray-500">
                  <Tr>
                    {['Service', 'Settled', 'Pending', 'Gross', 'Commission', 'Taxes', 'To vendors', 'Average'].map((h, i) => (
                      <Th key={h} className={`px-4 py-2.5 text-xs font-bold ${i === 0 ? 'text-left' : 'text-right'}`}>
                        {h}
                      </Th>
                    ))}
                  </Tr>
                </Thead>
                <Tbody className="divide-y divide-gray-100">
                  {(overview?.rows || []).map((row) => (
                    <Tr key={row.module} className="hover:bg-gray-50/60">
                      <Td className="px-4 py-3">
                        <Span className="inline-flex items-center gap-2 font-semibold text-gray-800">
                          <Span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{
                              background: COLOUR[row.module],
                            }}
                          />
                          {row.label}
                        </Span>
                      </Td>
                      <Td className="px-4 py-3 text-right text-gray-700">
                        {row.count} {row.unit}
                      </Td>
                      <Td className="px-4 py-3 text-right text-gray-400">{row.pending}</Td>
                      <Td className="px-4 py-3 text-right font-semibold text-gray-900">{rupees(row.gross)}</Td>
                      <Td className="px-4 py-3 text-right font-semibold text-[#0a4d2b]">{rupees(row.commission)}</Td>
                      <Td className="px-4 py-3 text-right text-gray-600">{rupees(row.taxes)}</Td>
                      <Td className="px-4 py-3 text-right text-gray-600">{rupees(row.vendorPayout)}</Td>
                      <Td className="px-4 py-3 text-right text-gray-600">{rupees(row.averageOrderValue)}</Td>
                    </Tr>
                  ))}
                  {overview?.total && (
                    <Tr className="bg-gray-50 font-bold text-gray-900">
                      <Td className="px-4 py-3">Total</Td>
                      <Td className="px-4 py-3 text-right">{overview.total.count}</Td>
                      <Td className="px-4 py-3 text-right text-gray-500">{overview.total.pending}</Td>
                      <Td className="px-4 py-3 text-right">{rupees(overview.total.gross)}</Td>
                      <Td className="px-4 py-3 text-right text-[#0a4d2b]">{rupees(overview.total.commission)}</Td>
                      <Td className="px-4 py-3 text-right">{rupees(overview.total.taxes)}</Td>
                      <Td className="px-4 py-3 text-right">{rupees(overview.total.vendorPayout)}</Td>
                      <Td className="px-4 py-3" />
                    </Tr>
                  )}
                </Tbody>
              </Table>
            </Div>
          </Div>

          {/* Top earners */}
          <Div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <Div className="flex flex-wrap items-center justify-between gap-2 p-4 pb-3 border-b border-gray-100">
              <H3 className="font-bold text-gray-900 text-sm">Top earners</H3>
              <Div className="flex items-center gap-2">
                <Select className={`${field} text-xs`} value={topModule} onChange={(e) => setTopModule(e.target.value)}>
                  {MODULES.map((m) => (
                    <Option key={m.key} value={m.key}>
                      {m.label}
                    </Option>
                  ))}
                </Select>
                <Button
                  type="button"
                  onClick={() =>
                    download('top', {
                      module: topModule,
                    })
                  }
                  disabled={downloading === 'top'}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  <UiIcon as={Download} size={14} /> CSV
                </Button>
              </Div>
            </Div>

            {vendors.length === 0 ? (
              <P className="py-10 text-center text-sm text-gray-400">No settled transactions for this service in this period.</P>
            ) : (
              <Div className="divide-y divide-gray-100">
                {vendors.map((vendor, index) => (
                  <Div key={vendor.id} className="px-4 py-3 flex items-center gap-3">
                    <Span className="w-6 text-xs font-bold text-gray-400">{index + 1}</Span>
                    <Span className="flex-1 font-semibold text-gray-800 truncate">{vendor.name}</Span>
                    <Span className="text-xs text-gray-500">{vendor.count}</Span>
                    <Span className="w-28 text-right font-semibold text-gray-900">{rupees(vendor.gross)}</Span>
                    <Span className="w-24 text-right text-xs font-semibold text-[#0a4d2b]">{rupees(vendor.commission)}</Span>
                  </Div>
                ))}
              </Div>
            )}
          </Div>
        </>
      )}
    </ScrollDiv>
  );
};
export default Reports;
