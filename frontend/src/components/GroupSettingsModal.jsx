import { useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { Camera, Users, Crown, UserMinus, UserPlus, X, UserCheck } from "lucide-react";
import toast from "react-hot-toast";
import ConfirmationModal from "./ConfirmationModal";
import { optimizeForProfilePic } from "../lib/cloudinaryUtils";

const GroupSettingsModal = ({ isOpen, onClose, group }) => {
  const { authUser } = useAuthStore();
  const { users, updateGroup, addMemberToGroup, removeMemberFromGroup, transferAdminRights } = useChatStore();
  const [groupName, setGroupName] = useState(group?.name || "");
  const [selectedProfilePic, setSelectedProfilePic] = useState(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedNewMember, setSelectedNewMember] = useState("");
  const [showTransferAdmin, setShowTransferAdmin] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingAdminTransfer, setPendingAdminTransfer] = useState(null);

  if (!isOpen || !group) return null;

  const isAdmin = group.admin === authUser._id || 
    (typeof group.admin === 'object' && group.admin._id === authUser._id);

  const availableUsers = users.filter(user => 
    !group.members.some(member => 
      typeof member === 'object' ? member._id === user._id : member === user._id
    ) && user._id !== authUser._id
  );

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64Image = reader.result;
      setSelectedProfilePic(base64Image);
    };
  };

  const handleUpdateGroup = async () => {
    if (!isAdmin) {
      toast.error("Only admins can update group settings");
      return;
    }

    try {
      const updates = {};
      if (groupName !== group.name) updates.name = groupName;
      if (selectedProfilePic) updates.profilePic = selectedProfilePic;

      if (Object.keys(updates).length > 0) {
        await updateGroup(group._id, updates);
        toast.success("Group updated successfully");
      }
      onClose();
    } catch (error) {
      toast.error("Failed to update group");
    }
  };

  const handleAddMember = async () => {
    if (!selectedNewMember) return;
    
    try {
      await addMemberToGroup(group._id, selectedNewMember);
      setSelectedNewMember("");
      setShowAddMember(false);
      toast.success("Member added successfully");
    } catch (error) {
      toast.error("Failed to add member");
    }
  };

  const handleRemoveMember = async (memberId) => {
    try {
      await removeMemberFromGroup(group._id, memberId);
      toast.success("Member removed successfully");
    } catch (error) {
      toast.error("Failed to remove member");
    }
  };

  const handleLeaveGroup = async () => {
    try {
      await removeMemberFromGroup(group._id, authUser._id);
      toast.success("You have left the group");
      onClose();
    } catch (error) {
      toast.error("Failed to leave group");
    }
  };

  const handleTransferAdmin = async (newAdminId) => {
    const newAdmin = users.find(u => u._id === newAdminId) || 
      (typeof group.members.find(m => (typeof m === 'object' ? m._id : m) === newAdminId) === 'object' 
        ? group.members.find(m => (typeof m === 'object' ? m._id : m) === newAdminId) 
        : null);
    
    setPendingAdminTransfer({ newAdminId, newAdminName: newAdmin?.fullName || "Unknown User" });
    setShowConfirmation(true);
  };

  const confirmTransferAdmin = async () => {
    try {
      await transferAdminRights(group._id, pendingAdminTransfer.newAdminId);
      setShowTransferAdmin(false);
      setShowConfirmation(false);
      setPendingAdminTransfer(null);
      toast.success("Admin rights transferred successfully");
    } catch (error) {
      toast.error("Failed to transfer admin rights");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-base-100 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Group Settings</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Group Profile Section */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative">
              <img
                src={optimizeForProfilePic(selectedProfilePic || group.profilePic || "/avatar.png")}
                alt={group.name}
                className="w-20 h-20 rounded-full object-cover"
                loading="lazy"
              />
              {isAdmin && (
                <label className="absolute -bottom-2 -right-2 bg-primary text-primary-content p-2 rounded-full cursor-pointer hover:bg-primary-focus">
                  <Camera className="w-4 h-4" />
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                </label>
              )}
            </div>
            
            <div className="flex-1">
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="input input-bordered w-full"
                placeholder="Group name"
                disabled={!isAdmin}
              />
            </div>
          </div>

          {isAdmin && (
            <button onClick={handleUpdateGroup} className="btn btn-primary">
              Update Group Info
            </button>
          )}
        </div>

        {/* Members Section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5" />
              Members ({group.members?.length || 0})
            </h3>
            <div className="flex gap-2">
              {isAdmin && (
                <>
                  <button 
                    onClick={() => setShowAddMember(true)}
                    className="btn btn-sm btn-primary"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add Member
                  </button>
                  <button 
                    onClick={() => setShowTransferAdmin(true)}
                    className="btn btn-sm btn-warning"
                  >
                    <UserCheck className="w-4 h-4" />
                    Transfer Admin
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Add Member Section */}
          {showAddMember && isAdmin && (
            <div className="mb-4 p-4 bg-base-200 rounded-lg">
              <div className="flex gap-2">
                <select
                  value={selectedNewMember}
                  onChange={(e) => setSelectedNewMember(e.target.value)}
                  className="select select-bordered flex-1"
                >
                  <option value="">Select a user to add</option>
                  {availableUsers.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.fullName} ({user.email})
                    </option>
                  ))}
                </select>
                <button onClick={handleAddMember} className="btn btn-primary">
                  Add
                </button>
                <button 
                  onClick={() => setShowAddMember(false)} 
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Transfer Admin Section */}
          {showTransferAdmin && isAdmin && (
            <div className="mb-4 p-4 bg-warning/10 border border-warning/20 rounded-lg">
              <h4 className="font-semibold mb-2 text-warning flex items-center gap-2">
                <Crown className="w-5 h-5" />
                Transfer Admin Rights
              </h4>
              <p className="text-sm text-base-content/70 mb-3">
                Select a member to make them the new admin. You will lose admin privileges.
              </p>
              <div className="space-y-2">
                {group.members?.map((member) => {
                  const memberData = typeof member === 'object' ? member : users.find(u => u._id === member);
                  if (!memberData || memberData._id === authUser._id) return null;

                  return (
                    <div key={memberData._id} className="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <img
                          src={optimizeForProfilePic(memberData.profilePic || "/avatar.png")}
                          alt={memberData.fullName}
                          className="w-10 h-10 rounded-full"
                          loading="lazy"
                        />
                        <div>
                          <span className="font-medium">{memberData.fullName}</span>
                          <p className="text-xs text-base-content/60">{memberData.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleTransferAdmin(memberData._id)}
                        className="btn btn-sm btn-warning"
                      >
                        <Crown className="w-4 h-4" />
                        Make Admin
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-end mt-4">
                <button 
                  onClick={() => setShowTransferAdmin(false)} 
                  className="btn btn-ghost btn-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Members List */}
          <div className="space-y-3">
            {group.members?.map((member) => {
              const memberData = typeof member === 'object' ? member : users.find(u => u._id === member);
              if (!memberData) return null;

              const isMemberAdmin = (typeof group.admin === 'object' ? group.admin._id : group.admin) === memberData._id;
              const isCurrentUser = memberData._id === authUser._id;

              return (
                <div key={memberData._id} className="flex items-center justify-between p-3 bg-base-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <img
                      src={optimizeForProfilePic(memberData.profilePic || "/avatar.png")}
                      alt={memberData.fullName}
                      className="w-10 h-10 rounded-full"
                      loading="lazy"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{memberData.fullName}</span>
                        {isMemberAdmin && <Crown className="w-4 h-4 text-yellow-500" />}
                        {isCurrentUser && <span className="text-sm text-base-content/70">(You)</span>}
                      </div>
                      <span className="text-sm text-base-content/70">{memberData.email}</span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    {/* Make Admin button - only show for non-admin members when current user is admin */}
                    {isAdmin && !isMemberAdmin && !isCurrentUser && (
                      <button
                        onClick={() => handleTransferAdmin(memberData._id)}
                        className="btn btn-sm btn-warning btn-outline"
                        title="Make Admin"
                      >
                        <Crown className="w-4 h-4" />
                      </button>
                    )}

                    {/* Remove member button */}
                    {isAdmin && !isMemberAdmin && !isCurrentUser && (
                      <button
                        onClick={() => handleRemoveMember(memberData._id)}
                        className="btn btn-sm btn-error btn-outline"
                        title="Remove Member"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Leave Group Button */}
        <div className="border-t pt-4">
          <button onClick={handleLeaveGroup} className="btn btn-error w-full">
            Leave Group
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Admin Transfer */}
      <ConfirmationModal
        isOpen={showConfirmation}
        onClose={() => {
          setShowConfirmation(false);
          setPendingAdminTransfer(null);
        }}
        onConfirm={confirmTransferAdmin}
        title="Transfer Admin Rights"
        message={`Are you sure you want to make ${pendingAdminTransfer?.newAdminName} the admin of this group? You will lose admin privileges and won't be able to manage the group anymore.`}
        confirmText="Transfer Admin"
        confirmButtonClass="btn-warning"
      />
    </div>
  );
};

export default GroupSettingsModal;
