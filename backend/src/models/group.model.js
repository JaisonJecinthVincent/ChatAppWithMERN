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

// Performance indexes for group queries optimization
groupSchema.index({ name: "text" }); // Text search for group names
groupSchema.index({ members: 1 }); // User membership lookups
groupSchema.index({ admin: 1 }); // Admin user queries
groupSchema.index({ createdAt: -1 }); // Recently created groups
groupSchema.index({ members: 1, createdAt: -1 }); // User's groups ordered by creation
groupSchema.index({ admin: 1, members: 1 }); // Admin with member queries

const Group = mongoose.model("Group", groupSchema);

export default Group;
