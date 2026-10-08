/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/drivers/GlobalDocuments.jsx (tools/port.js first pass). */
import React, { useEffect, useMemo, useState } from 'react';
import { FileText, PencilLine, Plus, Search, Trash2 } from 'lucide-react-native';
import { useNavigate } from '../../../../../lib/webRouter';
import { adminService } from '../../services/adminService';
import {
  AdminPage,
  PageHeader,
  Card,
  SectionTitle,
  Toolbar,
  DataTable,
  THead,
  TBody,
  Row,
  Cell,
  StatusBadge,
  TableSkeleton,
  EmptyState,
  ErrorState,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
} from '../../../../../admin/ui';
import { Button, Div, Input, Option, P, Select, Span, Icon as UiIcon } from '../../../../../components/web';
import { Switch } from '../../../../../components/shadcn';
import { alert, window } from '../../../../../lib/webShim';
const DOC_COLS = [160, 130, 130, 120, 100];
const FIELD_COLS = [160, 130, 120, 130, 70, 110, 120, 100];
const typeLabel = (value) =>
  String(value || '')
    .split('_')
    .filter(Boolean)
    .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
    .join(' ');
const vehicleFieldOrder = [
  'locationId',
  'serviceCategories',
  'vehicleTypeId',
  'make',
  'model',
  'year',
  'number',
  'color',
  'companyName',
  'companyAddress',
  'city',
  'postalCode',
  'taxNumber',
];
const getVehicleFieldPriority = (fieldKey = '') => {
  const index = vehicleFieldOrder.indexOf(String(fieldKey || '').trim());
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
};
const GlobalDocuments = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [vehicleFields, setVehicleFields] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [error, setError] = useState('');
  const [togglingIds, setTogglingIds] = useState({});
  const loadItems = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [documentResponse, fieldResponse] = await Promise.all([
        adminService.getDriverNeededDocuments('document'),
        adminService.getDriverNeededDocuments('vehicle_field'),
      ]);
      const nextDocuments = documentResponse?.data?.data?.results || documentResponse?.data?.results || [];
      const nextVehicleFields = fieldResponse?.data?.data?.results || fieldResponse?.data?.results || [];
      setDocuments(Array.isArray(nextDocuments) ? nextDocuments : []);
      setVehicleFields(Array.isArray(nextVehicleFields) ? nextVehicleFields : []);
    } catch (err) {
      setError(err?.message || 'Unable to load onboarding configuration');
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    loadItems();
  }, []);
  const handleDelete = async (id, entityLabel) => {
    if (!(await window.confirmAsync(`Delete this ${entityLabel}?`))) {
      return;
    }
    try {
      await adminService.deleteDriverNeededDocument(id);
      await loadItems();
    } catch (err) {
      alert(err?.message || `Unable to delete ${entityLabel}`);
    }
  };
  const handleToggleStatus = async (item) => {
    const itemId = item.id || item._id;
    setTogglingIds((current) => ({
      ...current,
      [itemId]: true,
    }));
    try {
      await adminService.updateDriverNeededDocument(itemId, {
        active: !item.active,
      });
      setDocuments((current) =>
        current.map((entry) =>
          (entry.id || entry._id) === itemId
            ? {
                ...entry,
                active: !item.active,
                status: !item.active ? 'active' : 'inactive',
              }
            : entry,
        ),
      );
      setVehicleFields((current) =>
        current.map((entry) =>
          (entry.id || entry._id) === itemId
            ? {
                ...entry,
                active: !item.active,
                status: !item.active ? 'active' : 'inactive',
              }
            : entry,
        ),
      );
    } catch (err) {
      alert(err?.message || 'Unable to update status');
    } finally {
      setTogglingIds((current) => {
        const next = {
          ...current,
        };
        delete next[itemId];
        return next;
      });
    }
  };
  const filteredDocuments = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return documents;
    return documents.filter((item) =>
      [item.name, item.account_type, item.image_type].filter(Boolean).some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [documents, searchTerm]);
  const filteredVehicleFields = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return vehicleFields;
    return vehicleFields.filter((item) =>
      [item.name, item.field_key, item.field_type, item.account_type, item.field_group]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [vehicleFields, searchTerm]);
  const paginatedDocuments = filteredDocuments.slice(0, Number(pageSize));
  const paginatedVehicleFields = [...filteredVehicleFields]
    .sort((a, b) => {
      const priorityDifference = getVehicleFieldPriority(a.field_key) - getVehicleFieldPriority(b.field_key);
      if (priorityDifference !== 0) {
        return priorityDifference;
      }
      return Number(a.sort_order || 0) - Number(b.sort_order || 0);
    })
    .slice(0, Number(pageSize));
  const renderStatusToggle = (item) => {
    const itemId = item.id || item._id;
    const isToggling = Boolean(togglingIds[itemId]);
    return (
      <Div className="flex-row items-center gap-2">
        <Switch
          checked={Boolean(item.active)}
          disabled={isToggling}
          onCheckedChange={() => handleToggleStatus(item)}
        />
        <Span className="text-xs text-slate-500">{isToggling ? 'Saving…' : item.active ? 'Active' : 'Inactive'}</Span>
      </Div>
    );
  };
  const renderActions = (item, templateType) => (
    <Div className="flex-row items-center gap-1">
      <Button
        type="button"
        onClick={() => navigate(`/taxi/admin/drivers/documents/edit/${item.id || item._id}?type=${templateType}`)}
        accessibilityLabel={`Edit ${item.name || 'item'}`}
        className="w-11 h-11 rounded-lg items-center justify-center"
      >
        <UiIcon as={PencilLine} size={16} className="text-slate-600" />
      </Button>
      <Button
        type="button"
        onClick={() => handleDelete(item.id || item._id, templateType === 'vehicle_field' ? 'vehicle field' : 'document')}
        accessibilityLabel={`Delete ${item.name || 'item'}`}
        className="w-11 h-11 rounded-lg items-center justify-center"
      >
        <UiIcon as={Trash2} size={16} className="text-red-600" />
      </Button>
    </Div>
  );
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={FileText}
        title="Driver Onboarding Config"
        subtitle="Document templates and the dynamic vehicle-step fields"
        breadcrumb={[{ label: 'Masters' }, { label: 'Driver Onboarding Config' }]}
        actions={
          <>
            <Button type="button" onClick={() => navigate('/taxi/admin/drivers/documents/create?type=document')} className={BTN_PRIMARY}>
              <UiIcon as={Plus} size={16} className="text-white" />
              <Span className={BTN_TEXT_PRIMARY}>Add document</Span>
            </Button>
            <Button type="button" onClick={() => navigate('/taxi/admin/drivers/documents/create?type=vehicle_field')} className={BTN_SECONDARY}>
              <UiIcon as={Plus} size={16} className="text-slate-700" />
              <Span className={BTN_TEXT_SECONDARY}>Add vehicle field</Span>
            </Button>
          </>
        }
      />

      <Card className="mb-4">
        <Toolbar className="mb-0">
          <Div className="flex-row items-center gap-2 flex-1 min-w-[180px]">
            <UiIcon as={Search} size={16} className="text-slate-400" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Filter documents or fields"
              className={`${INPUT} flex-1`}
            />
          </Div>
          <Select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))} className={INPUT}>
            <Option value={10}>Show 10</Option>
            <Option value={25}>Show 25</Option>
            <Option value={50}>Show 50</Option>
          </Select>
        </Toolbar>
      </Card>

      {error ? (
        <ErrorState title="Could not load configuration" message={error} onRetry={loadItems} className="mb-4" />
      ) : null}

      <Card className="mb-4">
        <SectionTitle>Driver needed documents</SectionTitle>
        <P className="text-sm text-slate-500 mb-3">
          Templates used by the documents step of onboarding. Turn a document inactive here to hide it from the driver app.
        </P>
        {isLoading ? (
          <TableSkeleton rows={4} />
        ) : paginatedDocuments.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No document templates"
            message={searchTerm ? 'No template matches this filter.' : 'Add a document to require it during onboarding.'}
            actionLabel="Add document"
            onAction={() => navigate('/taxi/admin/drivers/documents/create?type=document')}
            className="py-8"
          />
        ) : (
          <DataTable cols={DOC_COLS}>
            <THead cols={DOC_COLS} labels={['Name', 'Account type', 'Image type', 'Status', 'Actions']} />
            <TBody>
              {paginatedDocuments.map((item, i) => (
                <Row key={item.id || item._id} last={i === paginatedDocuments.length - 1}>
                  <Cell width={DOC_COLS[0]}>
                    <Span className="text-sm font-semibold text-slate-900">{item.name}</Span>
                  </Cell>
                  <Cell width={DOC_COLS[1]}>{typeLabel(item.account_type)}</Cell>
                  <Cell width={DOC_COLS[2]}>{typeLabel(item.image_type)}</Cell>
                  <Cell width={DOC_COLS[3]}>{renderStatusToggle(item)}</Cell>
                  <Cell width={DOC_COLS[4]}>{renderActions(item, 'document')}</Cell>
                </Row>
              ))}
            </TBody>
          </DataTable>
        )}
      </Card>

      <Card>
        <SectionTitle>Vehicle step fields</SectionTitle>
        <P className="text-sm text-slate-500 mb-3">
          These control which fields appear on the vehicle onboarding step, their labels, placeholders, order and required state.
        </P>
        {isLoading ? (
          <TableSkeleton rows={4} />
        ) : paginatedVehicleFields.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No vehicle fields"
            message={searchTerm ? 'No field matches this filter.' : 'Add a field to collect it on the vehicle step.'}
            actionLabel="Add vehicle field"
            onAction={() => navigate('/taxi/admin/drivers/documents/create?type=vehicle_field')}
            className="py-8"
          />
        ) : (
          <DataTable cols={FIELD_COLS}>
            <THead cols={FIELD_COLS} labels={['Label', 'Field key', 'Field type', 'Account type', 'Order', 'Required', 'Status', 'Actions']} />
            <TBody>
              {paginatedVehicleFields.map((item, index) => (
                <Row key={item.id || item._id} last={index === paginatedVehicleFields.length - 1}>
                  <Cell width={FIELD_COLS[0]}>
                    <Div className="gap-0.5">
                      <P className="text-sm font-semibold text-slate-900">{item.name}</P>
                      {item.placeholder ? <P className="text-xs text-slate-500">{item.placeholder}</P> : null}
                    </Div>
                  </Cell>
                  <Cell width={FIELD_COLS[1]}>{item.field_key}</Cell>
                  <Cell width={FIELD_COLS[2]}>{typeLabel(item.field_type)}</Cell>
                  <Cell width={FIELD_COLS[3]}>{typeLabel(item.account_type)}</Cell>
                  <Cell width={FIELD_COLS[4]} align="center">{index + 1}</Cell>
                  <Cell width={FIELD_COLS[5]}>
                    <StatusBadge tone={item.is_required ? 'warning' : 'neutral'} label={item.is_required ? 'Required' : 'Optional'} />
                  </Cell>
                  <Cell width={FIELD_COLS[6]}>{renderStatusToggle(item)}</Cell>
                  <Cell width={FIELD_COLS[7]}>{renderActions(item, 'vehicle_field')}</Cell>
                </Row>
              ))}
            </TBody>
          </DataTable>
        )}
      </Card>
    </AdminPage>
  );
};
export default GlobalDocuments;
