import express from 'express';
import { protectRoute } from '../middleware/auth.middleware.js';
import { createGroup, getUserGroups, addUserToGroup, removeUserFromGroup } from '../controllers/group.controller.js';
import { sendGroupMessage, getGroupMessages } from '../controllers/message.controller.js';

const router = express.Router();

router.post("/", protectRoute, createGroup);
router.get("/", protectRoute, getUserGroups);
router.post("/:groupId/members", protectRoute, addUserToGroup);
router.delete("/:groupId/members/:userId", protectRoute, removeUserFromGroup);
// Send a message to a group
router.post("/:groupId/messages", protectRoute, sendGroupMessage);

// Get messages for a group
router.get("/:groupId/messages", protectRoute, getGroupMessages);
export default router;
