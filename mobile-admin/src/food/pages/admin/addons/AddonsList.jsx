/* Ported from Frontend/src/modules/Food/pages/admin/addons/AddonsList.jsx (tools/port.js first pass). */
import { useEffect, useMemo, useState } from 'react';
import { Eye, Loader2, Search, Trash2, Pencil } from 'lucide-react-native';
import { Switch } from '../../../../components/shadcn';
import { adminAPI, uploadAPI } from '../../../../api/food';
import { toast } from '../../../../lib/notify';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../components/shadcn';
import AdminListPagination from '../../../components/admin/AdminListPagination';
import { pickImage, objectUrl } from '../../../../lib/files';
import { Button, Div, H1, Img, Input, Label, P, ScrollDiv, Span, Table, Tbody, Td, Textarea, Th, Thead, Tr, Icon as UiIcon } from '../../../../components/web';
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
  return (
    <ScrollDiv className="p-4 lg:p-6 bg-slate-50 min-h-screen space-y-6">
      <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <Div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <Div>
            <Div className="flex items-center gap-3">
              <H1 className="text-2xl font-bold text-slate-900">Restaurant add-ons</H1>
            </Div>
            <Div className="text-sm text-slate-500 mt-1">Manage add-ons submitted by restaurants.</Div>
          </Div>

          <Div className="flex items-center gap-2" />
        </Div>

        <Div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <Div className="relative w-full sm:w-96">
            <UiIcon as={Search} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search add-ons or restaurant..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2.5 w-full text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
            />
          </Div>
          <Div className="text-sm text-slate-600">
            Showing <Span className="font-semibold">{countLabel}</Span>
          </Div>
        </Div>
      </Div>

      <Div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <Div>
          <Table className="w-full" cols={[70, 80, 200, 180, 110, 132]}>
            <Thead className="bg-slate-50 border-b border-slate-200">
              <Tr>
                <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">SL</Th>
                <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Image</Th>
                <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Name</Th>
                <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Restaurant</Th>
                <Th className="px-6 py-4 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">Price</Th>
                <Th className="px-6 py-4 text-center text-[10px] font-bold text-slate-700 uppercase tracking-wider">Action</Th>
              </Tr>
            </Thead>
            <Tbody className="bg-white divide-y divide-slate-100">
              {loading ? (
                <Tr>
                  <Td colSpan={6} className="px-6 py-20 text-center">
                    <Div className="flex flex-col items-center justify-center">
                      <UiIcon as={Loader2} className="w-8 h-8 animate-spin text-blue-600 mb-2" />
                      <P className="text-sm text-slate-500">Loading add-ons...</P>
                    </Div>
                  </Td>
                </Tr>
              ) : filteredAddons.length === 0 ? (
                <Tr>
                  <Td colSpan={6} className="px-6 py-20 text-center">
                    <Div className="flex flex-col items-center justify-center">
                      <P className="text-lg font-semibold text-slate-700 mb-1">No Data Found</P>
                      <P className="text-sm text-slate-500">No add-ons match your search</P>
                    </Div>
                  </Td>
                </Tr>
              ) : (
                filteredAddons.map((addon, index) => (
                  <Tr key={String(addon.id || addon._id)} className="hover:bg-slate-50 transition-colors">
                    <Td className="px-6 py-4 whitespace-nowrap">
                      <Span className="text-sm font-medium text-slate-700">{(currentPage - 1) * pageSize + index + 1}</Span>
                    </Td>
                    <Td className="px-6 py-4 whitespace-nowrap">
                      <Div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center">
                        <Img
                          src={getAddonImage(addon)}
                          alt={getAddonTitle(addon)}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/40';
                          }}
                        />
                      </Div>
                    </Td>
                    <Td className="px-6 py-4 whitespace-nowrap">
                      <Div className="flex flex-col">
                        <Span className="text-sm font-medium text-slate-900">{getAddonTitle(addon)}</Span>
                        <Span className="text-xs text-slate-500">ID #{formatAddonId(addon.id || addon._id)}</Span>
                      </Div>
                    </Td>
                    <Td className="px-6 py-4 whitespace-nowrap">
                      <Div className="flex flex-col">
                        <Span className="text-sm text-slate-900">{addon?.restaurant?.name || '-'}</Span>
                        {addon?.restaurant?.ownerPhone ? <Span className="text-xs text-slate-500">{addon.restaurant.ownerPhone}</Span> : null}
                      </Div>
                    </Td>
                    <Td className="px-6 py-4 whitespace-nowrap">
                      <Span className="text-sm font-medium text-slate-900">₹{Number(addon?.draft?.price ?? addon?.price ?? 0).toFixed(2)}</Span>
                    </Td>
                    <Td className="px-6 py-4 whitespace-nowrap text-center">
                      <Div className="flex items-center justify-center gap-2 flex-wrap">
                        <Button onClick={() => handleViewDetails(addon)} className="p-1.5 rounded text-blue-600 hover:bg-blue-50 transition-colors">
                          <UiIcon as={Eye} className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleEdit(addon)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                        >
                          <UiIcon as={Pencil} className="w-4 h-4" />
                          Edit
                        </Button>
                        <Button
                          onClick={() => handleDelete(addon)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
                        >
                          <UiIcon as={Trash2} className="w-4 h-4" />
                          Delete
                        </Button>
                      </Div>
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </Div>

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
      </Div>

      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-xl p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <DialogTitle className="text-lg font-semibold text-slate-900">Add-on Details</DialogTitle>
          </DialogHeader>
          {selectedAddon && (
            <Div className="p-6 space-y-5">
              <Div className="flex items-center gap-4">
                <Img
                  src={getAddonImage(selectedAddon)}
                  alt={getAddonTitle(selectedAddon)}
                  className="w-20 h-20 rounded-xl object-cover border border-slate-200"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/64';
                  }}
                />
                <Div>
                  <P className="text-lg font-semibold text-slate-900">{getAddonTitle(selectedAddon)}</P>
                  <P className="text-sm text-slate-500 mt-0.5">ID #{formatAddonId(selectedAddon.id || selectedAddon._id)}</P>
                </Div>
              </Div>

              <Div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 border border-slate-200 rounded-lg p-4">
                <P>
                  <Span className="font-semibold text-slate-700">Restaurant:</Span>{' '}
                  <Span className="text-slate-900">{selectedAddon?.restaurant?.name || '-'}</Span>
                </P>
                <P>
                  <Span className="font-semibold text-slate-700">Price:</Span>{' '}
                  <Span className="text-slate-900">₹{Number(selectedAddon?.draft?.price ?? 0).toFixed(2)}</Span>
                </P>
                <P>
                  <Span className="font-semibold text-slate-700">Available:</Span>{' '}
                  <Span className="text-slate-900">{selectedAddon?.isAvailable ? 'Yes' : 'No'}</Span>
                </P>
              </Div>

              {selectedAddon?.draft?.description ? (
                <P className="text-sm text-slate-700 leading-relaxed">
                  <Span className="font-semibold text-slate-800">Description:</Span> {selectedAddon.draft.description}
                </P>
              ) : null}
            </Div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <DialogTitle className="text-lg font-semibold text-slate-900">Edit Add-on</DialogTitle>
          </DialogHeader>
          <Div className="p-6 space-y-4">
            <Div className="flex items-start gap-3">
              {editImagePreview ? (
                <Img src={editImagePreview} alt="Preview" className="w-16 h-16 rounded-md object-cover border" />
              ) : (
                <Div className="w-16 h-16 rounded-md border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-500">
                  No image
                </Div>
              )}
              <Div className="flex-1">
                <Label className="block text-sm font-medium text-slate-700 mb-1">Change Image</Label>
                <Button
                  type="button"
                  onClick={async () => {
                    const file = await pickImage();
                    if (!file) return;
                    setEditImageFile(file);
                    setEditImagePreview(objectUrl(file));
                  }}
                  className="px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-700 bg-white"
                >
                  Choose image
                </Button>
                <P className="text-xs text-slate-500">PNG, JPG, WEBP up to 5MB</P>
              </Div>
            </Div>
            <Div>
              <Label className="block text-sm font-medium text-slate-700 mb-1">Name</Label>
              <Input
                type="text"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              />
            </Div>
            <Div>
              <Label className="block text-sm font-medium text-slate-700 mb-1">Price</Label>
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
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              />
            </Div>
            <Div>
              <Label className="block text-sm font-medium text-slate-700 mb-1">Description</Label>
              <Textarea
                rows={3}
                value={editForm.description}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
              />
            </Div>
            <Div className="flex items-center gap-2">
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
          <Div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
            <Button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveEdit}
              disabled={submittingAction}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submittingAction ? 'Saving...' : 'Save'}
            </Button>
          </Div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent className="max-w-md w-full rounded-xl p-0 overflow-hidden shadow-xl">
          <Div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <DialogTitle className="text-lg font-semibold text-slate-900">Delete add-on?</DialogTitle>
            <Button
              type="button"
              onClick={() => setPendingDelete(null)}
              className="p-1.5 rounded-full hover:bg-slate-100 transition-colors"
              accessibilityLabel="Close"
            >
              ✕
            </Button>
          </Div>
          <Div className="px-5 pt-4 pb-2">
            <P className="text-sm text-slate-700">This action cannot be undone.</P>
          </Div>
          <Div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2 bg-slate-50">
            <Button
              type="button"
              onClick={() => setPendingDelete(null)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 transition-colors"
            >
              No
            </Button>
            <Button
              type="button"
              onClick={confirmDelete}
              disabled={submittingAction}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submittingAction ? 'Deleting...' : 'Yes, delete'}
            </Button>
          </Div>
        </DialogContent>
      </Dialog>
    </ScrollDiv>
  );
}
