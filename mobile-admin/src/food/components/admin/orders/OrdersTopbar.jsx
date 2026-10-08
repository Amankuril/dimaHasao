/* Ported from Frontend/src/modules/Food/components/admin/orders/OrdersTopbar.jsx (tools/port.js first pass). */
import { ChevronDown, Download, FileSpreadsheet, FileText, Filter, Search, Settings } from 'lucide-react-native';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../../components/shadcn';
import { Button, Div, Input, Span, Icon as UiIcon } from '../../../../components/web';
import { useNavigate } from '../../../../lib/webRouter';
import { Card, PageHeader, Toolbar, INPUT, BTN_SECONDARY, BTN_TEXT_SECONDARY } from '../../../../admin/ui';

/**
 * The title block plus the search / export / filter / settings strip that the
 * three order screens share. The title row is the kit's PageHeader and the
 * controls sit in one Card toolbar, so nothing runs off the edge on a phone.
 */
export default function OrdersTopbar({ title, count, searchQuery, setSearchQuery, onFilterClick, activeFiltersCount, onExport, onSettingsClick, isLoading }) {
  const navigate = useNavigate();
  const countLabel = isLoading ? 'Loading…' : `${Number(count) || 0} ${Number(count) === 1 ? 'order' : 'orders'}`;
  return (
    <>
      <PageHeader
        title={title}
        subtitle={countLabel}
        breadcrumb={[
          { label: 'Food', onPress: () => navigate('/admin/food') },
          { label: 'Orders', onPress: () => navigate(-1) },
          { label: title },
        ]}
      />
      <Card className="mb-4">
        <Toolbar className="mb-0">
          <Div className="flex-row items-center gap-2 flex-1 min-w-[200px]">
            <UiIcon as={Search} size={16} className="text-slate-400" />
            <Input
              type="text"
              placeholder="Search your order..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${INPUT} flex-1`}
            />
          </Div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className={BTN_SECONDARY} accessibilityLabel="Export orders">
                <UiIcon as={Download} size={16} className="text-slate-700" />
                <Span className={BTN_TEXT_SECONDARY}>Export</Span>
                <UiIcon as={ChevronDown} size={14} className="text-slate-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white border border-slate-200 rounded-xl z-50">
              <DropdownMenuLabel>Export Format</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onExport('excel')}>
                <Div className="w-6 h-6 rounded-md bg-slate-100 items-center justify-center mr-3">
                  <UiIcon as={FileSpreadsheet} size={14} className="text-slate-600" />
                </Div>
                <Span className="text-sm text-slate-700">Excel</Span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport('pdf')}>
                <Div className="w-6 h-6 rounded-md bg-slate-100 items-center justify-center mr-3">
                  <UiIcon as={FileText} size={14} className="text-slate-600" />
                </Div>
                <Span className="text-sm text-slate-700">PDF</Span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={onFilterClick} className={`${BTN_SECONDARY} ${activeFiltersCount > 0 ? 'border-blue-600' : ''}`} accessibilityLabel="Filter orders">
            <UiIcon as={Filter} size={16} className="text-slate-700" />
            <Span className={BTN_TEXT_SECONDARY}>Filters</Span>
            {activeFiltersCount > 0 ? (
              <Div className="px-1.5 h-5 min-w-[20px] rounded-full bg-blue-600 items-center justify-center">
                <Span className="text-xs font-semibold text-white">{activeFiltersCount}</Span>
              </Div>
            ) : null}
          </Button>
          <Button onClick={onSettingsClick} className={`${BTN_SECONDARY} w-11 px-0`} accessibilityLabel="Table settings">
            <UiIcon as={Settings} size={18} className="text-slate-700" />
          </Button>
        </Toolbar>
      </Card>
    </>
  );
}
