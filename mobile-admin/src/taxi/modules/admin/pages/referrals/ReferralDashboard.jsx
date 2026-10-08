/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/referrals/ReferralDashboard.jsx (tools/port.js first pass). */
import React, { useState, useEffect } from 'react';
import { useWindowDimensions } from 'react-native';
import { Users, UserCheck, Zap, IndianRupee, Share2, BarChart3 } from 'lucide-react-native';
import { PieChart } from 'react-native-gifted-charts';
import { adminService } from '../../services/adminService';
import { toast } from '../../../../../lib/notify';
import { useSettings } from '../../../../shared/context/SettingsContext';
import {
  A,
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  StatCard,
  StatGrid,
  LoadingState,
  EmptyState,
  ErrorState,
  useLayoutWidth,
} from '../../../../../admin/ui';
import { Div, Span } from '../../../../../components/web';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const AXIS = { fontSize: 11, color: A.textMuted };

const DonutBreakdown = ({ color1, color2, label1, label2, val1, val2, radius }) => {
  if (val1 === 0 && val2 === 0) {
    return <EmptyState className="border-0" icon={Share2} title="No referrals yet" message="Referral counts appear here once riders start sharing their code." />;
  }
  return (
    <Div className="items-center gap-4">
      <PieChart
        donut
        radius={radius}
        innerRadius={Math.round(radius * 0.8)}
        innerCircleColor="#FFFFFF"
        data={[
          { value: val1, color: color1 },
          { value: val2, color: color2 },
        ]}
        centerLabelComponent={() => (
          <Div className="items-center justify-center">
            <Span className="text-xs text-slate-500" numberOfLines={1}>
              {label1}
            </Span>
            <Span className="text-xl font-bold text-slate-900">{String(val1)}</Span>
          </Div>
        )}
      />
      <Div className="flex-row flex-wrap items-center justify-center gap-2">
        {[
          { label: label1, color: color1, value: val1 },
          { label: label2, color: color2, value: val2 },
        ].map((item) => (
          <Div key={item.label} className="flex-row items-center gap-2 px-3 h-9 rounded-full bg-slate-50 border border-slate-200">
            <Div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <Span className="text-xs font-semibold text-slate-700" numberOfLines={1}>
              {item.label} · {item.value}
            </Span>
          </Div>
        ))}
      </Div>
    </Div>
  );
};

const MonthlyBars = ({ color, data, slot }) => {
  const maxVal = Math.max(...data, 2) || 2;
  if (data.every((val) => val === 0)) {
    return <EmptyState className="border-0" icon={BarChart3} title="No monthly data" message="Month-by-month referrals appear here once there is activity." />;
  }
  return (
    <Div className="flex-row items-end">
      {data.map((val, i) => (
        <Div key={MONTHS[i] || i} style={{ width: slot, height: 200 }} className="items-center justify-end gap-1 px-0.5">
          <Span className="text-[11px] font-semibold" style={{ color: AXIS.color }} numberOfLines={1}>
            {val ? String(val) : ''}
          </Span>
          <Div
            className="rounded-t-md"
            style={{
              width: '100%',
              height: Math.max(val > 0 ? 4 : 2, Math.round((val / maxVal) * 150)),
              backgroundColor: val > 0 ? color : A.surfaceMuted,
            }}
          />
          <Span className="text-[11px] font-semibold" style={{ color: AXIS.color }} numberOfLines={1}>
            {MONTHS[i]}
          </Span>
        </Div>
      ))}
    </Div>
  );
};

const ReferralDashboard = () => {
  const { settings } = useSettings();
  const appName = settings.general?.app_name || 'App';
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const { width } = useWindowDimensions();
  const { tablet } = useLayoutWidth();
  const chartWidth = Math.max(240, Math.min(tablet ? 560 : width, width) - 64);
  const slot = Math.max(26, Math.floor(chartWidth / MONTHS.length));
  const donutRadius = Math.min(96, Math.max(64, Math.floor(chartWidth / 3)));

  const fetchDashboard = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const res = await adminService.getReferralDashboard();
      if (res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setLoadError(err?.message || 'Failed to load dashboard data');
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const header = (
    <PageHeader
      icon={Share2}
      title="Referral dashboard"
      subtitle="Rider and driver referrals across the district"
      breadcrumb={[{ label: 'Taxi' }, { label: 'Referrals' }, { label: 'Dashboard' }]}
    />
  );

  if (isLoading) {
    return (
      <AdminPage maxWidth={1200}>
        {header}
        <LoadingState label="Loading dashboard…" />
      </AdminPage>
    );
  }

  if (loadError) {
    return (
      <AdminPage maxWidth={1200}>
        {header}
        <ErrorState title="Could not load the dashboard" message={loadError} onRetry={fetchDashboard} />
      </AdminPage>
    );
  }

  // Monthly data defaults
  const emptyMonthly = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

  if (!data) {
    return (
      <AdminPage maxWidth={1200}>
        {header}
        <EmptyState
          icon={Share2}
          title="No referral data yet"
          message="Referral totals appear here once riders and drivers start sharing their codes."
          actionLabel="Refresh"
          onAction={fetchDashboard}
        />
      </AdminPage>
    );
  }

  return (
    <AdminPage maxWidth={1200}>
      {header}

      <StatGrid className="mb-4">
        <StatCard label="Total drivers" value={String(data?.total_drivers || '0')} icon={Users} tone="info" />
        <StatCard label="Total users" value={String(data?.total_users || '0')} icon={UserCheck} tone="info" />
        <StatCard label="Active referrals" value={String(data?.active_referrals || '0')} icon={Zap} tone="warning" />
        <StatCard label="Referral earning" value={data?.referral_earning ? `₹ ${data.referral_earning}` : '₹ 0'} icon={IndianRupee} tone="success" />
      </StatGrid>

      <Card className="mb-4">
        <SectionTitle>User referrals overview</SectionTitle>
        <DonutBreakdown
          color1="#155DFC"
          color2={A.surfaceMuted}
          label1="Referral user"
          label2="Normal user"
          radius={donutRadius}
          val1={data?.user_referrals?.referral_user || 0}
          val2={data?.user_referrals?.normal_user || 0}
        />
      </Card>

      <Card className="mb-4">
        <SectionTitle>User monthly referrals</SectionTitle>
        <MonthlyBars color="#155DFC" data={data?.user_referrals?.monthly || emptyMonthly} slot={slot} />
      </Card>

      <Card className="mb-4">
        <SectionTitle>Driver referrals overview</SectionTitle>
        <DonutBreakdown
          color1="#008236"
          color2={A.surfaceMuted}
          label1="Referral driver"
          label2="Normal driver"
          radius={donutRadius}
          val1={data?.driver_referrals?.referral_driver || 0}
          val2={data?.driver_referrals?.normal_driver || 0}
        />
      </Card>

      <Card className="mb-4">
        <SectionTitle>Driver monthly referrals</SectionTitle>
        <MonthlyBars color="#008236" data={data?.driver_referrals?.monthly || emptyMonthly} slot={slot} />
      </Card>

      <Div className="flex-row flex-wrap items-center justify-between gap-2 pt-4 border-t border-slate-200">
        <Span className="text-xs text-slate-500">2026 © {appName}.</Span>
        <Div className="flex-row flex-wrap items-center gap-4">
          <Span className="text-xs text-slate-500">Design &amp; develop by {appName}</Span>
          <Span className="text-xs text-slate-500">App version 2.3</Span>
        </Div>
      </Div>
    </AdminPage>
  );
};
export default ReferralDashboard;
