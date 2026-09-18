import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import { app, server, isOriginAllowed } from "./socket/socket.js";
import User from "./models/User.js";
import Message from "./models/Message.js";
import ConnectionRequest from "./models/ConnectionRequest.js";
import Group from "./models/Group.js";
import CallLog from "./models/CallLog.js";
import Status from "./models/Status.js";
import Conversation from "./models/Conversation.js";
import Session from "./models/Session.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret";

const UPLOADS_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
app.use("/uploads", express.static(UPLOADS_DIR));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const safeName = (req.user?.username || "user").replace(/[^a-z0-9]/gi, "_");
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `${safeName}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype.startsWith("audio/") ||
      file.mimetype.startsWith("video/") ||
      file.mimetype.startsWith("application/")
    ) {
      cb(null, true);
    } else {
      cb(new Error("File type not allowed"));
    }
  },
});

app.use(
  cors({
    origin: (origin, callback) => callback(null, isOriginAllowed(origin)),
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());

const createToken = (user, sid) => {
  return jwt.sign(
    { id: user._id.toString(), username: user.username, sid },
    JWT_SECRET,
    { expiresIn: "1d" },
  );
};

const getUserFromToken = (req) => {
  const token = req.cookies?.token;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
};

// A token carries the id of the session that issued it. Revoking that session
// must therefore invalidate the token, otherwise "log out other devices" is
// purely cosmetic. Tokens minted before sessions were tracked have no sid and
// are allowed through until they expire naturally.
const isSessionActive = async (sid) => {
  if (!sid) return true;
  const session = await Session.findById(sid).select("revoked").lean();
  return !!session && session.revoked !== true;
};

const clearAuthCookie = (res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
};

const authMiddleware = async (req, res, next) => {
  const user = getUserFromToken(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    if (!(await isSessionActive(user.sid))) {
      clearAuthCookie(res);
      return res.status(401).json({ error: "Session revoked" });
    }
  } catch {
    // If the session lookup fails, fall back to the token itself.
  }
  req.user = user;
  next();
};

const sendAuthCookie = (res, token) => {
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24,
  });
};

const getOrCreateSession = async (user, req) => {
  try {
    const deviceName = (req.headers["user-agent"] || "Unknown device").slice(0, 120);
    const existing = await Session.findOne({
      userId: user.username,
      revoked: { $ne: true },
      deviceName,
    });
    if (existing) {
      existing.lastActive = new Date();
      await existing.save();
      return existing;
    }
    return await Session.create({
      userId: user.username,
      deviceName,
      ip: req.ip || req.socket?.remoteAddress || "",
      current: true,
      lastActive: new Date(),
    });
  } catch (error) {
    console.error("Failed to record session:", error.message);
    return null;
  }
};

// ==================== AUTH ROUTES ====================

app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username and password are required" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  const normalizedUsername = username.trim().toLowerCase();
  const existing = await User.findOne({ username: normalizedUsername });
  if (existing) {
    return res.status(409).json({ error: "Username already taken" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    username: normalizedUsername,
    password: hashedPassword,
  });
  const session = await getOrCreateSession(user, req);
  const token = createToken(user, session?._id?.toString());
  sendAuthCookie(res, token);
  res.json({ username: user.username });
});

app.post("/api/login", async (req, res) => {
  const { username, password, pin } = req.body;
  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username and password are required" });
  }

  const normalizedUsername = username.trim().toLowerCase();
  const user = await User.findOne({ username: normalizedUsername });
  if (!user) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  if (user.twoStepEnabled) {
    if (!pin) {
      // Password is correct but the second factor is still required.
      return res.json({
        requiresTwoStep: true,
        username: user.username,
      });
    }
    const pinValid = await bcrypt.compare(String(pin), user.twoStepPin || "");
    if (!pinValid) {
      return res.status(401).json({ error: "Incorrect PIN" });
    }
  }

  const session = await getOrCreateSession(user, req);
  const token = createToken(user, session?._id?.toString());
  sendAuthCookie(res, token);
  res.json({ username: user.username, twoStepEnabled: !!user.twoStepEnabled });
});

app.get("/api/me", async (req, res) => {
  const user = getUserFromToken(req);
  if (!user) {
    return res.json({ authenticated: false });
  }
  if (!(await isSessionActive(user.sid))) {
    clearAuthCookie(res);
    return res.json({ authenticated: false });
  }
  const dbUser = await User.findOne({ username: user.username }).select(
    "username twoStepEnabled twoStepPin",
  );
  res.json({
    authenticated: true,
    username: user.username,
    twoStepEnabled: !!dbUser?.twoStepEnabled,
  });
});

app.post("/api/logout", authMiddleware, async (req, res) => {
  await User.findOneAndUpdate(
    { username: req.user.username },
    { lastSeen: new Date() },
  ).catch(() => {});
  if (req.user.sid) {
    await Session.updateOne(
      { _id: req.user.sid, userId: req.user.username },
      { $set: { revoked: true } },
    ).catch(() => {});
  }
  clearAuthCookie(res);
  res.json({ message: "Logged out" });
});

// ==================== PROFILE ROUTES ====================

app.get("/api/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username }).select(
      "-password",
    );
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({
      username: user.username,
      displayName: user.displayName || user.username,
      status: user.status || "",
      location: user.location || "",
      avatar: user.avatar || "",
      coverImage: user.coverImage || "",
      createdAt: user.createdAt,
      online: true,
      lastSeen: user.lastSeen,
      preferences: user.preferences || {},
    });
  } catch (error) {
    console.error("Failed to fetch profile:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

app.put("/api/profile", authMiddleware, async (req, res) => {
  try {
    const { displayName, status, location } = req.body;
    const user = await User.findOne({ username: req.user.username });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (displayName !== undefined) user.displayName = String(displayName);
    if (status !== undefined) user.status = String(status);
    if (location !== undefined) user.location = String(location);

    await user.save();
    res.json({
      username: user.username,
      displayName: user.displayName || user.username,
      status: user.status,
      location: user.location,
      avatar: user.avatar || "",
      coverImage: user.coverImage || "",
      createdAt: user.createdAt,
      online: true,
      preferences: user.preferences || {},
    });
  } catch (error) {
    console.error("Failed to update profile:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

app.post(
  "/api/profile/avatar",
  authMiddleware,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image uploaded" });
      }
      const user = await User.findOne({ username: req.user.username });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const oldAvatar = user.avatar;
      user.avatar = `/uploads/${req.file.filename}`;
      await user.save();

      if (oldAvatar && oldAvatar.startsWith("/uploads/")) {
        const oldPath = path.join(__dirname, oldAvatar);
        fs.unlink(oldPath, () => {});
      }

      res.json({ avatar: user.avatar, message: "Avatar updated" });
    } catch (error) {
      console.error("Failed to upload avatar:", error);
      res.status(500).json({ error: "Failed to upload avatar" });
    }
  },
);

app.post(
  "/api/profile/cover",
  authMiddleware,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image uploaded" });
      }
      const user = await User.findOne({ username: req.user.username });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const oldCover = user.coverImage;
      user.coverImage = `/uploads/${req.file.filename}`;
      await user.save();

      if (oldCover && oldCover.startsWith("/uploads/")) {
        const oldPath = path.join(__dirname, oldCover);
        fs.unlink(oldPath, () => {});
      }

      res.json({ coverImage: user.coverImage, message: "Cover updated" });
    } catch (error) {
      console.error("Failed to upload cover:", error);
      res.status(500).json({ error: "Failed to upload cover" });
    }
  },
);

app.put("/api/profile/password", authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Both passwords are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters" });
    }
    const user = await User.findOne({ username: req.user.username });
    if (!user) return res.status(404).json({ error: "User not found" });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: "Password updated" });
  } catch (error) {
    console.error("Failed to change password:", error);
    res.status(500).json({ error: "Failed to change password" });
  }
});

app.put("/api/profile/preferences", authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username });
    if (!user) return res.status(404).json({ error: "User not found" });

    const allowedKeys = ["notifications", "sounds", "readReceipts", "darkMode", "themeAccent"];
    const updates = {};
    for (const key of allowedKeys) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    user.preferences = { ...user.preferences, ...updates };
    await user.save();
    res.json({ preferences: user.preferences });
  } catch (error) {
    console.error("Failed to update preferences:", error);
    res.status(500).json({ error: "Failed to update preferences" });
  }
});

// ==================== BLOCK / UNBLOCK ====================

app.post("/api/users/:username/block", authMiddleware, async (req, res) => {
  try {
    const currentUser = req.user.username;
    const targetUser = req.params.username.trim().toLowerCase();
    if (targetUser === currentUser) {
      return res.status(400).json({ error: "Cannot block yourself" });
    }
    const user = await User.findOne({ username: currentUser });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (!user.blockedUsers.includes(targetUser)) {
      user.blockedUsers.push(targetUser);
      await user.save();
    }
    res.json({ message: "User blocked" });
  } catch (error) {
    console.error("Failed to block user:", error);
    res.status(500).json({ error: "Failed to block user" });
  }
});

app.post("/api/users/:username/unblock", authMiddleware, async (req, res) => {
  try {
    const currentUser = req.user.username;
    const targetUser = req.params.username.trim().toLowerCase();
    const user = await User.findOne({ username: currentUser });
    if (!user) return res.status(404).json({ error: "User not found" });

    user.blockedUsers = user.blockedUsers.filter((u) => u !== targetUser);
    await user.save();
    res.json({ message: "User unblocked" });
  } catch (error) {
    console.error("Failed to unblock user:", error);
    res.status(500).json({ error: "Failed to unblock user" });
  }
});

app.get("/api/users/blocked", authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username }).select(
      "blockedUsers",
    );
    if (!user) return res.status(404).json({ error: "User not found" });

    const blocked = await User.find({
      username: { $in: user.blockedUsers },
    }).select("username displayName avatar");

    res.json(blocked);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch blocked users" });
  }
});

// ==================== USERS ====================

app.get("/api/users", authMiddleware, async (req, res) => {
  try {
    const currentUser = req.user.username;
    const users = await User.find({ username: { $ne: currentUser } }).select(
      "username avatar displayName blockedUsers lastSeen",
    );

    const requests = await ConnectionRequest.find({
      $or: [{ requesterId: currentUser }, { receiverId: currentUser }],
    });

    const statusMap = new Map();
    requests.forEach((request) => {
      const partner =
        request.requesterId === currentUser
          ? request.receiverId
          : request.requesterId;
      let connectionStatus = "none";
      if (request.status === "accepted") {
        connectionStatus = "accepted";
      } else if (request.status === "pending") {
        connectionStatus =
          request.requesterId === currentUser
            ? "pendingOutgoing"
            : "pendingIncoming";
      } else if (request.status === "rejected") {
        connectionStatus = "rejected";
      }
      statusMap.set(partner, {
        connectionStatus,
        requestId: request._id,
      });
    });

    const me = await User.findOne({ username: currentUser }).select("blockedUsers");

    const result = users.map((user) => {
      const status = statusMap.get(user.username) || {
        connectionStatus: "none",
      };
      const isBlocked =
        me?.blockedUsers?.includes(user.username) ||
        user.blockedUsers?.includes(currentUser);
      return {
        username: user.username,
        displayName: user.displayName || user.username,
        avatar: user.avatar || "",
        ...status,
        isBlocked,
        lastSeen: user.lastSeen,
      };
    });

    res.json(result);
  } catch (error) {
    console.error("Failed to load users:", error);
    res.status(500).json({ error: "Failed to load users" });
  }
});

// ==================== CONNECTIONS ====================

app.get("/api/conversations", authMiddleware, async (req, res) => {
  try {
    const currentUser = req.user.username;

    const conversations = await Message.aggregate([
      {
        $match: {
          receiverType: "user",
          status: { $ne: "scheduled" },
          deletedFor: { $ne: currentUser },
          $or: [{ senderId: currentUser }, { receiverId: currentUser }],
        },
      },
      {
        $addFields: {
          partnerId: {
            $cond: [
              { $eq: ["$senderId", currentUser] },
              "$receiverId",
              "$senderId",
            ],
          },
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$partnerId",
          text: { $first: "$text" },
          senderId: { $first: "$senderId" },
          timestamp: { $first: "$createdAt" },
          deleted: { $first: "$deleted" },
          messageType: { $first: "$messageType" },
          imageUrl: { $first: "$imageUrl" },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$receiverId", currentUser] },
                    { $ne: ["$status", "seen"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    res.json(
      conversations.map((conv) => {
        let preview = conv.text;
        if (conv.deleted) {
          preview = "This message was deleted";
        } else if (conv.senderId === currentUser && conv._id !== currentUser) {
          preview = `You: ${conv.text}`;
        } else if (conv.messageType === "image" && !conv.text) {
          preview = conv.senderId === currentUser ? "You: 📷 Photo" : "📷 Photo";
        } else if (conv.messageType === "file") {
          preview = conv.senderId === currentUser ? `You: ${conv.text}` : conv.text;
        }
        return {
          id: conv._id,
          name: conv._id,
          preview,
          timestamp: conv.timestamp,
          unreadCount: conv.unreadCount || 0,
        };
      }),
    );
  } catch (error) {
    console.error("Failed to load conversations:", error);
    res.status(500).json({ error: "Failed to load conversations" });
  }
});

app.post("/api/requests", authMiddleware, async (req, res) => {
  try {
    const currentUser = req.user.username;
    const receiverId = String(req.body.receiverId || "")
      .trim()
      .toLowerCase();

    if (!receiverId || receiverId === currentUser) {
      return res.status(400).json({ error: "Invalid user to connect with." });
    }

    const receiver = await User.findOne({ username: receiverId });
    if (!receiver) {
      return res.status(404).json({ error: "User not found." });
    }

    const existing = await ConnectionRequest.findOne({
      $or: [
        { requesterId: currentUser, receiverId },
        { requesterId: receiverId, receiverId: currentUser },
      ],
    });

    if (existing) {
      if (existing.status === "pending") {
        return res.status(400).json({ error: "A request already exists." });
      }
      if (existing.status === "accepted") {
        return res.status(400).json({ error: "You are already connected." });
      }
      if (existing.status === "rejected") {
        existing.status = "pending";
        existing.requesterId = currentUser;
        existing.receiverId = receiverId;
        await existing.save();
        return res.json({ message: "Connection request sent." });
      }
    }

    await ConnectionRequest.create({
      requesterId: currentUser,
      receiverId,
    });

    res.json({ message: "Connection request sent." });
  } catch (error) {
    console.error("Failed to send request:", error);
    res.status(500).json({ error: "Failed to send connection request." });
  }
});

app.post(
  "/api/requests/:requestId/accept",
  authMiddleware,
  async (req, res) => {
    try {
      const currentUser = req.user.username;
      const requestId = req.params.requestId;
      const request = await ConnectionRequest.findById(requestId);

      if (!request) {
        return res.status(404).json({ error: "Request not found." });
      }
      if (request.receiverId !== currentUser) {
        return res.status(403).json({ error: "Not authorized." });
      }
      request.status = "accepted";
      await request.save();
      res.json({ message: "Request accepted." });
    } catch (error) {
      console.error("Failed to accept request:", error);
      res.status(500).json({ error: "Failed to accept connection request." });
    }
  },
);

app.post(
  "/api/requests/:requestId/reject",
  authMiddleware,
  async (req, res) => {
    try {
      const currentUser = req.user.username;
      const requestId = req.params.requestId;
      const request = await ConnectionRequest.findById(requestId);

      if (!request) {
        return res.status(404).json({ error: "Request not found." });
      }
      if (request.receiverId !== currentUser) {
        return res.status(403).json({ error: "Not authorized." });
      }
      request.status = "rejected";
      await request.save();
      res.json({ message: "Request rejected." });
    } catch (error) {
      console.error("Failed to reject request:", error);
      res.status(500).json({ error: "Failed to reject connection request." });
    }
  },
);

app.post(
  "/api/users/:username/unfriend",
  authMiddleware,
  async (req, res) => {
    try {
      const currentUser = req.user.username;
      const targetUser = req.params.username.trim().toLowerCase();

      const result = await ConnectionRequest.deleteOne({
        $or: [
          { requesterId: currentUser, receiverId: targetUser },
          { requesterId: targetUser, receiverId: currentUser },
        ],
      });

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "Connection not found." });
      }

      res.json({ message: "Successfully unfriended." });
    } catch (error) {
      console.error("Failed to unfriend:", error);
      res.status(500).json({ error: "Failed to unfriend." });
    }
  },
);

// ==================== MESSAGES ====================

// NOTE: must be registered before "/api/messages/:receiverId" or Express
// treats "starred" as a username and this route is never reached.
app.get("/api/messages/starred", authMiddleware, async (req, res) => {
  try {
    const messages = await Message.find({
      starredBy: req.user.username,
      deleted: { $ne: true },
      deletedFor: { $ne: req.user.username },
      status: { $ne: "scheduled" },
    })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    res.json(
      messages.map((m) => ({
        ...m,
        id: m._id,
        reactions:
          m.reactions instanceof Map ? Object.fromEntries(m.reactions) : m.reactions || {},
      })),
    );
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch starred messages" });
  }
});

app.get("/api/messages/:receiverId", authMiddleware, async (req, res) => {
  try {
    const { receiverId } = req.params;
    const senderId = req.user.username;
    const { before, limit: limitStr } = req.query;
    const limit = Math.min(parseInt(limitStr || "50", 10), 100);

    const query = {
      receiverType: "user",
      deletedFor: { $ne: senderId },
      status: { $ne: "scheduled" },
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    };

    if (before) {
      if (!mongoose.isValidObjectId(before)) {
        return res.status(400).json({ error: "Invalid cursor" });
      }
      const beforeMsg = await Message.findById(before).lean();
      if (beforeMsg) {
        query.createdAt = { $lt: beforeMsg.createdAt };
      }
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const formatted = messages.reverse().map((m) => ({
      ...m,
      id: m._id,
      reactions: m.reactions instanceof Map ? Object.fromEntries(m.reactions) : (m.reactions || {}),
    }));

    res.json(formatted);
  } catch (error) {
    console.error("Failed to fetch messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

app.get("/api/messages/search/:receiverId", authMiddleware, async (req, res) => {
  try {
    const { receiverId } = req.params;
    const { q } = req.query;
    const senderId = req.user.username;

    if (!q || q.trim().length === 0) {
      return res.json([]);
    }

    const messages = await Message.find({
      receiverType: "user",
      deleted: { $ne: true },
      deletedFor: { $ne: senderId },
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
      text: { $regex: q, $options: "i" },
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json(
      messages.map((m) => ({
        ...m,
        id: m._id,
        reactions: m.reactions instanceof Map ? Object.fromEntries(m.reactions) : (m.reactions || {}),
      })),
    );
  } catch (error) {
    res.status(500).json({ error: "Failed to search messages" });
  }
});

// ==================== FILE UPLOAD FOR MESSAGES ====================

app.post(
  "/api/messages/upload",
  authMiddleware,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      res.json({
        url: `/uploads/${req.file.filename}`,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
      });
    } catch (error) {
      console.error("Failed to upload file:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  },
);

app.post(
  "/api/groups/:groupId/upload",
  authMiddleware,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const group = await Group.findOne({ name: req.params.groupId });
      if (!group || !group.members.includes(req.user.username)) {
        return res.status(403).json({ error: "Not a group member" });
      }
      res.json({
        url: `/uploads/${req.file.filename}`,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to upload file" });
    }
  },
);

// ==================== GROUPS ====================

app.get("/api/groups", authMiddleware, async (req, res) => {
  try {
    const groups = await Group.find({
      members: req.user.username,
    })
      .sort({ updatedAt: -1 })
      .lean();

    const groupsWithPreview = await Promise.all(
      groups.map(async (group) => {
        const lastMsg = await Message.findOne({
          receiverId: group.name,
          receiverType: "group",
        })
          .sort({ createdAt: -1 })
          .lean();

        return {
          id: group.name,
          name: group.name,
          description: group.description,
          avatar: group.avatar,
          members: group.members,
          admins: group.admins,
          createdBy: group.createdBy,
          preview: lastMsg
            ? lastMsg.deleted
              ? "Message deleted"
              : lastMsg.text || (lastMsg.messageType === "image" ? "📷 Photo" : lastMsg.messageType === "audio" ? "🎵 Voice message" : "📎 File")
            : "No messages yet",
          timestamp: lastMsg?.createdAt || group.updatedAt,
        };
      }),
    );

    res.json(groupsWithPreview);
  } catch (error) {
    console.error("Failed to load groups:", error);
    res.status(500).json({ error: "Failed to load groups" });
  }
});

app.post("/api/groups", authMiddleware, async (req, res) => {
  try {
    const { name, description, members } = req.body;
    const currentUser = req.user.username;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: "Group name is required" });
    }

    const normalizedName = name.trim().toLowerCase();
    const existing = await Group.findOne({ name: normalizedName });
    if (existing) {
      return res.status(409).json({ error: "A group with this name already exists" });
    }

    const allMembers = [...new Set([currentUser, ...(members || [])])];

    const group = await Group.create({
      name: normalizedName,
      description: description || "",
      createdBy: currentUser,
      admins: [currentUser],
      members: allMembers,
    });

    res.json({
      id: group.name,
      name: group.name,
      description: group.description,
      avatar: group.avatar,
      members: group.members,
      admins: group.admins,
      createdBy: group.createdBy,
    });
  } catch (error) {
    console.error("Failed to create group:", error);
    res.status(500).json({ error: "Failed to create group" });
  }
});

app.get("/api/groups/:groupId", authMiddleware, async (req, res) => {
  try {
    const group = await Group.findOne({ name: req.params.groupId }).lean();
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (!group.members.includes(req.user.username)) {
      return res.status(403).json({ error: "Not a group member" });
    }
    res.json({
      id: group.name,
      name: group.name,
      description: group.description,
      avatar: group.avatar,
      members: group.members,
      admins: group.admins,
      createdBy: group.createdBy,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch group" });
  }
});

app.put("/api/groups/:groupId", authMiddleware, async (req, res) => {
  try {
    const group = await Group.findOne({ name: req.params.groupId });
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (!group.admins.includes(req.user.username)) {
      return res.status(403).json({ error: "Only admins can edit the group" });
    }

    const { description, avatar } = req.body;
    if (description !== undefined) group.description = description;
    if (avatar !== undefined) group.avatar = avatar;
    await group.save();

    res.json({
      id: group.name,
      name: group.name,
      description: group.description,
      avatar: group.avatar,
      members: group.members,
      admins: group.admins,
      createdBy: group.createdBy,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to update group" });
  }
});

app.post(
  "/api/groups/:groupId/members",
  authMiddleware,
  async (req, res) => {
    try {
      const group = await Group.findOne({ name: req.params.groupId });
      if (!group) return res.status(404).json({ error: "Group not found" });
      if (!group.admins.includes(req.user.username)) {
        return res.status(403).json({ error: "Only admins can add members" });
      }

      const { members } = req.body;
      if (!members || !Array.isArray(members)) {
        return res.status(400).json({ error: "Members array is required" });
      }

      const newMembers = members
        .map((m) => m.trim().toLowerCase())
        .filter((m) => !group.members.includes(m));

      group.members.push(...newMembers);
      await group.save();

      res.json({
        members: group.members,
        added: newMembers,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to add members" });
    }
  },
);

app.delete(
  "/api/groups/:groupId/members/:username",
  authMiddleware,
  async (req, res) => {
    try {
      const group = await Group.findOne({ name: req.params.groupId });
      if (!group) return res.status(404).json({ error: "Group not found" });

      const targetMember = req.params.username.trim().toLowerCase();
      const isAdmin = group.admins.includes(req.user.username);
      const isSelf = req.user.username === targetMember;

      if (!isAdmin && !isSelf) {
        return res.status(403).json({ error: "Not authorized" });
      }

      group.members = group.members.filter((m) => m !== targetMember);
      if (isSelf && isAdmin) {
        group.admins = group.admins.filter((a) => a !== targetMember);
        if (group.admins.length === 0 && group.members.length > 0) {
          group.admins.push(group.members[0]);
        }
      }
      await group.save();

      res.json({ message: "Member removed", members: group.members });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove member" });
    }
  },
);

app.delete("/api/groups/:groupId", authMiddleware, async (req, res) => {
  try {
    const group = await Group.findOne({ name: req.params.groupId });
    if (!group) return res.status(404).json({ error: "Group not found" });
    if (group.createdBy !== req.user.username) {
      return res.status(403).json({ error: "Only the creator can delete the group" });
    }

    await Message.deleteMany({ receiverId: group.name, receiverType: "group" });
    await Group.deleteOne({ name: group.name });
    res.json({ message: "Group deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete group" });
  }
});

app.get(
  "/api/groups/:groupId/messages",
  authMiddleware,
  async (req, res) => {
    try {
      const group = await Group.findOne({ name: req.params.groupId });
      if (!group) return res.status(404).json({ error: "Group not found" });
      if (!group.members.includes(req.user.username)) {
        return res.status(403).json({ error: "Not a group member" });
      }

      const { before, limit: limitStr } = req.query;
      const limit = Math.min(parseInt(limitStr || "50", 10), 100);

      const query = {
        receiverId: group.name,
        receiverType: "group",
        deletedFor: { $ne: req.user.username },
        status: { $ne: "scheduled" },
      };
      if (before) {
        if (!mongoose.isValidObjectId(before)) {
          return res.status(400).json({ error: "Invalid cursor" });
        }
        const beforeMsg = await Message.findById(before).lean();
        if (beforeMsg) {
          query.createdAt = { $lt: beforeMsg.createdAt };
        }
      }

      const messages = await Message.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      res.json(
        messages.reverse().map((m) => ({
          ...m,
          id: m._id,
          reactions: m.reactions instanceof Map ? Object.fromEntries(m.reactions) : (m.reactions || {}),
        })),
      );
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch group messages" });
    }
  },
);

// ==================== CALL LOGS ====================

app.get("/api/calls", authMiddleware, async (req, res) => {
  try {
    const currentUser = req.user.username;
    const calls = await CallLog.find({
      $or: [{ callerId: currentUser }, { receiverId: currentUser }],
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json(
      calls.map((c) => ({
        ...c,
        id: c._id,
      })),
    );
  } catch (error) {
    res.status(500).json({ error: "Failed to load call logs" });
  }
});

app.delete("/api/calls/clear", authMiddleware, async (req, res) => {
  try {
    const currentUser = req.user.username;
    await CallLog.deleteMany({
      $or: [{ callerId: currentUser }, { receiverId: currentUser }],
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to clear call logs" });
  }
});

// ==================== STATUS (UPDATES) ====================

app.get("/api/status/all", authMiddleware, async (req, res) => {
  try {
    const currentUser = req.user.username;

    const requests = await ConnectionRequest.find({
      status: "accepted",
      $or: [{ requesterId: currentUser }, { receiverId: currentUser }],
    });
    const friends = new Set(
      requests.map((r) =>
        r.requesterId === currentUser ? r.receiverId : r.requesterId,
      ),
    );
    friends.add(currentUser);

    const statuses = await Status.find({
      userId: { $in: [...friends] },
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    res.json(
      statuses.map((s) => ({
        id: s._id,
        userId: s.userId,
        text: s.text,
        mediaUrl: s.mediaUrl,
        mediaType: s.mediaType,
        background: s.background,
        fontColor: s.fontColor,
        viewers: [...new Set(s.viewers || [])],
        reactions: Object.fromEntries(
          Object.entries(
            s.reactions instanceof Map
              ? Object.fromEntries(s.reactions)
              : s.reactions || {},
          ).map(([emoji, users]) => [emoji, [...new Set(users || [])]]),
        ),
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
      })),
    );
  } catch (error) {
    console.error("Failed to load statuses:", error);
    res.status(500).json({ error: "Failed to load statuses" });
  }
});

app.post("/api/status", authMiddleware, async (req, res) => {
  try {
    const { text, mediaUrl, mediaType, background, fontColor } = req.body;
    const status = await Status.create({
      userId: req.user.username,
      text: text || "",
      mediaUrl: mediaUrl || "",
      mediaType: mediaType === "image" ? "image" : "text",
      background: background || "#7c3aed",
      fontColor: fontColor || "#ffffff",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const io = (await import("./socket/socket.js")).io;
    io.emit("newStatus", {
      id: status._id,
      userId: status.userId,
      text: status.text,
      mediaUrl: status.mediaUrl,
      mediaType: status.mediaType,
      background: status.background,
      fontColor: status.fontColor,
      createdAt: status.createdAt,
      expiresAt: status.expiresAt,
    });

    res.json({
      id: status._id,
      userId: status.userId,
      text: status.text,
      mediaUrl: status.mediaUrl,
      mediaType: status.mediaType,
      background: status.background,
      fontColor: status.fontColor,
      createdAt: status.createdAt,
      expiresAt: status.expiresAt,
    });
  } catch (error) {
    console.error("Failed to create status:", error);
    res.status(500).json({ error: "Failed to create status" });
  }
});

app.post(
  "/api/status/upload",
  authMiddleware,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No image uploaded" });
      res.json({ url: `/uploads/${req.file.filename}` });
    } catch (error) {
      res.status(500).json({ error: "Failed to upload status image" });
    }
  },
);

app.post("/api/status/:id/view", authMiddleware, async (req, res) => {
  try {
    const status = await Status.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { viewers: req.user.username } },
      { new: true },
    );
    if (!status) return res.status(404).json({ error: "Status not found" });
    res.json({ viewers: [...new Set(status.viewers || [])] });
  } catch (error) {
    res.status(500).json({ error: "Failed to mark status seen" });
  }
});

app.post("/api/status/:id/react", authMiddleware, async (req, res) => {
  try {
    const status = await Status.findById(req.params.id);
    if (!status) return res.status(404).json({ error: "Status not found" });
    const { emoji } = req.body;
    if (!emoji) return res.status(400).json({ error: "Emoji is required" });

    const map =
      status.reactions instanceof Map
        ? status.reactions
        : new Map(Object.entries(status.reactions || {}));
    const users = new Set(map.get(emoji) || []);
    if (users.has(req.user.username)) {
      users.delete(req.user.username);
    } else {
      users.add(req.user.username);
    }
    map.set(emoji, [...users]);
    status.reactions = map;
    await status.save();

    const reactions = {};
    map.forEach((value, key) => {
      reactions[key] = [...new Set(value || [])];
    });

    const io = (await import("./socket/socket.js")).io;
    io.emit("statusReact", { id: status._id, reactions, by: req.user.username });

    res.json({ reactions });
  } catch (error) {
    res.status(500).json({ error: "Failed to react to status" });
  }
});

app.delete("/api/status/:id", authMiddleware, async (req, res) => {
  try {
    const status = await Status.findOne({
      _id: req.params.id,
      userId: req.user.username,
    });
    if (!status) return res.status(404).json({ error: "Status not found" });
    await Status.deleteOne({ _id: status._id });
    const io = (await import("./socket/socket.js")).io;
    io.emit("statusDeleted", { id: status._id, userId: status.userId });
    res.json({ message: "Status deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete status" });
  }
});

// ==================== CONVERSATION SETTINGS (PIN / MUTE / DISAPPEARING) ====================

// NOTE: registered before "/api/conversations/settings" so it is not shadowed.
app.get("/api/conversations/settings/all", authMiddleware, async (req, res) => {
  try {
    const rows = await Conversation.find({ userId: req.user.username }).lean();
    res.json(
      rows.map((s) => ({
        partnerId: s.partnerId,
        type: s.type,
        pinned: !!s.pinnedAt,
        pinnedAt: s.pinnedAt || null,
        muted: !!s.muted,
        mutedUntil: s.mutedUntil || null,
        disappearingEnabled: !!s.disappearingEnabled,
        disappearingDuration: s.disappearingDuration || null,
        wallpaper: s.wallpaper || "",
        archived: !!s.archived,
      })),
    );
  } catch (error) {
    res.status(500).json({ error: "Failed to load conversation settings" });
  }
});

app.get("/api/conversations/settings", authMiddleware, async (req, res) => {
  try {
    const { partnerId, type } = req.query;
    const settings = await Conversation.findOne({
      userId: req.user.username,
      partnerId,
      type: type || "user",
    }).lean();
    res.json(settings || {});
  } catch (error) {
    res.status(500).json({ error: "Failed to load conversation settings" });
  }
});

app.put("/api/conversations/settings", authMiddleware, async (req, res) => {
  try {
    const { partnerId, type, pinnedAt, muted, mutedUntil, disappearingEnabled, disappearingDuration, wallpaper, archived } = req.body;
    if (!partnerId) return res.status(400).json({ error: "partnerId is required" });

    const settings = await Conversation.findOneAndUpdate(
      { userId: req.user.username, partnerId, type: type || "user" },
      {
        $set: {
          ...(pinnedAt !== undefined && { pinnedAt }),
          ...(muted !== undefined && { muted }),
          ...(mutedUntil !== undefined && { mutedUntil }),
          ...(disappearingEnabled !== undefined && { disappearingEnabled }),
          ...(disappearingDuration !== undefined && { disappearingDuration }),
          ...(wallpaper !== undefined && { wallpaper }),
          ...(archived !== undefined && { archived }),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    res.json(settings);
  } catch (error) {
    console.error("Failed to update conversation settings:", error);
    res.status(500).json({ error: "Failed to update conversation settings" });
  }
});

// ==================== STARRED / PINNED MESSAGES ====================

app.post("/api/messages/:id/star", authMiddleware, async (req, res) => {
  try {
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ error: "Message not found" });
    const idx = msg.starredBy.indexOf(req.user.username);
    if (idx >= 0) {
      msg.starredBy.splice(idx, 1);
    } else {
      msg.starredBy.push(req.user.username);
    }
    await msg.save();
    res.json({ starredBy: msg.starredBy });
  } catch (error) {
    res.status(500).json({ error: "Failed to toggle star" });
  }
});

app.post("/api/messages/:id/pin", authMiddleware, async (req, res) => {
  try {
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ error: "Message not found" });
    if (msg.receiverType === "group") {
      const group = await Group.findOne({ name: msg.receiverId });
      if (!group || !group.admins.includes(req.user.username)) {
        return res.status(403).json({ error: "Only admins can pin messages" });
      }
    } else if (msg.senderId !== req.user.username) {
      return res.status(403).json({ error: "Cannot pin this message" });
    }
    msg.pinned = !msg.pinned;
    await msg.save();
    res.json({ pinned: msg.pinned });
  } catch (error) {
    res.status(500).json({ error: "Failed to toggle pin" });
  }
});

// ==================== POLLS ====================

app.post("/api/messages/:id/poll/vote", authMiddleware, async (req, res) => {
  try {
    const { optionIndex } = req.body;
    const msg = await Message.findById(req.params.id);
    if (!msg || !msg.poll) return res.status(404).json({ error: "Poll not found" });
    if (msg.poll.closed) return res.status(400).json({ error: "Poll is closed" });

    if (!msg.poll.multiple) {
      msg.poll.options.forEach((opt) => {
        opt.votes = opt.votes.filter((u) => u !== req.user.username);
      });
    }
    if (msg.poll.options[optionIndex]) {
      const votes = msg.poll.options[optionIndex].votes;
      if (votes.includes(req.user.username)) {
        msg.poll.options[optionIndex].votes = votes.filter(
          (u) => u !== req.user.username,
        );
      } else {
        msg.poll.options[optionIndex].votes.push(req.user.username);
      }
    }
    await msg.save();

    const { io } = await import("./socket/socket.js");
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
      const group = await Group.findOne({ name: msg.receiverId });
      if (group) group.members.forEach((m) => io.to(m).emit("pollUpdate", pollUpdate));
    } else {
      io.to(msg.receiverId).emit("pollUpdate", pollUpdate);
    }
    io.to(req.user.username).emit("pollUpdate", pollUpdate);
    res.json(pollUpdate.poll);
  } catch (error) {
    console.error("Failed to vote in poll:", error);
    res.status(500).json({ error: "Failed to vote" });
  }
});

// ==================== SCHEDULED MESSAGES ====================

app.post("/api/messages/schedule", authMiddleware, async (req, res) => {
  try {
    const { receiverId, text, scheduledAt, type } = req.body;
    if (!receiverId || !scheduledAt) {
      return res.status(400).json({ error: "receiverId and scheduledAt are required" });
    }
    const at = new Date(scheduledAt);
    if (isNaN(at.getTime())) {
      return res.status(400).json({ error: "Invalid scheduled time" });
    }

    const msg = await Message.create({
      senderId: req.user.username,
      receiverId,
      receiverType: type === "group" ? "group" : "user",
      text: text || "",
      scheduledAt: at,
      status: "scheduled",
    });

    res.json({ id: msg._id, scheduledAt: msg.scheduledAt });
  } catch (error) {
    console.error("Failed to schedule message:", error);
    res.status(500).json({ error: "Failed to schedule message" });
  }
});

// ==================== CLEAR + EXPORT CHAT ====================

app.post("/api/conversations/clear", authMiddleware, async (req, res) => {
  try {
    const { receiverId, type } = req.body;
    const senderId = req.user.username;
    if (!receiverId) {
      return res.status(400).json({ error: "receiverId is required" });
    }

    // Clear only for the requester; other participants keep their copy.
    const filter =
      type === "group"
        ? { receiverType: "group", receiverId }
        : {
            receiverType: "user",
            $or: [
              { senderId, receiverId },
              { senderId: receiverId, receiverId: senderId },
            ],
          };

    await Message.updateMany(
      { ...filter, deletedFor: { $ne: senderId } },
      { $addToSet: { deletedFor: senderId } },
    );
    res.json({ message: "Chat cleared" });
  } catch (error) {
    res.status(500).json({ error: "Failed to clear chat" });
  }
});

app.get("/api/conversations/:receiverId/export", authMiddleware, async (req, res) => {
  try {
    const { receiverId } = req.params;
    const senderId = req.user.username;
    const isGroup = req.query.type === "group";

    if (isGroup) {
      const group = await Group.findOne({ name: receiverId });
      if (!group) return res.status(404).json({ error: "Group not found" });
      if (!group.members.includes(senderId)) {
        return res.status(403).json({ error: "Not a group member" });
      }
    }

    const messages = await Message.find(
      isGroup
        ? {
            receiverType: "group",
            receiverId,
            deleted: { $ne: true },
            status: { $ne: "scheduled" },
            deletedFor: { $ne: senderId },
          }
        : {
            receiverType: "user",
            deleted: { $ne: true },
            status: { $ne: "scheduled" },
            deletedFor: { $ne: senderId },
            $or: [
              { senderId, receiverId },
              { senderId: receiverId, receiverId: senderId },
            ],
          },
    )
      .sort({ createdAt: 1 })
      .lean();
    res.json({
      exportedAt: new Date().toISOString(),
      count: messages.length,
      messages,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to export chat" });
  }
});

// ==================== SESSIONS (ACTIVE DEVICES) ====================

const getDeviceName = (req) => {
  return req.headers["user-agent"] || "Unknown device";
};

app.get("/api/sessions", authMiddleware, async (req, res) => {
  try {
    const sessions = await Session.find({
      userId: req.user.username,
      revoked: { $ne: true },
    })
      .sort({ lastActive: -1 })
      .lean();
    res.json(
      sessions.map((s) => ({
        id: s._id,
        deviceName: s.deviceName,
        ip: s.ip,
        // "This device" is whoever holds the token this request came in on.
        current: String(s._id) === String(req.user.sid),
        lastActive: s.lastActive,
        createdAt: s.createdAt,
      })),
    );
  } catch (error) {
    res.status(500).json({ error: "Failed to load sessions" });
  }
});

app.post("/api/sessions/:id/revoke", authMiddleware, async (req, res) => {
  try {
    const session = await Session.findOne({
      _id: req.params.id,
      userId: req.user.username,
    });
    if (!session) return res.status(404).json({ error: "Session not found" });

    const isSelf = String(session._id) === String(req.user.sid);
    session.revoked = true;
    await session.save();

    if (isSelf) clearAuthCookie(res);
    res.json({
      message: isSelf ? "Current session revoked" : "Session revoked",
      logout: isSelf,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to revoke session" });
  }
});

app.post("/api/sessions/logoutothers", authMiddleware, async (req, res) => {
  try {
    const result = await Session.updateMany(
      {
        userId: req.user.username,
        revoked: { $ne: true },
        _id: { $ne: req.user.sid },
      },
      { $set: { revoked: true } },
    );
    res.json({
      message: "Other sessions logged out",
      revokedCount: result.modifiedCount || 0,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to log out other sessions" });
  }
});

// ==================== TWO-STEP VERIFICATION ====================

app.post("/api/twostep/setup", authMiddleware, async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin || String(pin).length < 4) {
      return res.status(400).json({ error: "PIN must be at least 4 characters" });
    }
    const user = await User.findOne({ username: req.user.username });
    if (!user) return res.status(404).json({ error: "User not found" });
    user.twoStepEnabled = true;
    user.twoStepPin = await bcrypt.hash(String(pin), 10);
    await user.save();
    res.json({ twoStepEnabled: true, message: "Two-step verification enabled" });
  } catch (error) {
    res.status(500).json({ error: "Failed to enable two-step verification" });
  }
});

app.post("/api/twostep/disable", authMiddleware, async (req, res) => {
  try {
    const { pin } = req.body;
    const user = await User.findOne({ username: req.user.username });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.twoStepEnabled && user.twoStepPin) {
      const valid = await bcrypt.compare(String(pin || ""), user.twoStepPin);
      if (!valid) return res.status(401).json({ error: "Incorrect PIN" });
    }
    user.twoStepEnabled = false;
    user.twoStepPin = "";
    await user.save();
    res.json({ twoStepEnabled: false, message: "Two-step verification disabled" });
  } catch (error) {
    res.status(500).json({ error: "Failed to disable two-step verification" });
  }
});

app.post("/api/twostep/verify", authMiddleware, async (req, res) => {
  try {
    const { pin } = req.body;
    const user = await User.findOne({ username: req.user.username });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (!user.twoStepEnabled) {
      return res.json({ verified: true });
    }
    const valid = await bcrypt.compare(String(pin || ""), user.twoStepPin || "");
    if (!valid) return res.status(401).json({ error: "Incorrect PIN" });
    res.json({ verified: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to verify PIN" });
  }
});

// ==================== HEALTH ====================

app.get("/", (req, res) => {
  res.send("Hello World! Real-time Chat API is running.");
});

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB✅");
    server.listen(PORT, () => {
      console.log(`Server Running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.log("Error connecting to MongoDB", error.message);
  });