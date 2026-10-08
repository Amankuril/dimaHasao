/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/drivers/DriverAudit.jsx (tools/port.js first pass). */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  AlertCircle,
  Car,
  CheckCircle2,
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
import { Button, Div, Img, P, Span, Icon as UiIcon } from '../../../../../components/web';
import { alert, window } from '../../../../../lib/webShim';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  DataTable,
  THead,
  TBody,
  Row,
  Cell,
  StatusBadge,
  LoadingState,
  EmptyState,
  ErrorState,
  useLayoutWidth,
  BTN_PRIMARY,
  BTN_DANGER,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
} from '../../../../../admin/ui';
const COLS = [180, 150, 130, 120, 170, 110, 150];
const DriverAudit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { tablet } = useLayoutWidth();
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
  const backButton = (
    <Button onClick={() => navigate('/taxi/admin/drivers/pending')} className={BTN_SECONDARY}>
      <UiIcon as={ArrowLeft} size={16} className="text-slate-700" />
      <Span className={BTN_TEXT_SECONDARY}>Back</Span>
    </Button>
  );
  if (isLoading) {
    return (
      <AdminPage maxWidth={1200}>
        <PageHeader icon={ShieldCheck} title="Audit driver application" subtitle="Loading the verification record" breadcrumb={[{ label: 'Drivers' }, { label: 'Verification' }, { label: 'Audit' }]} />
        <LoadingState label="Opening the verification record…" />
      </AdminPage>
    );
  }
  if (error) {
    return (
      <AdminPage maxWidth={1200}>
        <PageHeader
          icon={ShieldCheck}
          title="Audit driver application"
          breadcrumb={[{ label: 'Drivers' }, { label: 'Verification' }, { label: 'Audit' }]}
          actions={backButton}
        />
        <ErrorState title="Could not load this audit" message={error} onRetry={fetchDriverData} />
      </AdminPage>
    );
  }
  if (!driver) {
    return (
      <AdminPage maxWidth={1200}>
        <PageHeader
          icon={ShieldCheck}
          title="Audit driver application"
          breadcrumb={[{ label: 'Drivers' }, { label: 'Verification' }, { label: 'Audit' }]}
          actions={backButton}
        />
        <EmptyState title="Driver not found" message="This application is no longer in the verification queue." actionLabel="Back to pending drivers" onAction={() => navigate('/taxi/admin/drivers/pending')} />
      </AdminPage>
    );
  }
  const driverCode =
    driver.driver_code ||
    driver.referralCode ||
    (driver.phone
      ? `DRV${String(driver.phone).slice(-4)}${String(driver._id || '')
          .slice(-6)
          .toUpperCase()}`.replace(/\W/g, '')
      : 'N/A');
  const details = [
    { icon: Phone, label: 'Phone', val: driver.phone || 'N/A' },
    { icon: Mail, label: 'Email', val: driver.email || 'N/A' },
    { icon: MapPin, label: 'City', val: driver.city || 'N/A' },
    { icon: Car, label: 'Vehicle', val: `${driver.transport_type || 'N/A'} (${driver.vehicle_number || 'N/A'})` },
  ];
  const compliance = [
    { label: 'Documents', status: driver.approve ? 'Verified' : 'Review' },
    { label: 'Account', status: driver.approve ? 'Approved' : 'Pending' },
    { label: 'Panel access', status: driver.approve ? 'Approved' : 'Blocked' },
  ];
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={ShieldCheck}
        title="Audit driver application"
        subtitle={`${driver.name || 'Driver'} · ${driverCode}`}
        breadcrumb={[{ label: 'Drivers' }, { label: 'Verification' }, { label: `Audit ${driver.name || ''}`.trim() }]}
        actions={
          <>
            <Button disabled={isSubmitting} onClick={() => handleUpdateStatus('approve')} className={`${BTN_PRIMARY} ${isSubmitting ? 'opacity-50' : ''}`}>
              <UiIcon as={ShieldCheck} size={16} className="text-white" />
              <Span className={BTN_TEXT_PRIMARY}>Approve driver</Span>
            </Button>
            <Button disabled={isSubmitting} onClick={() => handleUpdateStatus('reject')} className={`${BTN_DANGER} ${isSubmitting ? 'opacity-50' : ''}`}>
              <UiIcon as={XCircle} size={16} className="text-white" />
              <Span className={BTN_TEXT_PRIMARY}>Reject</Span>
            </Button>
            {backButton}
          </>
        }
      />

      <Div className={`gap-4 mb-4 ${tablet ? 'flex-row items-start' : 'flex-col'}`}>
        <Card className={tablet ? 'flex-1' : ''}>
          <SectionTitle>Applicant</SectionTitle>
          <Div className="flex-row items-center gap-3 mb-3">
            <Div className="w-12 h-12 rounded-full bg-blue-100 items-center justify-center">
              <UiIcon as={ShieldCheck} size={22} className="text-blue-600" />
            </Div>
            <Div className="flex-1 min-w-0">
              <P className="text-base font-semibold text-slate-900" numberOfLines={1}>
                {driver.name || 'Unknown'}
              </P>
              <P className="text-xs text-slate-500 mt-0.5" numberOfLines={1}>
                {driverCode}
              </P>
            </Div>
          </Div>
          <Div className="gap-3 border-t border-slate-100 pt-3">
            {details.map((item) => (
              <Div key={item.label} className="flex-row items-start gap-2">
                <UiIcon as={item.icon} size={14} className="text-slate-400 mt-0.5" />
                <Div className="flex-1 min-w-0">
                  <P className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</P>
                  <P className="text-sm text-slate-700 mt-0.5">{item.val}</P>
                </Div>
              </Div>
            ))}
            <Div className="flex-row items-start gap-2">
              <UiIcon as={FileText} size={14} className="text-slate-400 mt-0.5" />
              <Div className="flex-1 min-w-0">
                <P className="text-xs font-semibold uppercase tracking-wide text-slate-500">Record id</P>
                <P className="text-sm text-slate-700 mt-0.5">{driver._id}</P>
              </Div>
            </Div>
          </Div>
        </Card>

        <Card className={tablet ? 'flex-1' : ''}>
          <SectionTitle>Compliance check</SectionTitle>
          <Div className="gap-3">
            {compliance.map((step) => (
              <Div key={step.label} className="flex-row items-center justify-between gap-3">
                <Span className="text-sm text-slate-700 flex-1">{step.label}</Span>
                <StatusBadge status={step.status} />
              </Div>
            ))}
          </Div>
        </Card>
      </Div>

      <SectionTitle>{`Document audit checklist · ${mappedDocs.length} items`}</SectionTitle>
      {mappedDocs.length === 0 ? (
        <EmptyState icon={FileText} title="No document templates" message="No driver document templates are configured, so there is nothing to audit yet." />
      ) : (
        <DataTable cols={COLS}>
          <THead cols={COLS} labels={['Document', 'Identity number', 'Expiry', 'Status', 'Comment', 'Preview', 'Action']} />
          <TBody>
            {mappedDocs.map((doc, index) => (
              <Row key={doc.id} last={index === mappedDocs.length - 1}>
                <Cell width={COLS[0]}>
                  <Div className="flex-row items-center gap-2">
                    <Div className={`w-8 h-8 rounded-lg items-center justify-center ${doc.image ? 'bg-green-100' : 'bg-slate-100'}`}>
                      <UiIcon as={FileText} size={14} className={doc.image ? 'text-green-700' : 'text-slate-500'} />
                    </Div>
                    <Span className="text-sm font-medium text-slate-900 flex-1">{doc.name}</Span>
                  </Div>
                </Cell>
                <Cell width={COLS[1]}>{doc.number}</Cell>
                <Cell width={COLS[2]}>{doc.expiry}</Cell>
                <Cell width={COLS[3]}>
                  <StatusBadge status={doc.status} />
                </Cell>
                <Cell width={COLS[4]}>{doc.comment}</Cell>
                <Cell width={COLS[5]}>
                  {doc.image ? (
                    <Img src={doc.image} className="w-12 h-9 rounded border border-slate-200" alt={`${doc.name} preview`} />
                  ) : (
                    <Span className="text-xs text-slate-400">Missing</Span>
                  )}
                </Cell>
                <Cell width={COLS[6]}>
                  <Div className="flex-row items-center gap-0.5">
                    <Button accessibilityLabel={`Preview ${doc.name}`} className="h-11 w-11 items-center justify-center rounded-lg">
                      <UiIcon as={Eye} size={16} className="text-slate-500" />
                    </Button>
                    <Button accessibilityLabel={`Mark ${doc.name} verified`} className="h-11 w-11 items-center justify-center rounded-lg">
                      <UiIcon as={CheckCircle2} size={16} className="text-slate-500" />
                    </Button>
                    <Button accessibilityLabel={`Comment on ${doc.name}`} className="h-11 w-11 items-center justify-center rounded-lg">
                      <UiIcon as={MessageSquare} size={16} className="text-slate-500" />
                    </Button>
                  </Div>
                </Cell>
              </Row>
            ))}
          </TBody>
        </DataTable>
      )}

      <Card className="mt-4">
        <SectionTitle>Batch actions</SectionTitle>
        <Div className="flex-row items-start gap-3 mb-3">
          <UiIcon as={AlertCircle} size={16} className="text-slate-400 mt-0.5" />
          <P className="text-sm text-slate-700 flex-1">Use the approve button above once every uploaded document has been checked.</P>
        </Div>
        <Button className={`${BTN_SECONDARY} self-start`}>
          <Span className={BTN_TEXT_SECONDARY}>Re-audit all documents</Span>
        </Button>
      </Card>
    </AdminPage>
  );
};
export default DriverAudit;
