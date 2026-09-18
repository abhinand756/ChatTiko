import { useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Users, X, Loader2 } from "lucide-react";

export default function CreateGroupModal({
  isOpen,
  onClose,
  onCreate,
  allUsers = [],
  saving = false,
}) {
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);

  if (!isOpen) return null;

  const toggleMember = (username) => {
    setSelectedMembers((prev) =>
      prev.includes(username)
        ? prev.filter((m) => m !== username)
        : [...prev, username],
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!groupName.trim() || saving) return;
    await onCreate({
      name: groupName.trim(),
      description: description.trim(),
      members: selectedMembers,
    });
  };

  const confirmLabel = saving ? "Creating..." : "Create Group";

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            background: "rgba(8, 17, 25, 0)",
            backdropFilter: "blur(10px)",
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 26 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 26 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[420px] overflow-hidden rounded-[28px] border border-white/10 bg-[#0f1428] text-white"
            style={{ boxShadow: "0 40px 90px -20px rgba(0,0,0,0.95)" }}
          >
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-3/4"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(139,92,246,0.7), transparent)",
              }}
            />

            <div className="flex items-center justify-between px-6 pb-4 pt-5">
              <h3 className="text-[18px] font-semibold tracking-tight">
                Create Group
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 pb-6">
              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    Group name
                  </label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="e.g. Weekend Plans"
                    className="w-full rounded-[14px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 transition focus:border-primary/60"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    Description{" "}
                    <span className="text-slate-600">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What is this group about?"
                    className="w-full rounded-[14px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 transition focus:border-primary/60"
                  />
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                      <Users className="h-3.5 w-3.5" />
                      Members ({selectedMembers.length} selected)
                    </label>
                  </div>
                  <div className="max-h-[180px] overflow-y-auto rounded-[14px] border border-white/10 bg-white/5">
                    {allUsers.length === 0 && (
                      <div className="p-4 text-center text-sm text-slate-500">
                        No users to add yet.
                      </div>
                    )}
                    {allUsers.map((user) => {
                      const selected = selectedMembers.includes(user.username);
                      return (
                        <button
                          key={user.username}
                          type="button"
                          onClick={() => toggleMember(user.username)}
                          className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition ${
                            selected ? "bg-primary/15" : "hover:bg-white/5"
                          }`}
                        >
                          <div className="relative">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-semibold text-white">
                              {user.username.charAt(0).toUpperCase()}
                            </div>
                          </div>
                          <span className="flex-1 truncate text-sm capitalize text-slate-200">
                            {user.displayName || user.username}
                          </span>
                          <span
                            className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] transition ${
                              selected
                                ? "border-primary bg-primary text-white"
                                : "border-white/20 text-transparent"
                            }`}
                          >
                            ✓
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={!groupName.trim() || saving}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-[14px] bg-gradient-to-r from-indigo-500 to-purple-600 py-3 text-[14px] font-semibold text-white shadow-lg shadow-purple-900/25 transition-all duration-150 hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {confirmLabel}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}