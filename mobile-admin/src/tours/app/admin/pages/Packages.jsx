/* Ported from Frontend/src/modules/Tours/app/admin/pages/Packages.jsx (tools/port.js first pass). */
import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from '../../../../lib/webRouter';
import { PlusCircle, RefreshCw } from 'lucide-react-native';
import adminService from '../../../services/adminService';
import { currency, shortDate } from '../components/ui';
import {
  AdminPage,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  Cell,
  DataTable,
  EmptyState,
  PageHeader,
  Row,
  StatCard,
  StatGrid,
  StatusBadge,
  TBody,
  THead,
  TableSkeleton,
  Toolbar,
} from '../../../../admin/ui';
import { toast } from '../../../../lib/notify';
import { Button, Div, Link, P, Span, Icon as UiIcon } from '../../../../components/web';
import usePrompt from '../components/usePrompt';
const FILTERS = ['all', 'pending', 'approved', 'rejected', 'draft'];
const COLS = [200, 110, 130, 300];
const Packages = () => {
  const [params, setParams] = useSearchParams();
  const [packages, setPackages] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);
  const [promptDialog, prompt] = usePrompt();
  const status = params.get('status') || 'all';
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminService.getPackages({
        status,
      });
      setPackages(data.packages || []);
      setSummary(data.summary || {});
    } catch (error) {
      toast.error(error.message || 'Failed to load packages');
    } finally {
      setLoading(false);
    }
  }, [status]);
  useEffect(() => {
    load();
  }, [load]);
  const decide = async (pkg, next) => {
    let reason;
    if (next === 'rejected') {
      // The server requires this.
      reason = await prompt('Why is this package being rejected?', '');
      if (!reason || !reason.trim()) return;
    }
    try {
      setBusyId(pkg._id);
      await adminService.updatePackageStatus(pkg._id, next, reason);
      toast.success(`Package ${next}`);
      await load();
    } catch (error) {
      toast.error(error.message || 'Could not update this package');
    } finally {
      setBusyId(null);
    }
  };

  /** Hide a package from travellers without deleting it. */
  const toggle = async (pkg) => {
    try {
      setBusyId(pkg._id);
      await adminService.togglePackage(pkg._id, !pkg.isActive);
      toast.success(pkg.isActive ? 'Package hidden' : 'Package is live');
      await load();
    } catch (error) {
      toast.error(error.message || 'Could not update this package');
    } finally {
      setBusyId(null);
    }
  };

  /*
   * The server refuses to delete a package that has bookings and says so, which
   * is the message shown here — deleting one would orphan a traveller's trip.
   * Two steps rather than `window.confirm`, which embedded browsers suppress.
   */
  const remove = async (pkg) => {
    if (confirmingId !== pkg._id) {
      setConfirmingId(pkg._id);
      toast('Press delete again to confirm', {
        icon: '⚠️',
      });
      return;
    }
    try {
      setBusyId(pkg._id);
      await adminService.deletePackage(pkg._id);
      toast.success('Package deleted');
      await load();
    } catch (error) {
      toast.error(error.message || 'Could not delete this package');
    } finally {
      setBusyId(null);
      setConfirmingId(null);
    }
  };
  const total = Object.values(summary).reduce((a, b) => a + (b || 0), 0);
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        title="Packages"
        subtitle={`${summary.pending || 0} awaiting review`}
        breadcrumb={[{ label: 'Tours' }, { label: 'Packages' }]}
        actions={
          <>
            <Link to="/tours/admin/packages/new" className={BTN_PRIMARY}>
              <UiIcon as={PlusCircle} size={16} className="text-white" />
              <Span className={BTN_TEXT_PRIMARY}>Create a package</Span>
            </Link>
            <Button type="button" onClick={load} className={BTN_SECONDARY} accessibilityLabel="Refresh">
              <UiIcon as={RefreshCw} size={16} className="text-slate-600" />
              <Span className={BTN_TEXT_SECONDARY}>Refresh</Span>
            </Button>
          </>
        }
      />

      {total > 0 && (
        <StatGrid className="mb-4">
          <StatCard label="Total packages" value={total} />
          <StatCard label="Pending review" value={summary.pending || 0} tone={summary.pending ? 'warning' : 'info'} />
          <StatCard label="Approved" value={summary.approved || 0} tone="success" />
          <StatCard label="Rejected" value={summary.rejected || 0} tone="danger" />
        </StatGrid>
      )}

      <Toolbar>
        {FILTERS.map((value) => (
          <Button
            key={value}
            type="button"
            onClick={() =>
              setParams(
                value === 'all'
                  ? {}
                  : {
                      status: value,
                    },
              )
            }
            className={`h-11 px-4 rounded-full items-center justify-center ${status === value ? 'bg-blue-600' : 'border border-slate-300 bg-white'}`}
          >
            <Span className={`text-sm font-semibold ${status === value ? 'text-white' : 'text-slate-700'}`}>
              {value}
              {value !== 'all' && summary[value] ? ` (${summary[value]})` : ''}
            </Span>
          </Button>
        ))}
      </Toolbar>

      {loading ? (
        <TableSkeleton rows={5} />
      ) : packages.length === 0 ? (
        <EmptyState
          title="No packages here"
          message={status === 'all' ? 'Create the first tour package travellers can book.' : `Nothing is ${status} right now.`}
          actionLabel="Reload"
          onAction={load}
        />
      ) : (
        <DataTable cols={COLS}>
          <THead cols={COLS} labels={['Package', 'Price', 'Status', 'Review']} />
          <TBody>
            {packages.map((pkg, i, a) => (
              <Row key={pkg._id} last={i === a.length - 1}>
                <Cell width={COLS[0]}>
                  <P className="text-sm font-semibold text-slate-900" numberOfLines={2}>
                    {pkg.title}
                  </P>
                  <P className="text-xs text-slate-500 mt-0.5" numberOfLines={2}>
                    {pkg.durationDays}D/{pkg.durationNights}N · {pkg.category}
                    {pkg.createdBy === 'admin' && ' · created by admin'}
                  </P>
                </Cell>
                <Cell width={COLS[1]} align="right">
                  <P className="text-sm font-semibold text-slate-900">{currency(pkg.pricePerPerson)}</P>
                </Cell>
                <Cell width={COLS[2]}>
                  <Div className="gap-1">
                    <StatusBadge status={pkg.status} />
                    {!pkg.isActive && <StatusBadge status="off" tone="neutral" label="off" />}
                    <P className="text-xs text-slate-500">{shortDate(pkg.createdAt)}</P>
                  </Div>
                </Cell>
                <Cell width={COLS[3]}>
                  <Div className="flex-row flex-wrap gap-2">
                    {pkg.status !== 'approved' && (
                      <Button
                        type="button"
                        disabled={busyId === pkg._id}
                        onClick={() => decide(pkg, 'approved')}
                        className="h-11 px-3 rounded-lg bg-blue-600 items-center justify-center disabled:opacity-50"
                      >
                        <Span className="text-sm font-semibold text-white">Approve</Span>
                      </Button>
                    )}
                    {pkg.status !== 'rejected' && (
                      <Button
                        type="button"
                        disabled={busyId === pkg._id}
                        onClick={() => decide(pkg, 'rejected')}
                        className="h-11 px-3 rounded-lg border border-slate-300 bg-white items-center justify-center disabled:opacity-50"
                      >
                        <Span className="text-sm font-semibold text-slate-700">Reject</Span>
                      </Button>
                    )}
                    <Button
                      type="button"
                      disabled={busyId === pkg._id}
                      onClick={() => toggle(pkg)}
                      className="h-11 px-3 rounded-lg border border-slate-300 bg-white items-center justify-center disabled:opacity-50"
                    >
                      <Span className="text-sm font-semibold text-slate-700">{pkg.isActive ? 'Switch off' : 'Switch on'}</Span>
                    </Button>
                    <Button
                      type="button"
                      disabled={busyId === pkg._id}
                      onClick={() => remove(pkg)}
                      className={`h-11 px-3 rounded-lg items-center justify-center disabled:opacity-50 ${confirmingId === pkg._id ? 'bg-red-600' : 'border border-red-200 bg-white'}`}
                    >
                      <Span className={`text-sm font-semibold ${confirmingId === pkg._id ? 'text-white' : 'text-red-600'}`}>
                        {confirmingId === pkg._id ? 'Delete for good?' : 'Delete'}
                      </Span>
                    </Button>
                  </Div>
                </Cell>
              </Row>
            ))}
          </TBody>
        </DataTable>
      )}
      {promptDialog}
    </AdminPage>
  );
};
export default Packages;
