import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db, auth } from '../firebaseConfig';
import { collection, getDocs, doc, deleteDoc, query, where } from 'firebase/firestore';

interface Group {
  id: string;
  name: string;
  members: string[];
  createdBy: string;
  createdAt: Date;
}

const Home: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGroups = async () => {
      if (!auth.currentUser) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Fetch groups where user is a member or creator
        const groupsCollectionRef = collection(db, 'groups');
        const groupsSnapshot = await getDocs(groupsCollectionRef);
        const fetchedGroups: Group[] = [];
        
        groupsSnapshot.forEach(doc => {
          const data = doc.data();
          const group = {
            id: doc.id,
            name: data.name,
            members: data.members || [],
            createdBy: data.createdBy || '',
            createdAt: data.createdAt?.toDate() || new Date(),
          };
          
          // Only show groups where user is a member
          if (group.members.includes(auth.currentUser?.email || '') || 
              group.createdBy === auth.currentUser?.uid) {
            fetchedGroups.push(group);
          }
        });
        
        setGroups(fetchedGroups);
      } catch (err) {
        console.error("Error fetching groups:", err);
        setError("Failed to load groups. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, []);

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (!auth.currentUser) return;
    
    if (!window.confirm(`Are you sure you want to delete the group "${groupName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingGroup(groupId);
      
      // Delete expenses associated with the group
      const expensesQuery = query(collection(db, 'groups', groupId, 'expenses'));
      const expensesSnapshot = await getDocs(expensesQuery);
      const deletePromises: Promise<void>[] = [];
      
      expensesSnapshot.forEach((expenseDoc) => {
        deletePromises.push(deleteDoc(doc(db, 'groups', groupId, 'expenses', expenseDoc.id)));
      });
      
      await Promise.all(deletePromises);

      // Delete the group document
      await deleteDoc(doc(db, 'groups', groupId));

      // Update local state
      setGroups(prevGroups => prevGroups.filter(group => group.id !== groupId));
      alert(`Group "${groupName}" deleted successfully.`);
    } catch (error) {
      console.error("Error deleting group: ", error);
      alert("Failed to delete group. Please try again.");
    } finally {
      setDeletingGroup(null);
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-white rounded shadow">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading groups...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Welcome to Expense Splitter</h2>
      <p className="mb-4">Select an existing group or create a new one.</p>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">Your Groups</h3>
        {groups.length === 0 ? (
          <p className="text-gray-600">No groups available. Create one to get started!</p>
        ) : (
          <ul className="space-y-2">
            {groups.map(group => (
              <li key={group.id} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
                <div className="flex-1">
                  <Link
                    to={`/group/${group.id}`}
                    className="text-blue-600 hover:text-blue-800 text-lg font-medium"
                  >
                    {group.name}
                  </Link>
                  <p className="text-sm text-gray-500">
                    Members: {group.members.join(', ')}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteGroup(group.id, group.name)}
                  disabled={deletingGroup === group.id}
                  className={`ml-4 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm ${
                    deletingGroup === group.id ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {deletingGroup === group.id ? 'Deleting...' : 'Delete'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-2">Create New Group</h3>
        <button
          onClick={() => navigate('/group-setup')}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Create Group
        </button>
      </div>
    </div>
  );
};

export default Home;
