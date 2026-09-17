/**
 * Platform-wide reporting.
 *
 * Each module already answers "how am I doing"; nothing answered it for the
 * platform, and tours and hotel had no reports at all. This reads every
 * module's own transaction collection directly and normalises the five very
 * different money shapes into one row, so a single query can compare them.
 *
 * Read-only and aggregation-only: it never writes, and it never re-derives a
 * price. Every figure here was computed and stored when the transaction
 * happened — a report that recalculated totals would eventually disagree with
 * what the customer was actually charged.
 */
import mongoose from 'mongoose';

/**
 * How each module records a sale.
 *
 * `completed` is what counts as a real transaction for revenue. `gross` is what
 * the customer was billed, `commission` what the platform keeps, `taxes` what
 * is collected on the platform's behalf — all named differently per module
 * because these collections were built by different teams at different times.
 */
export const MODULE_SOURCES = {
  food: {
    collection: 'food_orders',
    dateField: 'createdAt',
    completed: { orderStatus: 'delivered' },
    pending: { orderStatus: { $nin: ['delivered', 'cancelled', 'rejected'] } },
    gross: '$pricing.total',
    commission: '$pricing.restaurantCommission',
    taxes: '$pricing.tax',
    label: 'Food',
    unit: 'orders',
  },
  taxi: {
    collection: 'taxirides',
    dateField: 'createdAt',
    completed: { status: 'completed' },
    pending: { status: { $in: ['searching', 'accepted', 'ongoing'] } },
    gross: '$fare',
    commission: '$commissionAmount',
    taxes: null,
    label: 'Taxi',
    unit: 'rides',
  },
  hotel: {
    collection: 'bookings',
    dateField: 'createdAt',
    completed: { bookingStatus: { $in: ['confirmed', 'checked_in', 'checked_out', 'completed'] } },
    pending: { bookingStatus: 'pending' },
    gross: '$totalAmount',
    commission: '$adminCommission',
    taxes: '$taxes',
    label: 'Hotels',
    unit: 'bookings',
  },
  tours: {
    collection: 'tourbookings',
    dateField: 'createdAt',
    completed: { bookingStatus: { $in: ['confirmed', 'ongoing', 'completed'] } },
    pending: { bookingStatus: 'pending' },
    gross: '$totalAmount',
    commission: '$adminCommission',
    taxes: '$taxes',
    label: 'Tours',
    unit: 'bookings',
  },
  festivals: {
    collection: 'festivalbookings',
    dateField: 'createdAt',
    // Passes are sold directly by the platform, so payment is the only gate.
    completed: { paymentStatus: 'paid' },
    pending: { paymentStatus: 'pending' },
    gross: '$totalAmount',
    commission: null,
    taxes: '$taxes',
    label: 'Festivals',
    unit: 'passes',
  },
};

export const REPORT_MODULES = Object.keys(MODULE_SOURCES);

/** `$sum` of a field that may not exist on this module at all. */
const sumOf = (path) => (path ? { $sum: { $ifNull: [path, 0] } } : { $literal: 0 });

const rangeMatch = (source, from, to) => {
  if (!from && !to) return {};
  const range = {};
  if (from) range.$gte = new Date(from);
  if (to) {
    // An end date is inclusive of that whole day — an admin asking for
    // "1st to 30th" means the 30th, not midnight at its start.
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    range.$lte = end;
  }
  return { [source.dateField]: range };
};

const collectionOf = (name) => mongoose.connection.db.collection(name);

/**
 * One module's totals for a period.
 *
 * Returns zeroes rather than throwing when the collection does not exist yet —
 * a module with no data is a legitimate answer, not a failed report.
 */
export const moduleTotals = async (module, { from, to } = {}) => {
  const source = MODULE_SOURCES[module];
  if (!source) return null;

  const within = rangeMatch(source, from, to);

  try {
    const [settled] = await collectionOf(source.collection).aggregate([
      { $match: { ...source.completed, ...within } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          gross: sumOf(source.gross),
          commission: sumOf(source.commission),
          taxes: sumOf(source.taxes),
        },
      },
    ]).toArray();

    const pending = await collectionOf(source.collection)
      .countDocuments({ ...source.pending, ...within });

    const gross = Math.round(settled?.gross || 0);
    const commission = Math.round(settled?.commission || 0);
    const taxes = Math.round(settled?.taxes || 0);

    return {
      module,
      label: source.label,
      unit: source.unit,
      count: settled?.count || 0,
      pending,
      gross,
      commission,
      taxes,
      // What the vendors are owed out of this: everything the platform did not
      // keep. Festivals has no vendor, so its payout is zero by construction.
      vendorPayout: Math.max(0, gross - commission - taxes),
      averageOrderValue: settled?.count ? Math.round(gross / settled.count) : 0,
    };
  } catch (error) {
    console.error(`[reports] ${module} totals failed:`, error.message);
    return {
      module, label: source.label, unit: source.unit,
      count: 0, pending: 0, gross: 0, commission: 0, taxes: 0,
      vendorPayout: 0, averageOrderValue: 0,
    };
  }
};

