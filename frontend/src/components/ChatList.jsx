import { useMemo, useState } from "react";
import { Search, Users, Plus, Pin, BellOff } from "lucide-react";

function formatChatTimestamp(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;

  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else if (isYesterday) {
    return "Yesterday";
  } else {
    return date.toLocaleDateString([], {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  }
}

const FILTERS = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "groups", label: "Groups" },
];

export default function ChatList({
  chats,
  groups = [],
  selectedChat,
  onSelect,
  onlineUsers = [],
  onCreateGroup,
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const items = useMemo(() => {
    const direct = chats.map((c) => ({
      id: c.id,
      name: c.id === chats.find((x) => x.id === c.id)?.id ? c.name : c.name,
      preview: c.preview,
      timestamp: c.timestamp,
      unreadCount: c.unreadCount || 0,
      pinned: !!c.pinned,
      muted: !!c.muted,
      type: c.id.toLowerCase() === (c.id?.toLowerCase() || "") && c.pinned === undefined
        ? (c.type || "user")
        : (c.type || "user"),
    }));

    const groupItems = (groups || []).map((g) => ({
      id: g.id,
      name: g.name,
      preview:
        g.preview ||
        (g.members?.length > 1
          ? `${g.members.length} members`
          : "Group created"),
      timestamp: g.timestamp,
      unreadCount: g.unreadCount || 0,
      pinned: !!g.pinned,
      muted: !!g.muted,
      type: "group",
    }));

    return [...direct, ...groupItems];
  }, [chats, groups]);

  const filtered = useMemo(() => {
    let list = items;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          c.preview?.toLowerCase().includes(q),
      );
    }
    if (filter === "groups") {
      list = list.filter((c) => c.type === "group");
    } else if (filter === "unread") {
      list = list.filter((c) => c.unreadCount > 0);
    }
    return list;
  }, [items, query, filter]);

  const pinned = filtered.filter((c) => c.pinned);
  const rest = filtered.filter((c) => !c.pinned);

  const renderItem = (chat, keySuffix = "") => (
    <button
      key={`${chat.type}-${chat.id}${keySuffix}`}
      onClick={() => onSelect(chat.id)}
      className={`w-full rounded-[12px] border px-3 py-3 text-left transition hover:border-primary/50 hover:bg-white/5 ${
        selectedChat === chat.id
          ? "border-primary bg-white/10"
          : "border-white/5"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
            {chat.type === "group" ? (
              <Users className="h-4.5 w-4.5" size={18} />
            ) : (
              chat.name?.charAt(0)?.toUpperCase() || "?"
            )}
          </div>
          {chat.type !== "group" && onlineUsers.includes(chat.id) && (
            <span className="absolute -bottom-0 -right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#090b16]" />
          )}
        </div>
        <div className="relative min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <h3 className="truncate text-sm font-semibold capitalize text-white">
                {chat.name}
              </h3>
              {chat.pinned && (
                <Pin className="h-3 w-3 shrink-0 text-amber-400" />
              )}
              {chat.muted && (
                <BellOff className="h-3 w-3 shrink-0 text-slate-400" />
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {chat.unreadCount > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-white">
                  {chat.unreadCount}
                </span>
              )}
              <span className="whitespace-nowrap text-[11px] text-slate-500">
                {formatChatTimestamp(chat.timestamp)}
              </span>
            </div>
          </div>
          <p
            className={`mt-1 truncate text-sm ${chat.unreadCount > 0 ? "font-semibold text-white" : "text-slate-400"}`}
          >
            {chat.preview?.startsWith("[Draft]:") ? (
              <>
                <span className="text-red-400 font-medium">[Draft]:</span>
                {chat.preview.substring(8)}
              </>
            ) : (
              chat.preview
            )}
          </p>
        </div>
      </div>
    </button>
  );

  return (
    <div className="flex h-full flex-col bg-card/40 backdrop-blur-xl">
      <div className="flex items-center gap-2 p-4 pb-2">
        <div className="flex flex-1 items-center gap-2 rounded-[12px] border border-white/10 bg-[#0b1220] px-3 py-3 text-slate-300">
          <Search className="h-4 w-4" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats..."
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
          />
        </div>
        <button
          type="button"
          onClick={onCreateGroup}
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[12px] border border-white/10 bg-white/5 text-slate-300 transition hover:bg-primary/20 hover:text-white"
          title="New group"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex gap-1.5 px-4 pb-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium capitalize transition ${
              filter === f.id
                ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-purple-900/25"
                : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-[6px] overflow-y-auto px-4 pb-24 pt-2">
        {query.trim() && filtered.length === 0 && (
          <div className="py-8 text-center text-sm text-slate-500">
            No results for "{query}"
          </div>
        )}

        {filtered.length === 0 && !query.trim() && (
          <div className="py-8 text-center">
            <p className="text-sm text-slate-400">No chats yet</p>
            <p className="mt-1 text-xs text-slate-500">
              Start texting with a friend from the People tab
            </p>
          </div>
        )}

        {pinned.length > 0 && (
          <div className="mb-1">
            <div className="mb-1 flex items-center gap-1 px-1 pt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <Pin className="h-3 w-3" /> Pinned
            </div>
            {pinned.map(renderItem)}
          </div>
        )}

        {pinned.length > 0 && rest.length > 0 && (
          <div className="px-0 pb-1 pt-1" />
        )}

        {rest.map((c) => renderItem(c, "-r"))}
      </div>

      {/* New chat FAB */}
      {!query.trim() && (
        <div className="pointer-events-none absolute right-4 bottom-5 z-10">
          <button
            type="button"
            onClick={onCreateGroup}
            className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-xl shadow-purple-900/40 transition hover:scale-105 hover:opacity-90"
            title="New group"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>
      )}
    </div>
  );
}