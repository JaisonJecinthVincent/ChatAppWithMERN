import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: function() {
        // Password is not required for OAuth users
        return !this.oauthProviders || Object.keys(this.oauthProviders || {}).length === 0;
      },
      minlength: 6,
    },
    profilePic: {
      type: String,
      default: "",
    },
    oauthProviders: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
    loginCount: {
      type: Number,
      default: 0,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
  },
  { 
    timestamps: true 
  }
);

// Performance indexes for authentication optimization
userSchema.index({ email: 1 }); // Already created by unique: true, but explicit for clarity
// Note: _id index is automatically created by MongoDB, no need to specify
userSchema.index({ lastLogin: -1 }); // For active user queries
userSchema.index({ isEmailVerified: 1, email: 1 }); // Compound index for verified users
userSchema.index({ "oauthProviders.google.id": 1 }, { sparse: true }); // OAuth Google lookups
userSchema.index({ "oauthProviders.github.id": 1 }, { sparse: true }); // OAuth GitHub lookups
userSchema.index({ fullName: "text" }); // Text search index for user searches
userSchema.index({ createdAt: -1 }); // For user registration analytics
userSchema.index({ loginCount: -1 }); // For active user analytics

// Compound index for authentication middleware performance
userSchema.index({ _id: 1, isEmailVerified: 1 }, { sparse: true });

const User = mongoose.model("User", userSchema);

export default User;
