/* Ported from Frontend/src/modules/Taxi/modules/admin/pages/drivers/GlobalDocuments.jsx (tools/port.js first pass). */
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, PencilLine, Plus, Search, Trash2 } from 'lucide-react-native';
import { useNavigate } from '../../../../../lib/webRouter';
import { adminService } from '../../services/adminService';
import { Button, Div, H1, H2, Input, Option, P, ScrollDiv, Select, Span, Table, Tbody, Td, Th, Thead, Tr, Icon as UiIcon } from '../../../../../components/web';
import { alert, window } from '../../../../../lib/webShim';
const inputClass =
  'w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-800 outline-none transition-colors focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400';
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
      <Button
        type="button"
        aria-checked={item.active ? 'true' : 'false'}
        accessibilityLabel={`Set ${item.name || item.field_key || 'item'} ${item.active ? 'inactive' : 'active'}`}
        disabled={isToggling}
        onClick={() => handleToggleStatus(item)}
        className={`inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs font-semibold transition whitespace-nowrap ${isToggling ? 'cursor-wait opacity-60' : 'cursor-pointer'}`}
      >
        <Span className={`relative shrink-0 flex items-center h-6 w-11 rounded-full p-0.5 transition-colors ${item.active ? 'bg-yellow-400' : 'bg-gray-300'}`}>
          <Span className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${item.active ? 'translate-x-5' : 'translate-x-0'}`} />
        </Span>
        <Span className={item.active ? 'text-gray-900' : 'text-gray-500'}>{isToggling ? 'Saving...' : item.active ? 'Active' : 'Inactive'}</Span>
      </Button>
    );
  };
  const renderActions = (item, templateType) => (
    <Div className="flex items-center justify-end gap-2">
      <Button
        type="button"
        onClick={() => navigate(`/taxi/admin/drivers/documents/edit/${item.id || item._id}?type=${templateType}`)}
        className="rounded-lg border border-gray-200 p-2 text-yellow-600 transition-colors hover:bg-yellow-50"
      >
        <UiIcon as={PencilLine} size={16} />
      </Button>
      <Button
        type="button"
        onClick={() => handleDelete(item.id || item._id, templateType === 'vehicle_field' ? 'vehicle field' : 'document')}
        className="rounded-lg border border-gray-200 p-2 text-rose-600 transition-colors hover:bg-rose-50"
      >
        <UiIcon as={Trash2} size={16} />
      </Button>
    </Div>
  );
  return (
    <ScrollDiv className="min-h-screen bg-[#F8FAFC] p-3 lg:p-4 font-sans text-gray-900">
      <Div className="mb-4">
        <Div className="mb-1 flex items-center gap-1.5 text-[11px] text-gray-500">
          <Span>Masters</Span>
          <UiIcon as={ChevronRight} size={10} />
          <Span className="text-gray-700">Driver Onboarding Config</Span>
        </Div>
        <Div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Div>
            <H1 className="text-base text-gray-900 font-bold">Driver Onboarding Config</H1>
            <P className="mt-0.5 text-xs text-gray-500">Manage both driver document templates and the dynamic fields shown on the vehicle onboarding step.</P>
          </Div>
          <Div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => navigate('/taxi/admin/drivers/documents/create?type=document')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-yellow-400 px-3 py-1.5 text-xs font-bold text-black transition-colors hover:bg-yellow-500 shadow-sm"
            >
              <UiIcon as={Plus} size={14} />
              Add Document
            </Button>
            <Button
              type="button"
              onClick={() => navigate('/taxi/admin/drivers/documents/create?type=vehicle_field')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-black transition-colors hover:bg-gray-50 shadow-sm"
            >
              <UiIcon as={Plus} size={14} />
              Add Vehicle Field
            </Button>
          </Div>
        </Div>
      </Div>

      <Div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
        <Div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Div className="flex items-center gap-2 text-xs text-gray-500">
            <Span>Show</Span>
            <Select
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value))}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400"
            >
              <Option value={10}>10</Option>
              <Option value={25}>25</Option>
              <Option value={50}>50</Option>
            </Select>
            <Span>entries</Span>
          </Div>

          <Div className="relative w-full lg:max-w-sm">
            <UiIcon as={Search} size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Filter documents or fields..."
              className={inputClass}
            />
          </Div>
        </Div>
      </Div>

      {error ? <Div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</Div> : null}

      <Div className="space-y-4">
        <Div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <Div className="border-b border-gray-100 px-4 py-3">
            <H2 className="text-sm text-gray-900 font-bold">Driver Needed Documents</H2>
            <P className="mt-0.5 text-xs text-gray-500">
              Templates used by the documents step of onboarding. Turn a document inactive here to hide it from `/taxi/driver/step-documents`.
            </P>
          </Div>
          <Div>
            <Table cols={[180, 150, 150, 120, 120]} className="min-w-full">
              <Thead className="bg-gray-50">
                <Tr>
                  <Th className="px-4 py-2.5 text-left text-xs font-bold text-gray-600">Name</Th>
                  <Th className="px-4 py-2.5 text-left text-xs font-bold text-gray-600">Account Type</Th>
                  <Th className="px-4 py-2.5 text-left text-xs font-bold text-gray-600">Image Type</Th>
                  <Th className="px-4 py-2.5 text-left text-xs font-bold text-gray-600">Status</Th>
                  <Th className="px-4 py-2.5 text-right text-xs font-bold text-gray-600">Action</Th>
                </Tr>
              </Thead>
              <Tbody className="divide-y divide-gray-100 whitespace-nowrap">
                {isLoading ? (
                  <Tr>
                    <Td colSpan="5" className="px-6 py-16 text-center text-sm text-gray-500">
                      Loading document templates...
                    </Td>
                  </Tr>
                ) : paginatedDocuments.length === 0 ? (
                  <Tr>
                    <Td colSpan="5" className="px-6 py-16 text-center text-sm text-gray-500">
                      No document templates found.
                    </Td>
                  </Tr>
                ) : (
                  paginatedDocuments.map((item) => (
                    <Tr key={item.id || item._id} className="hover:bg-gray-50/70 text-xs">
                      <Td className="px-4 py-2 font-semibold text-gray-900">{item.name}</Td>
                      <Td className="px-4 py-2 text-gray-700">{typeLabel(item.account_type)}</Td>
                      <Td className="px-4 py-2 text-gray-700">{typeLabel(item.image_type)}</Td>
                      <Td className="px-4 py-2">{renderStatusToggle(item)}</Td>
                      <Td className="px-4 py-2">{renderActions(item, 'document')}</Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          </Div>
        </Div>

        <Div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <Div className="border-b border-gray-100 px-4 py-3">
            <H2 className="text-sm text-gray-900 font-bold">Vehicle Step Fields</H2>
            <P className="mt-0.5 text-xs text-gray-500">
              These control which fields appear on `/taxi/driver/step-vehicle`, their labels, placeholders, order, and required state.
            </P>
          </Div>
          <Div>
            <Table cols={[170, 150, 130, 150, 90, 110, 120, 120]} className="min-w-full">
              <Thead className="bg-gray-50">
                <Tr>
                  <Th className="px-4 py-2.5 text-left text-xs font-bold text-gray-600">Label</Th>
                  <Th className="px-4 py-2.5 text-left text-xs font-bold text-gray-600">Field Key</Th>
                  <Th className="px-4 py-2.5 text-left text-xs font-bold text-gray-600">Field Type</Th>
                  <Th className="px-4 py-2.5 text-left text-xs font-bold text-gray-600">Account Type</Th>
                  <Th className="px-4 py-2.5 text-left text-xs font-bold text-gray-600">Order</Th>
                  <Th className="px-4 py-2.5 text-left text-xs font-bold text-gray-600">Required</Th>
                  <Th className="px-4 py-2.5 text-left text-xs font-bold text-gray-600">Status</Th>
                  <Th className="px-4 py-2.5 text-right text-xs font-bold text-gray-600">Action</Th>
                </Tr>
              </Thead>
              <Tbody className="divide-y divide-gray-100 whitespace-nowrap">
                {isLoading ? (
                  <Tr>
                    <Td colSpan="8" className="px-6 py-16 text-center text-sm text-gray-500">
                      Loading vehicle fields...
                    </Td>
                  </Tr>
                ) : paginatedVehicleFields.length === 0 ? (
                  <Tr>
                    <Td colSpan="8" className="px-6 py-16 text-center text-sm text-gray-500">
                      No vehicle fields found.
                    </Td>
                  </Tr>
                ) : (
                  paginatedVehicleFields.map((item, index) => (
                    <Tr key={item.id || item._id} className="hover:bg-gray-50/70 text-xs">
                      <Td className="px-4 py-2">
                        <Div className="font-semibold text-gray-900">{item.name}</Div>
                        {item.placeholder ? <Div className="mt-0.5 text-[10px] text-gray-500">{item.placeholder}</Div> : null}
                      </Td>
                      <Td className="px-4 py-2 text-gray-700">{item.field_key}</Td>
                      <Td className="px-4 py-2 text-gray-700">{typeLabel(item.field_type)}</Td>
                      <Td className="px-4 py-2 text-gray-700">{typeLabel(item.account_type)}</Td>
                      <Td className="px-4 py-2 text-gray-700">{index + 1}</Td>
                      <Td className="px-4 py-2">
                        <Span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.is_required ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}
                        >
                          {item.is_required ? 'Required' : 'Optional'}
                        </Span>
                      </Td>
                      <Td className="px-4 py-2">{renderStatusToggle(item)}</Td>
                      <Td className="px-4 py-2">{renderActions(item, 'vehicle_field')}</Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          </Div>
        </Div>
      </Div>
    </ScrollDiv>
  );
};
export default GlobalDocuments;
