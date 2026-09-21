import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { io } from "socket.io-client";
import AuthPage from "./components/AuthPage";
import Sidebar from "./components/Sidebar";
import ConnectTabs from "./components/ConnectTabs";
import ChatDetail from "./components/ChatDetail";
import CallsScreen from "./components/CallsScreen";
import NotificationsScreen from "./components/NotificationsScreen";
import SettingsScreen from "./components/SettingsScreen";
import ProfileScreen from "./components/ProfileScreen";
import CallsDetail from "./components/CallsDetail";
import NotificationsDetail from "./components/NotificationsDetail";
import SettingsDetail from "./components/SettingsDetail";
import ProfileDetail from "./components/ProfileDetail";
import StatusScreen from "./components/StatusScreen";
import StatusDetail from "./components/StatusDetail";
import StatusViewer from "./components/StatusViewer";
import CreateStatusModal from "./components/CreateStatusModal";
import ForwardModal from "./components/ForwardModal";
import PollModal from "./components/PollModal";
import ConfirmationModal from "./components/ConfirmationModal";
import IncomingCallModal from "./components/IncomingCallModal";
import CallOverlay from "./components/CallOverlay";
import CreateGroupModal from "./components/CreateGroupModal";
import GroupInfoModal from "./components/GroupInfoModal";
import ToastHost from "./components/Toast";

import { useUsers } from "./hooks/useUsers";
import { useProfile } from "./hooks/useProfile";
import { useWebRTC } from "./hooks/useWebRTC";
import { useGroups } from "./hooks/useGroups";
import { getApiBase, resolveMediaUrl } from "./api/client";
import {
  blockUser,
  unblockUser,
  getBlockedUsers,
  getCallLogs,
  clearCallLogs,
  getProfile,
  changePassword,
  updatePreferences,
} from "./api/userApi";
import {
  getStatuses,
  createStatus,
  uploadStatusImage,
  viewStatus,
  reactStatus,
  deleteStatus,
} from "./api/statusApi";
import {
  updateConversationSettings,
  getConversationSettings,
  clearChat,
  exportChat,
  scheduleMessage,
} from "./api/conversationApi";
import { CircleDot, Eye, Users, Camera, Play } from "lucide-react";

const SOCKET_URL = getApiBase().replace(/\/+$/, "");

// Socket.IO path. Defaults to /socket.io — on Vercel this is proxied to the
// backend through the frontend's own origin, so the auth cookie stays first-party.
const SOCKET_PATH = import.meta.env.VITE_SOCKET_PATH || "/socket.io";

// polling first, then upgrade to websocket when the platform supports it.
// (Vercel's same-origin proxy handles websocket upgrades locally but may fall
// back to polling — both are supported, so realtime keeps working.)
const SOCKET_TRANSPORTS = import.meta.env.VITE_SOCKET_TRANSPORTS
  ? import.meta.env.VITE_SOCKET_TRANSPORTS.split(",")
  : ["polling", "websocket"];

