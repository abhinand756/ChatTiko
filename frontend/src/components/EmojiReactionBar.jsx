import { motion } from "framer-motion";

export default function EmojiReactionBar({ onPick, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, y: 4 }}
      transition={{ duration: 0.15 }}
      onMouseLeave={onClose}
      className="flex items-center gap-1 rounded-full border border-white/10 bg-[#141a33] px-2 py-1.5 shadow-xl"
      style={{ boxShadow: "0 16px 40px -12px rgba(0,0,0,0.8)" }}
    >
      {["👍", "❤️", "😂", "😮", "😢", "🔥", "🎉", "💯"].map((emoji, i) => (
        <motion.button
          key={emoji}
          type="button"
          onClick={() => onPick(emoji)}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: i * 0.03, type: "spring", stiffness: 400, damping: 20 }}
          whileHover={{ scale: 1.3, y: -3 }}
          whileTap={{ scale: 0.9 }}
          className="flex h-8 w-8 items-center justify-center rounded-full text-lg transition hover:bg-white/10"
        >
          {emoji}
        </motion.button>
      ))}
    </motion.div>
  );
}