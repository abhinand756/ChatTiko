import { Server } from "socket.io";
import http from "http";
import express from "express";
import cookie from "cookie";
import jwt from "jsonwebtoken";
import Message from "../models/Message.js";
import Group from "../models/Group.js";
import User from "../models/User.js";
import CallLog from "../models/CallLog.js";
import Conversation from "../models/Conversation.js";
import Session from "../models/Session.js";

const app = express();

const ALLOWED_ORIGINS = (process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const PRIVATE_ORIGIN =
  /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/;

// Reflecting any origin with credentials enabled would let an arbitrary site
// make authenticated requests on a logged-in user's behalf.
const isOriginAllowed = (origin) => {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  return PRIVATE_ORIGIN.test(origin);
};

const server = http.createServer(app);
const SOCKET_PATH = process.env.SOCKETIO_PATH || "/socket.io";
const io = new Server(server, {
  path: SOCKET_PATH,
  cors: {
    origin: (origin, callback) => callback(null, isOriginAllowed(origin)),
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret";
// username -> Set<socketId>. A Set (not a single id) so that multiple tabs or
// devices for the same user are all tracked and closing one does not mark the
// user offline while another connection is still live.
const userSockets = new Map();

const isOnline = (username) => {
  const set = userSockets.get(username);
  return !!set && set.size > 0;
};

const onlineUsernames = () => [...userSockets.keys()].filter(isOnline);

const addSocket = (username, socketId) => {
  const set = userSockets.get(username);
  if (set) set.add(socketId);
  else userSockets.set(username, new Set([socketId]));
};

const removeSocket = (username, socketId) => {
  const set = userSockets.get(username);
  if (!set) return;
  set.delete(socketId);
  if (set.size === 0) userSockets.delete(username);
};

export { app, io, server, isOnline, onlineUsernames, isOriginAllowed };

const authenticateSocket = async (socket) => {
  const cookieHeader = socket.request.headers?.cookie;
  if (!cookieHeader) return null;

  const cookies = cookie.parse(cookieHeader);
  const token = cookies.token;
  if (!token) return null;

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }

  // Honour session revocation, otherwise a device that was logged out from
  // elsewhere keeps a live realtime connection.
  if (payload.sid) {
    try {
      const session = await Session.findById(payload.sid).select("revoked").lean();
      if (!session || session.revoked === true) return null;
    } catch {
      return null;
    }
  }

  return { username: payload.username, sid: payload.sid };
};

const emitToUser = (username, event, payload) => {
  io.to(username).emit(event, payload);
};

const emitToGroup = async (groupName, event, payload) => {
  const group = await Group.findOne({ name: groupName });
  if (!group) return;
  group.members.forEach((member) => emitToUser(member, event, payload));
};

const messagePayload = (msg, extra = {}) => ({
  id: msg._id,
  senderId: msg.senderId,
  receiverId: msg.receiverId,
  receiverType: msg.receiverType,
  groupId: msg.receiverType === "group" ? msg.receiverId : undefined,
  text: msg.text,
  messageType: msg.messageType,
  audioUrl: msg.audioUrl,
  audioDuration: msg.audioDuration,
  imageUrl: msg.imageUrl,
  fileName: msg.fileName,
  fileSize: msg.fileSize,
  fileType: msg.fileType,
  fileUrl: msg.fileUrl,
  content: msg.content,
  location: msg.location,
  contact: msg.contact,
  poll: msg.poll
    ? {
        question: msg.poll.question,
        options: (msg.poll.options || []).map((opt) => ({
          text: opt.text,
          votes: opt.votes || [],
        })),
        multiple: msg.poll.multiple,
        anonymous: msg.poll.anonymous,
        closed: msg.poll.closed,
      }
    : undefined,
  replyTo: msg.replyTo || {},
  forwardedFrom: msg.forwardedFrom || "",
  starredBy: msg.starredBy || [],
  pinned: msg.pinned || false,
  edited: msg.edited || false,
  deleted: msg.deleted || false,
  deletedFor: msg.deletedFor || [],
  reactions:
    msg.reactions instanceof Map
      ? Object.fromEntries(msg.reactions)
      : msg.reactions || {},
  readBy: msg.readBy || [],
  status: msg.status,
  scheduledAt: msg.scheduledAt || null,
  expiresAt: msg.expiresAt || null,
  timestamp: msg.createdAt,
  ...extra,
});

const buildMessageDoc = (message, username) => {
  let text = message.text || "";
  if (
    !text &&
    message.messageType === "audio"
  ) {
    text = "🎵 Voice message";
  } else if (!text && message.messageType === "image") {
    text = "📷 Photo";
  } else if (!text && message.messageType === "file") {
    text = `📎 ${message.fileName || "File"}`;
  } else if (!text && message.messageType === "video") {
    text = "📹 Video message";
  } else if (!text && message.content === "location") {
    text = "📍 Location";
  } else if (!text && message.content === "contact") {
    text = `👤 ${message.contact?.name || "Contact"}`;
  } else if (message.poll?.question) {
    text = `📊 ${message.poll.question}`;
  }

  return {
    senderId: username,
    receiverId: message.receiverId,
    text,
    messageType: message.messageType || "text",
    audioUrl: message.audioUrl || "",
    audioDuration: message.audioDuration || 0,
    imageUrl: message.imageUrl || "",
    fileName: message.fileName || "",
    fileSize: message.fileSize || 0,
    fileType: message.fileType || "",
    fileUrl: message.fileUrl || "",
    content: message.content || "text",
    location: message.location,
    contact: message.contact,
    poll: message.poll,
    replyTo: message.replyTo || {},
    forwardedFrom: message.forwardedFrom || "",
    expiresAt: message.expiresAt || null,
    scheduledAt: message.scheduledAt || null,
  };
};

const getDisappearingDuration = async (senderId, receiverId, type) => {
  try {
    if (type === "group") return null;
    const [mine, theirs] = await Promise.all([
      Conversation.findOne({ userId: senderId, partnerId: receiverId, type: "user" }).lean(),
      Conversation.findOne({ userId: receiverId, partnerId: senderId, type: "user" }).lean(),
    ]);
    const setting = mine?.disappearingEnabled
      ? mine
      : theirs?.disappearingEnabled
        ? theirs
        : null;
    if (!setting) return null;
    return setting.disappearingDuration || 86400;
  } catch {
    return null;
  }
};

// ==================== SCHEDULER ====================

setInterval(async () => {
  try {
    // Send due scheduled messages
    const due = await Message.find({
      status: "scheduled",
      scheduledAt: { $lte: new Date() },
      deleted: { $ne: true },
    });
    for (const msg of due) {
      msg.status = "sent";
      await msg.save();
      const payload = messagePayload(msg);
      if (msg.receiverType === "group") {
        await emitToGroup(msg.receiverId, "groupMessage", payload);
      } else {
        const socketIds = onlineUsernames();
        if (socketIds.length > 0) {
          if (isOnline(msg.receiverId)) {
            msg.status = "delivered";
            await msg.save();
            payload.status = "delivered";
          }
        }
        emitToUser(msg.receiverId, "privateMessage", payload);
        emitToUser(msg.senderId, "messageSent", {
          tempId: msg._id,
          message: payload,
        });
      }
    }
  } catch (error) {
    console.error("Scheduler error (scheduled):", error.message);
  }

  try {
    // Soft-delete expired disappearing messages
    const expired = await Message.find({
      expiresAt: { $lte: new Date() },
      deleted: { $ne: true },
    });
    for (const msg of expired) {
      const payload = { id: msg._id };
      if (msg.receiverType === "group") {
        await emitToGroup(msg.receiverId, "messageExpired", payload);
      } else {
        emitToUser(msg.receiverId, "messageExpired", payload);
        emitToUser(msg.senderId, "messageExpired", payload);
      }
      await msg.deleteOne();
    }
  } catch (error) {
    console.error("Scheduler error (expiry):", error.message);
  }
}, 15000);

io.on("connection", async (socket) => {
  const auth = await authenticateSocket(socket);
  if (!auth) {
    socket.disconnect(true);
    return;
  }
  const { username } = auth;

  console.log("a user connected", username, socket.id);
  addSocket(username, socket.id);
  socket.join(username);

  // Update lastSeen on connect
  User.findOneAndUpdate(
    { username },
    { lastSeen: new Date() },
    { returnDocument: "before" },
  ).catch(() => {});

  io.emit("getOnlineUsers", onlineUsernames());

  // Mark pending messages as delivered
  (async () => {
    try {
      const pendingMessages = await Message.find({
        receiverId: username,
        receiverType: "user",
        status: "sent",
      });
      if (pendingMessages.length > 0) {
        await Message.updateMany(
          { receiverId: username, receiverType: "user", status: "sent" },
          { $set: { status: "delivered" } },
        );

        const senders = [...new Set(pendingMessages.map((m) => m.senderId))];
        senders.forEach((senderId) => {
          emitToUser(senderId, "messagesDelivered", { receiverId: username });
        });
      }

      // Also mark group messages as delivered to this user
      const groups = await Group.find({ members: username }).select("name");
      const groupNames = groups.map((g) => g.name);
      if (groupNames.length > 0) {
        await Message.updateMany(
          { receiverId: { $in: groupNames }, receiverType: "group", status: "sent" },
          { $set: { status: "delivered" } },
        );
      }
    } catch (error) {
      console.error("Error marking pending messages as delivered:", error);
    }
  })();

  // ==================== DIRECT MESSAGING ====================
  socket.on("sendMessage", async (message) => {
    try {
      const receiverId = message?.receiverId;
      if (!receiverId) return;

      if (receiverId !== username) {
        const [me, receiver] = await Promise.all([
          User.findOne({ username }).select("blockedUsers").lean(),
          User.findOne({ username: receiverId }).select("blockedUsers").lean(),
        ]);
        const iBlocked = me?.blockedUsers?.includes(receiverId);
        const theyBlocked = receiver?.blockedUsers?.includes(username);
        if (iBlocked || theyBlocked) {
          socket.emit("messageBlocked", {
            tempId: message.id,
            receiverId,
            reason: iBlocked ? "blocked" : "blockedByReceiver",
          });
          return;
        }
      }

      const receiverOnline = isOnline(receiverId);
      const initialStatus = receiverOnline ? "delivered" : "sent";
      const disappearingDuration = await getDisappearingDuration(
        username,
        receiverId,
        "user",
      );

      const doc = buildMessageDoc(message, username);
      if (disappearingDuration) {
        doc.expiresAt = new Date(Date.now() + disappearingDuration * 1000);
      }

      const newMessage = new Message({
        ...doc,
        receiverType: "user",
        status: initialStatus,
      });
      await newMessage.save();

      const payload = messagePayload(newMessage);

      socket.emit("messageSent", { tempId: message.id, message: payload });

      if (receiverOnline) {
        emitToUser(receiverId, "privateMessage", payload);
      } else {
        emitToUser(username, "messageUpdated", { id: newMessage._id, status: payload.status });
      }
    } catch (error) {
      console.error("Error saving message:", error);
    }
  });

  // ==================== GROUP MESSAGING ====================
  socket.on("sendGroupMessage", async (message) => {
    try {
      const group = await Group.findOne({ name: message.groupId });
      if (!group || !group.members.includes(username)) return;

      const doc = buildMessageDoc(message, username);
      const newMessage = new Message({
        ...doc,
        receiverId: message.groupId,
        receiverType: "group",
        readBy: [username],
        status: "delivered",
      });
      await newMessage.save();

      const payload = messagePayload(newMessage, { readBy: [username] });

      socket.emit("groupMessageSent", { tempId: message.id, message: payload });

      group.members.forEach((member) => {
        if (member === username) return;
        emitToUser(member, "groupMessage", payload);
      });
    } catch (error) {
      console.error("Error saving group message:", error);
    }
  });

  socket.on("markGroupSeen", async ({ groupId }) => {
    try {
      const group = await Group.findOne({ name: groupId });
      if (!group) return;
      await Message.updateMany(
        { receiverId: groupId, receiverType: "group", senderId: { $ne: username }, status: { $ne: "seen" }, readBy: { $ne: username } },
        { $set: { status: "seen" }, $addToSet: { readBy: username } },
      );
      const affected = await Message.find({
        receiverId: groupId,
        receiverType: "group",
        readBy: username,
      }).select("_id readBy");
      const readMap = {};
      affected.forEach((m) => {
        readMap[m._id] = m.readBy || [];
      });
      group.members.forEach((member) => {
        emitToUser(member, "groupSeenUpdate", { groupId, readMap });
      });
    } catch (error) {
      console.error("Error marking group messages as seen:", error);
    }
  });

  socket.on("groupSeenUpdateAck", () => {});

  // ==================== MARK SEEN ====================
  socket.on("markSeen", async ({ senderId }) => {
    try {
      const [me, sender] = await Promise.all([
        User.findOne({ username }).lean(),
        User.findOne({ username: senderId }).lean()
      ]);

      const myReceipts = me?.preferences?.readReceipts !== false;
      const senderReceipts = sender?.preferences?.readReceipts !== false;

      if (!myReceipts || !senderReceipts) {
        return;
      }

      await Message.updateMany(
        { senderId, receiverId: username, receiverType: "user", status: { $ne: "seen" } },
        { $set: { status: "seen" } },
      );

      emitToUser(senderId, "messagesSeen", { receiverId: username });
    } catch (error) {
      console.error("Error marking messages as seen:", error);
    }
  });

  // ==================== EDIT / DELETE / REACTIONS ====================
  socket.on("editMessage", async ({ messageId, text }) => {
    try {
      const msg = await Message.findById(messageId);
      if (!msg || msg.senderId !== username) return;
      msg.text = text;
      msg.edited = true;
      await msg.save();

      const payload = messagePayload(msg);

      if (msg.receiverType === "group") {
        await emitToGroup(msg.receiverId, "messageUpdated", payload);
      } else {
        emitToUser(msg.receiverId, "messageUpdated", payload);
        emitToUser(username, "messageUpdated", payload);
      }
    } catch (error) {
      console.error("Error editing message:", error);
    }
  });

  socket.on("deleteMessage", async ({ messageId, forEveryone }) => {
    try {
      const msg = await Message.findById(messageId);
      if (!msg || msg.senderId !== username) return;

      if (forEveryone === false) {
        if (!msg.deletedFor.includes(username)) {
          msg.deletedFor.push(username);
          await msg.save();
        }
        emitToUser(username, "messageUpdated", {
          id: msg._id,
          deletedFor: msg.deletedFor,
        });
        return;
      }

      msg.deleted = true;
      msg.text = "";
      await msg.save();

      const payload = { id: msg._id, text: "", deleted: true };

      if (msg.receiverType === "group") {
        await emitToGroup(msg.receiverId, "messageUpdated", payload);
      } else {
        emitToUser(msg.receiverId, "messageUpdated", payload);
        emitToUser(username, "messageUpdated", payload);
      }
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  });

  socket.on("reactToMessage", async ({ messageId, emoji }) => {
    try {
      const msg = await Message.findById(messageId);
      if (!msg) return;

      if (!msg.reactions) msg.reactions = new Map();
      const reactionsMap =
        msg.reactions instanceof Map
          ? msg.reactions
          : new Map(Object.entries(msg.reactions));

      const existing = reactionsMap.get(emoji) || [];
      let newUsers;
      if (existing.includes(username)) {
        newUsers = existing.filter((u) => u !== username);
        if (newUsers.length === 0) {
          reactionsMap.delete(emoji);
        } else {
          reactionsMap.set(emoji, newUsers);
        }
      } else {
        reactionsMap.set(emoji, [...existing, username]);
      }

      msg.reactions = reactionsMap;
      await msg.save();

      const reactionsObj = {};
      reactionsMap.forEach((users, key) => {
        reactionsObj[key] = users;
      });

      const payload = { id: msg._id, reactions: reactionsObj };

      if (msg.receiverType === "group") {
        await emitToGroup(msg.receiverId, "messageUpdated", payload);
      } else {
        emitToUser(msg.receiverId, "messageUpdated", payload);
        emitToUser(username, "messageUpdated", payload);
      }
    } catch (error) {
      console.error("Error reacting to message:", error);
    }
  });

  // ==================== STAR / PIN ====================
  socket.on("starMessage", async ({ messageId }) => {
    try {
      const msg = await Message.findById(messageId);
      if (!msg) return;
      const idx = msg.starredBy.indexOf(username);
      if (idx >= 0) msg.starredBy.splice(idx, 1);
      else msg.starredBy.push(username);
      await msg.save();

      const payload = { id: msg._id, starredBy: msg.starredBy };
      if (msg.receiverType === "group") {
        await emitToGroup(msg.receiverId, "messageUpdated", payload);
      } else {
        emitToUser(msg.receiverId, "messageUpdated", payload);
        emitToUser(username, "messageUpdated", payload);
      }
    } catch (error) {
      console.error("Error starring message:", error);
    }
  });

  socket.on("pinMessage", async ({ messageId }) => {
    try {
      const msg = await Message.findById(messageId);
      if (!msg) return;
      if (msg.receiverType === "group") {
        const group = await Group.findOne({ name: msg.receiverId });
        if (!group || !group.admins.includes(username)) return;
      }
      msg.pinned = !msg.pinned;
      await msg.save();

      const payload = { id: msg._id, pinned: msg.pinned };
      if (msg.receiverType === "group") {
        await emitToGroup(msg.receiverId, "messageUpdated", payload);
      } else {
        emitToUser(msg.receiverId, "messageUpdated", payload);
        emitToUser(username, "messageUpdated", payload);
      }
    } catch (error) {
      console.error("Error pinning message:", error);
    }
  });

  // ==================== FORWARD ====================
  socket.on("forwardMessage", async ({ messageIds, targetType, targetId }) => {
    try {
      const ids = (messageIds || []).slice(0, 30);
      const originals = await Message.find({ _id: { $in: ids }, deleted: { $ne: true } });
      const forwardedFrom = username;

      if (targetType === "group") {
        const group = await Group.findOne({ name: targetId });
        if (!group || !group.members.includes(username)) return;
      } else if (targetId !== username) {
        const [me, receiver] = await Promise.all([
          User.findOne({ username }).select("blockedUsers").lean(),
          User.findOne({ username: targetId }).select("blockedUsers").lean(),
        ]);
        if (
          me?.blockedUsers?.includes(targetId) ||
          receiver?.blockedUsers?.includes(username)
        ) {
          socket.emit("forwardBlocked", { targetId });
          return;
        }
      }

      for (const original of originals) {
        // Forward every field so polls, files, videos, locations and contacts
        // survive intact; only the reply context is intentionally dropped.
        const doc = buildMessageDoc(
          { ...original.toObject(), replyTo: undefined },
          username,
        );

        const newMessage = new Message({
          ...doc,
          receiverId: targetId,
          receiverType: targetType,
          forwardedFrom: original.forwardedFrom || forwardedFrom,
          status:
            targetType === "group" ? "delivered" : isOnline(targetId) ? "delivered" : "sent",
        });
        await newMessage.save();

        const payload = messagePayload(newMessage);
        socket.emit("forwarded", { message: payload, targetType, targetId });
        if (targetType === "group") {
          await emitToGroup(targetId, "groupMessage", payload);
        } else {
          emitToUser(targetId, "privateMessage", payload);
        }
      }
    } catch (error) {
      console.error("Error forwarding message:", error);
    }
  });

  // ==================== POLL VOTE ====================
  socket.on("pollVote", async ({ messageId, optionIndex }) => {
    try {
      const msg = await Message.findById(messageId);
      if (!msg || !msg.poll) return;
      if (msg.poll.closed) return;

      if (!msg.poll.multiple) {
        msg.poll.options.forEach((opt) => {
          opt.votes = opt.votes.filter((u) => u !== username);
        });
      }
      if (msg.poll.options[optionIndex]) {
        const votes = msg.poll.options[optionIndex].votes;
        if (votes.includes(username)) {
          msg.poll.options[optionIndex].votes = votes.filter((u) => u !== username);
        } else {
          msg.poll.options[optionIndex].votes.push(username);
        }
      }
      await msg.save();

      const pollUpdate = {
        id: msg._id,
        poll: {
          question: msg.poll.question,
          options: msg.poll.options.map((opt) => ({ text: opt.text, votes: opt.votes })),
          multiple: msg.poll.multiple,
          anonymous: msg.poll.anonymous,
          closed: msg.poll.closed,
        },
      };

      if (msg.receiverType === "group") {
        await emitToGroup(msg.receiverId, "pollUpdate", pollUpdate);
      } else {
        emitToUser(msg.receiverId, "pollUpdate", pollUpdate);
      }
      emitToUser(username, "pollUpdate", pollUpdate);
    } catch (error) {
      console.error("Error voting in poll:", error);
    }
  });

  // ==================== TYPING INDICATORS ====================
  socket.on("typing", ({ receiverId, isGroup }) => {
    if (isGroup) {
      Group.findOne({ name: receiverId }).then((group) => {
        if (!group) return;
        group.members.forEach((member) => {
          if (member === username) return;
          emitToUser(member, "userTyping", { from: username, groupId: receiverId });
        });
      });
      return;
    }
    emitToUser(receiverId, "userTyping", { from: username });
  });

  socket.on("stopTyping", ({ receiverId, isGroup }) => {
    if (isGroup) {
      Group.findOne({ name: receiverId }).then((group) => {
        if (!group) return;
        group.members.forEach((member) => {
          if (member === username) return;
          emitToUser(member, "userStopTyping", { from: username, groupId: receiverId });
        });
      });
      return;
    }
    emitToUser(receiverId, "userStopTyping", { from: username });
  });

  // ==================== CALL EVENTS ====================
  socket.on("callUser", async ({ userToCall, signalData, from, callType }) => {
    if (isOnline(userToCall)) {
      const [me, receiver] = await Promise.all([
        User.findOne({ username }).select("blockedUsers").lean(),
        User.findOne({ username: userToCall }).select("blockedUsers").lean(),
      ]);
      const blocked =
        me?.blockedUsers?.includes(userToCall) ||
        receiver?.blockedUsers?.includes(username);
      if (blocked) {
        socket.emit("callUserOffline", { userToCall });
        return;
      }
      emitToUser(userToCall, "incomingCall", { signal: signalData, from, callType });
      emitToUser(username, "callRinging", { userToCall, callType });
    } else {
      socket.emit("callUserOffline", { userToCall });
      socket.data.offlineMissedLogged = userToCall;
      CallLog.create({
        callerId: username,
        receiverId: userToCall,
        callType: callType || "voice",
        status: "missed",
      })
        .then(() => emitToUser(username, "callLogUpdated"))
        .catch(() => {});
    }
  });

  socket.on("answerCall", ({ to, signal }) => {
    emitToUser(to, "callAccepted", { signal });
  });

  socket.on("rejectCall", async ({ to, callType }) => {
    emitToUser(to, "callRejected");
    try {
      const log = await CallLog.create({
        callerId: to,
        receiverId: username,
        callType: callType || "voice",
        status: "rejected",
      });
      if (log) {
        emitToUser(to, "callLogUpdated");
        emitToUser(username, "callLogUpdated");
      }
    } catch { /* ignore */ }
  });

  socket.on("endCall", async ({ to, connected, callType }) => {
    emitToUser(to, "callEnded");
    if (!connected && socket.data.offlineMissedLogged !== to) {
      try {
        const log = await CallLog.create({
          callerId: username,
          receiverId: to,
          callType: callType || "voice",
          status: "canceled",
        });
        if (log) {
          emitToUser(to, "callLogUpdated");
          emitToUser(username, "callLogUpdated");
        }
      } catch { /* ignore */ }
    }
  });

  socket.on("callCompleted", async ({ to, callType, duration }) => {
    try {
      const log = await CallLog.create({
        callerId: username,
        receiverId: to,
        callType: callType || "voice",
        status: "completed",
        startedAt: new Date(Date.now() - (duration || 0) * 1000),
        endedAt: new Date(),
        duration: duration || 0,
      });
      if (log) {
        emitToUser(to, "callLogUpdated");
        emitToUser(username, "callLogUpdated");
      }
    } catch { /* ignore */ }
  });

  socket.on("iceCandidate", ({ to, candidate }) => {
    emitToUser(to, "iceCandidate", { candidate });
  });

  // ==================== DISCONNECT ====================
  socket.on("disconnect", () => {
    console.log("user disconnected", username, socket.id);
    removeSocket(username, socket.id);

    // Update lastSeen only when this was the user's last open connection
    if (!isOnline(username)) {
      User.findOneAndUpdate(
        { username },
        { lastSeen: new Date() },
        { returnDocument: "before" },
      ).catch(() => {});
    }

    io.emit("getOnlineUsers", onlineUsernames());
  });
});