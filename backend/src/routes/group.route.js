import express from 'express';
import { protectRoute } from '../middleware/auth.middleware.js';
import { createGroup, getUserGroups, addUserToGroup, removeUserFromGroup, updateGroup, transferAdmin, searchGroups, joinGroup } from '../controllers/group.controller.js';
import { sendGroupMessage, getGroupMessages, markGroupMessagesSeen } from '../controllers/message.controller.js';

const router = express.Router();

router.post("/", protectRoute, createGroup);
router.get("/", protectRoute, getUserGroups);
router.get("/search", protectRoute, searchGroups);
router.post("/:groupId/join", protectRoute, joinGroup);
router.post("/:groupId/members", protectRoute, addUserToGroup);
router.delete("/:groupId/members", protectRoute, removeUserFromGroup);
router.put("/:groupId", protectRoute, updateGroup);
router.put("/:groupId/admin", protectRoute, transferAdmin);
// Send a message to a group
router.post("/:groupId/messages", protectRoute, sendGroupMessage);

// Get messages for a group
router.get("/:groupId/messages", protectRoute, getGroupMessages);

// Mark group messages as seen
router.put("/:groupId/messages/seen", protectRoute, markGroupMessagesSeen);

export default router;