/** Every module's totals, plus the platform line. */
export const overview = async ({ from, to, modules } = {}) => {
  const wanted = (modules?.length ? modules : REPORT_MODULES).filter((m) => MODULE_SOURCES[m]);
  const rows = (await Promise.all(wanted.map((m) => moduleTotals(m, { from, to })))).filter(Boolean);

  const total = rows.reduce((sum, row) => ({
    count: sum.count + row.count,
    pending: sum.pending + row.pending,
    gross: sum.gross + row.gross,
    commission: sum.commission + row.commission,
    taxes: sum.taxes + row.taxes,
    vendorPayout: sum.vendorPayout + row.vendorPayout,
  }), { count: 0, pending: 0, gross: 0, commission: 0, taxes: 0, vendorPayout: 0 });

  return { rows, total };
};

const BUCKET_FORMAT = { day: '%Y-%m-%d', week: '%Y-W%V', month: '%Y-%m' };

/**
 * Gross and commission per period, per module — what a trend chart draws.
 *
 * Buckets are formatted in Asia/Kolkata so a sale just before midnight IST does
 * not land on the previous day, which is what UTC bucketing would do for every
 * evening order.
 */
export const timeseries = async ({ from, to, interval = 'day', modules } = {}) => {
  const format = BUCKET_FORMAT[interval] || BUCKET_FORMAT.day;
  const wanted = (modules?.length ? modules : REPORT_MODULES).filter((m) => MODULE_SOURCES[m]);

  const perModule = await Promise.all(wanted.map(async (module) => {
    const source = MODULE_SOURCES[module];
    try {
      const rows = await collectionOf(source.collection).aggregate([
        { $match: { ...source.completed, ...rangeMatch(source, from, to) } },
        {
          $group: {
            _id: { $dateToString: { format, date: `$${source.dateField}`, timezone: 'Asia/Kolkata' } },
            count: { $sum: 1 },
            gross: sumOf(source.gross),
            commission: sumOf(source.commission),
          },
        },
        { $sort: { _id: 1 } },
      ]).toArray();
      return [module, rows];
    } catch (error) {
      console.error(`[reports] ${module} timeseries failed:`, error.message);
      return [module, []];
    }
  }));

  // Union of every bucket any module produced, so a module with a quiet day
  // still lines up with the others instead of shifting the series.
  const buckets = [...new Set(perModule.flatMap(([, rows]) => rows.map((r) => r._id)))].sort();
  const byModule = Object.fromEntries(perModule);

  return buckets.map((bucket) => {
    const point = { bucket, gross: 0, commission: 0, count: 0 };
    for (const module of wanted) {
      const row = byModule[module].find((r) => r._id === bucket);
      point[module] = Math.round(row?.gross || 0);
      point.gross += Math.round(row?.gross || 0);
      point.commission += Math.round(row?.commission || 0);
      point.count += row?.count || 0;
    }
    return point;
  });
};

/**
 * Who is earning the most, per module.
 *
 * The vendor's name is resolved through its own collection, and each one calls
 * that field something different — `restaurantName`, `propertyName`, plain
 * `name`. A vendor that has been deleted shows as its id rather than dropping
 * the row, because the money still happened.
 */
const TOP_VENDOR = {
  food: { groupBy: '$restaurantId', from: 'food_restaurants', nameFields: ['restaurantName', 'name'] },
  hotel: { groupBy: '$propertyId', from: 'properties', nameFields: ['propertyName', 'name'] },
  tours: { groupBy: '$operatorId', from: 'touroperators', nameFields: ['agencyName', 'name'] },
  festivals: { groupBy: '$festivalId', from: 'festivals', nameFields: ['name'] },
  taxi: { groupBy: '$driverId', from: 'taxidrivers', nameFields: ['name'] },
};

export const topVendors = async (module, { from, to, limit = 10 } = {}) => {
  const source = MODULE_SOURCES[module];
  const top = TOP_VENDOR[module];
  if (!source || !top) return [];

  try {
    const rows = await collectionOf(source.collection).aggregate([
      { $match: { ...source.completed, ...rangeMatch(source, from, to) } },
      {
        $group: {
          _id: top.groupBy,
          count: { $sum: 1 },
          gross: sumOf(source.gross),
          commission: sumOf(source.commission),
        },
      },
      { $sort: { gross: -1 } },
      { $limit: Math.min(Math.max(Number(limit) || 10, 1), 50) },
      { $lookup: { from: top.from, localField: '_id', foreignField: '_id', as: 'vendor' } },
    ]).toArray();

    return rows.map((row) => ({
      id: row._id,
      name: top.nameFields.map((f) => row.vendor?.[0]?.[f]).find(Boolean) || String(row._id),
      count: row.count,
      gross: Math.round(row.gross || 0),
      commission: Math.round(row.commission || 0),
    }));
  } catch (error) {
    console.error(`[reports] ${module} top vendors failed:`, error.message);
    return [];
  }
};

export default { MODULE_SOURCES, REPORT_MODULES, moduleTotals, overview, timeseries, topVendors };
