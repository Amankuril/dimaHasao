/* Ported from Frontend/src/modules/Food/pages/admin/DeliveryBoyCommission.jsx (tools/port.js first pass). */
import { useState, useMemo, useEffect } from 'react';
import { Search, Edit, Trash2, IndianRupee, Settings, Check, MapPin, Loader2 } from 'lucide-react-native';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/shadcn';
import { adminAPI } from '../../../api/food';
import { API_BASE_URL } from '../../../api/config';
import { toast } from '../../../lib/notify';
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
  Field,
  INPUT,
  INPUT_ERROR,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_DANGER,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../admin/ui';
import { Button, Div, Input, Option, Select, Span, Icon as UiIcon } from '../../../components/web';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
export default function DeliveryBoyCommission() {
  const { tablet } = useLayoutWidth();
  const [searchQuery, setSearchQuery] = useState('');
  const [commissions, setCommissions] = useState([]);
  const [zones, setZones] = useState([]);
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [zonesLoading, setZonesLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    minDistance: '',
    maxDistance: '',
    maxDistanceUnlimited: false,
    commissionPerKm: '',
    basePayout: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [visibleColumns, setVisibleColumns] = useState({
    si: true,
    name: true,
    distanceSlab: true,
    commissionPerKm: true,
    basePayout: true,
    status: true,
    actions: true,
  });
  const filteredCommissions = useMemo(() => {
    if (!searchQuery.trim()) {
      return commissions;
    }
    const query = searchQuery.toLowerCase().trim();
    return commissions.filter(
      (commission) =>
        commission.name.toLowerCase().includes(query) ||
        `0-${commission.minDistance} km`.toLowerCase().includes(query) ||
        (commission.maxDistance !== null && `${commission.minDistance}-${commission.maxDistance} km`.toLowerCase().includes(query)),
    );
  }, [commissions, searchQuery]);
  const getDistanceSlabLabel = (commission) => {
    const min = Number(commission.minDistance) || 0;
    const max = commission.maxDistance === null || commission.maxDistance === undefined ? null : Number(commission.maxDistance);
    if (max === null) return `${min}+ km`;
    return `${min}-${max} km`;
  };

  // Calculate total commission for a given distance
  const calculateTotalCommission = (commission, distance) => {
    // Check if distance falls within this commission tier
    if (distance < commission.minDistance) return 0;
    if (commission.maxDistance !== null && distance > commission.maxDistance) return 0;

    // For 0-x slab we usually want per-km on full distance; for other slabs apply per-km after minDistance
    const min = Number(commission.minDistance) || 0;
    const extraDistance = Math.max(0, distance - min);
    const kmForRate = min === 0 ? distance : extraDistance;
    return commission.basePayout + kmForRate * commission.commissionPerKm;
  };

  // Calculate example commission for display (using mid-point of range)
  const getExampleCommission = (commission) => {
    if (commission.maxDistance === null) {
      const exampleDistance = commission.minDistance + 5; // Example: 10km for 10+ km tier
      return calculateTotalCommission(commission, exampleDistance);
    }
    const midDistance = (commission.minDistance + commission.maxDistance) / 2;
    return calculateTotalCommission(commission, midDistance);
  };
  useEffect(() => {
    const fetchZones = async () => {
      try {
        setZonesLoading(true);
        const res = await adminAPI.getZones({
          limit: 1000,
        });
        const zoneData = res?.data?.data;
        const list = Array.isArray(zoneData?.zones) ? zoneData.zones : Array.isArray(zoneData) ? zoneData : [];
        setZones(list);
        if (list.length > 0) {
          setSelectedZoneId(String(list[0]._id || list[0].id));
        }
      } catch (error) {
        debugError('Error fetching zones:', error);
        toast.error('Failed to load zones');
        setZones([]);
      } finally {
        setZonesLoading(false);
      }
    };
    fetchZones();
  }, []);

  // Fetch commission rules when zone changes
  useEffect(() => {
    if (!selectedZoneId) {
      setCommissions([]);
      setLoading(false);
      return;
    }
    fetchCommissionRules();
  }, [selectedZoneId]);
  const fetchCommissionRules = async () => {
    if (!selectedZoneId) return;
    try {
      setLoading(true);
      const response = await adminAPI.getCommissionRules({
        zoneId: selectedZoneId,
      });

      // Handle different response structures
      let commissionsData = null;
      if (response?.data?.success && response?.data?.data?.commissions) {
        commissionsData = response.data.data.commissions;
      } else if (response?.data?.data?.commissions) {
        commissionsData = response.data.data.commissions;
      } else if (response?.data?.commissions) {
        commissionsData = response.data.commissions;
      }
      if (commissionsData && Array.isArray(commissionsData)) {
        // Add serial numbers based on array index
        const commissionsWithSl = commissionsData.map((commission, index) => ({
          ...commission,
          sl: index + 1,
        }));
        setCommissions(commissionsWithSl);
      } else {
        setCommissions([]);
      }
    } catch (error) {
      debugError('Error fetching commission rules:', error);
      debugError('Error details:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        method: error.config?.method,
        baseURL: error.config?.baseURL,
      });

      // Handle network errors
      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        const errorMessage = `Cannot connect to backend server. Please ensure the backend is running on ${API_BASE_URL.replace('/api', '')}`;
        toast.error(errorMessage);
        debugError('?? Backend connection issue. Check:');
        debugError('   1. Is backend server running? (npm start in backend folder)');
        debugError(`   2. Is backend running on ${API_BASE_URL.replace('/api', '')}?`);
        debugError('   3. Check browser console for CORS errors');
        setCommissions([]);
        return;
      }
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch payout rules';
      toast.error(errorMessage);
      setCommissions([]);
    } finally {
      setLoading(false);
    }
  };
  const handleToggleStatus = async (commission) => {
    try {
      const newStatus = !commission.status;
      await adminAPI.toggleCommissionRuleStatus(commission._id, newStatus);
      setCommissions(
        commissions.map((c) =>
          c._id === commission._id
            ? {
                ...c,
                status: newStatus,
              }
            : c,
        ),
      );
      toast.success('Payout rule status updated successfully');
    } catch (error) {
      debugError('Error toggling status:', error);
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };
  const handleAdd = () => {
    if (!selectedZoneId) {
      toast.error('Please select a zone first');
      return;
    }
    setSelectedCommission(null);
    setFormData({
      name: '',
      minDistance: '0',
      maxDistance: '',
      maxDistanceUnlimited: false,
      commissionPerKm: '',
      basePayout: '',
    });
    setFormErrors({});
    setIsAddEditOpen(true);
  };
  const handleEdit = (commission) => {
    setSelectedCommission(commission);
    const isUnlimited = commission.maxDistance === null || commission.maxDistance === undefined;
    setFormData({
      name: commission.name,
      minDistance: commission.minDistance?.toString?.() || '',
      maxDistance: isUnlimited ? '' : String(commission.maxDistance),
      maxDistanceUnlimited: isUnlimited,
      commissionPerKm: commission.commissionPerKm.toString(),
      basePayout: commission.basePayout.toString(),
    });
    setFormErrors({});
    setIsAddEditOpen(true);
  };
  const handleDelete = (commission) => {
    setSelectedCommission(commission);
    setIsDeleteOpen(true);
  };
  const confirmDelete = async () => {
    if (!selectedCommission) return;
    try {
      setDeleting(true);
      await adminAPI.deleteCommissionRule(selectedCommission._id);
      setCommissions(commissions.filter((commission) => commission._id !== selectedCommission._id));
      setIsDeleteOpen(false);
      setSelectedCommission(null);
      toast.success('Payout rule deleted successfully');
    } catch (error) {
      debugError('Error deleting commission rule:', error);
      toast.error(error.response?.data?.message || 'Failed to delete payout rule');
    } finally {
      setDeleting(false);
    }
  };
  const validateForm = () => {
    const errors = {};
    if (!formData.minDistance.trim() || parseFloat(formData.minDistance) < 0) {
      errors.minDistance = 'Minimum distance must be 0 or greater';
    }
    if (!formData.maxDistanceUnlimited && formData.maxDistance !== '' && parseFloat(formData.maxDistance) < parseFloat(formData.minDistance || '0')) {
      errors.maxDistance = 'Max distance must be greater than or equal to min distance';
    }
    if (!formData.commissionPerKm.trim() || parseFloat(formData.commissionPerKm) < 0) {
      errors.commissionPerKm = 'Amount per km must be 0 or greater';
    }
    if (!formData.basePayout.trim() || parseFloat(formData.basePayout) < 0) {
      errors.basePayout = 'Base payout must be 0 or greater';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  const handleSave = async () => {
    if (!validateForm()) return;
    try {
      setSaving(true);
      const minDistance = parseFloat(formData.minDistance);
      const maxDistance = formData.maxDistanceUnlimited || formData.maxDistance === '' ? null : parseFloat(formData.maxDistance);
      const commissionData = {
        zoneId: selectedZoneId,
        name: formData.name.trim() || `Base (0-${minDistance} km)`,
        minDistance,
        maxDistance,
        commissionPerKm: parseFloat(formData.commissionPerKm),
        basePayout: parseFloat(formData.basePayout),
        status: selectedCommission ? selectedCommission.status : true,
      };
      if (selectedCommission) {
        // Update existing commission
        const response = await adminAPI.updateCommissionRule(selectedCommission._id, commissionData);
        let commission = null;
        if (response?.data?.success && response?.data?.data?.commission) {
          commission = response.data.data.commission;
        } else if (response?.data?.data?.commission) {
          commission = response.data.data.commission;
        } else if (response?.data?.commission) {
          commission = response.data.commission;
        }
        if (commission) {
          const updatedCommission = {
            ...commission,
            sl: selectedCommission.sl,
          };
          setCommissions(commissions.map((c) => (c._id === selectedCommission._id ? updatedCommission : c)));
          toast.success('Payout rule updated successfully');
        }
      } else {
        const response = await adminAPI.createCommissionRule(commissionData);
        let commission = null;
        if (response?.data?.success && response?.data?.data?.commission) {
          commission = response.data.data.commission;
        } else if (response?.data?.data?.commission) {
          commission = response.data.data.commission;
        } else if (response?.data?.commission) {
          commission = response.data.commission;
        }
        if (commission) {
          const newCommission = {
            ...commission,
            sl: commissions.length + 1,
          };
          setCommissions([...commissions, newCommission]);
          toast.success('Payout rule created successfully');
        }
      }
      setIsAddEditOpen(false);
      setFormData({
        name: '',
        minDistance: '0',
        maxDistance: '',
        commissionPerKm: '',
        basePayout: '',
      });
      setSelectedCommission(null);
    } catch (error) {
      debugError('Error saving commission rule:', error);
      debugError('Error details:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        method: error.config?.method,
        baseURL: error.config?.baseURL,
      });

      // Log full response data for debugging
      if (error.response?.data) {
        debugError('Full error response:', JSON.stringify(error.response.data, null, 2));
      }

      // Handle network errors
      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        const errorMessage = `Cannot connect to backend server. Please ensure the backend is running on ${API_BASE_URL.replace('/api', '')}`;
        toast.error(errorMessage);
        debugError('?? Backend connection issue. Check:');
        debugError('   1. Is backend server running? (npm start in backend folder)');
        debugError(`   2. Is backend running on ${API_BASE_URL.replace('/api', '')}?`);
        debugError('   3. Check browser console for CORS errors');
        return;
      }

      // Handle other errors - extract message from different possible response structures
      let errorMessage = 'Failed to save payout rule';
      if (error.response?.data) {
        if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.errors) {
          // Handle validation errors
          const errors = error.response.data.errors;
          if (Array.isArray(errors)) {
            errorMessage = errors.join(', ');
          } else if (typeof errors === 'object') {
            errorMessage = Object.values(errors).join(', ');
          }
        }
      } else {
        errorMessage = error.message || errorMessage;
      }
      toast.error(errorMessage);

      // Set form errors if validation errors from backend
      if (error.response?.data?.errors) {
        setFormErrors(error.response.data.errors);
      } else if (error.response?.data?.message) {
        // If backend returns a single error message, try to parse it
        const message = error.response.data.message;
        if (message.includes('overlap')) {
          setFormErrors({
            overlap: message,
          });
        } else if (message.includes('name')) {
          setFormErrors({
            name: message,
          });
        } else if (message.includes('distance')) {
          setFormErrors({
            minDistance: message,
            maxDistance: message,
          });
        }
      }
    } finally {
      setSaving(false);
    }
  };
  const toggleColumn = (columnKey) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [columnKey]: !prev[columnKey],
    }));
  };
  const resetColumns = () => {
    setVisibleColumns({
      si: true,
      name: true,
      distanceSlab: true,
      commissionPerKm: true,
      basePayout: true,
      totalCommission: true,
      status: true,
      actions: true,
    });
  };
  const columnsConfig = {
    si: 'Serial Number',
    name: 'Name',
    distanceSlab: 'Distance Slab (km)',
    commissionPerKm: 'Amount Per/Km',
    basePayout: 'Base Payout',
    status: 'Status',
    actions: 'Actions',
  };

  // Dialog labels follow the rule currently being edited.
  const formMinDistance = Number(formData.minDistance !== '' ? formData.minDistance : selectedCommission?.minDistance);
  const dialogMinDistance = Number.isFinite(formMinDistance) ? formMinDistance : 0;
  const formMaxRaw = formData.maxDistanceUnlimited || formData.maxDistance === '' ? null : Number(formData.maxDistance);
  const dialogBaseCoverage =
    dialogMinDistance === 0 && formMaxRaw != null && Number.isFinite(formMaxRaw)
      ? `0-${formMaxRaw}`
      : dialogMinDistance === 0
        ? '0'
        : String(dialogMinDistance);
  const columnDefs = [
    { key: 'si', label: 'SI', width: 60 },
    { key: 'name', label: 'Name', width: 190 },
    { key: 'distanceSlab', label: 'Distance slab (km)', width: 170 },
    { key: 'commissionPerKm', label: 'Amount per km (₹)', width: 140 },
    { key: 'basePayout', label: 'Base payout (₹)', width: 140 },
    { key: 'status', label: 'Status', width: 110 },
    { key: 'actions', label: 'Action', width: 110 },
  ].filter((col) => visibleColumns[col.key]);
  const tableCols = columnDefs.map((col) => col.width);
  const widthOf = (key) => columnDefs.find((col) => col.key === key)?.width ?? 0;
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={IndianRupee}
        title="Delivery boy payout"
        subtitle="Distance slabs that decide what a delivery partner earns per order, per zone."
        breadcrumb={[{ label: 'Food' }, { label: 'Delivery' }, { label: 'Payout rules' }]}
        actions={
          <>
            <Button onClick={handleAdd} disabled={!selectedZoneId} className={BTN_PRIMARY}>
              <Span className={BTN_TEXT_PRIMARY}>Add rule</Span>
            </Button>
            <Button onClick={() => setIsSettingsOpen(true)} accessibilityLabel="Table settings" className={BTN_SECONDARY}>
              <UiIcon as={Settings} size={16} className="text-slate-600" />
              <Span className={BTN_TEXT_SECONDARY}>Columns</Span>
            </Button>
          </>
        }
      />

      <Card className="mb-3 flex-row items-start gap-3">
        <UiIcon as={MapPin} size={18} className="text-blue-600 mt-0.5" />
        <Div className="flex-1 gap-1">
          <Span className="text-sm font-semibold text-slate-900">Fixed + extra distance payout</Span>
          <Span className="text-sm text-slate-700">
            Payout is the base payout of the 0-km slab plus, for every slab, the km inside it times that slab&apos;s amount per km. Example: ₹25 base for
            0-2 km, then ₹5/km after 2 km, so 6 km earns ₹25 + (4 × ₹5) = ₹45.
          </Span>
          <Span className="text-sm text-slate-500">
            Only the slab whose min distance is 0 can carry a base payout. Every other slab keeps base payout at 0 and uses amount per km alone.
          </Span>
        </Div>
      </Card>

      <Card className="mb-3">
        <SectionTitle>{loading ? 'Payout rules' : `Payout rules · ${filteredCommissions.length}`}</SectionTitle>
        <Toolbar className="mb-0">
          <Div className="flex-1 min-w-[160px]">
            <Field label="Zone">
              <Select
                nativeID="payout-zone-select"
                value={selectedZoneId}
                onChange={(e) => setSelectedZoneId(e.target.value)}
                className={INPUT}
                disabled={zonesLoading || zones.length === 0}
              >
                {zones.length === 0 ? (
                  <Option value="">No zones</Option>
                ) : (
                  zones.map((zone) => (
                    <Option key={zone._id || zone.id} value={zone._id || zone.id}>
                      {zone.name || zone.zoneName || 'Unnamed Zone'}
                    </Option>
                  ))
                )}
              </Select>
            </Field>
          </Div>
          <Div className="flex-1 min-w-[180px]">
            <Field label="Search">
              <Div className="flex-row items-center gap-2">
                <UiIcon as={Search} size={16} className="text-slate-400" />
                <Input
                  type="text"
                  placeholder="Name or distance"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`${INPUT} flex-1`}
                />
              </Div>
            </Field>
          </Div>
        </Toolbar>
      </Card>

      {loading ? (
        <TableSkeleton rows={5} />
      ) : filteredCommissions.length === 0 ? (
        <EmptyState
          title="No payout rules found"
          message={selectedZoneId ? 'Add a distance slab to start paying delivery partners for this zone.' : 'Pick a zone first, then add a distance slab.'}
          actionLabel={selectedZoneId ? 'Add rule' : undefined}
          onAction={selectedZoneId ? handleAdd : undefined}
        />
      ) : (
        <DataTable cols={tableCols}>
          <THead cols={tableCols} labels={columnDefs.map((col) => col.label)} />
          <TBody>
            {filteredCommissions.map((commission, i) => (
              <Row key={commission.sl} last={i === filteredCommissions.length - 1}>
                {visibleColumns.si ? <Cell width={widthOf('si')}>{String(commission.sl)}</Cell> : null}
                {visibleColumns.name ? (
                  <Cell width={widthOf('name')}>
                    <Span className="text-sm font-semibold text-slate-900">{commission.name}</Span>
                  </Cell>
                ) : null}
                {visibleColumns.distanceSlab ? (
                  <Cell width={widthOf('distanceSlab')}>
                    <Div className="gap-0.5">
                      <Span className="text-sm font-semibold text-slate-900">{getDistanceSlabLabel(commission)}</Span>
                      <Span className="text-xs text-slate-500">
                        {Number(commission.minDistance) === 0 ? 'Base payout slab' : 'Per-km slab'}
                      </Span>
                    </Div>
                  </Cell>
                ) : null}
                {visibleColumns.commissionPerKm ? (
                  <Cell width={widthOf('commissionPerKm')} align="right">
                    <Span className="text-sm font-semibold text-slate-900">{`₹${commission.commissionPerKm}`}</Span>
                  </Cell>
                ) : null}
                {visibleColumns.basePayout ? (
                  <Cell width={widthOf('basePayout')} align="right">
                    <Span className="text-sm font-semibold text-slate-900">{`₹${commission.basePayout}`}</Span>
                  </Cell>
                ) : null}
                {visibleColumns.status ? (
                  <Cell width={widthOf('status')}>
                    <Button
                      onClick={() => handleToggleStatus(commission)}
                      accessibilityLabel={commission.status ? 'Disable this rule' : 'Enable this rule'}
                      className="h-11 justify-center"
                    >
                      <StatusBadge status={commission.status ? 'active' : 'inactive'} label={commission.status ? 'Active' : 'Inactive'} />
                    </Button>
                  </Cell>
                ) : null}
                {visibleColumns.actions ? (
                  <Cell width={widthOf('actions')}>
                    <Div className="flex-row items-center gap-1">
                      <Button
                        onClick={() => handleEdit(commission)}
                        accessibilityLabel="Edit rule"
                        className="w-11 h-11 rounded-lg border border-slate-200 bg-white items-center justify-center"
                      >
                        <UiIcon as={Edit} size={16} className="text-blue-700" />
                      </Button>
                      <Button
                        onClick={() => handleDelete(commission)}
                        accessibilityLabel="Delete rule"
                        className="w-11 h-11 rounded-lg border border-slate-200 bg-white items-center justify-center"
                      >
                        <UiIcon as={Trash2} size={16} className="text-red-600" />
                      </Button>
                    </Div>
                  </Cell>
                ) : null}
              </Row>
            ))}
          </TBody>
        </DataTable>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isAddEditOpen} onOpenChange={setIsAddEditOpen}>
        <DialogContent className="max-w-md bg-white p-0">
          <DialogHeader className="px-4 pt-4 pb-3 border-b border-slate-200">
            <DialogTitle className="text-base font-semibold text-slate-900">{selectedCommission ? 'Edit payout rule' : 'Add payout rule'}</DialogTitle>
          </DialogHeader>
          <Div className="px-4 py-4 gap-3">
            {formErrors.overlap ? (
              <Div className="flex-row items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                <Span className="text-xs text-red-700 flex-1">{formErrors.overlap}</Span>
              </Div>
            ) : null}
            <Field label="Rule name" error={formErrors.name} hint={`Leave empty for “Base (${dialogBaseCoverage} km)”`}>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    name: e.target.value,
                  })
                }
                className={formErrors.name ? INPUT_ERROR : INPUT}
                placeholder={`e.g., Base (${dialogBaseCoverage} km)`}
              />
            </Field>
            <Div className={tablet ? 'flex-row gap-3' : 'gap-3'}>
              <Field label="Minimum distance slab (km)" required error={formErrors.minDistance} className={tablet ? 'flex-1' : null}>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.minDistance}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      minDistance: e.target.value,
                    })
                  }
                  className={formErrors.minDistance ? INPUT_ERROR : INPUT}
                  placeholder="e.g., 4"
                />
              </Field>
              <Field
                label="Maximum distance slab (km)"
                error={formErrors.maxDistance}
                hint={`Optional — unlimited means ${formData.minDistance || 0}+ km`}
                className={tablet ? 'flex-1' : null}
              >
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.maxDistance}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxDistanceUnlimited: false,
                      maxDistance: e.target.value,
                    })
                  }
                  disabled={Boolean(formData.maxDistanceUnlimited)}
                  className={formErrors.maxDistance ? INPUT_ERROR : INPUT}
                  placeholder="e.g., 3 (or tick Unlimited)"
                />
              </Field>
            </Div>
            <Div className="flex-row items-center gap-2">
              <Input
                type="checkbox"
                checked={Boolean(formData.maxDistanceUnlimited)}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxDistanceUnlimited: e.target.checked,
                    maxDistance: e.target.checked ? '' : formData.maxDistance,
                  })
                }
              />
              <Span className="text-sm text-slate-700 flex-1">Unlimited maximum distance</Span>
            </Div>
            <Div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <Span className="text-sm text-slate-700">
                {`Distance slab: ${
                  formData.maxDistanceUnlimited || !formData.maxDistance
                    ? `${formData.minDistance || 0}+ km`
                    : `${formData.minDistance || 0}-${formData.maxDistance} km`
                }`}
              </Span>
            </Div>
            <Field label="Extra per kilometer (₹)" required error={formErrors.commissionPerKm}>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.commissionPerKm}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    commissionPerKm: e.target.value,
                  })
                }
                className={formErrors.commissionPerKm ? INPUT_ERROR : INPUT}
                placeholder="e.g., 5"
              />
            </Field>
            <Field
              label={`Fixed base payout${dialogMinDistance === 0 ? ` for ${dialogBaseCoverage} km` : ''} (₹)`}
              required
              error={formErrors.basePayout}
              hint={
                dialogMinDistance === 0
                  ? 'Base payout is flat for the 0-km slab. Amount per km applies only to km inside each slab.'
                  : 'Non-base slabs keep base payout at 0; only amount per km is used for km inside this slab.'
              }
            >
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.basePayout}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    basePayout: e.target.value,
                  })
                }
                className={formErrors.basePayout ? INPUT_ERROR : INPUT}
                placeholder="e.g., 25"
              />
            </Field>
          </Div>
          <DialogFooter className="px-4 py-3 border-t border-slate-200 gap-2 flex-row">
            <Button onClick={() => setIsAddEditOpen(false)} className={`${BTN_SECONDARY} flex-1`}>
              <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
            </Button>
            <Button onClick={handleSave} disabled={saving} className={`${BTN_PRIMARY} flex-1`}>
              {saving ? <UiIcon as={Loader2} size={16} className="text-white" /> : null}
              <Span className={BTN_TEXT_PRIMARY}>{selectedCommission ? 'Update' : 'Add'}</Span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md bg-white p-0">
          <DialogHeader className="px-4 pt-4 pb-3 border-b border-slate-200">
            <DialogTitle className="text-base font-semibold text-slate-900">Delete payout rule</DialogTitle>
          </DialogHeader>
          <Div className="px-4 py-4">
            <Span className="text-sm text-slate-700">{`Delete “${selectedCommission?.name || ''}”? This cannot be undone.`}</Span>
          </Div>
          <DialogFooter className="px-4 py-3 border-t border-slate-200 gap-2 flex-row">
            <Button onClick={() => setIsDeleteOpen(false)} className={`${BTN_SECONDARY} flex-1`}>
              <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
            </Button>
            <Button onClick={confirmDelete} disabled={deleting} className={`${BTN_DANGER} flex-1`}>
              {deleting ? <UiIcon as={Loader2} size={16} className="text-white" /> : null}
              <Span className={BTN_TEXT_PRIMARY}>Delete</Span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-md bg-white p-0">
          <DialogHeader className="px-4 pt-4 pb-3 border-b border-slate-200">
            <DialogTitle className="text-base font-semibold text-slate-900">Table settings</DialogTitle>
          </DialogHeader>
          <Div className="px-4 py-4">
            <SectionTitle>Visible columns</SectionTitle>
            <Div className="gap-1">
              {Object.entries(columnsConfig).map(([key, label]) => (
                <Div key={key} className="flex-row items-center gap-3 h-11">
                  <Input type="checkbox" checked={visibleColumns[key]} onChange={() => toggleColumn(key)} />
                  <Span className="text-sm text-slate-700 flex-1">{label}</Span>
                  {visibleColumns[key] ? <UiIcon as={Check} size={16} className="text-green-700" /> : null}
                </Div>
              ))}
            </Div>
          </Div>
          <DialogFooter className="px-4 py-3 border-t border-slate-200 gap-2 flex-row">
            <Button onClick={resetColumns} className={`${BTN_SECONDARY} flex-1`}>
              <Span className={BTN_TEXT_SECONDARY}>Reset</Span>
            </Button>
            <Button onClick={() => setIsSettingsOpen(false)} className={`${BTN_PRIMARY} flex-1`}>
              <Span className={BTN_TEXT_PRIMARY}>Apply</Span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
