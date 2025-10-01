import { useState, useEffect } from 'react';
import { formatDistanceToNow, format, isToday, isYesterday, isSameYear } from 'date-fns';

const MessageTimestamp = ({ createdAt, className = "" }) => {
  const [relativeTime, setRelativeTime] = useState('');
  const messageDate = new Date(createdAt);

  // Update relative time every minute
  useEffect(() => {
    const updateTime = () => {
      setRelativeTime(formatDistanceToNow(messageDate, { addSuffix: true }));
    };

    updateTime(); // Initial update
    const interval = setInterval(updateTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [messageDate]);

  // Get detailed timestamp for hover tooltip
  const getDetailedTimestamp = () => {
    if (isToday(messageDate)) {
      return `Today at ${format(messageDate, 'HH:mm')}`;
    } else if (isYesterday(messageDate)) {
      return `Yesterday at ${format(messageDate, 'HH:mm')}`;
    } else if (isSameYear(messageDate, new Date())) {
      return format(messageDate, 'MMM dd \'at\' HH:mm');
    } else {
      return format(messageDate, 'MMM dd, yyyy \'at\' HH:mm');
    }
  };

  // Get short display text - always show just time
  const getDisplayTime = () => {
    return format(messageDate, 'HH:mm');
  };

  return (
    <div className={`group relative ${className}`}>
      {/* Main timestamp display */}
      <time 
        className="text-xs opacity-50 cursor-help transition-opacity duration-200 group-hover:opacity-70"
        dateTime={messageDate.toISOString()}
        title={getDetailedTimestamp()}
      >
        {getDisplayTime()}
      </time>
      
      {/* Tooltip with detailed info */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-base-content text-base-100 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
        {getDetailedTimestamp()}
        <div className="text-xs opacity-75 mt-1">
          {relativeTime}
        </div>
        {/* Tooltip arrow */}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-base-content"></div>
      </div>
    </div>
  );
};

export default MessageTimestamp;