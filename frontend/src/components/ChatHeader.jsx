import { X, Settings, Search } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import GroupSettingsModal from "./GroupSettingsModal";
import MessageSearch from "./MessageSearch";
import { optimizeForProfilePic } from "../lib/cloudinaryUtils";

const ChatHeader = () => {
  const { selectedUser, selectedGroup, setSelectedUser, setSelectedGroup } = useChatStore();
  const { onlineUsers, authUser } = useAuthStore();
  const navigate = useNavigate();
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const handleClose = () => {
    if (selectedUser) {
      setSelectedUser(null);
    } else if (selectedGroup) {
      setSelectedGroup(null);
    }
  };

  // Handle avatar click in header - only for current user in direct chat
  const handleHeaderAvatarClick = () => {
    // Only allow clicking if it's a direct chat with the current user
    // (This would be unusual, but just in case)
    if (selectedUser && selectedUser._id === authUser._id) {
      navigate("/profile");
    }
    // Do nothing for groups or other users
  };

  const currentChat = selectedUser || selectedGroup;
  const isGroup = !!selectedGroup;

  return (
    <div className="p-2.5 border-b border-base-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="avatar">
            <div 
              className={`size-10 rounded-full relative ${
                selectedUser && selectedUser._id === authUser._id 
                  ? 'cursor-pointer hover:opacity-80 transition-opacity' 
                  : ''
              }`}
              onClick={handleHeaderAvatarClick}
            >
              <img 
                src={optimizeForProfilePic(currentChat?.profilePic || "/avatar.png")} 
                alt={isGroup ? currentChat?.name : currentChat?.fullName}
                loading="lazy"
              />
              {isGroup && (
                <span className="absolute bottom-0 right-0 size-3 bg-blue-500 rounded-full ring-2 ring-zinc-900" />
              )}
            </div>
          </div>

          {/* Chat info */}
          <div>
            <h3 className="font-medium">
              {isGroup ? currentChat?.name : currentChat?.fullName}
            </h3>
            <p className="text-sm text-base-content/70">
              {isGroup 
                ? `${currentChat?.members?.length || 0} members`
                : (onlineUsers.includes(currentChat?._id) ? "Online" : "Offline")
              }
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {/* Search button */}
          <button 
            onClick={() => setShowSearch(true)}
            className="btn btn-ghost btn-sm"
            title="Search Messages"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Group settings button */}
          {isGroup && (
            <button 
              onClick={() => setShowGroupSettings(true)}
              className="btn btn-ghost btn-sm"
              title="Group Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          )}

          {/* Close button */}
          <button onClick={handleClose} className="btn btn-ghost btn-sm">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Group Settings Modal */}
      <GroupSettingsModal 
        isOpen={showGroupSettings}
        onClose={() => setShowGroupSettings(false)}
        group={selectedGroup}
      />

      {/* Message Search Modal */}
      <MessageSearch
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        selectedUser={selectedUser}
        selectedGroup={selectedGroup}
      />
    </div>
  );
};
export default ChatHeader;
