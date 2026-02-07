import { useState } from "react";
import {
  Moon,
  Sun,
  Bell,
  User,
  Check,
  Eye,
  EyeOff,
  GraduationCap,
  Briefcase,
  LogOut,
  Trash2,
} from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useUIStore } from "../../stores/uiStore";
import { useAuthStore, visibilityLabels, visibilityDescriptions, type VisibilityLevel } from "../../stores/authStore";
import { Modal } from "../ui/Modal";
import { agoraApi } from "../../services/agoraApi";

const visibilityLevels: { level: VisibilityLevel; icon: typeof Eye }[] = [
  { level: "anonymous", icon: EyeOff },
  { level: "role", icon: Briefcase },
  { level: "school", icon: GraduationCap },
  { level: "realName", icon: Eye },
];

export function SettingsModal() {
  const {
    activeModal,
    setActiveModal,
    darkMode,
    toggleDarkMode,
    notificationsEnabled,
    toggleNotificationsEnabled,
  } = useUIStore();
  const { user, visibilityLevel, setVisibilityLevel, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [accountMessage, setAccountMessage] = useState<string | null>(null);

  if (activeModal !== "settings") return null;

  const openProfile = () => {
    if (!user) return;
    setActiveModal(null);
    navigate(`/profile/${user.id}`);
  };

  const handleSignOut = async () => {
    setAccountMessage(null);
    setIsSubmitting(true);
    try {
      await agoraApi.logout();
    } catch (error) {
      console.error("Failed to logout gracefully", error);
    } finally {
      logout();
      setActiveModal(null);
      navigate("/");
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      setAccountMessage("Enter your password to confirm account deletion.");
      return;
    }

    setAccountMessage(null);
    setIsSubmitting(true);
    try {
      await agoraApi.deleteAccount({ password: deletePassword });
      logout();
      setActiveModal(null);
      navigate("/");
    } catch (error) {
      setAccountMessage(error instanceof Error ? error.message : "Failed to delete account.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={activeModal === "settings"}
      onClose={() => setActiveModal(null)}
      title="Settings"
    >
      <div className="space-y-6">
        {/* Privacy Level Selection */}
        <div>
          <p className="text-sm text-slate-400 mb-4">
            Control what others can see about you
          </p>

          <div className="space-y-2">
            {visibilityLevels.map(({ level, icon: Icon }) => {
              const isSelected = visibilityLevel === level;
              return (
                <button
                  key={level}
                  onClick={() => setVisibilityLevel(level)}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer mosaic-hover ${
                    isSelected
                      ? "border-amber-500 bg-amber-500/10"
                      : "border-slate-200 dark:border-slate-700 bg-white/40 dark:bg-slate-800/45 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <div className={`p-2 rounded-lg ${
                    isSelected
                      ? "bg-amber-500 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-500"
                  }`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-medium ${
                      isSelected
                        ? "text-amber-400"
                        : "text-slate-900 dark:text-white"
                    }`}>
                      {visibilityLabels[level]}
                    </p>
                    <p className="text-sm text-slate-500">
                      {visibilityDescriptions[level]}
                    </p>
                  </div>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center"
                    >
                      <Check size={14} className="text-white" />
                    </motion.div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Settings Options */}
        <div className="space-y-2 pt-4 border-t border-slate-200 dark:border-slate-700">
          {/* Dark Mode Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl mosaic-surface">
            <div className="flex items-center gap-3">
              {darkMode ? (
                <Moon size={20} className="text-amber-500" />
              ) : (
                <Sun size={20} className="text-amber-500" />
              )}
              <div>
                <p className="font-medium text-slate-900 dark:text-white">
                  Appearance
                </p>
                <p className="text-sm text-slate-500">
                  {darkMode ? "Dark theme enabled" : "Light theme enabled"}
                </p>
              </div>
            </div>
            <button
              onClick={toggleDarkMode}
              className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${
                darkMode ? "bg-amber-500" : "bg-slate-600"
              }`}
            >
              <motion.div
                animate={{ x: darkMode ? 24 : 2 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
              />
            </button>
          </div>

          {/* Notifications */}
          <div className="flex items-center justify-between p-4 rounded-xl mosaic-surface">
            <div className="flex items-center gap-3">
              <Bell size={20} className="text-slate-500" />
              <div>
                <p className="font-medium text-slate-900 dark:text-white">
                  Notifications
                </p>
                <p className="text-sm text-slate-500">
                  {notificationsEnabled ? "Enabled for your account" : "Muted for your account"}
                </p>
              </div>
            </div>
            <button
              onClick={toggleNotificationsEnabled}
              className="px-3 py-1.5 text-sm font-medium text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors cursor-pointer"
            >
              {notificationsEnabled ? "Disable" : "Enable"}
            </button>
          </div>

          {/* Account */}
          <div className="flex items-center justify-between p-4 rounded-xl mosaic-surface">
            <div className="flex items-center gap-3">
              <User size={20} className="text-slate-500" />
              <div>
                <p className="font-medium text-slate-900 dark:text-white">
                  Account
                </p>
                <p className="text-sm text-slate-500">
                  Manage your account settings
                </p>
              </div>
            </div>
            <button
              onClick={openProfile}
              className="px-3 py-1.5 text-sm font-medium text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors cursor-pointer"
            >
              Open Profile
            </button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl mosaic-surface">
            <div className="flex items-center gap-3">
              <LogOut size={20} className="text-slate-500" />
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Session</p>
                <p className="text-sm text-slate-500">Sign out of your current account</p>
              </div>
            </div>
            <button
              onClick={() => {
                void handleSignOut();
              }}
              disabled={isSubmitting}
              className="px-3 py-1.5 text-sm font-medium text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
            >
              Sign out
            </button>
          </div>

          <div className="p-4 rounded-xl border border-rose-200/60 dark:border-rose-500/30 bg-rose-50/60 dark:bg-rose-500/10">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Trash2 size={20} className="text-rose-500" />
                <div>
                  <p className="font-medium text-rose-700 dark:text-rose-300">Delete account</p>
                  <p className="text-sm text-rose-600/85 dark:text-rose-300/80">
                    Permanently removes your account, posts, comments, and messages.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDeleteConfirm((prev) => !prev)}
                className="px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer dark:text-rose-300"
              >
                {showDeleteConfirm ? "Cancel" : "Delete"}
              </button>
            </div>

            {showDeleteConfirm && (
              <div className="mt-3 space-y-3">
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(event) => setDeletePassword(event.target.value)}
                  placeholder="Enter password to confirm"
                  className="w-full rounded-xl border border-rose-300/70 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-500 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 dark:border-rose-500/50 dark:bg-slate-900 dark:text-white"
                />
                <button
                  onClick={() => {
                    void handleDeleteAccount();
                  }}
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-500 disabled:opacity-60"
                >
                  Permanently delete account
                </button>
              </div>
            )}

            {accountMessage && <p className="mt-3 text-xs text-rose-600 dark:text-rose-300">{accountMessage}</p>}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-600 text-center">
            Agoriai v1.0.0 - Where contribution matters more than background
          </p>
        </div>
      </div>
    </Modal>
  );
}
