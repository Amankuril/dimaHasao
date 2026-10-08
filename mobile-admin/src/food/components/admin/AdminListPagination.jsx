/* Ported from Frontend/src/modules/Food/components/admin/AdminListPagination.jsx (tools/port.js first pass). */

/**
 * Orders-style list pagination: rows-per-page + Prev/Next + numbered pages.
 */
import { Button, Div, Option, Select, Span } from '../../../components/web';
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
    <Div className={`flex flex-col items-center justify-between gap-4 border-t border-slate-100 bg-white px-4 py-4 ${className}`}>
      <Div className="flex items-center gap-3">
        <Span className="text-sm text-slate-500 font-medium">Rows per page:</Span>
        <Select
          value={size}
          onChange={(e) => {
            const next = Number(e.target.value);
            onPageSizeChange?.(next);
            onPageChange?.(1);
          }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm min-w-[72px]"
        >
          {pageSizeOptions.map((opt) => (
            <Option key={opt} value={opt}>
              {opt}
            </Option>
          ))}
        </Select>
      </Div>

      <Div className="flex flex-row justify-between w-full">
        <Button
          type="button"
          onClick={() => setPage(page - 1)}
          disabled={page === 1}
          className="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
        >
          Previous
        </Button>
        <Button
          type="button"
          onClick={() => setPage(page + 1)}
          disabled={page >= totalPages}
          className="relative ml-3 inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
        >
          Next
        </Button>
      </Div>
    </Div>
  );
}
