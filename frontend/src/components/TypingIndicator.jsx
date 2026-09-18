import { motion } from "framer-motion";

export default function TypingIndicator({ name }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.18 }}
      className="flex justify-start"
    >
      <div className="max-w-[75%] rounded-[14px] bg-white/10 px-4 py-3 sm:max-w-[70%]">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="h-2 w-2 rounded-full bg-slate-300"
                animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
                transition={{
                  duration: 0.9,
                  repeat: Infinity,
                  delay: i * 0.15,
                }}
              />
            ))}
          </div>
          {name && (
            <span className="text-xs capitalize text-slate-400">{name} typing</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}