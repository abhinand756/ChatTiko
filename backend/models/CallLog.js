import mongoose from "mongoose";

const callLogSchema = new mongoose.Schema(
  {
    callerId: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    receiverId: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    callType: {
      type: String,
      enum: ["voice", "video"],
      default: "voice",
    },
    status: {
      type: String,
      enum: ["missed", "completed", "rejected", "canceled"],
      default: "missed",
    },
    startedAt: {
      type: Date,
      default: null,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    duration: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

const CallLog =
  mongoose.models.CallLog || mongoose.model("CallLog", callLogSchema);
export default CallLog;