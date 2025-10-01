import { useState, useRef, useEffect } from 'react';
import EmojiPickerReact from 'emoji-picker-react';
import { useThemeStore } from '../store/useThemeStore';

const EmojiPicker = ({ onEmojiSelect, isOpen, onClose }) => {
  const { theme } = useThemeStore();
  const pickerRef = useRef(null);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleEmojiClick = (emojiData, event) => {
    onEmojiSelect(emojiData.emoji);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={pickerRef}
      className="absolute bottom-full right-0 mb-2 z-50 shadow-lg rounded-lg border border-base-300 bg-base-100"
    >
      <EmojiPickerReact
        onEmojiClick={handleEmojiClick}
        theme={theme === 'dark' ? 'dark' : 'light'}
        width={300}
        height={400}
        previewConfig={{
          showPreview: false
        }}
        searchDisabled={false}
        skinTonesDisabled={false}
        className="emoji-picker"
      />
    </div>
  );
};

export default EmojiPicker;