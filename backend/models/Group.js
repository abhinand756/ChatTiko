import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 60,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },
    avatar: {
      type: String,
      default: "",
    },
    createdBy: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    admins: [
      {
        type: String,
        lowercase: true,
        trim: true,
      },
    ],
    members: [
      {
        type: String,
        lowercase: true,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
  },
);

const Group = mongoose.models.Group || mongoose.model("Group", groupSchema);
export default Group;