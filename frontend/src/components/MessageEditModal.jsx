import { useState, useEffect, useRef } from 'react';
import { X, Check, RotateCcw } from 'lucide-react';

const MessageEditModal = ({ 
  message, 
  isOpen, 
  onClose, 
  onSave 
}) => {
  const [editText, setEditText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (isOpen && message) {
      setEditText(message.text || '');
      // Focus textarea after modal opens
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(
            textareaRef.current.value.length,
            textareaRef.current.value.length
          );
        }
      }, 100);
    }
  }, [isOpen, message]);

  const handleSave = async () => {
    if (!editText.trim()) return;
    if (editText.trim() === message.text) {
      onClose();
      return;
    }

    setIsLoading(true);
    try {
      await onSave(message._id, editText.trim());
      onClose();
    } catch (error) {
      console.error('Failed to save edit:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleRevert = () => {
    setEditText(message.text || '');
  };

  if (!isOpen || !message) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-base-100 rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <h3 className="text-lg font-semibold">Edit Message</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-base-200 rounded"
            disabled={isLoading}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="space-y-3">
            {/* Original message display */}
            <div className="bg-base-200 p-3 rounded-lg">
              <div className="text-xs text-base-content/60 mb-1">Original:</div>
              <div className="text-sm">{message.text}</div>
            </div>

            {/* Edit textarea */}
            <div>
              <label className="text-xs text-base-content/60 mb-1 block">
                Edit message:
              </label>
              <textarea
                ref={textareaRef}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full p-3 border border-base-300 rounded-lg resize-none focus:outline-none focus:border-primary min-h-[100px] max-h-[200px]"
                placeholder="Type your message..."
                disabled={isLoading}
                maxLength={1000}
              />
              <div className="text-xs text-base-content/60 mt-1 text-right">
                {editText.length}/1000 characters
              </div>
            </div>

            {/* Edit history hint */}
            {message.isEdited && (
              <div className="text-xs text-base-content/60 bg-base-200 p-2 rounded">
                💡 This message has been edited before. Your changes will be tracked.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-base-300 bg-base-50">
          <div className="flex items-center gap-2">
            <button
              onClick={handleRevert}
              className="btn btn-ghost btn-sm"
              disabled={isLoading || editText === message.text}
              title="Revert to original"
            >
              <RotateCcw size={16} />
              Revert
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="btn btn-ghost btn-sm"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn btn-primary btn-sm"
              disabled={isLoading || !editText.trim() || editText.trim() === message.text}
            >
              {isLoading ? (
                <>
                  <span className="loading loading-spinner loading-xs"></span>
                  Saving...
                </>
              ) : (
                <>
                  <Check size={16} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>

        {/* Keyboard shortcuts hint */}
        <div className="px-4 pb-3 text-xs text-base-content/50">
          Press <kbd className="kbd kbd-xs">Enter</kbd> to save, <kbd className="kbd kbd-xs">Esc</kbd> to cancel
        </div>
      </div>
    </div>
  );
};

export default MessageEditModal;