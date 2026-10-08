/* Ported from Frontend/src/modules/Food/pages/admin/system/PageMetaData.jsx (tools/port.js first pass). */
import { useState, useMemo } from 'react';
import { Pencil, Settings, Search, Download, ChevronDown, FileText, FileSpreadsheet, Code, Check, Columns } from 'lucide-react-native';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../../components/shadcn';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../components/shadcn';
import { exportSEOPagesToCSV, exportSEOPagesToExcel, exportSEOPagesToPDF, exportSEOPagesToJSON } from '../../../components/admin/seo/seoExportUtils';
import { useCompanyName } from '../../../hooks/useCompanyName';
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
  EmptyState,
  Field,
  INPUT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_TEXT_PRIMARY,
  BTN_TEXT_SECONDARY,
} from '../../../../admin/ui';
import { Button, Div, Input, Label, Span, Textarea, Icon as UiIcon } from '../../../../components/web';
import { Text } from '../../../../components/Text';
import { tw } from '../../../../lib/tw';
import { alert } from '../../../../lib/webShim';
const TEXTAREA = 'px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900';
const debugLog = (...args) => {};
const debugWarn = (...args) => {};
const debugError = (...args) => {};
const seoPages = [
  {
    id: 1,
    name: 'Restaurant list',
  },
  {
    id: 2,
    name: 'Category list',
  },
  {
    id: 3,
    name: 'Campaign',
  },
  {
    id: 4,
    name: 'Cuisine list',
  },
  {
    id: 5,
    name: 'Home page',
  },
  {
    id: 6,
    name: 'Contact us page',
  },
  {
    id: 7,
    name: 'About us page',
  },
  {
    id: 8,
    name: 'Restaurant join page',
  },
  {
    id: 9,
    name: 'Deliveryman join page',
  },
  {
    id: 10,
    name: 'Terms and conditions page',
  },
  {
    id: 11,
    name: 'Privacy policy page',
  },
  {
    id: 12,
    name: 'Refund policy page',
  },
  {
    id: 13,
    name: 'Cancellation policy page',
  },
  {
    id: 14,
    name: 'Shipping policy page',
  },
];
export default function PageMetaDataPageMetaData() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState(null);
  const [seoData, setSeoData] = useState({
    title: '',
    description: '',
    keywords: '',
    metaTitle: '',
    metaDescription: '',
    ogTitle: '',
    ogDescription: '',
    ogImage: '',
  });
  const [visibleColumns, setVisibleColumns] = useState({
    si: true,
    pages: true,
    actions: true,
  });
  const companyName = useCompanyName();
  const filteredPages = useMemo(() => {
    if (!searchQuery.trim()) {
      return seoPages;
    }
    const query = searchQuery.toLowerCase().trim();
    return seoPages.filter((page) => page.name.toLowerCase().includes(query));
  }, [searchQuery]);
  const handleEdit = (pageId) => {
    const page = seoPages.find((p) => p.id === pageId);
    if (page) {
      setEditingPage(page);
      // Load existing SEO data (in real app, this would come from API)
      setSeoData({
        title: page.name,
        description: '',
        keywords: '',
        metaTitle: `${page.name} - ${companyName}`,
        metaDescription: `SEO description for ${page.name}`,
        ogTitle: `${page.name} - ${companyName}`,
        ogDescription: `Open Graph description for ${page.name}`,
        ogImage: '',
      });
      setIsEditDialogOpen(true);
    }
  };
  const handleSaveSEO = () => {
    if (!editingPage) return;

    // In real app, this would save to API
    debugLog('Saving SEO data for:', editingPage.name, seoData);
    alert(`SEO data saved successfully for ${editingPage.name}!`);
    setIsEditDialogOpen(false);
    setEditingPage(null);
    setSeoData({
      title: '',
      description: '',
      keywords: '',
      metaTitle: '',
      metaDescription: '',
      ogTitle: '',
      ogDescription: '',
      ogImage: '',
    });
  };
  const handleExport = (format) => {
    if (filteredPages.length === 0) {
      alert('No data to export');
      return;
    }
    switch (format) {
      case 'csv':
        exportSEOPagesToCSV(filteredPages);
        break;
      case 'excel':
        exportSEOPagesToExcel(filteredPages);
        break;
      case 'pdf':
        exportSEOPagesToPDF(filteredPages);
        break;
      case 'json':
        exportSEOPagesToJSON(filteredPages);
        break;
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
      pages: true,
      actions: true,
    });
  };
  const columnsConfig = {
    si: 'Serial Number',
    pages: 'Pages',
    actions: 'Actions',
  };
  const COLUMN_SPEC = [
    { key: 'si', label: 'SI', width: 70 },
    { key: 'pages', label: 'Pages', width: 220 },
    { key: 'actions', label: 'Action', width: 160 },
  ];
  const shown = COLUMN_SPEC.filter((c) => visibleColumns[c.key]);
  const tableCols = shown.map((c) => c.width);
  const tableLabels = shown.map((c) => c.label);
  const widthOf = (key) => shown.find((c) => c.key === key)?.width || 0;
  return (
    <AdminPage maxWidth={1200}>
      <PageHeader
        icon={Settings}
        title="Manage Page SEO"
        subtitle="Titles, descriptions and Open Graph tags for every public page"
        breadcrumb={[{ label: 'Food' }, { label: 'System' }, { label: 'Page SEO' }]}
        actions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className={BTN_SECONDARY}>
                  <UiIcon as={Download} size={16} className="text-slate-600" />
                  <Span className={BTN_TEXT_SECONDARY}>Export</Span>
                  <UiIcon as={ChevronDown} size={14} className="text-slate-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white border border-slate-200 rounded-xl">
                <DropdownMenuLabel>Export Format</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExport('csv')}>
                  <UiIcon as={FileText} size={16} className="mr-2 text-slate-500" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('excel')}>
                  <UiIcon as={FileSpreadsheet} size={16} className="mr-2 text-slate-500" />
                  Export as Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('pdf')}>
                  <UiIcon as={FileText} size={16} className="mr-2 text-slate-500" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('json')}>
                  <UiIcon as={Code} size={16} className="mr-2 text-slate-500" />
                  Export as JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => setIsSettingsOpen(true)} accessibilityLabel="Table settings" className={BTN_SECONDARY}>
              <UiIcon as={Columns} size={16} className="text-slate-600" />
              <Span className={BTN_TEXT_SECONDARY}>Columns</Span>
            </Button>
          </>
        }
      />

      <Card className="mb-4">
        <SectionTitle>Filters</SectionTitle>
        <Toolbar className="mb-0">
          <Div className="flex-row items-center gap-2 flex-1 min-w-[200px] h-11 px-3 rounded-lg border border-slate-300 bg-white">
            <UiIcon as={Search} size={16} className="text-slate-400 shrink-0" />
            <Input
              type="text"
              placeholder="Search by page name…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 text-sm text-slate-900"
            />
          </Div>
        </Toolbar>
      </Card>

      <Div className="flex-row items-center gap-2 mb-2">
        <Text style={tw`text-base font-semibold text-slate-900`}>SEO pages</Text>
        <Span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{filteredPages.length}</Span>
      </Div>

      {filteredPages.length === 0 ? (
        <EmptyState
          title="No pages found"
          message="No page name matches your search."
          actionLabel={searchQuery ? 'Clear search' : undefined}
          onAction={searchQuery ? () => setSearchQuery('') : undefined}
        />
      ) : tableCols.length === 0 ? (
        <EmptyState icon={Columns} title="No columns shown" message="Every column is hidden. Turn one back on in table settings." actionLabel="Reset columns" onAction={resetColumns} />
      ) : (
        <DataTable cols={tableCols}>
          <THead cols={tableCols} labels={tableLabels} />
          <TBody>
            {filteredPages.map((page, index) => (
              <Row key={page.id} last={index === filteredPages.length - 1}>
                {visibleColumns.si ? <Cell width={widthOf('si')}>{String(index + 1)}</Cell> : null}
                {visibleColumns.pages ? <Cell width={widthOf('pages')}>{page.name}</Cell> : null}
                {visibleColumns.actions ? (
                  <Cell width={widthOf('actions')} align="center">
                    <Button type="button" onClick={() => handleEdit(page.id)} className={BTN_PRIMARY}>
                      <UiIcon as={Pencil} size={14} className="text-white" />
                      <Span className={BTN_TEXT_PRIMARY}>Edit</Span>
                    </Button>
                  </Cell>
                ) : null}
              </Row>
            ))}
          </TBody>
        </DataTable>
      )}

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-md bg-white p-0">
          <DialogHeader className="px-5 pt-5 pb-3">
            <DialogTitle>Table Settings</DialogTitle>
          </DialogHeader>
          <Div className="px-5 pb-5 gap-3">
            <Div className="flex-row items-center gap-2">
              <UiIcon as={Columns} size={16} className="text-slate-500" />
              <Text style={tw`text-sm font-semibold text-slate-700`}>Visible columns</Text>
            </Div>
            <Div className="gap-1">
              {Object.entries(columnsConfig).map(([key, label]) => (
                <Label key={key} className="flex-row items-center gap-3 min-h-11 px-2 rounded-lg">
                  <Input type="checkbox" checked={visibleColumns[key]} onChange={() => toggleColumn(key)} className="w-5 h-5 border-slate-300 rounded" />
                  <Span className="text-sm text-slate-700 flex-1">{label}</Span>
                  {visibleColumns[key] ? <UiIcon as={Check} size={16} className="text-blue-600" /> : null}
                </Label>
              ))}
            </Div>
            <Div className="flex-row flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <Button onClick={resetColumns} className={BTN_SECONDARY}>
                <Span className={BTN_TEXT_SECONDARY}>Reset</Span>
              </Button>
              <Button onClick={() => setIsSettingsOpen(false)} className={BTN_PRIMARY}>
                <Span className={BTN_TEXT_PRIMARY}>Apply</Span>
              </Button>
            </Div>
          </Div>
        </DialogContent>
      </Dialog>

      {/* Edit SEO Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-xl bg-white p-0">
          <DialogHeader className="px-5 pt-5 pb-3">
            <DialogTitle>{`Edit SEO content — ${editingPage?.name || ''}`}</DialogTitle>
          </DialogHeader>
          <Div className="px-5 pb-5 gap-3">
            <Field label="Page Title">
              <Input
                value={seoData.title}
                onChange={(e) =>
                  setSeoData({
                    ...seoData,
                    title: e.target.value,
                  })
                }
                placeholder="Enter page title"
                className={INPUT}
              />
            </Field>

            <Field label="Description">
              <Textarea
                value={seoData.description}
                onChange={(e) =>
                  setSeoData({
                    ...seoData,
                    description: e.target.value,
                  })
                }
                placeholder="Enter page description"
                rows={3}
                className={TEXTAREA}
              />
            </Field>

            <Field label="Keywords" hint="Comma separated">
              <Input
                value={seoData.keywords}
                onChange={(e) =>
                  setSeoData({
                    ...seoData,
                    keywords: e.target.value,
                  })
                }
                placeholder="Enter keywords (comma separated)"
                className={INPUT}
              />
            </Field>

            <Div className="border-t border-slate-200 pt-3 gap-3">
              <Text style={tw`text-base font-semibold text-slate-900`}>Meta tags</Text>
              <Field label="Meta Title">
                <Input
                  value={seoData.metaTitle}
                  onChange={(e) =>
                    setSeoData({
                      ...seoData,
                      metaTitle: e.target.value,
                    })
                  }
                  placeholder="Enter meta title"
                  className={INPUT}
                />
              </Field>
              <Field label="Meta Description">
                <Textarea
                  value={seoData.metaDescription}
                  onChange={(e) =>
                    setSeoData({
                      ...seoData,
                      metaDescription: e.target.value,
                    })
                  }
                  placeholder="Enter meta description"
                  rows={2}
                  className={TEXTAREA}
                />
              </Field>
            </Div>

            <Div className="border-t border-slate-200 pt-3 gap-3">
              <Text style={tw`text-base font-semibold text-slate-900`}>Open Graph tags</Text>
              <Field label="OG Title">
                <Input
                  value={seoData.ogTitle}
                  onChange={(e) =>
                    setSeoData({
                      ...seoData,
                      ogTitle: e.target.value,
                    })
                  }
                  placeholder="Enter OG title"
                  className={INPUT}
                />
              </Field>
              <Field label="OG Description">
                <Textarea
                  value={seoData.ogDescription}
                  onChange={(e) =>
                    setSeoData({
                      ...seoData,
                      ogDescription: e.target.value,
                    })
                  }
                  placeholder="Enter OG description"
                  rows={2}
                  className={TEXTAREA}
                />
              </Field>
              <Field label="OG Image URL">
                <Input
                  value={seoData.ogImage}
                  onChange={(e) =>
                    setSeoData({
                      ...seoData,
                      ogImage: e.target.value,
                    })
                  }
                  placeholder="Enter OG image URL"
                  className={INPUT}
                />
              </Field>
            </Div>

            <Div className="flex-row flex-wrap justify-end gap-2 pt-3 border-t border-slate-200">
              <Button
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingPage(null);
                }}
                className={BTN_SECONDARY}
              >
                <Span className={BTN_TEXT_SECONDARY}>Cancel</Span>
              </Button>
              <Button onClick={handleSaveSEO} className={BTN_PRIMARY}>
                <Span className={BTN_TEXT_PRIMARY}>Save Changes</Span>
              </Button>
            </Div>
          </Div>
        </DialogContent>
      </Dialog>
    </AdminPage>
  );
}
