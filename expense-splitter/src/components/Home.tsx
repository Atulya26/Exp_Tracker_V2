import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../firebaseConfig';
import { collection, getDocs, doc, deleteDoc, query, where } from 'firebase/firestore';

interface Group {
  id: string;
  name: string;
}

const Home: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGroups = async () => {
      const groupsCollectionRef = collection(db, 'groups');
      const groupsSnapshot = await getDocs(groupsCollectionRef);
      const fetchedGroups: Group[] = [];
      groupsSnapshot.forEach(doc => {
        fetchedGroups.push({ id: doc.id, name: doc.data().name });
      });
      setGroups(fetchedGroups);
    };

    fetchGroups();
  }, []);

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (window.confirm(`Are you sure you want to delete the group "${groupName}"? This action cannot be undone.`)) {
      try {
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
        console.log(`Group "${groupName}" and its expenses deleted successfully.`);
      } catch (error) {
        console.error("Error deleting group: ", error);
        alert("Failed to delete group. Please try again.");
      }
    }
  };

  return (
    <div className="p-4 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Welcome to Expense Splitter</h2>
      <p className="mb-4">Select an existing group or create a new one.</p>

      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">Existing Groups</h3>
        {groups.length === 0 ? (
          <p>No groups available. Create one to get started!</p>
        ) : (
          <ul className="space-y-2">
            {groups.map(group => (
              <li key={group.id} className="flex items-center justify-between">
                <Link
                  to={`/group/${group.id}`}
                  className="text-blue-600 hover:text-blue-800 text-lg"
                >
                  {group.name}
                </Link>
                <button
                  onClick={() => handleDeleteGroup(group.id, group.name)}
                  className="ml-4 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                >
                  Delete
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
