import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  AlertCircle,
  Car,
  CheckCircle2,
  ChevronRight,
  Eye,
  FileText,
  Mail,
  MapPin,
  Maximize2,
  MessageSquare,
  Phone,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import {
  flattenDriverDocumentFields,
  getDocumentPreviewUrl,
  normalizeDriverDocumentTemplates,
} from '../../../driver/utils/documentTemplates';

const DriverAudit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [driver, setDriver] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchDriverData = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const [driverResponse, templateResponse] = await Promise.all([
        adminService.getDriver(id),
        adminService.getDriverNeededDocuments(),
      ]);

      setDriver(driverResponse?.data || null);
      setTemplates(
        normalizeDriverDocumentTemplates(templateResponse?.data?.results || []),
      );
    } catch (err) {
      setError(err?.message || 'Failed to fetch driver audit data');
      setDriver(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDriverData();
  }, [fetchDriverData]);

  const handleUpdateStatus = async (status) => {
    if (!window.confirm(`Are you sure you want to ${status === 'approve' ? 'APPROVE' : 'REJECT'} this driver?`)) {
      return;
    }

    setIsSubmitting(true);
    try {
      await adminService.updateDriverStatus(id, {
        approve: status === 'approve',
        status: status === 'approve' ? 'approved' : 'inactive',
      });
      alert(status === 'approve' ? 'Driver Approved Successfully' : 'Driver Rejected');
      navigate('/taxi/admin/drivers/pending');
    } catch (err) {
      alert(err?.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const mappedDocs = useMemo(() => {
    const fields = flattenDriverDocumentFields(templates);

    return fields.map((doc) => {
      const value = driver?.documents?.[doc.key];
      const previewUrl = getDocumentPreviewUrl(value);

      return {
        id: doc.key,
        name: doc.label,
        number: value?.fileName || 'N/A',
        expiry: doc.hasExpiryDate ? 'Not captured' : 'N/A',
        status: previewUrl ? 'Verified' : 'Pending',
        comment: previewUrl ? `Uploaded under ${doc.templateName}` : 'Missing',
        image: previewUrl,
      };
    });
  }, [driver?.documents, templates]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-neutral-100 border-t-black rounded-full animate-spin" />
        <p className="text-[12px] text-neutral-500">Accessing Verification Portal...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-6">
        <AlertCircle size={28} className="text-rose-500" />
        <p className="text-sm font-medium text-rose-500">{error}</p>
        <button onClick={fetchDriverData} className="px-5 py-2 rounded-xl bg-neutral-950 text-white text-xs font-medium">
          Retry
        </button>
      </div>
    );
  }

  if (!driver) {
    return null;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto pb-20 font-sans text-neutral-950">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/taxi/admin/drivers/pending')} className="p-2 bg-white border border-neutral-900/[0.08] rounded-xl hover:bg-neutral-50 text-neutral-500 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-medium text-neutral-900">Audit driver application</h1>
            <div className="flex items-center gap-2 text-xs text-neutral-500 mt-1 leading-none">
              <span>Fleet control</span>
              <ChevronRight size={12} />
              <span>Verification</span>
              <ChevronRight size={12} />
              <span className="text-[#0a4d2b]">Audit {driver.name}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={isSubmitting}
            onClick={() => handleUpdateStatus('reject')}
            className="bg-rose-50 border border-rose-100 text-rose-600 px-6 py-2.5 rounded-xl text-[13px] font-medium hover:bg-rose-100 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <XCircle size={18} /> Reject
          </button>
          <button
            disabled={isSubmitting}
            onClick={() => handleUpdateStatus('approve')}
            className="bg-neutral-900 text-white px-8 py-2.5 rounded-xl text-[13px] font-medium hover:bg-neutral-800 transition-colors shadow-xl flex items-center gap-2 disabled:opacity-50"
          >
            <ShieldCheck size={18} /> Approve driver
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8 items-start">
        <div className="col-span-12 lg:col-span-3 space-y-6">
          <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-8 text-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-5 grayscale -rotate-12 translate-x-4">
              <Car size={100} />
            </div>
            <div className="relative w-28 h-28 mx-auto mb-6 ring-4 ring-neutral-50 rounded-full shadow-2xl overflow-hidden transition-transform bg-neutral-50 flex items-center justify-center">
              <ShieldCheck size={42} className="text-[#0a4d2b]" />
            </div>
            <h3 className="text-xl font-medium text-neutral-900 leading-none">{driver.name}</h3>
            <div className="mt-3 flex flex-col items-center gap-1.5">
              <span className="font-mono font-medium text-xs text-[#0a4d2b] bg-neutral-50 px-2 py-0.5 rounded shadow-sm border border-neutral-200">
                {driver.driver_code || driver.referralCode || (driver.phone ? `DRV${String(driver.phone).slice(-4)}${String(driver._id || '').slice(-6).toUpperCase()}`.replace(/\W/g, '') : 'N/A')}
              </span>
              <p className="text-xs text-neutral-500">ID: {driver._id}</p>
            </div>

            <div className="mt-8 space-y-4 text-left border-t border-neutral-50 pt-8">
              {[
                { icon: Phone, label: 'Phone', val: driver.phone || 'N/A' },
                { icon: Mail, label: 'Email', val: driver.email || 'N/A' },
                { icon: MapPin, label: 'City', val: driver.city || 'N/A' },
                { icon: Car, label: 'Vehicle', val: `${driver.transport_type || 'N/A'} (${driver.vehicle_number || 'N/A'})` },
              ].map((item) => (
                <div key={item.label} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-neutral-500">
                    <item.icon size={13} />
                    <span className="text-xs font-medium">{item.label}</span>
                  </div>
                  <p className="text-[13px] font-medium text-neutral-700 ml-5">{item.val}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-neutral-950 rounded-2xl p-8 text-white space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h4 className="text-xs text-neutral-500">Compliance check</h4>
              <div className="w-2 h-2 rounded-full bg-[#0a4d2b] animate-pulse text-white" />
            </div>
            <div className="space-y-4">
              {[
                { label: 'Documents', status: driver.approve ? 'Verified' : 'In Review', color: 'text-[#0a4d2b]' },
                { label: 'Account', status: driver.approve ? 'Approved' : 'Pending', color: driver.approve ? 'text-emerald-400' : 'text-[#0a4d2b]' },
                { label: 'Panel Access', status: driver.approve ? 'Allowed' : 'Blocked', color: driver.approve ? 'text-emerald-400' : 'text-rose-400' },
              ].map((step) => (
                <div key={step.label} className="flex items-center justify-between">
                  <span className="text-[12px] text-neutral-500">{step.label}</span>
                  <span className={`text-xs font-medium   ${step.color}`}>{step.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-9 space-y-4">
          <div className="bg-white rounded-xl border border-neutral-900/[0.08] overflow-hidden">
            <div className="p-6 border-b border-neutral-50 flex items-center justify-between">
              <h3 className="text-[14px] font-medium text-neutral-900">Document audit checklist</h3>
              <div className="flex items-center gap-2 px-3 py-1 bg-neutral-50 border border-neutral-100 rounded-lg text-xs text-neutral-500">
                Total Items: {mappedDocs.length}
              </div>
            </div>
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-neutral-50/50 text-xs text-neutral-500 border-b border-neutral-50">
                    <th className="px-6 py-5">Document name</th>
                    <th className="px-5 py-5">Identify number</th>
                    <th className="px-5 py-5">Expiry date</th>
                    <th className="px-5 py-5 text-center">Status</th>
                    <th className="px-5 py-5">Comment</th>
                    <th className="px-5 py-5 text-center">Document</th>
                    <th className="px-6 py-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {mappedDocs.map((doc) => (
                    <tr key={doc.id} className="group hover:bg-neutral-50/30 transition-colors">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${doc.image ? 'bg-emerald-50 text-emerald-500 border-emerald-100' : 'bg-neutral-50 text-neutral-500 border-neutral-100'}`}>
                            <FileText size={14} />
                          </div>
                          <span className="text-[13px] font-medium text-neutral-950">{doc.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-5 text-[12px] text-neutral-500">{doc.number}</td>
                      <td className="px-5 py-5 text-[12px] text-neutral-500">{doc.expiry}</td>
                      <td className="px-5 py-5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium   border shadow-sm ${doc.status === 'Verified' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="px-5 py-5">
                        <p className="text-[12px] text-neutral-500 truncate max-w-[150px]">{doc.comment}</p>
                      </td>
                      <td className="px-5 py-5 text-center">
                        {doc.image ? (
                          <div className="relative inline-block group/img">
                            <img src={doc.image} className="w-10 h-7 object-cover rounded shadow-sm border border-neutral-200" alt="doc preview" />
                            <button className="absolute inset-0 bg-neutral-900/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center rounded">
                              <Maximize2 size={10} className="text-white" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-neutral-300">Missing</span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button className="p-2 text-neutral-500 hover:text-[#0a4d2b] hover:bg-white rounded-lg transition-colors" title="View details">
                            <Eye size={16} />
                          </button>
                          <button className="p-2 text-neutral-500 hover:text-emerald-500 hover:bg-white rounded-lg transition-colors" title="Quick verify">
                            <CheckCircle2 size={16} />
                          </button>
                          <button className="p-2 text-neutral-500 hover:text-rose-500 hover:bg-white rounded-lg transition-colors" title="Add Note/Reject">
                            <MessageSquare size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-neutral-50/50 border border-dashed border-neutral-200 rounded-2xl p-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl border flex items-center justify-center bg-neutral-100 text-neutral-500">
                <AlertCircle size={24} />
              </div>
              <div>
                <p className="text-[14px] font-medium text-neutral-950">Batch actions</p>
                <p className="text-[12px] text-neutral-500">Use the approve button after checking uploaded documents</p>
              </div>
            </div>
            <button className="px-6 py-3 bg-white border border-neutral-900/[0.08] text-neutral-950 text-[12px] font-medium rounded-xl hover:bg-neutral-50 transition-colors">
              Re-audit all documents
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverAudit;
