import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import MessageReactions from "./MessageReactions";
import MessageTimestamp from "./MessageTimestamp";
import DateSeparator from "./DateSeparator";
import MediaGallery from "./MediaGallery";
import MessageActions from "./MessageActions";
import MessageEditModal from "./MessageEditModal";
import MessageReplyContext from "./MessageReplyContext";
import FileMessage from "./FileMessage";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import { optimizeForProfilePic, optimizeForMessageImage } from "../lib/cloudinaryUtils";
import { isSameDay } from "date-fns";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

const ChatContainer = () => {
  // Helper function to get proxy URL for files
  const getProxyUrl = (cloudinaryUrl) => {
    if (!cloudinaryUrl) return '';
    // Extract the file path from Cloudinary URL
    const urlParts = cloudinaryUrl.split('/');
    const filePathIndex = urlParts.findIndex(part => part === 'upload');
    if (filePathIndex === -1) return cloudinaryUrl;
    
    const filePath = urlParts.slice(filePathIndex + 1).join('/');
    return `/api/files/proxy/${encodeURIComponent(filePath)}`;
  };
  const {
    messages,
    getMessages,
    getGroupMessages,
    isMessagesLoading,
    selectedUser,
    selectedGroup,
    subscribeToMessages,
    unsubscribeFromMessages,
    users,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const navigate = useNavigate();
  const messageEndRef = useRef(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [messageToEdit, setMessageToEdit] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);

  // Handle avatar click - only allow current user to go to profile
  const handleAvatarClick = (message) => {
    const actualSenderId = getActualSenderId(message);
    if (actualSenderId === authUser._id) {
      navigate("/profile");
    }
    // Do nothing if it's not the current user's avatar
  };

  // Handle image click - open gallery
  const handleImageClick = (messageImage) => {
    const imageMessages = messages.filter(msg => msg.image);
    const clickedIndex = imageMessages.findIndex(msg => msg.image === messageImage);
    setSelectedImageIndex(clickedIndex >= 0 ? clickedIndex : 0);
    setGalleryOpen(true);
  };

  // Handle message edit
  const handleEditMessage = (message) => {
    setMessageToEdit(message);
    setEditModalOpen(true);
  };

  // Handle message save after editing
  const handleSaveEdit = async (messageId, newText) => {
    try {
      await axiosInstance.put(`/messages/edit/${messageId}`, {
        text: newText
      });
      toast.success("Message edited successfully");
    } catch (error) {
      console.error("Error editing message:", error);
      toast.error(error.response?.data?.message || "Failed to edit message");
      throw error; // Re-throw to handle in modal
    }
  };

  // Handle message deletion
  const handleDeleteMessage = async (message) => {
    try {
      await axiosInstance.delete(`/messages/${message._id}`);
      toast.success("Message deleted successfully");
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error(error.response?.data?.message || "Failed to delete message");
    }
  };

  // Handle message reply
  const handleReplyMessage = (message) => {
    setReplyingTo(message);
  };

  // Clear reply
  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  // Helper function to get profile pic for message sender
  const getMessageSenderProfilePic = (message) => {
    const actualSenderId = getActualSenderId(message);
    
    if (selectedUser) {
      // Individual chat - determine if sender is current user or the other user
      if (actualSenderId === authUser._id) {
        return authUser.profilePic || "/avatar.png";
      } else {
        return selectedUser.profilePic || "/avatar.png";
      }
    } else if (selectedGroup) {
      // Group chat - senderId is populated with user data
      if (message.senderId && typeof message.senderId === 'object') {
        return message.senderId.profilePic || "/avatar.png";
      }
      // If it's the current user, use authUser data
      if (actualSenderId === authUser._id) {
        return authUser.profilePic || "/avatar.png";
      }
      // Fallback: find the sender in group members (now populated)
      if (selectedGroup.members) {
        const groupMember = selectedGroup.members.find(member => 
          (typeof member === 'object' ? member._id : member) === actualSenderId
        );
        if (groupMember && typeof groupMember === 'object') {
          return groupMember.profilePic || "/avatar.png";
        }
      }
      // Final fallback: find the sender in users list
      const sender = users.find(user => user._id === actualSenderId);
      return sender?.profilePic || "/avatar.png";
    }
    return "/avatar.png";
  };

  // Helper function to get sender name for group chats
  const getMessageSenderName = (message) => {
    if (selectedGroup) {
      // senderId is populated with user data
      if (message.senderId && typeof message.senderId === 'object') {
        return message.senderId.fullName || "Unknown User";
      }
      // Fallback: find the sender in users list
      const actualSenderId = getActualSenderId(message);
      const sender = users.find(user => user._id === actualSenderId);
      return sender?.fullName || "Unknown User";
    }
    return "";
  };

  // Helper function to get the actual senderId (for message positioning)
  const getActualSenderId = (message) => {
    if (message.senderId && typeof message.senderId === 'object') {
      return message.senderId._id;
    }
    return message.senderId;
  };

  useEffect(() => {
    if (selectedUser) {
      getMessages(selectedUser._id);
    } else if (selectedGroup) {
      getGroupMessages(selectedGroup._id);
    }

    subscribeToMessages();

    return () => {
      unsubscribeFromMessages();
    };
  }, [selectedUser, selectedGroup, getMessages, getGroupMessages, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  if (!selectedUser && !selectedGroup) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-base-content/70">Select a contact or group to start chatting</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => {
          const showDateSeparator = index === 0 || 
            !isSameDay(new Date(messages[index - 1].createdAt), new Date(message.createdAt));

          return (
            <div key={message._id}>
              {/* Date separator */}
              {showDateSeparator && (
                <DateSeparator date={message.createdAt} />
              )}

              {/* System messages get special treatment */}
              {message.isSystemMessage ? (
                <div className="flex justify-center">
                  <div className="bg-base-300 text-base-content/70 px-3 py-1 rounded-lg text-sm max-w-xs text-center">
                    {message.text}
                    <div className="text-xs opacity-60 mt-1">
                      <MessageTimestamp createdAt={message.createdAt} />
                    </div>
                  </div>
                </div>
              ) : (
                /* Regular messages */
                <div
                  className={`chat ${getActualSenderId(message) === authUser._id ? "chat-end" : "chat-start"} group`}
                  ref={index === messages.length - 1 ? messageEndRef : null}
                >
            <div className="chat-image avatar">
              <div 
                className={`size-10 rounded-full border ${
                  getActualSenderId(message) === authUser._id 
                    ? 'cursor-pointer hover:opacity-80 transition-opacity' 
                    : ''
                }`}
                onClick={() => handleAvatarClick(message)}
              >
                <img
                  src={optimizeForProfilePic(getMessageSenderProfilePic(message))}
                  alt="profile pic"
                  loading="lazy"
                />
              </div>
            </div>
            <div className="chat-header mb-1 flex items-center justify-between">
              <div>
                {selectedGroup && getActualSenderId(message) !== authUser._id && (
                  <span className="text-xs font-medium text-base-content/70 mr-2">
                    {getMessageSenderName(message)}
                  </span>
                )}
                <MessageTimestamp 
                  createdAt={message.createdAt} 
                  className="ml-1" 
                />
                {message.isEdited && (
                  <span className="text-xs text-base-content/50 ml-2 italic">
                    (edited)
                  </span>
                )}
              </div>
              {!message.isDeleted && (
                <MessageActions
                  message={message}
                  onEdit={handleEditMessage}
                  onDelete={handleDeleteMessage}
                  onReply={handleReplyMessage}
                  className="ml-2"
                />
              )}
            </div>
            <div className="chat-bubble flex flex-col">
              {message.isDeleted ? (
                <p className="italic text-base-content/60">This message was deleted</p>
              ) : (
                <>
                  {/* Reply context */}
                  {message.replyTo && (
                    <MessageReplyContext replyTo={message.replyTo} />
                  )}
                  
                  {message.image && (
                    <img
                      src={optimizeForMessageImage(message.image)}
                      alt="Attachment"
                      className="sm:max-w-[200px] rounded-md mb-2 cursor-pointer hover:opacity-90 transition-opacity"
                      loading="lazy"
                      onClick={() => handleImageClick(message.image)}
                    />
                  )}
                  

                  
                  {/* Show file information if fileName exists OR if text is "no text" (temporary) */}
                  {(message.fileName || message.text === "no text") && (
                    <div className="p-3 bg-base-200 rounded-lg border border-base-300 max-w-sm mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">📎</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-base-content truncate">
                            {message.fileName || "File attachment"}
                          </p>
                          <div className="flex gap-2 text-xs text-base-content/70">
                            {message.fileSize && (
                              <span>{(message.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                            )}
                            {message.fileType && (
                              <span className="uppercase">{message.fileType}</span>
                            )}
                          </div>
                          {message.fileUrl && (
                            <div className="flex gap-2 mt-2">
                              <a 
                                href={getProxyUrl(message.fileUrl)}
                                download={message.fileName}
                                className="text-xs text-primary hover:text-primary-focus underline"
                              >
                                Download
                              </a>
                              <button 
                                onClick={() => window.open(getProxyUrl(message.fileUrl), '_blank')}
                                className="text-xs text-secondary hover:text-secondary-focus underline"
                              >
                                View
                              </button>
                            </div>
                          )}
                          {message.text === "no text" && (
                            <p className="text-xs text-orange-600 mt-1">
                              Debug: File data not received properly
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {message.text && <p>{message.text}</p>}
                  
                  <MessageReactions 
                    message={message} 
                    currentUserId={authUser._id} 
                  />
                </>
              )}
            </div>
          </div>
              )}
            </div>
          );
        })}
      </div>

      <MessageInput 
        replyingTo={replyingTo} 
        onCancelReply={handleCancelReply}
      />
      
      <MediaGallery
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        messages={messages}
        initialImageIndex={selectedImageIndex}
      />

      <MessageEditModal
        message={messageToEdit}
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setMessageToEdit(null);
        }}
        onSave={handleSaveEdit}
      />
    </div>
  );
};
export default ChatContainer;
