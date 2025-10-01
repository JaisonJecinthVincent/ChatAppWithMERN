import React, { useState, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { optimizeForProfilePic } from "../lib/cloudinaryUtils";

const CreateGroupModal = () => {
	const { authUser } = useAuthStore();
	const { getGroups, users, getUsers } = useChatStore();
	const [groupName, setGroupName] = useState("");
	const [selectedParticipants, setSelectedParticipants] = useState([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [loading, setLoading] = useState(false);
	const [isOpen, setIsOpen] = useState(false);

	// Load users when modal opens
	useEffect(() => {
		if (isOpen && users.length === 0) {
			getUsers();
		}
	}, [isOpen, users.length, getUsers]);

	// Filter users based on search query
	const filteredUsers = users.filter(user => 
		user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
		user.email.toLowerCase().includes(searchQuery.toLowerCase())
	);

	const toggleParticipant = (userId) => {
		setSelectedParticipants(prev => 
			prev.includes(userId) 
				? prev.filter(id => id !== userId)
				: [...prev, userId]
		);
	};

	const handleCreateGroup = async (e) => {
		e.preventDefault();
		if (!groupName) {
			return toast.error("Please enter a group name.");
		}
		if (selectedParticipants.length === 0) {
			return toast.error("Please select at least one participant.");
		}
		if (!authUser || !authUser._id) {
			return toast.error("User not authenticated. Please login again.");
		}

		setLoading(true);
		try {
			await axiosInstance.post("/groups", {
				name: groupName,
				members: [...selectedParticipants, authUser._id],
			});

			toast.success("Group created successfully.");
			setGroupName("");
			setSelectedParticipants([]);
			setIsOpen(false);
			getGroups(); // Refresh groups list
		} catch (error) {
			console.error("Error creating group:", error);
			toast.error(error.response?.data?.message || "Failed to create group.");
		} finally {
			setLoading(false);
		}
	};

	const closeModal = () => {
		setIsOpen(false);
		setGroupName("");
		setSelectedParticipants([]);
		setSearchQuery("");
	};

	return (
		<div>
			<button
				onClick={() => setIsOpen(true)}
				className="btn btn-outline btn-sm w-full"
			>
				Create Group
			</button>

			{isOpen && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-base-100 rounded-lg p-6 w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto">
						<h2 className="text-lg font-semibold mb-4">Create a new group</h2>
						<p className="text-sm text-base-content/70 mb-6">
							Enter a name for your group and select participants from your contacts.
						</p>

						<form onSubmit={handleCreateGroup} className="space-y-4">
							<div>
								<label className="block text-sm font-medium mb-2">
									Group Name
								</label>
								<input
									type="text"
									value={groupName}
									onChange={(e) => setGroupName(e.target.value)}
									className="input input-bordered w-full"
									placeholder="Enter group name"
									required
								/>
							</div>

							<div>
								<label className="block text-sm font-medium mb-2">
									Select Participants ({selectedParticipants.length} selected)
								</label>
								
								{/* Selected participants preview */}
								{selectedParticipants.length > 0 && (
									<div className="mb-3 p-2 bg-base-200 rounded-lg">
										<p className="text-xs text-base-content/70 mb-2">Selected:</p>
										<div className="flex flex-wrap gap-2">
											{selectedParticipants.map(participantId => {
												const participant = users.find(u => u._id === participantId);
												return participant ? (
													<div key={participantId} className="flex items-center bg-primary/20 rounded-full px-2 py-1 text-xs">
														<img
															src={optimizeForProfilePic(participant.profilePic || "/avatar.png")}
															alt={participant.fullName}
															className="w-4 h-4 rounded-full mr-1"
															loading="lazy"
														/>
														<span className="mr-1">{participant.fullName}</span>
														<button
															type="button"
															onClick={() => toggleParticipant(participantId)}
															className="text-red-500 hover:text-red-700 ml-1"
														>
															×
														</button>
													</div>
												) : null;
											})}
										</div>
									</div>
								)}
								
								{/* Search input */}
								<input
									type="text"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									placeholder="Search contacts..."
									className="input input-bordered w-full mb-3 input-sm"
								/>
								
								<div className="border border-base-300 rounded-lg max-h-48 overflow-y-auto">
									{filteredUsers.length === 0 ? (
										<div className="p-4 text-center text-base-content/70">
											{users.length === 0 ? "No contacts available" : "No contacts found"}
										</div>
									) : (
										filteredUsers.map((contact) => (
											<div
												key={contact._id}
												className={`p-3 border-b border-base-300 last:border-b-0 cursor-pointer hover:bg-base-200 transition-colors ${
													selectedParticipants.includes(contact._id) ? 'bg-primary/10' : ''
												}`}
												onClick={() => toggleParticipant(contact._id)}
											>
												<div className="flex items-center space-x-3">
													<input
														type="checkbox"
														checked={selectedParticipants.includes(contact._id)}
														onChange={() => toggleParticipant(contact._id)}
														className="checkbox checkbox-primary checkbox-sm"
													/>
													<img
														src={optimizeForProfilePic(contact.profilePic || "/avatar.png")}
														alt={contact.fullName}
														className="w-8 h-8 rounded-full object-cover"
														loading="lazy"
													/>
													<div className="flex-1">
														<p className="font-medium text-sm">{contact.fullName}</p>
														<p className="text-xs text-base-content/70">{contact.email}</p>
													</div>
												</div>
											</div>
										))
									)}
								</div>
							</div>

							<div className="flex gap-3 justify-end">
								<button
									type="button"
									onClick={closeModal}
									className="btn btn-ghost"
									disabled={loading}
								>
									Cancel
								</button>
								<button
									type="submit"
									className="btn btn-primary"
									disabled={loading || selectedParticipants.length === 0 || !authUser?._id}
								>
									{loading ? "Creating..." : "Create Group"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
};

export default CreateGroupModal;
