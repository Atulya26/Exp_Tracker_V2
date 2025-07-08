import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface AddExpenseProps {
  groupId: string;
  groupMembers: string[];
}

const AddExpense: React.FC<AddExpenseProps> = ({ groupId, groupMembers }) => {
  const [description, setDescription] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paidBy, setPaidBy] = useState<string>('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  useEffect(() => {
    if (groupMembers.length > 0) {
      setPaidBy(groupMembers[0]); // Default to the first member
      setSelectedMembers(groupMembers); // Select all by default
    }
  }, [groupMembers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId) {
      alert("Group not selected.");
      return;
    }

    try {
      await addDoc(collection(db, 'groups', groupId, 'expenses'), {
        description,
        amount: Number(amount),
        date: new Date(date),
        paidBy,
        members: selectedMembers,
        splitType: 'equal', // For now, only equal split
        createdAt: serverTimestamp(),
      });
      setDescription('');
      setAmount(0);
      setDate(new Date().toISOString().split('T')[0]);
      setSelectedMembers(groupMembers); // Reset to all selected
      alert("Expense added successfully!");
    } catch (error) {
      console.error("Error adding expense: ", error);
      alert("Failed to add expense.");
    }
  };

  return (
    <div className="p-4 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Add New Expense</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
          <input
            type="text"
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            required
          />
        </div>
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Amount</label>
          <input
            type="number"
            id="amount"
            value={amount === 0 ? '' : amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            required
            min="0"
            step="0.01"
          />
        </div>
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700">Date</label>
          <input
            type="date"
            id="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            required
          />
        </div>
        <div>
          <label htmlFor="paidBy" className="block text-sm font-medium text-gray-700">Paid By</label>
          <select
            id="paidBy"
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            required
          >
            {groupMembers.map(member => (
              <option key={member} value={member}>{member}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Split Among</label>
          <div className="mt-1 space-y-2">
            {groupMembers.map(member => (
              <div key={member} className="flex items-center">
                <input
                  type="checkbox"
                  id={`member-${member}`}
                  checked={selectedMembers.includes(member)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedMembers([...selectedMembers, member]);
                    } else {
                      setSelectedMembers(selectedMembers.filter(name => name !== member));
                    }
                  }}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor={`member-${member}`} className="ml-2 text-sm text-gray-900">{member}</label>
              </div>
            ))}
          </div>
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Add Expense
        </button>
      </form>
    </div>
  );
};

export default AddExpense;