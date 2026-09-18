import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Clock3, Trash2 } from "lucide-react";

const CATEGORIES = [
  { id: "recent", label: "Frequently used", emojis: ["😀", "😂", "❤️", "👍", "🔥", "😮"] },
  { id: "smileys", label: "Smileys & people", emojis: [] },
  { id: "animals", label: "Animals & nature", emojis: [] },
  { id: "food", label: "Food & drink", emojis: [] },
  { id: "activities", label: "Activities", emojis: [] },
  { id: "travel", label: "Travel & places", emojis: [] },
  { id: "objects", label: "Objects", emojis: [] },
  { id: "symbols", label: "Symbols", emojis: [] },
];

const EMOJI_BUCKETS = {
  smileys: ["😀", "😁", "😂", "🤣", "😊", "😇", "🙂", "😉", "😍", "🥰", "😘", "😜", "🤪", "😎", "🤩", "🥳", "😏", "😒", "🙄", "😬", "🤔", "🤗", "🤭", "😴", "😭", "😅", "😤", "😡", "🥺", "😱", "😳", "🤯", "😇", "👻", "👽", "🤖", "💀", "👋", "✌️", "🤞", "👍", "👎", "👊", "✊", "🙏", "👏", "💪"],
  animals: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🐔", "🦄", "🐝", "🦋", "🐢", "🐍", "🦖", "🐙", "🦈", "🌵", "🌲", "🌸", "🌹", "🌻", "🍀"],
  food: ["🍏", "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🍒", "🍑", "🥭", "🍍", "🥥", "🥑", "🍆", "🥔", "🥕", "🌽", "🍕", "🍔", "🍟", "🌭", "🍿", "🍩", "🍪", "🎂", "🍰", "☕", "🍵"],
  activities: ["⚽", "🏀", "🏈", "⚾", "🎾", "🏐", "🏉", "🏓", "🏸", "🥊", "⛳", "🎣", "🏊", "🚴", "🏆", "🎯", "🎮", "🎲", "🎰", "🎭", "🎨", "🎤", "🎧", "🎬"],
  travel: ["🚗", "🚕", "🚙", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒", "🚜", "🛴", "✈️", "🚀", "🚁", "⛵", "🚤", "🚢", "🗿", "🏰", "🏯", "🌍", "🗺️", "🌋", "🏖️"],
  objects: ["⌚", "📱", "💻", "⌨️", "🖥️", "🖨️", "🖱️", "💾", "📀", "📷", "📸", "📹", "🎥", "📞", "☎️", "📺", "📻", "⏰", "🔍", "💰", "💎", "🔑", "🔒", "📚"],
  symbols: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "💯", "✅", "❌", "⭕", "❗", "❓", "💬", "💭", "⭐", "🌟", "💫", "✨", "🔥", "☀️", "🌙", "⭐", "⚡", "💧", "🎉", "🎊", "🚩"],
};

function buildEmojiList() {
  const list = [];
  CATEGORIES.forEach((cat) => {
    if (cat.emojis.length > 0) {
      cat.emojis.forEach((e) => list.push({ category: cat.id, emoji: e }));
    }
  });
  Object.keys(EMOJI_BUCKETS).forEach((catId) => {
    EMOJI_BUCKETS[catId].forEach((e) => list.push({ category: catId, emoji: e }));
  });
  return list;
}

const ALL_EMOJIS = buildEmojiList();
const RECENT_KEY = "chattiko_recent_emojis";

function getRecent() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveRecent(emoji) {
  const recent = [emoji, ...getRecent().filter((e) => e !== emoji)].slice(0, 24);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
  } catch { /* ignore */ }
}

export default function EmojiPicker({ onPick, onClose }) {
  const [active, setActive] = useState("recent");
  const recent = useMemo(() => getRecent(), []);

  const currentEmojis = useMemo(() => {
    if (active === "recent") {
      if (recent.length > 0) return recent;
      return ["😀", "😂", "❤️", "👍", "😮", "🔥"];
    }
    return ALL_EMOJIS.filter((e) => e.category === active).map((e) => e.emoji);
  }, [active, recent]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.18 }}
      className="flex flex-col overflow-hidden rounded-[16px] border border-white/10 bg-[#0f1428] shadow-2xl"
      style={{ boxShadow: "0 30px 70px -15px rgba(0,0,0,0.85)" }}
    >
      <div className="flex max-h-[220px] min-h-[120px] flex-col overflow-y-auto p-2">
        <div className="flex flex-wrap gap-1">
          {currentEmojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                saveRecent(emoji);
                if (onPick) onPick(emoji);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-[10px] text-xl transition hover:bg-white/10"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-white/10 px-2 py-1.5">
        <div className="flex items-center gap-1">
          {["recent", "smileys", "animals", "food", "activities", "travel", "objects", "symbols"].map((id, i) => {
            const icons = ["⏰", "😀", "🐶", "🍕", "⚽", "✈️", "📱", "💬"];
            const isCatActive = active === id;
            return (
              <button
                key={id}
                type="button"
                title={CATEGORIES.find((c) => c.id === id)?.label}
                onClick={() => setActive(id)}
                className={`flex h-7 w-7 items-center justify-center rounded-lg text-base transition ${
                  isCatActive ? "bg-primary/20 text-white" : "opacity-60 hover:bg-white/10"
                }`}
              >
                {icons[i]}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10"
            title="Clear recent"
            onMouseDown={() => {
              try {
                localStorage.removeItem(RECENT_KEY);
              } catch { /* ignore */ }
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10"
            title="Close"
          >
            <Clock3 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}