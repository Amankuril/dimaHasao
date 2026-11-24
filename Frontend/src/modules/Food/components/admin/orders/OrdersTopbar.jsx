import { Search, Filter, Download, ChevronDown, Settings, ArrowLeft } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@food/components/ui/dropdown-menu"
import { FileSpreadsheet, FileText } from "lucide-react"

export default function OrdersTopbar({
  title,
  count,
  searchQuery,
  setSearchQuery,
  onFilterClick,
  activeFiltersCount,
  onExport,
  onSettingsClick,
  isLoading,
}) {
  return (
    <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6 mb-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.history.back()} 
            className="p-2.5 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 transition-colors flex items-center justify-center shrink-0"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-medium text-neutral-900 flex items-center gap-2">
            {title}
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-neutral-100 text-neutral-700 flex items-center justify-center min-w-[2.5rem] h-7">
              {isLoading ? (
                <span className="w-5 h-3 rounded bg-neutral-300/80 animate-pulse" />
              ) : (
                count
              )}
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:flex-initial">
            <input
              type="text"
              placeholder="Search your order"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-4 pr-12 py-2.5 w-full sm:w-80 text-sm rounded-lg border border-neutral-300 bg-white focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:border-neutral-400 transition-colors"
            />
            <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-neutral-100">
              <Search className="w-4 h-4 text-neutral-500" />
            </button>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="px-4 py-2.5 text-sm font-medium rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 flex items-center gap-2 transition-colors">
                <Download className="w-4 h-4" />
                <span className="text-black font-medium">Export</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white border border-neutral-200 rounded-lg shadow-sm z-50">
              <DropdownMenuLabel>Export format</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onExport("excel")} className="cursor-pointer">
                <div className="w-6 h-6 rounded-md bg-green-50 flex items-center justify-center mr-3">
                  <FileSpreadsheet className="w-4 h-4 text-green-600" />
                </div>
                <span>Excel</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport("pdf")} className="cursor-pointer">
                <div className="w-6 h-6 rounded-md bg-red-50 flex items-center justify-center mr-3">
                  <FileText className="w-4 h-4 text-red-600" />
                </div>
                <span>PDF</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button 
            onClick={onFilterClick}
            className={`px-4 py-2.5 text-sm font-medium rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 flex items-center gap-2 transition-colors relative ${
              activeFiltersCount > 0 ? "border-emerald-500 bg-emerald-50" : ""
            }`}
          >
            <Filter className="w-4 h-4" />
            <span className="text-black font-medium">Filters</span>
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#0a4d2b] text-white rounded-full text-xs flex items-center justify-center font-medium">
                {activeFiltersCount}
              </span>
            )}
          </button>
          <button 
            onClick={onSettingsClick}
            className="p-2.5 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

