import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    partnerId: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["user", "group"],
      default: "user",
    },
    pinnedAt: {
      type: Date,
      default: null,
    },
    muted: {
      type: Boolean,
      default: false,
    },
    mutedUntil: {
      type: Date,
      default: null,
    },
    disappearingEnabled: {
      type: Boolean,
      default: false,
    },
    disappearingDuration: {
      type: Number,
      default: 0,
    },
    wallpaper: {
      type: String,
      default: "",
    },
    archived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

conversationSchema.index({ userId: 1, type: 1, partnerId: 1 }, { unique: true });

const Conversation =
  mongoose.models.Conversation || mongoose.model("Conversation", conversationSchema);
export default Conversation;