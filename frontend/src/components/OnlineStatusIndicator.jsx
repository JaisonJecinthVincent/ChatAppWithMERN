import { formatDistanceToNow } from 'date-fns';

const OnlineStatusIndicator = ({ 
  user, 
  size = 'sm', 
  showLabel = false, 
  className = "" 
}) => {
  if (!user) return null;

  const sizeClasses = {
    xs: 'w-2 h-2',
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const getLastSeenText = () => {
    if (!user.lastSeen) return 'Last seen unknown';
    
    const lastSeen = new Date(user.lastSeen);
    const now = new Date();
    const timeDiff = now - lastSeen;
    
    // If less than 5 minutes ago, consider as "just now"
    if (timeDiff < 5 * 60 * 1000) {
      return 'Last seen just now';
    }
    
    return `Last seen ${formatDistanceToNow(lastSeen, { addSuffix: true })}`;
  };

  const isOnline = user.isOnline;
  const dotClass = `${sizeClasses[size]} rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'} ${className}`;
  
  if (showLabel) {
    return (
      <div className="flex items-center gap-2">
        <div className={dotClass}></div>
        <span className="text-xs text-base-content/70">
          {isOnline ? 'Online' : getLastSeenText()}
        </span>
      </div>
    );
  }

  return (
    <div 
      className={`relative ${dotClass}`}
      title={isOnline ? 'Online' : getLastSeenText()}
    >
      {isOnline && (
        <div className={`absolute inset-0 ${sizeClasses[size]} bg-green-500 rounded-full animate-ping opacity-75`}></div>
      )}
    </div>
  );
};

export default OnlineStatusIndicator;