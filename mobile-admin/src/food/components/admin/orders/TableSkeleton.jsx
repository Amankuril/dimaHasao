/* The web's TableSkeleton and OrdersDashboardSkeleton (@food/components/ui/loading-skeletons), which the kit's shadcn.jsx does not export. */
import { Skeleton } from '../../../../components/shadcn';
import { Div } from '../../../../components/web';
import { cn } from '../../../../lib/tw';

export function TableSkeleton({ rows = 8, columns = 6, className }) {
  return (
    <Div className={cn('overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm', className)}>
      <Div className="flex flex-row gap-4 border-b border-slate-200 bg-slate-50 px-6 py-4">
        {Array.from({ length: columns }, (_, index) => (
          <Div key={`table-head-${index}`} className="flex-1">
            <Skeleton className="h-3 w-3/4 rounded-full" />
          </Div>
        ))}
      </Div>
      <Div className="divide-y divide-slate-100">
        {Array.from({ length: rows }, (_, rowIndex) => (
          <Div key={`table-row-${rowIndex}`} className="flex flex-row gap-4 px-6 py-4">
            {Array.from({ length: columns }, (_, columnIndex) => (
              <Div key={`table-cell-${rowIndex}-${columnIndex}`} className="flex-1">
                <Skeleton className={cn('h-4 rounded-full', columnIndex === columns - 1 ? 'w-1/2' : columnIndex === 0 ? 'w-12' : 'w-4/5')} />
              </Div>
            ))}
          </Div>
        ))}
      </Div>
    </Div>
  );
}

export function OrdersDashboardSkeleton({ className }) {
  return (
    <Div className={cn('space-y-6', className)} accessibilityLabel="Loading orders dashboard">
      <Div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <Div className="flex flex-col gap-4">
          <Div className="space-y-3">
            <Skeleton className="h-8 w-60 rounded-full" />
            <Skeleton className="h-4 w-36 rounded-full" />
          </Div>
          <Div className="flex flex-row flex-wrap gap-3">
            <Skeleton className="h-11 w-72 rounded-xl" />
            <Skeleton className="h-11 w-28 rounded-xl" />
            <Skeleton className="h-11 w-28 rounded-xl" />
            <Skeleton className="h-11 w-11 rounded-xl" />
          </Div>
        </Div>
      </Div>
      <TableSkeleton rows={8} columns={7} />
    </Div>
  );
}

export default TableSkeleton;
