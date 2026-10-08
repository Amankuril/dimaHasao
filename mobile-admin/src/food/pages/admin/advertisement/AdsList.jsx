/* Ported from Frontend/src/modules/Food/pages/admin/advertisement/AdsList.jsx (tools/port.js first pass). */
import { useState, useMemo } from 'react';
import { useNavigate } from '../../../../lib/webRouter';
import {
  Search,
  Download,
  ChevronDown,
  Plus,
  MoreVertical,
  Building2,
  Settings,
  Filter,
  FileDown,
  FileSpreadsheet,
  FileText,
  Code,
  Eye,
  Edit,
  Trash2,
  Megaphone,
} from 'lucide-react-native';
import { emptyAds } from '../../../utils/adminFallbackData';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../../../components/shadcn';
import SettingsDialog from '../../../components/admin/orders/SettingsDialog';
import {
  exportAdvertisementsToCSV,
  exportAdvertisementsToExcel,
  exportAdvertisementsToPDF,
  exportAdvertisementsToJSON,
} from '../../../components/admin/advertisements/advertisementsExportUtils';
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
  EmptyState,
  Field,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_DANGER,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../admin/ui';
import { Button, Div, Input, Option, P, Select, Span, Icon as UiIcon } from '../../../../components/web';

export default function AdsList() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [adsType, setAdsType] = useState('all');
  const [ads, setAds] = useState(emptyAds);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedAd, setSelectedAd] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    restaurant: '',
    priority: '',
  });
  const [visibleColumns, setVisibleColumns] = useState({
    si: true,
    adsId: true,
    adsTitle: true,
    restaurantInfo: true,
    adsType: true,
    duration: true,
    status: true,
    priority: true,
    actions: true,
  });
  const { tablet } = useLayoutWidth();
  const columnsConfig = {
    si: 'Serial Number',
    adsId: 'Ads ID',
    adsTitle: 'Ads Title',
    restaurantInfo: 'Restaurant Info',
    adsType: 'Ads Type',
    duration: 'Duration',
    status: 'Status',
    priority: 'Priority',
    actions: 'Actions',
  };
  const filteredAds = useMemo(() => {
    let result = [...ads];
    if (adsType !== 'all') {
      result = result.filter((ad) => ad.adsType === adsType);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (ad) => ad.adsId?.toLowerCase().includes(query) || ad.restaurantName?.toLowerCase().includes(query) || ad.adsTitle?.toLowerCase().includes(query),
      );
    }
    if (filters.status) {
      result = result.filter((ad) => ad.status === filters.status);
    }
    if (filters.restaurant) {
      result = result.filter((ad) => ad.restaurantName === filters.restaurant);
    }
    if (filters.priority) {
      result = result.filter((ad) => ad.priority === filters.priority);
    }
    return result;
  }, [ads, searchQuery, adsType, filters]);
  const activeFiltersCount = Object.values(filters).filter((v) => v).length;
  const handleExport = (format) => {
    const filename = 'ads_list';
    switch (format) {
      case 'csv':
        exportAdvertisementsToCSV(filteredAds, filename);
        break;
      case 'excel':
        exportAdvertisementsToExcel(filteredAds, filename);
        break;
      case 'pdf':
        exportAdvertisementsToPDF(filteredAds, filename);
        break;
      case 'json':
        exportAdvertisementsToJSON(filteredAds, filename);
        break;
      default:
        break;
    }
  };
  const handlePriorityChange = (sl, newPriority) => {
    setAds(
      ads.map((ad) =>
        ad.sl === sl
          ? {
              ...ad,
              priority: newPriority,
            }
          : ad,
      ),
    );
  };
  const handleViewAd = (ad) => {
    setSelectedAd(ad);
    setIsViewOpen(true);
  };
  const handleEditAd = (ad) => {
    navigate('/admin/new-advertisement', {
      state: {
        editAd: ad,
      },
    });
  };
  const handleDeleteClick = (ad) => {
    setSelectedAd(ad);
    setIsDeleteOpen(true);
  };
  const handleDelete = () => {
    if (selectedAd) {
      setAds(ads.filter((ad) => ad.sl !== selectedAd.sl));
      setIsDeleteOpen(false);
      setSelectedAd(null);
    }
  };
  const toggleColumn = (key) => {
    setVisibleColumns((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };
  const resetColumns = () => {
    setVisibleColumns({
      si: true,
      adsId: true,
      adsTitle: true,
      restaurantInfo: true,
      adsType: true,
      duration: true,
      status: true,
      priority: true,
      actions: true,
    });
  };
  const handleApplyFilters = () => {
    setIsFilterOpen(false);
  };
  const handleResetFilters = () => {
    setFilters({
      status: '',
      restaurant: '',
      priority: '',
    });
  };
  const restaurants = [...new Set(ads.map((ad) => ad.restaurantName))].filter(Boolean);
  const statuses = [...new Set(ads.map((ad) => ad.status))].filter(Boolean);
  const columnWidths = {
    si: 56,
    adsId: 120,
    adsTitle: 180,
    restaurantInfo: 200,
    adsType: 140,
    duration: 180,
    status: 120,
    priority: 110,
    actions: 64,
  };
  const columnLabels = {
    si: 'SI',
    adsId: 'Ads ID',
    adsTitle: 'Ads Title',
    restaurantInfo: 'Restaurant Info',
    adsType: 'Ads Type',
    duration: 'Duration',
    status: 'Status',
    priority: 'Priority',
    actions: 'Action',
  };
  const shownKeys = Object.keys(columnWidths).filter((key) => visibleColumns[key]);
  const tableCols = shownKeys.map((key) => columnWidths[key]);
  const tableLabels = shownKeys.map((key) => columnLabels[key]);
  const widthOf = (key) => columnWidths[key];
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={Megaphone}
        title="Ads List"
        subtitle={`${filteredAds.length} ${filteredAds.length === 1 ? 'advertisement' : 'advertisements'} in this list`}
        breadcrumb={[{ label: 'Food' }, { label: 'Advertisements' }, { label: 'Ads list' }]}
        actions={
          <Button onClick={() => navigate('/admin/new-advertisement')} className={BTN_PRIMARY}>
            <UiIcon as={Plus} size={16} className="text-white" />
            <Span className={BTN_TEXT_PRIMARY}>New Advertisement</Span>
          </Button>
        }
      />

      <Card className="mb-4">
        <Toolbar className="mb-0">
          <Select value={adsType} onChange={(e) => setAdsType(e.target.value)} className={`${INPUT} min-w-[170px]`}>
            <Option value="all">All Ads</Option>
            <Option value="Restaurant Promotion">Restaurant Promotion</Option>
            <Option value="Video promotion">Video promotion</Option>
          </Select>

          <Div className="flex-row items-center gap-2 h-11 px-3 rounded-lg border border-slate-300 bg-white flex-1 min-w-[200px]">
            <UiIcon as={Search} size={16} className="text-slate-400" />
            <Input
              type="text"
              placeholder="Search by ads ID or restaurant"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 text-sm text-slate-900"
            />
          </Div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className={BTN_SECONDARY}>
                <UiIcon as={Download} size={16} className="text-slate-600" />
                <Span className={BTN_TEXT_SECONDARY}>Export</Span>
                <UiIcon as={ChevronDown} size={14} className="text-slate-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white border border-slate-200 rounded-lg">
              <DropdownMenuLabel>Export Format</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExport('csv')} className="cursor-pointer">
                <UiIcon as={FileDown} size={16} className="mr-2 text-slate-500" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('excel')} className="cursor-pointer">
                <UiIcon as={FileSpreadsheet} size={16} className="mr-2 text-slate-500" />
                Export as Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')} className="cursor-pointer">
                <UiIcon as={FileText} size={16} className="mr-2 text-slate-500" />
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('json')} className="cursor-pointer">
                <UiIcon as={Code} size={16} className="mr-2 text-slate-500" />
                Export as JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button onClick={() => setIsFilterOpen(true)} className={BTN_SECONDARY}>
            <UiIcon as={Filter} size={16} className="text-slate-600" />
            <Span className={BTN_TEXT_SECONDARY}>Filters</Span>
            {activeFiltersCount > 0 ? <StatusBadge tone="info" label={String(activeFiltersCount)} /> : null}
          </Button>

          <Button onClick={() => setIsSettingsOpen(true)} className={`${BTN_SECONDARY} w-11 px-0`} accessibilityLabel="Table settings">
            <UiIcon as={Settings} size={18} className="text-slate-600" />
          </Button>
        </Toolbar>
      </Card>

      {filteredAds.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No advertisements found"
          message={
            searchQuery || activeFiltersCount > 0 || adsType !== 'all'
              ? 'No ads match your search or filters. Clear them to see everything.'
              : 'Create an advertisement to promote a restaurant in the customer app.'
          }
          actionLabel="New Advertisement"
          onAction={() => navigate('/admin/new-advertisement')}
        />
      ) : (
        <DataTable cols={tableCols}>
          <THead cols={tableCols} labels={tableLabels} />
          <TBody>
            {filteredAds.map((ad, i, all) => (
              <Row key={ad.sl} last={i === all.length - 1}>
                {visibleColumns.si ? <Cell width={widthOf('si')}>{String(ad.sl)}</Cell> : null}
                {visibleColumns.adsId ? (
                  <Cell width={widthOf('adsId')}>
                    <Button onClick={() => handleViewAd(ad)} className="h-11 justify-center" accessibilityLabel={`View ${ad.adsId}`}>
                      <Span className="text-sm font-semibold text-blue-600">{ad.adsId}</Span>
                    </Button>
                  </Cell>
                ) : null}
                {visibleColumns.adsTitle ? (
                  <Cell width={widthOf('adsTitle')}>
                    <Span className="text-sm font-semibold text-slate-900">{ad.adsTitle}</Span>
                  </Cell>
                ) : null}
                {visibleColumns.restaurantInfo ? (
                  <Cell width={widthOf('restaurantInfo')}>
                    <Div className="flex-row items-center gap-2">
                      <Div className="w-9 h-9 rounded-lg bg-slate-100 items-center justify-center shrink-0">
                        <UiIcon as={Building2} size={16} className="text-slate-500" />
                      </Div>
                      <Div className="flex-1 min-w-0">
                        <Span className="text-sm font-semibold text-slate-900">{ad.restaurantName}</Span>
                        <Span className="text-xs text-slate-500">{ad.restaurantEmail}</Span>
                      </Div>
                    </Div>
                  </Cell>
                ) : null}
                {visibleColumns.adsType ? <Cell width={widthOf('adsType')}>{ad.adsType}</Cell> : null}
                {visibleColumns.duration ? <Cell width={widthOf('duration')}>{ad.duration}</Cell> : null}
                {visibleColumns.status ? (
                  <Cell width={widthOf('status')}>
                    <StatusBadge status={ad.status} />
                  </Cell>
                ) : null}
                {visibleColumns.priority ? (
                  <Cell width={widthOf('priority')}>
                    <Select
                      value={ad.priority || ''}
                      onChange={(e) => handlePriorityChange(ad.sl, e.target.value)}
                      className="h-11 px-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 w-full"
                    >
                      <Option value="">N/A</Option>
                      <Option value="1">1</Option>
                      <Option value="2">2</Option>
                      <Option value="3">3</Option>
                    </Select>
                  </Cell>
                ) : null}
                {visibleColumns.actions ? (
                  <Cell width={widthOf('actions')} align="center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button className="w-11 h-11 rounded-lg items-center justify-center" accessibilityLabel={`Actions for ${ad.adsId}`}>
                          <UiIcon as={MoreVertical} size={18} className="text-slate-600" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 bg-white border border-slate-200 rounded-lg">
                        <DropdownMenuItem onClick={() => handleViewAd(ad)} className="cursor-pointer">
                          <UiIcon as={Eye} size={16} className="mr-2 text-slate-500" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditAd(ad)} className="cursor-pointer">
                          <UiIcon as={Edit} size={16} className="mr-2 text-slate-500" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDeleteClick(ad)} className="cursor-pointer text-red-600">
                          <UiIcon as={Trash2} size={16} className="mr-2 text-red-600" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </Cell>
                ) : null}
              </Row>
            ))}
          </TBody>
        </DataTable>
      )}

      {/* Filter Panel */}
      <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <DialogContent className="max-w-md bg-white p-0">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle>Filter Ads</DialogTitle>
          </DialogHeader>
          <Div className="px-4 pb-4 gap-3">
            <Field label="Status">
              <Select
                value={filters.status}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    status: e.target.value,
                  }))
                }
                className={INPUT}
              >
                <Option value="">All Statuses</Option>
                {statuses.map((status) => (
                  <Option key={status} value={status}>
                    {status}
                  </Option>
                ))}
              </Select>
            </Field>
            <Field label="Restaurant">
              <Select
                value={filters.restaurant}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    restaurant: e.target.value,
                  }))
                }
                className={INPUT}
              >
                <Option value="">All Restaurants</Option>
                {restaurants.map((restaurant) => (
                  <Option key={restaurant} value={restaurant}>
                    {restaurant}
                  </Option>
                ))}
              </Select>
            </Field>
            <Field label="Priority">
              <Select
                value={filters.priority}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    priority: e.target.value,
                  }))
                }
                className={INPUT}
              >
                <Option value="">All Priorities</Option>
                <Option value="1">1</Option>
                <Option value="2">2</Option>
                <Option value="3">3</Option>
              </Select>
            </Field>
            <Div className="flex-row items-center gap-2 pt-2 border-t border-slate-200">
              <Button onClick={handleResetFilters} className={`${BTN_SECONDARY} flex-1`}>
                <Span className={BTN_TEXT_SECONDARY}>Reset</Span>
              </Button>
              <Button onClick={handleApplyFilters} className={`${BTN_PRIMARY} flex-1`}>
                <Span className={BTN_TEXT_PRIMARY}>Apply</Span>
              </Button>
            </Div>
          </Div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <SettingsDialog
        isOpen={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        visibleColumns={visibleColumns}
        toggleColumn={toggleColumn}
        resetColumns={resetColumns}
        columnsConfig={columnsConfig}
      />

      {/* View Ad Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-2xl bg-white p-0">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle>Advertisement Details</DialogTitle>
          </DialogHeader>
          {selectedAd && (
            <Div className="px-4 pb-4">
              <SectionTitle>{selectedAd.adsTitle}</SectionTitle>
              <Div className={`grid grid-cols-${tablet ? 2 : 1} gap-3`}>
                {[
                  ['Ads ID', selectedAd.adsId],
                  ['Ads Title', selectedAd.adsTitle],
                  ['Restaurant Name', selectedAd.restaurantName],
                  ['Restaurant Email', selectedAd.restaurantEmail],
                  ['Ads Type', selectedAd.adsType],
                  ['Duration', selectedAd.duration],
                  ['Status', selectedAd.status],
                  ['Priority', selectedAd.priority || 'N/A'],
                ].map(([label, value]) => (
                  <Div key={label} className="gap-1">
                    <P className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</P>
                    {label === 'Status' ? <StatusBadge status={value} /> : <P className="text-sm text-slate-900">{String(value ?? '')}</P>}
                  </Div>
                ))}
              </Div>
            </Div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md bg-white p-0">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle>Delete Advertisement</DialogTitle>
            <DialogDescription>Are you sure you want to delete this advertisement? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <Div className="px-4 pb-4 flex-row items-center gap-2">
            <Button onClick={() => setIsDeleteOpen(false)} className={`${BTN_SECONDARY} flex-1`}>
              <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
            </Button>
            <Button onClick={handleDelete} className={`${BTN_DANGER} flex-1`}>
              <Span className={BTN_TEXT_PRIMARY}>Delete</Span>
            </Button>
          </Div>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
