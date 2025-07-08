import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface AddExpenseProps {
  groupId: string;
  groupMembers: string[];
}

const AddExpense: React.FC<AddExpenseProps> = ({ groupId, groupMembers }) => {
  const [description, setDescription] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paidBy, setPaidBy] = useState<string>('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (groupMembers.length > 0) {
      setPaidBy(groupMembers[0]);
      setSelectedMembers(groupMembers);
    }
  }, [groupMembers]);

  const validateForm = (): string | null => {
    if (!description.trim()) {
      return "Description is required.";
    }
    
    if (description.trim().length < 3) {
      return "Description must be at least 3 characters long.";
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      return "Amount must be greater than 0.";
    }
    
    if (parseFloat(amount) > 1000000) {
      return "Amount cannot exceed 1,000,000.";
    }
    
    if (!date) {
      return "Date is required.";
    }
    
    if (!paidBy) {
      return "Please select who paid for this expense.";
    }
    
    if (selectedMembers.length === 0) {
      return "Please select at least one member to split the expense with.";
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!auth.currentUser) {
      setError("You must be logged in to add expenses.");
      return;
    }
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const expenseAmount = parseFloat(amount);
      
      await addDoc(collection(db, 'groups', groupId, 'expenses'), {
        description: description.trim(),
        amount: expenseAmount,
        date: new Date(date),
        paidBy,
        members: selectedMembers,
        splitType: 'equal',
        createdBy: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      });
      
      // Reset form
      setDescription('');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setSelectedMembers(groupMembers);
      setSuccess("Expense added successfully!");
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error("Error adding expense: ", error);
      setError("Failed to add expense. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers and decimal point
    if (/^\d*\.?\d{0,2}$/.test(value) || value === '') {
      setAmount(value);
    }
  };

  const handleMemberToggle = (member: string) => {
    setSelectedMembers(prev => 
      prev.includes(member) 
        ? prev.filter(m => m !== member)
        : [...prev, member]
    );
  };

  const handleSelectAll = () => {
    setSelectedMembers(groupMembers);
  };

  const handleSelectNone = () => {
    setSelectedMembers([]);
  };

  return (
    <div className="p-4 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Add New Expense</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          {success}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description *
          </label>
          <input
            type="text"
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., Dinner at restaurant"
            required
            disabled={loading}
          />
        </div>
        
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
            Amount (₹) *
          </label>
          <input
            type="text"
            id="amount"
            value={amount}
            onChange={handleAmountChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="0.00"
            required
            disabled={loading}
          />
        </div>
        
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700">
            Date *
          </label>
          <input
            type="date"
            id="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            required
            disabled={loading}
          />
        </div>
        
        <div>
          <label htmlFor="paidBy" className="block text-sm font-medium text-gray-700">
            Paid By *
          </label>
          <select
            id="paidBy"
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            required
            disabled={loading}
          >
            <option value="">Select who paid</option>
            {groupMembers.map(member => (
              <option key={member} value={member}>{member}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Split Among *
          </label>
          
          <div className="mb-2 flex space-x-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={handleSelectNone}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Select None
            </button>
          </div>
          
          <div className="space-y-2 max-h-40 overflow-y-auto border rounded p-2">
            {groupMembers.map(member => (
              <div key={member} className="flex items-center">
                <input
                  type="checkbox"
                  id={`member-${member}`}
                  checked={selectedMembers.includes(member)}
                  onChange={() => handleMemberToggle(member)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  disabled={loading}
                />
                <label htmlFor={`member-${member}`} className="ml-2 text-sm text-gray-900">
                  {member}
                </label>
              </div>
            ))}
          </div>
          
          {selectedMembers.length > 0 && (
            <p className="mt-1 text-sm text-gray-500">
              Amount per person: ₹{(parseFloat(amount) / selectedMembers.length).toFixed(2)}
            </p>
          )}
        </div>
        
        <div className="flex space-x-3">
          <button
            type="submit"
            disabled={loading || selectedMembers.length === 0}
            className={`px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
              (loading || selectedMembers.length === 0) ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {loading ? 'Adding...' : 'Add Expense'}
          </button>
          
          <button
            type="button"
            onClick={() => {
              setDescription('');
              setAmount('');
              setDate(new Date().toISOString().split('T')[0]);
              setSelectedMembers(groupMembers);
              setError(null);
              setSuccess(null);
            }}
            disabled={loading}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Reset
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddExpense;