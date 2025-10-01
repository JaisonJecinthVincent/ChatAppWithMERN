import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import CreateGroupModal from "./CreateGroupModal";
import GroupSearchModal from "./GroupSearchModal";
import OnlineStatusIndicator from "./OnlineStatusIndicator";
import { Users, MessageCircle, Search } from "lucide-react";
import { optimizeForProfilePic } from "../lib/cloudinaryUtils";

const Sidebar = () => {
  const { 
    getUsers, 
    getGroups, 
    users, 
    groups, 
    selectedUser, 
    selectedGroup, 
    setSelectedUser, 
    setSelectedGroup, 
    isUsersLoading,
    isGroupsLoading 
  } = useChatStore();

  const { onlineUsers } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("contacts"); // "contacts" or "groups"

  useEffect(() => {
    getUsers();
    getGroups();
  }, [getUsers, getGroups]);

  const filteredUsers = showOnlineOnly
    ? users.filter((user) => onlineUsers.includes(user._id))
    : users;

  // Debug logging
  console.log("All users:", users);
  console.log("Online users:", onlineUsers);
  console.log("Show online only:", showOnlineOnly);
  console.log("Filtered users:", filteredUsers);

  if (isUsersLoading && isGroupsLoading) return <SidebarSkeleton />;

  return (
    <aside className="h-full w-20 lg:w-72 border-r border-base-300 flex flex-col transition-all duration-200">
      <div className="border-b border-base-300 w-full p-5">
        {/* Tab Navigation */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab("contacts")}
              className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm transition-colors ${
                activeTab === "contacts" ? "bg-base-300 text-base-content" : "text-base-content/70"
              }`}
            >
              <Users className="size-4" />
              <span className="hidden lg:block">Contacts</span>
            </button>
            <button
              onClick={() => setActiveTab("groups")}
              className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm transition-colors ${
                activeTab === "groups" ? "bg-base-300 text-base-content" : "text-base-content/70"
              }`}
            >
              <MessageCircle className="size-4" />
              <span className="hidden lg:block">Groups</span>
            </button>
          </div>
          
          {/* Search Button */}
          <button
            onClick={() => setSearchModalOpen(true)}
            className="btn btn-ghost btn-sm btn-circle"
            title="Search groups and users"
          >
            <Search className="size-4" />
          </button>
        </div>

        {/* Contacts Tab Content */}
        {activeTab === "contacts" && (
          <div className="hidden lg:flex items-center gap-2">
            <label className="cursor-pointer flex items-center gap-2">
              <input
                type="checkbox"
                checked={showOnlineOnly}
                onChange={(e) => setShowOnlineOnly(e.target.checked)}
                className="checkbox checkbox-sm"
              />
              <span className="text-sm">Show online only</span>
            </label>
            <span className="text-xs text-zinc-500">({onlineUsers.length - 1} online)</span>
          </div>
        )}

        {/* Groups Tab Content */}
        {activeTab === "groups" && (
          <div className="hidden lg:block">
            <CreateGroupModal />
          </div>
        )}
      </div>

      <div className="overflow-y-auto w-full py-3">
        {/* Contacts List */}
        {activeTab === "contacts" && (
          <>
            {filteredUsers.map((user) => (
              <button
                key={user._id}
                onClick={() => setSelectedUser(user)}
                className={`
                  w-full p-3 flex items-center gap-3
                  hover:bg-base-300 transition-colors
                  ${selectedUser?._id === user._id ? "bg-base-300 ring-1 ring-base-300" : ""}
                `}
              >
                <div className="relative mx-auto lg:mx-0">
                  <img
                    src={optimizeForProfilePic(user.profilePic || "/avatar.png")}
                    alt={user.name}
                    className="size-12 object-cover rounded-full"
                    loading="lazy"
                  />
                  <div className="absolute bottom-0 right-0">
                    <OnlineStatusIndicator 
                      user={{ isOnline: onlineUsers.includes(user._id), lastSeen: user.lastSeen }} 
                      size="md"
                    />
                  </div>
                </div>

                {/* User info - only visible on larger screens */}
                <div className="hidden lg:block text-left min-w-0">
                  <div className="font-medium truncate">{user.fullName}</div>
                  <div className="text-sm text-zinc-400">
                    <OnlineStatusIndicator 
                      user={{ isOnline: onlineUsers.includes(user._id), lastSeen: user.lastSeen }} 
                      showLabel={true}
                    />
                  </div>
                </div>
              </button>
            ))}

            {filteredUsers.length === 0 && (
              <div className="text-center text-zinc-500 py-4">No online users</div>
            )}
          </>
        )}

        {/* Groups List */}
        {activeTab === "groups" && (
          <>
            {groups.map((group) => (
              <button
                key={group._id}
                onClick={() => setSelectedGroup(group)}
                className={`
                  w-full p-3 flex items-center gap-3
                  hover:bg-base-300 transition-colors
                  ${selectedGroup?._id === group._id ? "bg-base-300 ring-1 ring-base-300" : ""}
                `}
              >
                <div className="relative mx-auto lg:mx-0">
                  <img
                    src={optimizeForProfilePic(group.profilePic || "/avatar.png")}
                    alt={group.name}
                    className="size-12 object-cover rounded-full"
                    loading="lazy"
                  />
                  <span
                    className="absolute bottom-0 right-0 size-3 bg-blue-500 
                    rounded-full ring-2 ring-zinc-900"
                  />
                </div>

                {/* Group info - only visible on larger screens */}
                <div className="hidden lg:block text-left min-w-0">
                  <div className="font-medium truncate">{group.name}</div>
                  <div className="text-sm text-zinc-400">
                    {group.members.length} members
                  </div>
                </div>
              </button>
            ))}

            {groups.length === 0 && (
              <div className="text-center text-zinc-500 py-4">No groups found</div>
            )}
          </>
        )}
      </div>
      
      <GroupSearchModal 
        isOpen={searchModalOpen} 
        onClose={() => setSearchModalOpen(false)} 
      />
    </aside>
  );
};
export default Sidebar;
