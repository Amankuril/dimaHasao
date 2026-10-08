/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/CancellationAnalytics.jsx (tools/port.js first pass). */
import React, { useEffect, useState } from 'react';
import { Ban, TrendingDown, UserX, Car, DollarSign, ShieldAlert, AlertTriangle, RefreshCw, Clock, ChevronRight } from 'lucide-react-native';
// PORT: needs modules/Taxi/shared/api/axiosInstance.js ported (node tools/port.js modules/Taxi/shared/api/axiosInstance.js)
import api from '../../../shared/api/axiosInstance';
import { toast } from '../../../../lib/notify';
import { Button, Div, H1, H2, P, ScrollDiv, Span, Icon as UiIcon } from '../../../../components/web';
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
      <ScrollDiv className="p-6 space-y-6 max-w-7xl mx-auto animate-pulse">
        <Div className="h-8 bg-slate-200 rounded w-1/4" />
        <Div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Div key={i} className="h-28 bg-slate-200 rounded-2xl" />
          ))}
        </Div>
        <Div className="h-64 bg-slate-200 rounded-2xl" />
      </ScrollDiv>
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
  // PORT: overflow-y-auto: this element scrolls on the web -> use <ScrollDiv> (or a FlatList for a long list)
  return (
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen max-w-7xl mx-auto space-y-6">
      {/* Top Bar */}
      <Div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Div>
          <H1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <UiIcon as={Ban} className="w-7 h-7 text-red-600" />
            Ride Cancellation Analytics
          </H1>
          <P className="text-xs text-slate-500 mt-1">Real-time breakdown of ride cancellations, driver misconduct flags, and revenue impact.</P>
        </Div>
        <Button
          onClick={fetchAnalytics}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm self-start sm:self-auto"
        >
          <UiIcon as={RefreshCw} className="w-4 h-4 text-slate-500" />
          Refresh
        </Button>
      </Div>

      {/* KPI Cards */}
      <Div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
          <Div className="flex items-center justify-between">
            <Span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Cancelled Rides</Span>
            <Div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
              <UiIcon as={Ban} className="w-5 h-5" />
            </Div>
          </Div>
          <Div className="flex items-baseline justify-between">
            <Span className="text-2xl font-black text-slate-900">{totalCancelledRides}</Span>
            <Span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">{cancellationRate}% rate</Span>
          </Div>
          <P className="text-[11px] text-slate-400">out of {totalRidesCount} total ride requests</P>
        </Div>

        <Div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
          <Div className="flex items-center justify-between">
            <Span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Customer Cancellations</Span>
            <Div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <UiIcon as={UserX} className="w-5 h-5" />
            </Div>
          </Div>
          <Span className="text-2xl font-black text-slate-900">{customerCancellations}</Span>
          <P className="text-[11px] text-slate-400">
            {totalCancelledRides > 0 ? `${Math.round((customerCancellations / totalCancelledRides) * 100)}% of total cancellations` : '0%'}
          </P>
        </Div>

        <Div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
          <Div className="flex items-center justify-between">
            <Span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Driver Cancellations</Span>
            <Div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
              <UiIcon as={Car} className="w-5 h-5" />
            </Div>
          </Div>
          <Span className="text-2xl font-black text-slate-900">{driverCancellations}</Span>
          <P className="text-[11px] text-slate-400">
            {totalCancelledRides > 0 ? `${Math.round((driverCancellations / totalCancelledRides) * 100)}% of total cancellations` : '0%'}
          </P>
        </Div>

        <Div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
          <Div className="flex items-center justify-between">
            <Span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Est. Revenue Lost</Span>
            <Div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
              <UiIcon as={DollarSign} className="w-5 h-5" />
            </Div>
          </Div>
          <Span className="text-2xl font-black text-slate-900">₹{totalRevenueLost.toLocaleString()}</Span>
          <P className="text-[11px] text-emerald-600 font-semibold">₹{totalCancellationFeesCollected.toLocaleString()} fees collected</P>
        </Div>
      </Div>

      {/* Flagged Driver Behavior Alerts */}
      {flaggedRides.length > 0 && (
        <Div className="bg-gradient-to-r from-red-50 to-amber-50 border border-red-200 rounded-2xl p-5 space-y-4">
          <Div className="flex items-center justify-between">
            <Div className="flex items-center gap-2">
              <UiIcon as={ShieldAlert} className="w-5 h-5 text-red-600" />
              <H2 className="text-sm font-bold text-red-900">Flagged Driver Behavior Reports ({flaggedRides.length})</H2>
            </Div>
            <Span className="text-[11px] font-bold text-red-700 bg-red-100 px-2.5 py-1 rounded-full uppercase">Action Required</Span>
          </Div>

          <Div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {flaggedRides.map((item, idx) => (
              <Div
                key={idx}
                className="bg-white p-3.5 rounded-xl border border-red-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <Div>
                  <Span className="font-bold text-slate-900">{item.reason}</Span>
                  {item.comment && <P className="text-slate-500 italic mt-0.5">"{item.comment}"</P>}
                  <P className="text-[11px] text-slate-400 mt-1">
                    Customer: <Span className="font-semibold text-slate-700">{item.customerName}</Span> ({item.customerPhone}) | Driver:{' '}
                    <Span className="font-semibold text-slate-700">{item.driverName}</Span> ({item.driverPhone})
                  </P>
                </Div>
                <Div className="text-right shrink-0">
                  <Span className="text-[11px] text-slate-400">
                    {new Date(item.cancelledAt).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Span>
                </Div>
              </Div>
            ))}
          </Div>
        </Div>
      )}

      {/* Main Grid: Reasons & Stages */}
      <Div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Reasons Breakdown */}
        <Div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <H2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <UiIcon as={TrendingDown} className="w-4 h-4 text-orange-500" />
            Most Common Cancellation Reasons
          </H2>

          <Div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {reasonsBreakdown.length > 0 ? (
              reasonsBreakdown.map((item, idx) => {
                const pct = totalCancelledRides > 0 ? Math.round((item.count / totalCancelledRides) * 100) : 0;
                // PORT: inline style object: check every property is valid in React Native (no backgroundImage, cursor, gridTemplate..., strings like "1rem")
                return (
                  <Div key={idx} className="space-y-1">
                    <Div className="flex justify-between text-xs font-semibold">
                      <Span className="text-slate-800">{item.reason}</Span>
                      <Span className="text-slate-500 font-bold">
                        {item.count} ({pct}%)
                      </Span>
                    </Div>
                    <Div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <Div
                        className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(pct, 4)}%`,
                        }}
                      />
                    </Div>
                  </Div>
                );
              })
            ) : (
              <P className="text-xs text-slate-400 italic">No cancellation reasons recorded yet.</P>
            )}
          </Div>
        </Div>

        {/* Stage & Driver Breakdown */}
        <Div className="space-y-6">
          {/* Stage Breakdown Card */}
          <Div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <H2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <UiIcon as={Clock} className="w-4 h-4 text-blue-500" />
              Cancellation Stage Breakdown
            </H2>

            <Div className="grid grid-cols-3 gap-3 text-center">
              <Div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                <P className="text-xs font-bold text-blue-600 uppercase">Searching</P>
                <P className="text-xl font-black text-slate-900 mt-1">{stageBreakdown.searching || 0}</P>
                <P className="text-[10px] text-slate-400 mt-0.5">Before Driver Acceptance</P>
              </Div>

              <Div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100">
                <P className="text-xs font-bold text-amber-600 uppercase">Accepted</P>
                <P className="text-xl font-black text-slate-900 mt-1">{stageBreakdown.accepted || 0}</P>
                <P className="text-[10px] text-slate-400 mt-0.5">Driver On The Way</P>
              </Div>

              <Div className="p-3 bg-red-50/60 rounded-xl border border-red-100">
                <P className="text-xs font-bold text-red-600 uppercase">Arrived</P>
                <P className="text-xl font-black text-slate-900 mt-1">{stageBreakdown.arrived || 0}</P>
                <P className="text-[10px] text-slate-400 mt-0.5">At Pickup Location</P>
              </Div>
            </Div>
          </Div>

          {/* Top Driver Offender Cancellations */}
          {topDriverCancellations.length > 0 && (
            <Div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
              <H2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <UiIcon as={AlertTriangle} className="w-4 h-4 text-amber-500" />
                Drivers With Frequent Cancellations
              </H2>

              <Div className="space-y-2">
                {topDriverCancellations.map((driver, idx) => (
                  <Div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl text-xs">
                    <Div>
                      <P className="font-bold text-slate-900">{driver.driverName}</P>
                      <P className="text-[11px] text-slate-500">{driver.driverPhone}</P>
                    </Div>
                    <Span className="font-extrabold text-red-600 bg-red-100 px-2.5 py-1 rounded-full">{driver.cancellationCount} cancellations</Span>
                  </Div>
                ))}
              </Div>
            </Div>
          )}
        </Div>
      </Div>
    </ScrollDiv>
  );
}
