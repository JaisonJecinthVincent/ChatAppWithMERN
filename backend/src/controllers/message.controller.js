import mongoose from "mongoose";
import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import Group from "../models/group.model.js";

import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import { messageQueue, groupMessageQueue } from "../lib/queue.js";
import pubSubManager from "../lib/pubsub.js";
import redisManager from "../lib/redis.js";

export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const cacheKey = `sidebar_users:${loggedInUserId}`;

    // Try to get from cache first
    let filteredUsers = await redisManager.get(cacheKey);
    if (filteredUsers) {
      console.log('📋 Serving users from cache');
      return res.status(200).json(JSON.parse(filteredUsers));
    }

    // If not in cache, query database with online status
    filteredUsers = await User.find({ _id: { $ne: loggedInUserId } })
      .select("-password")
      .select("+isOnline +lastSeen") // Include online status fields
      .lean(); // Use lean() for better performance

    // Cache for 2 minutes (reduced cache time for online status updates)
    await redisManager.setex(cacheKey, 120, JSON.stringify(filteredUsers));
    console.log('💾 Cached users for sidebar');

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const searchUsers = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Search for users by name or email (case-insensitive)
    const users = await User.find({
      _id: { $ne: loggedInUserId },
      $or: [
        { fullName: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ]
    })
    .select("-password")
    .limit(20); // Limit results

    res.status(200).json(users);
  } catch (error) {
    console.error("Error in searchUsers: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Create cache key for this conversation and page
    const cacheKey = `messages:${[myId, userToChatId].sort().join(':')}:page:${page}:limit:${limit}`;
    
    // Try to get from Redis cache first
    let cachedData = await redisManager.get(cacheKey);
    if (cachedData) {
      console.log('📋 Serving messages from cache');
      return res.status(200).json(JSON.parse(cachedData));
    }

    console.log('💾 Cache miss - querying database');
    
    // If not in cache, get from database with pagination
    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    })
    .populate({
      path: "replyTo",
      populate: {
        path: "senderId",
        select: "fullName profilePic"
      }
    })
    .sort({ createdAt: -1 }) // Most recent first
    .skip(skip)
    .limit(limit)
    .lean(); // Use lean() for better performance

    // Reverse to get chronological order
    const sortedMessages = messages.reverse();

    // Cache the result for 10 minutes
    await redisManager.setex(cacheKey, 600, JSON.stringify(sortedMessages));
    console.log('💾 Cached messages for conversation');

    res.status(200).json(sortedMessages);
  } catch (error) {
    console.error("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image, replyTo, fileUrl, fileName, fileSize, fileType, mimeType } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    console.log(`[sendMessage] Received request to send message to ${receiverId}`);
    // Validate input - message must contain text, image, or file
    if (!text && !image && !fileUrl) {
      return res.status(400).json({ error: "Message must contain text, image, or file" });
    }

    // Check if receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ error: "Receiver not found" });
    }

    // Use queue for asynchronous processing
    const messageData = {
      messageId: new mongoose.Types.ObjectId(),
      senderId,
      receiverId,
      text,
      image,
      replyTo,
      fileUrl,
      fileName,
      fileSize,
      fileType,
      mimeType,
      timestamp: new Date(),
    };

    const job = await messageQueue.add('process-direct-message', {
      messageData, // Wrap in messageData object for consistency
    }, {
      priority: 1, // High priority
      delay: 0, // Process immediately
    });

    console.log(`[sendMessage] Job ${job.id} added to 'process-direct-message' queue for receiver ${receiverId}`);
    console.log(`[sendMessage] Job data:`, {
      messageId: messageData.messageId,
      senderId,
      receiverId,
      text: text ? text.substring(0, 50) + '...' : 'no text',
      hasImage: !!image,
    });

    // Check queue status after adding job
    const waiting = await messageQueue.getWaiting();
    const active = await messageQueue.getActive();
    console.log(`[sendMessage] Queue status after adding job: ${waiting.length} waiting, ${active.length} active`);

    // Return immediately with job ID
    res.status(202).json({ 
      message: "Message queued for processing",
      messageId: messageData.messageId,
      jobId: job.id,
      status: "processing"
    });

  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Mark group messages as seen
export const markGroupMessagesSeen = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    // Check if user is a member of the group
    const group = await Group.findById(groupId);
    if (!group || !group.members.includes(userId)) {
      return res.status(403).json({ error: "You are not a member of this group" });
    }

    // Mark messages as seen by this user
    await Message.updateMany(
      {
        groupId,
        senderId: { $ne: userId },
        'seenBy.user': { $ne: userId }
      },
      {
        $push: {
          seenBy: {
            user: userId,
            seenAt: new Date()
          }
        }
      }
    );

    res.status(200).json({ message: "Messages marked as seen" });
  } catch (error) {
    console.log("Error in markGroupMessagesSeen controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get messages for a group
export const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    // Cache keys
    const groupCacheKey = `group:${groupId}`;
    const messagesCacheKey = `group_messages:${groupId}`;

    // Check if user is a member of the group (with caching)
    let group = await redisManager.get(groupCacheKey);
    if (!group) {
      group = await Group.findById(groupId);
      if (!group) {
        return res.status(404).json({ error: "Group not found" });
      }
      // Cache group for 5 minutes
      await redisManager.setex(groupCacheKey, 300, JSON.stringify(group));
    } else {
      group = JSON.parse(group);
    }

    if (!group.members.includes(userId.toString())) {
      return res.status(403).json({ error: "You are not a member of this group" });
    }

    // Try to get messages from cache first
    let messages = await redisManager.get(messagesCacheKey);
    
    if (messages) {
      messages = JSON.parse(messages);
    } else {
      // Fetch from database
      messages = await Message.find({ groupId })
        .populate("senderId", "fullName profilePic")
        .populate({
          path: "replyTo",
          populate: {
            path: "senderId",
            select: "fullName profilePic"
          }
        })
        .sort({ createdAt: 1 });

      // Cache messages for 2 minutes
      await redisManager.setex(messagesCacheKey, 120, JSON.stringify(messages));
    }

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getGroupMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Send message to a group
export const sendGroupMessage = async (req, res) => {
  try {
    const { text, image, replyTo, fileUrl, fileName, fileSize, fileType, mimeType } = req.body;
    const { groupId } = req.params;
    const senderId = req.user._id;

    // Cache key for group validation
    const groupCacheKey = `group:${groupId}`;
    
    // Check if user is a member of the group (with caching)
    let group = await redisManager.get(groupCacheKey);
    if (!group) {
      group = await Group.findById(groupId);
      if (!group) {
        return res.status(404).json({ error: "Group not found" });
      }
      // Cache group for 5 minutes
      await redisManager.setex(groupCacheKey, 300, JSON.stringify(group));
    } else {
      group = JSON.parse(group);
    }

    if (!group.members.includes(senderId.toString())) {
      return res.status(403).json({ error: "You are not a member of this group" });
    }

    // Generate message ID for immediate response
    const messageId = new mongoose.Types.ObjectId();

    // Create message data
    const messageData = {
      messageId,
      senderId,
      groupId,
      text,
      image,
      replyTo: replyTo || undefined,
      fileUrl,
      fileName,
      fileSize,
      fileType,
      mimeType,
      timestamp: new Date(),
    };

    try {
      // Add to group message queue for async processing (FIXED: Use correct job name)
      const job = await groupMessageQueue.add('processGroupMessage', messageData, {
        priority: 1,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      });

      // Store job ID for tracking
      await redisManager.setex(`job:${messageId}`, 300, job.id);

      console.log(`[sendGroupMessage] Job ${job.id} added to 'processGroupMessage' queue for group ${groupId}`);
      console.log(`[sendGroupMessage] Job data:`, {
        messageId,
        senderId,
        groupId,
        text: text ? text.substring(0, 50) + '...' : 'no text',
        hasImage: !!image,
      });

      // Return immediate response with message ID
      res.status(201).json({
        messageId,
        senderId,
        groupId,
        text,
        image: image ? 'processing' : undefined,
        replyTo,
        createdAt: messageData.timestamp,
        status: 'processing'
      });

    } catch (queueError) {
      console.error('Error adding message to queue:', queueError);
      res.status(500).json({ error: "Message queuing failed" });
    }

  } catch (error) {
    console.log("Error in sendGroupMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Add reaction to message
export const addReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { reaction: emoji } = req.body;
    const userId = req.user._id;

    // Validate emoji
    const supportedEmojis = ['👍', '❤️', '😂', '😮', '😢', '😡'];
    if (!supportedEmojis.includes(emoji)) {
      return res.status(400).json({ error: "Unsupported emoji" });
    }

    // Find the message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Check if user has permission to react (member of the conversation)
    const isDirectMessage = message.receiverId;
    const isGroupMessage = message.groupId;
    
    if (isDirectMessage) {
      // For direct messages, user must be sender or receiver
      if (!message.senderId.equals(userId) && !message.receiverId.equals(userId)) {
        return res.status(403).json({ error: "Not authorized to react to this message" });
      }
    } else if (isGroupMessage) {
      // For group messages, user must be a member of the group
      const group = await Group.findById(message.groupId);
      if (!group || !group.members.includes(userId)) {
        return res.status(403).json({ error: "Not authorized to react to this message" });
      }
    }

    // Find existing reaction for this emoji
    let reactionIndex = message.reactions.findIndex(r => r.emoji === emoji);
    
    if (reactionIndex === -1) {
      // Create new reaction
      message.reactions.push({
        emoji,
        users: [userId],
        count: 1
      });
    } else {
      // Check if user already reacted with this emoji
      const userIndex = message.reactions[reactionIndex].users.indexOf(userId);
      
      if (userIndex === -1) {
        // Add user to existing reaction
        message.reactions[reactionIndex].users.push(userId);
        message.reactions[reactionIndex].count++;
      } else {
        // User already reacted with this emoji
        return res.status(400).json({ error: "User has already reacted with this emoji" });
      }
    }

    await message.save();

    // Populate reaction users for response
    await message.populate('reactions.users', 'fullName profilePic');

    // Emit real-time update via Socket.IO
    if (isDirectMessage) {
      // For direct messages, emit to both sender and receiver
      const senderSocketId = getReceiverSocketId(message.senderId.toString());
      const receiverSocketId = getReceiverSocketId(message.receiverId.toString());
      
      const reactionData = {
        messageId,
        reactions: message.reactions,
        updatedBy: userId
      };
      
      if (senderSocketId) {
        io.to(senderSocketId).emit('messageReactionUpdate', reactionData);
      }
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('messageReactionUpdate', reactionData);
      }
    } else if (isGroupMessage) {
      // For group messages, emit to all group members
      io.to(`group_${message.groupId}`).emit('messageReactionUpdate', {
        messageId,
        reactions: message.reactions,
        updatedBy: userId
      });
    }

    res.status(200).json({
      message: "Reaction updated successfully",
      reactions: message.reactions
    });

  } catch (error) {
    console.error("Error in addReaction controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get reactions for a message
export const getMessageReactions = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId)
      .populate('reactions.users', 'fullName profilePic')
      .select('reactions senderId receiverId groupId');

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Check if user has permission to view reactions
    const isDirectMessage = message.receiverId;
    const isGroupMessage = message.groupId;
    
    if (isDirectMessage) {
      if (!message.senderId.equals(userId) && !message.receiverId.equals(userId)) {
        return res.status(403).json({ error: "Not authorized to view this message's reactions" });
      }
    } else if (isGroupMessage) {
      const group = await Group.findById(message.groupId);
      if (!group || !group.members.includes(userId)) {
        return res.status(403).json({ error: "Not authorized to view this message's reactions" });
      }
    }

    res.status(200).json({ reactions: message.reactions });

  } catch (error) {
    console.error("Error in getMessageReactions controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Remove reaction from a message
export const removeReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { reaction: emoji } = req.body;
    const userId = req.user._id;

    // Validate input
    if (!emoji || typeof emoji !== 'string') {
      return res.status(400).json({ error: "Valid emoji reaction is required" });
    }

    // Find the message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Check if user has permission to react (member of the conversation)
    const isDirectMessage = message.receiverId;
    const isGroupMessage = message.groupId;
    
    if (isDirectMessage) {
      // For direct messages, user must be sender or receiver
      if (!message.senderId.equals(userId) && !message.receiverId.equals(userId)) {
        return res.status(403).json({ error: "Not authorized to react to this message" });
      }
    } else if (isGroupMessage) {
      // For group messages, user must be a member of the group
      const group = await Group.findById(message.groupId);
      if (!group || !group.members.includes(userId)) {
        return res.status(403).json({ error: "Not authorized to react to this message" });
      }
    }

    // Find existing reaction for this emoji
    const reactionIndex = message.reactions.findIndex(r => r.emoji === emoji);
    
    if (reactionIndex === -1) {
      return res.status(400).json({ error: "Reaction not found" });
    }

    // Check if user has this reaction
    const userIndex = message.reactions[reactionIndex].users.indexOf(userId);
    
    if (userIndex === -1) {
      return res.status(400).json({ error: "User has not reacted with this emoji" });
    }

    // Remove user from reaction
    message.reactions[reactionIndex].users.splice(userIndex, 1);
    message.reactions[reactionIndex].count--;
    
    // Remove reaction if no users left
    if (message.reactions[reactionIndex].count === 0) {
      message.reactions.splice(reactionIndex, 1);
    }

    await message.save();

    // Emit real-time update via Socket.IO
    if (isDirectMessage) {
      // For direct messages, emit to both sender and receiver
      const senderSocketId = getReceiverSocketId(message.senderId.toString());
      const receiverSocketId = getReceiverSocketId(message.receiverId.toString());
      
      const reactionData = {
        messageId,
        reactions: message.reactions,
        updatedBy: userId
      };
      
      if (senderSocketId) {
        io.to(senderSocketId).emit('messageReactionUpdate', reactionData);
      }
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('messageReactionUpdate', reactionData);
      }
    } else if (isGroupMessage) {
      // For group messages, emit to all group members
      io.to(`group_${message.groupId}`).emit('messageReactionUpdate', {
        messageId,
        reactions: message.reactions,
        updatedBy: userId
      });
    }

    res.status(200).json({
      message: "Reaction removed successfully",
      reactions: message.reactions
    });

  } catch (error) {
    console.error("Error in removeReaction controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Search messages controller
export const searchMessages = async (req, res) => {
  try {
    const userId = req.user._id;
    const { 
      q: query, 
      userId: targetUserId, 
      groupId,
      dateRange = 'all',
      messageType = 'all',
      page = 1,
      limit = 50
    } = req.query;

    if (!query || query.trim() === '') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Build the base search criteria
    let searchCriteria = {
      $or: [
        { text: { $regex: query, $options: 'i' } },
        { fileName: { $regex: query, $options: 'i' } }
      ]
    };

    // Add conversation filter (either direct messages or group messages)
    if (targetUserId) {
      // Search in direct messages with specific user
      searchCriteria.$and = [
        {
          $or: [
            { senderId: userId, receiverId: targetUserId },
            { senderId: targetUserId, receiverId: userId }
          ]
        }
      ];
    } else if (groupId) {
      // Search in specific group
      searchCriteria.groupId = groupId;
    } else {
      // Search in all conversations where user is involved
      searchCriteria.$and = [
        {
          $or: [
            { senderId: userId },
            { receiverId: userId },
            { groupId: { $in: await Group.find({ members: userId }).distinct('_id') } }
          ]
        }
      ];
    }

    // Add date range filter
    if (dateRange !== 'all') {
      const now = new Date();
      let startDate;

      switch (dateRange) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
      }

      if (startDate) {
        searchCriteria.createdAt = { $gte: startDate };
      }
    }

    // Add message type filter
    if (messageType !== 'all') {
      switch (messageType) {
        case 'text':
          searchCriteria.text = { $ne: null, $ne: '' };
          searchCriteria.fileUrl = { $exists: false };
          searchCriteria.image = { $exists: false };
          break;
        case 'files':
          searchCriteria.fileUrl = { $exists: true, $ne: null };
          break;
        case 'images':
          searchCriteria.$or = [
            { image: { $exists: true, $ne: null } },
            { fileType: 'image' }
          ];
          break;
      }
    }

    // Execute search with pagination
    const messages = await Message.find(searchCriteria)
      .populate('senderId', 'fullName profilePic')
      .populate('receiverId', 'fullName profilePic')
      .populate('groupId', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    // Get total count for pagination
    const totalCount = await Message.countDocuments(searchCriteria);

    // Cache results for 5 minutes (shorter cache for search results)
    const cacheKey = `search:${userId}:${Buffer.from(JSON.stringify(req.query)).toString('base64')}`;
    await redisManager.setex(cacheKey, 300, JSON.stringify({
      messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / parseInt(limit))
      }
    }));

    res.status(200).json({
      messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / parseInt(limit))
      }
    });

  } catch (error) {
    console.error("Error in searchMessages controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Edit message controller
export const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { text } = req.body;
    const userId = req.user._id;

    if (!text || text.trim() === '') {
      return res.status(400).json({ error: 'Message text is required' });
    }

    // Find the message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if user is the sender
    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Not authorized to edit this message' });
    }

    // Check if message is already deleted
    if (message.isDeleted) {
      return res.status(400).json({ error: 'Cannot edit deleted message' });
    }

    // Check edit time limit (15 minutes)
    const editTimeLimit = 15 * 60 * 1000; // 15 minutes in milliseconds
    const timeSinceCreation = Date.now() - message.createdAt.getTime();
    
    if (timeSinceCreation > editTimeLimit) {
      return res.status(400).json({ error: 'Edit time limit exceeded (15 minutes)' });
    }

    // Store original text in edit history if this is the first edit
    if (!message.isEdited) {
      message.editHistory = [{
        originalText: message.text,
        editedAt: new Date()
      }];
    }

    // Update message
    message.text = text.trim();
    message.isEdited = true;
    message.updatedAt = new Date();

    await message.save();

    // Populate sender information
    await message.populate("senderId", "fullName profilePic");

    // Emit update to all participants via Socket.IO
    const updateData = {
      messageId: message._id,
      text: message.text,
      isEdited: message.isEdited,
      updatedAt: message.updatedAt
    };

    if (message.receiverId) {
      // Private message
      const receiverSocketId = getReceiverSocketId(message.receiverId);
      const senderSocketId = getReceiverSocketId(userId);
      
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("messageEdited", updateData);
      }
      if (senderSocketId) {
        io.to(senderSocketId).emit("messageEdited", updateData);
      }
    } else if (message.groupId) {
      // Group message
      io.to(`group_${message.groupId}`).emit("messageEdited", updateData);
    }

    res.status(200).json({
      message: "Message edited successfully",
      data: message
    });

  } catch (error) {
    console.error("Error in editMessage controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete message controller
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    // Find the message
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if user is the sender
    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Not authorized to delete this message' });
    }

    // Check if message is already deleted
    if (message.isDeleted) {
      return res.status(400).json({ error: 'Message already deleted' });
    }

    // Soft delete: mark as deleted but keep in database
    message.isDeleted = true;
    message.deletedAt = new Date();
    message.text = 'This message was deleted';
    
    // Clear file attachments (but keep the message record)
    if (message.image) {
      message.image = null;
    }
    if (message.fileUrl) {
      message.fileUrl = null;
      message.fileName = null;
      message.fileSize = null;
      message.fileType = null;
      message.mimeType = null;
    }

    await message.save();

    // Populate sender information
    await message.populate("senderId", "fullName profilePic");

    // Emit update to all participants via Socket.IO
    const updateData = {
      messageId: message._id,
      isDeleted: message.isDeleted,
      text: message.text,
      deletedAt: message.deletedAt
    };

    if (message.receiverId) {
      // Private message
      const receiverSocketId = getReceiverSocketId(message.receiverId);
      const senderSocketId = getReceiverSocketId(userId);
      
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("messageDeleted", updateData);
      }
      if (senderSocketId) {
        io.to(senderSocketId).emit("messageDeleted", updateData);
      }
    } else if (message.groupId) {
      // Group message
      io.to(`group_${message.groupId}`).emit("messageDeleted", updateData);
    }

    res.status(200).json({
      message: "Message deleted successfully",
      data: message
    });

  } catch (error) {
    console.error("Error in deleteMessage controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
