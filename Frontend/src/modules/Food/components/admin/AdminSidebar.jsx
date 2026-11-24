import { useState, useEffect, useMemo, useRef, useLayoutEffect } from "react"
import { Link, useLocation, useNavigationType } from "react-router-dom"
import { prefetchTaxiAdmin } from "@/shared/utils/activeModule.js"
import { canSeeAdminModule } from "@/shared/utils/adminHome.js"
import AdminModuleSwitcher from "@/shared/components/admin/AdminModuleSwitcher"
import {
  Search,
  FileText,
  Calendar,
  Clock,
  Receipt,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Link as LinkIcon,
  UtensilsCrossed,
  Building2,
  FolderTree,
  Plus,
  Utensils,
  Megaphone,
  ChevronDown,
  X,
  LayoutDashboard,
  Gift,
  DollarSign,
  Image,
  Bell,
  MessageSquare,
  Mail,
  Users,
  Wallet,
  Award,
  Truck,
  Package,
  CreditCard,
  Settings,
  UserCog,
  User,
  Globe,
  Palette,
  Camera,
  LogIn,
  Database,
  Zap,
  Phone,
  IndianRupee,
  PiggyBank,
  Lock,
  UserX,
  Headset,
  FileX,
} from "lucide-react"
import { cn } from "@food/utils/utils"
import { adminSidebarMenu } from "@food/utils/adminSidebarMenu"
import { filterSidebarMenuByPermissions } from "@food/utils/subAdminPermissions"
import { getCurrentUser } from "@food/utils/auth"
import { adminAPI } from "@food/api"
import { dispatchAdminNotificationsUpdated } from "@food/hooks/useAdminNotifications"
import AdminSidebarBrand, { RailCollapseButton } from "@/shared/components/admin/AdminSidebarBrand.jsx"
import {
  railClass, railHeaderClass, railNavClass, navRowClass, navIconClass, navSubRowClass,
  navSectionLabelClass, navCountClass, navDotClass, railSearchInputClass, railSearchIconClass,
  railSearchClearClass, railEmptyState, RAIL_SCROLLBAR_CSS,
} from "@/shared/components/admin/adminShell.js"
const debugLog = (...args) => {}
const debugWarn = (...args) => {}
const debugError = (...args) => {}


// Icon mapping
const iconMap = {
  LayoutDashboard,
  UtensilsCrossed,
  Building2,
  FileText,
  Calendar,
  Clock,
  Receipt,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Link: LinkIcon,
  FolderTree,
  Plus,
  Utensils,
  Megaphone,
  Gift,
  DollarSign,
  Image,
  Bell,
  MessageSquare,
  Mail,
  Users,
  Wallet,
  Award,
  Truck,
  Package,
  CreditCard,
  Settings,
  UserCog,
  User,
  Globe,
  Palette,
  Camera,
  LogIn,
  Database,
  Zap,
  Phone,
  IndianRupee,
  PiggyBank,
  Lock,
  X,
  FileX,
  UserX,
  Headset,
}

