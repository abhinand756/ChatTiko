import { useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, Plus, Trash2, Loader2 } from "lucide-react";

export default function PollModal({
  isOpen,
  onClose,
  onCreate,
  saving = false,
}) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [multiple, setMultiple] = useState(false);

  if (!isOpen) return null;

  const updateOption = (i, value) => {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? value : o)));
  };

  const addOption = () => {
    if (options.length < 10) setOptions((prev) => [...prev, ""]);
  };

  const removeOption = (i) => {
    if (options.length > 2) setOptions((prev) => prev.filter((_, idx) => idx !== i));
  };

  const validQuestion = question.trim().length > 0;
  const validOptions = options.filter((o) => o.trim()).length >= 2;

  const handleCreate = () => {
    if (!validQuestion || !validOptions) return;
    onCreate({
      question: question.trim(),
      options: options.map((o) => o.trim()).filter((o) => o),
      multiple,
    });
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
            <h3 className="text-lg font-semibold">Create Poll</h3>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4 px-5 pb-5">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Question
              </label>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask a question..."
                className="w-full rounded-[14px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-primary/60"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Options
              </label>
              <div className="space-y-2">
                {options.map((option, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => updateOption(i, e.target.value)}
                      placeholder={`Option ${i + 1}`}
                      className="w-full rounded-[12px] border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-primary/60"
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(i)}
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[10px] text-slate-400 transition hover:bg-red-500/15 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                {options.length < 10 && (
                  <button
                    type="button"
                    onClick={addOption}
                    className="flex items-center gap-1.5 rounded-[12px] border border-dashed border-white/15 bg-white/[0.02] px-3.5 py-2.5 text-sm text-slate-300 transition hover:bg-white/5"
                  >
                    <Plus className="h-4 w-4" />
                    Add option
                  </button>
                )}
              </div>
            </div>

            <label className="flex cursor-pointer items-center justify-between rounded-[14px] border border-white/10 bg-white/5 px-4 py-3">
              <div>
                <p className="text-sm text-white">Allow multiple answers</p>
                <p className="text-xs text-slate-400">Voters can select more than one option</p>
              </div>
              <button
                type="button"
                role="switch"
                onClick={() => setMultiple((m) => !m)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
                  multiple ? "bg-gradient-to-r from-indigo-500 to-purple-600" : "bg-white/10"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                    multiple ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </label>

            <button
              type="button"
              disabled={!validQuestion || !validOptions || saving}
              onClick={handleCreate}
              className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-gradient-to-r from-indigo-500 to-purple-600 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-900/25 transition hover:opacity-90 disabled:opacity-40"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Poll
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}