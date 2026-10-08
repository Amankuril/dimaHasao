/* Ported from Frontend/src/modules/Food/pages/admin/advertisement/AdRequests.jsx (tools/port.js first pass). */
import { useState, useMemo } from 'react';
import { Search, Settings, MoreVertical, Building2, Download, ChevronDown, Filter, FileDown, FileSpreadsheet, FileText, Code, Eye, CheckCircle2, XCircle, Inbox } from 'lucide-react-native';
import { emptyAdRequests } from '../../../utils/adminFallbackData';
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
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
  useLayoutWidth,
} from '../../../../admin/ui';
import { Button, Div, HScroll, Input, Option, P, Select, Span, Icon as UiIcon } from '../../../../components/web';

export default function AdRequests() {
  const [activeTab, setActiveTab] = useState('new');
  const [searchQuery, setSearchQuery] = useState('');
  const [requests, setRequests] = useState(emptyAdRequests);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [filters, setFilters] = useState({
    adsType: '',
    restaurant: '',
  });
  const [visibleColumns, setVisibleColumns] = useState({
    si: true,
    adsId: true,
    adsTitle: true,
    restaurantInfo: true,
    adsType: true,
    duration: true,
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
    actions: 'Actions',
  };
  const filteredRequests = useMemo(() => {
    let result = [...requests];

    // Filter by tab
    if (activeTab === 'new') {
      result = result.filter((r) => r.status === 'new' || !r.status);
    } else if (activeTab === 'update') {
      result = result.filter((r) => r.status === 'update');
    } else if (activeTab === 'denied') {
      result = result.filter((r) => r.status === 'denied');
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (request) =>
          request.adsId?.toLowerCase().includes(query) ||
          request.restaurantName?.toLowerCase().includes(query) ||
          request.adsTitle?.toLowerCase().includes(query),
      );
    }

    // Filter by ads type
    if (filters.adsType) {
      result = result.filter((r) => r.adsType === filters.adsType);
    }

    // Filter by restaurant
    if (filters.restaurant) {
      result = result.filter((r) => r.restaurantName === filters.restaurant);
    }
    return result;
  }, [requests, searchQuery, activeTab, filters]);
  const activeFiltersCount = Object.values(filters).filter((v) => v).length;
  const handleExport = (format) => {
    const filename = `ad_requests_${activeTab}`;
    switch (format) {
      case 'csv':
        exportAdvertisementsToCSV(filteredRequests, filename);
        break;
      case 'excel':
        exportAdvertisementsToExcel(filteredRequests, filename);
        break;
      case 'pdf':
        exportAdvertisementsToPDF(filteredRequests, filename);
        break;
      case 'json':
        exportAdvertisementsToJSON(filteredRequests, filename);
        break;
      default:
        break;
    }
  };
  const handleViewRequest = (request) => {
    setSelectedRequest(request);
    setIsViewOpen(true);
  };
  const handleApprove = (sl) => {
    setRequests(
      requests.map((r) =>
        r.sl === sl
          ? {
              ...r,
              status: 'approved',
            }
          : r,
      ),
    );
  };
  const handleDeny = (sl) => {
    setRequests(
      requests.map((r) =>
        r.sl === sl
          ? {
              ...r,
              status: 'denied',
            }
          : r,
      ),
    );
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
      actions: true,
    });
  };
  const handleApplyFilters = () => {
    setIsFilterOpen(false);
  };
  const handleResetFilters = () => {
    setFilters({
      adsType: '',
      restaurant: '',
    });
  };
  const restaurants = [...new Set(requests.map((r) => r.restaurantName))].filter(Boolean);
  const adsTypes = [...new Set(requests.map((r) => r.adsType))].filter(Boolean);
  const tabs = [
    {
      key: 'new',
      label: 'New Request',
    },
    {
      key: 'update',
      label: 'Update Request',
    },
    {
      key: 'denied',
      label: 'Denied Requests',
    },
  ];
  const columnWidths = {
    si: 56,
    adsId: 120,
    adsTitle: 180,
    restaurantInfo: 200,
    adsType: 140,
    duration: 180,
    actions: 64,
  };
  const columnLabels = {
    si: 'SI',
    adsId: 'Ads ID',
    adsTitle: 'Ads Title',
    restaurantInfo: 'Restaurant Info',
    adsType: 'Ads Type',
    duration: 'Duration',
    actions: 'Action',
  };
  const shownKeys = Object.keys(columnWidths).filter((key) => visibleColumns[key]);
  const tableCols = shownKeys.map((key) => columnWidths[key]);
  const tableLabels = shownKeys.map((key) => columnLabels[key]);
  const widthOf = (key) => columnWidths[key];
  const activeTabLabel = tabs.find((t) => t.key === activeTab)?.label;
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={Inbox}
        title="Advertisement Requests"
        subtitle={`${filteredRequests.length} ${filteredRequests.length === 1 ? 'request' : 'requests'} in ${activeTabLabel}`}
        breadcrumb={[{ label: 'Food' }, { label: 'Advertisements' }, { label: 'Requests' }]}
      />

      <Card className="mb-4">
        {/* Tabs */}
        <HScroll className="mb-3 border-b border-slate-200" contentClassName="flex-row items-center">
          {tabs.map((tab) => (
            <Button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 h-11 justify-center border-b-2 ${activeTab === tab.key ? 'border-blue-600' : 'border-transparent'}`}
            >
              <Span className={`text-sm font-semibold ${activeTab === tab.key ? 'text-blue-600' : 'text-slate-600'}`}>{tab.label}</Span>
            </Button>
          ))}
        </HScroll>

        <Toolbar className="mb-0">
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

      {filteredRequests.length === 0 ? (
        <EmptyState
          title="No requests here"
          message={
            searchQuery || activeFiltersCount > 0
              ? 'No requests match your search or filters. Clear them to see everything.'
              : `Nothing in ${activeTabLabel} right now. Requests from restaurants will appear here.`
          }
        />
      ) : (
        <DataTable cols={tableCols}>
          <THead cols={tableCols} labels={tableLabels} />
          <TBody>
            {filteredRequests.map((request, i, all) => (
              <Row key={request.sl} last={i === all.length - 1}>
                {visibleColumns.si ? <Cell width={widthOf('si')}>{String(request.sl)}</Cell> : null}
                {visibleColumns.adsId ? (
                  <Cell width={widthOf('adsId')}>
                    <Span className="text-sm font-semibold text-slate-900">{request.adsId}</Span>
                  </Cell>
                ) : null}
                {visibleColumns.adsTitle ? (
                  <Cell width={widthOf('adsTitle')}>
                    <Span className="text-sm font-semibold text-slate-900">{request.adsTitle}</Span>
                  </Cell>
                ) : null}
                {visibleColumns.restaurantInfo ? (
                  <Cell width={widthOf('restaurantInfo')}>
                    <Div className="flex-row items-center gap-2">
                      <Div className="w-9 h-9 rounded-lg bg-slate-100 items-center justify-center shrink-0">
                        <UiIcon as={Building2} size={16} className="text-slate-500" />
                      </Div>
                      <Div className="flex-1 min-w-0">
                        <Span className="text-sm font-semibold text-slate-900">{request.restaurantName}</Span>
                        <Span className="text-xs text-slate-500">{request.restaurantEmail}</Span>
                      </Div>
                    </Div>
                  </Cell>
                ) : null}
                {visibleColumns.adsType ? <Cell width={widthOf('adsType')}>{request.adsType}</Cell> : null}
                {visibleColumns.duration ? <Cell width={widthOf('duration')}>{request.duration}</Cell> : null}
                {visibleColumns.actions ? (
                  <Cell width={widthOf('actions')} align="center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button className="w-11 h-11 rounded-lg items-center justify-center" accessibilityLabel={`Actions for ${request.adsId}`}>
                          <UiIcon as={MoreVertical} size={18} className="text-slate-600" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 bg-white border border-slate-200 rounded-lg">
                        <DropdownMenuItem onClick={() => handleViewRequest(request)} className="cursor-pointer">
                          <UiIcon as={Eye} size={16} className="mr-2 text-slate-500" />
                          View Details
                        </DropdownMenuItem>
                        {activeTab === 'new' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleApprove(request.sl)} className="cursor-pointer text-green-700">
                              <UiIcon as={CheckCircle2} size={16} className="mr-2 text-green-700" />
                              Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeny(request.sl)} className="cursor-pointer text-red-600">
                              <UiIcon as={XCircle} size={16} className="mr-2 text-red-600" />
                              Deny
                            </DropdownMenuItem>
                          </>
                        )}
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
            <DialogTitle>Filter Requests</DialogTitle>
          </DialogHeader>
          <Div className="px-4 pb-4 gap-3">
            <Field label="Ads Type">
              <Select
                value={filters.adsType}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    adsType: e.target.value,
                  }))
                }
                className={INPUT}
              >
                <Option value="">All Types</Option>
                {adsTypes.map((type) => (
                  <Option key={type} value={type}>
                    {type}
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

      {/* View Request Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-2xl bg-white p-0">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle>Advertisement Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <Div className="px-4 pb-4">
              <SectionTitle>{selectedRequest.adsTitle}</SectionTitle>
              <Div className={`grid grid-cols-${tablet ? 2 : 1} gap-3`}>
                {[
                  ['Ads ID', selectedRequest.adsId],
                  ['Ads Title', selectedRequest.adsTitle],
                  ['Restaurant Name', selectedRequest.restaurantName],
                  ['Restaurant Email', selectedRequest.restaurantEmail],
                  ['Ads Type', selectedRequest.adsType],
                  ['Duration', selectedRequest.duration],
                ].map(([label, value]) => (
                  <Div key={label} className="gap-1">
                    <P className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</P>
                    <P className="text-sm text-slate-900">{String(value ?? '')}</P>
                  </Div>
                ))}
              </Div>
            </Div>
          )}
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
