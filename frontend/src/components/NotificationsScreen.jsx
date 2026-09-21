import { Bell, MessageSquare, Phone, UserPlus, Check } from "lucide-react";
import LogoSection from "./LogoSection";

export default function NotificationsScreen({
  notifications = [],
  selectedId,
  onSelect,
  onMarkAllRead,
  onOpenSidebar,
}) {
  const unread = notifications.filter((n) => !n.read).length;

  const TypeIcon = ({ type }) => {
    switch (type) {
      case "request":
        return <UserPlus className="h-4 w-4" />;
      case "call":
        return <Phone className="h-4 w-4" />;
      case "message":
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex h-full flex-col border-r border-white/10 bg-card/40 backdrop-blur-xl">
      <LogoSection onOpenSidebar={onOpenSidebar} />

      <div className="flex items-center justify-between border-b border-white/10 px-5 pb-3 pt-1">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-semibold text-white">Notifications</h1>
            <p className="mt-0.5 text-sm text-slate-400">
              {unread > 0 ? `${unread} unread` : "You're all caught up"}
            </p>
          </div>
        </div>
        {unread > 0 && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <Check className="h-3.5 w-3.5" />
            Mark all read
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {notifications.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-slate-400">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
              <Bell className="h-7 w-7" />
            </div>
            <p className="text-sm font-medium text-white">No notifications</p>
            <p className="max-w-[240px] text-xs">
              When new messages, requests, or calls arrive, they&apos;ll show
              up here.
            </p>
          </div>
        ) : (
          <div className="space-y-[6px]">
            {notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => onSelect?.(n)}
                className={`flex w-full items-start gap-3 rounded-[12px] border px-3 py-3 text-left transition hover:border-primary/50 hover:bg-white/5 ${selectedId === n.id
                  ? "border-primary bg-white/10"
                  : n.read
                    ? "border-white/5 bg-white/[0.02]"
                    : "border-primary/30 bg-white/[0.05]"
                  }`}
              >
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-slate-300">
                  <TypeIcon type={n.type} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="truncate text-sm font-semibold text-white">
                      {n.title}
                    </h3>
                    {!n.read && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">{n.body}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{n.time}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
