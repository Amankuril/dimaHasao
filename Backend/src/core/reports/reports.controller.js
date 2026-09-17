/**
 * Platform reports — the cross-module view no single module can produce.
 */
import {
  overview,
  timeseries,
  topVendors,
  moduleTotals,
  REPORT_MODULES,
} from './reports.service.js';

/** `?modules=food,tours` → ['food','tours']; anything unknown is dropped. */
const readModules = (query) =>
  String(query.modules || '')
    .split(',')
    .map((m) => m.trim().toLowerCase())
    .filter((m) => REPORT_MODULES.includes(m));

const readRange = (query) => ({ from: query.from || undefined, to: query.to || undefined });

/** @route GET /v1/admin/reports/overview */
export const getOverview = async (req, res) => {
  try {
    const report = await overview({ ...readRange(req.query), modules: readModules(req.query) });
    res.json({ success: true, ...report, range: readRange(req.query) });
  } catch (error) {
    console.error('Report overview error:', error);
    res.status(500).json({ success: false, message: 'Could not build this report' });
  }
};

/** @route GET /v1/admin/reports/timeseries */
export const getTimeseries = async (req, res) => {
  try {
    const interval = ['day', 'week', 'month'].includes(req.query.interval) ? req.query.interval : 'day';
    const points = await timeseries({
      ...readRange(req.query),
      interval,
      modules: readModules(req.query),
    });
    res.json({ success: true, interval, points });
  } catch (error) {
    console.error('Report timeseries error:', error);
    res.status(500).json({ success: false, message: 'Could not build this report' });
  }
};

/** @route GET /v1/admin/reports/top */
export const getTopVendors = async (req, res) => {
  try {
    const module = String(req.query.module || '').toLowerCase();
    if (!REPORT_MODULES.includes(module)) {
      return res.status(400).json({ success: false, message: 'Pick a module' });
    }
    const vendors = await topVendors(module, { ...readRange(req.query), limit: req.query.limit });
    res.json({ success: true, module, vendors });
  } catch (error) {
    console.error('Report top vendors error:', error);
    res.status(500).json({ success: false, message: 'Could not build this report' });
  }
};

/** @route GET /v1/admin/reports/:module */
export const getModuleReport = async (req, res) => {
  try {
    const module = String(req.params.module || '').toLowerCase();
    if (!REPORT_MODULES.includes(module)) {
      return res.status(404).json({ success: false, message: 'No such module' });
    }
    const [totals, vendors, points] = await Promise.all([
      moduleTotals(module, readRange(req.query)),
      topVendors(module, { ...readRange(req.query), limit: 10 }),
      timeseries({ ...readRange(req.query), modules: [module] }),
    ]);
    res.json({ success: true, totals, vendors, points });
  } catch (error) {
    console.error('Module report error:', error);
    res.status(500).json({ success: false, message: 'Could not build this report' });
  }
};

/** A CSV cell: quoted, with embedded quotes doubled, so commas never split a row. */
const csvCell = (value) => {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

const csvOf = (headers, rows) =>
  [headers.map(csvCell).join(','), ...rows.map((row) => row.map(csvCell).join(','))].join('\n');

/**
 * @route GET /v1/admin/reports/export/:report
 * Downloadable CSV of whichever report was asked for.
 */
export const exportReport = async (req, res) => {
  try {
    const range = readRange(req.query);
    const stamp = `${range.from || 'start'}_${range.to || 'today'}`;
    let filename;
    let csv;

    if (req.params.report === 'overview') {
      const { rows, total } = await overview({ ...range, modules: readModules(req.query) });
      filename = `platform-overview_${stamp}.csv`;
      csv = csvOf(
        ['Module', 'Transactions', 'Pending', 'Gross (₹)', 'Commission (₹)', 'Taxes (₹)', 'Vendor payout (₹)', 'Average value (₹)'],
        [
          ...rows.map((r) => [r.label, r.count, r.pending, r.gross, r.commission, r.taxes, r.vendorPayout, r.averageOrderValue]),
          ['TOTAL', total.count, total.pending, total.gross, total.commission, total.taxes, total.vendorPayout, ''],
        ],
      );
    } else if (req.params.report === 'timeseries') {
      const modules = readModules(req.query);
      const wanted = modules.length ? modules : REPORT_MODULES;
      const points = await timeseries({ ...range, interval: req.query.interval, modules });
      filename = `platform-trend_${stamp}.csv`;
      csv = csvOf(
        ['Period', ...wanted.map((m) => `${m} (₹)`), 'Total gross (₹)', 'Commission (₹)', 'Transactions'],
        points.map((p) => [p.bucket, ...wanted.map((m) => p[m] ?? 0), p.gross, p.commission, p.count]),
      );
    } else if (req.params.report === 'top') {
      const module = String(req.query.module || '').toLowerCase();
      if (!REPORT_MODULES.includes(module)) {
        return res.status(400).json({ success: false, message: 'Pick a module' });
      }
      const vendors = await topVendors(module, { ...range, limit: req.query.limit || 50 });
      filename = `${module}-top-earners_${stamp}.csv`;
      csv = csvOf(['Name', 'Transactions', 'Gross (₹)', 'Commission (₹)'],
        vendors.map((v) => [v.name, v.count, v.gross, v.commission]));
    } else {
      return res.status(404).json({ success: false, message: 'No such report' });
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    // Excel reads a CSV as the system codepage unless it sees a BOM, which
    // turns every ₹ into mojibake.
    res.send(`﻿${csv}`);
  } catch (error) {
    console.error('Report export error:', error);
    res.status(500).json({ success: false, message: 'Could not export this report' });
  }
};

export default { getOverview, getTimeseries, getTopVendors, getModuleReport, exportReport };
