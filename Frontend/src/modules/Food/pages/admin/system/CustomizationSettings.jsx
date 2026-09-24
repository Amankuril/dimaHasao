/**
 * These toggles moved to Global admin → Toggle Management, where every switch
 * across the platform now lives — including the per-module maintenance
 * switches that supersede this page's single "Under Maintenance" flag.
 *
 * The route stays so anything linking here still lands somewhere useful
 * rather than on a dead end.
 */
import React from "react"
import { Link } from "react-router-dom"
import { ToggleRight } from "lucide-react"

export default function CustomizationSettings() {
  return (
    <div className="max-w-xl mx-auto p-10 text-center">
      <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
        <ToggleRight size={26} />
      </span>

      <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
        These settings moved
      </h2>
      <p className="mt-2 text-sm text-neutral-500">
        COD, payment and availability switches are now managed for every module together in
        Global admin.
      </p>

      <Link
        to="/global/admin/toggles"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0a4d2b] px-5 py-3 text-sm font-bold text-white"
      >
        Open Toggle Management
      </Link>
    </div>
  )
}
