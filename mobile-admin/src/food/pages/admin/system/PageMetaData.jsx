/* Ported from Frontend/src/modules/Food/pages/admin/system/PageMetaData.jsx (tools/port.js first pass). */
import { useState, useMemo } from 'react';
import { Pencil, Settings, Search, Download, ChevronDown, FileText, FileSpreadsheet, Code, Check, Columns, ArrowUpDown } from 'lucide-react-native';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../../components/shadcn';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../../components/shadcn';
import { Label } from '../../../../components/shadcn';
import { Textarea } from '../../../../components/shadcn';
import { exportSEOPagesToCSV, exportSEOPagesToExcel, exportSEOPagesToPDF, exportSEOPagesToJSON } from '../../../components/admin/seo/seoExportUtils';
import { useCompanyName } from '../../../hooks/useCompanyName';
import { Button, Div, H1, H3, Input, P, ScrollDiv, Span, Table, Tbody, Td, Th, Thead, Tr, Icon as UiIcon } from '../../../../components/web';
import { alert } from '../../../../lib/webShim';
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
  const tableCols = [visibleColumns.si && 70, visibleColumns.pages && 220, visibleColumns.actions && 140].filter(Boolean);
  return (
    <ScrollDiv className="p-2 lg:p-3 bg-slate-50 min-h-screen">
      <Div className="w-full mx-auto max-w-6xl">
        {/* Page Title */}
        <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 mb-3">
          <Div className="flex items-center gap-2">
            <Div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center">
              <UiIcon as={Settings} className="w-3.5 h-3.5 text-white" />
            </Div>
            <H1 className="text-lg font-bold text-slate-900">Manage Page SEO</H1>
          </Div>
        </Div>

        {/* Search and Actions Section */}
        <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 mb-3">
          <Div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <Div className="relative flex-1 min-w-[250px]">
              <Input
                type="text"
                placeholder="Search by page name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 pr-2 py-1.5 w-full text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <UiIcon as={Search} className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            </Div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="px-4 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1 transition-all">
                  <UiIcon as={Download} className="w-3.5 h-3.5" />
                  <Span className="font-bold">Export</Span>
                  <UiIcon as={ChevronDown} className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
                <DropdownMenuLabel>Export Format</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExport('csv')} className="cursor-pointer">
                  <UiIcon as={FileText} className="w-4 h-4 mr-2" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('excel')} className="cursor-pointer">
                  <UiIcon as={FileSpreadsheet} className="w-4 h-4 mr-2" />
                  Export as Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('pdf')} className="cursor-pointer">
                  <UiIcon as={FileText} className="w-4 h-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('json')} className="cursor-pointer">
                  <UiIcon as={Code} className="w-4 h-4 mr-2" />
                  Export as JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              onClick={() => setIsSettingsOpen(true)}
              className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-all"
            >
              <UiIcon as={Settings} className="w-4 h-4" />
            </Button>
          </Div>
        </Div>

        {/* SEO Setup List */}
        <Div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <Div className="mb-4">
            <Div className="flex items-center gap-2">
              <Span className="text-xs font-semibold text-slate-700">SEO Pages</Span>
              <Span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{filteredPages.length}</Span>
            </Div>
          </Div>

          {/* Table */}
            <Table cols={tableCols} className="w-full">
              <Thead className="bg-slate-50 border-b border-slate-200">
                <Tr>
                  {visibleColumns.si && (
                    <Th className="px-3 py-2 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      <Div className="flex items-center gap-2">
                        <Span>SI</Span>
                        <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                      </Div>
                    </Th>
                  )}
                  {visibleColumns.pages && (
                    <Th className="px-3 py-2 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      <Div className="flex items-center gap-2">
                        <Span>Pages</Span>
                        <UiIcon as={ArrowUpDown} className="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600" />
                      </Div>
                    </Th>
                  )}
                  {visibleColumns.actions && <Th className="px-3 py-2 text-center text-[10px] font-bold text-slate-700 uppercase tracking-wider">Action</Th>}
                </Tr>
              </Thead>
              <Tbody className="bg-white divide-y divide-slate-100">
                {filteredPages.length === 0 ? (
                  <Tr>
                    <Td colSpan={Object.values(visibleColumns).filter((v) => v).length} className="px-6 py-8 text-center">
                      <P className="text-xs text-slate-500">No pages found</P>
                    </Td>
                  </Tr>
                ) : (
                  filteredPages.map((page, index) => (
                    <Tr key={page.id} className="hover:bg-slate-50 transition-colors">
                      {visibleColumns.si && (
                        <Td className="px-3 py-2.5">
                          <Span className="text-xs text-slate-700">{index + 1}</Span>
                        </Td>
                      )}
                      {visibleColumns.pages && (
                        <Td className="px-3 py-2.5">
                          <Span className="text-xs text-slate-700">{page.name}</Span>
                        </Td>
                      )}
                      {visibleColumns.actions && (
                        <Td className="px-3 py-2.5 whitespace-nowrap text-center">
                          <Button
                            type="button"
                            onClick={() => handleEdit(page.id)}
                            className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1 mx-auto"
                          >
                            <UiIcon as={Pencil} className="w-3 h-3" />
                            <Span>Edit Content</Span>
                          </Button>
                        </Td>
                      )}
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
        </Div>
      </Div>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-md bg-white p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="flex items-center gap-2">
              <UiIcon as={Settings} className="w-4 h-4" />
              Table Settings
            </DialogTitle>
          </DialogHeader>
          <Div className="px-6 pb-6 space-y-4">
            <Div>
              <H3 className="text-xs font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <UiIcon as={Columns} className="w-4 h-4" />
                Visible Columns
              </H3>
              <Div className="space-y-2">
                {Object.entries(columnsConfig).map(([key, label]) => (
                  <Label key={key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <Input
                      type="checkbox"
                      checked={visibleColumns[key]}
                      onChange={() => toggleColumn(key)}
                      className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                    />
                    <Span className="text-xs text-slate-700">{label}</Span>
                    {visibleColumns[key] && <UiIcon as={Check} className="w-4 h-4 text-emerald-600 ml-auto" />}
                  </Label>
                ))}
              </Div>
            </Div>
            <Div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <Button
                onClick={resetColumns}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all"
              >
                Reset
              </Button>
              <Button
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-md"
              >
                Apply
              </Button>
            </Div>
          </Div>
        </DialogContent>
      </Dialog>

      {/* Edit SEO Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl bg-white max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UiIcon as={Pencil} className="w-4 h-4" />
              Edit SEO Content - {editingPage?.name}
            </DialogTitle>
          </DialogHeader>
          <Div className="space-y-4 py-4">
            <Div className="space-y-2">
              <Label htmlFor="title">Page Title</Label>
              <Input
                id="title"
                value={seoData.title}
                onChange={(e) =>
                  setSeoData({
                    ...seoData,
                    title: e.target.value,
                  })
                }
                placeholder="Enter page title"
                className="w-full"
              />
            </Div>

            <Div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={seoData.description}
                onChange={(e) =>
                  setSeoData({
                    ...seoData,
                    description: e.target.value,
                  })
                }
                placeholder="Enter page description"
                rows={3}
                className="w-full"
              />
            </Div>

            <Div className="space-y-2">
              <Label htmlFor="keywords">Keywords</Label>
              <Input
                id="keywords"
                value={seoData.keywords}
                onChange={(e) =>
                  setSeoData({
                    ...seoData,
                    keywords: e.target.value,
                  })
                }
                placeholder="Enter keywords (comma separated)"
                className="w-full"
              />
            </Div>

            <Div className="border-t border-slate-200 pt-4">
              <H3 className="text-sm font-semibold text-slate-700 mb-3">Meta Tags</H3>
              <Div className="space-y-3">
                <Div className="space-y-2">
                  <Label htmlFor="metaTitle">Meta Title</Label>
                  <Input
                    id="metaTitle"
                    value={seoData.metaTitle}
                    onChange={(e) =>
                      setSeoData({
                        ...seoData,
                        metaTitle: e.target.value,
                      })
                    }
                    placeholder="Enter meta title"
                    className="w-full"
                  />
                </Div>

                <Div className="space-y-2">
                  <Label htmlFor="metaDescription">Meta Description</Label>
                  <Textarea
                    id="metaDescription"
                    value={seoData.metaDescription}
                    onChange={(e) =>
                      setSeoData({
                        ...seoData,
                        metaDescription: e.target.value,
                      })
                    }
                    placeholder="Enter meta description"
                    rows={2}
                    className="w-full"
                  />
                </Div>
              </Div>
            </Div>

            <Div className="border-t border-slate-200 pt-4">
              <H3 className="text-sm font-semibold text-slate-700 mb-3">Open Graph Tags</H3>
              <Div className="space-y-3">
                <Div className="space-y-2">
                  <Label htmlFor="ogTitle">OG Title</Label>
                  <Input
                    id="ogTitle"
                    value={seoData.ogTitle}
                    onChange={(e) =>
                      setSeoData({
                        ...seoData,
                        ogTitle: e.target.value,
                      })
                    }
                    placeholder="Enter OG title"
                    className="w-full"
                  />
                </Div>

                <Div className="space-y-2">
                  <Label htmlFor="ogDescription">OG Description</Label>
                  <Textarea
                    id="ogDescription"
                    value={seoData.ogDescription}
                    onChange={(e) =>
                      setSeoData({
                        ...seoData,
                        ogDescription: e.target.value,
                      })
                    }
                    placeholder="Enter OG description"
                    rows={2}
                    className="w-full"
                  />
                </Div>

                <Div className="space-y-2">
                  <Label htmlFor="ogImage">OG Image URL</Label>
                  <Input
                    id="ogImage"
                    value={seoData.ogImage}
                    onChange={(e) =>
                      setSeoData({
                        ...seoData,
                        ogImage: e.target.value,
                      })
                    }
                    placeholder="Enter OG image URL"
                    className="w-full"
                  />
                </Div>
              </Div>
            </Div>

            <Div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <Button
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingPage(null);
                }}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all"
              >
                Cancel
              </Button>
              <Button onClick={handleSaveSEO} className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all">
                Save Changes
              </Button>
            </Div>
          </Div>
        </DialogContent>
      </Dialog>
    </ScrollDiv>
  );
}
