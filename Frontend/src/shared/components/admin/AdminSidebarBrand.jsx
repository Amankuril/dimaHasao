/**
 * The top of every admin rail: the district logo, the product name and which
 * admin you are in. Five shells used to carry five copies of an 80px logo with
 * the name floated over it and a pulsing green dot; this is the one copy.
 *
 * `children` is the shell's own controls (collapse, mobile close), placed at
 * the end of the row when open and under the logo when collapsed.
 */
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { DEFAULT_BRAND_LOGO, logoFallback } from '@/shared/constants/brandLogo'

export default function AdminSidebarBrand({ moduleLabel, isCollapsed = false, logoSrc = DEFAULT_BRAND_LOGO, children }) {
  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center gap-2">
        <img src={logoSrc} onError={logoFallback} alt="Dima Hasao" className="h-9 w-9 object-contain" />
        {children}
      </div>
    )
  }

  return (
    <div className="flex h-10 items-center gap-3 px-1">
      <img src={logoSrc} onError={logoFallback} alt="Dima Hasao" className="h-9 w-9 shrink-0 object-contain" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium leading-5 text-neutral-50">Dima Hasao</p>
        <p className="truncate text-xs leading-4 text-neutral-400">{moduleLabel}</p>
      </div>
      {children}
    </div>
  )
}

/** The collapse toggle every shell puts in the brand row. */
export function RailCollapseButton({ isCollapsed, onClick, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      className={`hidden h-7 w-7 shrink-0 items-center justify-center rounded-md text-neutral-500 outline-none transition-colors duration-150 hover:bg-white/[0.06] hover:text-neutral-200 focus-visible:ring-2 focus-visible:ring-white/25 lg:flex ${className}`}
    >
      {isCollapsed ? <PanelLeftOpen size={16} strokeWidth={1.5} /> : <PanelLeftClose size={16} strokeWidth={1.5} />}
    </button>
  )
}
