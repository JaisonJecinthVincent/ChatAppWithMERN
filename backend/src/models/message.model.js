import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function() {
        return !this.groupId; // receiverId required only if not a group message
      },
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: function() {
        return !this.receiverId; // groupId required only if not a direct message
      },
    },
    text: {
      type: String,
    },
    image: {
      type: String,
    },
    fileUrl: {
      type: String,
    },
    fileName: {
      type: String,
    },
    fileSize: {
      type: Number,
    },
    fileType: {
      type: String,
      enum: ['image', 'video', 'audio', 'document', 'archive', 'other'],
    },
    mimeType: {
      type: String,
    },
    isSystemMessage: {
      type: Boolean,
      default: false,
    },
    systemMessageType: {
      type: String,
      enum: ['user_joined', 'user_left', 'admin_transferred', 'group_created'],
      required: function() {
        return this.isSystemMessage;
      },
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editHistory: [{
      originalText: String,
      editedAt: {
        type: Date,
        default: Date.now
      }
    }],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
    reactions: [{
      emoji: {
        type: String,
        required: true,
        enum: ['👍', '❤️', '😂', '😮', '😢', '😡'] // Supported reaction emojis
      },
      users: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }],
      count: {
        type: Number,
        default: 0
      }
    }],
    seenBy: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      seenAt: {
        type: Date,
        default: Date.now,
      }
    }],
  },
  { timestamps: true }
);

// Performance indexes for message queries optimization
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 }); // Direct messages query
messageSchema.index({ receiverId: 1, senderId: 1, createdAt: -1 }); // Reverse direct messages query
messageSchema.index({ groupId: 1, createdAt: -1 }); // Group messages query
messageSchema.index({ senderId: 1, createdAt: -1 }); // User's sent messages
messageSchema.index({ createdAt: -1 }); // General timestamp queries
messageSchema.index({ replyTo: 1 }, { sparse: true }); // Reply lookups
messageSchema.index({ "seenBy.user": 1, "seenBy.seenAt": -1 }, { sparse: true }); // Seen status queries

// Compound indexes for conversation queries (optimized for getMessages)
messageSchema.index({ 
  $or: [
    { senderId: 1, receiverId: 1 },
    { senderId: 1, receiverId: 1 }
  ],
  createdAt: -1 
}, { background: true });

// Group message seen status optimization
messageSchema.index({ groupId: 1, "seenBy.user": 1 }, { sparse: true });

const Message = mongoose.model("Message", messageSchema);

export default Message;