// Sidebar Skeleton Loader Component
const SidebarSkeleton = ({ isCollapsed }) => {
  return (
    <div className="space-y-6 px-3 py-4 animate-pulse">
      {[1, 2, 3].map((sectionIndex) => (
        <div key={sectionIndex} className="space-y-3">
          {/* Section Header Skeleton */}
          {!isCollapsed && (
            <div className="h-4 w-24 bg-neutral-800/60 rounded mb-2 ml-3" />
          )}
          {/* Section Items Skeletons */}
          {[1, 2, 3, 4].map((itemIndex) => (
            <div
              key={itemIndex}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg bg-neutral-900/40",
                isCollapsed ? "justify-center" : ""
              )}
            >
              {/* Icon Placeholder */}
              <div className="w-4 h-4 bg-neutral-800/80 rounded-full shrink-0" />
              {/* Text Placeholder */}
              {!isCollapsed && (
                <div 
                  className="h-3 bg-neutral-800/70 rounded flex-1" 
                  style={{ width: `${Math.floor(Math.random() * 40) + 40}%` }} 
                />
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}


/** Dispatch refresh for sidebar notification badges. Optional key optimistically decrements before refetch. */
export function refreshSidebarBadges(decrement, options = {}) {
  window.dispatchEvent(
    new CustomEvent("refresh-sidebar-badges", {
      detail: decrement ? { decrement } : undefined,
    }),
  )
  if (options.reloadNotifications !== false) {
    dispatchAdminNotificationsUpdated()
  }
}

function dispatchAdminListRefresh(counts, changedKeys) {
  if (!changedKeys?.length) return
  window.dispatchEvent(
    new CustomEvent("admin-list-refresh", {
      detail: { counts, changedKeys },
    }),
  )
}

function getBadgeKeyForPath(path = "") {
  const p = String(path || "").toLowerCase()
  if (p.includes("food-approval")) return "foodApprovals"
  if (p.includes("restaurants/joining-request")) return "restaurants"
  if (p.includes("delivery-partners/join-request")) return "deliveryPartners"
  if (p.includes("orders/pending")) return "orders"
  return null
}

function refreshAdminListForPath(path = "") {
  const key = getBadgeKeyForPath(path)
  if (key) {
    dispatchAdminListRefresh({}, [key])
  }
}

export default function AdminSidebar({ isOpen = false, onClose, onCollapseChange }) {
  const location = useLocation()
  const navigationType = useNavigationType()
  const [searchQuery, setSearchQuery] = useState("")
  const [badges, setBadges] = useState({})
  const isInitialRender = useRef(true)
  const sidebarNavRef = useRef(null)
  const lastScrolledPathname = useRef(null)
  const hasScrolledOnMount = useRef(false)
  const badgeCountsRef = useRef({})
  const pendingNavScrollPath = useRef(null)
  const [isLoading, setIsLoading] = useState(true)
  const adminProfile = useMemo(() => getCurrentUser("admin") || {}, [])
  // Which tabs to show is AdminModuleSwitcher's job now. This only needs to
  // know whether Taxi is reachable, so its chunk can be warmed on mount.
  const canReachTaxi = canSeeAdminModule(adminProfile, "taxi")

  useEffect(() => {
    if (canReachTaxi) prefetchTaxiAdmin()
  }, [canReachTaxi])

  useEffect(() => {
    const fetchBadges = async () => {
      try {
        const res = await adminAPI.getSidebarBadges()
        if (res?.data?.success) {
          const nextCounts = res.data.counts || {}
          const prevCounts = badgeCountsRef.current || {}
          const changedKeys = Object.keys({ ...prevCounts, ...nextCounts }).filter(
            (key) => (prevCounts[key] ?? 0) !== (nextCounts[key] ?? 0),
          )
          badgeCountsRef.current = nextCounts
          setBadges(nextCounts)
          if (changedKeys.length > 0) {
            dispatchAdminListRefresh(nextCounts, changedKeys)
          }
        }
      } catch (error) {
        debugError("Error fetching sidebar badges:", error)
      } finally {
        setIsLoading(false)
      }
    }

    const handleRefreshBadges = (event) => {
      const decrement = event?.detail?.decrement
      if (decrement) {
        setBadges((prev) => ({
          ...prev,
          [decrement]: Math.max(0, (prev[decrement] ?? 0) - 1),
        }))
      }
      fetchBadges()
    }

    /*
     * Poll every 15s, but only while someone is actually looking.
     *
     * An admin console is a tab that stays open all day. Without this the badge
     * poll kept requesting counts nobody could see — browsers throttle a hidden
     * tab's timers to roughly once a minute rather than stopping them, so it is
     * a slow drip rather than four a minute, but it is a drip per idle tab per
     * admin, all day.
     *
     * Coming back refetches immediately rather than waiting out the interval,
     * so returning to the tab never shows a stale count — which is the only
     * thing that would make this a worse experience than polling blindly.
     */
    const tick = () => {
      if (!document.hidden) fetchBadges()
    }

    const handleVisibilityChange = () => {
      if (!document.hidden) fetchBadges()
    }

    fetchBadges()
    const timer = setInterval(tick, 15000)

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("refresh-sidebar-badges", handleRefreshBadges)

    // Fallback timer to turn off loading in case network hangs or is slow
    const fallbackTimer = setTimeout(() => {
      setIsLoading(false)
    }, 700)

    return () => {
      clearInterval(timer)
      clearTimeout(fallbackTimer)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("refresh-sidebar-badges", handleRefreshBadges)
    }
  }, [])

  const getBadgeCount = (label = "", path = "") => {
    const l = label.toLowerCase()
    const p = path?.toLowerCase() || ""

    // Path-based (sub-menu items & direct links)
    if (p.includes("food-approval")) return badges.foodApprovals ?? 0
    if (p.includes("restaurants/joining-request")) return badges.restaurants ?? 0
    if (p.includes("restaurants/complaints")) return badges.restaurantComplaints ?? 0
    if (p.includes("orders/pending")) return badges.orders ?? 0
    if (p.includes("offline-payments")) return badges.offlinePayments ?? 0
    if (p.includes("delivery-support-tickets")) return badges.deliverySupportTickets ?? 0
    if (p.includes("/support-tickets")) return badges.userSupportTickets ?? 0
    if (p.includes("delivery-withdrawal")) return badges.deliveryWithdrawals ?? 0
    if (p.includes("cash-confirmations")) return badges.cashConfirmations ?? 0
    if (p.includes("restaurant-withdraws")) return badges.restaurantWithdrawals ?? 0
    if (p.includes("delivery-emergency-help")) return badges.emergencyHelp ?? 0
    if (p.includes("earning-addon-history")) return badges.earningAddons ?? 0
    if (p.includes("safety-emergency-reports")) return badges.safetyReports ?? 0
    if (p.includes("delivery-partners/join-request")) return badges.deliveryPartners ?? 0
    if (p.includes("contact-messages")) return badges.contactMessages ?? 0

    // Label-based (expandable parents without paths)
    if (l.includes("food approval")) return badges.foodApprovals ?? 0
    if (l === "restaurants" || l.includes("new joining request")) return badges.restaurants ?? 0
    if (l.includes("restaurant complaints")) return badges.restaurantComplaints ?? 0
    if (l.includes("support tickets")) return l.includes("delivery") ? (badges.deliverySupportTickets ?? 0) : (badges.userSupportTickets ?? 0)
    if (l.includes("withdrawal") || l.includes("withdraws")) return l.includes("delivery") ? (badges.deliveryWithdrawals ?? 0) : (badges.restaurantWithdrawals ?? 0)
    if (l.includes("cash confirmations")) return badges.cashConfirmations ?? 0
    if (l.includes("emergency help")) return badges.emergencyHelp ?? 0
    if (l.includes("earning addon history")) return badges.earningAddons ?? 0
    if (l.includes("safety emergency reports")) return badges.safetyReports ?? 0
    if (l === "deliveryman" || l.includes("join request") || l.includes("join-request")) return badges.deliveryPartners ?? 0
    if (l === "user feedback") return badges.contactMessages ?? 0
    if (l === "orders") return badges.orders ?? 0

    return 0
  }
  // Get initial states from consolidated admin_sidebar_state
  const getInitialStates = () => {
    try {
      const saved = localStorage.getItem('admin_sidebar_state')
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (e) {
      debugError('Error loading sidebar state:', e)
    }
    return { isCollapsed: false, expandedSections: {} }
  }

  const [isCollapsed, setIsCollapsed] = useState(() => getInitialStates().isCollapsed)
  const [expandedSections, setExpandedSections] = useState(() => {
    const initialState = getInitialStates().expandedSections || {}
    
    // Generate defaults if empty, but also pre-expand matching path synchronously
    const state = { ...initialState }
    adminSidebarMenu.forEach((item) => {
      if (item.type === "section") {
        item.items.forEach((subItem) => {
          if (subItem.type === "expandable") {
            const key = subItem.label.toLowerCase().replace(/\s+/g, "")
            if (typeof state[key] === "undefined") {
              state[key] = false
            }
          }
        })
      }
    })

    // Pre-expand section for current path synchronously on reload
    const currentPath = window.location.pathname.replace(/\/+$/, "") || "/"
    adminSidebarMenu.forEach((item) => {
      if (item.type === "section") {
        item.items.forEach((menuItem) => {
          if (menuItem.type === "expandable" && menuItem.subItems) {
            const hasMatchingSubItem = menuItem.subItems.some((subItem) => {
              const subPath = String(subItem.path || "").replace(/\/+$/, "")
              return currentPath === subPath || currentPath.startsWith(`${subPath}/`)
            })
            if (hasMatchingSubItem) {
              const key = menuItem.label.toLowerCase().replace(/\s+/g, "")
              state[key] = true
            }
          }
        })
      }
    })

    return state
  })

  // Save states to consolidated localStorage and notify parent
  useEffect(() => {
    try {
      const currentState = JSON.parse(localStorage.getItem('admin_sidebar_state') || '{}')
      localStorage.setItem('admin_sidebar_state', JSON.stringify({
        ...currentState,
        isCollapsed
      }))
      if (onCollapseChange) {
        onCollapseChange(isCollapsed)
      }
    } catch (e) {
      debugError('Error saving sidebar collapsed state:', e)
    }
  }, [isCollapsed, onCollapseChange])

  // Notify parent on initial load
  useEffect(() => {
    if (onCollapseChange) {
      onCollapseChange(isCollapsed)
    }
  }, [])

  const toggleCollapse = () => {
    setIsCollapsed(prev => !prev)
  }

  // expandedSections state is initialized above in getInitialStates consolidation


  // Permission-filtered base menu (full ADMIN sees all; SUB_ADMIN sees allowed only)
  // Do NOT depend on location.pathname — remounting menu on every route break expandable submenus.
  const adminUser = getCurrentUser("admin")
  const permissionSyncKey = `${adminUser?.role || ""}:${JSON.stringify(adminUser?.permissions || {})}`
  const permissionMenuData = useMemo(() => {
    return filterSidebarMenuByPermissions(adminSidebarMenu, getCurrentUser("admin"))
  }, [permissionSyncKey])

  // Filter menu items based on search query
  const filteredMenuData = useMemo(() => {
    if (!searchQuery.trim()) {
      return permissionMenuData
    }

    const query = searchQuery.toLowerCase().trim()
    const filtered = []

    permissionMenuData.forEach((item) => {
      if (item.type === "link") {
        if (item.label.toLowerCase().includes(query)) {
          filtered.push(item)
        }
      } else if (item.type === "section") {
        const filteredItems = []

        item.items.forEach((subItem) => {
          if (subItem.type === "link") {
            if (subItem.label.toLowerCase().includes(query)) {
              filteredItems.push(subItem)
            }
          } else if (subItem.type === "expandable") {
            const matchesLabel = subItem.label.toLowerCase().includes(query)
            const matchingSubItems = subItem.subItems?.filter(
              (si) => si.label.toLowerCase().includes(query)
            ) || []

            if (matchesLabel || matchingSubItems.length > 0) {
              filteredItems.push({
                ...subItem,
                subItems: matchesLabel ? subItem.subItems : matchingSubItems,
              })
            }
          }
        })

        if (filteredItems.length > 0) {
          filtered.push({
            ...item,
            items: filteredItems,
          })
        }
      }
    })

    return filtered
  }, [searchQuery, permissionMenuData])

  // Auto-expand sections with matches when searching
  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()

      setExpandedSections((prev) => {
        const newExpandedState = { ...prev }

        adminSidebarMenu.forEach((item) => {
          if (item.type === "section") {
            item.items.forEach((subItem) => {
              if (subItem.type === "expandable") {
                const matchesLabel = subItem.label.toLowerCase().includes(query)
                const hasMatchingSubItems = subItem.subItems?.some(
                  (si) => si.label.toLowerCase().includes(query)
                )

                if (matchesLabel || hasMatchingSubItems) {
                  const sectionKey = subItem.label.toLowerCase().replace(/\s+/g, "")
                  newExpandedState[sectionKey] = true
                }
              }
            })
          }
        })

        return newExpandedState
      })
    }
  }, [searchQuery])

  const isActive = (path, allPaths = []) => {
    const currentPath = location.pathname.replace(/\/+$/, "") || "/"
    const targetPath = String(path || "").replace(/\/+$/, "") || "/"
    const matchesPath = (candidatePath) =>
      currentPath === candidatePath || currentPath.startsWith(`${candidatePath}/`)

    if (targetPath === "/admin" || targetPath === "/admin/food") {
      return currentPath === targetPath
    }

    // For subItems, check if this is the most specific match
    if (allPaths.length > 0) {
      // Sort paths by length (longest first) to find most specific match
      const sortedPaths = [...allPaths].sort((a, b) => b.length - a.length)
      const bestMatch = sortedPaths.find((candidatePath) =>
        matchesPath(String(candidatePath || "").replace(/\/+$/, "") || "/")
      )
      return (String(bestMatch || "").replace(/\/+$/, "") || "/") === targetPath
    }

    return matchesPath(targetPath)
  }

  useEffect(() => {
    const currentPath = location.pathname.replace(/\/+$/, "") || "/"
    let foundSectionKey = null
    
    adminSidebarMenu.forEach((item) => {
      if (item.type === "section") {
        item.items.forEach((menuItem) => {
          if (menuItem.type === "expandable" && menuItem.subItems) {
            const hasMatchingSubItem = menuItem.subItems.some((subItem) => {
              const subPath = String(subItem.path || "").replace(/\/+$/, "")
              return currentPath === subPath || currentPath.startsWith(`${subPath}/`)
            })
            if (hasMatchingSubItem) {
              foundSectionKey = menuItem.label.toLowerCase().replace(/\s+/g, "")
            }
          }
        })
      }
    })

    if (foundSectionKey) {
      setExpandedSections((prev) => {
        if (prev[foundSectionKey]) return prev
        return {
          ...prev,
          [foundSectionKey]: true
        }
      })
    }
  }, [location.pathname])

  // Helper to scroll active item to the center of the sidebar scrollable container
  const scrollToActiveItem = (behavior = "auto") => {
    if (typeof document === "undefined" || !sidebarNavRef.current) return
    const container = sidebarNavRef.current
    const activeElements = container.querySelectorAll('[data-active="true"]')
    const activeElement = activeElements.length
      ? activeElements[activeElements.length - 1]
      : null
    if (activeElement) {
      const containerRect = container.getBoundingClientRect()
      const activeRect = activeElement.getBoundingClientRect()
      
      const relativeTop = activeRect.top - containerRect.top + container.scrollTop
      const targetScrollTop = relativeTop - (containerRect.height / 2) + (activeRect.height / 2)
      const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight)
      const clampedTop = Math.max(0, Math.min(targetScrollTop, maxScroll))
      
      container.scrollTo({
        top: clampedTop,
        behavior: behavior
      })
      lastScrolledPathname.current = location.pathname
    }
  }

  // Helper to scroll toggled sections safely without scrolling the parent window
  const scrollToElement = (element, behavior = "smooth") => {
    if (typeof document === "undefined" || !sidebarNavRef.current || !element) return
    const container = sidebarNavRef.current
    const containerRect = container.getBoundingClientRect()
    const elementRect = element.getBoundingClientRect()
    
    const relativeTop = elementRect.top - containerRect.top + container.scrollTop
    const relativeBottom = relativeTop + elementRect.height
    const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight)
    
    if (relativeTop < container.scrollTop) {
      container.scrollTo({
        top: Math.max(0, relativeTop - 8),
        behavior: behavior
      })
    } else if (relativeBottom > container.scrollTop + containerRect.height) {
      const nextTop = relativeBottom - containerRect.height + 8
      container.scrollTo({
        top: Math.min(maxScroll, nextTop),
        behavior: behavior
      })
    }
  }

  // 1. Initial mount/refresh scroll: Position the active tab centered INSTANTLY on load/refresh
  // Runs after skeleton loading is finished and menu items are rendered in the DOM.
  useLayoutEffect(() => {
    if (!isLoading && !hasScrolledOnMount.current) {
      hasScrolledOnMount.current = true
      lastScrolledPathname.current = location.pathname
      
      scrollToActiveItem("auto")
      const timer = setTimeout(() => {
        scrollToActiveItem("auto")
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isLoading])

  // 2. Smoothly scroll active sidebar item into the center on route navigation.
  useEffect(() => {
    if (!hasScrolledOnMount.current) {
      return
    }

    if (location.pathname === lastScrolledPathname.current) {
      return
    }

    pendingNavScrollPath.current = location.pathname

    const timer1 = setTimeout(() => {
      scrollToActiveItem("smooth")
    }, 180)

    const timer2 = setTimeout(() => {
      if (pendingNavScrollPath.current === location.pathname) {
        scrollToActiveItem("smooth")
        pendingNavScrollPath.current = null
      }
    }, 420)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [location.pathname])

  // After expandable section opens for the new route, center the active link again.
  useLayoutEffect(() => {
    if (!hasScrolledOnMount.current || !pendingNavScrollPath.current) return
    if (pendingNavScrollPath.current !== location.pathname) return

    const frame = requestAnimationFrame(() => {
      scrollToActiveItem("auto")
    })
    return () => cancelAnimationFrame(frame)
  }, [location.pathname, expandedSections])

  useEffect(() => {
    try {
      const currentState = JSON.parse(localStorage.getItem('admin_sidebar_state') || '{}')
      localStorage.setItem('admin_sidebar_state', JSON.stringify({
        ...currentState,
        expandedSections
      }))
    } catch (e) {
      debugError('Error saving sidebar state:', e)
    }
  }, [expandedSections])

  const toggleSection = (sectionKey) => {
    setExpandedSections((prev) => {
      const isCurrentlyOpen = Boolean(prev[sectionKey])

      // Accordion behavior:
      // 1) If current section is open -> close it.
      // 2) If current section is closed -> open it and close all others.
      if (isCurrentlyOpen) {
        return {
          ...prev,
          [sectionKey]: false,
        }
      }

      const next = {}
      Object.keys(prev).forEach((key) => {
        next[key] = key === sectionKey
      })
      return next
    })
  }

  const renderMenuItem = (item, index, isInSection = false) => {
    if (item.type === "link") {
      const Icon = iconMap[item.icon] || Utensils
      return (
        <Link
          key={index}
          to={item.path}
          data-active={isActive(item.path) ? "true" : undefined}
          onClick={() => {
            if (isActive(item.path)) {
              refreshAdminListForPath(item.path)
            }
            if (window.innerWidth < 1024 && onClose) {
              onClose()
            }
          }}
          className={navRowClass(isActive(item.path), isCollapsed)}
          title={isCollapsed ? item.label : undefined}
        >
          <Icon strokeWidth={1.5} className={navIconClass(isActive(item.path))} />
          {!isCollapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
          {!isCollapsed && getBadgeCount(item.label, item.path) > 0 && (
            <span className={navCountClass}>
              {getBadgeCount(item.label, item.path) > 99 ? "99+" : getBadgeCount(item.label, item.path)}
            </span>
          )}
          {isCollapsed && getBadgeCount(item.label, item.path) > 0 && <span className={navDotClass} />}
        </Link>
      )
    }

    if (item.type === "expandable") {
      const Icon = iconMap[item.icon] || Utensils
      const sectionKey = item.label.toLowerCase().replace(/\s+/g, "")
      const isExpanded = expandedSections[sectionKey] || false

      if (isCollapsed) {
        return (
          <div key={index}>
            <button
              onClick={(e) => {
                toggleSection(sectionKey)
                scrollToElement(e.currentTarget, "smooth")
              }}
              className={navRowClass(false, true)}
              title={item.label}
            >
              <Icon strokeWidth={1.5} className={navIconClass(false)} />
              {getBadgeCount(item.label, item.path) > 0 && <span className={navDotClass} />}
            </button>
          </div>
        )
      }

      return (
        <div key={index} className="space-y-0.5">
          <button
            onClick={(e) => {
              toggleSection(sectionKey)
              scrollToElement(e.currentTarget, "smooth")
            }}
            aria-expanded={isExpanded}
            className={navRowClass(false)}
          >
            <Icon strokeWidth={1.5} className={navIconClass(false)} />
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {getBadgeCount(item.label, item.path) > 0 && (
              <span className={navCountClass}>
                {getBadgeCount(item.label, item.path) > 99 ? "99+" : getBadgeCount(item.label, item.path)}
              </span>
            )}
            <ChevronDown strokeWidth={1.5} className={cn("h-3.5 w-3.5 shrink-0 text-neutral-500 transition-transform duration-150", !isExpanded && "-rotate-90")} />
          </button>
          {isExpanded && item.subItems && item.subItems.length > 0 && (
            <div className="space-y-0.5 submenu-animate">
              {item.subItems.map((subItem) => {
                const allSubPaths = item.subItems.map(si => si.path)
                return (
                  <Link
                    key={subItem.path || subItem.label}
                    to={subItem.path}
                    data-active={isActive(subItem.path, allSubPaths) ? "true" : undefined}
                    onClick={() => {
                      if (isActive(subItem.path, allSubPaths)) {
                        refreshAdminListForPath(subItem.path)
                      }
                      if (window.innerWidth < 1024 && onClose) {
                        onClose()
                      }
                    }}
                    className={navSubRowClass(isActive(subItem.path, allSubPaths))}
                  >
                    <span className="min-w-0 flex-1 truncate">{subItem.label}</span>
                    {getBadgeCount(subItem.label, subItem.path) > 0 && (
                      <span className={navCountClass}>
                        {getBadgeCount(subItem.label, subItem.path) > 99 ? "99+" : getBadgeCount(subItem.label, subItem.path)}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      )
    }

    return null
  }

  return (
    <>
      <style>{`
        @keyframes expandDown {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .submenu-animate { animation: expandDown 0.18s cubic-bezier(0.22, 1, 0.36, 1) both; }
        @media (prefers-reduced-motion: reduce) { .submenu-animate { animation: none; } }
      `}{RAIL_SCROLLBAR_CSS}</style>
      <div
        className={cn(
          railClass(isCollapsed),
          "fixed left-0 top-0 transition-[width,transform]",
          "lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className={railHeaderClass}>
          <AdminSidebarBrand moduleLabel="Food admin" isCollapsed={isCollapsed}>
            <RailCollapseButton isCollapsed={isCollapsed} onClick={toggleCollapse} />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-neutral-500 transition-colors hover:bg-white/[0.06] hover:text-neutral-200 lg:hidden"
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          </AdminSidebarBrand>

          {/* The shared module strip is the only one that knows about Global. */}
          <AdminModuleSwitcher isCollapsed={isCollapsed} />

          {!isCollapsed && (
            <div className="relative">
              <Search className={railSearchIconClass} strokeWidth={1.5} />
              <input
                type="text"
                placeholder="Search menu"
                aria-label="Search menu"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={railSearchInputClass(Boolean(searchQuery))}
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery("")} className={railSearchClearClass} aria-label="Clear search">
                  <X size={14} strokeWidth={1.5} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <nav ref={sidebarNavRef} className={cn(railNavClass, "space-y-0.5")}>
          {isLoading ? (
            <SidebarSkeleton isCollapsed={isCollapsed} />
          ) : filteredMenuData.length === 0 && searchQuery.trim() ? (
            <div className="px-3 py-8">
              <p className="text-sm text-neutral-300">{railEmptyState.title}</p>
              <p className="mt-1 text-xs text-neutral-500">{railEmptyState.hint}</p>
            </div>
          ) : (
            filteredMenuData.map((item, index) => {
              if (item.type === "link") {
                return renderMenuItem(item, item.path || item.label)
              }

              if (item.type === "section") {
                return (
                  <div
                    key={item.label || index}
                    className={index > 0 ? "pt-6" : "pt-1"}
                  >
                      <div className="flex items-center justify-between pr-3">
                        <span className={navSectionLabelClass}>
                          {item.label}
                        </span>
                        {item.items.some(subItem => {
                          const count = getBadgeCount(subItem.label, subItem.path);
                          if (count > 0) return true;
                          if (subItem.type === "expandable" && subItem.subItems) {
                            return subItem.subItems.some(si => getBadgeCount(si.label, si.path) > 0);
                          }
                          return false;
                        }) && (
                          <span className="mb-2 h-1.5 w-1.5 rounded-full bg-red-400" />
                        )}
                      </div>
                    <div className="space-y-0.5">
                      {item.items.map((subItem, subIndex) =>
                        renderMenuItem(
                          subItem,
                          subItem.path || subItem.label || `${item.label}-${subIndex}`,
                          true
                        )
                      )}
                    </div>
                  </div>
                )
              }

              return null
            })
          )}
        </nav>
      </div>
    </>
  )
}

