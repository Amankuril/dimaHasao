import { Bell, CheckCheck, Clock, Loader2, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useAdminNotifications from "@food/hooks/useAdminNotifications";

export default function AdminNotifications() {
  const navigate = useNavigate();
  const {
    items,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismissOne,
    clearAll,
  } = useAdminNotifications();

  const handleOpen = (item) => {
    if (item?.id) markAsRead(item.id);
    if (item?.path) navigate(item.path);
  };

  return (
    <div className="p-6">
      <div className="bg-white rounded-xl border border-neutral-900/[0.08] p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center overflow-visible">
              <Bell className="w-6 h-6 shrink-0" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 z-10 min-w-[20px] h-5 rounded-full bg-amber-500 text-white text-xs font-medium leading-none flex items-center justify-center px-1 border-2 border-white shadow-sm">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-medium text-neutral-900">Notifications</h1>
              <p className="text-sm text-neutral-500">
                Approval and support alerts that need admin attention.
                {unreadCount > 0 ? ` ${unreadCount} unread.` : items.length > 0 ? " All caught up." : ""}
              </p>
            </div>
          </div>
          {items.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  <CheckCheck className="w-4 h-4" />
                  Read all
                </button>
              )}
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex items-center gap-2 rounded-2xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
                Clear all
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="py-12 text-sm text-neutral-500 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading notifications...
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-sm text-neutral-500">No notifications found</div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item?.id}
                className={`rounded-2xl border px-4 py-4 transition-colors ${
                  item.read
                    ? "border-neutral-200 bg-white"
                    : "border-amber-200 bg-amber-50/70 shadow-sm"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => handleOpen(item)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex items-center gap-2">
                      {!item.read && (
                        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      )}
                      <p
                        className={`text-base font-medium ${
                          item.read ? "text-neutral-600" : "text-neutral-900"
                        }`}
                      >
                        {item?.title || "Notification"}
                      </p>
                    </div>
                    <p className={`text-sm mt-1 ${item.read ? "text-neutral-500" : "text-neutral-600"}`}>
                      {item?.message || "-"}
                    </p>
                    <div className="flex items-center gap-2 mt-3 text-xs text-neutral-500">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{item?.timeLabel || "N/A"}</span>
                      {item?.metaLabel ? (
                        <>
                          <span>•</span>
                          <span>{item.metaLabel}</span>
                        </>
                      ) : null}
                      {item.read ? (
                        <>
                          <span>•</span>
                          <span className="text-neutral-400">Read</span>
                        </>
                      ) : null}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => dismissOne(item?.id)}
                    className="shrink-0 rounded-full p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50"
                    aria-label="Remove notification"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
