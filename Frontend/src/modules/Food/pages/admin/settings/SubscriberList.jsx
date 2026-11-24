import { useState, useMemo } from "react";
import { Search, Download, ChevronDown, Settings, ArrowUpDown, FileText, FileSpreadsheet, Code, Check, Columns, Eye } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@food/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@food/components/ui/dialog";

import burgerIcon from "@food/assets/Dashboard-icons/image13.png";
import leafIcon from "@food/assets/Dashboard-icons/image14.png";
import chefIcon from "@food/assets/Dashboard-icons/image16.png";
const debugLog = (...args) => {}
const debugWarn = (...args) => {}
const debugError = (...args) => {}


const statsCards = [
  { id: 1, label: "Total Subscribed User", value: 3, bg: "bg-neutral-50" },
  { id: 2, label: "Active Subscriptions", value: 0, bg: "bg-emerald-50" },
  { id: 3, label: "Expired Subscription", value: 3, bg: "bg-rose-50" },
  { id: 4, label: "Expiring Soon", value: 0, bg: "bg-amber-50" },
];

const restaurantRows = [
  {
    id: 1,
    name: "Tasty Lunch",
    icon: leafIcon,
    packageName: "Standard",
    price: "$ 799.00",
    expDate: "23 May 2023",
    subscriptionUsed: 1,
    isTrial: "No",
    isCancel: "No",
    status: "Expired",
  },
  {
    id: 2,
    name: "Cheese Burger",
    icon: burgerIcon,
    packageName: "Pro",
    price: "$ 1,199.00",
    expDate: "19 Oct 2025",
    subscriptionUsed: 2,
    isTrial: "No",
    isCancel: "No",
    status: "Expired",
  },
  {
    id: 3,
    name: "Cheesy Restaurant",
    icon: chefIcon,
    packageName: "Pro",
    price: "$ 1,199.00",
    expDate: "19 Oct 2025",
    subscriptionUsed: 1,
    isTrial: "No",
    isCancel: "No",
    status: "Expired",
  },
];

