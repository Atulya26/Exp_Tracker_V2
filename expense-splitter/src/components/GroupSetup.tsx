import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebaseConfig';
import { collection, addDoc } from 'firebase/firestore';

const GroupSetup: React.FC = () => {
  const [groupName, setGroupName] = useState<string>('');
  const [members, setMembers] = useState<string>(''); // Comma-separated names
  const navigate = useNavigate();

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName || !members) {
      alert("Please fill in all fields.");
      return;
    }

    const memberNames = members.split(',').map(name => name.trim()).filter(name => name.length > 0);

    try {
      const newGroupRef = await addDoc(collection(db, 'groups'), {
        name: groupName,
        members: memberNames, // Store member names directly in the group document
        createdAt: new Date(),
      });
      alert("Group created successfully!");
      navigate(`/group/${newGroupRef.id}`);
    } catch (error) {
      console.error("Error creating group: ", error);
      alert("Failed to create group.");
    }
  };

  return (
    <div className="p-4 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Create New Group</h2>
      <form onSubmit={handleCreateGroup} className="space-y-4">
        <div>
          <label htmlFor="groupName" className="block text-sm font-medium text-gray-700">Group Name</label>
          <input
            type="text"
            id="groupName"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            required
          />
        </div>
        <div>
          <label htmlFor="members" className="block text-sm font-medium text-gray-700">Members (comma-separated)</label>
          <input
            type="text"
            id="members"
            value={members}
            onChange={(e) => setMembers(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            placeholder="e.g., Alice, Bob, Charlie"
            required
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Create Group
        </button>
      </form>
    </div>
  );
};

export default GroupSetup;
