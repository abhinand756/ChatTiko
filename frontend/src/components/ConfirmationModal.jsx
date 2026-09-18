import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export default function ConfirmationModal({
  isOpen,
  title,
  message,
  onClose,
  onConfirm,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmVariant = "danger",
}) {
  const isDanger = confirmVariant === "danger";

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: "rgba(22, 24, 33, 0.43)", backdropFilter: "blur(10px)" }}
        >
          <motion.div
            key="modal-card"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[360px] overflow-hidden rounded-[28px] text-white"
            style={{
              background: "linear-gradient(160deg, #13172e 0%, #0d1028 100%)",
              boxShadow: isDanger
                ? "0 0 0 1px rgba(244,63,94,0.18), 0 40px 80px -16px rgba(0,0,0,0.95), inset 0 1px 0 rgba(255,255,255,0.05)"
                : "0 0 0 1px rgba(99,102,241,0.2), 0 40px 80px -16px rgba(0,0,0,0.95), inset 0 1px 0 rgba(255,255,255,0.05)",
            }}
          >
            {/* Top accent glow bar */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-3/4"
              style={{
                background: isDanger
                  ? "linear-gradient(90deg, transparent, rgba(244,63,94,0.6), transparent)"
                  : "linear-gradient(90deg, transparent, rgba(99,102,241,0.6), transparent)",
              }}
            />

            <div className="flex flex-col items-center px-7 pb-7 pt-8 text-center">
              {/* Icon with glow */}
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.08 }}
                className="relative mb-5 flex h-[72px] w-[72px] items-center justify-center rounded-[22px]"
                style={{
                  background: isDanger
                    ? "linear-gradient(135deg, rgba(244,63,94,0.2) 0%, rgba(239,68,68,0.08) 100%)"
                    : "linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(168,85,247,0.08) 100%)",
                  border: isDanger
                    ? "1px solid rgba(244,63,94,0.25)"
                    : "1px solid rgba(99,102,241,0.25)",
                  boxShadow: isDanger
                    ? "0 0 28px rgba(244,63,94,0.18), inset 0 1px 0 rgba(255,255,255,0.06)"
                    : "0 0 28px rgba(99,102,241,0.18), inset 0 1px 0 rgba(255,255,255,0.06)",
                }}
              >
                {isDanger ? (
                  <AlertTriangle className="h-8 w-8 text-rose-400" strokeWidth={1.75} />
                ) : (
                  <CheckCircle2 className="h-8 w-8 text-indigo-400" strokeWidth={1.75} />
                )}
              </motion.div>

              {/* Title */}
              <motion.h3
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
                className="text-[18px] font-semibold tracking-tight text-white"
              >
                {title}
              </motion.h3>

              {/* Message */}
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.16 }}
                className="mt-2.5 text-[13.5px] leading-relaxed text-slate-400"
              >
                {message}
              </motion.div>

              {/* Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-7 flex w-full flex-col gap-2.5"
              >
                <button
                  type="button"
                  onClick={onConfirm}
                  className="w-full rounded-[14px] py-3 text-[14px] font-semibold text-white transition-all duration-150 active:scale-[0.97]"
                  style={{
                    background: isDanger
                      ? "linear-gradient(135deg, #f43f5e, #dc2626)"
                      : "linear-gradient(135deg, #6366f1, #9333ea)",
                    boxShadow: isDanger
                      ? "0 4px 20px rgba(244,63,94,0.35)"
                      : "0 4px 20px rgba(99,102,241,0.35)",
                  }}
                >
                  {confirmLabel}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full rounded-[14px] border border-white/10 bg-white/5 py-3 text-[14px] font-medium text-slate-300 transition-all duration-150 hover:bg-white/10 hover:text-white active:scale-[0.97]"
                >
                  {cancelLabel}
                </button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
