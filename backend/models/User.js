import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    displayName: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      trim: true,
      maxlength: 150,
      default: "",
    },
    location: {
      type: String,
      trim: true,
      default: "",
    },
    avatar: {
      type: String,
      default: "",
    },
    coverImage: {
      type: String,
      default: "",
    },
    blockedUsers: [
      {
        type: String,
        lowercase: true,
        trim: true,
      },
    ],
    lastSeen: {
      type: Date,
      default: null,
    },
    preferences: {
      notifications: { type: Boolean, default: true },
      sounds: { type: Boolean, default: true },
      readReceipts: { type: Boolean, default: true },
      darkMode: { type: Boolean, default: true },
      themeAccent: { type: String, default: "violet" },
    },
    twoStepEnabled: {
      type: Boolean,
      default: false,
    },
    twoStepPin: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;