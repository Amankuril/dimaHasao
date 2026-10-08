/* Ported from Frontend/src/modules/Food/pages/admin/addons/AddonsList.jsx (tools/port.js first pass). */
import { useEffect, useMemo, useState } from 'react';
import { Eye, Trash2, Pencil, Utensils } from 'lucide-react-native';
import { Switch } from '../../../../components/shadcn';
import { adminAPI, uploadAPI } from '../../../../api/food';
import { toast } from '../../../../lib/notify';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../components/shadcn';
import AdminListPagination from '../../../components/admin/AdminListPagination';
import { pickImage, objectUrl } from '../../../../lib/files';
import { Button, Div, Img, Input, Span, Textarea, Icon as UiIcon } from '../../../../components/web';
import {
  AdminPage,
  PageHeader,
  Card,
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
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_DANGER,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
} from '../../../../admin/ui';
const debugError = (...args) => {};
const getItemCreatedMs = (item = {}) => {
  const direct = [item.requestedAt, item.createdAt, item.updatedAt].map((v) => new Date(v).getTime()).find((ms) => Number.isFinite(ms) && ms > 0);
  return direct || 0;
};
const formatAddonId = (id) => {
  if (!id) return 'ADDON000000';
  const idString = String(id);
  const digits = idString.match(/\d+/g);
  const combined = digits ? digits.join('') : '';
  const lastDigits = combined ? combined.slice(-6).padStart(6, '0') : '000000';
  return `ADDON${lastDigits}`;
};
const getAddonTitle = (addon) => addon?.draft?.name || addon?.name || 'Unnamed Add-on';
const getAddonImage = (addon) =>
  addon?.draft?.image || addon?.draft?.images?.[0] || addon?.published?.image || addon?.published?.images?.[0] || 'https://via.placeholder.com/40';
