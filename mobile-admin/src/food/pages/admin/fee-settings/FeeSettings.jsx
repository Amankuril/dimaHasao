/* Ported from Frontend/src/modules/Food/pages/admin/fee-settings/FeeSettings.jsx (tools/port.js first pass). */
import { useState, useEffect, useMemo } from 'react';
import { Save, Loader2, IndianRupee, Plus, Trash2, Edit, Check, X } from 'lucide-react-native';
import { adminAPI } from '../../../../api/food';
import { toast } from '../../../../lib/notify';
import { Button as HButton, Div, Input, Option, Select, Span, Icon as UiIcon } from '../../../../components/web';
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
  LoadingState,
  EmptyState,
  Field,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../admin/ui';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
const emptyFeeSettings = () => ({
  deliveryFee: '',
  deliveryFeeRanges: [],
  freeDeliveryUpTo: '',
  platformFee: '',
  packagingFee: '',
  gstRate: '',
});
const normalizeFeeSettings = (settings) => ({
  deliveryFee: settings?.deliveryFee === '' || settings?.deliveryFee == null ? '' : Number(settings.deliveryFee),
  freeDeliveryUpTo: settings?.freeDeliveryUpTo === '' || settings?.freeDeliveryUpTo == null ? '' : Number(settings.freeDeliveryUpTo),
  platformFee: settings?.platformFee === '' || settings?.platformFee == null ? '' : Number(settings.platformFee),
  packagingFee: settings?.packagingFee === '' || settings?.packagingFee == null ? '' : Number(settings.packagingFee),
  gstRate: settings?.gstRate === '' || settings?.gstRate == null ? '' : Number(settings.gstRate),
  deliveryFeeRanges: Array.isArray(settings?.deliveryFeeRanges)
    ? settings.deliveryFeeRanges
        .map((r) => ({
          min: Number(r.min),
          max: Number(r.max),
          fee: Number(r.fee),
        }))
        .sort((a, b) => a.min - b.min)
    : [],
});
const feeSettingsEqual = (a, b) => JSON.stringify(normalizeFeeSettings(a)) === JSON.stringify(normalizeFeeSettings(b));

