import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  CheckCheck,
  Pencil,
  Trash2,
  Smile,
  File,
  Download,
  X,
  MoreVertical,
  Reply,
  Copy,
  Forward,
  Star,
  Pin,
  MapPin,
  User as UserIcon,
  Info,
  Globe,
  Loader2,
} from "lucide-react";
import AudioPlayer from "./AudioPlayer";
import EmojiReactionBar from "./EmojiReactionBar";
import { resolveMediaUrl } from "../api/client";
import { translateText } from "../api/translateApi";

function getStatusIcon(status, isMe) {
  if (!isMe) return null;
  let icon = <Check className="h-[15px] w-[15px] text-slate-300" />;
  if (status === "seen") {
    icon = <CheckCheck className="h-[15px] w-[15px] text-blue-400" />;
  } else if (status === "delivered") {
    icon = <CheckCheck className="h-[15px] w-[15px] text-slate-300" />;
  }
  return icon;
}

function formatFileSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileAttachment({ msg }) {
  const fileName = msg.fileName || "File";
  return (
    <div className="mt-1.5 flex items-center gap-2.5 rounded-[12px] border border-white/15 bg-black/20 px-3 py-2">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] bg-purple-500/20 text-purple-300">
        <File className="h-4.5 w-4.5" size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-white">{fileName}</p>
        <p className="text-[11px] text-slate-400">
          {formatFileSize(msg.fileSize)}
        </p>
      </div>
      <a
        href={resolveMediaUrl(msg.fileUrl || msg.imageUrl)}
        target="_blank"
        rel="noreferrer"
        download={fileName}
        className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-white/10 text-slate-200 transition hover:bg-white/20"
        title="Download file"
      >
        <Download className="h-4 w-4" />
      </a>
    </div>
  );
}

