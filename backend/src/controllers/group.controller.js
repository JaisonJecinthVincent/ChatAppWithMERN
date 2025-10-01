import Group from '../models/group.model.js';
import User from '../models/user.model.js';
import Message from '../models/message.model.js';
import cloudinary from '../lib/cloudinary.js';
import { getGroupSocketIds, io } from '../lib/socket.js';

// Helper function to create system messages
const createSystemMessage = async (groupId, systemMessageType, text, adminUserId = null) => {
  try {
    const systemMessage = new Message({
      senderId: adminUserId, // Use admin's ID for system messages, or null
      groupId,
      text,
      isSystemMessage: true,
      systemMessageType,
    });
    
    await systemMessage.save();
    
    // Populate the message for real-time broadcast
    await systemMessage.populate('senderId', 'fullName profilePic');
    
    // Broadcast to group members
    const groupSocketIds = getGroupSocketIds(groupId.toString());
    groupSocketIds.forEach(socketId => {
      io.to(socketId).emit('newMessage', systemMessage);
    });
    
    return systemMessage;
  } catch (error) {
    console.error('Error creating system message:', error);
  }
};

// Create a new group
export const createGroup = async (req, res) => {
  try {
    const { name, members, profilePic } = req.body;
    const admin = req.user._id;
    if (!name || !members || members.length === 0) {
      return res.status(400).json({ message: 'Group name and members are required' });
    }
    // Ensure admin is in members
    if (!members.includes(admin.toString())) {
      members.push(admin);
    }
    const group = new Group({ name, members, admin, profilePic });
    await group.save();
    
    // Create system message for group creation
    await createSystemMessage(
      group._id, 
      'group_created', 
      `${name} group was created`,
      admin
    );
    
    res.status(201).json(group);
  } catch (error) {
    console.error('Error creating group:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get all groups for the logged-in user
export const getUserGroups = async (req, res) => {
  try {
    const userId = req.user._id;
    const groups = await Group.find({ members: userId })
      .populate('members', 'fullName profilePic email')
      .populate('admin', 'fullName profilePic email');
    res.status(200).json(groups);
  } catch (error) {
    console.error('Error fetching user groups:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Add a user to a group (admin only)
export const addUserToGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;
    const requesterId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if requester is admin
    if (group.admin.toString() !== requesterId.toString()) {
      return res.status(403).json({ message: 'Only group admins can add members' });
    }

    if (group.members.includes(userId)) {
      return res.status(400).json({ message: 'User already in group' });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    group.members.push(userId);
    await group.save();

    // Populate the updated group with member details
    await group.populate('members', 'fullName profilePic email');
    
    // Create system message for user joining
    await createSystemMessage(
      groupId, 
      'user_joined', 
      `${user.fullName} was added to the group`,
      requesterId
    );
    
    res.status(200).json({ 
      message: `${user.fullName} has been added to the group`,
      group 
    });
  } catch (error) {
    console.error('Error adding user to group:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Remove a user from a group (admin only or self-leave)
export const removeUserFromGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;
    const requesterId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if requester is admin or removing themselves
    const isAdmin = group.admin.toString() === requesterId.toString();
    const isSelfLeave = userId === requesterId.toString();

    if (!isAdmin && !isSelfLeave) {
      return res.status(403).json({ message: 'You can only remove yourself or be removed by an admin' });
    }

    // Cannot remove admin unless they're removing themselves
    if (userId === group.admin.toString() && !isSelfLeave) {
      return res.status(400).json({ message: 'Cannot remove group admin' });
    }

    if (!group.members.includes(userId)) {
      return res.status(400).json({ message: 'User not in group' });
    }

    const user = await User.findById(userId);
    group.members = group.members.filter(member => member.toString() !== userId);
    await group.save();

    // Populate the updated group with member details
    await group.populate('members', 'fullName profilePic email');
    
    // Create system message for user leaving
    const leaveMessage = isSelfLeave ? 
      `${user?.fullName} left the group` : 
      `${user?.fullName} was removed from the group`;
    
    await createSystemMessage(
      groupId, 
      'user_left', 
      leaveMessage,
      requesterId
    );
    
    res.status(200).json({ 
      message: isSelfLeave ? 'You have left the group' : `${user?.fullName} has been removed from the group`,
      group 
    });
  } catch (error) {
    console.error('Error removing user from group:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Optionally: update group info (admin only)
export const updateGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const updates = req.body;
    const requesterId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if requester is admin
    if (group.admin.toString() !== requesterId.toString()) {
      return res.status(403).json({ message: 'Only group admins can update group info' });
    }

    // Handle profile picture upload
    if (updates.profilePic) {
      // Delete old profile pic from cloudinary if it exists
      if (group.profilePic) {
        const publicId = group.profilePic.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(publicId);
      }

      // Upload new profile pic
      const uploadResponse = await cloudinary.uploader.upload(updates.profilePic);
      updates.profilePic = uploadResponse.secure_url;
    }

    const updatedGroup = await Group.findByIdAndUpdate(groupId, updates, { new: true })
      .populate('members', 'fullName profilePic email')
      .populate('admin', 'fullName profilePic email');

    res.status(200).json(updatedGroup);
  } catch (error) {
    console.error('Error updating group:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Transfer admin rights to another member (current admin only)
export const transferAdmin = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { newAdminId } = req.body;
    const currentAdminId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if requester is current admin
    if (group.admin.toString() !== currentAdminId.toString()) {
      return res.status(403).json({ message: 'Only the current admin can transfer admin rights' });
    }

    // Check if new admin is a member of the group
    if (!group.members.includes(newAdminId)) {
      return res.status(400).json({ message: 'New admin must be a member of the group' });
    }

    // Check if new admin exists
    const newAdmin = await User.findById(newAdminId);
    if (!newAdmin) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Transfer admin rights
    group.admin = newAdminId;
    await group.save();

    // Populate the updated group with member and admin details
    await group.populate('members', 'fullName profilePic email');
    await group.populate('admin', 'fullName profilePic email');

    // Create system message for admin transfer
    await createSystemMessage(
      groupId, 
      'admin_transferred', 
      `${newAdmin.fullName} is now the group admin`,
      currentAdminId
    );

    res.status(200).json({ 
      message: `${newAdmin.fullName} is now the group admin`,
      group 
    });
  } catch (error) {
    console.error('Error transferring admin rights:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Search for groups
export const searchGroups = async (req, res) => {
  try {
    const { q } = req.query;
    const userId = req.user._id;
    
    if (!q || q.trim().length === 0) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    // Search for groups by name (case-insensitive) that the user is not already a member of
    const groups = await Group.find({
      name: { $regex: q, $options: 'i' },
      members: { $ne: userId } // Exclude groups user is already in
    })
    .populate('members', 'fullName profilePic email')
    .populate('admin', 'fullName profilePic email')
    .limit(20); // Limit results

    res.status(200).json(groups);
  } catch (error) {
    console.error('Error searching groups:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Join a group (public groups or by request)
export const joinGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user._id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user is already a member
    if (group.members.includes(userId)) {
      return res.status(400).json({ message: 'You are already a member of this group' });
    }

    // Add user to group
    group.members.push(userId);
    await group.save();

    // Get user info for system message
    const user = await User.findById(userId);
    
    // Create system message for user joining
    await createSystemMessage(
      groupId, 
      'user_joined', 
      `${user.fullName} joined the group`,
      userId
    );

    // Populate the updated group
    await group.populate('members', 'fullName profilePic email');
    await group.populate('admin', 'fullName profilePic email');

    res.status(200).json({ 
      message: `You have joined ${group.name}`,
      group 
    });
  } catch (error) {
    console.error('Error joining group:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};
export const deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findByIdAndDelete(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    res.status(200).json({ message: 'Group deleted' });
  } catch (error) {
    console.error('Error deleting group:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};
