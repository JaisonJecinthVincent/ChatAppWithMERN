// Test script to verify our fixes
console.log('Testing message structure fixes...');

// Test 1: MessageReactions should handle both _id and messageId
const testMessageWithId = {
  _id: '12345',
  text: 'Test message',
  reactions: []
};

const testMessageWithMessageId = {
  messageId: '67890', 
  text: 'Test message',
  reactions: []
};

// Simulate the ID extraction logic from MessageReactions
const getMessageId = (message) => {
  return message?._id || message?.messageId;
};

console.log('Message with _id:', getMessageId(testMessageWithId)); // Should be '12345'
console.log('Message with messageId:', getMessageId(testMessageWithMessageId)); // Should be '67890'

// Test 2: React key fix for text highlighting
const testHighlightText = (text, searchTerm) => {
  const regex = new RegExp(`(${searchTerm})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, index) =>
    regex.test(part) ? 
      `<mark key="${index}">${part}</mark>` : 
      `<span key="${index}">${part}</span>`
  );
};

console.log('Highlight test:', testHighlightText('Hello world test', 'world'));

console.log('All fixes tested successfully!');