function PollBody({ msg, isMe, userId, onVote }) {
  const poll = msg.poll;
  if (!poll || !poll.options) return null;
  const totalVotes = (poll.options || []).reduce(
    (sum, opt) => sum + (opt.votes?.length || 0),
    0,
  );

  const me = String(userId).toLowerCase();
  const pick = (index) => {
    onVote?.(msg.id, index);
  };

  return (
    <div className="mt-2 w-full min-w-[230px]">
      <div
        className={`rounded-[14px] border px-3.5 py-2.5 ${isMe ? "border-white/20 bg-white/10" : "border-white/10 bg-black/15"
          }`}
      >
        <p className="mb-2 text-sm font-semibold text-white">{poll.question}</p>
        {poll.multiple && (
          <p className="mb-2 text-[10px] uppercase tracking-wide text-slate-400">
            Multiple answers
          </p>
        )}
        <div className="space-y-1.5">
          {poll.options.map((option, i) => {
            const count = option.votes?.length || 0;
            const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
            const voted = (option.votes || []).some(
              (u) => String(u).toLowerCase() === me,
            );
            return (
              <button
                key={i}
                type="button"
                onClick={() => pick(i)}
                className="relative w-full overflow-hidden rounded-[10px] px-3 py-2 text-left transition hover:opacity-90"
                style={{
                  background: isMe
                    ? "rgba(255,255,255,0.12)"
                    : "rgba(255,255,255,0.08)",
                }}
              >
                <span
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500/50 to-purple-600/50 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
                <span className="relative flex items-center justify-between gap-2 text-sm text-white">
                  <span className="truncate">{option.text}</span>
                  <span className="flex items-center gap-1.5 text-xs text-white/70">
                    {voted && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                    {count > 0 ? (
                      <span>
                        {count} · {pct}%
                      </span>
                    ) : (
                      <span>0</span>
                    )}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          {totalVotes} vote{totalVotes === 1 ? "" : "s"}
        </p>
      </div>
    </div>
  );
}

function ReplyQuote({ replyTo }) {
  if (!replyTo?.id) return null;
  return (
    <div className="mb-1.5 flex items-center gap-2 rounded-[10px] border-l-[3px] border-indigo-400 bg-black/20 px-2.5 py-1.5">
      <Reply className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-medium capitalize text-indigo-300">
          {replyTo.senderId ? (replyTo.senderId === "me" ? "You" : replyTo.senderId) : "Reply"}
        </p>
        <p className="truncate text-[11px] text-slate-300">
          {replyTo.text || "Media"}
        </p>
      </div>
    </div>
  );
}

export default function MessageBubble({
  msg,
  isMe,
  userId,
  senderName,
  senderAvatar,
  isGroupChat,
  onEdit,
  onDelete,
  onReact,
  onUploadImage,
  onReply,
  onForward,
  onStar,
  onPin,
  onVote,
  onInfo,
  onCopy,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [, setUploading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translation, setTranslation] = useState(null);
  const [translateError, setTranslateError] = useState(false);
  const imageInputRef = useRef(null);
  const menuRef = useRef(null);
  const bubbleRef = useRef(null);
  const translateGenRef = useRef(0);

  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  useEffect(() => {
    translateGenRef.current += 1;
    const id = setTimeout(() => {
      setTranslation(null);
      setTranslateError(false);
      setTranslating(false);
    }, 0);
    return () => clearTimeout(id);
  }, [msg.text]);

  const runTranslate = () => {
    if (translation) {
      translateGenRef.current += 1;
      setTranslation(null);
      setTranslateError(false);
      return;
    }
    const gen = ++translateGenRef.current;
    setTranslating(true);
    setTranslateError(false);
    translateText(msg.text)
      .then((result) => {
        if (gen === translateGenRef.current) setTranslation(result);
      })
      .catch(() => {
        if (gen === translateGenRef.current) setTranslateError(true);
      })
      .finally(() => {
        if (gen === translateGenRef.current) setTranslating(false);
      });
  };

  const startEditing = () => {
    setEditText(msg.text || "");
    setEditing(true);
    setMenuOpen(false);
  };

  const reactions = msg.reactions
    ? typeof msg.reactions.toObject === "function"
      ? Object.fromEntries(msg.reactions.toObject())
      : msg.reactions
    : {};

  const reactionEntries = Object.entries(reactions).filter(
    ([, users]) => users?.length > 0,
  );

  const isImage = msg.messageType === "image";
  const isFile = msg.messageType === "file";
  const isAudio = msg.messageType === "audio" || !!msg.audioUrl;
  const isVideo = msg.messageType === "video";
  const isCircularVideo = msg.messageType === "circular_video";
  const isLocation = msg.messageType === "location" || msg.content === "location";
  const isContact = msg.messageType === "contact" || msg.content === "contact";

  const submitEdit = () => {
    if (editText.trim() && editText.trim() !== msg.text) {
      onEdit(msg.id, editText.trim());
    }
    setEditing(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    onUploadImage(file, "image").finally(() => {
      setUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    });
  };

  const isStarred =
    Array.isArray(msg.starredBy) &&
    msg.starredBy.some(
      (u) => String(u).toLowerCase() === String(userId).toLowerCase(),
    );
  const isPinned = !!msg.pinned;

  const menuItems = [
    { key: "reply", label: "Reply", Icon: Reply },
    { key: "copy", label: "Copy", Icon: Copy },
    { key: "forward", label: "Forward", Icon: Forward },
    { key: "star", label: isStarred ? "Unstar" : "Star", Icon: Star },
    { key: "pin", label: isPinned ? "Unpin" : "Pin", Icon: Pin },
    ...(msg.text
      ? [
        {
          key: "translate",
          label: translation ? "Hide translation" : "Translate",
          Icon: Globe,
        },
      ]
      : []),
    ...(isMe
      ? [
        { key: "edit", label: "Edit", Icon: Pencil },
        { key: "deleteMe", label: "Delete for me", Icon: Trash2 },
        { key: "deleteAll", label: "Delete for everyone", Icon: Trash2, danger: true },
      ]
      : [{ key: "deleteMe", label: "Delete", Icon: Trash2, danger: true }]),
    { key: "info", label: "Message info", Icon: Info },
  ];

  const handleMenuAction = (key) => {
    setMenuOpen(false);
    if (key === "reply") onReply?.(msg);
    else if (key === "copy") onCopy?.(msg);
    else if (key === "forward") onForward?.(msg);
    else if (key === "star") onStar?.(msg.id);
    else if (key === "pin") onPin?.(msg.id);
    else if (key === "edit") startEditing();
    else if (key === "deleteMe") onDelete?.(msg.id, false);
    else if (key === "deleteAll") onDelete?.(msg.id, true);
    else if (key === "info") onInfo?.(msg);
    else if (key === "translate") runTranslate();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`group flex ${isMe ? "justify-end" : "justify-start"}`}
    >
      <div
        ref={bubbleRef}
        className={`relative max-w-[70%] sm:max-w-[60%] ${isMe ? "items-end" : "items-start"}`}
        onMouseLeave={() => {
          setShowEmojis(false);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenuOpen(true);
        }}
      >
        <div
          className={`absolute top-0 right-0 z-10 flex items-start gap-1.5 ${isMe ? "flex-row-reverse" : ""}`}
        >
          {/* Quick action buttons (hover overlay) */}
          {!editing && (
            <div
              className={`flex items-center gap-0.5 rounded-[10px] border border-white/10 bg-[#0d1128] px-1.5 py-1.5 opacity-0 shadow-lg transition-all duration-200 ${menuOpen ? "opacity-100" : "group-hover:opacity-100"
                } ${isMe ? "order-last" : "order-first"}`}
            >
              <button
                type="button"
                onClick={() => setShowEmojis((v) => !v)}
                className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-white"
                title="React"
              >
                <Smile className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onReply?.(msg)}
                className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-white"
                title="Reply"
              >
                <Reply className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={onForward ? () => onForward(msg) : undefined}
                className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-white"
                title="Forward"
              >
                <Forward className="h-3.5 w-3.5" />
              </button>
              {isMe && !isImage && (
                <button
                  type="button"
                  onClick={startEditing}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-white"
                  title="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
              {isMe && (
                <button
                  type="button"
                  onClick={() => onDelete(msg.id)}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition hover:bg-rose-500/15 hover:text-rose-400"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-white"
                title="More actions"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Context / more menu */}
        <AnimatePresence>
          {menuOpen && !editing && (
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, scale: 0.92, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -4 }}
              transition={{ duration: 0.12 }}
              className={`absolute z-30 overflow-hidden rounded-[10px] border border-white/10 bg-[#12172e] p-1 shadow-2xl ${isMe ? "right-0" : "left-0"
                } top-10`}
              onClick={(e) => e.stopPropagation()}
            >
              {menuItems.map(({ key, label, Icon, danger }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleMenuAction(key)}
                  className={`flex w-max min-w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-left text-sm transition ${danger
                    ? "text-rose-300 hover:bg-rose-500/10"
                    : "text-slate-200 hover:bg-white/10"
                    }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Emoji reaction bar popover */}
        <AnimatePresence>
          {showEmojis && !editing && (
            <div
              className={`absolute z-20 top-1 ${isMe ? "right-0" : "left-0"}`}
            >
              <EmojiReactionBar
                onPick={(emoji) => {
                  onReact(msg.id, emoji);
                  setShowEmojis(false);
                }}
                onClose={() => setShowEmojis(false)}
              />
            </div>
          )}
        </AnimatePresence>

        <div className="relative">
          {/* Reply quote */}
          {!editing && msg.replyTo?.id && (
            <ReplyQuote replyTo={msg.replyTo} />
          )}

          {/* Forwarded label */}
          {!editing && msg.forwardedFrom && (
            <p className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-cyan-300/90">
              <Forward className="h-3.5 w-3.5" /> Forwarded
            </p>
          )}

          {/* Star / pin indicators */}
          {(isStarred || isPinned) && !editing && (
            <div className="mb-1 flex items-center gap-2">
              {isPinned && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 text-[10px] text-amber-300">
                  <Pin className="h-3 w-3" /> Pinned
                </span>
              )}
              {isStarred && (
                <span className="inline-flex items-center gap-1 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-1.5 py-0.5 text-[10px] text-yellow-300">
                  <Star className="h-3 w-3" /> Starred
                </span>
              )}
            </div>
          )}

          {/* Editing mode */}
          {editing ? (
            <div className="rounded-[14px] border border-primary/50 bg-white/10 px-3 py-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitEdit();
                    if (e.key === "Escape") setEditing(false);
                  }}
                  className="flex-1 bg-transparent text-sm text-white outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={submitEdit}
                  className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-primary text-white transition hover:opacity-90"
                  title="Save"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-white/10 text-slate-300 transition hover:bg-white/20"
                  title="Cancel"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : isImage ? (
            <div
              className={`overflow-hidden rounded-[10px] border ${isMe ? "border-primary/30" : "border-white/10"
                } shadow-lg`}
            >
              <a
                href={resolveMediaUrl(msg.imageUrl)}
                target="_blank"
                rel="noreferrer"
              >
                <img
                  src={resolveMediaUrl(msg.imageUrl)}
                  alt={msg.text || "Image"}
                  className="max-h-[340px] max-w-full cursor-pointer object-cover transition duration-300 hover:opacity-95"
                  loading="lazy"
                />
              </a>
            </div>
          ) : isCircularVideo ? (
            <div
              className={`overflow-hidden rounded-full border-[3px] ${isMe ? "border-primary/50" : "border-white/20"
                } shadow-xl h-48 w-48 flex items-center justify-center bg-black`}
            >
              <video
                src={resolveMediaUrl(msg.imageUrl || msg.fileUrl)}
                controls
                playsInline
                preload="metadata"
                className="h-full w-full object-cover rounded-full aspect-square"
              />
            </div>
          ) : isVideo ? (
            <div
              className={`overflow-hidden rounded-[16px] border ${isMe ? "border-primary/30" : "border-white/10"
                } shadow-lg`}
            >
              <video
                src={resolveMediaUrl(msg.imageUrl || msg.fileUrl)}
                controls
                playsInline
                preload="metadata"
                className="max-h-[340px] max-w-full bg-black"
              />
            </div>
          ) : isAudio ? (
            <AudioPlayer
              src={msg.audioUrl}
              duration={msg.audioDuration}
              timestamp={msg.timestamp}
              isMe={isMe}
              status={msg.status}
              senderName={senderName}
              senderAvatar={senderAvatar}
              isGroupChat={isGroupChat}
            />
          ) : isFile ? (
            <div
              className={`flex flex-col rounded-[10px] px-3.5 py-2.5 shadow-lg ${isMe
                ? "bg-gradient-to-br from-primary to-purple-600 text-white"
                : "bg-white/10 text-slate-200"
                }`}
            >
              {msg.text && (
                <p className="mb-1 text-sm break-words">{msg.text}</p>
              )}
              <FileAttachment msg={msg} />
            </div>
          ) : isLocation ? (
            <div
              className={`flex flex-col rounded-[16px] px-3.5 py-3 shadow-lg ${isMe
                ? "bg-gradient-to-br from-primary to-purple-600 text-white"
                : "bg-white/10 text-slate-200"
                }`}
            >
              <div className="flex items-start gap-2.5">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[12px] bg-emerald-500/20 text-emerald-300">
                  <MapPin className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {msg.location?.label || "Location"}
                  </p>
                  <a
                    href={`https://maps.google.com/?q=${msg.location?.latitude},${msg.location?.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-0.5 text-xs text-indigo-200 underline"
                  >
                    View on map
                  </a>
                </div>
              </div>
            </div>
          ) : isContact ? (
            <div
              className={`flex flex-col rounded-[16px] px-3.5 py-3 shadow-lg ${isMe
                ? "bg-gradient-to-br from-primary to-purple-600 text-white"
                : "bg-white/10 text-slate-200"
                }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-cyan-500/25 text-cyan-200">
                  <UserIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium capitalize text-white">
                    {msg.contact?.name || msg.contact?.username || "Contact"}
                  </p>
                  {msg.contact?.username && (
                    <p className="truncate text-xs text-white/60">
                      @{msg.contact.username}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : msg.poll?.question ? (
            <div
              className={`flex flex-col rounded-[16px] px-3 py-2.5 shadow-lg ${isMe
                ? "bg-gradient-to-br from-primary to-purple-600 text-white"
                : "bg-white/10 text-slate-200"
                }`}
            >
              <PollBody
                msg={msg}
                isMe={isMe}
                userId={userId}
                onVote={onVote}
              />
            </div>
          ) : (
            <div
              className={`rounded-[10px] px-3.5 py-2.5 text-sm shadow-lg flex flex-col ${isMe
                ? "bg-gradient-to-br from-primary to-purple-600 text-white"
                : "bg-white/10 text-slate-200"
                }`}
            >
              <p className="whitespace-pre-wrap break-words">{msg.text}</p>
              <AnimatePresence initial={false}>
                {translating && (
                  <motion.div
                    key="translating"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 flex items-center gap-1.5 overflow-hidden border-t border-white/20 pt-2 text-xs opacity-70"
                  >
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Translating…
                  </motion.div>
                )}
                {!translating && translation && !translation.sameLanguage && (
                  <motion.div
                    key="translated"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 overflow-hidden border-t border-white/20 pt-2 text-xs"
                  >
                    <p className="italic leading-relaxed">{translation.text}</p>
                    {translation.detectedLanguage && (
                      <p className="mt-1 flex items-center gap-1 text-[10px] uppercase tracking-wide opacity-60">
                        <Globe className="h-3 w-3" />
                        Translated from {translation.detectedLanguage}
                      </p>
                    )}
                  </motion.div>
                )}
                {!translating && translation?.sameLanguage && (
                  <motion.div
                    key="same-language"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 overflow-hidden border-t border-white/20 pt-2 text-xs opacity-70"
                  >
                    Already in {translation.detectedLanguage || "your language"}
                  </motion.div>
                )}
                {!translating && translateError && (
                  <motion.div
                    key="translate-error"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 overflow-hidden border-t border-white/20 pt-2 text-xs opacity-70"
                  >
                    Couldn't translate this message.
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Edited label */}
          {msg.edited && !editing && (
            <span className="ml-1 text-[10px] italic opacity-60">(edited)</span>
          )}

          {/* Timestamp + status */}
          {!editing && (
            <div
              className={`mt-[4px] flex items-end gap-1 text-[11px] text-slate-300 opacity-90 ${isMe ? "justify-end" : "justify-start"
                }`}
            >
              {isGroupChat && !isMe && (
                <span className="mr-1 text-[10px] font-medium capitalize text-indigo-300/90">
                  {senderName}
                </span>
              )}
              <span className="leading-[14px]">
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              {getStatusIcon(msg.status, isMe)}
            </div>
          )}
        </div>

        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />

        {/* Reactions displayed under bubble */}
        {reactionEntries.length > 0 && !editing && (
          <div
            className={`mt-1 flex flex-wrap gap-1 ${isMe ? "justify-end" : "justify-start"}`}
          >
            {reactionEntries.map(([emoji, users]) => {
              const reactedByMe = users.includes(userId);
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onReact(msg.id, emoji)}
                  className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition ${reactedByMe
                    ? "border-primary/60 bg-primary/20 text-white"
                    : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                    }`}
                >
                  <span>{emoji}</span>
                  <span className="text-[11px]">{users.length}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}