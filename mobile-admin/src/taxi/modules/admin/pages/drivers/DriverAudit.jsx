/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/drivers/DriverAudit.jsx (tools/port.js first pass). */
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
  MessageSquare,
  Phone,
  ShieldCheck,
  XCircle,
} from 'lucide-react-native';
import { useNavigate, useParams } from '../../../../../lib/webRouter';
import { adminService } from '../../services/adminService';
import { flattenDriverDocumentFields, getDocumentPreviewUrl, normalizeDriverDocumentTemplates } from '../../../driver/utils/documentTemplates';
import { Button, Div, H1, H3, H4, Img, P, ScrollDiv, Span, Table, Tbody, Td, Th, Thead, Tr, Icon as UiIcon } from '../../../../../components/web';
import { alert, window } from '../../../../../lib/webShim';
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
      const [driverResponse, templateResponse] = await Promise.all([adminService.getDriver(id), adminService.getDriverNeededDocuments()]);
      setDriver(driverResponse?.data || null);
      setTemplates(normalizeDriverDocumentTemplates(templateResponse?.data?.results || []));
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
    if (!(await window.confirmAsync(`Are you sure you want to ${status === 'approve' ? 'APPROVE' : 'REJECT'} this driver?`))) {
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
      <ScrollDiv className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Div className="w-12 h-12 border-4 border-gray-100 border-t-black rounded-full animate-spin" />
        <P className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Accessing Verification Portal...</P>
      </ScrollDiv>
    );
  }
  if (error) {
    return (
      <ScrollDiv className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-6">
        <UiIcon as={AlertCircle} size={28} className="text-rose-500" />
        <P className="text-sm font-bold text-rose-500">{error}</P>
        <Button onClick={fetchDriverData} className="px-5 py-2 rounded-xl bg-gray-950 text-white text-xs font-black uppercase tracking-widest">
          Retry
        </Button>
      </ScrollDiv>
    );
  }
  if (!driver) {
    return null;
  }
  return (
    <ScrollDiv className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto pb-20 font-sans text-gray-950">
      <Div className="flex items-center justify-between">
        <Div className="flex items-center gap-4">
          <Button
            onClick={() => navigate('/taxi/admin/drivers/pending')}
            className="p-2 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 text-gray-500 transition-all shadow-sm"
          >
            <UiIcon as={ArrowLeft} size={20} />
          </Button>
          <Div>
            <H1 className="text-xl font-black tracking-tight text-gray-900 uppercase">AUDIT DRIVER APPLICATION</H1>
            <Div className="flex items-center gap-2 text-[11px] font-bold text-gray-400 mt-1 uppercase tracking-widest leading-none">
              <Span>Fleet Control</Span>
              <UiIcon as={ChevronRight} size={12} />
              <Span>Verification</Span>
              <UiIcon as={ChevronRight} size={12} />
              <Span className="text-indigo-600">Audit {driver.name}</Span>
            </Div>
          </Div>
        </Div>
        <Div className="flex items-center gap-2">
          <Button
            disabled={isSubmitting}
            onClick={() => handleUpdateStatus('reject')}
            className="bg-rose-50 border border-rose-100 text-rose-600 px-6 py-2.5 rounded-xl text-[13px] font-black hover:bg-rose-100 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <UiIcon as={XCircle} size={18} /> REJECT
          </Button>
          <Button
            disabled={isSubmitting}
            onClick={() => handleUpdateStatus('approve')}
            className="bg-indigo-600 text-white px-8 py-2.5 rounded-xl text-[13px] font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center gap-2 uppercase tracking-widest disabled:opacity-50"
          >
            <UiIcon as={ShieldCheck} size={18} /> APPROVE DRIVER
          </Button>
        </Div>
      </Div>

      <Div className="grid grid-cols-12 gap-8 items-start">
        <Div className="col-span-12 lg:col-span-3 space-y-6">
          <Div className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm text-center relative overflow-hidden group">
            <Div className="absolute top-0 right-0 p-6 opacity-5 grayscale -rotate-12 translate-x-4">
              <UiIcon as={Car} size={100} />
            </Div>
            <Div className="relative w-28 h-28 mx-auto mb-6 ring-4 ring-gray-50 rounded-full shadow-2xl overflow-hidden group-hover:scale-105 transition-transform bg-gray-50 flex items-center justify-center">
              <UiIcon as={ShieldCheck} size={42} className="text-indigo-600" />
            </Div>
            <H3 className="text-xl font-black text-gray-900 tracking-tight leading-none">{driver.name}</H3>
            <Div className="mt-3 flex flex-col items-center gap-1.5">
              <Span className="font-mono font-semibold text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded shadow-sm border border-indigo-100">
                {driver.driver_code ||
                  driver.referralCode ||
                  (driver.phone
                    ? `DRV${String(driver.phone).slice(-4)}${String(driver._id || '')
                        .slice(-6)
                        .toUpperCase()}`.replace(/\W/g, '')
                    : 'N/A')}
              </Span>
              <P className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">ID: {driver._id}</P>
            </Div>

            <Div className="mt-8 space-y-4 text-left border-t border-gray-50 pt-8">
              {[
                {
                  icon: Phone,
                  label: 'Phone',
                  val: driver.phone || 'N/A',
                },
                {
                  icon: Mail,
                  label: 'Email',
                  val: driver.email || 'N/A',
                },
                {
                  icon: MapPin,
                  label: 'City',
                  val: driver.city || 'N/A',
                },
                {
                  icon: Car,
                  label: 'Vehicle',
                  val: `${driver.transport_type || 'N/A'} (${driver.vehicle_number || 'N/A'})`,
                },
              ].map((item) => (
                <Div key={item.label} className="flex flex-col gap-1">
                  <Div className="flex items-center gap-2 text-gray-400">
                    <UiIcon as={item.icon} size={13} />
                    <Span className="text-[10px] font-black uppercase tracking-widest">{item.label}</Span>
                  </Div>
                  <P className="text-[13px] font-bold text-gray-700 ml-5">{item.val}</P>
                </Div>
              ))}
            </Div>
          </Div>

          <Div className="bg-gray-950 rounded-[32px] p-8 text-white space-y-6 shadow-2xl">
            <Div className="flex items-center justify-between border-b border-white/10 pb-4">
              <H4 className="text-[11px] font-black uppercase tracking-widest text-gray-500">Compliance Check</H4>
              <Div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            </Div>
            <Div className="space-y-4">
              {[
                {
                  label: 'Documents',
                  status: driver.approve ? 'Verified' : 'In Review',
                  color: 'text-amber-400',
                },
                {
                  label: 'Account',
                  status: driver.approve ? 'Approved' : 'Pending',
                  color: driver.approve ? 'text-emerald-400' : 'text-amber-400',
                },
                {
                  label: 'Panel Access',
                  status: driver.approve ? 'Allowed' : 'Blocked',
                  color: driver.approve ? 'text-emerald-400' : 'text-rose-400',
                },
              ].map((step) => (
                <Div key={step.label} className="flex items-center justify-between">
                  <Span className="text-[12px] font-bold text-gray-400">{step.label}</Span>
                  <Span className={`text-[10px] font-black uppercase tracking-widest ${step.color}`}>{step.status}</Span>
                </Div>
              ))}
            </Div>
          </Div>
        </Div>

        <Div className="col-span-12 lg:col-span-9 space-y-4">
          <Div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
            <Div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <H3 className="text-[14px] font-black text-gray-900 uppercase tracking-widest">Document Audit Checklist</H3>
              <Div className="flex items-center gap-2 px-3 py-1 bg-gray-50 border border-gray-100 rounded-lg text-[10px] font-black uppercase text-gray-400">
                Total Items: {mappedDocs.length}
              </Div>
            </Div>
            <Div>
              <Table cols={[200, 150, 130, 120, 180, 110, 132]} className="w-full text-left">
                <Thead>
                  <Tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                    <Th className="px-6 py-5">Document Name</Th>
                    <Th className="px-5 py-5">Identify Number</Th>
                    <Th className="px-5 py-5">Expiry Date</Th>
                    <Th className="px-5 py-5 text-center">Status</Th>
                    <Th className="px-5 py-5">Comment</Th>
                    <Th className="px-5 py-5 text-center">Document</Th>
                    <Th className="px-6 py-5 text-right">Action</Th>
                  </Tr>
                </Thead>
                <Tbody className="divide-y divide-gray-50">
                  {mappedDocs.map((doc) => (
                    <Tr key={doc.id} className="group hover:bg-gray-50/30 transition-all">
                      <Td className="px-6 py-5">
                        <Div className="flex items-center gap-3">
                          <Div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center border ${doc.image ? 'bg-emerald-50 text-emerald-500 border-emerald-100' : 'bg-gray-50 text-gray-500 border-gray-100'}`}
                          >
                            <UiIcon as={FileText} size={14} />
                          </Div>
                          <Span className="text-[13px] font-black text-gray-950 tracking-tight">{doc.name}</Span>
                        </Div>
                      </Td>
                      <Td className="px-5 py-5 text-[12px] font-bold text-gray-500">{doc.number}</Td>
                      <Td className="px-5 py-5 text-[12px] font-bold text-gray-500">{doc.expiry}</Td>
                      <Td className="px-5 py-5 text-center">
                        <Span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm ${doc.status === 'Verified' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}
                        >
                          {doc.status}
                        </Span>
                      </Td>
                      <Td className="px-5 py-5">
                        <P className="text-[12px] font-bold text-gray-400 italic truncate max-w-[150px]">{doc.comment}</P>
                      </Td>
                      <Td className="px-5 py-5 text-center">
                        {doc.image ? (
                          <Img src={doc.image} className="w-10 h-7 object-cover rounded shadow-sm border border-gray-200" alt="doc preview" />
                        ) : (
                          <Span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Missing</Span>
                        )}
                      </Td>
                      <Td className="px-6 py-5 text-right">
                        <Div className="flex items-center justify-end gap-1">
                          <Button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all">
                            <UiIcon as={Eye} size={16} />
                          </Button>
                          <Button className="p-2 text-gray-400 hover:text-emerald-500 hover:bg-white rounded-lg transition-all">
                            <UiIcon as={CheckCircle2} size={16} />
                          </Button>
                          <Button className="p-2 text-gray-400 hover:text-rose-500 hover:bg-white rounded-lg transition-all">
                            <UiIcon as={MessageSquare} size={16} />
                          </Button>
                        </Div>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Div>
          </Div>

          <Div className="bg-gray-50/50 border border-dashed border-gray-200 rounded-[32px] p-8 flex items-center justify-between">
            <Div className="flex items-center gap-4">
              <Div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center text-indigo-500">
                <UiIcon as={AlertCircle} size={24} />
              </Div>
              <Div>
                <P className="text-[14px] font-black text-gray-950 uppercase tracking-widest">Batch Actions</P>
                <P className="text-[12px] font-bold text-gray-400">Use the approve button after checking uploaded documents.</P>
              </Div>
            </Div>
            <Button className="px-6 py-3 bg-white border border-gray-100 text-gray-950 text-[12px] font-black uppercase tracking-widest rounded-2xl hover:bg-gray-50 transition-all shadow-sm">
              RE-AUDIT ALL DOCUMENTS
            </Button>
          </Div>
        </Div>
      </Div>
    </ScrollDiv>
  );
};
export default DriverAudit;
