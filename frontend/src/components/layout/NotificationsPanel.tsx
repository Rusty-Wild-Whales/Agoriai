import { motion, AnimatePresence } from "framer-motion";
import { X, Bell, CheckCheck, Info, CheckCircle, AlertTriangle } from "lucide-react";
import { useUIStore } from "../../stores/uiStore";
import { formatDate } from "../../utils/helpers";

const typeIcons = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
};

const typeColors = {
  info: "text-blue-500 bg-blue-50 dark:bg-blue-900/30",
  success: "text-green-500 bg-green-50 dark:bg-green-900/30",
  warning: "text-amber-500 bg-amber-50 dark:bg-amber-900/30",
};

export function NotificationsPanel() {
  const {
    activeModal,
    setActiveModal,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
  } = useUIStore();

  const isOpen = activeModal === "notifications";
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveModal(null)}
            className="fixed inset-0 z-40"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: -10, x: 10 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -10, x: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed top-16 right-6 w-96 max-h-[calc(100vh-6rem)] bg-white dark:bg-neutral-900 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700 z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-primary-600" />
                <h3 className="font-semibold text-primary-900 dark:text-white">
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-accent-100 text-accent-700 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllNotificationsRead}
                    className="p-1.5 text-neutral-400 hover:text-primary-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                    title="Mark all as read"
                  >
                    <CheckCheck size={16} />
                  </button>
                )}
                <button
                  onClick={() => setActiveModal(null)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell size={32} className="mx-auto text-neutral-300 mb-3" />
                  <p className="text-neutral-500">No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => {
                  const Icon = typeIcons[notification.type];
                  return (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`p-4 border-b border-neutral-50 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer ${
                        !notification.read ? "bg-primary-50/50 dark:bg-primary-900/20" : ""
                      }`}
                      onClick={() => markNotificationRead(notification.id)}
                    >
                      <div className="flex gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${typeColors[notification.type]}`}
                        >
                          <Icon size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-sm text-primary-900 dark:text-white">
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <div className="w-2 h-2 rounded-full bg-accent-500 shrink-0 mt-1" />
                            )}
                          </div>
                          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-0.5">
                            {notification.message}
                          </p>
                          <p className="text-xs text-neutral-400 mt-1">
                            {formatDate(notification.createdAt)}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
