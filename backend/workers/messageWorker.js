import mongoose from "mongoose";
import User from "../src/models/user.model.js";
import Message from "../src/models/message.model.js";
import Group from "../src/models/group.model.js";
import cloudinary from "../src/lib/cloudinary.js";
import publisher from "../src/lib/publisher.js";
import redisManager from "../src/lib/redis.js";

// Test function to verify imports work
console.log('📦 MessageWorker imports loaded successfully');

// Process individual direct messages
export const processDirectMessage = async (job) => {
  console.log(`[processDirectMessage] Worker started processing job ${job.id}`);
  try {
    const { messageId, senderId, receiverId, text, image, replyTo, timestamp, fileUrl, fileName, fileSize, fileType, mimeType } = job.data;
    console.log(`[processDirectMessage] Job ${job.id} data:`, job.data);

    let imageUrl;
    if (image) {
      try {
        console.log(`[processDirectMessage] Job ${job.id}: Uploading image to Cloudinary...`);
        const uploadResponse = await cloudinary.uploader.upload(image);
        imageUrl = uploadResponse.secure_url;
        console.log(`[processDirectMessage] Job ${job.id}: Image uploaded: ${imageUrl}`);
      } catch (uploadError) {
        console.error(`[processDirectMessage] Job ${job.id}: Error uploading image:`, uploadError);
        throw new Error('Image upload failed');
      }
    }

    // Create the message
    console.log(`[processDirectMessage] Job ${job.id}: Saving message to MongoDB...`);
    const newMessage = new Message({
      _id: messageId,
      senderId,
      receiverId,
      text,
      image: imageUrl,
      fileUrl,
      fileName,
      fileSize,
      fileType,
      mimeType,
      replyTo: replyTo || undefined,
      createdAt: timestamp,
    });

    await newMessage.save();
    console.log(`[processDirectMessage] Job ${job.id}: Message saved to MongoDB.`);

    // Populate sender info and reply info
    await newMessage.populate("senderId", "fullName profilePic");
    await newMessage.populate({
      path: "replyTo",
      populate: {
        path: "senderId",
        select: "fullName profilePic"
      }
    });
    console.log(`[processDirectMessage] Job ${job.id}: Populated sender and reply info.`);

    // Invalidate cache for both users' conversations (all pagination combinations)
    const sortedIds = [senderId.toString(), receiverId.toString()].sort().join(':');
    const conversationPattern = `messages:${sortedIds}:*`;
    try {
      const keys = await redisManager.keys(conversationPattern);
      if (keys && keys.length > 0) {
        await redisManager.del(...keys);
        console.log(`[processDirectMessage] Job ${job.id}: Invalidated ${keys.length} cached message pages for conversation ${sortedIds}`);
      } else {
        console.log(`[processDirectMessage] Job ${job.id}: No cache keys to invalidate for conversation ${sortedIds}`);
      }
    } catch (error) {
      console.warn(`[processDirectMessage] Job ${job.id}: Failed to invalidate message cache:`, error.message);
    }

    // Publish message to pub/sub system for real-time delivery
    try {
      console.log(`[processDirectMessage] Job ${job.id}: Publishing to pubsub...`);
      await publisher.publish('new_message', {
        messageId,
        senderId,
        receiverId,
        text,
        image: imageUrl,
        fileUrl,
        fileName,
        fileSize,
        fileType,
        mimeType,
        createdAt: newMessage.createdAt,
        senderInfo: {
          fullName: newMessage.senderId.fullName,
          profilePic: newMessage.senderId.profilePic,
        }
      });
      console.log(`[processDirectMessage] Job ${job.id}: Published to pubsub.`);
    } catch (pubsubError) {
      console.error(`[processDirectMessage] Job ${job.id}: Error publishing to pubsub:`, pubsubError);
      throw pubsubError;
    }

    console.log(`[processDirectMessage] Job ${job.id}: Direct message ${messageId} processed and published successfully`);
    return { success: true, messageId, processedAt: new Date() };

  } catch (error) {
    console.error(`[processDirectMessage] Job ${job.id}: Error processing direct message:`, error);
    throw error;
  }
};

