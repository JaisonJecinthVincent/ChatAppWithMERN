import { useState, useEffect } from "react";
import { Search, Users, UserPlus, X } from "lucide-react";
import { axiosInstance } from "../lib/axios";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { optimizeForProfilePic } from "../lib/cloudinaryUtils";
import toast from "react-hot-toast";

const GroupSearchModal = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("groups"); // "groups" or "users"
  const { authUser } = useAuthStore();
  const { getGroups, addMemberToGroup } = useChatStore();

  // Search for groups
  const searchGroups = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await axiosInstance.get(`/groups/search?q=${encodeURIComponent(query)}`);
      setSearchResults(response.data);
    } catch (error) {
      console.error("Error searching groups:", error);
      toast.error("Error searching groups");
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Search for users
  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await axiosInstance.get(`/messages/users/search?q=${encodeURIComponent(query)}`);
      setSearchResults(response.data);
    } catch (error) {
      console.error("Error searching users:", error);
      toast.error("Error searching users");
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Join a group
  const joinGroup = async (groupId) => {
    try {
      await axiosInstance.post(`/groups/${groupId}/join`);
      toast.success("Successfully joined the group!");
      getGroups(); // Refresh groups list
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to join group");
    }
  };

  // Handle search
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (activeTab === "groups") {
        searchGroups(searchQuery);
      } else {
        searchUsers(searchQuery);
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchQuery, activeTab]);

  // Reset when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setSearchResults([]);
      setActiveTab("groups");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-base-100 rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Search & Discover</h2>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="tabs tabs-boxed mb-4">
          <button 
            className={`tab flex-1 ${activeTab === "groups" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("groups")}
          >
            <Users className="size-4 mr-2" />
            Groups
          </button>
          <button 
            className={`tab flex-1 ${activeTab === "users" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("users")}
          >
            <UserPlus className="size-4 mr-2" />
            Users
          </button>
        </div>

        {/* Search Input */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/40 size-4" />
          <input
            type="text"
            placeholder={activeTab === "groups" ? "Search groups..." : "Search users..."}
            className="input input-bordered w-full pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Results */}
        <div className="overflow-y-auto max-h-[400px]">
          {loading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-md"></span>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-8 text-base-content/60">
              {searchQuery ? `No ${activeTab} found` : `Start typing to search ${activeTab}`}
            </div>
          ) : (
            <div className="space-y-2">
              {searchResults.map((item) => (
                <div key={item._id} className="flex items-center gap-3 p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors">
                  <img
                    src={optimizeForProfilePic(item.profilePic || "/avatar.png")}
                    alt={item.name || item.fullName}
                    className="size-10 rounded-full object-cover"
                    loading="lazy"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.name || item.fullName}</p>
                    {activeTab === "groups" && (
                      <p className="text-sm text-base-content/60">
                        {item.members?.length || 0} members
                      </p>
                    )}
                    {activeTab === "users" && (
                      <p className="text-sm text-base-content/60">{item.email}</p>
                    )}
                  </div>
                  {activeTab === "groups" && (
                    <button
                      onClick={() => joinGroup(item._id)}
                      className="btn btn-primary btn-sm"
                      disabled={item.members?.includes(authUser._id)}
                    >
                      {item.members?.includes(authUser._id) ? "Joined" : "Join"}
                    </button>
                  )}
                  {activeTab === "users" && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        // This could open a dialog to select which group to add the user to
                        toast.info("Select a group first to add this user");
                      }}
                    >
                      Add
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupSearchModal;