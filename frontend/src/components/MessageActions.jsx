import { useState } from 'react';
import { MoreHorizontal, Edit3, Trash2, Copy, Reply } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import toast from 'react-hot-toast';

const MessageActions = ({ 
  message, 
  onEdit, 
  onDelete, 
  onCopy,
  onReply,
  className = "" 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { authUser } = useAuthStore();

  const canEdit = message.senderId === authUser._id && !message.isDeleted;
  const canDelete = message.senderId === authUser._id && !message.isDeleted;
  
  // Check if message is within edit time limit (15 minutes)
  const isWithinEditLimit = () => {
    if (!message.createdAt) return false;
    const editTimeLimit = 15 * 60 * 1000; // 15 minutes in milliseconds
    const timeSinceCreation = Date.now() - new Date(message.createdAt).getTime();
    return timeSinceCreation <= editTimeLimit;
  };

  const handleEdit = () => {
    if (!isWithinEditLimit()) {
      toast.error('Edit time limit exceeded (15 minutes)');
      return;
    }
    onEdit && onEdit(message);
    setIsOpen(false);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      onDelete && onDelete(message);
      setIsOpen(false);
    }
  };

  const handleCopy = async () => {
    try {
      let textToCopy = message.text || '';
      
      // Add file information if it's a file message
      if (message.fileName) {
        textToCopy += textToCopy ? `\n📎 ${message.fileName}` : `📎 ${message.fileName}`;
      }
      
      await navigator.clipboard.writeText(textToCopy);
      toast.success('Message copied to clipboard');
      setIsOpen(false);
    } catch (error) {
      toast.error('Failed to copy message');
    }
  };

  const handleReply = () => {
    onReply && onReply(message);
    setIsOpen(false);
  };

  // Don't show actions if no actions are available
  if (!canEdit && !canDelete && !message.text) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-base-300 rounded transition-all duration-200"
        title="Message options"
      >
        <MoreHorizontal size={16} />
      </button>

      {isOpen && (
        <div className="absolute top-8 right-0 bg-base-100 border border-base-300 rounded-lg shadow-lg py-1 z-50 min-w-[160px]">
          {/* Reply to message */}
          {!message.isDeleted && (
            <button
              onClick={handleReply}
              className="w-full px-3 py-2 text-left text-sm hover:bg-base-200 flex items-center gap-2"
            >
              <Reply size={14} />
              Reply
            </button>
          )}

          {/* Copy message text */}
          {message.text && (
            <button
              onClick={handleCopy}
              className="w-full px-3 py-2 text-left text-sm hover:bg-base-200 flex items-center gap-2"
            >
              <Copy size={14} />
              Copy message
            </button>
          )}

          {/* Edit message */}
          {canEdit && message.text && (
            <button
              onClick={handleEdit}
              disabled={!isWithinEditLimit()}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-base-200 flex items-center gap-2 ${
                !isWithinEditLimit() ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              title={!isWithinEditLimit() ? 'Edit time limit exceeded (15 minutes)' : ''}
            >
              <Edit3 size={14} />
              Edit message
            </button>
          )}

          {/* Delete message */}
          {canDelete && (
            <button
              onClick={handleDelete}
              className="w-full px-3 py-2 text-left text-sm hover:bg-red-100 text-red-600 flex items-center gap-2"
            >
              <Trash2 size={14} />
              Delete message
            </button>
          )}
        </div>
      )}

      {/* Backdrop to close dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default MessageActions;