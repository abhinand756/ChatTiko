import mongoose from "mongoose";

const statusSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    text: {
      type: String,
      default: "",
    },
    mediaUrl: {
      type: String,
      default: "",
    },
    mediaType: {
      type: String,
      enum: ["text", "image"],
      default: "text",
    },
    background: {
      type: String,
      default: "#7c3aed",
    },
    fontColor: {
      type: String,
      default: "#ffffff",
    },
    viewers: [
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
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  },
  {
    timestamps: true,
  },
);

statusSchema.index({ userId: 1, createdAt: -1 });

const Status = mongoose.models.Status || mongoose.model("Status", statusSchema);
export default Status;