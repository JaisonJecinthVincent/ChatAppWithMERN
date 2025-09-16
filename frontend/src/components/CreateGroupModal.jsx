import React, { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useToast } from "./ui/use-toast";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "./ui/dialog";
import { api } from "@/lib/axios";
import { useAuthStore } from "@/store/useAuthStore";

const CreateGroupModal = () => {
	const { toast } = useToast();
	const { user } = useAuthStore();
	const [groupName, setGroupName] = useState("");
	const [participants, setParticipants] = useState("");
	const [loading, setLoading] = useState(false);

	const handleCreateGroup = async () => {
		if (!groupName || !participants) {
			return toast({
				title: "Error",
				description: "Please fill all the fields.",
				variant: "destructive",
			});
		}

		setLoading(true);
		try {
			const participantIds = participants.split(",").map((p) => p.trim());
			await api.post("/groups/create", {
				name: groupName,
				participants: [...participantIds, user._id],
			});

			toast({
				title: "Success",
				description: "Group created successfully.",
			});
		} catch (error) {
			console.error("Error creating group:", error);
			toast({
				title: "Error",
				description: "Failed to create group.",
				variant: "destructive",
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant='outline'>Create Group</Button>
			</DialogTrigger>
			<DialogContent className='sm:max-w-[425px]'>
				<DialogHeader>
					<DialogTitle>Create a new group</DialogTitle>
					<DialogDescription>
						Enter a name for your group and add participants by their user IDs, separated by commas.
					</DialogDescription>
				</DialogHeader>
				<div className='grid gap-4 py-4'>
					<div className='grid grid-cols-4 items-center gap-4'>
						<Label htmlFor='name' className='text-right'>
							Group Name
						</Label>
						<Input
							id='name'
							value={groupName}
							onChange={(e) => setGroupName(e.target.value)}
							className='col-span-3'
						/>
					</div>
					<div className='grid grid-cols-4 items-center gap-4'>
						<Label htmlFor='participants' className='text-right'>
							Participants
						</Label>
						<Input
							id='participants'
							value={participants}
							onChange={(e) => setParticipants(e.target.value)}
							className='col-span-3'
							placeholder='user1_id, user2_id, ...'
						/>
					</div>
				</div>
				<DialogFooter>
					<Button type='submit' onClick={handleCreateGroup} disabled={loading}>
						{loading ? "Creating..." : "Create Group"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default CreateGroupModal;
