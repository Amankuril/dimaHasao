/* Ported from Frontend/src/modules/Food/pages/admin/campaigns/BasicCampaign.jsx (tools/port.js first pass). */
import { useState, useMemo } from 'react';
import { Search, Download, ChevronDown, Plus, Edit, Trash2, Megaphone, Filter, Settings, FileSpreadsheet, FileDown, FileText, Code } from 'lucide-react-native';
import { emptyBasicCampaigns } from '../../../utils/adminFallbackData';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../../components/shadcn';
import {
  exportCampaignsToCSV,
  exportCampaignsToExcel,
  exportCampaignsToPDF,
  exportCampaignsToJSON,
} from '../../../components/admin/campaigns/campaignsExportUtils';
import AddEditBasicCampaignDialog from '../../../components/admin/campaigns/AddEditBasicCampaignDialog';
import DeleteCampaignDialog from '../../../components/admin/campaigns/DeleteCampaignDialog';
import CampaignFilterPanel from '../../../components/admin/campaigns/CampaignFilterPanel';
import SettingsDialog from '../../../components/admin/orders/SettingsDialog';
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
  EmptyState,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
} from '../../../../admin/ui';
import { Button, Div, Input, Span, Icon as UiIcon } from '../../../../components/web';

export default function BasicCampaign() {
  const [searchQuery, setSearchQuery] = useState('');
  const [campaigns, setCampaigns] = useState(emptyBasicCampaigns);
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    fromDate: '',
    toDate: '',
  });
  const [visibleColumns, setVisibleColumns] = useState({
    si: true,
    title: true,
    dateDuration: true,
    timeDuration: true,
    status: true,
    actions: true,
  });
  const filteredCampaigns = useMemo(() => {
    let result = [...campaigns];

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (campaign) =>
          campaign.title.toLowerCase().includes(query) || campaign.dateStart.toLowerCase().includes(query) || campaign.dateEnd.toLowerCase().includes(query),
      );
    }

    // Apply filters
    if (filters.status) {
      result = result.filter((campaign) => {
        if (filters.status === 'Active') return campaign.status === true;
        if (filters.status === 'Inactive') return campaign.status === false;
        return true;
      });
    }
    if (filters.fromDate) {
      result = result.filter((campaign) => {
        const campaignStart = new Date(campaign.dateStart);
        const filterStart = new Date(filters.fromDate);
        return campaignStart >= filterStart;
      });
    }
    if (filters.toDate) {
      result = result.filter((campaign) => {
        const campaignEnd = new Date(campaign.dateEnd);
        const filterEnd = new Date(filters.toDate);
        return campaignEnd <= filterEnd;
      });
    }
    return result;
  }, [campaigns, searchQuery, filters]);
  const activeFiltersCount = useMemo(() => {
    return Object.values(filters).filter((value) => value !== '' && value !== null && value !== undefined).length;
  }, [filters]);
  const handleToggleStatus = (sl) => {
    setCampaigns(
      campaigns.map((campaign) =>
        campaign.sl === sl
          ? {
              ...campaign,
              status: !campaign.status,
            }
          : campaign,
      ),
    );
  };
  const handleDelete = (sl) => {
    setCampaigns(campaigns.filter((campaign) => campaign.sl !== sl));
  };
  const handleEdit = (campaign) => {
    setSelectedCampaign(campaign);
    setIsAddEditOpen(true);
  };
  const handleAdd = () => {
    setSelectedCampaign(null);
    setIsAddEditOpen(true);
  };
  const handleSave = (formData) => {
    if (selectedCampaign) {
      // Edit existing
      setCampaigns(
        campaigns.map((campaign) =>
          campaign.sl === selectedCampaign.sl
            ? {
                ...campaign,
                ...formData,
              }
            : campaign,
        ),
      );
    } else {
      // Add new
      const newCampaign = {
        sl: campaigns.length > 0 ? Math.max(...campaigns.map((c) => c.sl)) + 1 : 1,
        ...formData,
        status: true,
      };
      setCampaigns([...campaigns, newCampaign]);
    }
  };
  const handleDeleteClick = (campaign) => {
    setSelectedCampaign(campaign);
    setIsDeleteOpen(true);
  };
  const handleExport = (format) => {
    const filename = 'basic_campaigns';
    switch (format) {
      case 'csv':
        exportCampaignsToCSV(filteredCampaigns, filename, false);
        break;
      case 'excel':
        exportCampaignsToExcel(filteredCampaigns, filename, false);
        break;
      case 'pdf':
        exportCampaignsToPDF(filteredCampaigns, filename, false);
        break;
      case 'json':
        exportCampaignsToJSON(filteredCampaigns, filename);
        break;
      default:
        break;
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
      title: true,
      dateDuration: true,
      timeDuration: true,
      status: true,
      actions: true,
    });
  };
  const columnConfig = {
    si: 'Serial Number',
    title: 'Title',
    dateDuration: 'Date Duration',
    timeDuration: 'Time Duration',
    status: 'Status',
    actions: 'Actions',
  };
  const columnWidths = {
    si: 56,
    title: 180,
    dateDuration: 180,
    timeDuration: 160,
    status: 120,
    actions: 104,
  };
  const columnLabels = {
    si: 'SI',
    title: 'Title',
    dateDuration: 'Date Duration',
    timeDuration: 'Time Duration',
    status: 'Status',
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
        title="Basic Campaign"
        subtitle={`${filteredCampaigns.length} ${filteredCampaigns.length === 1 ? 'campaign' : 'campaigns'} in this list`}
        breadcrumb={[{ label: 'Food' }, { label: 'Promotions' }, { label: 'Basic campaign' }]}
        actions={
          <Button onClick={handleAdd} className={BTN_PRIMARY}>
            <UiIcon as={Plus} size={16} className="text-white" />
            <Span className={BTN_TEXT_PRIMARY}>Add New Campaign</Span>
          </Button>
        }
      />

      <Card className="mb-4">
        <Toolbar className="mb-0">
          <Div className="flex-row items-center gap-2 h-11 px-3 rounded-lg border border-slate-300 bg-white flex-1 min-w-[200px]">
            <UiIcon as={Search} size={16} className="text-slate-400" />
            <Input
              type="text"
              placeholder="Ex: Search by name..."
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
            <Span className={BTN_TEXT_SECONDARY}>Filter</Span>
            {activeFiltersCount > 0 ? <StatusBadge tone="info" label={String(activeFiltersCount)} /> : null}
          </Button>

          <Button onClick={() => setIsSettingsOpen(true)} className={`${BTN_SECONDARY} w-11 px-0`} accessibilityLabel="Table settings">
            <UiIcon as={Settings} size={18} className="text-slate-600" />
          </Button>
        </Toolbar>
      </Card>

      {filteredCampaigns.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No campaigns found"
          message={
            searchQuery || activeFiltersCount > 0
              ? 'No campaigns match your search or filters. Clear them to see everything.'
              : 'Create your first basic campaign to promote restaurants for a set window.'
          }
          actionLabel="Add New Campaign"
          onAction={handleAdd}
        />
      ) : (
        <DataTable cols={tableCols}>
          <THead cols={tableCols} labels={tableLabels} />
          <TBody>
            {filteredCampaigns.map((campaign, i, all) => (
              <Row key={campaign.sl} last={i === all.length - 1}>
                {visibleColumns.si ? <Cell width={widthOf('si')}>{String(campaign.sl)}</Cell> : null}
                {visibleColumns.title ? (
                  <Cell width={widthOf('title')}>
                    <Span className="text-sm font-semibold text-slate-900">{campaign.title}</Span>
                  </Cell>
                ) : null}
                {visibleColumns.dateDuration ? <Cell width={widthOf('dateDuration')}>{`${campaign.dateStart} - ${campaign.dateEnd}`}</Cell> : null}
                {visibleColumns.timeDuration ? <Cell width={widthOf('timeDuration')}>{`${campaign.timeStart} - ${campaign.timeEnd}`}</Cell> : null}
                {visibleColumns.status ? (
                  <Cell width={widthOf('status')}>
                    <Button
                      onClick={() => handleToggleStatus(campaign.sl)}
                      className="h-11 justify-center"
                      accessibilityLabel={`Toggle status for ${campaign.title}`}
                    >
                      <StatusBadge status={campaign.status ? 'active' : 'inactive'} />
                    </Button>
                  </Cell>
                ) : null}
                {visibleColumns.actions ? (
                  <Cell width={widthOf('actions')}>
                    <Div className="flex-row items-center gap-1">
                      <Button
                        onClick={() => handleEdit(campaign)}
                        className="w-11 h-11 rounded-lg items-center justify-center"
                        accessibilityLabel={`Edit ${campaign.title}`}
                      >
                        <UiIcon as={Edit} size={16} className="text-blue-600" />
                      </Button>
                      <Button
                        onClick={() => handleDeleteClick(campaign)}
                        className="w-11 h-11 rounded-lg items-center justify-center"
                        accessibilityLabel={`Delete ${campaign.title}`}
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
      <AddEditBasicCampaignDialog isOpen={isAddEditOpen} onOpenChange={setIsAddEditOpen} campaign={selectedCampaign} onSave={handleSave} />

      {/* Delete Dialog */}
      <DeleteCampaignDialog isOpen={isDeleteOpen} onOpenChange={setIsDeleteOpen} campaign={selectedCampaign} onConfirm={handleDelete} />

      {/* Filter Panel */}
      <CampaignFilterPanel
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        setFilters={setFilters}
        onApply={() => setIsFilterOpen(false)}
        onReset={() =>
          setFilters({
            status: '',
            fromDate: '',
            toDate: '',
          })
        }
      />

      {/* Settings Dialog */}
      <SettingsDialog
        isOpen={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        visibleColumns={visibleColumns}
        toggleColumn={toggleColumn}
        resetColumns={resetColumns}
        columnsConfig={columnConfig}
      />
    </AdminPage>
  );
}
