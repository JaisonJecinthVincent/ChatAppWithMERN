import { useState, useRef, useEffect } from 'react';
import { Search, X, MessageCircle, Calendar, User, Hash } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';

const MessageSearch = ({ 
  isOpen, 
  onClose, 
  onSearchResults, 
  selectedUser, 
  selectedGroup,
  className = "" 
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    dateRange: 'all', // all, today, week, month, custom
    messageType: 'all', // all, text, files, images
    sender: 'all' // all, specific user
  });
  const searchInputRef = useRef(null);
  const debounceRef = useRef(null);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Debounced search function
  const performSearch = async (searchQuery, searchFilters) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        ...searchFilters,
        ...(selectedUser && { userId: selectedUser._id }),
        ...(selectedGroup && { groupId: selectedGroup._id })
      });

      const response = await fetch(`/api/messages/search?${params}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data.messages || []);
        
        if (onSearchResults) {
          onSearchResults(data.messages || []);
        }
      } else {
        console.error('Search failed:', response.statusText);
        setResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle search with debouncing
  const handleSearch = (searchQuery) => {
    setQuery(searchQuery);
    
    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce search by 300ms
    debounceRef.current = setTimeout(() => {
      performSearch(searchQuery, filters);
    }, 300);
  };

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    const newFilters = { ...filters, [filterType]: value };
    setFilters(newFilters);
    
    if (query.trim()) {
      performSearch(query, newFilters);
    }
  };

  // Format message date for display
  const formatMessageDate = (date) => {
    const messageDate = new Date(date);
    
    if (isToday(messageDate)) {
      return `Today at ${format(messageDate, 'HH:mm')}`;
    } else if (isYesterday(messageDate)) {
      return `Yesterday at ${format(messageDate, 'HH:mm')}`;
    } else {
      return format(messageDate, 'MMM dd, yyyy \'at\' HH:mm');
    }
  };

  // Highlight search terms in text
  const highlightText = (text, searchTerm) => {
    if (!searchTerm.trim()) return text;
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 text-yellow-900 px-1 rounded">
          {part}
        </mark>
      ) : (
        <span key={index}>{part}</span>
      )
    );
  };

  // Handle clicking on a search result
  const handleResultClick = (message) => {
    if (onClose) onClose();
    // Could emit an event to scroll to the message in the chat
    // This would need to be implemented in the parent component
    console.log('Navigate to message:', message._id);
  };

  const getMessagePreview = (message) => {
    if (message.text) {
      return message.text.length > 100 
        ? message.text.substring(0, 100) + '...'
        : message.text;
    }
    
    if (message.fileUrl) {
      return `📎 ${message.fileName || 'File attachment'}`;
    }
    
    if (message.image) {
      return '🖼️ Image';
    }
    
    return 'Message';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className={`bg-base-100 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <div className="flex items-center gap-2">
            <Search size={20} className="text-base-content/70" />
            <h2 className="text-lg font-semibold">
              Search Messages
              {selectedUser && ` with ${selectedUser.fullName}`}
              {selectedGroup && ` in ${selectedGroup.name}`}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-base-300">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/50" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search messages..."
              className="w-full pl-10 pr-4 py-2 border border-base-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 mt-3">
            {/* Date Range Filter */}
            <select
              value={filters.dateRange}
              onChange={(e) => handleFilterChange('dateRange', e.target.value)}
              className="select select-sm border-base-300"
            >
              <option value="all">All time</option>
              <option value="today">Today</option>
              <option value="week">This week</option>
              <option value="month">This month</option>
            </select>

            {/* Message Type Filter */}
            <select
              value={filters.messageType}
              onChange={(e) => handleFilterChange('messageType', e.target.value)}
              className="select select-sm border-base-300"
            >
              <option value="all">All messages</option>
              <option value="text">Text only</option>
              <option value="files">With files</option>
              <option value="images">With images</option>
            </select>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="loading loading-spinner loading-md"></div>
              <span className="ml-2">Searching...</span>
            </div>
          )}

          {!loading && query && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-base-content/60">
              <MessageCircle size={48} className="mb-2" />
              <p>No messages found</p>
              <p className="text-sm">Try adjusting your search terms or filters</p>
            </div>
          )}

          {!loading && !query && (
            <div className="flex flex-col items-center justify-center py-8 text-base-content/60">
              <Search size={48} className="mb-2" />
              <p>Start typing to search messages</p>
              <p className="text-sm">Search through your chat history</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="divide-y divide-base-200">
              {results.map((message) => (
                <div
                  key={message._id}
                  onClick={() => handleResultClick(message)}
                  className="p-4 hover:bg-base-200 cursor-pointer transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* Sender Avatar */}
                    <img
                      src={message.senderId?.profilePic || '/avatar.png'}
                      alt={message.senderId?.fullName || 'User'}
                      className="w-8 h-8 rounded-full flex-shrink-0"
                    />

                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {message.senderId?.fullName || 'Unknown User'}
                        </span>
                        <span className="text-xs text-base-content/60">
                          {formatMessageDate(message.createdAt)}
                        </span>
                        {message.groupId && (
                          <div className="flex items-center gap-1 text-xs text-base-content/60">
                            <Hash size={10} />
                            <span>{message.groupId.name}</span>
                          </div>
                        )}
                      </div>

                      {/* Message Content */}
                      <div className="text-sm text-base-content/80">
                        {highlightText(getMessagePreview(message), query)}
                      </div>

                      {/* Message Type Indicator */}
                      {(message.image || message.fileUrl) && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-base-content/60">
                          {message.image && <span>🖼️ Image</span>}
                          {message.fileUrl && <span>📎 File</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {results.length > 0 && (
          <div className="p-3 border-t border-base-300 text-center text-sm text-base-content/60">
            Found {results.length} message{results.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageSearch;