import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    deviceName: {
      type: String,
      default: "Unknown device",
    },
    ip: {
      type: String,
      default: "",
    },
    token: {
      type: String,
      default: "",
    },
    current: {
      type: Boolean,
      default: false,
    },
    revoked: {
      type: Boolean,
      default: false,
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

const Session =
  mongoose.models.Session || mongoose.model("Session", sessionSchema);
export default Session;