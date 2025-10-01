import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  groups: [],
  selectedUser: null,
  selectedGroup: null,
  isUsersLoading: false,
  isGroupsLoading: false,
  isMessagesLoading: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      console.log("Fetched users:", res.data);
      console.log("Total users count:", res.data.length);
      set({ users: res.data });
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error(error.response?.data?.message || "Failed to fetch users");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  getGroups: async () => {
    set({ isGroupsLoading: true });
    try {
      const res = await axiosInstance.get("/groups");
      set({ groups: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch groups");
    } finally {
      set({ isGroupsLoading: false });
    }
  },

  getGroupMessages: async (groupId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/groups/${groupId}/messages`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch group messages");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, selectedGroup } = get();
    try {
      let res;
      if (selectedGroup) {
        res = await axiosInstance.post(`/groups/${selectedGroup._id}/messages`, messageData);
      } else if (selectedUser) {
        res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      }
      
      // Don't add to messages array immediately - let socket.io handle it
      // The response is just a job status, not the actual message
      console.log('Message sent to queue:', res.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message");
    }
  },

  subscribeToMessages: () => {
    console.log("🚀 Setting up message subscriptions...");
    const { selectedUser, selectedGroup } = get();
    if (!selectedUser && !selectedGroup) return;

    const socket = useAuthStore.getState().socket;
    if (!socket) {
      console.log("❌ No socket available for subscriptions");
      return;
    }
    console.log("✅ Socket available, setting up listeners...");

    // Subscribe to direct messages
    socket.on("newMessage", (newMessage) => {
      // Show message if it's part of the conversation with the selected user
      const isMessageFromSelectedUser = newMessage.senderId === selectedUser?._id;
      const isMessageToSelectedUser = newMessage.receiverId === selectedUser?._id;
      const isPartOfSelectedConversation = isMessageFromSelectedUser || isMessageToSelectedUser;
      
      if (selectedUser && !isPartOfSelectedConversation) return;

      set({
        messages: [...get().messages, newMessage],
      });
    });

    // Subscribe to group messages
    socket.on("newGroupMessage", (newMessage) => {
      // Debug: Log ALL message data
      console.log("🔍 RECEIVED GROUP MESSAGE:", newMessage);
      console.log("📄 Message keys:", Object.keys(newMessage));
      console.log("📝 Text:", newMessage.text);
      console.log("📎 File fields:", {
        fileName: newMessage.fileName,
        fileUrl: newMessage.fileUrl,
        fileType: newMessage.fileType,
        fileSize: newMessage.fileSize,
        mimeType: newMessage.mimeType
      });
      
      const isMessageForSelectedGroup = newMessage.groupId === selectedGroup?._id;
      if (selectedGroup && !isMessageForSelectedGroup) return;

      set({
        messages: [...get().messages, newMessage],
      });
    });

    // Subscribe to reaction updates
    socket.on("message_reaction_update", (data) => {
      const { messageId, reaction, userId, isAdd } = data;
      console.log('Processing reaction update:', data);
      
      if (isAdd) {
        get().addReactionToMessage(messageId, reaction, userId);
      } else {
        get().removeReactionFromMessage(messageId, reaction, userId);
      }
    });

    // Subscribe to message edits
    socket.on("messageEdited", (data) => {
      const { messageId, text, isEdited, editHistory } = data;
      const { messages } = get();
      
      const updatedMessages = messages.map(message => {
        if (message._id === messageId) {
          return {
            ...message,
            text,
            isEdited,
            editHistory
          };
        }
        return message;
      });
      
      set({ messages: updatedMessages });
    });

    // Subscribe to message deletions
    socket.on("messageDeleted", (data) => {
      const { messageId } = data;
      const { messages } = get();
      
      const updatedMessages = messages.map(message => {
        if (message._id === messageId) {
          return {
            ...message,
            isDeleted: true,
            text: null,
            image: null,
            deletedAt: new Date().toISOString()
          };
        }
        return message;
      });
      
      set({ messages: updatedMessages });
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    
    socket.off("newMessage");
    socket.off("newGroupMessage");
    socket.off("message_reaction_update");
    socket.off("messageEdited");
    socket.off("messageDeleted");
  },

  setSelectedUser: (selectedUser) => set({ selectedUser, selectedGroup: null }),
  setSelectedGroup: (selectedGroup) => set({ selectedGroup, selectedUser: null }),

  // Group management functions
  updateGroup: async (groupId, updates) => {
    try {
      const res = await axiosInstance.put(`/groups/${groupId}`, updates);
      const { groups } = get();
      const updatedGroups = groups.map(group => 
        group._id === groupId ? res.data : group
      );
      set({ groups: updatedGroups });
      
      // Update selectedGroup if it's the current one
      const { selectedGroup } = get();
      if (selectedGroup && selectedGroup._id === groupId) {
        set({ selectedGroup: res.data });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update group");
      throw error;
    }
  },

  addMemberToGroup: async (groupId, userId) => {
    try {
      const res = await axiosInstance.post(`/groups/${groupId}/members`, { userId });
      const { groups } = get();
      const updatedGroups = groups.map(group => 
        group._id === groupId ? res.data.group : group
      );
      set({ groups: updatedGroups });
      
      // Update selectedGroup if it's the current one
      const { selectedGroup } = get();
      if (selectedGroup && selectedGroup._id === groupId) {
        set({ selectedGroup: res.data.group });
      }
      
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add member");
      throw error;
    }
  },

  removeMemberFromGroup: async (groupId, userId) => {
    try {
      const res = await axiosInstance.delete(`/groups/${groupId}/members`, { 
        data: { userId } 
      });
      const { groups } = get();
      const updatedGroups = groups.map(group => 
        group._id === groupId ? res.data.group : group
      );
      set({ groups: updatedGroups });
      
      // Update selectedGroup if it's the current one
      const { selectedGroup } = get();
      if (selectedGroup && selectedGroup._id === groupId) {
        set({ selectedGroup: res.data.group });
      }
      
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to remove member");
      throw error;
    }
  },

  transferAdminRights: async (groupId, newAdminId) => {
    try {
      const res = await axiosInstance.put(`/groups/${groupId}/admin`, { 
        newAdminId 
      });
      const { groups } = get();
      const updatedGroups = groups.map(group => 
        group._id === groupId ? res.data.group : group
      );
      set({ groups: updatedGroups });
      
      // Update selectedGroup if it's the current one
      const { selectedGroup } = get();
      if (selectedGroup && selectedGroup._id === groupId) {
        set({ selectedGroup: res.data.group });
      }
      
      return res.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to transfer admin rights");
      throw error;
    }
  },

  // Message reactions management
  addReactionToMessage: (messageId, reaction, userId) => {
    const { messages } = get();
    const updatedMessages = messages.map(message => {
      if (message._id === messageId) {
        const existingReactionIndex = message.reactions?.findIndex(r => r.emoji === reaction);
        
        if (existingReactionIndex !== -1 && existingReactionIndex !== undefined) {
          // Add user to existing reaction
          const updatedReactions = [...(message.reactions || [])];
          if (!updatedReactions[existingReactionIndex].users.includes(userId)) {
            updatedReactions[existingReactionIndex].users.push(userId);
          }
          return { ...message, reactions: updatedReactions };
        } else {
          // Create new reaction
          const newReaction = { emoji: reaction, users: [userId] };
          return { 
            ...message, 
            reactions: [...(message.reactions || []), newReaction]
          };
        }
      }
      return message;
    });
    
    set({ messages: updatedMessages });
  },

  removeReactionFromMessage: (messageId, reaction, userId) => {
    const { messages } = get();
    const updatedMessages = messages.map(message => {
      if (message._id === messageId) {
        const updatedReactions = (message.reactions || [])
          .map(r => {
            if (r.emoji === reaction) {
              return {
                ...r,
                users: r.users.filter(uid => uid !== userId)
              };
            }
            return r;
          })
          .filter(r => r.users.length > 0); // Remove reactions with no users
          
        return { ...message, reactions: updatedReactions };
      }
      return message;
    });
    
    set({ messages: updatedMessages });
  },
}));
