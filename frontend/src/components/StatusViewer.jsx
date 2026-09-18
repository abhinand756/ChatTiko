import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { resolveMediaUrl } from "../api/client";

const TICK_MS = 45;

export default function StatusViewer({
  isOpen,
  onClose,
  groups = [],
  startOwnerId,
  startItemIndex = 0,
  userId,
  onlineUsers = [],
  onReact,
  onDelete,
}) {
  // Position is shared across every user's statuses so we can walk
  // between contacts with next/previous, not just between a single
  // person's updates. The component is remounted (via a changing key)
  // each time the viewer opens, so this initializer is always fresh.
  const [pos, setPos] = useState(() => {
    const idx = groups.findIndex(
      (g) => String(g.userId) === String(startOwnerId),
    );
    return {
      ownerIndex: idx >= 0 ? idx : 0,
      itemIndex: startItemIndex >= 0 ? startItemIndex : 0,
      progress: 0,
    };
  });
  const posRef = useRef(pos);
  const groupsRef = useRef(groups);
  const onCloseRef = useRef(onClose);
  const onReactRef = useRef(onReact);
  const onDeleteRef = useRef(onDelete);

  useEffect(() => {
    groupsRef.current = groups;
  }, [groups]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    onReactRef.current = onReact;
  }, [onReact]);

  useEffect(() => {
    onDeleteRef.current = onDelete;
  }, [onDelete]);

  useEffect(() => {
    posRef.current = pos;
  }, [pos]);

  // If a status (or owner) disappears while we're watching — e.g. after a
  // delete — step to the closest remaining update instead of stalling.
  useEffect(() => {
    if (!isOpen || groups.length === 0) return;
    setPos((prev) => {
      let ownerIndex = prev.ownerIndex;
      if (ownerIndex >= groups.length) ownerIndex = Math.max(0, groups.length - 1);
      const list = groups[ownerIndex]?.list || [];
      if (list.length === 0) {
        const nextOwnerIdx = groups.findIndex((g) => g.list.length > 0);
        if (nextOwnerIdx >= 0) {
          return { ownerIndex: nextOwnerIdx, itemIndex: 0, progress: 0 };
        }
        setTimeout(() => onCloseRef.current(), 0);
        return { ...prev, ownerIndex };
      }
      if (prev.itemIndex >= list.length) {
        return {
          ownerIndex,
          itemIndex: list.length - 1,
          progress: prev.progress,
        };
      }
      return prev;
    });
  }, [groups, isOpen]);

  // Auto-advance playback: item -> item, then owner -> owner, then close.
  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      setPos((prev) => {
        const g = groupsRef.current;
        const list = g[prev.ownerIndex]?.list || [];
        const next = prev.progress + 1;
        if (next < 100) return { ...prev, progress: next };
        if (prev.itemIndex < list.length - 1) {
          return { ...prev, itemIndex: prev.itemIndex + 1, progress: 0 };
        }
        if (prev.ownerIndex < g.length - 1) {
          return { ownerIndex: prev.ownerIndex + 1, itemIndex: 0, progress: 0 };
        }
        setTimeout(() => onCloseRef.current(), 60);
        return { ...prev, progress: 100 };
      });
    }, TICK_MS);

    return () => clearInterval(timer);
  }, [isOpen]);

  const goNext = useCallback(() => {
    const g = groupsRef.current;
    const prev = posRef.current;
    const list = g[prev.ownerIndex]?.list || [];
    if (prev.itemIndex < list.length - 1) {
      setPos({ ...prev, itemIndex: prev.itemIndex + 1, progress: 0 });
    } else if (prev.ownerIndex < g.length - 1) {
      setPos({ ownerIndex: prev.ownerIndex + 1, itemIndex: 0, progress: 0 });
    } else {
      onCloseRef.current();
    }
  }, []);

  const goPrev = useCallback(() => {
    const g = groupsRef.current;
    const prev = posRef.current;
    if (prev.itemIndex > 0) {
      setPos({ ...prev, itemIndex: prev.itemIndex - 1, progress: 0 });
    } else if (prev.ownerIndex > 0) {
      const prevOwnerList = g[prev.ownerIndex - 1]?.list || [];
      setPos({
        ownerIndex: prev.ownerIndex - 1,
        itemIndex: prevOwnerList.length - 1,
        progress: 0,
      });
    }
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, goNext, goPrev]);

  const currentGroup = groups[pos.ownerIndex];
  const current = currentGroup?.list[pos.itemIndex];

  // Record a view once per status item.
  useEffect(() => {
    if (current && isOpen && !current.viewers?.includes(userId)) {
      onReactRef.current?.(current.id, "__view__");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, isOpen]);

  if (!isOpen || !current) return null;

  const isMine = String(current.userId) === String(userId);
  const isText = current.mediaType === "text";
  const isOnline = onlineUsers.includes(currentGroup.userId);
  const displayName = currentGroup.name || current.userId;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] flex items-center justify-center bg-black/95"
        style={{ backdropFilter: "blur(8px)" }}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="relative flex h-full max-h-[min(92vh,760px)] w-full max-w-[420px] flex-col overflow-hidden rounded-[20px] border border-white/10"
          style={{
            background: isText
              ? `linear-gradient(135deg, ${current.background || "#7c3aed"}, ${current.background || "#7c3aed"}cc)`
              : "#0a0e1a",
          }}
        >
          {/* Progress bars */}
          <div className="absolute inset-x-0 top-0 z-20 flex gap-1.5 p-3">
            {(currentGroup.list || []).map((s, i) => (
              <div
                key={s.id}
                className="h-1 flex-1 overflow-hidden rounded-full bg-white/20"
              >
                <div
                  className="h-full rounded-full bg-white"
                  style={{
                    width:
                      i < pos.itemIndex
                        ? "100%"
                        : i === pos.itemIndex
                          ? `${pos.progress}%`
                          : "0%",
                    transition: `width ${TICK_MS}ms linear`,
                  }}
                />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="absolute inset-x-0 top-0 z-20 flex items-center gap-3 p-3 pt-6">
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white">
                {currentGroup.avatar ? (
                  <img
                    src={resolveMediaUrl(currentGroup.avatar)}
                    alt={displayName}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  displayName.charAt(0).toUpperCase()
                )}
              </div>
              {isOnline && (
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0a0e1a]" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold capitalize text-white">
                {displayName}
              </p>
              <p className="text-[11px] text-white/70">
                {new Date(current.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </p>
            </div>
            {isMine && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteRef.current?.(current.id);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-red-500/30"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/25"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tap zones: left = previous, right = next */}
          <button
            type="button"
            aria-label="Previous"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            className="absolute inset-y-0 left-0 z-10 w-1/3 opacity-0"
          />
          <button
            type="button"
            aria-label="Next"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
            className="absolute inset-y-0 right-0 z-10 w-1/3 opacity-0"
          />

          {/* Visible previous / next controls */}
          <div className="absolute inset-x-0 top-1/2 z-20 flex -translate-y-1/2 items-center justify-between px-2 pointer-events-none">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white opacity-70 backdrop-blur-md transition hover:bg-black/60 hover:opacity-100"
              title="Previous"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white opacity-70 backdrop-blur-md transition hover:bg-black/60 hover:opacity-100"
              title="Next"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex flex-1 items-center justify-center overflow-hidden p-6">
            {isText ? (
              <motion.p
                key={current.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-h-full overflow-hidden text-center text-2xl font-medium leading-relaxed break-words"
                style={{ color: current.fontColor || "#ffffff" }}
              >
                {current.text}
              </motion.p>
            ) : (
              <img
                src={resolveMediaUrl(current.mediaUrl)}
                alt="status"
                className="max-h-full max-w-full rounded-[14px] object-contain"
                draggable={false}
              />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}