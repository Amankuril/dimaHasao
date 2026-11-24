/**
 * Class strings for the dark admin rail that Food, Taxi, Hotel, Tours and
 * Global all render. Each module still owns its own sidebar markup (Food has
 * accordions, Taxi has sections and nested groups), so what is shared is the
 * look: the rail width, the row, the active state, the search field and the
 * section label. Change them here and every admin follows.
 *
 * Graphite ramp on the rail: neutral-950 ground, white at 4% / 8% for hover
 * and selection, white at 8% for hairlines. No glows, no shadows, no scale.
 */
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

const cn = (...inputs) => twMerge(clsx(inputs))

// 256 open, 64 collapsed. Food's layout offsets its content by the same values.
export const RAIL_WIDTH_OPEN = 'w-64'
export const RAIL_WIDTH_COLLAPSED = 'w-16'
export const RAIL_OFFSET_OPEN = 'lg:ml-64'
export const RAIL_OFFSET_COLLAPSED = 'lg:ml-16'

export const railClass = (isCollapsed) =>
  cn(
    'relative z-50 flex h-screen flex-col overflow-hidden bg-neutral-950 border-r border-white/[0.08]',
    'transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
    isCollapsed ? RAIL_WIDTH_COLLAPSED : RAIL_WIDTH_OPEN,
  )

export const railHeaderClass = 'shrink-0 space-y-3 border-b border-white/[0.08] px-3 pt-4 pb-3'

export const railNavClass = 'admin-sidebar-scroll flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-3 py-3'

export const railFooterClass = 'shrink-0 border-t border-white/[0.08] p-3'

/** One nav row: 36 tall, 16px icon, 10px gap, a surface step when active. */
export const navRowClass = (isActive, isCollapsed = false) =>
  cn(
    'group relative flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm outline-none',
    'transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-white/25',
    isActive
      ? 'bg-white/[0.08] text-neutral-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
      : 'text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-100',
    isCollapsed && 'justify-center px-0',
  )

export const navIconClass = (isActive) =>
  cn('h-4 w-4 shrink-0', isActive ? 'text-neutral-100' : 'text-neutral-500 group-hover:text-neutral-300')

/** A child row inside an expanded group: 32 tall, indented under the parent icon. */
export const navSubRowClass = (isActive) =>
  cn(
    'flex h-8 items-center gap-2.5 rounded-md pl-[34px] pr-3 text-[13px] outline-none',
    'transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-white/25',
    isActive ? 'bg-white/[0.06] text-neutral-50' : 'text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-100',
  )

/** Section label: sentence case, muted, closer to its items than to the section above. */
export const navSectionLabelClass = 'px-3 pb-2 text-xs font-medium text-neutral-500'

/** Unread count: quiet text, not a red pill. */
export const navCountClass = 'ml-auto shrink-0 text-xs tabular-nums text-neutral-400'

/** Dot for a collapsed row that has unread items. */
export const navDotClass = 'absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-red-400'

export const railSearchInputClass = (hasValue) =>
  cn(
    'h-9 w-full rounded-lg border border-white/[0.08] !bg-white/[0.04] pl-9 text-sm !text-neutral-100 placeholder:text-neutral-500',
    'outline-none transition-colors duration-150 focus:border-white/20 focus:!bg-white/[0.06]',
    hasValue ? 'pr-9' : 'pr-3',
  )

export const railSearchIconClass = 'pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500'

export const railSearchClearClass =
  'absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-white/[0.06] hover:text-neutral-200'

export const railLogoutClass = (isCollapsed) =>
  cn(
    'flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-sm text-neutral-400 outline-none',
    'transition-colors duration-150 hover:bg-red-500/10 hover:text-red-300 focus-visible:ring-2 focus-visible:ring-white/25',
    isCollapsed && 'justify-center px-0',
  )

export const railEmptyState = {
  title: 'No menu items found',
  hint: 'Try a different word',
}

/** Shared scrollbar styling for the rail, injected once per shell. */
export const RAIL_SCROLLBAR_CSS = `
  .admin-sidebar-scroll::-webkit-scrollbar { width: 4px; }
  .admin-sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
  .admin-sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 4px; }
  .admin-sidebar-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.24); }
  .admin-sidebar-scroll { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.12) transparent; }
`

/** Light top bar above every admin page. */
export const topBarClass = 'z-10 flex h-14 shrink-0 items-center justify-between border-b border-neutral-900/[0.08] bg-white px-6'
export const topBarTitleClass = 'text-[15px] font-medium text-neutral-900'