function App() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const [authError, setAuthError] = useState("");
  const [requiresTwoStep, setRequiresTwoStep] = useState(false);
  const [twoStepPin, setTwoStepPin] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [panelView, setPanelView] = useState("chats");
  const [view, setView] = useState("chats");
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [profileEditingField, setProfileEditingField] = useState(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [callLogs, setCallLogs] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [statusViewer, setStatusViewer] = useState(null);
  const [selectedStatusUser, setSelectedStatusUser] = useState(null);
  const [showCreateStatusModal, setShowCreateStatusModal] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardMessageIds, setForwardMessageIds] = useState([]);
  const [showPollModal, setShowPollModal] = useState(false);
  const [convSettings, setConvSettings] = useState({});
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [prefs, setPrefs] = useState({
    notifications: true,
    sounds: true,
    readReceipts: true,
    darkMode: true,
    themeAccent: "violet",
  });

  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const seenMessageIds = useRef(new Set());
  const typingTimeoutRef = useRef(null);
  const viewerSessionRef = useRef(0);
  const lastCallNotifRef = useRef(null);
  const lastIncomingCallRef = useRef(null);

  const selectedUserRef = useRef(selectedUser);
  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  const selectedGroupRef = useRef(selectedGroup);
  useEffect(() => {
    selectedGroupRef.current = selectedGroup;
  }, [selectedGroup]);

  const { allUsers, loadUsers, sendRequest, accept, decline, unfriend } =
    useUsers();

  const allUsersRef = useRef([]);
  useEffect(() => {
    allUsersRef.current = allUsers;
  }, [allUsers]);
  const {
    profile,
    saving: profileSaving,
    saveProfile,
    changeAvatar,
    changeCover,
    resetProfile,
  } = useProfile(isJoined);
  const {
    groups,
    loadGroups,
    createNewGroup,
    removeGroup,
    addMembers,
    removeMember,
    fetchGroupMessages,
    editGroup,
    uploadFile,
  } = useGroups();
  const webRTC = useWebRTC(socketRef, userId);

  const activeGroup = groups.find((g) => g.name === selectedGroup);

  // ==================== DATA LOADERS ====================

  const refreshBlockedUsers = useCallback(async () => {
    try {
      const list = await getBlockedUsers();
      setBlockedUsers(list);
    } catch (e) {
      console.error("Failed to load blocked users:", e);
    }
  }, []);

  const onTogglePref = useCallback(async (key, value) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
    try {
      await updatePreferences({ [key]: value });
    } catch (e) {
      console.error("Failed to update pref:", e);
    }
  }, []);

  const onUnblockUser = useCallback(async (username) => {
    await unblockUser(username);
    await refreshBlockedUsers();
    await loadUsers();
  }, [refreshBlockedUsers, loadUsers]);

  const onBlockUser = useCallback(async (username) => {
    await blockUser(username);
    await refreshBlockedUsers();
    await loadUsers();
    if (selectedUser === username) setSelectedUser(null);
  }, [refreshBlockedUsers, loadUsers, selectedUser]);

  const onChangePassword = useCallback(async (currentPw, newPw) => {
    return changePassword(currentPw, newPw);
  }, []);

  // ==================== CONVERSATION HELPERS ====================

  const updateConversationWithMessage = useCallback(
    (msg, incrementUnread = false) => {
      setConversations((prev) => {
        const isSelfChat = msg.senderId === userId && msg.receiverId === userId;
        let effectivePartnerId =
          msg.senderId === userId ? msg.receiverId : msg.senderId;
        if (isSelfChat) effectivePartnerId = userId;

        const existingIndex = prev.findIndex(
          (c) => c.id === effectivePartnerId,
        );
        const updatedPreview =
          msg.senderId === userId && !isSelfChat
            ? `You: ${msg.text}`
            : msg.text;
        const timestampStr = msg.timestamp || new Date().toISOString();

        const newConversations = [...prev];

        if (existingIndex >= 0) {
          const [moved] = newConversations.splice(existingIndex, 1);
          moved.preview = updatedPreview;
          moved.timestamp = timestampStr;
          moved.unreadCount =
            (moved.unreadCount || 0) + (incrementUnread ? 1 : 0);
          newConversations.unshift(moved);
        } else {
          newConversations.unshift({
            id: effectivePartnerId,
            name: effectivePartnerId,
            preview: updatedPreview,
            timestamp: timestampStr,
            unreadCount: incrementUnread ? 1 : 0,
          });
        }
        return newConversations;
      });
    },
    [userId],
  );

  const replaceTempMessage = useCallback((tempId, message) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === tempId ? message : m)),
    );
  }, []);

  const markMessagesDelivered = useCallback((receiverId) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.receiverId === receiverId && m.status === "sent"
          ? { ...m, status: "delivered" }
          : m,
      ),
    );
  }, []);

  const markMessagesSeen = useCallback((receiverId) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.receiverId === receiverId && m.status !== "seen"
          ? { ...m, status: "seen" }
          : m,
      ),
    );
  }, []);

  // ==================== NOTIFICATIONS HELPERS ====================

  const getUserName = useCallback((username) => {
    const u = allUsersRef.current.find((x) => x.username === username);
    return u?.displayName || username;
  }, []);

  const getMessagePreview = useCallback((msg) => {
    const text = msg?.text?.trim?.();
    if (text) return text.length > 60 ? `${text.slice(0, 60)}…` : text;
    if (msg?.messageType === "image") return "📷 Photo";
    if (msg?.attachmentType) return "📎 Attachment";
    if (msg?.poll) return "📊 Poll";
    return "New message";
  }, []);

  const pushNotification = useCallback((n) => {
    setNotifications((prev) =>
      [
        {
          id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          read: false,
          time: "Just now",
          ...n,
        },
        ...prev,
      ].slice(0, 50),
    );
  }, []);

  const markNotificationRead = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((x) => (x.id === id ? { ...x, read: true } : x)),
    );
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((x) => ({ ...x, read: true })));
  }, []);

  // ==================== SOCKET SETUP ====================

  useEffect(() => {
    if (!isJoined) return;

    const newSocket = io(SOCKET_URL, {
      withCredentials: true,
      path: SOCKET_PATH,
      transports: SOCKET_TRANSPORTS,
      query: { userId },
    });
    socketRef.current = newSocket;

    newSocket.on("getOnlineUsers", (users) => setOnlineUsers(users));

    newSocket.on("privateMessage", (msg) => {
      const msgId = String(msg.id);
      if (seenMessageIds.current.has(msgId)) return;
      seenMessageIds.current.add(msgId);
      setMessages((prev) => [...prev, msg]);
      updateConversationWithMessage(msg, true);
      if (
        String(msg.senderId) !== String(userId) &&
        String(msg.senderId) !== String(selectedUserRef.current)
      ) {
        pushNotification({
          id: `msg-${msgId}`,
          type: "message",
          from: msg.senderId,
          title: "New message",
          body: `${getUserName(msg.senderId)}: ${getMessagePreview(msg)}`,
        });
      }
    });

    newSocket.on("groupMessage", (msg) => {
      if (msg.groupId === selectedGroup) {
        const msgId = String(msg.id);
        if (seenMessageIds.current.has(msgId)) return;
        seenMessageIds.current.add(msgId);
        setMessages((prev) => [...prev, msg]);
      }
      if (
        String(msg.senderId) !== String(userId) &&
        String(msg.groupId) !== String(selectedGroupRef.current)
      ) {
        pushNotification({
          id: `gmsg-${String(msg.id)}`,
          type: "message",
          from: msg.groupId,
          title: "New group message",
          body: `${getUserName(msg.senderId)}: ${getMessagePreview(msg)}`,
        });
      }
    });

    newSocket.on("messageSent", ({ tempId, message }) => {
      replaceTempMessage(tempId, message);
    });

    newSocket.on("groupMessageSent", ({ tempId, message }) => {
      replaceTempMessage(tempId, message);
    });

    newSocket.on("forwarded", ({ message: fwd, targetType, targetId }) => {
      const msgId = String(fwd.id);
      if (seenMessageIds.current.has(msgId)) return;
      seenMessageIds.current.add(msgId);
      const isActive =
        targetType === "group"
          ? selectedGroup === targetId
          : selectedUser === targetId;
      if (isActive) {
        setMessages((prev) => [...prev, fwd]);
      }
      updateConversationWithMessage(fwd);
    });

    newSocket.on("messagesDelivered", ({ receiverId }) => {
      markMessagesDelivered(receiverId);
    });

    newSocket.on("messagesSeen", ({ receiverId }) => {
      markMessagesSeen(receiverId);
    });

    newSocket.on("messageUpdated", (update) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (String(m.id) !== String(update.id)) return m;
          return {
            ...m,
            ...(update.text !== undefined && { text: update.text }),
            ...(update.deleted !== undefined && { deleted: update.deleted }),
            ...(update.deletedFor !== undefined && { deletedFor: update.deletedFor }),
            ...(update.edited !== undefined && { edited: update.edited }),
            ...(update.reactions !== undefined && { reactions: update.reactions }),
            ...(update.starredBy !== undefined && { starredBy: update.starredBy }),
            ...(update.pinned !== undefined && { pinned: update.pinned }),
            ...(update.status !== undefined && { status: update.status }),
          };
        }),
      );
    });

    newSocket.on("messageExpired", ({ id }) => {
      setMessages((prev) => prev.filter((m) => String(m.id) !== String(id)));
    });

    newSocket.on("newStatus", () => {
      getStatuses().then(setStatuses).catch(() => { });
    });

    newSocket.on("statusReact", (statusUpdate) => {
      setStatuses((prev) =>
        prev.map((s) =>
          String(s._id ?? s.id) === String(statusUpdate.id)
            ? { ...s, reactions: statusUpdate.reactions }
            : s,
        ),
      );
    });

    newSocket.on("statusDeleted", ({ id }) => {
      setStatuses(
        (prev) => prev.filter((s) => String(s._id ?? s.id) !== String(id)),
      );
    });

    newSocket.on("callLogUpdated", () => {
      getCallLogs()
        .then((logs) => {
          setCallLogs(logs);
          const latest = logs?.[0];
          if (
            latest &&
            String(latest.receiverId) === String(userId) &&
            ["missed", "canceled"].includes(latest.status) &&
            String(latest.id) !== String(lastCallNotifRef.current)
          ) {
            lastCallNotifRef.current = latest.id;
            pushNotification({
              id: `call-${String(latest.id)}`,
              type: "call",
              from: latest.callerId,
              title: "Missed call",
              body: `${latest.callType === "video" ? "Video" : "Voice"} call from ${getUserName(latest.callerId)}`,
            });
          }
        })
        .catch(() => { });
    });

    newSocket.on("pollUpdate", (pollUpdate) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (String(m._id ?? m.id) !== String(pollUpdate.id)) return m;
          return { ...m, poll: pollUpdate.poll };
        }),
      );
    });

    newSocket.on("groupSeenUpdate", ({ readMap }) => {
      if (!readMap) return;
      setMessages((prev) =>
        prev.map((m) => {
          const readBy = readMap[String(m._id ?? m.id)];
          return readBy ? { ...m, readBy } : m;
        }),
      );
    });

    newSocket.on("userTyping", ({ from, groupId }) => {
      if (groupId) {
        setTypingUsers((prev) => ({
          ...prev,
          [`${groupId}:${from}`]: true,
        }));
      } else {
        setTypingUsers((prev) => ({ ...prev, [from]: true }));
      }
    });

    newSocket.on("userStopTyping", ({ from, groupId }) => {
      if (groupId) {
        setTypingUsers((prev) => {
          const next = { ...prev };
          delete next[`${groupId}:${from}`];
          return next;
        });
      } else {
        setTypingUsers((prev) => {
          const next = { ...prev };
          delete next[from];
          return next;
        });
      }
    });

    return () => {
      newSocket.close();
    };
  }, [isJoined, userId, selectedGroup, selectedUser, updateConversationWithMessage, replaceTempMessage, markMessagesDelivered, markMessagesSeen, pushNotification, getUserName, getMessagePreview]);

  // ==================== DRAFT HANDLING ====================

  useEffect(() => {
    const partner = selectedUser || selectedGroup;
    let cancelled = false;
    const apply = () => {
      if (cancelled) return;
      if (partner) {
        const draft = localStorage.getItem(`draft_${userId}_${partner}`);
        setInputMessage(draft || "");
      } else {
        setInputMessage("");
      }
    };
    Promise.resolve().then(apply);
    return () => {
      cancelled = true;
    };
  }, [selectedUser, selectedGroup, userId]);

  useEffect(() => {
    const partner = selectedUser || selectedGroup;
    if (partner) {
      if (inputMessage.trim()) {
        localStorage.setItem(`draft_${userId}_${partner}`, inputMessage);
      } else {
        localStorage.removeItem(`draft_${userId}_${partner}`);
      }
    }
  }, [inputMessage, selectedUser, selectedGroup, userId]);

  // ==================== SESSION CHECK ====================

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch(`${SOCKET_URL}/api/me`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            setUserId(data.username);
            setSelectedUser(null);
            setIsJoined(true);
          }
        }
      } catch { /* ignore */ }
      finally {
        setIsCheckingSession(false);
      }
    };
    checkSession();
  }, []);

  // ==================== DATA FETCHING ON JOIN ====================

  useEffect(() => {
    if (!isJoined) return;
    const fetchData = async () => {
      try {
        const [convRes, profileData] = await Promise.all([
          fetch(`${SOCKET_URL}/api/conversations`, { credentials: "include" }),
          getProfile().catch(() => null),
        ]);
        if (convRes.ok) setConversations(await convRes.json());
        if (profileData?.preferences) setPrefs(profileData.preferences);
      } catch (e) {
        console.error("Failed to load data:", e);
      }
    };
    loadUsers();
    loadGroups();
    fetchData();
    // Fetch call logs and blocked users (async, non-blocking)
    getCallLogs().then(setCallLogs).catch(() => { });
    getBlockedUsers().then(setBlockedUsers).catch(() => { });
    getStatuses().then(setStatuses).catch(() => { });
  }, [isJoined, loadUsers, loadGroups, refreshBlockedUsers]);

  // ==================== MESSAGE LOADING ====================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load direct messages
  useEffect(() => {
    if (!selectedUser || selectedGroup) return;
    let active = true;
    const loadMessages = async () => {
      setIsLoadingMessages(true);
      try {
        const response = await fetch(
          `${SOCKET_URL}/api/messages/${selectedUser}`,
          { credentials: "include" },
        );
        if (response.ok && active) {
          const msgs = await response.json();
          if (!active) return;
          setMessages(
            msgs.map((m) => ({ ...m, id: m._id, timestamp: m.createdAt })),
          );
        }
      } catch (e) {
        console.error("Failed to fetch messages:", e);
      } finally {
        if (active) setIsLoadingMessages(false);
      }
    };
    loadMessages();
    return () => { active = false; };
  }, [selectedUser, selectedGroup]);

  // Load group messages
  useEffect(() => {
    if (!selectedGroup) return;
    let active = true;
    const loadMessages = async () => {
      setIsLoadingMessages(true);
      try {
        const msgs = await fetchGroupMessages(selectedGroup);
        if (!active) return;
        setMessages(
          msgs.map((m) => ({ ...m, id: m._id, timestamp: m.createdAt })),
        );
        socketRef.current?.emit("markGroupSeen", { groupId: selectedGroup });
      } catch (e) {
        console.error("Failed to fetch group messages:", e);
      } finally {
        if (active) setIsLoadingMessages(false);
      }
    };
    loadMessages();
    return () => { active = false; };
  }, [selectedGroup, fetchGroupMessages]);

  // ==================== LOAD OLDER MESSAGES ====================

  const loadOlderMessages = useCallback(async () => {
    const oldest = messages[0];
    const before = oldest?._id ?? oldest?.id;
    if (!before) return;
    try {
      let older = [];
      if (selectedGroup) {
        older = await fetchGroupMessages(selectedGroup, { before, limit: 50 });
      } else if (selectedUser) {
        const res = await fetch(
          `${SOCKET_URL}/api/messages/${selectedUser}?before=${encodeURIComponent(before)}&limit=50`,
          { credentials: "include" },
        );
        if (res.ok) older = await res.json();
      }
      const seen = new Set(messages.map((m) => String(m._id ?? m.id)));
      const fresh = (older || []).filter(
        (m) => !seen.has(String(m._id ?? m.id)),
      );
      if (fresh.length > 0) {
        setMessages((prev) => [...fresh, ...prev]);
      }
    } catch (e) {
      console.error("Failed to load earlier messages:", e);
    }
  }, [messages, selectedUser, selectedGroup, fetchGroupMessages]);

  const reloadMessages = useCallback(async () => {
    setIsLoadingMessages(true);
    try {
      let msgs = [];
      if (selectedGroup) {
        msgs = await fetchGroupMessages(selectedGroup);
      } else if (selectedUser) {
        const response = await fetch(
          `${SOCKET_URL}/api/messages/${selectedUser}`,
          { credentials: "include" },
        );
        if (response.ok) msgs = await response.json();
      } else {
        return;
      }
      setMessages(
        (msgs || []).map((m) => ({ ...m, id: m._id, timestamp: m.createdAt })),
      );
    } catch (e) {
      console.error("Failed to reload messages:", e);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [selectedUser, selectedGroup, fetchGroupMessages]);

  // ==================== SEEN HANDLING ====================

  useEffect(() => {
    if (selectedUser && !selectedGroup && socketRef.current) {
      socketRef.current.emit("markSeen", { senderId: selectedUser });
      setConversations((prev) =>
        prev.map((c) => (c.id === selectedUser ? { ...c, unreadCount: 0 } : c)),
      );
    }
  }, [selectedUser, messages, selectedGroup]);

  // ==================== CHAT LIST DATA ====================

  const selfConversation = conversations.find((conv) => conv.id === userId) || {
    id: userId,
    name: `${userId} (You)`,
    preview: "Message yourself...",
    timestamp: "",
  };
  selfConversation.name = `${userId} (You)`;

  const otherConversations = conversations.filter((conv) => conv.id !== userId);

  const chats = [
    selfConversation,
    ...otherConversations,
    ...allUsers
      .filter(
        (user) =>
          user.username !== userId &&
          !conversations.some((conv) => conv.id === user.username),
      )
      .map((user) => ({
        id: user.username,
        name: user.username,
        preview: "Start a conversation",
        timestamp: "",
      })),
  ].map((c) => {
    const settings = convSettings[`user:${c.id}`] || {};
    const draft = localStorage.getItem(`draft_${userId}_${c.id}`);
    const preview = draft ? `[Draft]: ${draft}` : c.preview;
    return { ...c, preview, pinned: !!settings.pinned, muted: !!settings.muted };
  });

  const myStatuses = statuses.filter((s) => String(s.userId) === String(userId));

  const getUserInfo = (ownerId) => {
    if (ownerId === userId) {
      return { name: "My status", isMe: true, avatar: "" };
    }
    const u = allUsers.find((x) => x.username === ownerId);
    return {
      name: u?.displayName || u?.username || ownerId,
      avatar: u?.avatar || "",
      isMe: false,
    };
  };

  const statusGroups = useMemo(() => {
    const map = new Map();
    statuses.forEach((s) => {
      const list = map.get(s.userId) || [];
      list.push(s);
      map.set(s.userId, list);
    });
    const recent = [];
    const seen = [];
    map.forEach((list, owner) => {
      list.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      const viewed = list.every((s) => s.viewers?.includes(userId));
      const info = getUserInfo(owner);
      const entry = {
        userId: owner,
        name: info.name,
        avatar: info.avatar,
        isMe: info.isMe,
        list,
        viewed,
      };
      (viewed ? seen : recent).push(entry);
    });
    return [...recent, ...seen];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statuses, userId, allUsers]);

  const activeStatusUser = selectedStatusUser || "";
  const activeStatusGroup =
    statusGroups.find((g) => g.userId === activeStatusUser) || null;

  const activeChatMessages = messages.filter((msg) => {
    if (selectedGroup) {
      return msg.groupId === selectedGroup || msg.receiverId === selectedGroup;
    }
    if (!selectedUser) return false;
    return (
      (msg.senderId === userId && msg.receiverId === selectedUser) ||
      (msg.senderId === selectedUser && msg.receiverId === userId)
    );
  });

  // ==================== AUTH ====================

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError("");
    if (!userId.trim() || !password.trim()) {
      setAuthError("Username and password are required.");
      return;
    }
    if (requiresTwoStep && !twoStepPin.trim()) {
      setAuthError("Enter your PIN to continue.");
      return;
    }
    try {
      const res = await fetch(`${SOCKET_URL}/api/${authMode}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: userId.trim(),
          password,
          ...(requiresTwoStep ? { pin: twoStepPin.trim() } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || "Authentication failed.");
        return;
      }
      if (data.requiresTwoStep) {
        setRequiresTwoStep(true);
        setPassword("");
        setTwoStepPin("");
        setAuthError("");
        return;
      }
      setIsJoined(true);
      setSelectedUser(null);
      setRequiresTwoStep(false);
      setTwoStepPin("");
      setPassword("");
      setUserId(data.username);
    } catch (error) {
      setAuthError("Unable to connect to the server.");
      console.error("Authentication error:", error);
    }
  };

  // ==================== ACTION HANDLERS ====================

  const sendConnectionRequest = async (receiverId) => {
    await sendRequest(receiverId);
  };

  const acceptConnectionRequest = async (requestId) => {
    await accept(requestId);
  };

  const declineConnectionRequest = async (requestId) => {
    await decline(requestId);
  };

  const handleClearCalls = async () => {
    try {
      await clearCallLogs();
      setCallLogs([]);
    } catch (error) {
      console.error("Failed to clear call logs:", error);
    }
  };

  const unfriendUser = async (targetUsername) => {
    await unfriend(targetUsername);
    if (selectedUser === targetUsername) setSelectedUser(null);
  };

  const handleViewChange = (nextView) => {
    setView(nextView);
    setIsMobileSidebarOpen(false);
    setSelectedItemId(null);
    setStatusViewer(null);
    setSelectedStatusUser(null);
    if (nextView !== "chats") {
      setSelectedUser(null);
      setSelectedGroup(null);
    }
  };

  const handleLogout = async () => {
    await fetch(`${SOCKET_URL}/api/logout`, {
      method: "POST",
      credentials: "include",
    });
    setIsJoined(false);
    setUserId("");
    setSelectedUser(null);
    setSelectedGroup(null);
    setMessages([]);
    setConversations([]);
    setPanelView("chats");
    setPassword("");
    resetProfile();
  };

  // ==================== CONVERSATION SETTINGS ====================

  const loadConvSettings = useCallback(async (partnerId, type, force = false) => {
    const key = `${type}:${partnerId}`;
    if (convSettings[key] && !force) return;
    try {
      const s = await getConversationSettings(partnerId, type);
      setConvSettings((prev) => ({
        ...prev,
        [key]: {
          pinned: !!s?.pinnedAt,
          muted: !!s?.muted,
          disappearing: s?.disappearingEnabled ? s?.disappearingDuration : null,
          wallpaper: s?.wallpaper || "",
        },
      }));
    } catch (e) {
      console.error("Failed to load conversation settings:", e);
    }
  }, [convSettings]);

  const handleUpdateConvSettings = useCallback(
    async (partnerId, settings, type = "user") => {
      const key = `${type}:${partnerId}`;
      setConvSettings((prev) => ({ ...prev, [key]: { ...prev[key], ...settings } }));
      try {
        await updateConversationSettings(partnerId, settings, type);
      } catch (e) {
        console.error("Failed to update conversation settings:", e);
      }
    },
    [],
  );

  const handleScheduleMessage = useCallback(
    async (text, scheduledAt) => {
      const receiverId = selectedUser || selectedGroup;
      if (!text.trim() || !receiverId) return;
      try {
        await scheduleMessage(
          receiverId,
          text,
          scheduledAt,
          selectedGroup ? "group" : "user",
        );
        setInputMessage("");
        setReplyToMessage(null);
      } catch (e) {
        console.error("Failed to schedule message:", e);
      }
    },
    [selectedUser, selectedGroup],
  );

  // ==================== CHAT ACTIONS ====================

  const handleSelectUser = useCallback(
    (userOrGroup) => {
      // Check if it's a group
      const isGroupItem = groups.some((g) => g.name === userOrGroup);
      if (isGroupItem) {
        setSelectedGroup(userOrGroup);
        setSelectedUser(null);
        setReplyToMessage(null);
        loadConvSettings(userOrGroup, "group");
      } else {
        setSelectedUser(userOrGroup);
        setSelectedGroup(null);
        setReplyToMessage(null);
        loadConvSettings(userOrGroup, "user");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [groups],
  );

  // ==================== NOTIFICATIONS INTERACTION ====================

  const handleNotificationClick = useCallback(
    (n) => {
      markNotificationRead(n?.id);
      if (n?.type === "message" && n?.from) {
        setView("chats");
        handleSelectUser(n.from);
      } else if (n?.type === "call" && n?.from) {
        setView("calls");
        setSelectedItemId(null);
      }
    },
    [markNotificationRead, handleSelectUser],
  );

  // Incoming ringing call notification
  useEffect(() => {
    if (webRTC.callState === "receiving" && webRTC.partner) {
      if (lastIncomingCallRef.current === webRTC.partner) return;
      lastIncomingCallRef.current = webRTC.partner;
      pushNotification({
        type: "call",
        from: webRTC.partner,
        title: "Incoming call",
        body: `${webRTC.callType === "video" ? "Video" : "Voice"} call from ${getUserName(webRTC.partner)}`,
      });
    } else if (webRTC.callState !== "receiving") {
      lastIncomingCallRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [webRTC.callState, webRTC.partner, webRTC.callType]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!selectedUser && !selectedGroup) return;

    if (inputMessage.trim() && socketRef.current) {
      const newMsg = {
        id: Date.now(),
        text: inputMessage,
        senderId: userId,
        receiverId: selectedUser || selectedGroup,
        groupId: selectedGroup || undefined,
        timestamp: new Date().toISOString(),
        status: "sent",
        ...(replyToMessage
          ? {
            replyTo: {
              id: replyToMessage._id ?? replyToMessage.id,
              text: replyToMessage.text,
              senderId: replyToMessage.senderId,
            },
          }
          : {}),
      };

      if (selectedGroup) {
        socketRef.current.emit("sendGroupMessage", newMsg);
        setMessages((prev) => [...prev, { ...newMsg, status: "delivered" }]);
      } else {
        socketRef.current.emit("sendMessage", newMsg);
        setMessages((prev) => [...prev, newMsg]);
        updateConversationWithMessage(newMsg);
      }

      setInputMessage("");
      setReplyToMessage(null);
    }
  };

  const sendAudioMessage = (audioUrl, duration) => {
    const receiverId = selectedUser || selectedGroup;
    if (!receiverId || !socketRef.current) return;

    const newMsg = {
      id: Date.now(),
      text: "🎵 Voice message",
      messageType: "audio",
      audioUrl,
      audioDuration: duration,
      senderId: userId,
      receiverId,
      groupId: selectedGroup || undefined,
      timestamp: new Date().toISOString(),
      status: "sent",
      ...(replyToMessage
        ? {
          replyTo: {
            id: replyToMessage._id ?? replyToMessage.id,
            text: replyToMessage.text,
            senderId: replyToMessage.senderId,
          },
        }
        : {}),
    };

    if (selectedGroup) {
      socketRef.current.emit("sendGroupMessage", newMsg);
      setMessages((prev) => [...prev, { ...newMsg, status: "delivered" }]);
    } else {
      socketRef.current.emit("sendMessage", newMsg);
      setMessages((prev) => [...prev, newMsg]);
      updateConversationWithMessage(newMsg);
    }
  };

  const sendAttachment = async (file, type) => {
    const receiverId = selectedUser || selectedGroup;
    if (!receiverId || !socketRef.current) return;

    try {
      const formData = new FormData();
      formData.append("file", file);
      const url = selectedGroup
        ? `${SOCKET_URL}/api/groups/${encodeURIComponent(selectedGroup)}/upload`
        : `${SOCKET_URL}/api/messages/upload`;
      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();

      const isImage = type === "image";
      const isVideo = type === "video";
      const isCircularVideo = type === "circular_video";

      const newMsg = {
        id: Date.now(),
        text: isImage
          ? ""
          : (isVideo || isCircularVideo)
            ? "📹 Video"
            : `📎 ${file.name}`,
        messageType: isImage ? "image" : isVideo ? "video" : isCircularVideo ? "circular_video" : "file",
        content: isImage ? "image" : (isVideo || isCircularVideo) ? "video" : "file",
        imageUrl: isImage || isVideo || isCircularVideo ? data.url : "",
        fileUrl: (isVideo || isCircularVideo) ? "" : !isImage ? data.url : "",
        fileName: (isVideo || isCircularVideo) ? file.name : data.fileName,
        fileSize: (isVideo || isCircularVideo) ? file.size : data.fileSize,
        fileType: data.fileType,
        senderId: userId,
        receiverId,
        groupId: selectedGroup || undefined,
        timestamp: new Date().toISOString(),
        status: "sent",
        ...(replyToMessage
          ? {
            replyTo: {
              id: replyToMessage._id ?? replyToMessage.id,
              text: replyToMessage.text,
              senderId: replyToMessage.senderId,
            },
          }
          : {}),
      };

      if (selectedGroup) {
        socketRef.current.emit("sendGroupMessage", newMsg);
        setMessages((prev) => [...prev, { ...newMsg, status: "delivered" }]);
      } else {
        socketRef.current.emit("sendMessage", newMsg);
        setMessages((prev) => [...prev, newMsg]);
        updateConversationWithMessage(newMsg);
      }
    } catch (e) {
      console.error("Failed to send attachment:", e);
    }
  };

  const editMessage = useCallback(
    (messageId, text) => {
      if (socketRef.current) {
        socketRef.current.emit("editMessage", { messageId, text });
      }
    },
    [],
  );

  const deleteMessage = useCallback(
    (messageId, forEveryone = true) => {
      if (socketRef.current) {
        socketRef.current.emit("deleteMessage", { messageId, forEveryone });
      }
    },
    [],
  );

  const reactToMessage = useCallback(
    (messageId, emoji) => {
      if (socketRef.current) {
        socketRef.current.emit("reactToMessage", { messageId, emoji });
      }
    },
    [],
  );

  // ==================== ADVANCED MESSAGE ACTIONS ====================

  const starMessage = useCallback((messageId) => {
    socketRef.current?.emit("starMessage", { messageId });
  }, []);

  const pinMessage = useCallback((messageId) => {
    socketRef.current?.emit("pinMessage", { messageId });
  }, []);

  const handleOpenForward = useCallback((messageIds) => {
    setForwardMessageIds(messageIds);
    setShowForwardModal(true);
  }, []);

  const handleForwardSelect = useCallback(
    async (targetIds) => {
      for (const targetId of targetIds) {
        const isGroupTarget = groups.some((g) => g.name === targetId);
        socketRef.current?.emit("forwardMessage", {
          messageIds: forwardMessageIds,
          targetType: isGroupTarget ? "group" : "user",
          targetId,
        });
      }
      setShowForwardModal(false);
      setForwardMessageIds([]);
    },
    [groups, forwardMessageIds],
  );

  const voteInPoll = useCallback(
    (messageId, optionIndex) => {
      socketRef.current?.emit("pollVote", { messageId, optionIndex });
    },
    [],
  );

  const handleCreatePoll = useCallback(
    (question, options, multiple) => {
      const receiverId = selectedUser || selectedGroup;
      if (!receiverId || !socketRef.current) return;
      const newMsg = {
        id: Date.now(),
        text: `📊 ${question}`,
        senderId: userId,
        receiverId,
        groupId: selectedGroup || undefined,
        timestamp: new Date().toISOString(),
        status: "sent",
        messageType: "text",
        poll: {
          question,
          options: options.map((o) => ({ text: o, votes: [] })),
          multiple,
          anonymous: false,
          closed: false,
        },
      };
      if (selectedGroup) {
        socketRef.current.emit("sendGroupMessage", newMsg);
        setMessages((prev) => [...prev, { ...newMsg, status: "delivered" }]);
      } else {
        socketRef.current.emit("sendMessage", newMsg);
        setMessages((prev) => [...prev, newMsg]);
        updateConversationWithMessage(newMsg);
      }
    },
    [selectedUser, selectedGroup, userId, updateConversationWithMessage],
  );

  const sendRichMessage = useCallback(
    (extra) => {
      const receiverId = selectedUser || selectedGroup;
      if (!receiverId || !socketRef.current) return;
      const newMsg = {
        id: Date.now(),
        text: extra.text || "",
        messageType: extra.messageType || "text",
        content: extra.content || "text",
        location: extra.location || undefined,
        contact: extra.contact || undefined,
        imageUrl: extra.imageUrl || "",
        senderId: userId,
        receiverId,
        groupId: selectedGroup || undefined,
        timestamp: new Date().toISOString(),
        status: "sent",
        ...(replyToMessage
          ? {
            replyTo: {
              id: replyToMessage._id ?? replyToMessage.id,
              text: replyToMessage.text,
              senderId: replyToMessage.senderId,
            },
          }
          : {}),
      };
      if (selectedGroup) {
        socketRef.current.emit("sendGroupMessage", newMsg);
        setMessages((prev) => [...prev, { ...newMsg, status: "delivered" }]);
      } else {
        socketRef.current.emit("sendMessage", newMsg);
        setMessages((prev) => [...prev, newMsg]);
        updateConversationWithMessage(newMsg);
      }
    },
    [selectedUser, selectedGroup, userId, updateConversationWithMessage, replyToMessage],
  );

  const handleSendLocation = useCallback(
    (location) => {
      sendRichMessage({
        text: "📍 Location",
        messageType: "location",
        content: "location",
        location,
      });
    },
    [sendRichMessage],
  );

  const handleSendContact = useCallback(
    (contact) => {
      sendRichMessage({
        text: `👤 ${contact.name || contact.username}`,
        messageType: "contact",
        content: "contact",
        contact,
      });
    },
    [sendRichMessage],
  );

  // ==================== STATUS ACTIONS ====================

  const reloadStatuses = useCallback(() => {
    getStatuses().then(setStatuses).catch(() => { });
  }, []);

  const handleCreateStatus = useCallback(
    async ({ text, background, mediaFile, mediaType, previewUrl }) => {
      try {
        let mediaUrl = "";
        if (mediaFile) {
          const data = await uploadStatusImage(mediaFile);
          mediaUrl = data?.url || previewUrl;
        }
        await createStatus({
          text,
          mediaUrl,
          mediaType: mediaType || (mediaFile ? "image" : "text"),
          background: mediaFile ? "" : background,
          fontColor: "#ffffff",
        });
        reloadStatuses();
        setShowCreateStatusModal(false);
      } catch (e) {
        console.error("Failed to create status:", e);
      }
    },
    [reloadStatuses],
  );

  const handleStatusSelect = useCallback(
    (ownerId) => {
      setSelectedStatusUser(ownerId);
    },
    [],
  );

  const handleViewStatus = useCallback(
    (ownerId, index = 0) => {
      const ownerStatuses = statuses.filter(
        (s) => String(s.userId) === String(ownerId),
      );
      if (ownerStatuses.length === 0) return;
      viewerSessionRef.current += 1;
      setStatusViewer({
        userId: ownerId,
        index,
        session: viewerSessionRef.current,
      });
    },
    [statuses],
  );

  const handleStatusReact = useCallback(
    async (statusId, emoji) => {
      try {
        if (emoji === "__view__") {
          await viewStatus(statusId);
        } else {
          await reactStatus(statusId, emoji);
        }
        reloadStatuses();
      } catch (e) {
        console.error("Failed to update status:", e);
      }
    },
    [reloadStatuses],
  );

  const handleDeleteStatus = useCallback(
    async (statusId) => {
      try {
        await deleteStatus(statusId);
        reloadStatuses();
      } catch (e) {
        console.error("Failed to delete status:", e);
      }
    },
    [reloadStatuses],
  );

  // Typing indicators
  const handleTyping = useCallback(
    (receiver, isGroup) => {
      if (!socketRef.current) return;
      socketRef.current.emit("typing", { receiverId: receiver, isGroup });
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current?.emit("stopTyping", {
          receiverId: receiver,
          isGroup,
        });
      }, 2000);
    },
    [],
  );

  useEffect(() => {
    if (inputMessage.trim()) {
      if (selectedGroup) handleTyping(selectedGroup, true);
      else if (selectedUser) handleTyping(selectedUser, false);
    }
  }, [inputMessage, selectedUser, selectedGroup, handleTyping]);

  // ==================== GROUP ACTIONS ====================

  const handleCreateGroup = async ({ name, description, members }) => {
    await createNewGroup({ name, description, members });
    setShowCreateGroupModal(false);
  };

  const handleLeaveGroup = async () => {
    if (!activeGroup) return;
    await removeMember(activeGroup.name, userId);
    setSelectedGroup(null);
    setShowGroupInfoModal(false);
  };

  const handleDeleteGroup = async () => {
    if (!activeGroup) return;
    await removeGroup(activeGroup.name);
    setSelectedGroup(null);
    setShowGroupInfoModal(false);
  };

  const handleAddGroupMembers = async (members) => {
    if (!activeGroup) return;
    await addMembers(activeGroup.name, members);
  };

  const handleRemoveGroupMember = async (member) => {
    if (!activeGroup) return;
    await removeMember(activeGroup.name, member);
  };

  const handleEditGroup = async (description, avatar) => {
    if (!activeGroup) return;
    await editGroup(activeGroup.name, { description, avatar });
  };

  const handleUploadGroupAvatar = async (file) => {
    const data = await uploadFile(activeGroup.name, file);
    return data?.url || "";
  };

  // ==================== SESSION CHECK LOADING ====================

  if (isCheckingSession) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-white">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-primary/30">
            <div className="h-12 w-12 rounded-full border-4 border-white/10 border-t-white animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (!isJoined) {
    return (
      <AuthPage
        authMode={authMode}
        authError={authError}
        userId={userId}
        password={password}
        twoStepPin={twoStepPin}
        requiresTwoStep={requiresTwoStep}
        setUserId={setUserId}
        setPassword={setPassword}
        setTwoStepPin={setTwoStepPin}
        setAuthMode={setAuthMode}
        handleAuth={handleAuth}
      />
    );
  }

  const activeChatId = selectedUser || selectedGroup;
  const isGroupSelected = !!selectedGroup;

  return (
    <>
      <div className="flex h-screen min-h-screen overflow-hidden bg-background text-white">
        <Sidebar
          userId={userId}
          avatar={profile?.avatar ? resolveMediaUrl(profile.avatar) : ""}
          isOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
          onLogout={() => setShowLogoutModal(true)}
          view={view}
          onViewChange={handleViewChange}
          unreadCount={notifications.filter((n) => !n.read).length}
        />
        {view === "chats" ? (
          <>
            <div
              className={`${activeChatId ? "hidden lg:flex" : "flex"
                } w-full flex-col border-r border-white/10 bg-[#090b16] lg:w-[360px]`}
            >
              <ConnectTabs
                panelView={panelView}
                setPanelView={setPanelView}
                chats={chats}
                groups={groups}
                selectedChat={activeChatId}
                onSelectChat={handleSelectUser}
                allUsers={allUsers}
                onlineUsers={onlineUsers}
                onSendRequest={sendConnectionRequest}
                onAcceptRequest={acceptConnectionRequest}
                onDeclineRequest={declineConnectionRequest}
                onUnfriend={unfriendUser}
                userId={userId}
                onOpenSidebar={() => setIsMobileSidebarOpen(true)}
                onCreateGroup={() => setShowCreateGroupModal(true)}
                onBlock={onBlockUser}
                onUnblock={onUnblockUser}
              />
            </div>
            <div
              className={`${activeChatId ? "flex" : "hidden lg:flex"
                } flex-1 flex-col`}
            >
              <ChatDetail
                selectedChat={activeChatId}
                userId={userId}
                userProfile={profile}
                allUsers={allUsers}
                onlineUsers={onlineUsers}
                messages={activeChatMessages}
                isLoadingMessages={isLoadingMessages}
                inputMessage={inputMessage}
                setInputMessage={setInputMessage}
                onSend={sendMessage}
                onSendAudio={sendAudioMessage}
                onStartCall={webRTC.startCall}
                onBack={() => {
                  setSelectedUser(null);
                  setSelectedGroup(null);
                }}
                isGroup={isGroupSelected}
                group={activeGroup}
                onGroupInfo={() => setShowGroupInfoModal(true)}
                isTyping={
                  isGroupSelected
                    ? Object.keys(typingUsers).some((k) =>
                      k.startsWith(`${selectedGroup}:`) &&
                      k.split(":")[1] !== userId,
                    )
                    : selectedUser && typingUsers[selectedUser]
                }
                typingUserName={
                  isGroupSelected
                    ? (() => {
                      const keys = Object.keys(typingUsers).filter(
                        (k) =>
                          k.startsWith(`${selectedGroup}:`) &&
                          k.split(":")[1] !== userId,
                      );
                      return keys.length > 0
                        ? keys[0].split(":")[1]
                        : "";
                    })()
                    : typingUsers[selectedUser] ? selectedUser : ""
                }
                onEditMessage={editMessage}
                onDeleteMessage={deleteMessage}
                onReactToMessage={reactToMessage}
                onSendAttachment={sendAttachment}
                onStarMessage={starMessage}
                onPinMessage={pinMessage}
                onForwardMessage={handleOpenForward}
                onLoadMore={loadOlderMessages}
                onReloadMessages={reloadMessages}
                onCreatePoll={(poll) =>
                  handleCreatePoll(poll.question, poll.options, poll.multiple)
                }
                onOpenPollModal={() => setShowPollModal(true)}
                onSendLocation={handleSendLocation}
                onSendContact={handleSendContact}
                onVoteInPoll={voteInPoll}
                replyToMessage={replyToMessage}
                setReplyToMessage={setReplyToMessage}
                conversationSettings={
                  convSettings[
                  `${isGroupSelected ? "group" : "user"}:${activeChatId}`
                  ] || {}
                }
                onUpdateConvSettings={
                  isGroupSelected
                    ? (s) => handleUpdateConvSettings(selectedGroup, s, "group")
                    : (s) => handleUpdateConvSettings(selectedUser, s, "user")
                }
                clearChat={clearChat}
                exportChat={exportChat}
                onScheduleMessage={handleScheduleMessage}
              />
            </div>
          </>
        ) : view === "status" ? (
          <>
            <div
              className={`${activeStatusUser ? "hidden lg:flex" : "flex"
                } w-full flex-col border-r border-white/10 bg-[#090b16] lg:w-[360px]`}
            >
              <StatusScreen
                statuses={statuses}
                myStatuses={myStatuses}
                onlineUsers={onlineUsers}
                allUsers={allUsers}
                userId={userId}
                selectedUserId={activeStatusUser}
                onSelect={handleStatusSelect}
                onCreateStatus={() => setShowCreateStatusModal(true)}
                onOpenSidebar={() => setIsMobileSidebarOpen(true)}
              />
            </div>
            <div
              className={`${activeStatusUser ? "flex" : "hidden lg:flex"
                } flex-1 flex-col bg-[#070a15]`}
            >
              {activeStatusGroup ? (
                <StatusDetail
                  group={activeStatusGroup}
                  statuses={statuses}
                  userId={userId}
                  allUsers={allUsers}
                  onlineUsers={onlineUsers}
                  callerId={userId}
                  onViewStatus={(index = 0) =>
                    handleViewStatus(activeStatusUser, index)
                  }
                  onStartCall={(partner, type) =>
                    webRTC.startCall(partner, type || "voice")
                  }
                  onOpenChat={(id) => {
                    setView("chats");
                    handleSelectUser(id);
                  }}
                  onBack={() => setSelectedStatusUser(null)}
                />
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center scrollbar-none overflow-y-auto px-10 py-8 text-center">
                  {activeStatusUser && (
                    <button
                      type="button"
                      onClick={() => setSelectedStatusUser(null)}
                      className="mb-4 rounded-[12px] border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300 transition hover:bg-white/10 lg:hidden"
                    >
                      Back
                    </button>
                  )}
                  <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-gradient-to-br from-indigo-500/20 to-purple-600/20 text-indigo-400">
                    <CircleDot className="h-8 w-8" />
                  </div>
                  <h3 className="mt-6 text-2xl font-semibold text-white">
                    Updates
                  </h3>
                  <p className="mt-2 max-w-sm text-sm text-slate-400">
                    View and post status updates that disappear after 24 hours.
                    Select a contact to see their update.
                  </p>

                  <div className="mt-8 w-full max-w-[460px]">
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        {
                          label: "Total updates",
                          value: statuses.length,
                          icon: CircleDot,
                          color: "text-emerald-400",
                        },
                        {
                          label: "My updates",
                          value: myStatuses.length,
                          icon: Eye,
                          color: "text-indigo-400",
                        },
                        {
                          label: "Contacts",
                          value: statusGroups.length,
                          icon: Users,
                          color: "text-rose-400",
                        },
                      ].map((stat) => (
                        <div
                          key={stat.label}
                          className="rounded-[14px] border border-white/10 bg-white/[0.04] px-4 py-4"
                        >
                          <div className="flex items-center gap-2">
                            <stat.icon className={`h-4 w-4 ${stat.color}`} />
                            <span className="text-[11px] text-slate-400">
                              {stat.label}
                            </span>
                          </div>
                          <p className="mt-2 text-2xl font-bold text-white">
                            {stat.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-10 w-full max-w-[460px] space-y-3 text-left">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      How statuses work
                    </h3>
                    {[
                      {
                        icon: Camera,
                        title: "Share your moments",
                        desc: "Post text or photos that stay visible to your friends for 24 hours.",
                      },
                      {
                        icon: Eye,
                        title: "See who viewed",
                        desc: "Your own status shows exactly who viewed each update.",
                      },
                      {
                        icon: Play,
                        title: "Tap to advance",
                        desc: "Open a status and tap left or right to move between updates.",
                      },
                    ].map((tip) => (
                      <div
                        key={tip.title}
                        className="flex items-start gap-3 rounded-[14px] border border-white/10 bg-white/[0.03] px-4 py-3"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-slate-300">
                          <tip.icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">
                            {tip.title}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {tip.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : view === "profile" ? (
          <>
            <div className="hidden w-[360px] flex-col border-r border-white/10 bg-[#090b16] lg:flex">
              <ProfileScreen
                userId={userId}
                profile={profile}
                saving={profileSaving}
                onSaveProfile={saveProfile}
                onChangeAvatar={changeAvatar}
                onLogout={() => setShowLogoutModal(true)}
                editingField={profileEditingField}
                onSelectEdit={setProfileEditingField}
                onOpenSidebar={() => setIsMobileSidebarOpen(true)}
              />
            </div>
            <div className="flex flex-1 flex-col">
              <ProfileDetail
                userId={userId}
                profile={profile}
                saving={profileSaving}
                onChangeAvatar={changeAvatar}
                onChangeCover={changeCover}
                onEdit={(field) => setProfileEditingField(field)}
                friendsCount={otherConversations.length}
                onOpenSidebar={() => setIsMobileSidebarOpen(true)}
              />
            </div>
          </>
        ) : (
          <>
            <div
              className={`${selectedItemId ? "hidden lg:flex" : "flex"
                } w-full flex-col border-r border-white/10 bg-[#090b16] lg:w-[360px]`}
            >
              {view === "calls" && (
                <CallsScreen
                  calls={callLogs}
                  onlineUsers={onlineUsers}
                  userId={userId}
                  allUsers={allUsers}
                  onClearCalls={handleClearCalls}
                  onStartCall={(partner) => webRTC.startCall(partner, "voice")}
                  onOpenChat={(id) => {
                    setView("chats");
                    handleSelectUser(id);
                  }}
                  selectedId={selectedItemId}
                  onSelect={setSelectedItemId}
                  onOpenSidebar={() => setIsMobileSidebarOpen(true)}
                />
              )}
              {view === "notifications" && (
                <NotificationsScreen
                  notifications={notifications}
                  selectedId={selectedItemId}
                  onSelect={handleNotificationClick}
                  onMarkAllRead={markAllNotificationsRead}
                  onOpenSidebar={() => setIsMobileSidebarOpen(true)}
                />
              )}
              {view === "settings" && (
                <SettingsScreen
                  selectedId={selectedItemId}
                  onSelect={setSelectedItemId}
                  onOpenSidebar={() => setIsMobileSidebarOpen(true)}
                  prefs={prefs}
                  onTogglePref={onTogglePref}
                  disabled={false}
                />
              )}
            </div>
            <div
              className={`${selectedItemId ? "flex" : "hidden lg:flex"
                } flex-1 flex-col`}
            >
              {view === "calls" && (
                <CallsDetail
                  selectedId={selectedItemId}
                  calls={callLogs}
                  onlineUsers={onlineUsers}
                  userId={userId}
                  onStartCall={(partner, type) => webRTC.startCall(partner, type || "voice")}
                  onOpenChat={(id) => {
                    setView("chats");
                    handleSelectUser(id);
                  }}
                  onBack={(itemId) => {
                    if (itemId) setSelectedItemId(itemId);
                    else setSelectedItemId(null);
                  }}
                />
              )}
              {view === "notifications" && (
                <NotificationsDetail
                  selectedId={selectedItemId}
                  onBack={() => setSelectedItemId(null)}
                  notifications={notifications}
                />
              )}
              {view === "settings" && (
                <SettingsDetail
                  selectedId={selectedItemId}
                  onBack={(itemId) => {
                    if (itemId) setSelectedItemId(itemId);
                    else setSelectedItemId(null);
                  }}
                  onNavigate={(itemId) => setSelectedItemId(itemId)}
                  prefs={prefs}
                  onTogglePref={onTogglePref}
                  blockedUsers={blockedUsers}
                  onUnblock={onUnblockUser}
                  onChangePassword={onChangePassword}
                />
              )}
            </div>
          </>
        )}
      </div>

      <ConfirmationModal
        isOpen={showLogoutModal}
        title="Log Out"
        message="Are you sure you want to log out of your account?"
        confirmLabel="Log Out"
        confirmVariant="danger"
        onClose={() => setShowLogoutModal(false)}
        onConfirm={() => {
          handleLogout();
          setShowLogoutModal(false);
        }}
      />

      <CreateGroupModal
        isOpen={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        onCreate={handleCreateGroup}
        allUsers={allUsers.filter((u) => u.connectionStatus === "accepted" || u.username !== userId)}
        userId={userId}
        saving={false}
      />

      <GroupInfoModal
        isOpen={showGroupInfoModal}
        onClose={() => setShowGroupInfoModal(false)}
        group={activeGroup}
        userId={userId}
        allUsers={allUsers}
        onAddMembers={handleAddGroupMembers}
        onRemoveMember={handleRemoveGroupMember}
        onLeaveGroup={handleLeaveGroup}
        onDeleteGroup={handleDeleteGroup}
        onEditGroup={handleEditGroup}
        onUploadGroupAvatar={handleUploadGroupAvatar}
        onlineUsers={onlineUsers}
        busy={false}
      />

      <CreateStatusModal
        key={showCreateStatusModal ? "open" : "closed"}
        isOpen={showCreateStatusModal}
        onClose={() => setShowCreateStatusModal(false)}
        onCreate={handleCreateStatus}
        saving={false}
      />

      <StatusViewer
        key={`${statusViewer?.session || 0}-${statusViewer?.userId || "none"}`}
        isOpen={!!statusViewer}
        onClose={() => setStatusViewer(null)}
        groups={statusGroups}
        startOwnerId={statusViewer?.userId}
        startItemIndex={statusViewer?.index || 0}
        userId={userId}
        onlineUsers={onlineUsers}
        onReact={handleStatusReact}
        onDelete={handleDeleteStatus}
      />

      <ForwardModal
        key={`fwd-${showForwardModal}`}
        isOpen={showForwardModal}
        onClose={() => {
          setShowForwardModal(false);
          setForwardMessageIds([]);
        }}
        targets={[
          ...chats.map((c) => ({ id: c.id, name: c.name, type: "user" })),
          ...groups.map((g) => ({ id: g.name, name: g.name, type: "group" })),
        ]}
        onForward={handleForwardSelect}
        sending={false}
      />

      <PollModal
        isOpen={showPollModal}
        onClose={() => setShowPollModal(false)}
        onCreate={(poll) => {
          handleCreatePoll(poll.question, poll.options, poll.multiple);
          setShowPollModal(false);
        }}
        saving={false}
      />

      <IncomingCallModal
        isOpen={webRTC.callState === "receiving"}
        callerName={webRTC.partner}
        callType={webRTC.callType}
        onAccept={webRTC.acceptCall}
        onDecline={webRTC.rejectCall}
      />

      <CallOverlay
        isOpen={["calling", "ringing", "connected"].includes(webRTC.callState)}
        callState={webRTC.callState}
        callType={webRTC.callType}
        partnerName={webRTC.partner}
        myStream={webRTC.myStream}
        userStream={webRTC.userStream}
        isMuted={webRTC.isMuted}
        isCameraOff={webRTC.isCameraOff}
        onToggleMute={webRTC.toggleMute}
        onToggleCamera={webRTC.toggleCamera}
        onEndCall={webRTC.endCall}
      />

      <ToastHost />
    </>
  );
}

export default App;