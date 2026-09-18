import {
  MessageSquare,
  Phone,
  CircleDot,
  Settings,
  User,
  LogOut,
} from "lucide-react";

const NAV_ITEMS = [
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
}) {
  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 lg:hidden ${isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
          }`}
        onClick={onClose}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[72px] flex-col border-r border-white/10 bg-[#070b17] p-3 text-slate-300 shadow-2xl shadow-black/50 transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"
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
              <button
                key={id}
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
