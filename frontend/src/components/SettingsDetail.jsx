import { useState, useEffect } from "react";
import {
  Ban,
  Unlock,
  Lock,
  KeyRound,
  ArrowLeft,
  Check,
  Loader2,
  ShieldAlert,
  Settings,
  Monitor,
  Smartphone,
  Laptop,
  LogOut,
  ShieldCheck,
  Clock,
} from "lucide-react";
import {
  getSessions,
  revokeSession,
  logoutOtherSessions,
  setupTwoStep,
  disableTwoStep,
} from "../api/sessionsApi";
import { getCurrentUser } from "../api/userApi";

const SETTINGS_CARDS = [
  { label: "Notifications", desc: "Message & call alerts", key: "preferences:Notifications", icon: "🔔" },
  { label: "Read receipts", desc: "Seen indicators", key: "preferences:Read receipts", icon: "✓" },
  { label: "Blocked users", desc: "Privacy controls", key: "privacy:Blocked users", icon: "🚫" },
  { label: "Change password", desc: "Account security", key: "privacy:Change password", icon: "🔑" },
  { label: "Active sessions", desc: "Review logged-in devices", key: "privacy:Active sessions", icon: "📱" },
  { label: "Two-step verification", desc: "Extra account protection", key: "privacy:Two-step verification", icon: "🔒" },
];

