/* Ported from Frontend/src/modules/Food/components/admin/orders/OrdersTopbar.jsx (tools/port.js first pass). */
import { Search, Filter, Download, ChevronDown, Settings, ArrowLeft } from 'lucide-react-native';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../../components/shadcn';
import { FileSpreadsheet, FileText } from 'lucide-react-native';
import { Button, Div, H1, Input, Span, Icon as UiIcon } from '../../../../components/web';
import { useNavigate } from '../../../../lib/webRouter';
export default function OrdersTopbar({ title, count, searchQuery, setSearchQuery, onFilterClick, activeFiltersCount, onExport, onSettingsClick, isLoading }) {
  const navigate = useNavigate();
  return (
    <Div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
      <Div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Div className="flex items-center gap-3">
          <Button
            onClick={() => navigate(-1)}
            className="p-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-all flex items-center justify-center shrink-0"
          >
            <UiIcon as={ArrowLeft} className="w-5 h-5" />
          </Button>
          <H1 className="flex-1 text-2xl font-bold text-slate-900 flex flex-wrap items-center gap-2">
            {title}
            <Span className="px-3 py-1 rounded-full text-sm font-semibold bg-slate-100 text-slate-700 flex items-center justify-center min-w-[2.5rem] h-7">
              {isLoading ? <Span className="w-5 h-3 rounded bg-slate-300/80 animate-pulse" /> : count}
            </Span>
          </H1>
        </Div>
        <Div className="flex flex-wrap items-center gap-3">
          <Div className="relative flex-1 min-w-[180px]">
            <Input
              type="text"
              placeholder="Search your order..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-4 pr-12 py-2.5 w-full sm:w-80 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 transition-all"
            />
            <Button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-slate-100">
              <UiIcon as={Search} className="w-4 h-4 text-slate-500" />
            </Button>
          </Div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="px-4 py-2.5 text-sm font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-2 transition-all">
                <UiIcon as={Download} className="w-4 h-4" />
                <Span className="text-black font-bold">Export</Span>
                <UiIcon as={ChevronDown} className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-50">
              <DropdownMenuLabel>Export Format</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onExport('excel')} className="cursor-pointer">
                <Div className="w-6 h-6 rounded-md bg-green-50 flex items-center justify-center mr-3">
                  <UiIcon as={FileSpreadsheet} className="w-4 h-4 text-green-600" />
                </Div>
                <Span>Excel</Span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport('pdf')} className="cursor-pointer">
                <Div className="w-6 h-6 rounded-md bg-red-50 flex items-center justify-center mr-3">
                  <UiIcon as={FileText} className="w-4 h-4 text-red-600" />
                </Div>
                <Span>PDF</Span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            onClick={onFilterClick}
            className={`px-4 py-2.5 text-sm font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-2 transition-all relative ${activeFiltersCount > 0 ? 'border-emerald-500 bg-emerald-50' : ''}`}
          >
            <UiIcon as={Filter} className="w-4 h-4" />
            <Span className="text-black font-bold">Filters</Span>
            {activeFiltersCount > 0 && (
              <Span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold">
                {activeFiltersCount}
              </Span>
            )}
          </Button>
          <Button onClick={onSettingsClick} className="p-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-all">
            <UiIcon as={Settings} className="w-5 h-5" />
          </Button>
        </Div>
      </Div>
    </Div>
  );
}
