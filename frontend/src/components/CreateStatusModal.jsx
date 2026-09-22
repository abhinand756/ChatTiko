import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, ImagePlus, Loader2 } from "lucide-react";

const BACKGROUNDS = [
  "#7c3aed", "#4f46e5", "#0ea5e9", "#059669", "#e11d48",
  "#d97706", "#0f172a", "#be185d", "#1e3a8a", "#334155", "#f2ff00",
];

export default function CreateStatusModal({ isOpen, onClose, onCreate, saving = false }) {
  const [text, setText] = useState("");
  const [background, setBackground] = useState(BACKGROUNDS[0]);
  const [previewUrl, setPreviewUrl] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setImageFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCreate = async () => {
    const isImageMode = previewUrl !== "" && !!imageFile;
    await onCreate({
      text,
      background,
      mediaFile: isImageMode ? imageFile : null,
      mediaType: isImageMode ? "image" : "text",
      previewUrl,
    });
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setText("");
    setPreviewUrl("");
    setImageFile(null);
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        style={{ background: "rgba(24, 27, 48, 0.18)", backdropFilter: "blur(10px)" }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-[400px] overflow-hidden rounded-[26px] border border-white/10 bg-[#0f1428] text-white"
        >
          <div className="flex items-center justify-between px-5 pb-3 pt-5">
            <h3 className="text-lg font-semibold">New status</h3>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-5 pb-5">
            {/* Preview */}
            <div
              className="flex h-[260px] w-full items-center justify-center overflow-hidden rounded-[18px] border border-white/10"
              style={{
                background: previewUrl
                  ? "#000"
                  : `linear-gradient(135deg, ${background}, ${background}cc)`,
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              {previewUrl ? (
                <img src={previewUrl} alt="preview" className="h-full w-full object-cover" />
              ) : (
                <p
                  className="max-w-[80%] text-center text-xl font-medium break-words"
                  style={{ color: "#ffffff" }}
                >
                  {text || "Add your status..."}
                </p>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImage}
            />

            <div className="mt-4 flex items-center gap-2">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                }}
                placeholder="Your status..."
                className="flex-1 rounded-[12px] border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-primary/60"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10"
                title="Add photo"
              >
                <ImagePlus className="h-4.5 w-4.5" size={18} />
              </button>
            </div>

            <div className="mt-3 flex items-center gap-1.5">
              {BACKGROUNDS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setBackground(color)}
                  className={`h-6 w-6 rounded-full transition ${background === color
                      ? "ring-2 ring-white ring-offset-2 ring-offset-[#0f1428]"
                      : "hover:scale-110"
                    }`}
                  style={{ background: color }}
                />
              ))}
            </div>

            <button
              type="button"
              disabled={saving || (!text.trim() && !previewUrl)}
              onClick={handleCreate}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-[14px] bg-gradient-to-r from-indigo-500 to-purple-600 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-900/25 transition hover:opacity-90 disabled:opacity-40"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Post status
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}