export default function SubscriberList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [zoneFilter] = useState("All Zones");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    si: true,
    restaurantInfo: true,
    packageName: true,
    price: true,
    expDate: true,
    subscriptionUsed: true,
    isTrial: true,
    isCancel: true,
    status: true,
    actions: true,
  });

  const filteredRows = useMemo(() => {
    return restaurantRows.filter((row) =>
      row.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
    );
  }, [searchQuery]);

  const handleExport = (format) => {
    if (filteredRows.length === 0) {
      alert("No data to export");
      return;
    }
    debugLog(`Exporting as ${format}`, filteredRows);
  };

  const toggleColumn = (columnKey) => {
    setVisibleColumns(prev => ({ ...prev, [columnKey]: !prev[columnKey] }));
  };

  const resetColumns = () => {
    setVisibleColumns({
      si: true,
      restaurantInfo: true,
      packageName: true,
      price: true,
      expDate: true,
      subscriptionUsed: true,
      isTrial: true,
      isCancel: true,
      status: true,
      actions: true,
    });
  };

  const columnsConfig = {
    si: "Serial Number",
    restaurantInfo: "Restaurant Info",
    packageName: "Current Package Name",
    price: "Package Price",
    expDate: "Exp Date",
    subscriptionUsed: "Total Subscription Used",
    isTrial: "Is Trial",
    isCancel: "Is Cancel",
    status: "Status",
    actions: "Actions",
  };

  return (
    <div className="p-4 lg:p-6 bg-neutral-50 min-h-screen">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-xl lg:text-2xl font-medium text-neutral-900 flex items-center gap-2">
          <span role="img" aria-label="subscribed">
            ??
          </span>
          <span>Subscribed restaurant list</span>
        </h1>

        <div className="relative">
          <select className="pl-3 pr-8 py-2 text-xs border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400 appearance-none">
            <option value="all-zones">{zoneFilter}</option>
          </select>
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-neutral-400 pointer-events-none">
            ?
          </span>
        </div>
      </div>

      {/* Top stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        {statsCards.map((card) => (
          <div
            key={card.id}
            className={`${card.bg} rounded-lg px-5 py-4 flex flex-col justify-between`}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-neutral-600">
                {card.label}
              </p>
              <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center">
                <span className="text-lg">??</span>
              </div>
            </div>
            <p className="text-2xl font-medium text-neutral-900">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Summary strip */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 mb-4">
        <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-neutral-200">
          <div className="flex-1 px-5 py-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-neutral-700">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-neutral-50 text-[#0a4d2b] text-lg">
                ?
              </span>
              <div>
                <p className="font-medium">Total transactions</p>
                <p className="text-xs text-neutral-500">5</p>
              </div>
            </div>
          </div>

          <div className="flex-1 px-5 py-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-neutral-700">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 text-lg">
                ??
              </span>
              <div>
                <p className="font-medium">Total earning</p>
                <p className="text-xs text-emerald-600 font-medium">
                  $ 4,795.00
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 px-5 py-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-neutral-700">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-50 text-amber-600 text-lg">
                ??
              </span>
              <div>
                <p className="font-medium">Earned this month</p>
                <p className="text-xs text-neutral-500">$ 0.00</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Restaurant list card */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200">
        <div className="px-4 py-3 border-b border-neutral-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium text-neutral-900">
              Restaurant list
            </h2>
            <span className="inline-flex items-center justify-center min-w-[24px] h-6 text-xs font-medium rounded-full bg-neutral-100 text-neutral-700">
              3
            </span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-2">
            <div className="relative">
              <select className="pl-3 pr-8 py-2 text-xs border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400 appearance-none">
                <option>All</option>
              </select>
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-neutral-400 pointer-events-none">
                ?
              </span>
            </div>

            <div className="relative w-full md:w-64">
              <input
                type="text"
                placeholder="Ex: Search by name & pack"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0a4d2b]/30 focus:border-neutral-400"
              />
              <Search className="w-4 h-4 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="px-4 py-2.5 text-sm font-medium rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 flex items-center gap-2 transition-colors">
                  <Download className="w-4 h-4" />
                  <span className="text-black font-medium">Export</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white border border-neutral-200 rounded-lg shadow-sm z-50 animate-in fade-in-0 zoom-in-95 duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95">
                <DropdownMenuLabel>Export format</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExport("csv")} className="cursor-pointer">
                  <FileText className="w-4 h-4 mr-2" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("excel")} className="cursor-pointer">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Export as Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("pdf")} className="cursor-pointer">
                  <FileText className="w-4 h-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("json")} className="cursor-pointer">
                  <Code className="w-4 h-4 mr-2" />
                  Export as JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2.5 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-100">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                {visibleColumns.si && (
                  <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">
                    <div className="flex items-center gap-2">
                      <span>SI</span>
                      <ArrowUpDown className="w-3 h-3 text-neutral-400 cursor-pointer hover:text-neutral-600" />
                    </div>
                  </th>
                )}
                {visibleColumns.restaurantInfo && (
                  <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">
                    <div className="flex items-center gap-2">
                      <span>Restaurant info</span>
                      <ArrowUpDown className="w-3 h-3 text-neutral-400 cursor-pointer hover:text-neutral-600" />
                    </div>
                  </th>
                )}
                {visibleColumns.packageName && (
                  <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">
                    <div className="flex items-center gap-2">
                      <span>Current package name</span>
                      <ArrowUpDown className="w-3 h-3 text-neutral-400 cursor-pointer hover:text-neutral-600" />
                    </div>
                  </th>
                )}
                {visibleColumns.price && (
                  <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">
                    <div className="flex items-center gap-2">
                      <span>Package price</span>
                      <ArrowUpDown className="w-3 h-3 text-neutral-400 cursor-pointer hover:text-neutral-600" />
                    </div>
                  </th>
                )}
                {visibleColumns.expDate && (
                  <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">
                    <div className="flex items-center gap-2">
                      <span>Exp date</span>
                      <ArrowUpDown className="w-3 h-3 text-neutral-400 cursor-pointer hover:text-neutral-600" />
                    </div>
                  </th>
                )}
                {visibleColumns.subscriptionUsed && (
                  <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">
                    <div className="flex items-center gap-2">
                      <span>Total subscription used</span>
                      <ArrowUpDown className="w-3 h-3 text-neutral-400 cursor-pointer hover:text-neutral-600" />
                    </div>
                  </th>
                )}
                {visibleColumns.isTrial && (
                  <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">
                    <div className="flex items-center gap-2">
                      <span>Is trial</span>
                      <ArrowUpDown className="w-3 h-3 text-neutral-400 cursor-pointer hover:text-neutral-600" />
                    </div>
                  </th>
                )}
                {visibleColumns.isCancel && (
                  <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">
                    <div className="flex items-center gap-2">
                      <span>Is cancel</span>
                      <ArrowUpDown className="w-3 h-3 text-neutral-400 cursor-pointer hover:text-neutral-600" />
                    </div>
                  </th>
                )}
                {visibleColumns.status && (
                  <th className="px-6 py-4 text-left text-xs font-medium text-neutral-700">
                    <div className="flex items-center gap-2">
                      <span>Status</span>
                      <ArrowUpDown className="w-3 h-3 text-neutral-400 cursor-pointer hover:text-neutral-600" />
                    </div>
                  </th>
                )}
                {visibleColumns.actions && (
                  <th className="px-6 py-4 text-center text-xs font-medium text-neutral-700">Action</th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-100">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(v => v).length} className="px-6 py-8 text-center text-neutral-500">
                    No subscribers found
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, index) => (
                  <tr key={row.id} className="hover:bg-neutral-50 transition-colors">
                    {visibleColumns.si && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-neutral-700">{index + 1}</span>
                      </td>
                    )}
                    {visibleColumns.restaurantInfo && (
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-neutral-50 flex items-center justify-center overflow-hidden border border-neutral-200">
                            <img
                              src={row.icon}
                              alt={row.name}
                              className="w-8 h-8 object-contain"
                            />
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium">
                              {row.name}
                            </span>
                            <span className="text-xs text-amber-500">
                              ? 0
                            </span>
                          </div>
                        </div>
                      </td>
                    )}
                    {visibleColumns.packageName && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-neutral-700">{row.packageName}</span>
                      </td>
                    )}
                    {visibleColumns.price && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-neutral-700">{row.price}</span>
                      </td>
                    )}
                    {visibleColumns.expDate && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-neutral-700">{row.expDate}</span>
                      </td>
                    )}
                    {visibleColumns.subscriptionUsed && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-neutral-700">{row.subscriptionUsed}</span>
                      </td>
                    )}
                    {visibleColumns.isTrial && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusPill label={row.isTrial} variant="neutral" />
                      </td>
                    )}
                    {visibleColumns.isCancel && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusPill label={row.isCancel} variant="neutral" />
                      </td>
                    )}
                    {visibleColumns.status && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusPill label={row.status} variant="danger" />
                      </td>
                    )}
                    {visibleColumns.actions && (
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button className="p-1.5 rounded text-[#0a4d2b] hover:bg-neutral-50 transition-colors" title="View">
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-md bg-white p-0 opacity-0 data-[state=open]:opacity-100 data-[state=closed]:opacity-0 transition-opacity duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:scale-100 data-[state=closed]:scale-100">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Table settings
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6 space-y-4">
            <div>
              <h3 className="text-sm font-medium text-neutral-700 mb-3 flex items-center gap-2">
                <Columns className="w-4 h-4" />
                Visible columns
              </h3>
              <div className="space-y-2">
                {Object.entries(columnsConfig).map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={visibleColumns[key]}
                      onChange={() => toggleColumn(key)}
                      className="w-4 h-4 text-emerald-600 border-neutral-300 rounded focus:ring-emerald-500"
                    />
                    <span className="text-sm text-neutral-700">{label}</span>
                    {visibleColumns[key] && (
                      <Check className="w-4 h-4 text-emerald-600 ml-auto" />
                    )}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
              <button
                onClick={resetColumns}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                Reset
              </button>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-[#0a4d2b] text-white hover:bg-[#06381e] transition-colors shadow-sm"
              >
                Apply
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusPill({ label, variant }) {
  if (variant === "danger") {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full bg-rose-50 text-rose-500 text-xs font-medium">
        {label}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-medium">
      {label}
    </span>
  );
}

