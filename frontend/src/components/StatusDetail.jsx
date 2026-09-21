import { useMemo } from "react";
import {
  ArrowLeft,
  Phone,
  MessageSquare,
  Camera,
  Eye,
  Smile,
  Layers,
  Play,
  CheckCheck,
  ChevronRight,
} from "lucide-react";
import { resolveMediaUrl } from "../api/client";

function formatWhen(ts) {
  if (!ts) return "";
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(mins, 0)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const Stat = ({ icon: Icon, label, value, color }) => (
  <div className="flex flex-col items-center rounded-[14px] border border-white/10 bg-white/[0.04] px-3 py-4">
    <div className="flex items-center gap-1.5">
      <Icon className={`h-3.5 w-3.5 ${color || "text-slate-400"}`} />
      <span className="text-[11px] text-slate-400">{label}</span>
    </div>
    <p className="mt-2 text-2xl font-bold text-white">{value}</p>
  </div>
);

export default function StatusDetail({
  group,
  userId,
  allUsers = [],
  onlineUsers = [],
  onViewStatus,
  onStartCall,
  onOpenChat,
  onBack,
}) {
  const ownerId = group.userId;
  const list = useMemo(() => group.list || [], [group]);

  const info = useMemo(() => {
    if (ownerId === userId) return { name: "My status", isMe: true, avatar: "" };
    const u = allUsers.find((x) => x.username === ownerId);
    return {
      name: u?.displayName || u?.username || ownerId,
      avatar: u?.avatar || "",
      isMe: false,
    };
  }, [ownerId, userId, allUsers]);

  const isOnline = onlineUsers.includes(ownerId);
  const unviewed = group.viewed === false;
  const lastUpd = list[list.length - 1];
  const showDetails = info.isMe;

  const stats = useMemo(() => {
    const viewerSet = new Set();
    let reactions = 0;
    list.forEach((s) => {
      (s.viewers || []).forEach((v) => viewerSet.add(v));
      Object.values(s.reactions || {}).forEach((users) => {
        reactions += (users || []).length;
      });
    });
    return { views: viewerSet.size, viewers: [...viewerSet], reactions };
  }, [list]);

  const initial = (info.name || ownerId || "?").charAt(0).toUpperCase();

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <button
        type="button"
        onClick={onBack}
        className="mb-2 mt-3 ml-3 inline-flex w-fit items-center gap-1.5 rounded-[12px] border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 transition hover:bg-white/10 lg:hidden"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>

      <div className="flex flex-col items-center px-6 py-6 text-center">
        <div
          className={`rounded-full p-[4px] ${unviewed
            ? "bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500"
            : "bg-white/20"
            }`}
        >
          {info.avatar ? (
            <img
              src={resolveMediaUrl(info.avatar)}
              alt={info.name}
              className="h-24 w-24 rounded-full border-4 border-[#070a15] object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-[#070a15] bg-[#141a33] text-4xl font-bold text-white">
              {initial}
            </div>
          )}
        </div>
        <h2 className="mt-4 text-xl font-semibold capitalize text-white">
          {info.name}
        </h2>
        <p className="mt-1 flex items-center gap-2 text-xs text-slate-400">
          <span
            className={`h-2 w-2 rounded-full ${isOnline ? "bg-emerald-400" : "bg-slate-500"
              }`}
          />
          {isOnline ? "Online now" : "Offline"}
          {list.length > 0 && ` · ${formatWhen(lastUpd?.createdAt)}`}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            disabled={list.length === 0}
            onClick={() => onViewStatus?.(0)}
            className="flex items-center gap-2.5 rounded-[14px] bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-purple-900/30 transition hover:opacity-90 disabled:opacity-40"
          >
            <Play className="h-4 w-4" />
            View updates{list.length > 1 ? ` (${list.length})` : ""}
          </button>
          {!info.isMe && (
            <button
              type="button"
              onClick={() => onStartCall?.(ownerId, "voice")}
              className="flex items-center gap-2.5 rounded-[14px] border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10"
            >
              <Phone className="h-4 w-4" />
              Call
            </button>
          )}
        </div>
      </div>

      {/* Stats (owner only) */}
      {showDetails && (
        <div className="grid grid-cols-3 gap-3 px-6">
          <Stat
            icon={Layers}
            label="Updates"
            value={list.length}
            color="text-indigo-400"
          />
          <Stat
            icon={Eye}
            label="Views"
            value={stats.views}
            color="text-emerald-400"
          />
          <Stat
            icon={Smile}
            label="Reactions"
            value={stats.reactions}
            color="text-rose-400"
          />
        </div>
      )}

      {/* Updates list */}
      {list.length > 0 && (
        <div className="mt-6 px-6">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Updates
          </h3>
          <div className="mt-2 space-y-1.5">
            {list.map((s, i) => {
              const isText = s.mediaType === "text";
              const seenByMe = s.viewers?.includes(userId);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onViewStatus?.(i)}
                  className="flex w-full items-center gap-3 rounded-[14px] border border-white/5 bg-white/[0.03] px-4 py-3 text-left transition hover:border-primary/40 hover:bg-white/[0.06]"
                >
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[12px] text-white"
                    style={{
                      background: isText
                        ? `linear-gradient(135deg, ${s.background || "#7c3aed"}, ${s.background || "#7c3aed"}aa)`
                        : "#0f1428",
                    }}
                  >
                    {isText ? (
                      <Camera className="h-5 w-5" />
                    ) : (
                      <img
                        src={resolveMediaUrl(s.mediaUrl)}
                        alt="status"
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium capitalize text-white">
                      {isText ? s.text || "Text update" : "Photo update"}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
                      {formatWhen(s.createdAt)}
                      {showDetails && (
                        <>
                          <span>·</span>
                          <span>{`${(s.viewers || []).length} view${(s.viewers || []).length === 1 ? "" : "s"
                            }`}</span>
                        </>
                      )}
                    </p>
                  </div>
                  {showDetails ? (
                    seenByMe ? (
                      <CheckCheck className="h-4 w-4 shrink-0 text-emerald-400" />
                    ) : (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-gradient-to-r from-indigo-400 to-pink-400" />
                    )
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {list.length === 0 && (
        <div className="mx-6 mt-6 rounded-[16px] border border-dashed border-white/10 bg-white/[0.02] px-6 py-8 text-center">
          <Camera className="mx-auto h-8 w-8 text-slate-500" />
          <p className="mt-3 text-sm font-medium text-white">
            No active updates
          </p>
          <p className="mx-auto mt-1 max-w-[240px] text-xs text-slate-400">
            This contact&apos;s updates have expired or are unavailable.
          </p>
        </div>
      )}

      {/* Viewers (owner only) */}
      {showDetails && stats.viewers.length > 0 && (
        <div className="mt-6 px-6 pb-8">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {stats.viewers.filter((v) => v !== userId).length} viewer
            {stats.viewers.filter((v) => v !== userId).length === 1 ? "" : "s"}
          </h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {stats.viewers.filter((v) => v !== userId).map((v) => {
              const viewer = allUsers.find((x) => x.username === v);
              const name = viewer?.displayName || v;
              return (
                <div
                  key={v}
                  className="flex items-center gap-2 rounded-full border border-white/5 bg-white/[0.03] py-1 pr-3 pl-1"
                >
                  {viewer?.avatar ? (
                    <img
                      src={resolveMediaUrl(viewer.avatar)}
                      alt={name}
                      className="h-6 w-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-[10px] font-semibold text-white">
                      {name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs capitalize text-slate-300">
                    {v === userId ? `${name} (You)` : name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Open chat */}
      {!info.isMe && (
        <div className="mt-2 px-8 pb-10">
          <button
            type="button"
            onClick={() => onOpenChat?.(ownerId)}
            className="flex w-full items-center justify-center gap-2 rounded-[14px] border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <MessageSquare className="h-4 w-4" />
            Open chat with {info.name}
          </button>
        </div>
      )}
    </div>
  );
}