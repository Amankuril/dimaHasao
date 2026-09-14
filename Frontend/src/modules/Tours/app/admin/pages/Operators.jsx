import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw, Search } from 'lucide-react';
import adminService from '../../../services/adminService';
import { PageHeader, Spinner, EmptyState, StatusPill, shortDate } from '../components/ui';
import toast from 'react-hot-toast';

const FILTERS = ['all', 'pending', 'approved', 'rejected'];

const Operators = () => {
  const [params, setParams] = useSearchParams();
  const [operators, setOperators] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [search, setSearch] = useState('');

  const approvalStatus = params.get('approvalStatus') || 'all';

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminService.getOperators({ approvalStatus, search: search.trim() || undefined });
      setOperators(data.operators || []);
      setSummary(data.summary || {});
    } catch (error) {
      toast.error(error.message || 'Failed to load operators');
    } finally {
      setLoading(false);
    }
  }, [approvalStatus, search]);

  useEffect(() => { load(); }, [load]);

  const decide = async (operator, status) => {
    let reason;
    if (status === 'rejected') {
      reason = window.prompt('Why is this operator being rejected? They will be told.', '');
      if (reason === null) return;
    }
    try {
      setBusyId(operator._id);
      await adminService.updateOperatorApproval(operator._id, status, reason);
      toast.success(`Operator ${status}`);
      await load();
    } catch (error) {
      toast.error(error.message || 'Could not update this operator');
    } finally {
      setBusyId(null);
    }
  };

  const toggleBlock = async (operator) => {
    try {
      setBusyId(operator._id);
      await adminService.updateOperatorBlock(operator._id, !operator.isBlocked);
      toast.success(operator.isBlocked ? 'Operator unblocked' : 'Operator blocked');
      await load();
    } catch (error) {
      toast.error(error.message || 'Could not update this operator');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tour Operators"
        subtitle={`${summary.pending || 0} awaiting approval`}
        action={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name, agency or phone"
                className="pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-black w-56"
              />
            </div>
            <button type="button" onClick={load} className="p-2 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50" aria-label="Refresh">
              <RefreshCw size={14} />
            </button>
          </div>
        }
      />

      <div className="flex gap-2">
        {FILTERS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setParams(value === 'all' ? {} : { approvalStatus: value })}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase transition-colors ${
              approvalStatus === value ? 'bg-neutral-950 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {value}{value !== 'all' && summary[value] ? ` (${summary[value]})` : ''}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[52rem]">
            <thead className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-500">
              <tr>
                <th className="p-4 font-semibold">Operator</th>
                <th className="p-4 font-semibold">Contact</th>
                <th className="p-4 font-semibold">Joined</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="5"><Spinner /></td></tr>
              ) : operators.length === 0 ? (
                <tr><td colSpan="5"><EmptyState message="No operators here." /></td></tr>
              ) : (
                operators.map((operator) => (
                  <tr key={operator._id} className="hover:bg-gray-50/60">
                    <td className="p-4">
                      <p className="font-bold text-gray-900">{operator.agencyName || operator.name}</p>
                      <p className="text-[10px] text-gray-400">{operator.name}</p>
                    </td>
                    <td className="p-4 text-xs text-gray-600">
                      <p>{operator.phone}</p>
                      <p className="text-[10px] text-gray-400">{operator.email || '—'}</p>
                    </td>
                    <td className="p-4 text-xs text-gray-500">{shortDate(operator.createdAt)}</td>
                    <td className="p-4">
                      <StatusPill status={operator.operatorApprovalStatus} />
                      {operator.isBlocked && (
                        <span className="ml-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-100 text-red-700">blocked</span>
                      )}
                      {operator.rejectionReason && (
                        <p className="text-[10px] text-gray-400 mt-1 max-w-[14rem]">{operator.rejectionReason}</p>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1.5">
                        {operator.operatorApprovalStatus !== 'approved' && (
                          <button type="button" disabled={busyId === operator._id} onClick={() => decide(operator, 'approved')}
                            className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
                            approve
                          </button>
                        )}
                        {operator.operatorApprovalStatus !== 'rejected' && (
                          <button type="button" disabled={busyId === operator._id} onClick={() => decide(operator, 'rejected')}
                            className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                            reject
                          </button>
                        )}
                        <button type="button" disabled={busyId === operator._id} onClick={() => toggleBlock(operator)}
                          className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase bg-white border border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600 disabled:opacity-50">
                          {operator.isBlocked ? 'unblock' : 'block'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Operators;
