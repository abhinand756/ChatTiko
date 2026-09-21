import { useState } from "react";
import { Search, UserMinus, MessagesSquare, Ban } from "lucide-react";
import ConfirmationModal from "./ConfirmationModal";
import { resolveMediaUrl } from "../api/client";

function formatLastSeen(lastSeen) {
  if (!lastSeen) return "Offline";
  const date = new Date(lastSeen);
  if (Number.isNaN(date.getTime())) return "Offline";
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return "Last seen just now";
  if (diff < 3_600_000) return `Last seen ${Math.floor(diff / 60_000)}m ago`;
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay
    ? `Last seen at ${time}`
    : `Last seen ${date.toLocaleDateString([], { month: "short", day: "numeric" })}`;
}

function Avatar({ user, size = "h-10 w-10 text-base", isOnline, showPresence = false }) {
  const src = user.avatar ? resolveMediaUrl(user.avatar) : "";
  return (
    <div className="relative flex-shrink-0">
      <div
        className={`${size} flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 font-semibold text-white`}
      >
        {src ? (
          <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          (user.displayName || user.username).charAt(0).toUpperCase()
        )}
      </div>
      {showPresence && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-[#0b1220] ${isOnline ? "bg-emerald-400" : "bg-slate-500"
            }`}
        />
      )}
    </div>
  );
}

export default function UserDirectory({
  users = [],
  onlineUsers = [],
  onSendRequest,
  onAcceptRequest,
  onDeclineRequest,
  onUnfriend,
  onSelect,
  onBlock,
  onUnblock,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [unfriendTarget, setUnfriendTarget] = useState(null);

  const query = searchQuery.trim().toLowerCase();
  const filteredUsers = query
    ? users.filter((user) => {
      const displayName = (user.displayName || "").toLowerCase();
      return (
        user.username.toLowerCase().includes(query) ||
        displayName.includes(query)
      );
    })
    : users;

  const incomingRequests = filteredUsers.filter(
    (user) => user.connectionStatus === "pendingIncoming"
  );

  const friends = filteredUsers.filter(
    (user) => user.connectionStatus === "accepted"
  );

  const remainingUsers = filteredUsers.filter(
    (user) => user.connectionStatus !== "pendingIncoming" && user.connectionStatus !== "accepted"
  );

  const renderUserCard = (user) => {
    const isOnline = onlineUsers.includes(user.username);
    const isConnected = user.connectionStatus === "accepted";
    const isPendingOutgoing = user.connectionStatus === "pendingOutgoing";
    const label = user.displayName || user.username;

    return (
      <div
        key={user.username}
        className="rounded-[12px] border border-white/10 bg-white/5 p-4 text-white transition hover:border-primary/50"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar user={user} isOnline={isOnline} showPresence />
            <div className="min-w-0">
              <h2 className="flex items-center gap-1.5 truncate text-sm font-semibold capitalize">
                {label}
                {user.isBlocked && (
                  <span className="rounded-full bg-rose-500/20 px-2 py-[1px] text-[10px] font-medium text-rose-300">
                    blocked
                  </span>
                )}
              </h2>
              {user.displayName && user.displayName !== user.username && (
                <p className="truncate text-[11px] text-slate-500">@{user.username}</p>
              )}
              <p className="truncate text-xs text-slate-400">
                {isOnline ? "Online" : formatLastSeen(user.lastSeen)}
              </p>
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2">
            {user.isBlocked ? (
              <button
                type="button"
                onClick={() => onUnblock?.(user.username)}
                className="rounded-[10px] border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300 transition hover:bg-emerald-500/20"
              >
                Unblock
              </button>
            ) : isConnected ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onSelect?.(user.username)}
                  className="rounded-[10px] border border-primary/30 bg-primary/10 px-[10px] py-2 text-sm text-primary transition hover:bg-primary/25"
                  title="Message"
                >
                  <MessagesSquare className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setUnfriendTarget(user.username)}
                  className="rounded-[10px] border border-rose-500/20 bg-rose-500/10 px-[10px] py-2 text-sm text-rose-400 transition hover:bg-rose-500/25"
                  title="Unfriend"
                >
                  <UserMinus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onBlock?.(user.username)}
                  className="rounded-[10px] border border-white/10 bg-white/5 px-[10px] py-2 text-sm text-slate-400 transition hover:border-rose-500/25 hover:bg-rose-500/10 hover:text-rose-400"
                  title="Block user"
                >
                  <Ban className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {isPendingOutgoing ?
                  <button
                    type="button"
                    onClick={() => onUnfriend?.(user.username)}
                    className="rounded-[10px] border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:border-rose-500/30 hover:bg-rose-500/20 hover:text-rose-400"
                  >
                    Requested
                  </button> : <button
                    type="button"
                    onClick={() => onSendRequest?.(user.username)}
                    className="rounded-[10px] bg-gradient-to-br from-primary to-purple-600 px-4 py-2 text-sm text-white transition hover:brightness-110"
                  >
                    Connect
                  </button>}
                <button
                  type="button"
                  onClick={() => onBlock?.(user.username)}
                  className="rounded-[10px] border border-white/10 bg-white/5 px-[10px] py-2 text-sm text-slate-400 transition hover:border-rose-500/25 hover:bg-rose-500/10 hover:text-rose-400"
                  title="Block user"
                >
                  <Ban className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="flex h-full flex-col">
        <div className="p-4 pb-0">
          <div className="flex items-center gap-2 rounded-[10px] border border-white/10 bg-[#0b1220] px-3 py-2.5 text-slate-300 transition focus-within:border-primary/50">
            <Search className="h-4 w-4 flex-shrink-0 text-slate-500" />
            <input
              type="search"
              placeholder="Search people..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 pt-3 space-y-6">
          {incomingRequests.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-400 px-1">
                Incoming Requests ({incomingRequests.length})
              </h3>
              <div className="space-y-3">
                {incomingRequests.map((user) => {
                  const isOnline = onlineUsers.includes(user.username);
                  return (
                    <div
                      key={user.username}
                      className="rounded-[12px] border border-indigo-500/20 bg-indigo-500/5 p-4 text-white transition hover:border-indigo-500/40"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-2">
                          <Avatar
                            user={user}
                            size="h-9 w-9 text-sm"
                            isOnline={isOnline}
                            showPresence
                          />
                          <div className="min-w-0">
                            <h2 className="truncate text-sm font-semibold capitalize">
                              {user.displayName || user.username}
                            </h2>
                            <p className="truncate text-[11px] text-slate-400">
                              wants to connect
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onAcceptRequest?.(user.requestId)}
                            className="rounded-[10px] bg-gradient-to-br from-indigo-500 to-purple-600 px-4 py-2 text-sm text-white transition hover:brightness-110 shadow-lg shadow-purple-500/10"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeclineRequest?.(user.requestId)}
                            className="rounded-[10px] border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {(friends.length > 0 || remainingUsers.length > 0) && <div className="border-b border-white/10 my-4" />}
            </div>
          )}

          {friends.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-400 px-1">
                Friends ({friends.length})
              </h3>
              <div className="space-y-3">
                {friends.map(renderUserCard)}
              </div>
              {remainingUsers.length > 0 && <div className="border-b border-white/10 my-4" />}
            </div>
          )}

          <div className="space-y-3">
            {(incomingRequests.length > 0 || friends.length > 0) && remainingUsers.length > 0 && (
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">
                All Users
              </h3>
            )}

            {remainingUsers.length === 0 && friends.length === 0 ? (
              (!query && incomingRequests.length > 0) ? null : (
                <div className="rounded-[16px] border border-white/10 bg-white/5 p-8 text-center text-slate-400">
                  {query ? "No users match your search." : "No other users found."}
                </div>
              )
            ) : remainingUsers.length > 0 ? (
              <div className="space-y-3">
                {remainingUsers.map(renderUserCard)}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={!!unfriendTarget}
        title="Remove Connection"
        message={
          <p className="mt-2 text-sm text-slate-400">
            Are you sure you want to unfriend{" "}
            <span className="text-white font-semibold capitalize">{unfriendTarget}</span>? You will no longer be able to message each other.
          </p>
        }
        confirmLabel="Unfriend"
        confirmVariant="danger"
        onClose={() => setUnfriendTarget(null)}
        onConfirm={() => {
          onUnfriend?.(unfriendTarget);
          setUnfriendTarget(null);
        }}
      />
    </>
  );
}
