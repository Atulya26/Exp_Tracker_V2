import React, { useEffect, useState } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

interface Expense {
  id: string;
  description: string;
  amount: number;
  date: Date;
  paidBy: string;
  members: string[];
  splitType: string;
  createdAt: Date;
}

interface ExpenseListProps {
  groupId: string;
  groupMembers: string[];
}

const ExpenseList: React.FC<ExpenseListProps> = ({ groupId, groupMembers }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    if (!groupId) return;

    const q = query(collection(db, 'groups', groupId, 'expenses'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const expensesData: Expense[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        expensesData.push({
          id: doc.id,
          description: data.description,
          amount: data.amount,
          date: data.date.toDate(), // Convert Firebase Timestamp to Date object
          paidBy: data.paidBy,
          members: data.members,
          splitType: data.splitType,
          createdAt: data.createdAt.toDate(),
        });
      });
      setExpenses(expensesData);
    });

    return () => unsubscribe();
  }, [groupId]);

  return (
    <div className="p-4 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Expense List</h2>
      {expenses.length === 0 ? (
        <p>No expenses added yet.</p>
      ) : (
        <ul className="space-y-4">
          {expenses.map((expense) => (
            <li key={expense.id} className="border-b pb-2">
              <p className="font-semibold">{expense.description} - ${expense.amount.toFixed(2)}</p>
              <p className="text-sm text-gray-600">Date: {expense.date.toLocaleDateString()}</p>
              <p className="text-sm text-gray-600">Paid by: {expense.paidBy}</p>
              <p className="text-sm text-gray-600">Split among: {expense.members.join(', ')}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ExpenseList;