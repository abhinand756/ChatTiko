import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, Check, CheckCheck, Clock3 } from "lucide-react";
import { resolveMediaUrl } from "../api/client";

function formatMessageTime(ts) {
  if (!ts) return "Unknown";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "Unknown";
  return d.toLocaleString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MessageInfoModal({ isOpen, onClose, msg }) {
  const open = isOpen && !!msg;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const readBy = msg ? (msg.readBy || []).filter((r) => r !== msg.senderId) : [];
  const reactionUsers = msg?.reactions
    ? typeof msg.reactions.toObject === "function"
      ? Object.fromEntries(msg.reactions.toObject())
      : msg.reactions
    : {};

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          style={{ background: "rgba(4,6,20,0.7)", backdropFilter: "blur(10px)" }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Message info"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[380px] overflow-hidden rounded-[24px] border border-white/10 bg-[#0f1428] text-white shadow-2xl"
          >
            <div className="flex items-center justify-between px-5 pb-3 pt-5">
              <h3 className="text-base font-semibold">Message Info</h3>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto px-5 pb-5">
              {msg.text && (
                <div className="rounded-[14px] border border-white/10 bg-white/5 p-3">
                  <p className="break-words text-sm text-white">{msg.text}</p>
                </div>
              )}
              {msg.imageUrl && (
                <img
                  src={resolveMediaUrl(msg.imageUrl)}
                  alt="message"
                  className="mt-3 max-h-[200px] w-full rounded-[14px] object-cover"
                  loading="lazy"
                />
              )}

              <div className="mt-4 space-y-2.5">
                <div className="flex items-center justify-between rounded-[12px] border border-white/10 bg-white/[0.03] px-4 py-3">
                  <span className="flex items-center gap-2 text-sm text-slate-300">
                    <Check className="h-4 w-4 text-primary" /> Sent
                  </span>
                  <span className="text-xs text-slate-500">
                    {formatMessageTime(msg.createdAt || msg.timestamp)}
                  </span>
                </div>

                {(msg.status === "delivered" || msg.status === "seen") && (
                  <div className="flex items-center justify-between rounded-[12px] border border-white/10 bg-white/[0.03] px-4 py-3">
                    <span className="flex items-center gap-2 text-sm text-slate-300">
                      <CheckCheck className="h-4 w-4 text-primary" /> Delivered
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatMessageTime(msg.deliveredAt || msg.createdAt || msg.timestamp)}
                    </span>
                  </div>
                )}

                {readBy.length > 0 && (
                  <div className="rounded-[12px] border border-white/10 bg-white/[0.03] px-4 py-3">
                    <p className="flex items-center gap-2 text-sm text-slate-300">
                      <CheckCheck className="h-4 w-4 text-blue-400" /> Read by{" "}
                      {readBy.length}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {readBy.map((r) => (
                        <span
                          key={r}
                          className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs capitalize text-slate-300"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {Object.keys(reactionUsers).length > 0 && (
                  <div className="rounded-[12px] border border-white/10 bg-white/[0.03] px-4 py-3">
                    <p className="text-sm text-slate-300">Reactions</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {Object.entries(reactionUsers).map(([emoji, users]) => (
                        <span
                          key={emoji}
                          className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300"
                        >
                          {emoji} {users?.length || 0}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {msg.edited && (
                  <div className="flex items-center gap-2 rounded-[12px] px-4 py-2 text-[11px] text-slate-500">
                    <Clock3 className="h-3.5 w-3.5" /> Edited
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
