import {
  Bell,
  Volume2,
  Shield,
  Moon,
  Palette,
  ChevronRight,
  Check,
  Menu,
  Ban,
  KeyRound,
  Smartphone,
  Lock,
} from "lucide-react";
import LogoSection from "./LogoSection";

function Toggle({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${checked ? "bg-gradient-to-r from-indigo-500 to-purple-600" : "bg-white/10"
        } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${checked ? "translate-x-5" : "translate-x-0.5"
          }`}
      />
    </button>
  );
}

export default function SettingsScreen({
  selectedId,
  onSelect,
  onOpenSidebar,
  prefs,
  onTogglePref,
  disabled = false,
}) {
  const sections = [
    {
      id: "preferences",
      title: "Preferences",
      items: [
        {
          icon: Bell,
          label: "Notifications",
          desc: "Alerts for new messages and calls",
          control: (
            <Toggle
              checked={!!prefs?.notifications}
              disabled={disabled}
              onChange={() => onTogglePref("notifications", !prefs?.notifications)}
            />
          ),
        },
        {
          icon: Volume2,
          label: "Sounds",
          desc: "Play sounds for incoming messages",
          control: (
            <Toggle
              checked={!!prefs?.sounds}
              disabled={disabled}
              onChange={() => onTogglePref("sounds", !prefs?.sounds)}
            />
          ),
        },
        {
          icon: Check,
          label: "Read receipts",
          desc: "Let others see when you've read",
          control: (
            <Toggle
              checked={!!prefs?.readReceipts}
              disabled={disabled}
              onChange={() => onTogglePref("readReceipts", !prefs?.readReceipts)}
            />
          ),
        },
      ],
    },
    {
      id: "appearance",
      title: "Appearance",
      items: [
        {
          icon: Moon,
          label: "Dark mode",
          desc: "Use the dark color theme",
          control: (
            <Toggle
              checked={!!prefs?.darkMode}
              disabled={disabled}
              onChange={() => onTogglePref("darkMode", !prefs?.darkMode)}
            />
          ),
        },
        {
          icon: Palette,
          label: "Theme accent",
          desc: "Customize accent colors",
          chevron: true,
        },
      ],
    },
    {
      id: "privacy",
      title: "Privacy",
      items: [
        {
          icon: Shield,
          label: "Privacy & security",
          desc: "Manage session and devices",
          chevron: true,
        },
        {
          icon: Ban,
          label: "Blocked users",
          desc: "Manage who can contact you",
          chevron: true,
        },
        {
          icon: KeyRound,
          label: "Change password",
          desc: "Update your account password",
          chevron: true,
        },
        {
          icon: Smartphone,
          label: "Active sessions",
          desc: "Review devices logged into your account",
          chevron: true,
        },
        {
          icon: Lock,
          label: "Two-step verification",
          desc: "Add an extra layer of security to your account",
          chevron: true,
        },
      ],
    },
  ];

  return (
    <div className="flex h-full flex-col border-r border-white/10 bg-card/40 backdrop-blur-xl">
      <LogoSection onOpenSidebar={onOpenSidebar} />

      <div className="flex items-center gap-3 border-b border-white/10 px-5 pb-3 pt-1">
        {onOpenSidebar && (
          <button
            type="button"
            onClick={onOpenSidebar}
            className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] bg-white/5 text-white transition hover:bg-white/10 lg:hidden"
            title="Open Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <div>
          <h1 className="text-xl font-semibold text-white">Settings</h1>
          <p className="mt-0.5 text-sm text-slate-400">
            Manage your preferences and account
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-6">
          {sections.map((section) => (
            <section key={section.id}>
              <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {section.title}
              </h2>
              <div className="divide-y divide-white/5 rounded-[14px] border border-white/10 bg-white/[0.03]">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = selectedId === `${section.id}:${item.label}`;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => onSelect?.(`${section.id}:${item.label}`)}
                      className={`flex w-full items-center gap-3 px-3 py-3 text-left transition ${isActive ? "bg-white/10" : ""
                        }`}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-slate-300">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white">
                          {item.label}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          {item.desc}
                        </p>
                      </div>
                      {item.control || (
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}