import mongoose from "mongoose";

const connectionRequestSchema = new mongoose.Schema(
  {
    requesterId: {
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
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  },
);

connectionRequestSchema.index(
  { requesterId: 1, receiverId: 1 },
  { unique: true },
);

const ConnectionRequest =
  mongoose.models.ConnectionRequest ||
  mongoose.model("ConnectionRequest", connectionRequestSchema);

export default ConnectionRequest;
