import {
  Phone,
  PhoneOutgoing,
  PhoneMissed,
  Video,
  Clock,
  TrendingUp,
  Users,
  MessageSquare,
  ArrowLeft,
} from "lucide-react";

function formatTime(timestamp) {
  if (!timestamp) return "Never";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  const now = new Date();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function formatDuration(secs) {
  if (!secs) return "—";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function CallStats({ calls, userId }) {
  const relevant = calls.filter(
    (c) => c.callerId === userId || c.receiverId === userId,
  );
  const total = relevant.length;
  const outgoing = relevant.filter((c) => c.callerId === userId && !["missed", "canceled"].includes(c.status)).length;
  const missed = relevant.filter((c) => c.status === "missed").length;

  return (
    <div className="grid grid-cols-3 gap-3">
      {[
        { label: "Total calls", value: total, icon: Phone, color: "text-indigo-400" },
        { label: "Outgoing", value: outgoing, icon: PhoneOutgoing, color: "text-emerald-400" },
        { label: "Missed", value: missed, icon: PhoneMissed, color: "text-red-400" },
      ].map((stat) => (
        <div
          key={stat.label}
          className="rounded-[14px] border border-white/10 bg-white/[0.04] px-4 py-4"
        >
          <div className="flex items-center gap-2">
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
            <span className="text-[11px] text-slate-400">{stat.label}</span>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}

export default function CallsDetail({
  selectedId,
  calls,
  onlineUsers,
  userId,
  onStartCall,
  onOpenChat,
  onBack,
}) {
  const currentUserCalls = calls.filter(
    (c) => c.callerId === userId || c.receiverId === userId,
  );

  const selectedCall = currentUserCalls.find((c) => c.id === selectedId);

  if (selectedCall) {
    const partner =
      selectedCall.callerId === userId
        ? selectedCall.receiverId
        : selectedCall.callerId;
    const isOnline = onlineUsers.includes(partner);
    const partnerCalls = currentUserCalls.filter((c) =>
      [c.callerId, c.receiverId].includes(partner),
    );
    const mostRecent = partnerCalls[0]; // already sorted desc

    return (
      <div className="flex flex-1 flex-col items-center justify-center px-10 py-8">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-1.5 rounded-[12px] border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 transition hover:bg-white/10 lg:hidden"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-4xl font-bold text-white shadow-xl shadow-purple-900/30">
          {partner.charAt(0).toUpperCase()}
        </div>
        <h2 className="mt-5 text-2xl font-semibold capitalize text-white">
          {partner}
        </h2>
        <p className="mt-1 flex items-center gap-2 text-sm text-slate-400">
          <span
            className={`h-2 w-2 rounded-full ${
              isOnline ? "bg-emerald-400" : "bg-slate-500"
            }`}
          />
          {isOnline ? "Online" : "Offline"}
        </p>

        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={() => onStartCall?.(partner, "voice")}
            className="flex items-center gap-2.5 rounded-[14px] bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-purple-900/30 transition hover:opacity-90"
          >
            <Phone className="h-4 w-4" />
            Voice Call
          </button>
          <button
            type="button"
            onClick={() => onStartCall?.(partner, "video")}
            className="flex items-center gap-2.5 rounded-[14px] border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10"
          >
            <Video className="h-4 w-4" />
            Video Call
          </button>
        </div>

        <div className="mt-8 w-full max-w-[420px] space-y-4">
          <div className="rounded-[14px] border border-white/10 bg-white/[0.04] px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5">
                <Clock className="h-5 w-5 text-slate-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Last call</p>
                <p className="text-xs text-slate-400">
                  {formatTime(mostRecent?.timestamp || mostRecent?.createdAt)}
                  {mostRecent?.duration > 0 &&
                    ` · ${formatDuration(mostRecent.duration)}`}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-[14px] border border-white/10 bg-white/[0.04] px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5">
                <MessageSquare className="h-5 w-5 text-slate-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">
                  {partnerCalls.length} call{partnerCalls.length === 1 ? "" : "s"} together
                </p>
                <p className="text-xs text-slate-400">
                  {mostRecent?.callType === "video" ? "Video" : "Voice"} ·{" "}
                  {mostRecent?.status === "missed"
                    ? "Missed"
                    : mostRecent?.status === "rejected"
                      ? "Rejected"
                      : mostRecent?.status === "canceled"
                        ? "Canceled"
                        : mostRecent?.callerId === userId
                          ? "Outgoing"
                          : "Incoming"}
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChat?.(partner)}
            className="flex w-full items-center justify-center gap-2 rounded-[14px] border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <MessageSquare className="h-4 w-4" />
            Open chat with {partner}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-10 py-8 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-gradient-to-br from-indigo-500/20 to-purple-600/20 text-indigo-400">
        <Phone className="h-8 w-8" />
      </div>
      <h2 className="mt-6 text-2xl font-semibold text-white">Calls</h2>
      <p className="mt-2 max-w-[360px] text-sm text-slate-400">
        Make free voice and video calls to your friends. Select a contact from
        the list to see details, or start a new call right away.
      </p>

      <div className="mt-8 w-full max-w-[460px]">
        <CallStats calls={calls} userId={userId} />
      </div>

      <div className="mt-10 w-full max-w-[460px] space-y-3 text-left">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          How calls work
        </h3>
        {[
          {
            icon: Phone,
            title: "Voice calls",
            desc: "Tap the phone icon on any contact to start a free voice call over the internet.",
          },
          {
            icon: Video,
            title: "Video calls",
            desc: "See your friends face to face. Start a video call from any chat or the calls list.",
          },
          {
            icon: Users,
            title: "Call history",
            desc: "Completed, missed, and rejected calls are saved here with type and duration.",
          },
        ].map((tip) => (
          <div
            key={tip.title}
            className="flex items-start gap-3 rounded-[14px] border border-white/10 bg-white/[0.03] px-4 py-3"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-slate-300">
              <tip.icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">{tip.title}</p>
              <p className="mt-0.5 text-xs text-slate-400">{tip.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {currentUserCalls.length === 0 && (
        <div className="mt-10 w-full max-w-[460px] rounded-[16px] border border-dashed border-white/10 bg-white/[0.02] px-6 py-8 text-center">
          <TrendingUp className="mx-auto h-8 w-8 text-slate-500" />
          <p className="mt-3 text-sm font-medium text-white">No call history</p>
          <p className="mx-auto mt-1 max-w-[280px] text-xs text-slate-400">
            When you make or receive calls, they&apos;ll appear here with
            duration, type, and status details.
          </p>
        </div>
      )}
    </div>
  );
}