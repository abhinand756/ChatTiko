import { useRef, useState } from "react";
import {
  Camera,
  Check,
  Loader2,
  MapPin,
  MessageSquare,
  Pencil,
  LogOut,
  Eye,
} from "lucide-react";
import { resolveMediaUrl } from "../api/client";
import LogoSection from "./LogoSection";

function EditableRow({
  icon: Icon,
  label,
  value,
  editing,
  draft,
  setDraft,
  startEdit,
  cancelEdit,
  save,
  saving,
  maxLength,
}) {
  return (
    <div className="flex items-center gap-3 rounded-[12px] border border-white/10 bg-white/[0.03] px-3 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-slate-400">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        {editing ? (
          <form onSubmit={save} className="flex items-center gap-2">
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={maxLength}
              className="w-full rounded-[8px] border border-white/10 bg-[#0b1220] px-2 py-1.5 text-sm text-white outline-none placeholder:text-slate-500"
              placeholder={label}
            />
            <button
              type="submit"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-primary text-white transition hover:scale-105"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-white/5 text-slate-300 transition hover:bg-white/10"
            >
              ✕
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={startEdit}
            className="group flex w-full items-center justify-between gap-2 text-left"
          >
            <div className="min-w-0">
              <p className="text-[11px] text-slate-500">{label}</p>
              <p className="truncate text-sm text-white">{value || "-"}</p>
            </div>
            <Pencil className="h-3.5 w-3.5 shrink-0 text-slate-500 opacity-0 transition group-hover:opacity-100" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function ProfileScreen({
  userId,
  profile,
  saving,
  onSaveProfile,
  onChangeAvatar,
  onLogout,
  editingField,
  onSelectEdit,
  onOpenSidebar,
  onViewProfile,
}) {
  const avatarInputRef = useRef(null);
  const [nameDraft, setNameDraft] = useState(profile?.displayName || "");
  const [statusDraft, setStatusDraft] = useState(profile?.status || "");
  const [locationDraft, setLocationDraft] = useState(profile?.location || "");

  const avatarUrl = resolveMediaUrl(profile?.avatar);
  const avatarName = (profile?.displayName || userId || "U").charAt(0).toUpperCase();

  const handleAvatarPick = (e) => {
    const file = e.target.files?.[0];
    if (file) onChangeAvatar?.(file);
    e.target.value = "";
  };

  const save = async (field, value, setter) => {
    await onSaveProfile?.({ [field]: value });
    setter(value);
    onSelectEdit?.(null);
  };

  return (
    <div className="flex h-full flex-col border-r border-white/10 bg-card/40 backdrop-blur-xl">
      <LogoSection onOpenSidebar={onOpenSidebar} />

      <div className="border-b border-white/10 px-5 pb-3 pt-1">
        <h1 className="text-xl font-semibold text-white">Profile</h1>
        <p className="mt-0.5 text-sm text-slate-400">Edit your details</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="flex flex-col items-center">
          {/* Avatar */}
          <div className="relative">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="avatar"
                className="h-24 w-24 rounded-full border-2 border-white/10 object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-4xl font-semibold text-white">
                {avatarName}
              </div>
            )}
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              title="Change avatar"
              className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg transition hover:scale-105"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarPick}
            />
          </div>

          <div className="mt-2 flex flex-col flex-wrap items-center gap-1">
            <h2 className="text-2xl font-bold text-white capitalize">{profile?.displayName}</h2>
            <p className="text-xs text-slate-500">@{userId}</p>
          </div>

          {/* View full profile (mobile only) */}
          <button
            type="button"
            onClick={onViewProfile}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-[12px] border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10 lg:hidden"
          >
            <Eye className="h-4 w-4" />
            View full profile
          </button>

          {/* Editable fields */}
          <div className="mt-5 w-full space-y-2">
            <EditableRow
              icon={Pencil}
              label="Name"
              value={profile?.displayName}
              editing={editingField === "displayName"}
              draft={nameDraft}
              setDraft={setNameDraft}
              startEdit={() => {
                setNameDraft(profile?.displayName || "");
                onSelectEdit?.("displayName");
              }}
              cancelEdit={() => onSelectEdit?.(null)}
              save={(e) => {
                e.preventDefault();
                save("displayName", nameDraft.trim(), (v) => setNameDraft(v));
              }}
              saving={saving}
              maxLength={40}
            />
            <EditableRow
              icon={MapPin}
              label="Location"
              value={profile?.location}
              editing={editingField === "location"}
              draft={locationDraft}
              setDraft={setLocationDraft}
              startEdit={() => {
                setLocationDraft(profile?.location || "");
                onSelectEdit?.("location");
              }}
              cancelEdit={() => onSelectEdit?.(null)}
              save={(e) => {
                e.preventDefault();
                save("location", locationDraft.trim(), (v) => setLocationDraft(v));
              }}
              saving={saving}
              maxLength={40}
            />
            <EditableRow
              icon={MessageSquare}
              label="Status"
              value={profile?.status}
              editing={editingField === "status"}
              draft={statusDraft}
              setDraft={setStatusDraft}
              startEdit={() => {
                setStatusDraft(profile?.status || "");
                onSelectEdit?.("status");
              }}
              cancelEdit={() => onSelectEdit?.(null)}
              save={(e) => {
                e.preventDefault();
                save("status", statusDraft, (v) => setStatusDraft(v));
              }}
              saving={saving}
              maxLength={80}
            />
          </div>

          {/* Sign out */}
          <button
            type="button"
            onClick={onLogout}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-[12px] bg-red-500/15 px-3 py-2.5 text-sm font-medium text-red-300 transition hover:bg-red-500/25"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
