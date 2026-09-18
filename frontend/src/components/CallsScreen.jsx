import { useState } from "react";
import {
  Search,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Plus,
  X,
  Trash2,
  Video,
} from "lucide-react";
import LogoSection from "./LogoSection";
import { getCallType, getCallLabel } from "../utils/calls";
import ConfirmationModal from "./ConfirmationModal";

function formatCallTime(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
  });
}

const StatusIcon = ({ type }) => {
  if (type === "outgoing") return <PhoneOutgoing className="h-4 w-4 text-emerald-400" />;
  if (type === "incoming") return <PhoneIncoming className="h-4 w-4 text-emerald-400" />;
  if (type === "outgoing-missed") return <PhoneOutgoing className="h-4 w-4 text-red-400" />;
  if (type === "incoming-missed") return <PhoneIncoming className="h-4 w-4 text-red-400" />;
  return <PhoneMissed className="h-4 w-4 text-slate-400" />;
};

export default function CallsScreen({
  calls,
  onlineUsers,
  userId,
  onStartCall,
  selectedId,
  onSelect,
  onOpenSidebar,
  allUsers = [],
  onClearCalls,
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [showCallPicker, setShowCallPicker] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const filtered = calls.filter((call) => {
    const type = getCallType(call, userId);
    const partner = call.callerId === userId ? call.receiverId : call.callerId;
    const matchesQuery = partner.toLowerCase().includes(query.toLowerCase());
    const matchesFilter =
      filter === "all" || (filter === "missed" && type.includes("missed"));
    return matchesQuery && matchesFilter;
  });

  return (
    <div className="flex h-full flex-col border-r border-white/10 bg-card/40 backdrop-blur-xl">
      <LogoSection onOpenSidebar={onOpenSidebar} />

      <div className="flex items-center gap-3 border-b border-white/10 px-5 pb-3 pt-1">
        <div>
          <h1 className="text-xl font-semibold text-white">Calls</h1>
          <p className="mt-0.5 text-sm text-slate-400">
            Your recent voice &amp; video calls
          </p>
        </div>
        {calls.length > 0 && (
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-[10px] border border-white/10 bg-white/5 text-slate-400 transition hover:bg-red-500/10 hover:text-red-300"
            title="Clear call log"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="px-4 pt-4">
        <div className="flex items-center gap-2 rounded-[10px] border border-white/10 bg-[#0b1220] px-3 py-3 text-slate-300">
          <Search className="h-4 w-4 shrink-0" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search calls..."
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
          />
        </div>

        <div className="mt-3 flex gap-2">
          {[
            { id: "all", label: "All" },
            { id: "missed", label: "Missed" },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${filter === f.id
                ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                : "bg-white/5 text-slate-400 hover:bg-white/10"
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {filtered.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-slate-400">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
              <Phone className="h-7 w-7" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">No calls yet</p>
              <p className="mt-1 max-w-[240px] text-xs">
                {query || filter !== "all"
                  ? "Try a different search or filter."
                  : "Start a call from a chat to see it here."}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-[6px]">
            {filtered.map((call) => {
              const type = getCallType(call, userId);
              const partner =
                call.callerId === userId ? call.receiverId : call.callerId;
              const isOnline = onlineUsers.includes(partner);
              return (
                <button
                  key={call.id}
                  type="button"
                  onClick={() => onSelect?.(call.id)}
                  className={`flex w-full items-center gap-3 rounded-[12px] border px-3 py-3 text-left transition hover:border-primary/50 hover:bg-white/5 ${selectedId === call.id
                    ? "border-primary bg-white/10"
                    : "border-white/5 bg-white/[0.03]"
                    }`}
                >
                  <div className="relative">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                      {partner.charAt(0).toUpperCase()}
                    </div>
                    {isOnline && (
                      <span className="absolute -bottom-0 -right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#090b16]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold capitalize text-white">
                      {partner}
                    </h3>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs capitalize text-slate-400">
                      <StatusIcon type={type} />
                      {getCallLabel(type)}{" "}
                      · {call.callType === "video" ? "Video" : "Voice"} ·{" "}
                      {formatCallTime(call.timestamp || call.createdAt)}
                      {call.duration > 0 && ` · ${Math.floor(call.duration / 60)}m ${call.duration % 60}s`}
                    </p>
                  </div>
                  {onStartCall && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartCall(partner);
                      }}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary transition hover:bg-primary hover:text-white"
                    >
                      {call.callType === "video" ? <Video className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* New call FAB */}
      <div className="pointer-events-none absolute bottom-5 right-5 z-10">
        <button
          type="button"
          onClick={() => setShowCallPicker(true)}
          className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-xl shadow-purple-900/40 transition hover:scale-105 hover:opacity-90"
          title="New call"
        >
          <Phone className="h-6 w-6" />
        </button>
      </div>

      {/* Contact picker */}
      {showCallPicker && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          style={{ background: "rgba(4,6,20,0.8)", backdropFilter: "blur(10px)" }}
          onClick={() => setShowCallPicker(false)}
        >
          <div
            className="w-full max-w-[380px] overflow-hidden rounded-[20px] border border-white/10 bg-[#0f1428] p-4 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold">Start a call</h3>
              <button
                type="button"
                onClick={() => setShowCallPicker(false)}
                className="flex h-8 w-8 items-center justify-center rounded-[10px] text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[320px] space-y-1 overflow-y-auto">
              {allUsers.filter((u) => u.username !== userId).length === 0 && (
                <p className="py-6 text-center text-sm text-slate-500">
                  No contacts available
                </p>
              )}
              {allUsers
                .filter((u) => u.username !== userId)
                .map((u) => {
                  const isOnline = onlineUsers.includes(u.username);
                  return (
                    <button
                      key={u.username}
                      type="button"
                      onClick={() => {
                        onStartCall?.(u.username, "voice");
                        setShowCallPicker(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-[12px] px-3 py-2 text-left transition hover:bg-white/5"
                    >
                      <div className="relative">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-semibold text-white">
                          {(u.displayName || u.username).charAt(0).toUpperCase()}
                        </div>
                        {isOnline && (
                          <span className="absolute -bottom-0 -right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0f1428]" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm capitalize text-white">
                          {u.displayName || u.username}
                        </p>
                        <p className="text-xs text-slate-400">
                          {isOnline ? "Online" : "@" + u.username}
                        </p>
                      </div>
                      <Plus className="ml-auto h-4 w-4 text-primary" />
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Clear call log confirmation */}
      <ConfirmationModal
        isOpen={showClearConfirm}
        title="Clear call logs?"
        message="This will permanently delete your entire call history. This action cannot be undone."
        confirmLabel="Clear"
        cancelLabel="Cancel"
        onClose={() => setShowClearConfirm(false)}
        onConfirm={() => {
          setShowClearConfirm(false);
          onClearCalls?.();
        }}
      />
    </div>
  );
}