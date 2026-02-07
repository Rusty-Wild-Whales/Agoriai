import { useEffect, useState } from "react";
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
  AlertTriangle,
} from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useUIStore } from "../../stores/uiStore";
import { useAuthStore, visibilityDescriptions, visibilityLabels, type VisibilityLevel } from "../../stores/authStore";
import { Modal } from "../ui/Modal";
import { agoraApi } from "../../services/agoraApi";
import { GlassShatterOverlay } from "../ui/GlassShatterOverlay";

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
    notificationsEnabled,
    setDarkMode,
    setNotificationsEnabled,
  } = useUIStore();
  const { user, visibilityLevel, setVisibilityLevel, setUser, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [accountMessage, setAccountMessage] = useState<string | null>(null);
  const [draftVisibility, setDraftVisibility] = useState<VisibilityLevel>(visibilityLevel);
  const [draftDarkMode, setDraftDarkMode] = useState(darkMode);
  const [draftNotifications, setDraftNotifications] = useState(notificationsEnabled);
  const [showRealNameConfirm, setShowRealNameConfirm] = useState(false);
  const [playShatter, setPlayShatter] = useState(false);

  useEffect(() => {
    if (activeModal !== "settings") return;
    setDraftVisibility(visibilityLevel);
    setDraftDarkMode(darkMode);
    setDraftNotifications(notificationsEnabled);
    setAccountMessage(null);
    setShowRealNameConfirm(false);
    setPlayShatter(false);
  }, [activeModal, visibilityLevel, darkMode, notificationsEnabled]);

  if (activeModal !== "settings") return null;

  const openProfile = () => {
    if (!user) return;
    setActiveModal(null);
    navigate(`/profile/${user.id}`);
  };

  const closeWithDiscard = () => {
    setDraftVisibility(visibilityLevel);
    setDraftDarkMode(darkMode);
    setDraftNotifications(notificationsEnabled);
    setShowRealNameConfirm(false);
    setPlayShatter(false);
    setActiveModal(null);
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

  const handleApplySettings = async () => {
    setAccountMessage(null);
    setIsSubmitting(true);
    try {
      setDarkMode(draftDarkMode);
      setNotificationsEnabled(draftNotifications);

      if (draftVisibility !== visibilityLevel) {
        const updatedUser = await agoraApi.updateMySettings({ visibilityLevel: draftVisibility });
        setUser(updatedUser);
        setVisibilityLevel(updatedUser.visibilityLevel);
      }

      setActiveModal(null);
    } catch (error) {
      setAccountMessage(error instanceof Error ? error.message : "Failed to apply settings.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const chooseVisibility = (level: VisibilityLevel) => {
    if (level === "realName" && draftVisibility !== "realName") {
      setShowRealNameConfirm(true);
      return;
    }
    setDraftVisibility(level);
  };

  const confirmRealNameVisibility = () => {
    setDraftVisibility("realName");
    setShowRealNameConfirm(false);
    setPlayShatter(true);
    window.setTimeout(() => setPlayShatter(false), 2600);
  };

  return (
    <Modal
      isOpen={activeModal === "settings"}
      onClose={closeWithDiscard}
      title="Settings"
      size="xl"
    >
      <div className="relative flex min-h-0 flex-col">
        <GlassShatterOverlay active={playShatter} variant="settings" />
        <div className="space-y-5">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Choose what is visible now. Changes apply only after confirmation.
          </p>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {visibilityLevels.map(({ level, icon: Icon }) => {
              const isSelected = draftVisibility === level;
              return (
                <button
                  key={level}
                  onClick={() => chooseVisibility(level)}
                  className={`mosaic-hover flex w-full cursor-pointer items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                    isSelected
                      ? "border-amber-500 bg-amber-500/10"
                      : "border-slate-200 bg-white/40 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/45 dark:hover:border-slate-600"
                  }`}
                >
                  <div
                    className={`rounded-lg p-2 ${
                      isSelected
                        ? "bg-amber-500 text-white"
                        : "bg-slate-200 text-slate-500 dark:bg-slate-700"
                    }`}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="flex-1">
                    <p
                      className={`font-medium ${
                        isSelected ? "text-amber-500" : "text-slate-900 dark:text-white"
                      }`}
                    >
                      {visibilityLabels[level]}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{visibilityDescriptions[level]}</p>
                  </div>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500"
                    >
                      <Check size={14} className="text-white" />
                    </motion.div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {showRealNameConfirm && (
          <div className="my-2 rounded-xl border border-amber-300/60 bg-amber-50 px-5 py-5 dark:border-amber-500/40 dark:bg-amber-500/10">
            <div className="mb-3 flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <AlertTriangle size={16} />
              <p className="font-medium">Confirm real-name visibility</p>
            </div>
            <p className="text-sm leading-relaxed text-amber-700/90 dark:text-amber-200/90">
              Your alias remains primary, and your real name will be added across your profile, posts, and comments. You can switch back later.
            </p>
            <div className="mt-5 flex items-center justify-end gap-3 border-t border-amber-300/50 pt-4 dark:border-amber-500/30">
              <button
                onClick={() => setShowRealNameConfirm(false)}
                className="cursor-pointer rounded-lg px-3 py-1.5 text-sm text-amber-700 transition-colors hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-500/10"
              >
                Cancel
              </button>
              <button
                onClick={confirmRealNameVisibility}
                className="cursor-pointer rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-amber-400"
              >
                Confirm Reveal
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 border-t border-slate-200 pt-5 dark:border-slate-700 md:grid-cols-2">
          <div className="mosaic-surface flex items-center justify-between rounded-xl p-4">
            <div className="flex items-center gap-3">
              {draftDarkMode ? <Moon size={20} className="text-amber-500" /> : <Sun size={20} className="text-amber-500" />}
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Appearance</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {draftDarkMode ? "Dark theme enabled" : "Light theme enabled"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setDraftDarkMode((prev) => !prev)}
              className={`relative h-6 w-12 cursor-pointer rounded-full transition-colors ${
                draftDarkMode ? "bg-amber-500" : "bg-slate-600"
              }`}
            >
              <motion.div
                animate={{ x: draftDarkMode ? 24 : 2 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm"
              />
            </button>
          </div>

          <div className="mosaic-surface flex items-center justify-between rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Bell size={20} className="text-slate-500" />
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Notifications</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {draftNotifications ? "Enabled for your account" : "Muted for your account"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setDraftNotifications((prev) => !prev)}
              className="cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium text-amber-500 transition-colors hover:bg-amber-500/10"
            >
              {draftNotifications ? "Disable" : "Enable"}
            </button>
          </div>

          <div className="mosaic-surface flex items-center justify-between rounded-xl p-4">
            <div className="flex items-center gap-3">
              <User size={20} className="text-slate-500" />
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Account</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">View your public profile</p>
              </div>
            </div>
            <button
              onClick={openProfile}
              className="cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium text-amber-500 transition-colors hover:bg-amber-500/10"
            >
              Open Profile
            </button>
          </div>

          <div className="mosaic-surface flex items-center justify-between rounded-xl p-4">
            <div className="flex items-center gap-3">
              <LogOut size={20} className="text-slate-500" />
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Session</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Sign out of your current account</p>
              </div>
            </div>
            <button
              onClick={() => {
                void handleSignOut();
              }}
              disabled={isSubmitting}
              className="cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium text-amber-500 transition-colors hover:bg-amber-500/10 disabled:opacity-60"
            >
              Sign out
            </button>
          </div>

          <div className="rounded-xl border border-rose-200/60 bg-rose-50/60 p-4 md:col-span-2 dark:border-rose-500/30 dark:bg-rose-500/10">
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
                className="cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-500/10 dark:text-rose-300"
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
          </div>
        </div>

        {accountMessage && (
          <p className="rounded-lg border border-rose-300/70 bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-300">
            {accountMessage}
          </p>
        )}

        <div className="sticky bottom-0 z-20 -mx-6 mt-4 flex justify-end gap-2 border-t border-slate-200 bg-[var(--surface-2)] px-6 py-4 dark:border-slate-700">
          <button
            onClick={closeWithDiscard}
            disabled={isSubmitting}
            className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              void handleApplySettings();
            }}
            disabled={isSubmitting}
            className="cursor-pointer rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-amber-400 disabled:opacity-60"
          >
            {isSubmitting ? "Applying..." : "Apply Changes"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
