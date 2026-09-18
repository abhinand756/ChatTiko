import { useRef } from "react";
import {
  MapPin,
  Calendar,
  Camera,
  User,
  MessageSquare,
  Phone,
  Menu,
} from "lucide-react";
import { resolveMediaUrl } from "../api/client";

const Field = ({ label, children }) => (
  <div className="flex items-start justify-between gap-3 py-2.5">
    <span className="text-sm text-slate-400">{label}</span>
    <span className="text-right text-sm text-white">{children}</span>
  </div>
);

export default function ProfileDetail({
  userId,
  profile,
  saving,
  onChangeAvatar,
  onChangeCover,
  onEdit,
  friendsCount,
  onOpenSidebar,
}) {
  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const friends = friendsCount ?? null;
  const avatarUrl = resolveMediaUrl(profile?.avatar);
  const coverUrl = resolveMediaUrl(profile?.coverImage);
  const avatarName = (profile?.displayName || userId || "U").charAt(0).toUpperCase();

  const handleAvatarPick = (e) => {
    const file = e.target.files?.[0];
    if (file) onChangeAvatar?.(file);
    e.target.value = "";
  };

  const handleCoverPick = (e) => {
    const file = e.target.files?.[0];
    if (file) onChangeCover?.(file);
    e.target.value = "";
  };

  const name = profile?.displayName || userId || "-";

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-7 py-7">
        {/* Cover */}
        <div className="relative h-44 w-full overflow-hidden rounded-[18px] bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500">
          {onOpenSidebar && (
            <button
              type="button"
              onClick={onOpenSidebar}
              className="absolute top-3 left-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition hover:bg-black/60 lg:hidden"
              title="Open Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
          {coverUrl ? (
            <img
              src={coverUrl}
              alt="cover"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-white/50">
              No cover photo
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-[11px] font-medium text-white backdrop-blur-sm transition hover:bg-black/60"
          >
            <Camera className="h-3 w-3" />
            {coverUrl ? "Change cover" : "Add cover"}
          </button>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleCoverPick}
          />
        </div>

        {/* Avatar + identity */}
        <div className="-mt-10 flex flex-col gap-4 px-4 sm:flex-row sm:items-end">
          <div className="relative shrink-0 self-start">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="avatar"
                className="h-24 w-24 rounded-full border-4 border-[#070b17] object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-[#070b17] bg-gradient-to-br from-indigo-500 to-purple-600 text-4xl font-bold text-white">
                {avatarName}
              </div>
            )}
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white transition hover:scale-105"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarPick}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 capitalize">
              <h2 className="text-2xl font-bold text-white">{name}</h2>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
              <button
                type="button"
                onClick={() => onEdit("location")}
                className="flex items-center gap-1.5 transition hover:text-slate-200"
              >
                <MapPin className="h-3.5 w-3.5" />
                {profile?.location || "-"}
              </button>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {profile?.createdAt
                  ? `Joined ${new Date(profile.createdAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}`
                  : "-"}
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className={`h-2 w-2 rounded-full ${
                    profile?.online ? "bg-emerald-400" : "bg-slate-500"
                  }`}
                />
                {profile?.online ? "Online" : "Offline"}
              </span>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="mt-6 rounded-[14px] border border-white/10 bg-white/[0.04] px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <MessageSquare className="h-3.5 w-3.5" />
              Status
            </div>
          </div>
          <p className="mt-2 text-sm text-slate-200">
            {profile?.status || "-"}
            {saving && <span className="ml-2 text-xs text-slate-500">Saving…</span>}
          </p>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { icon: User, label: "Friends", value: friends },
            { icon: MessageSquare, label: "Messages", value: null },
            { icon: Phone, label: "Calls", value: null },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-[14px] border border-white/10 bg-white/[0.04] px-4 py-4 text-center"
            >
              <s.icon className="mx-auto h-4 w-4 text-slate-400" />
              <p className="mt-2 text-2xl font-bold text-white">
                {s.value ?? "-"}
              </p>
              <p className="text-xs text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Details */}
        <div className="mt-4 divide-y divide-white/5 rounded-[14px] border border-white/10 bg-white/[0.04] px-5 py-2">
          <Field label="Username">{userId || "-"}</Field>
          <Field label="Name">{profile?.displayName || "-"}</Field>
          <Field label="Location">{profile?.location || "-"}</Field>
          <Field label="Joined">
            {profile?.createdAt
              ? new Date(profile.createdAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })
              : "-"}
          </Field>
        </div>
      </div>
    </div>
  );
}
