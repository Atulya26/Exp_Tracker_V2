import React, { useEffect, useState } from 'react';
import { useParams, Link, Routes, Route, Navigate } from 'react-router-dom';
import { db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import AddExpense from './AddExpense';
import ExpenseList from './ExpenseList';
import BalanceView from './BalanceView';

interface GroupData {
  name: string;
  members: string[];
  createdAt: Date;
}

const GroupDashboard: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const [group, setGroup] = useState<GroupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGroup = async () => {
      if (!groupId) return;
      try {
        setLoading(true);
        setError(null);
        const groupDocRef = doc(db, "groups", groupId);
        const groupDocSnap = await getDoc(groupDocRef);
        if (groupDocSnap.exists()) {
          const data = groupDocSnap.data();
          const groupData: GroupData = {
            name: data.name,
            members: data.members || [],
            createdAt: data.createdAt?.toDate() || new Date(),
          };
          setGroup(groupData);
        } else {
          setError("Group not found.");
        }
      } catch (err) {
        console.error("Error fetching group:", err);
        setError("Failed to load group details. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchGroup();
  }, [groupId]);

  if (loading) {
    return (
      <div className="p-4 bg-white rounded shadow">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading group details...</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-4 bg-white rounded shadow">
        <div className="text-center">
          <div className="text-red-600 text-lg font-semibold mb-2">Error</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link 
            to="/" 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Go Back Home
          </Link>
        </div>
      </div>
    );
  }
  if (!group) {
    return <Navigate to="/" replace />;
  }
  if (!groupId) {
    return <Navigate to="/" replace />;
  }
  return (
    <div className="p-4 bg-white rounded shadow">
      <div className="mb-4">
        <h2 className="text-2xl font-bold mb-2">Group: {group.name}</h2>
        <p className="text-gray-600 mb-2">Members: {group.members.join(', ')}</p>
        <p className="text-sm text-gray-500">
          Created: {group.createdAt.toLocaleDateString()}
        </p>
      </div>
      <nav className="bg-gray-100 p-3 rounded mb-6">
        <ul className="flex justify-around">
          <li>
            <Link 
              to={`/group/${groupId}/add-expense`} 
              className="text-blue-600 hover:text-blue-800 font-medium px-3 py-2 rounded hover:bg-blue-50"
            >
              Add Expense
            </Link>
          </li>
          <li>
            <Link 
              to={`/group/${groupId}/expenses`} 
              className="text-blue-600 hover:text-blue-800 font-medium px-3 py-2 rounded hover:bg-blue-50"
            >
              Expenses
            </Link>
          </li>
          <li>
            <Link 
              to={`/group/${groupId}/balances`} 
              className="text-blue-600 hover:text-blue-800 font-medium px-3 py-2 rounded hover:bg-blue-50"
            >
              Balances
            </Link>
          </li>
        </ul>
      </nav>
      <Routes>
        <Route path="add-expense" element={<AddExpense groupId={groupId} groupMembers={group.members} />} />
        <Route path="expenses" element={<ExpenseList groupId={groupId} groupMembers={group.members} />} />
        <Route path="balances" element={<BalanceView groupId={groupId} groupMembers={group.members} />} />
        <Route path="/" element={
          <div className="text-center text-gray-600 py-8">
            <p className="text-lg mb-2">Welcome to {group.name}!</p>
            <p>Select an option from the navigation above to get started.</p>
          </div>
        } />
      </Routes>
    </div>
  );
};

export default GroupDashboard;
