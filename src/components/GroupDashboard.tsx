import React, { useEffect, useState } from 'react';
import { useParams, Link, Routes, Route } from 'react-router-dom';
import { db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import AddExpense from './AddExpense';
import ExpenseList from './ExpenseList';
import BalanceView from './BalanceView';

interface GroupData {
  name: string;
  members: string[];
}

const GroupDashboard: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const [group, setGroup] = useState<GroupData | null>(null);

  useEffect(() => {
    const fetchGroup = async () => {
      if (groupId) {
        const groupDocRef = doc(db, "groups", groupId);
        const groupDocSnap = await getDoc(groupDocRef);
        if (groupDocSnap.exists()) {
          setGroup(groupDocSnap.data() as GroupData);
        } else {
          console.error("No such group!");
          // Optionally navigate to a 404 or home page
        }
      }
    };
    fetchGroup();
  }, [groupId]);

  if (!group) {
    return <div className="p-4 bg-white rounded shadow">Loading group details...</div>;
  }

  if (!groupId) {
    return <div className="p-4 bg-white rounded shadow">Error: Group ID not found.</div>;
  }

  return (
    <div className="p-4 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Group: {group.name}</h2>
      <p className="mb-4">Members: {group.members.join(', ')}</p>

      <nav className="bg-gray-200 p-2 rounded mb-4">
        <ul className="flex justify-around">
          <li>
            <Link to={`/group/${groupId}/add-expense`} className="text-blue-600 hover:text-blue-800">Add Expense</Link>
          </li>
          <li>
            <Link to={`/group/${groupId}/expenses`} className="text-blue-600 hover:text-blue-800">Expenses</Link>
          </li>
          <li>
            <Link to={`/group/${groupId}/balances`} className="text-blue-600 hover:text-blue-800">Balances</Link>
          </li>
        </ul>
      </nav>

      {/* Render sub-components based on nested routes or state */}
      <Routes>
        <Route path="add-expense" element={<AddExpense groupId={groupId} groupMembers={group.members} />} />
        <Route path="expenses" element={<ExpenseList groupId={groupId} groupMembers={group.members} />} />
        <Route path="balances" element={<BalanceView groupId={groupId} groupMembers={group.members} />} />
        <Route path="/" element={
          <div className="text-center text-gray-600">
            <p>Select an option from the navigation above.</p>
          </div>
        } />
      </Routes>
    </div>
  );
};

export default GroupDashboard;
