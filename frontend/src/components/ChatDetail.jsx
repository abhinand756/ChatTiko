import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  ArrowLeft,
  Send,
  Phone,
  Video,
  Mic,
  Trash2,
  Paperclip,
  Users,
  X,
  Loader2,
  Ellipsis,
  Search,
  Smile,
  BellOff,
  Bell,
  Pin,
  Palette,
  Download,
  Eraser,
  Info,
  Clock,
  Star,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { resolveMediaUrl } from "../api/client";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import AttachmentTray from "./AttachmentTray";
import EmojiPicker from "./EmojiPicker";
import MessageInfoModal from "./MessageInfoModal";
import ConfirmationModal from "./ConfirmationModal";
import { showToast } from "../utils/toast";
import { getStarredMessages } from "../api/messageApi";

function formatRecordingTime(secs) {
  const mins = Math.floor(secs / 60);
  const remainderSecs = secs % 60;
  return `${mins}:${remainderSecs < 10 ? "0" : ""}${remainderSecs}`;
}

function getMessageDateLabel(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfMessageDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysAgo = Math.round((startOfToday - startOfMessageDay) / 86_400_000);

  if (daysAgo === 0) return "Today";
  if (daysAgo === 1) return "Yesterday";
  return date.toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

function MessageSkeletons() {
  return (
    <div className="space-y-3 py-2" aria-label="Loading messages" role="status">
      {["left", "right", "left", "right", "left", "left"].map((side, index) => (
        <div
          key={`${side}-${index}`}
          className={`flex ${side === "right" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`h-14 animate-pulse rounded-[14px] bg-white/10 ${
              index % 3 === 0 ? "w-52" : index % 3 === 1 ? "w-36" : "w-44"
            }`}
          />
        </div>
      ))}
      <span className="sr-only">Loading messages</span>
    </div>
  );
}

function describeMessage(msg) {
  if (msg.text) return msg.text;
  switch (msg.messageType) {
    case "image":
      return "<Image>";
    case "audio":
      return "<Voice message>";
    case "video":
      return "<Video>";
    case "circular_video":
      return "<Video note>";
    case "file":
      return `<File: ${msg.fileName || "attachment"}>`;
    case "location":
      return "<Location>";
    case "contact":
      return `<Contact: ${msg.fileName || "shared"}>`;
    default:
      return msg.poll ? `<Poll: ${msg.poll.question}>` : "<Message>";
  }
}

function buildExportText(data, partner) {
  const list = data?.messages || [];
  const lines = list.map((msg) => {
    const when = new Date(msg.createdAt || msg.timestamp).toLocaleString();
    return `[${when}] ${msg.senderId || "Unknown"}: ${describeMessage(msg)}`;
  });
  const exportedAt = new Date(data?.exportedAt || Date.now()).toLocaleString();
  return [
    `Chat with ${partner}`,
    `Exported at ${exportedAt}`,
    `Messages: ${data?.count ?? list.length}`,
    "",
    ...lines,
    "",
  ].join("\n");
}

const DISAPPEARING_OPTIONS = [
  { label: "Off", value: null },
  { label: "24 hours", value: 86400 },
  { label: "7 days", value: 604800 },
  { label: "90 days", value: 7776000 },
];

const WALLPAPERS = [
  { label: "Default", value: "" },
  { label: "Midnight", value: "linear-gradient(160deg,#0f2027,#203a43,#2c5364)" },
  { label: "Sunset", value: "linear-gradient(160deg,#ff512f,#dd2476)" },
  { label: "Forest", value: "linear-gradient(160deg,#11998e,#38ef7d)" },
  { label: "Ocean", value: "linear-gradient(160deg,#2193b0,#6dd5ed)" },
  { label: "Lavender", value: "linear-gradient(160deg,#8e2de2,#4a00e0)" },
];

function MenuItem({ Icon, label, onClick, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-left text-sm transition ${danger ? "text-rose-300 hover:bg-rose-500/10" : "text-slate-200 hover:bg-white/10"
        }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

export default function ChatDetail({
  selectedChat,
  userId,
  userProfile,
  allUsers = [],
  onlineUsers = [],
  messages,
  isLoadingMessages,
  inputMessage,
  setInputMessage,
  onSend,
  onSendAudio,
  onStartCall,
  onBack,
  isGroup,
  group,
  onGroupInfo,
  isTyping,
  typingUserName,
  onEditMessage,
  onDeleteMessage,
  onReactToMessage,
  onSendAttachment,
  onLoadMore,
  onReloadMessages,
  onStarMessage,
  onPinMessage,
  onForwardMessage,
  onSendLocation,
  onSendContact,
  onVoteInPoll,
  onOpenPollModal,
  replyToMessage,
  setReplyToMessage,
  conversationSettings = {},
  onUpdateConvSettings,
  clearChat,
  exportChat,
  onScheduleMessage,
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [inputMode, setInputMode] = useState("audio"); // 'audio' or 'video'
  const [recordingTime, setRecordingTime] = useState(0);
  const [pendingAttachment, setPendingAttachment] = useState(null);
  const [attachmentType, setAttachmentType] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showTray, setShowTray] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [headerMenu, setHeaderMenu] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [showSchedulePanel, setShowSchedulePanel] = useState(false);
  const [scheduleTime, setScheduleTime] = useState("");
  const [showStarred, setShowStarred] = useState(false);
  const [starredList, setStarredList] = useState([]);
  const [starredLoading, setStarredLoading] = useState(false);
  const [infoMsg, setInfoMsg] = useState(null);
  const [sendingLocation, setSendingLocation] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  const mediaRecorderRef = useRef(null);
  const videoRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const videoChunksRef = useRef([]);
  const timerRef = useRef(null);
  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const headerMenuRef = useRef(null);
  const inputBarRef = useRef(null);
  const messagesScrollRef = useRef(null);

  const [previewUrl, setPreviewUrl] = useState("");
  const [activeMessageDate, setActiveMessageDate] = useState("");

  useEffect(() => {
    const previewable =
      attachmentType === "image" ||
      attachmentType === "video" ||
      attachmentType === "circular_video";
    if (!pendingAttachment || !previewable) {
      const id = setTimeout(() => setPreviewUrl(""), 0);
      return () => clearTimeout(id);
    }
    const url = URL.createObjectURL(pendingAttachment);
    const id = setTimeout(() => setPreviewUrl(url), 0);
    return () => {
      clearTimeout(id);
      URL.revokeObjectURL(url);
    };
  }, [pendingAttachment, attachmentType]);

  const getSenderProfile = (senderId) => {
    if (senderId === userId) {
      return {
        name: userProfile?.displayName || userId,
        avatar: userProfile?.avatar ? resolveMediaUrl(userProfile.avatar) : "",
      };
    }
    const user = allUsers.find((u) => u.username === senderId);
    return {
      name: user?.displayName || senderId,
      avatar: user?.avatar ? resolveMediaUrl(user.avatar) : "",
    };
  };

  const isDisabled = !inputMessage.trim() && !pendingAttachment;

  // Close header menu on outside click
  useEffect(() => {
    if (!headerMenu) return;
    const onDocClick = (e) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target)) {
        setHeaderMenu(null);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [headerMenu]);

  // Close input-bar popups on outside click
  useEffect(() => {
    const anyOpen = showTray || showEmojiPicker || showSchedulePanel;
    if (!anyOpen) return;
    const onDocClick = (e) => {
      if (inputBarRef.current && !inputBarRef.current.contains(e.target)) {
        setShowTray(false);
        setShowEmojiPicker(false);
        setShowSchedulePanel(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [showTray, showEmojiPicker, showSchedulePanel]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.onstop = null;
        if (mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
        if (mediaRecorderRef.current.stream) {
          mediaRecorderRef.current.stream
            .getTracks()
            .forEach((track) => track.stop());
        }
      } catch {
        // ignore cleanup errors
      }
    }
    if (videoRecorderRef.current) {
      try {
        videoRecorderRef.current.onstop = null;
        if (videoRecorderRef.current.state !== "inactive") {
          videoRecorderRef.current.stop();
        }
        if (videoRecorderRef.current.stream) {
          videoRecorderRef.current.stream
            .getTracks()
            .forEach((track) => track.stop());
        }
      } catch {
        // ignore
      }
    }
    clearInterval(timerRef.current);
    setIsRecording(false);
    setIsRecordingVideo(false);
    setRecordingTime(0);
    audioChunksRef.current = [];
    videoChunksRef.current = [];
  }, []);

  useEffect(() => {
    return () => cancelRecording();
  }, [selectedChat, cancelRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access error:", err);
      showToast("Could not access microphone. Please check permissions.", "error");
    }
  };

  const stopAndSendRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) return;

    const recorder = mediaRecorderRef.current;
    const finalDuration = recordingTime;

    recorder.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, {
        type: "audio/webm",
      });
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = () => {
        const base64Audio = reader.result;
        if (onSendAudio) {
          onSendAudio(base64Audio, finalDuration);
        }
      };

      recorder.stream.getTracks().forEach((track) => track.stop());
    };

    recorder.stop();
    clearInterval(timerRef.current);
    setIsRecording(false);
    setRecordingTime(0);
  };

  const startVideoRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: { width: 400, height: 400, facingMode: "user" } });
      videoRecorderRef.current = new MediaRecorder(stream, { mimeType: "video/webm" });
      videoChunksRef.current = [];

      videoRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          videoChunksRef.current.push(event.data);
        }
      };

      videoRecorderRef.current.start();
      setIsRecordingVideo(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Camera access error:", err);
      showToast("Could not access camera. Please check permissions.", "error");
    }
  };

  const stopAndSendVideoRecording = () => {
    if (!videoRecorderRef.current || !isRecordingVideo) return;
    const recorder = videoRecorderRef.current;
    
    recorder.onstop = () => {
      const videoBlob = new Blob(videoChunksRef.current, { type: "video/webm" });
      const file = new File([videoBlob], "video_message.webm", { type: "video/webm" });
      if (onSendAttachment) {
        onSendAttachment(file, "circular_video");
      }
      recorder.stream.getTracks().forEach((track) => track.stop());
    };

    recorder.stop();
    clearInterval(timerRef.current);
    setIsRecordingVideo(false);
    setRecordingTime(0);
  };

  const handlePickFile = (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingAttachment(file);
    setAttachmentType(type);
    if (e.target) e.target.value = "";
  };

  const sendPendingAttachment = async () => {
    if (!pendingAttachment || uploading) return;
    setUploading(true);
    try {
      await onSendAttachment(pendingAttachment, attachmentType);
      setPendingAttachment(null);
      setAttachmentType(null);
    } catch (error) {
      showToast(error.message || "Could not upload attachment. Please try again.", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleSend = (e) => {
    if (pendingAttachment) {
      e?.preventDefault();
      sendPendingAttachment();
      return;
    }
    onSend(e);
  };

  const handleTrayAction = (action) => {
    if (action === "gallery") imageInputRef.current?.click();
    else if (action === "camera") cameraInputRef.current?.click();
    else if (action === "document") fileInputRef.current?.click();
    else if (action === "audio") startRecording();
    else if (action === "video") videoInputRef.current?.click();
    else if (action === "location") sendCurrentLocation();
    else if (action === "contact") setShowContactPicker(true);
    else if (action === "poll") onOpenPollModal?.();
  };

  const sendCurrentLocation = () => {
    if (!navigator.geolocation) {
      showToast("Geolocation is not supported by this browser.", "error");
      return;
    }
    setSendingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onSendLocation?.({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          label: "My location",
        });
        setSendingLocation(false);
      },
      (err) => {
        console.error("Geolocation error:", err);
        setSendingLocation(false);
        showToast("Could not retrieve your location.", "error");
      },
      { timeout: 8000 },
    );
  };

  const copyMessage = useCallback((msg) => {
    const text = msg.text || msg.fileName || msg.imageUrl || "Message";
    navigator.clipboard?.writeText(text).catch(() => { });
  }, []);

  const headerMenuItems = [
    ...(isGroup
      ? [{ key: "groupinfo", label: "Group Info", Icon: Info }]
      : [{ key: "contactinfo", label: "View Contact", Icon: Info }]),
    { key: "search", label: "Search in chat", Icon: Search },
    {
      key: "mute",
      label: conversationSettings.muted ? "Unmute notifications" : "Mute notifications",
      Icon: conversationSettings.muted ? Bell : BellOff,
    },
    { key: "disappearing", label: "Disappearing messages", Icon: Eraser },
    { key: "wallpaper", label: "Wallpaper", Icon: Palette },
    { key: "starred", label: "Starred messages", Icon: Star },
    { key: "export", label: "Export Chat", Icon: Download },
    { key: "clear", label: "Clear Chat", Icon: Trash2, danger: true },
  ];

  const handleHeaderAction = (key) => {
    setHeaderMenu(null);
    if (key === "groupinfo") onGroupInfo?.();
    else if (key === "contactinfo") setShowContactInfo(true);
    else if (key === "search") {
      setSearchQuery("");
      setSearchOpen(true);
    } else if (key === "mute")
      onUpdateConvSettings?.({ muted: !conversationSettings.muted });
    else if (key === "disappearing") setHeaderMenu("disappearing");
    else if (key === "wallpaper") setHeaderMenu("wallpaper");
    else if (key === "starred") {
      setStarredLoading(true);
      setShowStarred(true);
      getStarredMessages()
        .then((list) => setStarredList(list || []))
        .catch(() => setStarredList([]))
        .finally(() => setStarredLoading(false));
    }
    else if (key === "export") setConfirmAction("export");
    else if (key === "clear") setConfirmAction("clear");
  };

  const chatType = isGroup ? "group" : "user";

  const runExport = async () => {
    try {
      const data = await exportChat?.(selectedChat, chatType);
      const blob = new Blob([buildExportText(data, selectedChat)], {
        type: "text/plain;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedChat}-chat.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast(`Exported ${data?.count ?? 0} messages`, "success");
    } catch {
      showToast("Failed to export chat", "error");
    }
  };

  const runClear = async () => {
    try {
      await clearChat?.(selectedChat, chatType);
      await onReloadMessages?.();
      showToast("Chat cleared", "success");
    } catch {
      showToast("Failed to clear chat", "error");
    }
  };

  const visibleMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const q = searchQuery.trim().toLowerCase();
    return messages.filter((m) => (m.text || "").toLowerCase().includes(q));
  }, [messages, searchQuery]);

  const updateActiveMessageDate = useCallback(() => {
    const container = messagesScrollRef.current;
    if (!container) return;
    const messageNodes = [...container.querySelectorAll("[data-message-date]")];
    const containerTop = container.getBoundingClientRect().top;
    const visibleNode = messageNodes.find(
      (node) => node.getBoundingClientRect().bottom > containerTop + 40,
    );
    const label = (visibleNode || messageNodes.at(-1))?.dataset.messageDate || "";
    setActiveMessageDate((current) => (current === label ? current : label));
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(updateActiveMessageDate);
    return () => cancelAnimationFrame(frame);
  }, [visibleMessages, isLoadingMessages, updateActiveMessageDate]);

  const isSelf = selectedChat === userId;
  const displayName = isGroup
    ? group?.name || selectedChat
    : isSelf
      ? `${selectedChat} (You)`
      : selectedChat;

  const formatLocalDateTime = (d) => {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const openSchedulePanel = () => {
    setShowTray(false);
    setShowEmojiPicker(false);
    setScheduleTime(formatLocalDateTime(new Date(Date.now() + 3600 * 1000)));
    setShowSchedulePanel((v) => !v);
  };

  const applySchedulePreset = (preset) => {
    const d = new Date();
    if (preset === "hour") d.setHours(d.getHours() + 1);
    else if (preset === "tonight") {
      d.setHours(21, 0, 0, 0);
      if (d <= new Date()) d.setDate(d.getDate() + 1);
    } else if (preset === "tomorrow") {
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
    }
    setScheduleTime(formatLocalDateTime(d));
  };

  const wallpaperStyle = conversationSettings.wallpaper
    ? { background: conversationSettings.wallpaper }
    : {
      backgroundColor: "#070a15",
      backgroundImage:
        "radial-gradient(circle at 12% 0%, rgba(99,102,241,.12), transparent 28%), radial-gradient(circle at 90% 42%, rgba(168,85,247,.07), transparent 30%)",
    };

  if (!selectedChat) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-10 text-center text-slate-400"
        style={wallpaperStyle}
      >
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-[24px] bg-white/10 text-xl text-white">
          <Send className="h-8 w-8" />
        </div>
        <h2 className="mb-2 text-2xl font-semibold text-white">
          Select a conversation
        </h2>
        <p className="mx-auto max-w-[500px] text-sm text-slate-400">
          Choose a chat to send messages, share photos or files, or start a
          voice or video call.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/10 bg-[#080c1a]/95 px-2 py-3 shadow-[0_1px_0_rgba(255,255,255,.03)] backdrop-blur-xl sm:p-3">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-10 w-6 items-center justify-center text-white lg:hidden sm:h-11 sm:w-11"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={isGroup ? onGroupInfo : undefined}
              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br from-indigo-500 to-purple-600 text-lg font-semibold text-white sm:h-12 sm:w-12 sm:text-xl ${isGroup ? "cursor-pointer transition hover:opacity-90" : ""
                }`}
            >
              {isGroup ? (
                <Users className="h-5 w-5" />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </button>
            <button
              type="button"
              onClick={isGroup ? onGroupInfo : undefined}
              className={`min-w-0 text-left ${isGroup ? "flex-1 cursor-pointer transition hover:opacity-90" : ""}`}
            >
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold capitalize text-white sm:text-[18px]">
                  {displayName}
                </h2>
              {isGroup ? (
                <p className="truncate text-sm capitalize text-indigo-300">
                  {group?.members?.length || 0} members
                </p>
              ) : isTyping ? (
                <p className="text-sm capitalize text-primary">
                  {typingUserName || selectedChat} is typing
                  <span className="inline-block w-1 animate-pulse">…</span>
                </p>
              ) : (
                <p className="flex items-center gap-1 text-sm text-green-400">
                  online
                  <span className="mb-[0.5px] inline-block h-[6px] w-[6px] animate-pulse rounded-full bg-green-400"></span>
                </p>
              )}
              </div>
            </button>
          </div>

          <div className="flex flex-shrink-0 items-center gap-1 sm:gap-2">
            {!isSelf && !isGroup && (
              <>
                <button
                  type="button"
                  onClick={() => onStartCall?.(selectedChat, "voice")}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-[12px] border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10 hover:text-white sm:h-10 sm:w-10"
                  title="Voice Call"
                >
                  <Phone className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onStartCall?.(selectedChat, "video")}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-[12px] border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10 hover:text-white sm:h-10 sm:w-10"
                  title="Video Call"
                >
                  <Video className="h-4 w-4" />
                </button>
              </>
            )}
            <div className="relative" ref={headerMenuRef}>
              <button
                type="button"
                onClick={() =>
                  setHeaderMenu((v) => (v === "main" ? null : "main"))
                }
                className={`inline-flex h-9 w-9 items-center justify-center rounded-[12px] border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10 hover:text-white sm:h-10 sm:w-10 ${headerMenu ? "bg-white/10" : ""
                  }`}
                title="More options"
              >
                <Ellipsis className="h-5 w-5" />
              </button>

              <AnimatePresence>
                {headerMenu === "main" && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-12 z-30 w-56 overflow-hidden rounded-[14px] border border-white/10 bg-[#12172e] p-1 shadow-2xl"
                  >
                    {headerMenuItems.map(({ key, label, Icon, danger }) => (
                      <MenuItem
                        key={key}
                        Icon={Icon}
                        label={label}
                        danger={danger}
                        onClick={() => handleHeaderAction(key)}
                      />
                    ))}
                  </motion.div>
                )}
                {headerMenu === "disappearing" && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-12 z-30 w-64 overflow-hidden rounded-[14px] border border-white/10 bg-[#12172e] p-2 shadow-2xl"
                  >
                    <p className="px-2 pb-1.5 pt-1 text-xs font-semibold text-slate-300">
                      Disappearing messages
                    </p>
                    {DISAPPEARING_OPTIONS.map((opt) => {
                      const active =
                        Number(conversationSettings?.disappearing ?? 0) ===
                        Number(opt.value ?? 0);
                      return (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() => {
                            onUpdateConvSettings?.({
                              disappearingEnabled: opt.value !== null,
                              disappearing: opt.value,
                              disappearingDuration: opt.value,
                            });
                            setHeaderMenu(null);
                          }}
                          className={`flex w-full items-center justify-between rounded-[10px] px-3 py-2 text-sm transition ${active
                              ? "bg-primary/20 text-white"
                              : "text-slate-200 hover:bg-white/10"
                            }`}
                        >
                          {opt.label}
                          {active && <Pin className="h-3.5 w-3.5 text-primary" />}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
                {headerMenu === "wallpaper" && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-12 z-30 w-64 overflow-hidden rounded-[14px] border border-white/10 bg-[#12172e] p-2 shadow-2xl"
                  >
                    <p className="px-2 pb-1.5 pt-1 text-xs font-semibold text-slate-300">
                      Choose wallpaper
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {WALLPAPERS.map((w) => {
                        const active = conversationSettings?.wallpaper === w.value;
                        return (
                          <button
                            key={w.label}
                            type="button"
                            onClick={() => {
                              onUpdateConvSettings?.({ wallpaper: w.value });
                              setHeaderMenu(null);
                            }}
                            className={`flex h-14 flex-col items-center justify-end rounded-[10px] pb-1 text-[10px] transition ${active
                                ? "ring-2 ring-primary"
                                : w.value
                                  ? "hover:opacity-90"
                                  : "bg-white/10 hover:bg-white/15"
                              }`}
                            style={w.value ? { background: w.value } : undefined}
                          >
                            {!w.value && (
                              <span className="text-slate-300">{w.label}</span>
                            )}
                            {active && (
                              <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] text-white">
                                Active
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* In-chat search */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-2 flex items-center gap-2 rounded-[12px] border border-white/10 bg-[#0b1220] px-3 py-2">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search in ${displayName}...`}
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className="text-slate-400 transition hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Messages */}
      <div
        ref={messagesScrollRef}
        onScroll={updateActiveMessageDate}
        className="flex min-h-0 flex-1 flex-col space-y-2 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6"
        style={wallpaperStyle}
      >
        {!isLoadingMessages && activeMessageDate && (
          <div className="pointer-events-none sticky top-0 z-20 -mb-8 flex justify-center py-1">
            <span className="rounded-full border border-white/10 bg-[#111827]/90 px-3 py-1 text-[11px] font-medium text-slate-200 shadow-lg backdrop-blur">
              {activeMessageDate}
            </span>
          </div>
        )}
        {conversationSettings?.disappearing && (
          <div className="mx-auto rounded-full border border-white/10 bg-white/5 px-3 py-1 text-center text-[11px] text-slate-300">
            <Eraser className="mr-1 inline h-3 w-3" />
            Messages disappear after{" "}
            {DISAPPEARING_OPTIONS.find(
              (o) => Number(o.value) === Number(conversationSettings.disappearing),
            )?.label || "a while"}
          </div>
        )}

        {onLoadMore && messages.length >= 50 && (
          <div className="flex justify-center py-1">
            <button
              type="button"
              onClick={onLoadMore}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              Load earlier messages
            </button>
          </div>
        )}

        {isLoadingMessages && (
          <MessageSkeletons />
        )}

        {!isLoadingMessages && visibleMessages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-slate-400">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/5 text-2xl text-white uppercase">
              {isGroup ? (
                <Users className="h-8 w-8" />
              ) : (
                displayName.charAt(0)
              )}
            </div>
            <p className="text-center text-sm">
              {searchQuery.trim()
                ? "No messages match your search."
                : isGroup
                  ? `No messages yet in ${displayName}.`
                  : isSelf
                    ? "Start by sending a message to yourself."
                    : `No messages yet. Start the conversation with ${displayName}.`}
            </p>
          </div>
        )}

        {!isLoadingMessages &&
          visibleMessages.map((msg) => {
            if (
              Array.isArray(msg.deletedFor) &&
              msg.deletedFor.some(
                (u) => String(u).toLowerCase() === String(userId).toLowerCase(),
              )
            ) {
              return null;
            }
            if (msg.deleted) {
              const isMe = msg.senderId === userId;
              return (
                <div key={msg.id} data-message-date={getMessageDateLabel(msg.timestamp || msg.createdAt)}>
                  <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`rounded-[10px] px-3.5 py-2.5 text-sm italic opacity-60 ${isMe ? "bg-white/5 text-slate-400" : "bg-white/5 text-slate-500"}`}
                    >
                      {isMe ? "You deleted this message" : `${msg.senderId} deleted this message`}
                    </div>
                  </div>
                </div>
              );
            }

            const isMe = msg.senderId === userId;
            const senderInfo = getSenderProfile(msg.senderId);

            return (
              <div key={msg.id} data-message-date={getMessageDateLabel(msg.timestamp || msg.createdAt)}>
                <MessageBubble
                  msg={msg}
                  isMe={isMe}
                  userId={userId}
                  senderName={senderInfo.name}
                  senderAvatar={senderInfo.avatar}
                  isGroupChat={isGroup}
                  onEdit={onEditMessage}
                  onDelete={onDeleteMessage}
                  onReact={onReactToMessage}
                  onUploadImage={async (file, type) => {
                    await onSendAttachment(file, type);
                  }}
                  onReply={(m) => setReplyToMessage?.(m)}
                  onForward={(m) => onForwardMessage?.([String(m._id ?? m.id)])}
                  onStar={onStarMessage}
                  onPin={onPinMessage}
                  onVote={onVoteInPoll}
                  onInfo={(m) => setInfoMsg(m)}
                  onCopy={copyMessage}
                />
              </div>
            );
          })}

        <AnimatePresence mode="wait">
          {isTyping && (
            <TypingIndicator
              key="typing"
              name={isGroup ? typingUserName : typingUserName}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Input Bar */}
      <div ref={inputBarRef} className="sticky bottom-0 z-10 border-t border-white/10 bg-[#090d1b]/95 px-3 py-2.5 shadow-[0_-8px_24px_rgba(0,0,0,.16)] backdrop-blur-xl sm:px-4 sm:py-3">
        {/* Reply banner & attachment preview — float above the input bar, no layout shift */}
        <AnimatePresence>
          {(replyToMessage || pendingAttachment) && (
            <motion.div
              key="overlays"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full left-0 right-0 z-40 flex flex-col gap-1.5 px-3 pb-2 sm:px-4"
            >
              {/* Attachment preview */}
              {pendingAttachment && (
                <div className="flex items-center gap-3 rounded-[14px] border border-white/10 bg-[#111827]/95 backdrop-blur-sm px-4 py-3 shadow-xl">
                  {attachmentType === "image" ? (
                    <img
                      src={previewUrl}
                      alt="preview"
                      className="h-14 w-14 rounded-[10px] object-cover"
                    />
                  ) : attachmentType === "video" || attachmentType === "circular_video" ? (
                    <video
                      src={previewUrl}
                      className={`h-14 w-14 object-cover ${
                        attachmentType === "circular_video" ? "rounded-full" : "rounded-[10px]"
                      }`}
                      muted
                      playsInline
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-[10px] bg-purple-500/20 text-purple-300">
                      <Paperclip className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{pendingAttachment.name}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {(pendingAttachment.size / 1024).toFixed(1)} KB · Ready to send
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setPendingAttachment(null); setAttachmentType(null); }}
                    className="flex h-8 w-8 items-center justify-center rounded-[10px] text-slate-400 transition hover:bg-white/10 hover:text-white"
                    title="Remove"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Reply banner */}
              {replyToMessage && (
                <div className="flex items-center gap-3 rounded-[12px] border-l-[3px] border-indigo-400 bg-[#111827]/95 backdrop-blur-sm px-4 py-3 shadow-xl">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-indigo-300">
                      Replying to {replyToMessage.senderId === userId ? "yourself" : replyToMessage.senderId}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-300">
                      {replyToMessage.text || "Media"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyToMessage?.(null)}
                    className="flex h-8 w-8 items-center justify-center rounded-[8px] text-slate-400 transition hover:bg-white/10 hover:text-white"
                    title="Cancel reply"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {(isRecording || isRecordingVideo) ? (
          <div className="flex items-center gap-4 rounded-full border border-white/10 bg-[#111827] px-4 py-3 shadow-lg w-full">
            <button
              type="button"
              onClick={cancelRecording}
              className="flex h-10 w-10 items-center justify-center rounded-full text-red-400 transition hover:bg-red-500/10 hover:text-red-300 shrink-0"
              title="Delete Recording"
            >
              <Trash2 className="h-5 w-5" />
            </button>

            <div className="flex flex-1 items-center justify-center gap-3">
              <span className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
              <span className="min-w-[48px] font-mono text-sm text-white">
                {formatRecordingTime(recordingTime)}
              </span>
              {isRecordingVideo ? (
                 <span className="text-sm font-medium text-emerald-400 animate-pulse">Recording Video...</span>
              ) : (
                <div className="flex flex-1 items-center gap-[3px] overflow-hidden justify-center max-w-[120px]">
                  {Array.from({ length: 22 }).map((_, i) => (
                    <span
                      key={i}
                      className="w-[3px] animate-pulse rounded-full bg-slate-500"
                      style={{
                        height: `${8 + ((i * 7) % 14)}px`,
                        animationDelay: `${i * 40}ms`,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={isRecordingVideo ? stopAndSendVideoRecording : stopAndSendRecording}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white transition hover:scale-105 shrink-0"
              title="Send Recording"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <>
            {/* ── Absolute popups – float above input bar, no layout shift ── */}

            {/* Attachment Tray */}
            <AnimatePresence>
              {showTray && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-4 bottom-full mb-2 z-50"
                >
                  <AttachmentTray
                    onAction={handleTrayAction}
                    onClose={() => setShowTray(false)}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Emoji Picker */}
            <AnimatePresence>
              {showEmojiPicker && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-20 bottom-full mb-2 z-50"
                >
                  <EmojiPicker
                    onPick={(emoji) => {
                      setInputMessage((prev) => `${prev ?? ""}${emoji}`);
                      setShowEmojiPicker(false);
                    }}
                    onClose={() => setShowEmojiPicker(false)}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Schedule Panel */}
            <AnimatePresence>
              {showSchedulePanel && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-4 bottom-full mb-2 z-50 w-80 flex flex-col gap-2 rounded-[14px] border border-white/10 bg-[#111827] p-3 shadow-2xl"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <p className="text-sm font-medium text-white">Schedule message</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => applySchedulePreset("hour")}
                      className="rounded-[10px] border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/10"
                    >
                      In 1 hour
                    </button>
                    <button
                      type="button"
                      onClick={() => applySchedulePreset("tonight")}
                      className="rounded-[10px] border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/10"
                    >
                      Tonight 9 PM
                    </button>
                    <button
                      type="button"
                      onClick={() => applySchedulePreset("tomorrow")}
                      className="rounded-[10px] border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/10"
                    >
                      Tomorrow 9 AM
                    </button>
                    <input
                      type="datetime-local"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="rounded-[10px] border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 outline-none [color-scheme:dark]"
                    />
                    <button
                      type="button"
                      disabled={!inputMessage.trim() || !scheduleTime}
                      onClick={() => {
                        onScheduleMessage?.(inputMessage, new Date(scheduleTime).toISOString());
                        setShowSchedulePanel(false);
                        setInputMessage("");
                      }}
                      className="rounded-[10px] bg-gradient-to-r from-indigo-500 to-purple-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                    >
                      Schedule
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSend} className="flex items-center gap-2 sm:gap-3">
              <div className="flex h-12 flex-1 items-center rounded-full border border-white/10 bg-[#111827]/95 px-2.5 shadow-inner shadow-black/10 sm:h-14 sm:px-3">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handlePickFile(e, "image")}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handlePickFile(e, "image")}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => handlePickFile(e, "file")}
                />
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => handlePickFile(e, "video")}
                />
                <button
                  type="button"
                  onClick={() => { setShowEmojiPicker(false); setShowSchedulePanel(false); setShowTray((v) => !v); }}
                  className="mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-white sm:mr-2"
                  title="Attach"
                >
                  <Paperclip className="h-4.5 w-4.5" size={18} />
                </button>
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={`Message ${isSelf ? "yourself" : isGroup ? group?.name || "group" : selectedChat}...`}
                  className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => { setShowTray(false); setShowSchedulePanel(false); setShowEmojiPicker((v) => !v); }}
                  className="ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-white"
                  title="Emoji"
                >
                  <Smile className="h-4.5 w-4.5" size={18} />
                </button>
                <button
                  type="button"
                  onClick={openSchedulePanel}
                  className={`hidden h-9 w-9 shrink-0 items-center justify-center rounded-full transition sm:flex ${
                    showSchedulePanel
                      ? "bg-primary/20 text-primary"
                      : "text-slate-400 hover:bg-white/10 hover:text-white"
                  }`}
                  title="Schedule message"
                >
                  <Clock className="h-4.5 w-4.5" size={18} />
                </button>
              </div>

              <AnimatePresence mode="wait">
                {inputMessage.trim().length > 0 || pendingAttachment ? (
                  <motion.button
                    key="send"
                    type="submit"
                    disabled={isDisabled || uploading}
                    initial={{ scale: 0.6, rotate: -90, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    exit={{ scale: 0.6, rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/25 transition disabled:opacity-40 sm:h-14 sm:w-14"
                  >
                    {uploading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </motion.button>
                ) : (
                    <motion.button
                      key="mic"
                      type="button"
                      onClick={(e) => {
                         if (e.detail === 1) {
                           // Toggle input mode on single click
                           setInputMode(m => m === 'audio' ? 'video' : 'audio');
                         }
                      }}
                      onPointerDown={() => {
                        // Long press to start recording
                        timerRef.current = setTimeout(() => {
                           if (inputMode === 'audio') startRecording();
                           else startVideoRecording();
                        }, 300);
                      }}
                      onPointerUp={() => {
                        clearTimeout(timerRef.current);
                      }}
                      initial={{ scale: 0.6, rotate: 90, opacity: 0 }}
                      animate={{ scale: 1, rotate: 0, opacity: 1 }}
                      exit={{ scale: 0.6, rotate: -90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/25 sm:h-14 sm:w-14 group"
                      title="Hold to record, tap to switch mode"
                    >
                      {sendingLocation ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        inputMode === 'audio' ? <Mic className="h-5 w-5" /> : <Video className="h-5 w-5" />
                      )}
                    </motion.button>
                  )}
                </AnimatePresence>
              </form>
          </>
        )}
      </div>

      {/* Contact picker modal */}
      <AnimatePresence>
        {showContactPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowContactPicker(false)}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4"
            style={{ background: "rgba(4,6,20,0.2)", backdropFilter: "blur(10px)" }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[380px] overflow-hidden rounded-[20px] border border-white/10 bg-[#0f1428] p-4 text-white"
            >
              <h3 className="mb-3 text-base font-semibold">Send contact</h3>
              <div className="max-h-[320px] space-y-1 overflow-y-auto">
                {allUsers.length === 0 && (
                  <p className="py-6 text-center text-sm text-slate-500">
                    No contacts available
                  </p>
                )}
                {allUsers
                  .filter((u) => u.username !== userId)
                  .map((u) => (
                    <button
                      key={u.username}
                      type="button"
                      onClick={() => {
                        onSendContact?.({
                          name: u.displayName || u.username,
                          username: u.username,
                        });
                        setShowContactPicker(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-[12px] px-3 py-2 text-left transition hover:bg-white/5"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-sky-600 text-sm font-semibold text-white">
                        {(u.displayName || u.username).charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm capitalize text-white">
                          {u.displayName || u.username}
                        </p>
                        <p className="text-xs text-slate-400">@{u.username}</p>
                      </div>
                    </button>
                  ))}
              </div>
              <button
                type="button"
                onClick={() => setShowContactPicker(false)}
                className="mt-3 w-full rounded-[12px] border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-white/10"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <MessageInfoModal
        isOpen={!!infoMsg}
        onClose={() => setInfoMsg(null)}
        msg={infoMsg}
      />

      <ConfirmationModal
        isOpen={!!confirmAction}
        title={confirmAction === "clear" ? "Clear Chat" : "Export Chat"}
        message={
          confirmAction === "clear"
            ? "All messages in this chat will be removed from your view. This cannot be undone."
            : "Download this conversation as a plain text file?"
        }
        confirmLabel={confirmAction === "clear" ? "Clear" : "Export"}
        confirmVariant={confirmAction === "clear" ? "danger" : "primary"}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => {
          const action = confirmAction;
          setConfirmAction(null);
          if (action === "clear") runClear();
          else runExport();
        }}
      />

      {/* Starred messages modal */}
      <AnimatePresence>
        {showStarred && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowStarred(false)}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4"
            style={{ background: "rgba(4,6,20,0.2)", backdropFilter: "blur(10px)" }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[70vh] w-full max-w-[460px] flex-col overflow-hidden rounded-[20px] border border-white/10 bg-[#0f1428] text-white"
            >
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <h3 className="flex items-center gap-2 text-base font-semibold">
                  <Star className="h-4 w-4 text-amber-400" /> Starred messages
                </h3>
                <button
                  type="button"
                  onClick={() => setShowStarred(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {starredLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : starredList.length === 0 ? (
                  <p className="py-10 text-center text-sm text-slate-500">
                    No starred messages yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {starredList.map((m) => {
                      const mine = m.senderId === userId;
                      const label = mine
                        ? "You"
                        : getSenderProfile(m.senderId).name || m.senderId;
                      return (
                        <div
                          key={m._id}
                          className="rounded-[12px] border border-white/10 bg-white/[0.04] px-4 py-3"
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-slate-400">{label}</p>
                            <p className="text-[11px] text-slate-500">
                              {new Date(m.createdAt || m.timestamp).toLocaleString([], {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                          <p className="mt-1 text-sm text-slate-200">
                            {m.forwardedFrom && (
                              <span className="mr-1 text-[11px] font-medium italic text-indigo-300">
                                Forwarded
                              </span>
                            )}
                            {m.messageType === "image" ? (
                              <img
                                src={resolveMediaUrl(m.imageUrl)}
                                alt="photo"
                                className="mt-1 max-h-40 rounded-[10px] object-cover"
                              />
                            ) : m.messageType === "file" ? (
                              <span className="flex items-center gap-1 text-sm">
                                📎 {m.fileName || "File"}
                              </span>
                            ) : m.messageType === "audio" ? (
                              <span>🎵 Voice message</span>
                            ) : (
                              m.text || "Message"
                            )}
                          </p>
                          {m.edited && (
                            <span className="mt-0.5 block text-[11px] italic text-slate-500">
                              Edited
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View contact modal */}
      <AnimatePresence>
        {showContactInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowContactInfo(false)}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4"
            style={{ background: "rgba(4,6,20,0.2)", backdropFilter: "blur(10px)" }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[380px] overflow-hidden rounded-[20px] border border-white/10 bg-[#0f1428] text-white"
            >
              {(() => {
                const contact = allUsers.find((u) => u.username === selectedChat);
                const name = contact?.displayName || selectedChat;
                const online =
                  selectedChat !== userId &&
                  Array.isArray(onlineUsers) &&
                  onlineUsers.includes(selectedChat);
                return (
                  <>
                    <div className="flex flex-col items-center px-6 pb-5 pt-7 text-center">
                      <div className="relative">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-sky-600 text-2xl font-semibold text-white">
                          {name.charAt(0).toUpperCase()}
                        </div>
                        {online && (
                          <span className="absolute bottom-0.5 right-0.5 h-5 w-5 rounded-full border-2 border-[#0f1428] bg-emerald-500" />
                        )}
                      </div>
                      <h3 className="mt-3 text-lg font-semibold capitalize">{name}</h3>
                      <p className="text-sm text-slate-400">@{selectedChat}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {online
                          ? "Online"
                          : `Last seen ${contact?.lastSeen
                              ? new Date(contact.lastSeen).toLocaleString([], {
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "recently"}`}
                      </p>
                    </div>
                    <div className="space-y-3 px-6 pb-6">
                      {contact?.about && (
                        <div className="rounded-[14px] border border-white/10 bg-white/[0.04] px-4 py-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                            About
                          </p>
                          <p className="mt-1 text-sm text-slate-200">{contact.about}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setShowContactInfo(false);
                            onStartCall?.(selectedChat, "voice");
                          }}
                          className="flex items-center justify-center gap-2 rounded-[14px] border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10"
                        >
                          <Phone className="h-4 w-4" /> Call
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowContactInfo(false);
                            onStartCall?.(selectedChat, "video");
                          }}
                          className="flex items-center justify-center gap-2 rounded-[14px] border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10"
                        >
                          <Video className="h-4 w-4" /> Video
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowContactInfo(false)}
                        className="w-full rounded-[12px] border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-white/10"
                      >
                        Close
                      </button>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
