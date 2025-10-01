import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import { axiosInstance } from '../lib/axios';
import { toast } from 'react-hot-toast';

const AVAILABLE_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

const MessageReactions = ({ message, currentUserId }) => {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const pickerRef = useRef(null);
  const { addReactionToMessage, removeReactionFromMessage } = useChatStore();
  const { socket } = useAuthStore();

  // Handle both _id and messageId fields for compatibility
  const messageId = message?._id || message?.messageId;
  
  // Don't render if message doesn't have an ID
  if (!message || !messageId) {
    console.warn('MessageReactions: message missing _id/messageId', message);
    return null;
  }

  // Close reaction picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setShowReactionPicker(false);
      }
    };

    if (showReactionPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showReactionPicker]);

  const handleReactionClick = async (reaction) => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      // Check if user already reacted with this emoji
      const existingReaction = message.reactions?.find(r => 
        r.emoji === reaction && r.users.includes(currentUserId)
      );

      if (existingReaction) {
        // Remove reaction
        await axiosInstance.delete(`/messages/reaction/${messageId}`, {
          data: { reaction }
        });

        removeReactionFromMessage(messageId, reaction, currentUserId);
        
        // Emit Socket.IO event
        if (socket) {
          socket.emit('message_reaction', {
            messageId: messageId,
            reaction,
            isAdd: false
          });
        }
      } else {
        // Add reaction
        await axiosInstance.post(`/messages/reaction/${messageId}`, {
          reaction
        });

        addReactionToMessage(messageId, reaction, currentUserId);
        
        // Emit Socket.IO event
        if (socket) {
          socket.emit('message_reaction', {
            messageId: messageId,
            reaction,
            isAdd: true
          });
        }
      }

      setShowReactionPicker(false);
    } catch (error) {
      console.error('Error handling reaction:', error);
      toast.error('Failed to update reaction');
    } finally {
      setIsLoading(false);
    }
  };

  const hasUserReacted = (reaction) => {
    const reactionData = message.reactions?.find(r => r.emoji === reaction);
    return reactionData ? reactionData.users.includes(currentUserId) : false;
  };

  const getDisplayedReactions = () => {
    if (!message.reactions) return [];
    return message.reactions.filter(r => r.users.length > 0);
  };

  return (
    <div className="relative">
      {/* Existing reactions */}
      <div className="flex flex-wrap gap-1 mt-1">
        {getDisplayedReactions().map((reaction, index) => (
          <button
            key={`${reaction.emoji}-${index}`}
            onClick={() => handleReactionClick(reaction.emoji)}
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all duration-200 hover:scale-110 ${
              hasUserReacted(reaction.emoji)
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 ring-1 ring-blue-300 dark:ring-blue-700'
                : 'bg-base-200 hover:bg-base-300 text-base-content'
            }`}
            disabled={isLoading}
          >
            <span className="text-sm">{reaction.emoji}</span>
            <span className="text-xs font-medium">{reaction.users.length}</span>
          </button>
        ))}

        {/* Add reaction button */}
        <div className="relative" ref={pickerRef}>
          <button
            onClick={() => setShowReactionPicker(!showReactionPicker)}
            className="flex items-center justify-center w-6 h-6 rounded-full bg-base-200 hover:bg-base-300 text-base-content transition-all duration-200 hover:scale-110"
            disabled={isLoading}
          >
            <span className="text-xs">➕</span>
          </button>

          {/* Reaction picker */}
          {showReactionPicker && (
            <div className="absolute bottom-8 left-0 bg-base-100 border border-base-300 rounded-lg p-2 shadow-lg z-50 flex gap-1">
              {AVAILABLE_REACTIONS.map((reaction) => (
                <button
                  key={reaction}
                  onClick={() => handleReactionClick(reaction)}
                  className={`w-8 h-8 rounded-full hover:bg-base-200 flex items-center justify-center text-lg transition-all duration-200 hover:scale-125 ${
                    hasUserReacted(reaction) ? 'bg-blue-100 dark:bg-blue-900/30' : ''
                  }`}
                  disabled={isLoading}
                >
                  {reaction}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageReactions;