import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { 
  getMessages, 
  getUsersForSidebar, 
  sendMessage, 
  searchUsers,
  searchMessages,
  editMessage,
  deleteMessage,
  addReaction,
  getMessageReactions,
  removeReaction
} from "../controllers/message.controller.js";
import { messageRateLimit, userRateLimit } from "../middleware/rateLimiter.js";

const router = express.Router();

// Apply user rate limiting to all message routes
router.use(protectRoute, userRateLimit);

router.get("/users", getUsersForSidebar);
router.get("/users/search", searchUsers);
router.get("/search", searchMessages);
router.get("/:id", getMessages);

// Apply stricter rate limiting to sending messages
router.post("/send/:id", messageRateLimit, sendMessage);

// Message edit and delete routes
router.put("/edit/:messageId", messageRateLimit, editMessage);
router.delete("/:messageId", deleteMessage);

// Reaction routes
router.post("/reaction/:messageId", addReaction);
router.get("/reaction/:messageId", getMessageReactions);
router.delete("/reaction/:messageId", removeReaction);

export default router;
