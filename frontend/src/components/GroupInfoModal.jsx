import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Users,
  UserPlus,
  Trash2,
  LogOut,
  Shield,
  Loader2,
  Pencil,
  ImagePlus,
} from "lucide-react";
import ConfirmationModal from "./ConfirmationModal";
import { resolveMediaUrl } from "../api/client";

export default function GroupInfoModal({
  isOpen,
  onClose,
  group,
  userId,
  allUsers = [],
  onAddMembers,
  onRemoveMember,
  onLeaveGroup,
  onDeleteGroup,
  onEditGroup,
  onUploadGroupAvatar,
  onlineUsers = [],
  busy = false,
}) {
  const [showMemberPicker, setShowMemberPicker] = useState(false);
  const [selectedNew, setSelectedNew] = useState([]);
  const [editing, setEditing] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const avatarInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const id = setTimeout(() => {
      setShowMemberPicker(false);
      setSelectedNew([]);
      setEditing(false);
      setEditDescription("");
      setAvatarUrl("");
      setSavingEdit(false);
    }, 0);
    return () => clearTimeout(id);
  }, [isOpen, group?.name]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!group) return null;

  const isAdmin = group.admins?.includes(userId);
  const isCreator = group.createdBy === userId;
  const userByName = new Map(allUsers.map((u) => [u.username, u]));
  const members = group.members || [];

  const toggleNewMember = (username) => {
    setSelectedNew((prev) =>
      prev.includes(username)
        ? prev.filter((m) => m !== username)
        : [...prev, username],
    );
  };

  const handleAddMembers = async () => {
    if (selectedNew.length === 0 || busy) return;
    await onAddMembers?.(selectedNew);
    setSelectedNew([]);
    setShowMemberPicker(false);
  };

  const openEdit = () => {
    setEditDescription(group.description || "");
    setAvatarUrl(group.avatar || "");
    setEditing(true);
  };

  const saveEdit = async () => {
    if (savingEdit) return;
    setSavingEdit(true);
    try {
      await onEditGroup?.(editDescription, avatarUrl);
      setEditing(false);
    } catch {
      // ignore
    } finally {
      setSavingEdit(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await onUploadGroupAvatar?.(file);
      if (url) setAvatarUrl(url);
    } catch {
      // ignore
    }
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  };

  return createPortal(
    <>
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={onClose}
          className="fixed inset-0 z-[90] flex items-center justify-center p-4"
          style={{
            background: "rgba(4, 6, 20, 0.2)",
            backdropFilter: "blur(10px)",
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 26 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 26 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="relative flex max-h-[85vh] w-full max-w-[420px] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#0f1428] text-white"
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
                Group Info
              </h3>
              <div className="flex items-center gap-2">
                {isAdmin && !editing && (
                  <button
                    type="button"
                    onClick={openEdit}
                    className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white"
                    title="Edit group"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {editing ? (
                <div className="mb-5 rounded-[16px] border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className="group relative flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-[20px] bg-gradient-to-br from-indigo-500 to-purple-600 text-2xl text-white shadow-lg shadow-purple-900/30"
                    >
                      {avatarUrl ? (
                        <img
                          src={resolveMediaUrl(avatarUrl)}
                          alt="group"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        group.name.charAt(0).toUpperCase()
                      )}
                      <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                        <ImagePlus className="h-5 w-5" />
                      </span>
                    </button>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold capitalize">{group.name}</p>
                      <p className="text-xs text-slate-500">Edit group photo</p>
                    </div>
                  </div>
                  <label className="mt-3 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Description
                  </label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={2}
                    placeholder="Add a group description..."
                    className="mt-1 w-full resize-none rounded-[12px] border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-primary/60"
                  />
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      disabled={savingEdit}
                      onClick={saveEdit}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-gradient-to-r from-indigo-500 to-purple-600 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                    >
                      {savingEdit && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className="rounded-[10px] border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/10"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
              <div className="mb-5 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-[20px] bg-gradient-to-br from-indigo-500 to-purple-600 text-2xl text-white shadow-lg shadow-purple-900/30">
                  {group.avatar ? (
                    <img src={resolveMediaUrl(group.avatar)} alt="group" className="h-full w-full object-cover" />
                  ) : (
                    group.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold capitalize">
                    {group.name}
                  </h2>
                  {group.description && (
                    <p className="mt-0.5 truncate text-sm text-slate-400">
                      {group.description}
                    </p>
                  )}
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                    <Users className="h-3 w-3" />
                    {group.members?.length || 0} members
                  </p>
                </div>
              </div>
              )}

              <div className="mb-3 flex items-center justify-between">
                <h4 className="flex items-center gap-1.5 text-sm font-semibold text-slate-300">
                  <Users className="h-4 w-4" /> Members
                </h4>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowMemberPicker((v) => !v)}
                    className="flex items-center gap-1.5 rounded-[10px] border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    {showMemberPicker ? "Done" : "Add"}
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
                {members.map((member) => {
                  const isOnline = onlineUsers.includes(member);
                  const isAdminUser = group.admins?.includes(member);
                  const profile = userByName.get(member);
                  const label = profile?.displayName || member;
                  return (
                    <div
                      key={member}
                      className="flex items-center gap-3 rounded-[12px] border border-white/5 bg-white/5 px-3 py-2.5"
                    >
                      <div className="relative">
                        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-semibold text-white">
                          {profile?.avatar ? (
                            <img
                              src={resolveMediaUrl(profile.avatar)}
                              alt=""
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            member.charAt(0).toUpperCase()
                          )}
                        </div>
                        {isOnline && (
                          <span className="absolute -bottom-0 -right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0f1428]" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm capitalize text-slate-200">
                          {member === userId ? `${label} (You)` : label}
                        </p>
                        {isAdminUser && (
                          <span className="flex items-center gap-1 text-[11px] text-indigo-300">
                            <Shield className="h-3 w-3" /> Admin
                          </span>
                        )}
                      </div>
                      {isAdmin && member !== userId && (
                        <button
                          type="button"
                          onClick={() => onRemoveMember?.(member)}
                          disabled={busy}
                          className="flex h-7 w-7 items-center justify-center rounded-[8px] text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-40"
                          title="Remove member"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {showMemberPicker && isAdmin && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 rounded-[14px] border border-white/10 bg-white/5 p-3"
                >
                  <p className="mb-2 text-xs text-slate-400">
                    Select users to add:
                  </p>
                  <div className="max-h-[140px] space-y-1 overflow-y-auto">
                    {allUsers
                      .filter(
                        (u) =>
                          !members.includes(u.username) &&
                          u.username !== userId,
                      )
                      .map((user) => {
                        const selected = selectedNew.includes(user.username);
                        return (
                          <button
                            key={user.username}
                            type="button"
                            onClick={() => toggleNewMember(user.username)}
                            className={`flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left transition ${
                              selected ? "bg-primary/15" : "hover:bg-white/5"
                            }`}
                          >
                            <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xs text-white">
                              {user.avatar ? (
                                <img
                                  src={resolveMediaUrl(user.avatar)}
                                  alt=""
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                user.username.charAt(0).toUpperCase()
                              )}
                            </div>
                            <span className="flex-1 truncate text-sm capitalize text-slate-200">
                              {user.displayName || user.username}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                  <button
                    type="button"
                    onClick={handleAddMembers}
                    disabled={selectedNew.length === 0 || busy}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-[10px] bg-gradient-to-r from-indigo-500 to-purple-600 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                  >
                    {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Add {selectedNew.length > 0 ? `(${selectedNew.length})` : ""}
                  </button>
                </motion.div>
              )}

              <div className="mt-5 space-y-2">
                {userId !== group.createdBy && (
                  <button
                    type="button"
                    onClick={() => setPendingAction("leave")}
                    disabled={busy}
                    className="flex w-full items-center justify-center gap-2 rounded-[12px] border border-amber-500/25 bg-amber-500/10 py-2.5 text-sm font-semibold text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-40"
                  >
                    <LogOut className="h-4 w-4" /> Leave Group
                  </button>
                )}
                {isCreator && (
                  <button
                    type="button"
                    onClick={() => setPendingAction("delete")}
                    disabled={busy}
                    className="flex w-full items-center justify-center gap-2 rounded-[12px] border border-rose-500/25 bg-rose-500/10 py-2.5 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" /> Delete Group
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

      <ConfirmationModal
        isOpen={!!pendingAction}
        title={pendingAction === "delete" ? "Delete Group" : "Leave Group"}
        message={
          pendingAction === "delete"
            ? `Delete "${group.name}" for everyone? This cannot be undone.`
            : `Leave "${group.name}"? An admin can add you back later.`
        }
        confirmLabel={pendingAction === "delete" ? "Delete" : "Leave"}
        confirmVariant="danger"
        onClose={() => setPendingAction(null)}
        onConfirm={() => {
          const action = pendingAction;
          setPendingAction(null);
          if (action === "delete") onDeleteGroup?.();
          else onLeaveGroup?.();
        }}
      />
    </>,
    document.body,
  );
}