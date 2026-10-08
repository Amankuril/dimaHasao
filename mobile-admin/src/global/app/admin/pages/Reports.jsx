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
import { BarChart3, Download, Loader2 } from 'lucide-react-native';
import { LineChart } from 'react-native-gifted-charts';
import { toast } from '../../../../lib/notify';
import globalService from '../../../services/globalService';
import {
  A,
  AdminPage,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  Card,
  Cell,
  DataTable,
  EmptyState,
  INPUT,
  LoadingState,
  PageHeader,
  Row,
  SectionTitle,
  StatCard,
  StatGrid,
  TBody,
  THead,
  Toolbar,
  AXIS_TEXT,
  useChartWidth,
  chartSpacing,
} from '../../../../admin/ui';
import { Button, Div, Input, Option, P, Select, Span, Icon as UiIcon } from '../../../../components/web';
const MODULES = [
  {
    key: 'food',
    label: 'Food',
    colour: '#BB4D00',
  },
  {
    key: 'taxi',
    label: 'Taxi',
    colour: '#A16207',
  },
  {
    key: 'hotel',
    label: 'Hotels',
    colour: '#0284C7',
  },
  {
    key: 'tours',
    label: 'Tours',
    colour: '#008236',
  },
  {
    key: 'festivals',
    label: 'Festivals',
    colour: '#7C3AED',
  },
];
const COLOUR = Object.fromEntries(MODULES.map((m) => [m.key, m.colour]));
const rupees = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const COLS = [140, 120, 90, 120, 120, 110, 120, 110];

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
/** ₹ axis ticks, as the web's YAxis tickFormatter writes them. */
const axisRupees = (v) => {
  const n = Number(v) || 0;
  return n === 0 ? '₹0' : `₹${(n / 1000).toFixed(n >= 1000 ? 0 : 1)}k`;
};
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

  /*
   * The web stacks the areas (stackId="1"). Each series here is the running
   * sum of the modules below it, drawn back to front, which is what a stacked
   * area chart is. Every point carries the raw per-module values for the
   * tooltip.
   */
  const chartWidth = useChartWidth(64, 1200);
  const labelEvery = Math.max(1, Math.ceil(points.length / 6));
  const stackedSets = useMemo(() => {
    const sets = activeModules.map((m, k) => ({
      color: m.colour,
      startFillColor: m.colour,
      endFillColor: m.colour,
      startOpacity: 0.35,
      endOpacity: 0,
      thickness: 1.5,
      data: points.map((p, i) => ({
        value: activeModules.slice(0, k + 1).reduce((sum, mm) => sum + (Number(p[mm.key]) || 0), 0),
        label: i % labelEvery === 0 ? String(p.bucket) : '',
        bucket: p.bucket,
        point: p,
      })),
    }));
    return sets.reverse();
  }, [activeModules, points, labelEvery]);
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        title="Reports"
        subtitle="Every service, one date range. Settled transactions only."
        icon={BarChart3}
        actions={
          <Button type="button" onClick={() => download('overview')} disabled={downloading === 'overview'} className={BTN_PRIMARY}>
            {downloading === 'overview' ? <UiIcon as={Loader2} size={16} className="text-white" /> : <UiIcon as={Download} size={16} className="text-white" />}
            <Span className={BTN_TEXT_PRIMARY}>Export CSV</Span>
          </Button>
        }
      />

      {/* Range */}
      <Card className="mb-4">
        <SectionTitle>Date range</SectionTitle>
        <Toolbar className="mb-0">
          <Input type="date" className={`${INPUT} flex-1`} style={{ minWidth: 130 }} value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          <Span className="text-sm text-slate-500">to</Span>
          <Input type="date" className={`${INPUT} flex-1`} style={{ minWidth: 130 }} value={to} min={from} onChange={(e) => setTo(e.target.value)} />

          {PRESETS.map((preset) => (
            <Button key={preset.days} type="button" onClick={() => applyPreset(preset.days)} className={BTN_SECONDARY}>
              <Span className={BTN_TEXT_SECONDARY}>{preset.label}</Span>
            </Button>
          ))}
        </Toolbar>
      </Card>

      {loading ? (
        <LoadingState label="Building the report…" />
      ) : (
        <>
          {/* Platform totals */}
          <StatGrid className="mb-4">
            <StatCard label="Gross value" value={rupees(overview?.total?.gross)} />
            <StatCard label="Platform commission" value={rupees(overview?.total?.commission)} tone="success" />
            <StatCard label="Taxes collected" value={rupees(overview?.total?.taxes)} />
            <StatCard label="Owed to vendors" value={rupees(overview?.total?.vendorPayout)} tone="warning" />
          </StatGrid>

          {/* Trend */}
          <Card className="mb-4">
            <SectionTitle
              action={
                <Button
                  type="button"
                  onClick={() =>
                    download('timeseries', {
                      interval,
                    })
                  }
                  disabled={downloading === 'timeseries'}
                  className={BTN_SECONDARY}
                >
                  <UiIcon as={Download} size={14} className="text-slate-600" />
                  <Span className={BTN_TEXT_SECONDARY}>CSV</Span>
                </Button>
              }
            >
              Gross value over time
            </SectionTitle>
            <Toolbar>
              <Select className={`${INPUT} flex-1`} style={{ minWidth: 140 }} value={interval} onChange={(e) => setInterval(e.target.value)}>
                <Option value="day">By day</Option>
                <Option value="week">By week</Option>
                <Option value="month">By month</Option>
              </Select>
            </Toolbar>

            {points.length === 0 ? (
              <P className="py-10 text-center text-sm text-slate-500">Nothing settled in this period.</P>
            ) : (
              <Div>
                <LineChart
                  areaChart
                  curved
                  dataSet={stackedSets}
                  width={chartWidth}
                  height={220}
                  spacing={chartSpacing(chartWidth, points.length, 8)}
                  initialSpacing={8}
                  endSpacing={8}
                  hideDataPoints
                  rulesType="dashed"
                  rulesColor={A.border}
                  xAxisColor={A.borderStrong}
                  yAxisColor={A.borderStrong}
                  noOfSections={4}
                  yAxisLabelWidth={64}
                  formatYLabel={axisRupees}
                  xAxisLabelTextStyle={{ ...AXIS_TEXT, width: 70 }}
                  yAxisTextStyle={AXIS_TEXT}
                  pointerConfig={{
                    pointerStripColor: A.borderStrong,
                    pointerColor: A.text,
                    radius: 4,
                    autoAdjustPointerLabelPosition: true,
                    pointerLabelWidth: 150,
                    pointerLabelHeight: 30 + activeModules.length * 18,
                    pointerLabelComponent: (items) => {
                      const point = items?.[0]?.point || {};
                      return (
                        <Div className="bg-white rounded-lg px-3 py-2 border border-slate-200">
                          <P className="text-xs text-slate-500 mb-0.5">{items?.[0]?.bucket}</P>
                          {activeModules.map((m) => (
                            <P key={m.key} className="text-xs" style={{ color: m.colour }}>
                              {m.label} : {rupees(point[m.key])}
                            </P>
                          ))}
                        </Div>
                      );
                    },
                  }}
                />
              </Div>
            )}
          </Card>

          {/* Per module */}
          <Card className="mb-4" padded={false}>
            <Div className="p-4 pb-0">
              <SectionTitle>By service</SectionTitle>
            </Div>
            {(overview?.rows || []).length === 0 ? (
              <Div className="p-4 pt-0">
                <EmptyState title="Nothing settled in this period" message="Pick a wider date range to see per-service totals." />
              </Div>
            ) : (
              <DataTable cols={COLS} className="rounded-none border-0">
                <THead cols={COLS} labels={['Service', 'Settled', 'Pending', 'Gross', 'Commission', 'Taxes', 'To vendors', 'Average']} />
                <TBody>
                  {(overview?.rows || []).map((row) => (
                    <Row key={row.module}>
                      <Cell width={COLS[0]}>
                        <Div className="flex-row items-center gap-2">
                          <Div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{
                              backgroundColor: COLOUR[row.module],
                            }}
                          />
                          <Span className="text-sm font-semibold text-slate-800 flex-1" numberOfLines={1}>
                            {row.label}
                          </Span>
                        </Div>
                      </Cell>
                      <Cell width={COLS[1]} align="right">{`${row.count} ${row.unit}`}</Cell>
                      <Cell width={COLS[2]} align="right">
                        <P className="text-sm text-slate-500">{row.pending}</P>
                      </Cell>
                      <Cell width={COLS[3]} align="right">
                        <P className="text-sm font-semibold text-slate-900">{rupees(row.gross)}</P>
                      </Cell>
                      <Cell width={COLS[4]} align="right">
                        <P className="text-sm font-semibold text-green-700">{rupees(row.commission)}</P>
                      </Cell>
                      <Cell width={COLS[5]} align="right">{rupees(row.taxes)}</Cell>
                      <Cell width={COLS[6]} align="right">{rupees(row.vendorPayout)}</Cell>
                      <Cell width={COLS[7]} align="right">{rupees(row.averageOrderValue)}</Cell>
                    </Row>
                  ))}
                  {overview?.total && (
                    <Row last className="bg-slate-50">
                      <Cell width={COLS[0]}>
                        <P className="text-sm font-semibold text-slate-900">Total</P>
                      </Cell>
                      <Cell width={COLS[1]} align="right">
                        <P className="text-sm font-semibold text-slate-900">{overview.total.count}</P>
                      </Cell>
                      <Cell width={COLS[2]} align="right">
                        <P className="text-sm text-slate-500">{overview.total.pending}</P>
                      </Cell>
                      <Cell width={COLS[3]} align="right">
                        <P className="text-sm font-semibold text-slate-900">{rupees(overview.total.gross)}</P>
                      </Cell>
                      <Cell width={COLS[4]} align="right">
                        <P className="text-sm font-semibold text-green-700">{rupees(overview.total.commission)}</P>
                      </Cell>
                      <Cell width={COLS[5]} align="right">
                        <P className="text-sm font-semibold text-slate-900">{rupees(overview.total.taxes)}</P>
                      </Cell>
                      <Cell width={COLS[6]} align="right">
                        <P className="text-sm font-semibold text-slate-900">{rupees(overview.total.vendorPayout)}</P>
                      </Cell>
                      <Cell width={COLS[7]} align="right">
                        <P className="text-sm text-slate-400">—</P>
                      </Cell>
                    </Row>
                  )}
                </TBody>
              </DataTable>
            )}
          </Card>

          {/* Top earners */}
          <Card className="mb-4">
            <SectionTitle
              action={
                <Button
                  type="button"
                  onClick={() =>
                    download('top', {
                      module: topModule,
                    })
                  }
                  disabled={downloading === 'top'}
                  className={BTN_SECONDARY}
                >
                  <UiIcon as={Download} size={14} className="text-slate-600" />
                  <Span className={BTN_TEXT_SECONDARY}>CSV</Span>
                </Button>
              }
            >
              Top earners
            </SectionTitle>
            <Toolbar>
              <Select className={`${INPUT} flex-1`} style={{ minWidth: 140 }} value={topModule} onChange={(e) => setTopModule(e.target.value)}>
                {MODULES.map((m) => (
                  <Option key={m.key} value={m.key}>
                    {m.label}
                  </Option>
                ))}
              </Select>
            </Toolbar>

            {vendors.length === 0 ? (
              <P className="py-8 text-center text-sm text-slate-500">No settled transactions for this service in this period.</P>
            ) : (
              <Div>
                {vendors.map((vendor, index, all) => (
                  <Div
                    key={vendor.id}
                    className={`flex-row items-center gap-3 py-3 ${index === all.length - 1 ? '' : 'border-b border-slate-100'}`}
                  >
                    <Span className="w-6 text-xs font-semibold text-slate-400">{index + 1}</Span>
                    <Span className="flex-1 text-sm font-semibold text-slate-800" numberOfLines={1}>
                      {vendor.name}
                    </Span>
                    <Span className="text-xs text-slate-500">{vendor.count}</Span>
                    <Span className="w-24 text-right text-sm font-semibold text-slate-900" numberOfLines={1}>
                      {rupees(vendor.gross)}
                    </Span>
                    <Span className="w-20 text-right text-xs font-semibold text-green-700" numberOfLines={1}>
                      {rupees(vendor.commission)}
                    </Span>
                  </Div>
                ))}
              </Div>
            )}
          </Card>
        </>
      )}
    </AdminPage>
  );
};
export default Reports;