function PasswordChangeDetail({ onDone }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError("");
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSaving(true);
    try {
      await onDone(currentPassword, newPassword);
      setMessage("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.message || "Failed to change password.");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-[14px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 transition focus:border-primary/60";

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-8">
      <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-gradient-to-br from-indigo-500/20 to-purple-600/20 text-indigo-400">
        <KeyRound className="h-8 w-8" />
      </div>
      <h2 className="mt-5 text-2xl font-semibold text-white">Change password</h2>
      <p className="mt-2 max-w-[360px] text-center text-sm text-slate-400">
        Enter your current password and choose a new one.
      </p>
      <form onSubmit={handleSubmit} className="mt-7 w-full max-w-[380px] space-y-3">
        <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Current password" className={inputClass} required />
        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password (min 6 chars)" className={inputClass} required />
        <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" className={inputClass} required />
        {error && <div className="rounded-[12px] border border-rose-500/25 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-300">{error}</div>}
        {message && <div className="rounded-[12px] border border-emerald-500/25 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-300">{message}</div>}
        <button type="submit" disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-gradient-to-r from-indigo-500 to-purple-600 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-900/25 transition hover:opacity-90 disabled:opacity-40">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Update Password
        </button>
      </form>
    </div>
  );
}

function BlockedUsersDetail({ blockedUsers, onUnblock }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-8">
      <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-gradient-to-br from-indigo-500/20 to-purple-600/20 text-indigo-400">
        <Ban className="h-8 w-8" />
      </div>
      <h2 className="mt-5 text-2xl font-semibold text-white">Blocked users</h2>
      <p className="mt-2 max-w-[380px] text-center text-sm text-slate-400">
        Blocked users can't send you messages or call you.
      </p>
      <div className="mt-7 w-full max-w-[420px] space-y-2">
        {blockedUsers.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-white/10 bg-white/[0.02] px-6 py-8 text-center">
            <ShieldAlert className="mx-auto h-8 w-8 text-slate-500" />
            <p className="mt-3 text-sm font-medium text-white">No blocked users</p>
            <p className="mx-auto mt-1 max-w-[260px] text-xs text-slate-400">
              When you block someone, they'll appear here.
            </p>
          </div>
        ) : (
          blockedUsers.map((user) => (
            <div key={user.username} className="flex items-center gap-3 rounded-[14px] border border-white/10 bg-white/[0.04] px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium capitalize text-white">{user.displayName || user.username}</p>
                <p className="text-xs text-slate-400">@{user.username}</p>
              </div>
              <button type="button" onClick={() => onUnblock(user.username)} className="flex items-center gap-1.5 rounded-[10px] border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-emerald-500/15 hover:text-emerald-300">
                <Unlock className="h-3.5 w-3.5" />
                Unblock
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button type="button" role="switch" onClick={() => onChange(!checked)} className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${checked ? "bg-gradient-to-r from-indigo-500 to-purple-600" : "bg-white/10"}`}>
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

function ThemeAccentPicker({ prefs, onTogglePref }) {
  const accents = ["violet", "indigo", "emerald", "rose", "amber", "cyan"];
  const colors = {
    violet: "from-violet-500 to-purple-600",
    indigo: "from-indigo-500 to-blue-600",
    emerald: "from-emerald-500 to-teal-600",
    rose: "from-rose-500 to-pink-600",
    amber: "from-amber-500 to-orange-600",
    cyan: "from-cyan-500 to-sky-600",
  };
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-8">
      <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-gradient-to-br from-indigo-500/20 to-purple-600/20 text-indigo-400">
        <Settings className="h-8 w-8" />
      </div>
      <h2 className="mt-5 text-2xl font-semibold text-white">Theme accent</h2>
      <p className="mt-2 max-w-[340px] text-center text-sm text-slate-400">
        Pick your preferred accent color.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        {accents.map((accent) => {
          const active = (prefs?.themeAccent || "violet") === accent;
          return (
            <button key={accent} type="button" onClick={() => onTogglePref("themeAccent", accent)} className={`flex h-14 w-14 items-center justify-center rounded-[16px] bg-gradient-to-br capitalize text-white transition ${colors[accent]} ${active ? "ring-2 ring-white ring-offset-2 ring-offset-[#0f1428]" : "opacity-80 hover:scale-105"}`}>
              {active && <Check className="h-5 w-5" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SimpleToggleDetail({ title, icon: Icon, description, checked, onChange }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-8">
      <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-gradient-to-br from-indigo-500/20 to-purple-600/20 text-indigo-400">
        <Icon className="h-8 w-8" />
      </div>
      <h2 className="mt-5 text-2xl font-semibold text-white">{title}</h2>
      <p className="mt-2 max-w-[340px] text-center text-sm text-slate-400">{description}</p>
      <div className="mt-7 w-full max-w-[380px] rounded-[14px] border border-white/10 bg-white/[0.03]">
        <div className="flex items-center justify-between px-4 py-4">
          <span className="text-sm text-white">Enable</span>
          <Toggle checked={checked} onChange={onChange} />
        </div>
      </div>
    </div>
  );
}

function ActiveSessionsDetail() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState(null);

  const load = async () => {
    try {
      const list = await getSessions();
      setSessions(list);
      setLoading(false);
    } catch {
      setMessage({ type: "error", text: "Failed to load sessions." });
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    getSessions()
      .then((list) => {
        if (active) {
          setSessions(list);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setMessage({ type: "error", text: "Failed to load sessions." });
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const handleRevoke = async (id) => {
    setBusyId(id);
    setMessage(null);
    try {
      const res = await revokeSession(id);
      if (res?.logout) {
        setMessage({ type: "success", text: "Current session logged out. You'll be signed out shortly." });
      }
      await load();
    } catch (e) {
      setMessage({ type: "error", text: e.message || "Failed to revoke session." });
    } finally {
      setBusyId(null);
    }
  };

  const handleLogoutOthers = async () => {
    setBusyId("all");
    setMessage(null);
    try {
      await logoutOtherSessions();
      setMessage({ type: "success", text: "All other sessions logged out." });
      await load();
    } catch (e) {
      setMessage({ type: "error", text: e.message || "Failed to log out other sessions." });
    } finally {
      setBusyId(null);
    }
  };

  const formatActive = (ts) => {
    if (!ts) return "Never";
    return new Date(ts).toLocaleString([], {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-8">
      <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-gradient-to-br from-indigo-500/20 to-purple-600/20 text-indigo-400">
        <Monitor className="h-8 w-8" />
      </div>
      <h2 className="mt-5 text-2xl font-semibold text-white">Active sessions</h2>
      <p className="mt-2 max-w-[360px] text-center text-sm text-slate-400">
        Devices that are currently logged into your account.
      </p>

      {message && (
        <div
          className={`mt-4 w-full max-w-[420px] rounded-[12px] border px-4 py-2.5 text-xs ${
            message.type === "success"
              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
              : "border-rose-500/25 bg-rose-500/10 text-rose-300"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="mt-6 w-full max-w-[460px] space-y-2">
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        {!loading &&
          sessions.map((s) => {
            const Icon = s.current ? Laptop : Smartphone;
            return (
              <div
                key={s.id}
                className="flex items-center gap-3 rounded-[14px] border border-white/10 bg-white/[0.04] px-4 py-3"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[12px] bg-white/5 text-slate-300">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">
                    {s.deviceName || "Unknown device"}
                    {s.current && (
                      <span className="ml-2 rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        This device
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                    <Clock className="h-3 w-3" />
                    Last active {formatActive(s.lastActive)}
                    {s.ip ? ` · ${s.ip}` : ""}
                  </p>
                </div>
                {!s.current && (
                  <button
                    type="button"
                    disabled={busyId === s.id}
                    onClick={() => handleRevoke(s.id)}
                    className="flex items-center gap-1.5 rounded-[10px] border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-rose-500/15 hover:text-rose-300"
                  >
                    {busyId === s.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <LogOut className="h-3.5 w-3.5" />
                    )}
                    Log out
                  </button>
                )}
              </div>
            );
          })}
      </div>

      {!loading && sessions.filter((s) => !s.current).length > 0 && (
        <button
          type="button"
          disabled={busyId === "all"}
          onClick={handleLogoutOthers}
          className="mt-4 flex items-center gap-2 rounded-[12px] border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-white/10"
        >
          {busyId === "all" && <Loader2 className="h-4 w-4 animate-spin" />}
          <LogOut className="h-4 w-4" />
          Log out all other devices
        </button>
      )}
    </div>
  );
}

function TwoStepDetail() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then((data) => {
        if (active) setEnabled(!!(data.twoStepEnabled ?? false));
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSetup = async (e) => {
    e.preventDefault();
    setError("");
    setMessage(null);
    if (!/^\d{4,6}$/.test(pin)) {
      setError("Enter a 4 to 6 digit PIN.");
      return;
    }
    if (pin !== confirmPin) {
      setError("PINs do not match.");
      return;
    }
    setSaving(true);
    try {
      await setupTwoStep(pin);
      setEnabled(true);
      setPin("");
      setConfirmPin("");
      setMessage("Two-step verification enabled.");
    } catch (err) {
      setError(err.message || "Failed to enable two-step verification.");
    } finally {
      setSaving(false);
    }
  };

  const handleDisable = async () => {
    if (!pin) {
      setError("Enter your current PIN to disable.");
      return;
    }
    setError("");
    setMessage(null);
    setSaving(true);
    try {
      await disableTwoStep(pin);
      setEnabled(false);
      setPin("");
      setMessage("Two-step verification disabled.");
    } catch (err) {
      setError(err.message || "Incorrect PIN.");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-[14px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 transition focus:border-primary/60";

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-8">
      <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-gradient-to-br from-indigo-500/20 to-purple-600/20 text-indigo-400">
        <ShieldCheck className="h-8 w-8" />
      </div>
      <h2 className="mt-5 text-2xl font-semibold text-white">
        Two-step verification
      </h2>
      <p className="mt-2 max-w-[360px] text-center text-sm text-slate-400">
        Add an extra layer of security. You'll be asked for this PIN when logging
        in from a new device.
      </p>

      {loading ? (
        <div className="mt-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {message && (
            <div className="mt-4 w-full max-w-[380px] rounded-[12px] border border-emerald-500/25 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-300">
              {message}
            </div>
          )}
          {error && (
            <div className="mt-4 w-full max-w-[380px] rounded-[12px] border border-rose-500/25 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-300">
              {error}
            </div>
          )}

          {enabled ? (
            <div className="mt-6 w-full max-w-[380px] space-y-3">
              <div className="flex items-center justify-between rounded-[14px] border border-emerald-500/25 bg-emerald-500/10 px-4 py-3">
                <span className="flex items-center gap-2 text-sm font-medium text-emerald-300">
                  <ShieldCheck className="h-4 w-4" /> Enabled
                </span>
                <span className="text-xs text-emerald-300/70">PIN required</span>
              </div>
              <input
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter PIN to disable"
                className={inputClass}
              />
              <button
                type="button"
                disabled={saving}
                onClick={handleDisable}
                className="flex w-full items-center justify-center gap-2 rounded-[14px] border border-rose-500/30 bg-rose-500/10 py-3 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-40"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Disable two-step verification
              </button>
            </div>
          ) : (
            <form onSubmit={handleSetup} className="mt-6 w-full max-w-[380px] space-y-3">
              <input
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Choose a 4-6 digit PIN"
                className={inputClass}
              />
              <input
                type="password"
                inputMode="numeric"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="Confirm PIN"
                className={inputClass}
              />
              <button
                type="submit"
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-gradient-to-r from-indigo-500 to-purple-600 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-900/25 transition hover:opacity-90 disabled:opacity-40"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Enable two-step verification
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}

export default function SettingsDetail({
  selectedId,
  onBack,
  onNavigate,
  prefs,
  onTogglePref,
  blockedUsers = [],
  onUnblock,
  onChangePassword,
}) {
  const renderHome = () => (
    <div className="flex flex-1 flex-col items-center justify-center px-10 py-8 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-gradient-to-br from-indigo-500/20 to-purple-600/20 text-indigo-400">
        <Lock className="h-8 w-8" />
      </div>
      <h2 className="mt-6 text-2xl font-semibold text-white">Settings</h2>
      <p className="mt-2 max-w-[380px] text-sm text-slate-400">
        Customize your experience. Select a setting from the list.
      </p>
      <div className="mt-10 grid w-full max-w-[440px] grid-cols-1 gap-3 sm:grid-cols-2">
        {SETTINGS_CARDS.map((item) => (
          <button key={item.key} type="button" onClick={() => onNavigate?.(item.key)} className="flex items-start gap-3 rounded-[14px] border border-white/10 bg-white/[0.03] px-4 py-3 text-left transition hover:bg-white/[0.06] hover:border-primary/40">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-lg">
              {item.icon}
            </div>
            <div>
              <p className="text-sm font-medium text-white">{item.label}</p>
              <p className="text-xs text-slate-400">{item.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const sectionsMap = {
    "appearance:Theme accent": <ThemeAccentPicker prefs={prefs} onTogglePref={onTogglePref} />,
    "privacy:Blocked users": <BlockedUsersDetail blockedUsers={blockedUsers} onUnblock={onUnblock} />,
    "privacy:Change password": <PasswordChangeDetail onDone={onChangePassword} />,
    "privacy:Active sessions": <ActiveSessionsDetail />,
    "privacy:Two-step verification": <TwoStepDetail />,
    "preferences:Notifications": (
      <SimpleToggleDetail title="Notifications" icon={Check} description="Choose whether you receive alerts for new messages." checked={!!prefs?.notifications} onChange={(v) => onTogglePref("notifications", v)} />
    ),
    "preferences:Read receipts": (
      <SimpleToggleDetail title="Read receipts" icon={Check} description="Control whether others see when you've read their messages." checked={!!prefs?.readReceipts} onChange={(v) => onTogglePref("readReceipts", v)} />
    ),
    "preferences:Sounds": (
      <SimpleToggleDetail title="Sounds" icon={Check} description="Control whether sounds play for incoming messages." checked={!!prefs?.sounds} onChange={(v) => onTogglePref("sounds", v)} />
    ),
    "appearance:Dark mode": (
      <SimpleToggleDetail title="Dark mode" icon={Check} description="The app is optimized for a beautiful dark experience." checked={!!prefs?.darkMode} onChange={(v) => onTogglePref("darkMode", v)} />
    ),
  };

  const withBackHeader = (children) => (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <button type="button" onClick={onBack} className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-sm text-slate-400">Settings</span>
      </div>
      {children}
    </div>
  );

  if (!selectedId) return renderHome();

  if (sectionsMap[selectedId]) {
    return withBackHeader(sectionsMap[selectedId]);
  }

  // Unknown selectedId → go home
  return renderHome();
}