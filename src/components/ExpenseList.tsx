import React, { useEffect, useState } from 'react';
import { db, auth } from '../firebaseConfig';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';

interface Expense {
  id: string;
  description: string;
  amount: number;
  date: Date;
  paidBy: string;
  members: string[];
  splitType: string;
  createdAt: Date;
  createdBy?: string;
}

interface ExpenseListProps {
  groupId: string;
  groupMembers: string[];
}

const ExpenseList: React.FC<ExpenseListProps> = ({ groupId, groupMembers }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<string | null>(null);

  useEffect(() => {
    if (!groupId) return;

    setLoading(true);
    setError(null);

    const q = query(collection(db, 'groups', groupId, 'expenses'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        const expensesData: Expense[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          expensesData.push({
            id: doc.id,
            description: data.description,
            amount: data.amount,
            date: data.date.toDate(),
            paidBy: data.paidBy,
            members: data.members || [],
            splitType: data.splitType,
            createdAt: data.createdAt?.toDate() || new Date(),
            createdBy: data.createdBy,
          });
        });
        setExpenses(expensesData);
      } catch (err) {
        console.error("Error processing expenses:", err);
        setError("Failed to load expenses. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    }, (error) => {
      console.error("Error listening to expenses:", error);
      setError("Failed to load expenses. Please refresh the page.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [groupId]);

  const handleDeleteExpense = async (expenseId: string, description: string) => {
    if (!auth.currentUser) {
      alert("You must be logged in to delete expenses.");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${description}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingExpense(expenseId);
      await deleteDoc(doc(db, 'groups', groupId, 'expenses', expenseId));
      alert("Expense deleted successfully!");
    } catch (error) {
      console.error("Error deleting expense:", error);
      alert("Failed to delete expense. Please try again.");
    } finally {
      setDeletingExpense(null);
    }
  };

  const canDeleteExpense = (expense: Expense): boolean => {
    return auth.currentUser?.uid === expense.createdBy || 
           auth.currentUser?.email === expense.paidBy;
  };

  const formatCurrency = (amount: number): string => {
    return `₹${amount.toFixed(2)}`;
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="p-4 bg-white rounded shadow">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading expenses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Expense List</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {expenses.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 text-lg">No expenses added yet.</p>
          <p className="text-gray-400 text-sm mt-2">Add your first expense to get started!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {expenses.map((expense) => (
            <div key={expense.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="font-semibold text-lg">{expense.description}</h3>
                    {expense.splitType === 'settlement' && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        Settlement
                      </span>
                    )}
                  </div>
                  
                  <div className="text-2xl font-bold text-green-600 mb-2">
                    {formatCurrency(expense.amount)}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Date:</span> {formatDate(expense.date)}
                    </div>
                    <div>
                      <span className="font-medium">Paid by:</span> {expense.paidBy}
                    </div>
                    <div className="md:col-span-2">
                      <span className="font-medium">Split among:</span> {expense.members.join(', ')}
                    </div>
                    {expense.splitType === 'equal' && expense.members.length > 0 && (
                      <div className="md:col-span-2">
                        <span className="font-medium">Per person:</span> {formatCurrency(expense.amount / expense.members.length)}
                      </div>
                    )}
                  </div>
                </div>
                
                {canDeleteExpense(expense) && (
                  <button
                    onClick={() => handleDeleteExpense(expense.id, expense.description)}
                    disabled={deletingExpense === expense.id}
                    className={`ml-4 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm ${
                      deletingExpense === expense.id ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {deletingExpense === expense.id ? 'Deleting...' : 'Delete'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {expenses.length > 0 && (
        <div className="mt-6 p-3 bg-gray-50 rounded">
          <p className="text-sm text-gray-600">
            Total expenses: {expenses.length} | 
            Total amount: {formatCurrency(expenses.reduce((sum, exp) => sum + exp.amount, 0))}
          </p>
        </div>
      )}
    </div>
  );
};

export default ExpenseList;