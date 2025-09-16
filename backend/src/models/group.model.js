import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    messages: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
      },
    ],
    profilePic: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// Optional: text search index for groups by name
groupSchema.index({ name: "text" });

const Group = mongoose.model("Group", groupSchema);

export default Group;
