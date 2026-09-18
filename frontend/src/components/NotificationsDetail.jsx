import {
  Bell,
  MessageSquare,
  Phone,
  UserPlus,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";

const TYPE_META = {
  status: { icon: Users, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  message: { icon: MessageSquare, color: "text-sky-400", bg: "bg-sky-500/10" },
  call: { icon: Phone, color: "text-indigo-400", bg: "bg-indigo-500/10" },
  request: { icon: UserPlus, color: "text-amber-400", bg: "bg-amber-500/10" },
};

export default function NotificationsDetail({ selectedId, notifications }) {
  const selected = notifications?.find?.((n) => n.id === selectedId);

  if (selected) {
    const meta = TYPE_META[selected.type] || TYPE_META.status;
    const MetaIcon = meta.icon;
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-10 py-8 text-center">
        <div
          className={`flex h-20 w-20 items-center justify-center rounded-full ${meta.bg} ${meta.color}`}
        >
          <MetaIcon className="h-8 w-8" />
        </div>
        <h2 className="mt-5 text-2xl font-semibold text-white">
          {selected.title}
        </h2>
        <p className="mt-2 max-w-[380px] text-sm text-slate-400">
          {selected.body}
        </p>
        <div className="mt-6 rounded-[14px] border border-white/10 bg-white/[0.04] px-6 py-4">
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <Bell className="h-4 w-4 text-slate-400" />
            <span>Received {selected.time}</span>
          </div>
          <div className="mt-2 flex items-center gap-3 text-sm text-slate-300">
            <Shield className="h-4 w-4 text-slate-400" />
            <span>
              Status: {selected.read ? "Read" : "Unread"}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-10 py-8 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-gradient-to-br from-amber-500/20 to-orange-600/20 text-amber-400">
        <Bell className="h-8 w-8" />
      </div>
      <h2 className="mt-6 text-2xl font-semibold text-white">Notifications</h2>
      <p className="mt-2 max-w-[380px] text-sm text-slate-400">
        Stay updated with real-time alerts for new messages, incoming calls, and
        connection requests. Never miss what matters.
      </p>

      <div className="mt-10 w-full max-w-[460px] space-y-3 text-left">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Types of notifications
        </h3>
        {[
          {
            icon: MessageSquare,
            color: "text-sky-400",
            title: "Messages",
            desc: "Get notified instantly when someone sends you a new message.",
          },
          {
            icon: Phone,
            color: "text-indigo-400",
            title: "Calls",
            desc: "Receive alerts for incoming voice and video calls before they connect.",
          },
          {
            icon: UserPlus,
            color: "text-amber-400",
            title: "Connection requests",
            desc: "Know when someone wants to connect with you or accepts your request.",
          },
          {
            icon: Users,
            color: "text-emerald-400",
            title: "Online status",
            desc: "See which of your contacts come online so you can reach them.",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="flex items-start gap-3 rounded-[14px] border border-white/10 bg-white/[0.03] px-4 py-3"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5">
              <item.icon className={`h-4 w-4 ${item.color}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-white">{item.title}</p>
              <p className="mt-0.5 text-xs text-slate-400">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 w-full max-w-[460px] rounded-[16px] border border-dashed border-white/10 bg-white/[0.02] px-6 py-6">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-amber-400" />
          <div className="text-left">
            <p className="text-sm font-medium text-white">Smart notifications</p>
            <p className="mt-0.5 text-xs text-slate-400">
              Chattiko groups and prioritizes notifications so you only see
              what&apos;s important. Missed notifications are summarized
              automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