// Fee Settings Component - Range-based delivery fee configuration
export default function FeeSettings() {
  const [feeSettings, setFeeSettings] = useState(emptyFeeSettings);
  const [savedFeeSettings, setSavedFeeSettings] = useState(emptyFeeSettings);
  const [zones, setZones] = useState([]);
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [zonesLoading, setZonesLoading] = useState(true);
  const [loadingFeeSettings, setLoadingFeeSettings] = useState(false);
  const [savingFeeSettings, setSavingFeeSettings] = useState(false);
  const [editingRangeIndex, setEditingRangeIndex] = useState(null);
  const [newRange, setNewRange] = useState({
    min: '',
    max: '',
    fee: '',
  });
  const isDirty = useMemo(() => !feeSettingsEqual(feeSettings, savedFeeSettings), [feeSettings, savedFeeSettings]);

  // Fetch fee settings for selected zone
  const fetchFeeSettings = async (zoneId) => {
    if (!zoneId) {
      const empty = emptyFeeSettings();
      setFeeSettings(empty);
      setSavedFeeSettings(empty);
      return;
    }
    try {
      setLoadingFeeSettings(true);
      const response = await adminAPI.getFeeSettings({
        zoneId,
      });
      if (response.data.success && response.data.data.feeSettings) {
        const next = {
          deliveryFee: response.data.data.feeSettings.deliveryFee ?? '',
          deliveryFeeRanges: response.data.data.feeSettings.deliveryFeeRanges || [],
          freeDeliveryUpTo: response.data.data.feeSettings.freeDeliveryUpTo ?? '',
          platformFee: response.data.data.feeSettings.platformFee ?? '',
          packagingFee: response.data.data.feeSettings.packagingFee ?? '',
          gstRate: response.data.data.feeSettings.gstRate ?? '',
        };
        setFeeSettings(next);
        setSavedFeeSettings(next);
      } else if (response.data.success && response.data.data.feeSettings === null) {
        // Not configured yet - keep empty fields (no defaults).
        const empty = emptyFeeSettings();
        setFeeSettings(empty);
        setSavedFeeSettings(empty);
      }
    } catch (error) {
      debugError('Error fetching fee settings:', error);
      toast.error('Failed to load fee settings');
    } finally {
      setLoadingFeeSettings(false);
    }
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
  useEffect(() => {
    if (!selectedZoneId) return;
    fetchFeeSettings(selectedZoneId);
    setEditingRangeIndex(null);
    setNewRange({
      min: '',
      max: '',
      fee: '',
    });
  }, [selectedZoneId]);

  // Save fee settings
  const handleSaveFeeSettings = async () => {
    if (!selectedZoneId) {
      toast.error('Please select a zone first');
      return;
    }
    if (!isDirty) return;
    try {
      setSavingFeeSettings(true);
      const response = await adminAPI.createOrUpdateFeeSettings({
        zoneId: selectedZoneId,
        deliveryFee: feeSettings.deliveryFee === '' ? undefined : Number(feeSettings.deliveryFee),
        deliveryFeeRanges: feeSettings.deliveryFeeRanges,
        freeDeliveryUpTo: feeSettings.freeDeliveryUpTo === '' ? undefined : Number(feeSettings.freeDeliveryUpTo),
        platformFee: feeSettings.platformFee === '' ? undefined : Number(feeSettings.platformFee),
        packagingFee: feeSettings.packagingFee === '' ? undefined : Number(feeSettings.packagingFee),
        gstRate: feeSettings.gstRate === '' ? undefined : Number(feeSettings.gstRate),
        isActive: true,
      });
      if (response.data.success) {
        toast.success('Fee settings saved successfully');
        // Avoid an extra API call; update local state from response
        const saved = response?.data?.data?.feeSettings;
        if (saved) {
          const next = {
            deliveryFee: saved.deliveryFee ?? '',
            deliveryFeeRanges: saved.deliveryFeeRanges ?? [],
            freeDeliveryUpTo: saved.freeDeliveryUpTo ?? '',
            platformFee: saved.platformFee ?? '',
            packagingFee: saved.packagingFee ?? '',
            gstRate: saved.gstRate ?? '',
          };
          setFeeSettings(next);
          setSavedFeeSettings(next);
        } else {
          setSavedFeeSettings(feeSettings);
        }
      } else {
        toast.error(response.data.message || 'Failed to save fee settings');
      }
    } catch (error) {
      debugError('Error saving fee settings:', error);
      toast.error(error.response?.data?.message || 'Failed to save fee settings');
    } finally {
      setSavingFeeSettings(false);
    }
  };

  // Add new delivery fee range
  const handleAddRange = () => {
    if (newRange.min === '' || newRange.max === '' || newRange.fee === '') {
      toast.error('Please fill all fields (Min, Max, Fee)');
      return;
    }
    const min = Number(newRange.min);
    const max = Number(newRange.max);
    const fee = Number(newRange.fee);
    if (min < 0 || max < 0 || fee < 0) {
      toast.error('All values must be positive numbers');
      return;
    }
    if (min >= max) {
      toast.error('Min value must be less than Max value');
      return;
    }

    // Check for overlapping ranges
    const ranges = [...feeSettings.deliveryFeeRanges];
    for (const range of ranges) {
      if ((min >= range.min && min < range.max) || (max > range.min && max <= range.max) || (min <= range.min && max >= range.max)) {
        toast.error('This range overlaps with an existing range');
        return;
      }
    }
    setFeeSettings({
      ...feeSettings,
      deliveryFeeRanges: [
        ...ranges,
        {
          min,
          max,
          fee,
        },
      ].sort((a, b) => a.min - b.min),
    });
    setNewRange({
      min: '',
      max: '',
      fee: '',
    });
    toast.success('Range added successfully');
  };

  // Delete delivery fee range
  const handleDeleteRange = (index) => {
    const newRanges = feeSettings.deliveryFeeRanges.filter((_, i) => i !== index);
    setFeeSettings({
      ...feeSettings,
      deliveryFeeRanges: newRanges,
    });
    toast.success('Range deleted successfully');
  };

  // Edit delivery fee range
  const handleEditRange = (index) => {
    const range = feeSettings.deliveryFeeRanges[index];
    setNewRange({
      min: range.min,
      max: range.max,
      fee: range.fee,
    });
    setEditingRangeIndex(index);
  };

  // Save edited range
  const handleSaveEditRange = () => {
    if (newRange.min === '' || newRange.max === '' || newRange.fee === '') {
      toast.error('Please fill all fields');
      return;
    }
    const min = Number(newRange.min);
    const max = Number(newRange.max);
    const fee = Number(newRange.fee);
    if (min < 0 || max < 0 || fee < 0) {
      toast.error('All values must be positive numbers');
      return;
    }
    if (min >= max) {
      toast.error('Min value must be less than Max value');
      return;
    }
    const ranges = [...feeSettings.deliveryFeeRanges];
    // Remove the range being edited
    ranges.splice(editingRangeIndex, 1);

    // Check for overlapping ranges
    for (const range of ranges) {
      if ((min >= range.min && min < range.max) || (max > range.min && max <= range.max) || (min <= range.min && max >= range.max)) {
        toast.error('This range overlaps with an existing range');
        return;
      }
    }

    // Add updated range
    ranges.push({
      min,
      max,
      fee,
    });
    ranges.sort((a, b) => a.min - b.min);
    setFeeSettings({
      ...feeSettings,
      deliveryFeeRanges: ranges,
    });
    setNewRange({
      min: '',
      max: '',
      fee: '',
    });
    setEditingRangeIndex(null);
    toast.success('Range updated successfully');
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setNewRange({
      min: '',
      max: '',
      fee: '',
    });
    setEditingRangeIndex(null);
  };
  const { tablet } = useLayoutWidth();
  const RANGE_COLS = [110, 110, 140, 120];
  const sortedRanges = feeSettings.deliveryFeeRanges
    .map((range, originalIndex) => ({
      range,
      originalIndex,
    }))
    .sort((a, b) => a.range.min - b.range.min);
  const feeFields = [
    {
      key: 'freeDeliveryUpTo',
      label: 'Free delivery up to (\u20B9)',
      hint: 'Orders at or above this amount get free delivery',
      placeholder: '500',
      min: '0',
      step: '1',
    },
    {
      key: 'deliveryFee',
      label: 'Default delivery fee (\u20B9)',
      hint: 'Used only when no delivery fee range matches and the free delivery threshold is not met',
      placeholder: 'Leave empty to disable fallback',
      min: '0',
      step: '1',
    },
    {
      key: 'platformFee',
      label: 'Platform fee (\u20B9)',
      hint: 'Platform service fee per order',
      placeholder: '5',
      min: '0',
      step: '1',
    },
    {
      key: 'packagingFee',
      label: 'Packaging charges fee (\u20B9)',
      hint: 'Packaging charges fee per order',
      placeholder: '10',
      min: '0',
      step: '1',
    },
    {
      key: 'gstRate',
      label: 'GST rate (%)',
      hint: 'GST percentage applied on order subtotal',
      placeholder: '5',
      min: '0',
      max: '100',
      step: '0.1',
    },
  ];
  return (
    <AdminPage maxWidth={900}>
      <PageHeader
        icon={IndianRupee}
        title="Delivery & Platform Fee"
        subtitle="Configure delivery fee, platform fee and GST settings for the selected zone"
        breadcrumb={[{ label: 'Food' }, { label: 'Fee settings' }]}
        actions={
          <HButton
            onClick={handleSaveFeeSettings}
            disabled={savingFeeSettings || loadingFeeSettings || !selectedZoneId || !isDirty}
            className={BTN_PRIMARY}
          >
            <UiIcon as={savingFeeSettings ? Loader2 : Save} size={16} className="text-white" />
            <Span className={BTN_TEXT_PRIMARY}>{savingFeeSettings ? 'Saving\u2026' : 'Save settings'}</Span>
          </HButton>
        }
      />

      <Card className="mb-4">
        <Field label="Zone" hint="Fees below apply to this zone only">
          <Select
            nativeID="fee-zone-select"
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
      </Card>

      {loadingFeeSettings ? (
        <LoadingState label="Loading fee settings\u2026" />
      ) : !selectedZoneId ? (
        <EmptyState
          icon={IndianRupee}
          title="No zone selected"
          message={zones.length === 0 ? 'Create a delivery zone first — fees are configured per zone.' : 'Pick a zone above to configure its fees.'}
        />
      ) : (
        <>
          <Card className="mb-4">
            <SectionTitle>Delivery fee by distance range (km)</SectionTitle>
            <Span className="text-sm text-slate-500 mb-3">Set delivery fees based on distance slabs.</Span>

            {sortedRanges.length > 0 ? (
              <DataTable cols={RANGE_COLS} className="mb-3">
                <THead cols={RANGE_COLS} labels={['Min (km)', 'Max (km)', 'Delivery fee (\u20B9)', 'Actions']} />
                <TBody>
                  {sortedRanges.map(({ range, originalIndex }, i) => {
                    const isEditing = editingRangeIndex === originalIndex;
                    return (
                      <Row key={originalIndex} last={i === sortedRanges.length - 1} className={isEditing ? 'bg-blue-50' : ''}>
                        <Cell width={RANGE_COLS[0]}>
                          {isEditing ? (
                            <Input
                              type="number"
                              value={newRange.min}
                              onChange={(e) =>
                                setNewRange({
                                  ...newRange,
                                  min: e.target.value,
                                })
                              }
                              className={INPUT}
                            />
                          ) : (
                            <Span className="text-sm text-slate-700">{`${range.min} km`}</Span>
                          )}
                        </Cell>
                        <Cell width={RANGE_COLS[1]}>
                          {isEditing ? (
                            <Input
                              type="number"
                              value={newRange.max}
                              onChange={(e) =>
                                setNewRange({
                                  ...newRange,
                                  max: e.target.value,
                                })
                              }
                              className={INPUT}
                            />
                          ) : (
                            <Span className="text-sm text-slate-700">{`${range.max} km`}</Span>
                          )}
                        </Cell>
                        <Cell width={RANGE_COLS[2]}>
                          {isEditing ? (
                            <Input
                              type="number"
                              value={newRange.fee}
                              onChange={(e) =>
                                setNewRange({
                                  ...newRange,
                                  fee: e.target.value,
                                })
                              }
                              className={INPUT}
                            />
                          ) : (
                            <Span className="text-sm font-semibold text-slate-900">{`\u20B9${range.fee}`}</Span>
                          )}
                        </Cell>
                        <Cell width={RANGE_COLS[3]}>
                          <Div className="flex-row items-center gap-1">
                            {isEditing ? (
                              <>
                                <HButton onClick={handleSaveEditRange} className="w-11 h-11 rounded-lg items-center justify-center" accessibilityLabel="Save range">
                                  <UiIcon as={Check} size={16} className="text-blue-600" />
                                </HButton>
                                <HButton onClick={handleCancelEdit} className="w-11 h-11 rounded-lg items-center justify-center" accessibilityLabel="Cancel editing range">
                                  <UiIcon as={X} size={16} className="text-slate-600" />
                                </HButton>
                              </>
                            ) : (
                              <>
                                <HButton onClick={() => handleEditRange(originalIndex)} className="w-11 h-11 rounded-lg items-center justify-center" accessibilityLabel="Edit range">
                                  <UiIcon as={Edit} size={16} className="text-blue-600" />
                                </HButton>
                                <HButton onClick={() => handleDeleteRange(originalIndex)} className="w-11 h-11 rounded-lg items-center justify-center" accessibilityLabel="Delete range">
                                  <UiIcon as={Trash2} size={16} className="text-red-600" />
                                </HButton>
                              </>
                            )}
                          </Div>
                        </Cell>
                      </Row>
                    );
                  })}
                </TBody>
              </DataTable>
            ) : (
              <Span className="text-sm text-slate-500 mb-3">No distance ranges yet. Add the first slab below.</Span>
            )}

            {editingRangeIndex === null && (
              <Div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <Div className="flex-row items-center gap-2 mb-3">
                  <UiIcon as={Plus} size={16} className="text-blue-600" />
                  <Span className="text-base font-semibold text-slate-900 flex-1">Add distance range</Span>
                </Div>
                <Div className={tablet ? 'flex-row flex-wrap gap-3' : 'gap-3'}>
                  <Div className="flex-1 min-w-[140px]">
                    <Field label="Min distance (km)">
                      <Input
                        type="number"
                        value={newRange.min}
                        onChange={(e) =>
                          setNewRange({
                            ...newRange,
                            min: e.target.value,
                          })
                        }
                        min="0"
                        step="1"
                        className={INPUT}
                        placeholder="0"
                      />
                    </Field>
                  </Div>
                  <Div className="flex-1 min-w-[140px]">
                    <Field label="Max distance (km)">
                      <Input
                        type="number"
                        value={newRange.max}
                        onChange={(e) =>
                          setNewRange({
                            ...newRange,
                            max: e.target.value,
                          })
                        }
                        min="0"
                        step="1"
                        className={INPUT}
                        placeholder="5"
                      />
                    </Field>
                  </Div>
                  <Div className="flex-1 min-w-[140px]">
                    <Field label="Delivery fee (\u20B9)">
                      <Input
                        type="number"
                        value={newRange.fee}
                        onChange={(e) =>
                          setNewRange({
                            ...newRange,
                            fee: e.target.value,
                          })
                        }
                        min="0"
                        step="1"
                        className={INPUT}
                        placeholder="50"
                      />
                    </Field>
                  </Div>
                </Div>
                <HButton onClick={handleAddRange} className={`${BTN_SECONDARY} mt-3`}>
                  <UiIcon as={Plus} size={16} className="text-slate-600" />
                  <Span className={BTN_TEXT_SECONDARY}>Add range</Span>
                </HButton>
                <Span className="text-xs text-slate-500 mt-2">Example: orders between 0 km and 5 km will have a \u20B950 delivery fee.</Span>
              </Div>
            )}
          </Card>

          <Card>
            <SectionTitle>Fees and charges</SectionTitle>
            <Div className={tablet ? 'flex-row flex-wrap gap-3' : 'gap-3'}>
              {feeFields.map((f) => (
                <Div key={f.key} className={tablet ? 'min-w-[260px] flex-1' : ''}>
                  <Field label={f.label} hint={f.hint}>
                    <Input
                      type="number"
                      value={feeSettings[f.key]}
                      onChange={(e) =>
                        setFeeSettings({
                          ...feeSettings,
                          [f.key]: e.target.value,
                        })
                      }
                      min={f.min}
                      max={f.max}
                      step={f.step}
                      className={INPUT}
                      placeholder={f.placeholder}
                    />
                  </Field>
                </Div>
              ))}
            </Div>
          </Card>
        </>
      )}
    </AdminPage>
  );
}
