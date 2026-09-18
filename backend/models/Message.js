import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: String,
      required: true,
    },
    receiverId: {
      type: String,
      required: true,
    },
    receiverType: {
      type: String,
      enum: ["user", "group"],
      default: "user",
    },
    text: {
      type: String,
      default: "",
    },
    messageType: {
      type: String,
      enum: ["text", "audio", "image", "file", "video", "circular_video", "location", "contact"],
      default: "text",
    },
    audioUrl: {
      type: String,
      default: "",
    },
    audioDuration: {
      type: Number,
      default: 0,
    },
    imageUrl: {
      type: String,
      default: "",
    },
    fileName: {
      type: String,
      default: "",
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    fileType: {
      type: String,
      default: "",
    },
    fileUrl: {
      type: String,
      default: "",
    },
    edited: {
      type: Boolean,
      default: false,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
    deletedFor: [
      {
        type: String,
        lowercase: true,
        trim: true,
      },
    ],
    reactions: {
      type: Map,
      of: [String],
      default: {},
    },
    replyTo: {
      id: { type: String, default: "" },
      text: { type: String, default: "" },
      senderId: { type: String, default: "" },
      senderName: { type: String, default: "" },
      messageType: { type: String, default: "text" },
      imageUrl: { type: String, default: "" },
    },
    forwardedFrom: {
      type: String,
      default: "",
    },
    starredBy: [
      {
        type: String,
        lowercase: true,
        trim: true,
      },
    ],
    pinned: {
      type: Boolean,
      default: false,
    },
    content: {
      type: String,
      enum: ["text", "audio", "image", "file", "video", "circular_video", "location", "contact"],
      default: "text",
    },
    location: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      label: { type: String, default: "" },
    },
    contact: {
      name: { type: String, default: "" },
      username: { type: String, default: "" },
    },
    poll: {
      question: { type: String, default: "" },
      options: [
        {
          text: { type: String, default: "" },
          votes: [
            {
              type: String,
              lowercase: true,
              trim: true,
            },
          ],
        },
      ],
      multiple: { type: Boolean, default: false },
      anonymous: { type: Boolean, default: false },
      closed: { type: Boolean, default: false },
    },
    scheduledAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    readBy: [
      {
        type: String,
        lowercase: true,
        trim: true,
      },
    ],
    status: {
      type: String,
      enum: ["sent", "delivered", "seen", "scheduled"],
      default: "sent",
    },
  },
  {
    timestamps: true,
  },
);

const Message =
  mongoose.models.Message || mongoose.model("Message", messageSchema);

export default Message;