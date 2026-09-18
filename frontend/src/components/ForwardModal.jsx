import { useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, Check, Forward, Users } from "lucide-react";

export default function ForwardModal({
  isOpen,
  onClose,
  targets = [],
  onForward,
  sending = false,
}) {
  const [selected, setSelected] = useState([]);
  const [query, setQuery] = useState("");

  if (!isOpen) return null;

  const filtered = targets.filter((t) =>
    t.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const toggle = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        style={{ background: "rgba(4,6,20,0.82)", backdropFilter: "blur(14px)" }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-[420px] overflow-hidden rounded-[26px] border border-white/10 bg-[#0f1428] text-white"
        >
          <div className="flex items-center justify-between px-5 pb-3 pt-5">
            <h3 className="text-lg font-semibold">Forward to</h3>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-5 pb-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search chats..."
              className="w-full rounded-[14px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-primary/60"
            />
          </div>

          <div className="max-h-[320px] overflow-y-auto px-3 pb-2">
            {filtered.length === 0 && (
              <div className="p-6 text-center text-sm text-slate-500">
                No chats available
              </div>
            )}
            {filtered.map((t) => {
              const isSelected = selected.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggle(t.id)}
                  className={`flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 transition ${
                    isSelected ? "bg-primary/15" : "hover:bg-white/5"
                  }`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                    {t.type === "group" ? (
                      <Users className="h-4 w-4" />
                    ) : (
                      t.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate text-sm font-medium capitalize text-white">
                      {t.name}
                    </p>
                    <p className="text-xs capitalize text-slate-400">{t.type}</p>
                  </div>
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] transition ${
                      isSelected
                        ? "border-primary bg-primary text-white"
                        : "border-white/20 text-transparent"
                    }`}
                  >
                    <Check className="h-3 w-3" />
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 p-4 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[12px] border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={selected.length === 0 || sending}
              onClick={() => {
                if (selected.length > 0) onForward(selected);
              }}
              className="flex items-center gap-2 rounded-[12px] bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-900/25 transition hover:opacity-90 disabled:opacity-40"
            >
              <Forward className="h-4 w-4" />
              {sending ? "Forwarding..." : "Forward"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}