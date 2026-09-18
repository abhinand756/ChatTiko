import { motion } from "framer-motion";
import {
  Image as ImageIcon,
  Camera,
  File,
  Mic,
  Video,
  MapPin,
  UserPlus,
  Newspaper,
} from "lucide-react";

const ITEMS = [
  { id: "gallery", label: "Gallery", Icon: ImageIcon, accent: "from-pink-500 to-rose-500" },
  { id: "camera", label: "Camera", Icon: Camera, accent: "from-rose-500 to-red-500" },
  { id: "document", label: "Document", Icon: File, accent: "from-sky-500 to-blue-500" },
  { id: "audio", label: "Audio", Icon: Mic, accent: "from-amber-500 to-orange-500" },
  { id: "video", label: "Video", Icon: Video, accent: "from-purple-500 to-indigo-500" },
  { id: "location", label: "Location", Icon: MapPin, accent: "from-emerald-500 to-teal-500" },
  { id: "contact", label: "Contact", Icon: UserPlus, accent: "from-cyan-500 to-sky-500" },
  { id: "poll", label: "Poll", Icon: Newspaper, accent: "from-fuchsia-500 to-pink-500" },
];

export default function AttachmentTray({ onAction, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 14 }}
      transition={{ duration: 0.18 }}
      className="flex items-start gap-4 overflow-x-auto rounded-[16px] border border-white/10 bg-[#0f1428] p-3 shadow-2xl"
      style={{ boxShadow: "0 30px 70px -15px rgba(0,0,0,0.85)" }}
    >
      {ITEMS.map(({ id, label, Icon, accent }, i) => (
        <motion.button
          key={id}
          type="button"
          onClick={() => {
            if (onAction) onAction(id);
            if (onClose) onClose();
          }}
          initial={{ opacity: 0, scale: 0.7, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: i * 0.04, type: "spring", stiffness: 320, damping: 22 }}
          className="flex min-w-[72px] flex-col items-center gap-1.5"
        >
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-lg ${accent}`}
          >
            <Icon className="h-5 w-5" />
          </span>
          <span className="text-[11px] text-slate-300">{label}</span>
        </motion.button>
      ))}
    </motion.div>
  );
}