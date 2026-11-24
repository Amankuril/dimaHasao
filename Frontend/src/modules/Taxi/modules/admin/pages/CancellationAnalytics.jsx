import React, { useEffect, useState } from 'react';
import {
  Ban,
  TrendingDown,
  UserX,
  Car,
  DollarSign,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  Clock,
  ChevronRight,
} from 'lucide-react';
import api from '../../../shared/api/axiosInstance';
import toast from 'react-hot-toast';

export default function CancellationAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/cancellation-analytics');
      if (response.data?.success) {
        setData(response.data.data);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to fetch cancellation analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto animate-pulse">
        <div className="h-8 bg-neutral-200 rounded w-1/4" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-neutral-200 rounded-2xl" />
          ))}
        </div>
        <div className="h-64 bg-neutral-200 rounded-2xl" />
      </div>
    );
  }

  const {
    totalRidesCount = 0,
    totalCancelledRides = 0,
    cancellationRate = 0,
    customerCancellations = 0,
    driverCancellations = 0,
    totalRevenueLost = 0,
    totalCancellationFeesCollected = 0,
    reasonsBreakdown = [],
    stageBreakdown = {},
    topDriverCancellations = [],
    flaggedRides = [],
  } = data || {};

  return (
    <div className="p-4 lg:p-6 bg-neutral-50 min-h-screen max-w-7xl mx-auto space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium text-neutral-900 flex items-center gap-2">
            <Ban className="w-7 h-7 text-red-600" />
            Ride cancellation analytics
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Real-time breakdown of ride cancellations, driver misconduct flags, and revenue impact
          </p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-neutral-900/[0.08] rounded-xl text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4 text-neutral-500" />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-neutral-200/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">Total cancelled rides</span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-neutral-100 text-neutral-500">
              <Ban className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-medium text-neutral-900">{totalCancelledRides}</span>
            <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
              {cancellationRate}% rate
            </span>
          </div>
          <p className="text-xs text-neutral-400">out of {totalRidesCount} total ride requests</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-neutral-200/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">Customer cancellations</span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-neutral-100 text-neutral-500">
              <UserX className="w-5 h-5" />
            </div>
          </div>
          <span className="text-2xl font-medium text-neutral-900">{customerCancellations}</span>
          <p className="text-xs text-neutral-400">
            {totalCancelledRides > 0
              ? `${Math.round((customerCancellations / totalCancelledRides) * 100)}% of total cancellations`
              : '0%'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-neutral-200/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">Driver cancellations</span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-neutral-100 text-neutral-500">
              <Car className="w-5 h-5" />
            </div>
          </div>
          <span className="text-2xl font-medium text-neutral-900">{driverCancellations}</span>
          <p className="text-xs text-neutral-400">
            {totalCancelledRides > 0
              ? `${Math.round((driverCancellations / totalCancelledRides) * 100)}% of total cancellations`
              : '0%'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-neutral-200/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">Est. Revenue Lost</span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-neutral-100 text-neutral-500">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <span className="text-2xl font-medium text-neutral-900">₹{totalRevenueLost.toLocaleString()}</span>
          <p className="text-xs text-emerald-600 font-medium">
            ₹{totalCancellationFeesCollected.toLocaleString()} fees collected
          </p>
        </div>
      </div>

      {/* Flagged Driver Behavior Alerts */}
      {flaggedRides.length > 0 && (
        <div className="border border-red-200 rounded-2xl p-5 space-y-4 bg-red-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              <h2 className="text-sm font-medium text-red-900">
                Flagged Driver Behavior Reports ({flaggedRides.length})
              </h2>
            </div>
            <span className="text-xs font-medium text-red-700 bg-red-100 px-2.5 py-1 rounded-full">
              Action required
            </span>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {flaggedRides.map((item, idx) => (
              <div
                key={idx}
                className="bg-white p-3.5 rounded-xl border border-red-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div>
                  <span className="font-medium text-neutral-900">{item.reason}</span>
                  {item.comment && <p className="text-neutral-500 mt-0.5">"{item.comment}"</p>}
                  <p className="text-xs text-neutral-400 mt-1">
                    Customer: <span className="font-medium text-neutral-700">{item.customerName}</span> ({item.customerPhone}) | Driver: <span className="font-medium text-neutral-700">{item.driverName}</span> ({item.driverPhone})
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs text-neutral-400">
                    {new Date(item.cancelledAt).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Reasons & Stages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reasons Breakdown */}
        <div className="bg-white p-5 rounded-xl border border-neutral-200/80 space-y-4">
          <h2 className="text-sm font-medium text-neutral-900 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-orange-500" />
            Most common cancellation reasons
          </h2>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {reasonsBreakdown.length > 0 ? (
              reasonsBreakdown.map((item, idx) => {
                const pct = totalCancelledRides > 0 ? Math.round((item.count / totalCancelledRides) * 100) : 0;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-neutral-800">{item.reason}</span>
                      <span className="text-neutral-500 font-medium">{item.count} ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-colors duration-500 bg-orange-500"
                        style={{ width: `${Math.max(pct, 4)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-neutral-400">No cancellation reasons recorded yet</p>
            )}
          </div>
        </div>

        {/* Stage & Driver Breakdown */}
        <div className="space-y-6">
          {/* Stage Breakdown Card */}
          <div className="bg-white p-5 rounded-xl border border-neutral-200/80 space-y-4">
            <h2 className="text-sm font-medium text-neutral-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#0a4d2b]" />
              Cancellation stage breakdown
            </h2>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-neutral-50/60 rounded-xl border border-neutral-200">
                <p className="text-xs font-medium text-[#0a4d2b]">Searching</p>
                <p className="text-xl font-medium text-neutral-900 mt-1">{stageBreakdown.searching || 0}</p>
                <p className="text-xs text-neutral-400 mt-0.5">Before driver acceptance</p>
              </div>

              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100">
                <p className="text-xs font-medium text-amber-600">Accepted</p>
                <p className="text-xl font-medium text-neutral-900 mt-1">{stageBreakdown.accepted || 0}</p>
                <p className="text-xs text-neutral-400 mt-0.5">Driver on the way</p>
              </div>

              <div className="p-3 bg-red-50/60 rounded-xl border border-red-100">
                <p className="text-xs font-medium text-red-600">Arrived</p>
                <p className="text-xl font-medium text-neutral-900 mt-1">{stageBreakdown.arrived || 0}</p>
                <p className="text-xs text-neutral-400 mt-0.5">At pickup location</p>
              </div>
            </div>
          </div>

          {/* Top Driver Offender Cancellations */}
          {topDriverCancellations.length > 0 && (
            <div className="bg-white p-5 rounded-xl border border-neutral-200/80 space-y-3">
              <h2 className="text-sm font-medium text-neutral-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#0a4d2b]" />
                Drivers with frequent cancellations
              </h2>

              <div className="space-y-2">
                {topDriverCancellations.map((driver, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl text-xs">
                    <div>
                      <p className="font-medium text-neutral-900">{driver.driverName}</p>
                      <p className="text-xs text-neutral-500">{driver.driverPhone}</p>
                    </div>
                    <span className="font-medium text-red-600 bg-red-100 px-2.5 py-1 rounded-full">
                      {driver.cancellationCount} cancellations
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
