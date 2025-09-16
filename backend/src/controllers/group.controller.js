import Group from '../models/group.model.js';
import User from '../models/user.model.js';

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
    const groups = await Group.find({ members: userId });
    res.status(200).json(groups);
  } catch (error) {
    console.error('Error fetching user groups:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Add a user to a group
export const addUserToGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId } = req.body;
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    if (group.members.includes(userId)) {
      return res.status(400).json({ message: 'User already in group' });
    }
    group.members.push(userId);
    await group.save();
    res.status(200).json(group);
  } catch (error) {
    console.error('Error adding user to group:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Remove a user from a group
export const removeUserFromGroup = async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    group.members = group.members.filter(id => id.toString() !== userId);
    await group.save();
    res.status(200).json(group);
  } catch (error) {
    console.error('Error removing user from group:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Optionally: update group info
export const updateGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const updates = req.body;
    const group = await Group.findByIdAndUpdate(groupId, updates, { new: true });
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    res.status(200).json(group);
  } catch (error) {
    console.error('Error updating group:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Optionally: delete group
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
