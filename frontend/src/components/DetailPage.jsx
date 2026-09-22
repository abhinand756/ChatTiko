import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

// Renders the right-hand detail column inline on desktop (lg+). On mobile it
// becomes a full-height "inner page" that slides in from the right when opened
// and slides back out to the right again when the user goes backwards.
export default function DetailPage({ active = false, className = "", children }) {
  const isMobile = useMediaQuery("(max-width: 1023px)");

  if (!isMobile) {
    return <div className={`flex min-h-0 flex-1 flex-col ${className}`}>{children}</div>;
  }

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "tween", duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
          className={`fixed inset-0 z-[70] flex flex-col bg-[#070a15] ${className}`}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}