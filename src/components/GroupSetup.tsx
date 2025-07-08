import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const GroupSetup: React.FC = () => {
  const [groupName, setGroupName] = useState<string>('');
  const [members, setMembers] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const validateForm = (): string | null => {
    if (!groupName.trim()) {
      return "Group name is required.";
    }
    if (groupName.trim().length < 2) {
      return "Group name must be at least 2 characters long.";
    }
    if (!members.trim()) {
      return "At least one member is required.";
    }
    const memberNames = members.split(',').map(name => name.trim()).filter(name => name.length > 0);
    if (memberNames.length < 2) {
      return "At least 2 members are required for a group.";
    }
    const uniqueMembers = new Set(memberNames);
    if (uniqueMembers.size !== memberNames.length) {
      return "Duplicate member names are not allowed.";
    }
    for (const member of memberNames) {
      if (member.length < 2) {
        return "Each member name must be at least 2 characters long.";
      }
      if (!/^[a-zA-Z\s]+$/.test(member)) {
        return "Member names can only contain letters and spaces.";
      }
    }
    return null;
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const memberNames = members.split(',').map(name => name.trim()).filter(name => name.length > 0);
      const newGroupRef = await addDoc(collection(db, 'groups'), {
        name: groupName.trim(),
        members: memberNames,
        createdAt: serverTimestamp(),
      });
      alert("Group created successfully!");
      navigate(`/group/${newGroupRef.id}`);
    } catch (error) {
      console.error("Error creating group: ", error);
      setError("Failed to create group. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Create New Group</h2>
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      <form onSubmit={handleCreateGroup} className="space-y-4">
        <div>
          <label htmlFor="groupName" className="block text-sm font-medium text-gray-700">
            Group Name *
          </label>
          <input
            type="text"
            id="groupName"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter group name"
            required
            disabled={loading}
          />
        </div>
        <div>
          <label htmlFor="members" className="block text-sm font-medium text-gray-700">
            Members (comma-separated) *
          </label>
          <input
            type="text"
            id="members"
            value={members}
            onChange={(e) => setMembers(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., Alice, Bob, Charlie"
            required
            disabled={loading}
          />
        </div>
        <div className="flex space-x-3">
          <button
            type="submit"
            disabled={loading}
            className={`px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {loading ? 'Creating...' : 'Create Group'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            disabled={loading}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default GroupSetup;
