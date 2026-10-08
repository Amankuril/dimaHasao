/* Ported from Frontend/src/modules/Tours/app/admin/pages/Packages.jsx (tools/port.js first pass). */
import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from '../../../../lib/webRouter';
import { PlusCircle, RefreshCw } from 'lucide-react-native';
import adminService from '../../../services/adminService';
import { PageHeader, Spinner, EmptyState, StatCard, StatusPill, currency, shortDate } from '../components/ui';
import { toast } from '../../../../lib/notify';
import { Button, Div, Link, P, ScrollDiv, Span, Table, Tbody, Td, Th, Thead, Tr, Icon as UiIcon } from '../../../../components/web';
import usePrompt from '../components/usePrompt';
const FILTERS = ['all', 'pending', 'approved', 'rejected', 'draft'];
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
    <ScrollDiv className="p-4 pb-20 space-y-4">
      <PageHeader
        title="Packages"
        subtitle={`${summary.pending || 0} awaiting review`}
        action={
          <Div className="flex flex-wrap items-center gap-2">
            <Link
              to="/tours/admin/packages/new"
              className="flex items-center gap-2 px-4 py-2.5 bg-[#0a4d2b] text-white rounded-xl text-sm font-bold hover:bg-[#06381e]"
            >
              <UiIcon as={PlusCircle} size={14} /> Create a package
            </Link>
            <Button
              type="button"
              onClick={load}
              className="p-2.5 rounded-xl border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
              accessibilityLabel="Refresh"
            >
              <UiIcon as={RefreshCw} size={14} />
            </Button>
          </Div>
        }
      />

      {total > 0 && (
        <Div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total packages" value={total} />
          <StatCard label="Pending review" value={summary.pending || 0} tone={summary.pending ? 'text-amber-600' : 'text-gray-900'} />
          <StatCard label="Approved" value={summary.approved || 0} tone="text-[#0a4d2b]" />
          <StatCard label="Rejected" value={summary.rejected || 0} />
        </Div>
      )}

      <Div className="flex flex-wrap gap-2">
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
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase transition-colors ${status === value ? 'bg-[#0a4d2b] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            {value}
            {value !== 'all' && summary[value] ? ` (${summary[value]})` : ''}
          </Button>
        ))}
      </Div>

      <Div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <Table cols={[240, 110, 150, 360]} className="w-full text-left text-sm">
          <Thead className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-500">
            <Tr>
              <Th className="p-4 font-semibold">Package</Th>
              <Th className="p-4 font-semibold text-right">Price</Th>
              <Th className="p-4 font-semibold">Status</Th>
              <Th className="p-4 font-semibold">Review</Th>
            </Tr>
          </Thead>
          <Tbody className="divide-y divide-gray-100">
            {loading ? (
              <Tr>
                <Td colSpan="4">
                  <Spinner />
                </Td>
              </Tr>
            ) : packages.length === 0 ? (
              <Tr>
                <Td colSpan="4">
                  <EmptyState message="No packages here." />
                </Td>
              </Tr>
            ) : (
              packages.map((pkg) => (
                <Tr key={pkg._id} className="hover:bg-gray-50/60">
                  <Td className="p-4">
                    <P className="font-bold text-gray-900">{pkg.title}</P>
                    <P className="text-[10px] text-gray-400">
                      {pkg.durationDays}D/{pkg.durationNights}N · {pkg.category}
                      {pkg.createdBy === 'admin' && ' · created by admin'}
                    </P>
                  </Td>
                  <Td className="p-4 text-right font-bold text-gray-900">{currency(pkg.pricePerPerson)}</Td>
                  <Td className="p-4">
                    <StatusPill status={pkg.status} />
                    {!pkg.isActive && <Span className="ml-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 text-gray-600">off</Span>}
                    <P className="text-[10px] text-gray-400 mt-1">{shortDate(pkg.createdAt)}</P>
                  </Td>
                  <Td className="p-4">
                    <Div className="flex flex-wrap gap-1.5">
                      {pkg.status !== 'approved' && (
                        <Button
                          type="button"
                          disabled={busyId === pkg._id}
                          onClick={() => decide(pkg, 'approved')}
                          className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          approve
                        </Button>
                      )}
                      {pkg.status !== 'rejected' && (
                        <Button
                          type="button"
                          disabled={busyId === pkg._id}
                          onClick={() => decide(pkg, 'rejected')}
                          className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                        >
                          reject
                        </Button>
                      )}
                      <Button
                        type="button"
                        disabled={busyId === pkg._id}
                        onClick={() => toggle(pkg)}
                        className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {pkg.isActive ? 'switch off' : 'switch on'}
                      </Button>
                      <Button
                        type="button"
                        disabled={busyId === pkg._id}
                        onClick={() => remove(pkg)}
                        className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase bg-white border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        delete
                      </Button>
                    </Div>
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
      </Div>
      {promptDialog}
    </ScrollDiv>
  );
};
export default Packages;
