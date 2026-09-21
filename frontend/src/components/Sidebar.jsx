import {
  MessageSquare,
  Phone,
  CircleDot,
  Bell,
  Settings,
  User,
  LogOut,
} from "lucide-react";

const NAV_ITEMS = [
  { id: "chats", label: "Chats", Icon: MessageSquare },
  { id: "status", label: "Status", Icon: CircleDot },
  { id: "calls", label: "Calls", Icon: Phone },
  { id: "notifications", label: "Notifications", Icon: Bell },
  { id: "settings", label: "Settings", Icon: Settings },
];

const MOBILE_NAV_ITEMS = [
  { id: "chats", label: "Chats", Icon: MessageSquare },
  { id: "status", label: "Status", Icon: CircleDot },
  { id: "calls", label: "Calls", Icon: Phone },
  { id: "settings", label: "Settings", Icon: Settings },
];

export default function Sidebar({
  onLogout,
  isOpen,
  onClose,
  view,
  onViewChange,
  userId,
  avatar,
  unreadCount = 0,
  showMobileQuickActions = true,
}) {
  return (
    <>
      {showMobileQuickActions && <div className="fixed right-3 top-3 z-[60] flex items-center gap-2 sm:hidden">
        <button
          type="button"
          onClick={() => onViewChange("notifications")}
          className={`relative flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#111827]/95 backdrop-blur transition ${
            view === "notifications" ? "text-primary" : "text-slate-200"
          }`}
          aria-label="Alerts"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-[#070b17]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => onViewChange("profile")}
          className={`flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-semibold text-white ring-1 ring-white/10 transition ${
            view === "profile" ? "ring-2 ring-primary" : ""
          }`}
          aria-label="Profile"
        >
          {avatar ? (
            <img src={avatar} alt="" className="h-full w-full object-cover" />
          ) : userId ? (
            userId.charAt(0).toUpperCase()
          ) : (
            <User className="h-5 w-5" />
          )}
        </button>
      </div>}

      <nav className="fixed inset-x-0 bottom-0 z-50 flex h-[72px] items-center border-t border-white/10 bg-[#070b17]/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
        {MOBILE_NAV_ITEMS.map(({ id, label, Icon }) => {
          const active = view === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onViewChange(id)}
              className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[10px] transition ${
                active ? "text-primary" : "text-slate-400"
              }`}
              aria-label={label}
            >
              <Icon className={`h-5 w-5 ${active ? "stroke-[2.5]" : ""}`} />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </nav>

      <div
        className={`fixed inset-0 z-40 hidden bg-black/40 transition-opacity duration-300 sm:block lg:hidden ${isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
          }`}
        onClick={onClose}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 hidden w-[72px] flex-col border-r border-white/10 bg-[#070b17] p-3 text-slate-300 shadow-2xl shadow-black/50 transition-transform duration-300 ease-in-out sm:flex lg:relative lg:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        {/* Profile picture on top */}
        <div className="flex justify-center pt-1 relative">
          <button
            type="button"
            onClick={() => onViewChange("profile")}
            title="Profile"
            aria-label="Profile"
            className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xl font-semibold shadow-lg transition hover:ring-2 hover:ring-primary/50 ${view === "profile" ? "ring-2 ring-primary" : ""
              }`}
          >
            {avatar ? (
              <img
                src={avatar}
                alt="avatar"
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : userId ? (
              userId.charAt(0).toUpperCase()
            ) : (
              <User className="h-6 w-6" />
            )}
          </button>
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-[#070b17]" />
        </div>

        <div className="mt-6 flex flex-1 flex-col items-center space-y-3">
          {NAV_ITEMS.map(({ id, label, Icon }) => {
            const active = view === id;
            return (
              <div key={id} className="relative">
                <button
                  type="button"
                  title={label}
                  aria-label={label}
                  onClick={() => onViewChange(id)}
                  className={`group relative flex h-12 w-12 items-center justify-center rounded-[12px] transition ${active
                    ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-purple-900/40"
                    : "bg-white/5 text-white hover:bg-white/10"
                    }`}
                >
                  <Icon className="h-5 w-5 transition" />
                </button>
                {id === "notifications" && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-[#070b17]">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-center pt-2">
          <button
            onClick={onLogout}
            title="Logout"
            aria-label="Logout"
            className="group flex h-12 w-12 items-center justify-center rounded-[12px] bg-red-500/20 text-red-300 transition hover:bg-red-500/30"
          >
            <LogOut className="h-5 w-5 transition group-hover:text-red-400" />
          </button>
        </div>
      </aside>
    </>
  );
}
