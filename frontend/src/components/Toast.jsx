import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
} from "lucide-react";
import { registerToastHandlers } from "../utils/toast";

const VARIANTS = {
  success: {
    Icon: CheckCircle2,
    ring: "border-emerald-400/25",
    glow: "0 0 24px rgba(52,211,153,0.18)",
    icon: "text-emerald-300",
  },
  error: {
    Icon: AlertTriangle,
    ring: "border-rose-400/25",
    glow: "0 0 24px rgba(244,63,94,0.18)",
    icon: "text-rose-300",
  },
  info: {
    Icon: Info,
    ring: "border-indigo-400/25",
    glow: "0 0 24px rgba(99,102,241,0.18)",
    icon: "text-indigo-300",
  },
};

export default function ToastHost() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const push = (toast) => {
      setToasts((prev) => [...prev.slice(-2), toast]);
    };

    const pop = (id) => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    registerToastHandlers(push, pop);

    return () => {
      registerToastHandlers(null, null);
    };
  }, []);

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[100] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:bottom-auto sm:right-6 sm:top-6 sm:items-end">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const variant =
            VARIANTS[toast.variant] || VARIANTS.info;

          const { Icon } = variant;

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{
                type: "spring",
                stiffness: 420,
                damping: 32,
              }}
              className={`pointer-events-auto flex w-full max-w-[360px] items-start gap-2.5 rounded-[16px] border bg-[#111634]/95 px-4 py-3 text-sm text-slate-100 shadow-2xl backdrop-blur-xl ${variant.ring}`}
              style={{ boxShadow: variant.glow }}
              role="status"
            >
              <Icon
                className={`mt-[1px] h-4 w-4 flex-shrink-0 ${variant.icon}`}
              />

              <p className="flex-1 leading-snug">
                {toast.message}
              </p>

              <button
                type="button"
                onClick={() =>
                  setToasts((prev) => prev.filter((t) => t.id !== toast.id))
                }
                className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-white/10 hover:text-white"
                aria-label="Dismiss"
              >
                <X className="h-3 w-3" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>,
    document.body
  );
}
