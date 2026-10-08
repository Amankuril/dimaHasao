/* Ported from Frontend/src/modules/Food/components/admin/AdminListPagination.jsx (tools/port.js first pass). */

/**
 * Orders-style list pagination: rows-per-page + Prev/Next + numbered pages.
 */
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Button, Div, Option, Select, Span, Icon as UiIcon } from '../../../components/web';
import { BTN_SECONDARY, BTN_TEXT_SECONDARY } from '../../../admin/ui';
export default function AdminListPagination({
  currentPage = 1,
  pageSize = 20,
  totalItems = 0,
  onPageChange,
  onPageSizeChange,
  itemLabel = 'items',
  pageSizeOptions = [10, 20, 50, 100],
  className = '',
}) {
  const totalCount = Math.max(0, Number(totalItems) || 0);
  const size = Math.max(1, Number(pageSize) || 20);
  const page = Math.max(1, Number(currentPage) || 1);
  const totalPages = Math.max(1, Math.ceil(totalCount / size) || 1);
  if (totalCount <= 0) return null;
  const setPage = (next) => {
    const safe = Math.min(Math.max(1, next), totalPages);
    if (safe !== page) onPageChange?.(safe);
  };
  return (
    <Div className={`flex-row flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 ${className}`}>
      <Div className="flex-row items-center gap-2">
        <Span className="text-xs text-slate-500">Rows</Span>
        <Select
          value={size}
          onChange={(e) => {
            const next = Number(e.target.value);
            onPageSizeChange?.(next);
            onPageChange?.(1);
          }}
          className="h-10 min-w-[72px] rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900"
        >
          {pageSizeOptions.map((opt) => (
            <Option key={opt} value={opt}>
              {opt}
            </Option>
          ))}
        </Select>
        <Span className="text-xs text-slate-500">
          {totalCount.toLocaleString('en-IN')} {itemLabel} · page {page} of {totalPages}
        </Span>
      </Div>

      <Div className="flex-row items-center gap-2">
        <Button
          type="button"
          onClick={() => setPage(page - 1)}
          disabled={page === 1}
          accessibilityLabel="Previous page"
          className={`${BTN_SECONDARY} ${page === 1 ? 'opacity-50' : ''}`}
        >
          <UiIcon as={ChevronLeft} size={14} className="text-slate-600" />
          <Span className={BTN_TEXT_SECONDARY}>Prev</Span>
        </Button>
        <Button
          type="button"
          onClick={() => setPage(page + 1)}
          disabled={page >= totalPages}
          accessibilityLabel="Next page"
          className={`${BTN_SECONDARY} ${page >= totalPages ? 'opacity-50' : ''}`}
        >
          <Span className={BTN_TEXT_SECONDARY}>Next</Span>
          <UiIcon as={ChevronRight} size={14} className="text-slate-600" />
        </Button>
      </Div>
    </Div>
  );
}
