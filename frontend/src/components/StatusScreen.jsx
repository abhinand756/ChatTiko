import { useMemo } from "react";
import { Plus, User, Camera, Menu } from "lucide-react";
import { resolveMediaUrl } from "../api/client";
import LogoSection from "./LogoSection";

function timeAgo(ts) {
  if (!ts) return "";
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function StatusScreen({
  statuses = [],
  myStatuses = [],
  onlineUsers = [],
  allUsers = [],
  userId,
  selectedUserId,
  onSelect,
  onCreateStatus,
  onOpenSidebar,
}) {
  const grouped = useMemo(() => {
    const map = new Map();
    statuses.forEach((s) => {
      const list = map.get(s.userId) || [];
      list.push(s);
      map.set(s.userId, list);
    });
    return [...map.entries()]
      .map(([user, list]) => {
        list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        const isViewed = list.every((s) => s.viewers?.includes(userId));
        return { userId: user, list, last: list[list.length - 1], viewed: isViewed };
      })
      .sort(
        (a, b) =>
          new Date(a.last.createdAt).getTime() - new Date(b.last.createdAt).getTime(),
      );
  }, [statuses, userId]);

  const recent = grouped.filter((g) => !g.viewed);
  const seen = grouped.filter((g) => g.viewed);

  const getUser = (id) => {
    if (id === userId) {
      return { name: "My status", isMe: true };
    }
    const u = allUsers.find((x) => x.username === id);
    return { name: u?.displayName || u?.username || id, avatar: u?.avatar || "" };
  };

  const renderStatusTile = (group) => {
    const info = getUser(group.userId);
    const isOnline = onlineUsers.includes(group.userId);
    return (
      <button
        key={group.userId}
        type="button"
        onClick={() => onSelect?.(group.userId)}
        className={`flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left transition hover:bg-white/5 ${selectedUserId === group.userId ? "bg-white/5" : ""
          }`}
      >
        <div className="relative">
          <div
            className={`rounded-full p-[3px] ${group.viewed
              ? "bg-white/20"
              : "bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500"
              }`}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#141a33] text-white">
              {info.avatar ? (
                <img
                  src={resolveMediaUrl(info.avatar)}
                  alt={info.name}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <User className="h-5 w-5" />
              )}
            </div>
          </div>
          {isOnline && (
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-card" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium capitalize text-white">{info.name}</p>
          <p className="text-xs capitalize text-slate-400">
            {group.list.length} update{group.list.length > 1 ? "s" : ""} ·{" "}
            {timeAgo(group.last.createdAt)}
          </p>
        </div>
      </button>
    );
  };

  return (
    <div className="flex h-full flex-col border-r border-white/10 bg-card/40 backdrop-blur-xl">
      <LogoSection onOpenSidebar={onOpenSidebar} />

      <div className="flex items-center justify-between px-4 pb-3 pt-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenSidebar}
            className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] bg-white/5 text-white transition hover:bg-white/10 lg:hidden"
            title="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-white">Updates</h2>
            <p className="mt-0.5 text-sm text-slate-400">
              Latest status updates from your friends
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCreateStatus}
            className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-purple-900/30 transition hover:opacity-90"
            title="New status"
          >
            <Camera className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-4 pb-6 pt-3">
        {/* My status */}
        <div>
          <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            My status
          </p>
          <div
            role="button"
            tabIndex={0}
            onClick={() =>
              myStatuses.length > 0
                ? onSelect?.(userId)
                : onCreateStatus?.()
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                myStatuses.length > 0
                  ? onSelect?.(userId)
                  : onCreateStatus?.();
              }
            }}
            className={`flex w-full cursor-pointer items-center gap-3 rounded-[14px] px-3 py-2.5 text-left transition hover:bg-white/5 ${selectedUserId === userId ? "bg-white/5" : ""
              }`}
          >
            <div className="relative">
              <div
                className={`rounded-full p-[3px] ${myStatuses.length > 0
                  ? "bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500"
                  : "bg-white/20"
                  }`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#141a33] text-white">
                  <User className="h-5 w-5" />
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateStatus?.();
                }}
                className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white ring-2 ring-card transition hover:scale-110"
                title="Add status update"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white">
                {myStatuses.length > 0 ? `My status (${myStatuses.length})` : "My status"}
              </p>
              <p className="text-xs text-slate-400">
                {myStatuses.length > 0
                  ? myStatuses.some(
                    (s) => !s.viewers?.includes(userId) && s.userId === userId,
                  )
                    ? "Tap to view"
                    : `View · ${timeAgo(myStatuses[0].createdAt)}`
                  : "Tap to add status update"}
              </p>
            </div>
          </div>
        </div>

        {/* Recent updates */}
        {recent.length > 0 && (
          <div>
            <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Recent updates
            </p>
            <div className="space-y-1 rounded-[16px] border border-white/5 bg-white/[0.02] p-1.5">
              {recent.map(renderStatusTile)}
            </div>
          </div>
        )}

        {/* Viewed updates */}
        {seen.length > 0 && (
          <div>
            <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Viewed updates
            </p>
            <div className="space-y-1 rounded-[16px] border border-white/5 bg-white/[0.02] p-1.5">
              {seen.map(renderStatusTile)}
            </div>
          </div>
        )}

        {recent.length === 0 && seen.length === 0 && (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[22px] bg-white/5 text-slate-500">
              <Camera className="h-7 w-7" />
            </div>
            <p className="text-sm font-medium text-white">No status updates yet</p>
            <p className="mx-auto mt-1 max-w-[260px] text-xs text-slate-400">
              When your contacts add status updates, they'll appear here. Updates
              disappear after 24 hours.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}