export default function AddonsList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    try {
      return Number(localStorage.getItem('admin_addons_pageSize')) || 20;
    } catch {
      return 20;
    }
  });
  const [totalItems, setTotalItems] = useState(0);
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [selectedAddon, setSelectedAddon] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingAddon, setEditingAddon] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    price: '',
    description: '',
    isAvailable: true,
  });
  const [editImagePreview, setEditImagePreview] = useState('');
  const [editImageFile, setEditImageFile] = useState(null);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);
  useEffect(() => {
    const fetchAddons = async () => {
      try {
        setLoading(true);
        const response = await adminAPI.getRestaurantAddons({
          approvalStatus: 'approved',
          search: debouncedSearch || undefined,
          page: currentPage,
          limit: pageSize,
        });
        const data = response?.data?.data ?? response?.data;
        const list = Array.isArray(data?.addons) ? data.addons : Array.isArray(data) ? data : [];
        const approvedOnly = list.filter((addon) => String(addon.approvalStatus || '').toLowerCase() === 'approved');
        setAddons(approvedOnly);
        setTotalItems(response?.data?.data?.total ?? response?.data?.total ?? approvedOnly.length);
      } catch (error) {
        debugError('Error fetching addons:', error);
        toast.error('Failed to load restaurant add-ons');
        setAddons([]);
        setTotalItems(0);
      } finally {
        setLoading(false);
      }
    };
    fetchAddons();
  }, [debouncedSearch, currentPage, pageSize]);
  const filteredAddons = useMemo(() => {
    const result = Array.isArray(addons) ? [...addons] : [];
    result.sort((a, b) => getItemCreatedMs(b) - getItemCreatedMs(a));
    return result;
  }, [addons]);
  const countLabel = totalItems;
  const handleViewDetails = (addon) => {
    setSelectedAddon(addon);
    setShowDetailModal(true);
  };
  const handleEdit = (addon) => {
    setEditingAddon(addon);
    setEditForm({
      name: addon?.draft?.name || addon?.name || '',
      price: addon?.draft?.price ?? addon?.price ?? '',
      description: addon?.draft?.description || addon?.description || '',
      isAvailable: addon?.isAvailable !== false,
    });
    const img =
      addon?.draft?.image ||
      (Array.isArray(addon?.draft?.images) && addon.draft.images[0]) ||
      addon?.image ||
      (Array.isArray(addon?.images) && addon.images[0]) ||
      '';
    setEditImagePreview(img || '');
    setEditImageFile(null);
    setShowEditModal(true);
  };
  const handleSaveEdit = async () => {
    const id = editingAddon?.id || editingAddon?._id;
    if (!id) return;
    if (!editForm.name.trim()) {
      toast.error('Name is required');
      return;
    }
    const priceNum = Number(editForm.price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      toast.error('Enter a valid price');
      return;
    }
    try {
      setSubmittingAction(true);
      let imageUrl = editImagePreview || '';
      // If a new file selected, upload it
      if (editImageFile) {
        const uploadRes = await uploadAPI.uploadMedia(editImageFile, {
          folder: 'Dima Hasao/admin/addons',
        });
        imageUrl = uploadRes?.data?.data?.url || uploadRes?.data?.url || imageUrl;
      }
      await adminAPI.updateRestaurantAddon(String(id), {
        name: editForm.name.trim(),
        price: priceNum,
        description: editForm.description.trim(),
        isAvailable: editForm.isAvailable,
        image: imageUrl,
        images: imageUrl ? [imageUrl] : [],
      });
      setAddons((prev) =>
        (prev || []).map((a) =>
          String(a.id || a._id) === String(id)
            ? {
                ...a,
                ...editForm,
                price: priceNum,
                name: editForm.name.trim(),
                description: editForm.description.trim(),
                image: imageUrl || a.image,
                images: imageUrl ? [imageUrl] : a.images,
              }
            : a,
        ),
      );
      toast.success('Add-on updated');
      setShowEditModal(false);
      setEditingAddon(null);
      setEditImageFile(null);
    } catch (error) {
      debugError('Update add-on failed:', error);
      toast.error(error?.response?.data?.message || 'Failed to update add-on');
    } finally {
      setSubmittingAction(false);
    }
  };
  const [pendingDelete, setPendingDelete] = useState(null);
  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const id = pendingDelete?.id || pendingDelete?._id;
    try {
      setSubmittingAction(true);
      await adminAPI.rejectRestaurantAddon(String(id), 'Deleted by admin');
      setAddons((prev) => (prev || []).filter((a) => String(a.id || a._id) !== String(id)));
      toast.success('Add-on deleted');
    } catch (error) {
      debugError('Delete add-on failed:', error);
      toast.error(error?.response?.data?.message || 'Failed to delete add-on');
    } finally {
      setSubmittingAction(false);
      setPendingDelete(null);
    }
  };
  const handleDelete = (addon) => {
    setPendingDelete(addon);
  };
  const COLS = [60, 64, 190, 170, 110, 150];
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={Utensils}
        title="Restaurant add-ons"
        subtitle={loading ? 'Loading add-ons\u2026' : `${countLabel} approved add-on${countLabel === 1 ? '' : 's'} submitted by restaurants`}
        breadcrumb={[{ label: 'Food' }, { label: 'Add-ons' }]}
      />

      <Card className="mb-4">
        <Toolbar className="mb-0">
          <Input
            type="search"
            placeholder="Search add-ons or restaurant…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${INPUT} flex-1 min-w-[200px]`}
          />
        </Toolbar>
      </Card>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : filteredAddons.length === 0 ? (
        <EmptyState
          icon={Utensils}
          title="No add-ons found"
          message={debouncedSearch ? 'No add-on matches your search. Try another name or restaurant.' : 'Approved restaurant add-ons appear here.'}
        />
      ) : (
        <DataTable cols={COLS}>
          <THead cols={COLS} labels={['SL', 'Image', 'Name', 'Restaurant', 'Price', 'Actions']} />
          <TBody>
            {filteredAddons.map((addon, index) => (
              <Row key={String(addon.id || addon._id)} last={index === filteredAddons.length - 1}>
                <Cell width={COLS[0]} numberOfLines={1}>{String((currentPage - 1) * pageSize + index + 1)}</Cell>
                <Cell width={COLS[1]}>
                  <Div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 items-center justify-center">
                    <Img
                      src={getAddonImage(addon)}
                      alt={getAddonTitle(addon)}
                      className="w-full h-full"
                      contentFit="cover"
                      onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/40';
                      }}
                    />
                  </Div>
                </Cell>
                <Cell width={COLS[2]}>
                  <Div className="gap-0.5">
                    <Span className="text-sm font-medium text-slate-900">{getAddonTitle(addon)}</Span>
                    <Span className="text-xs text-slate-500">ID #{formatAddonId(addon.id || addon._id)}</Span>
                  </Div>
                </Cell>
                <Cell width={COLS[3]}>
                  <Div className="gap-0.5">
                    <Span className="text-sm text-slate-900">{addon?.restaurant?.name || '-'}</Span>
                    {addon?.restaurant?.ownerPhone ? <Span className="text-xs text-slate-500">{addon.restaurant.ownerPhone}</Span> : null}
                  </Div>
                </Cell>
                <Cell width={COLS[4]} numberOfLines={1}>
                  {`\u20B9${Number(addon?.draft?.price ?? addon?.price ?? 0).toFixed(2)}`}
                </Cell>
                <Cell width={COLS[5]}>
                  <Div className="flex-row items-center gap-1">
                    <Button onClick={() => handleViewDetails(addon)} className="w-11 h-11 rounded-lg items-center justify-center" accessibilityLabel="View add-on details">
                      <UiIcon as={Eye} size={16} className="text-slate-600" />
                    </Button>
                    <Button onClick={() => handleEdit(addon)} className="w-11 h-11 rounded-lg items-center justify-center" accessibilityLabel="Edit add-on">
                      <UiIcon as={Pencil} size={16} className="text-blue-600" />
                    </Button>
                    <Button onClick={() => handleDelete(addon)} className="w-11 h-11 rounded-lg items-center justify-center" accessibilityLabel="Delete add-on">
                      <UiIcon as={Trash2} size={16} className="text-red-600" />
                    </Button>
                  </Div>
                </Cell>
              </Row>
            ))}
          </TBody>
        </DataTable>
      )}

      <AdminListPagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          try {
            localStorage.setItem('admin_addons_pageSize', String(size));
          } catch {}
          setCurrentPage(1);
        }}
        itemLabel="add-ons"
      />

      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-xl p-0 overflow-hidden">
          <DialogHeader className="px-4 py-3 border-b border-slate-200">
            <DialogTitle>Add-on details</DialogTitle>
          </DialogHeader>
          {selectedAddon && (
            <Div className="p-4 gap-4">
              <Div className="flex-row items-center gap-3">
                <Img
                  src={getAddonImage(selectedAddon)}
                  alt={getAddonTitle(selectedAddon)}
                  className="w-16 h-16 rounded-xl"
                  contentFit="cover"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/64';
                  }}
                />
                <Div className="flex-1 min-w-0 gap-0.5">
                  <Span className="text-base font-semibold text-slate-900">{getAddonTitle(selectedAddon)}</Span>
                  <Span className="text-sm text-slate-500">ID #{formatAddonId(selectedAddon.id || selectedAddon._id)}</Span>
                </Div>
              </Div>

              <Div className="flex-row flex-wrap gap-3 rounded-lg bg-slate-50 p-3">
                {[
                  ['Restaurant', selectedAddon?.restaurant?.name || '-'],
                  ['Price', `\u20B9${Number(selectedAddon?.draft?.price ?? 0).toFixed(2)}`],
                ].map(([label, value]) => (
                  <Div key={label} className="flex-1 min-w-[120px] gap-0.5">
                    <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</Span>
                    <Span className="text-sm text-slate-900">{value}</Span>
                  </Div>
                ))}
                <Div className="flex-1 min-w-[120px] gap-1">
                  <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Available</Span>
                  <StatusBadge status={selectedAddon?.isAvailable ? 'active' : 'inactive'} label={selectedAddon?.isAvailable ? 'Yes' : 'No'} />
                </Div>
              </Div>

              {selectedAddon?.draft?.description ? (
                <Div className="gap-1">
                  <Span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</Span>
                  <Span className="text-sm text-slate-700">{selectedAddon.draft.description}</Span>
                </Div>
              ) : null}
            </Div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <DialogHeader className="px-4 py-3 border-b border-slate-200">
            <DialogTitle>Edit add-on</DialogTitle>
          </DialogHeader>
          <Div className="p-4 gap-3">
            <Div className="flex-row items-start gap-3">
              {editImagePreview ? (
                <Img src={editImagePreview} alt="Preview" className="w-16 h-16 rounded-lg" contentFit="cover" />
              ) : (
                <Div className="w-16 h-16 rounded-lg border border-dashed border-slate-300 items-center justify-center">
                  <Span className="text-xs text-slate-500">No image</Span>
                </Div>
              )}
              <Div className="flex-1 min-w-0">
                <Field label="Change image" hint="PNG, JPG, WEBP up to 5MB">
                  <Button
                    type="button"
                    onClick={async () => {
                      const file = await pickImage();
                      if (!file) return;
                      setEditImageFile(file);
                      setEditImagePreview(objectUrl(file));
                    }}
                    className={BTN_SECONDARY}
                  >
                    <Span className={BTN_TEXT_SECONDARY}>Choose image</Span>
                  </Button>
                </Field>
              </Div>
            </Div>
            <Field label="Name" required>
              <Input
                type="text"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                className={INPUT}
              />
            </Field>
            <Field label="Price" required>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={editForm.price}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    price: e.target.value,
                  }))
                }
                className={INPUT}
              />
            </Field>
            <Field label="Description">
              <Textarea
                rows={3}
                value={editForm.description}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900"
              />
            </Field>
            <Div className="flex-row items-center gap-2 h-11">
              <Switch
                checked={editForm.isAvailable}
                onCheckedChange={(checked) =>
                  setEditForm((prev) => ({
                    ...prev,
                    isAvailable: checked,
                  }))
                }
              />
              <Span className="text-sm text-slate-700">Available</Span>
            </Div>
          </Div>
          <Div className="px-4 py-3 border-t border-slate-200 flex-row flex-wrap justify-end gap-2">
            <Button type="button" onClick={() => setShowEditModal(false)} className={BTN_SECONDARY}>
              <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
            </Button>
            <Button type="button" onClick={handleSaveEdit} disabled={submittingAction} className={BTN_PRIMARY}>
              <Span className={BTN_TEXT_PRIMARY}>{submittingAction ? 'Saving\u2026' : 'Save'}</Span>
            </Button>
          </Div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent className="max-w-md w-full rounded-xl p-0 overflow-hidden">
          <DialogHeader className="px-4 py-3 border-b border-slate-200">
            <DialogTitle>Delete add-on?</DialogTitle>
          </DialogHeader>
          <Div className="px-4 py-4">
            <Span className="text-sm text-slate-700">This action cannot be undone.</Span>
          </Div>
          <Div className="px-4 py-3 border-t border-slate-200 flex-row flex-wrap justify-end gap-2">
            <Button type="button" onClick={() => setPendingDelete(null)} className={BTN_SECONDARY}>
              <Span className={BTN_TEXT_SECONDARY}>No</Span>
            </Button>
            <Button type="button" onClick={confirmDelete} disabled={submittingAction} className={BTN_DANGER}>
              <Span className={BTN_TEXT_PRIMARY}>{submittingAction ? 'Deleting\u2026' : 'Yes, delete'}</Span>
            </Button>
          </Div>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