// Process group messages
export const processGroupMessage = async (job) => {
  console.log(`[processGroupMessage] Worker started processing job ${job.id}`);
  try {
    const { messageId, senderId, groupId, text, image, replyTo, timestamp, fileUrl, fileName, fileSize, fileType, mimeType } = job.data;
    console.log(`[processGroupMessage] Job ${job.id} data:`, job.data);

    let imageUrl;
    if (image) {
      try {
        console.log(`[processGroupMessage] Job ${job.id}: Uploading image to Cloudinary...`);
        const uploadResponse = await cloudinary.uploader.upload(image);
        imageUrl = uploadResponse.secure_url;
        console.log(`[processGroupMessage] Job ${job.id}: Image uploaded: ${imageUrl}`);
      } catch (uploadError) {
        console.error(`[processGroupMessage] Job ${job.id}: Error uploading image:`, uploadError);
        throw new Error('Image upload failed');
      }
    }

    // Create the message
    console.log(`[processGroupMessage] Job ${job.id}: Saving message to MongoDB...`);
    const newMessage = new Message({
      _id: messageId,
      senderId,
      groupId,
      text,
      image: imageUrl,
      fileUrl,
      fileName,
      fileSize,
      fileType,
      mimeType,
      replyTo: replyTo || undefined,
      createdAt: timestamp,
    });

    await newMessage.save();
    console.log(`[processGroupMessage] Job ${job.id}: Message saved to MongoDB.`);

    // Populate sender info and reply info
    await newMessage.populate("senderId", "fullName profilePic");
    await newMessage.populate({
      path: "replyTo",
      populate: {
        path: "senderId",
        select: "fullName profilePic"
      }
    });
    console.log(`[processGroupMessage] Job ${job.id}: Populated sender and reply info.`);

    // Invalidate group messages cache
    const groupMessagesCacheKey = `group_messages:${groupId}`;
    try {
      await redisManager.del(groupMessagesCacheKey);
      console.log(`[processGroupMessage] Job ${job.id}: Invalidated group messages cache for group ${groupId}`);
    } catch (error) {
      console.warn(`[processGroupMessage] Job ${job.id}: Failed to invalidate group message cache:`, error.message);
    }

    // Get group members for notification
    let group;
    try {
      group = await Group.findById(groupId).select('members');
      if (!group) {
        throw new Error('Group not found');
      }
      console.log(`[processGroupMessage] Job ${job.id}: Fetched group members:`, group.members);
    } catch (groupError) {
      console.error(`[processGroupMessage] Job ${job.id}: Error fetching group members:`, groupError);
      throw groupError;
    }

    // Publish message to pub/sub system for real-time delivery
    try {
      console.log(`[processGroupMessage] Job ${job.id}: Publishing to pubsub...`);
      await publisher.publish('group_message', {
        messageId,
        senderId,
        groupId,
        text,
        image: imageUrl,
        fileUrl,
        fileName,
        fileSize,
        fileType,
        mimeType,
        createdAt: newMessage.createdAt,
        senderInfo: {
          fullName: newMessage.senderId.fullName,
          profilePic: newMessage.senderId.profilePic,
        },
        members: group.members
      });
      console.log(`[processGroupMessage] Job ${job.id}: Published to pubsub.`);
    } catch (pubsubError) {
      console.error(`[processGroupMessage] Job ${job.id}: Error publishing to pubsub:`, pubsubError);
      throw pubsubError;
    }

    console.log(`[processGroupMessage] Job ${job.id}: Group message ${messageId} processed and published successfully`);
    return { success: true, messageId, processedAt: new Date() };

  } catch (error) {
    console.error(`[processGroupMessage] Job ${job.id}: Error processing group message:`, error);
    throw error;
  }
};

// Process image uploads separately for better performance
export const processImageUpload = async (job) => {
  try {
    const { imageData, messageId, context } = job.data;
    
    const uploadResponse = await cloudinary.uploader.upload(imageData, {
      folder: 'chat_images',
      transformation: [
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ]
    });

    // Update the message with the processed image URL
    await Message.findByIdAndUpdate(messageId, {
      image: uploadResponse.secure_url,
      imageProcessed: true
    });

    // Publish image processing completion
    await publisher.publish('image_processed', {
      messageId,
      imageUrl: uploadResponse.secure_url,
      context
    });

    console.log(`Image upload ${messageId} processed successfully`);
    return { success: true, imageUrl: uploadResponse.secure_url };

  } catch (error) {
    console.error('Error processing image upload:', error);
    throw error;
  }
};

// Process bulk notifications
export const processNotification = async (job) => {
  try {
    const { type, recipients, data, priority = 'normal' } = job.data;
    
    // Handle different notification types
    switch (type) {
      case 'message_notification':
        await handleMessageNotification(recipients, data);
        break;
      case 'group_mention':
        await handleGroupMention(recipients, data);
        break;
      case 'system_notification':
        await handleSystemNotification(recipients, data);
        break;
      default:
        console.warn(`Unknown notification type: ${type}`);
    }

    console.log(`Notification processed for ${recipients.length} recipients`);
    return { success: true, processedAt: new Date() };

  } catch (error) {
    console.error('Error processing notification:', error);
    throw error;
  }
};

// Helper functions for notification handling
const handleMessageNotification = async (recipients, data) => {
  // Publish to real-time notification system
  await publisher.publish('notification', {
    type: 'message',
    recipients,
    data
  });
};

const handleGroupMention = async (recipients, data) => {
  // Handle @mentions in group messages
  await publisher.publish('notification', {
    type: 'mention',
    recipients,
    data
  });
};

const handleSystemNotification = async (recipients, data) => {
  // Handle system-wide notifications
  await publisher.publish('notification', {
    type: 'system',
    recipients,
    data
  });
};
