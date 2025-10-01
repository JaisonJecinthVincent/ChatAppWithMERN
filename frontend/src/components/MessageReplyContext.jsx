import { User, File } from 'lucide-react';

const MessageReplyContext = ({ replyTo, className = "" }) => {
  if (!replyTo) return null;

  const getSenderName = () => {
    if (replyTo.senderId && typeof replyTo.senderId === 'object') {
      return replyTo.senderId.fullName || 'Unknown User';
    }
    return 'Unknown User';
  };

  const getReplyPreview = () => {
    // System messages
    if (replyTo.isSystemMessage) {
      return '📢 System message';
    }

    // File messages
    if (replyTo.fileName && !replyTo.text) {
      return `📎 ${replyTo.fileName}`;
    }

    // Image messages
    if (replyTo.image && !replyTo.text) {
      return '🖼️ Image';
    }

    // Text messages (truncate if too long)
    if (replyTo.text) {
      const maxLength = 100;
      return replyTo.text.length > maxLength 
        ? `${replyTo.text.substring(0, maxLength)}...` 
        : replyTo.text;
    }

    return 'Message';
  };

  const getReplyIcon = () => {
    if (replyTo.isSystemMessage) return '📢';
    if (replyTo.fileName) return '📎';
    if (replyTo.image && !replyTo.text) return '🖼️';
    return '💬';
  };

  return (
    <div className={`mb-2 ${className}`}>
      <div className="bg-base-200 border-l-4 border-primary px-3 py-2 rounded-r-lg">
        <div className="flex items-center gap-2 mb-1">
          <User size={12} className="text-primary" />
          <span className="text-xs font-medium text-primary">
            {getSenderName()}
          </span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-lg leading-none">{getReplyIcon()}</span>
          <p className="text-sm text-base-content/70 leading-tight">
            {getReplyPreview()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MessageReplyContext;