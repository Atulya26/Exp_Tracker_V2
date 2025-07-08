import React, { useCallback, useEffect, useState } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, onSnapshot, addDoc, serverTimestamp, getDocs, deleteDoc, doc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

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

interface Transaction {
  from: string;
  to: string;
  amount: number;
}

interface BalanceViewProps {
  groupId: string;
  groupMembers: string[];
}

const BalanceView: React.FC<BalanceViewProps> = ({ groupId, groupMembers }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settlingIndex, setSettlingIndex] = useState<number | null>(null);
  const [settlingAll, setSettlingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Improved balance calculation with precision handling
  const calculateTransactions = useCallback((expenses: Expense[]) => {
    const balances: { [key: string]: number } = {};
    groupMembers.forEach(member => { balances[member] = 0; });

    expenses.forEach(expense => {
      if (expense.splitType === 'settlement') {
        balances[expense.paidBy] = +(balances[expense.paidBy] + expense.amount).toFixed(2);
        balances[expense.members[0]] = +(balances[expense.members[0]] - expense.amount).toFixed(2);
      } else {
        if (expense.members.length === 0) return;
        const amountPerPerson = +(expense.amount / expense.members.length).toFixed(2);
        balances[expense.paidBy] = +(balances[expense.paidBy] + expense.amount).toFixed(2);
        expense.members.forEach(member => {
          balances[member] = +(balances[member] - amountPerPerson).toFixed(2);
        });
      }
    });

    // Filter out near-zero balances due to floating point
    Object.keys(balances).forEach(key => {
      if (Math.abs(balances[key]) < 0.01) balances[key] = 0;
    });

    const debtors = Object.entries(balances).filter(([, balance]) => balance < 0).map(([person, balance]) => ({ person, amount: +(-balance).toFixed(2) }));
    const creditors = Object.entries(balances).filter(([, balance]) => balance > 0).map(([person, balance]) => ({ person, amount: +balance.toFixed(2) }));

    const newTransactions: Transaction[] = [];
    let creditorsCopy = creditors.map(c => ({ ...c }));
    debtors.forEach(debtor => {
      let debt = debtor.amount;
      for (let creditor of creditorsCopy) {
        if (debt > 0 && creditor.amount > 0) {
          const amountToPay = Math.min(debt, creditor.amount);
          newTransactions.push({ from: debtor.person, to: creditor.person, amount: amountToPay });
          debt = +(debt - amountToPay).toFixed(2);
          creditor.amount = +(creditor.amount - amountToPay).toFixed(2);
        }
      }
    });
    setTransactions(newTransactions);
  }, [groupMembers]);

  useEffect(() => {
    if (!groupId) return;

    const q = query(collection(db, 'groups', groupId, 'expenses'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const expensesData: Expense[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        expensesData.push({
          id: doc.id,
          description: data.description,
          amount: data.amount,
          date: data.date.toDate(),
          paidBy: data.paidBy,
          members: data.members,
          splitType: data.splitType,
          createdAt: data.createdAt ? data.createdAt.toDate() : new Date(), // Handle undefined createdAt
        });
      });
      calculateTransactions(expensesData);
    });

    return () => unsubscribe();
  }, [groupId, groupMembers, calculateTransactions]);

  const settleTransaction = async (from: string, to: string, amount: number, index: number) => {
    if (!groupId) return;
    setSettlingIndex(index);
    setError(null);
    setSuccess(null);
    try {
      await addDoc(collection(db, 'groups', groupId, 'expenses'), {
        description: `Settlement: ${from} to ${to}`,
        amount: amount,
        paidBy: from,
        members: [to],
        splitType: 'settlement',
        createdAt: serverTimestamp(),
      });
      setSuccess(`Settled: ${from} → ${to} (₹${amount.toFixed(2)})`);
    } catch (err: any) {
      setError('Failed to settle transaction. Please try again.');
      console.error(err);
    } finally {
      setSettlingIndex(null);
    }
  };

  const handleSettleAll = async () => {
    if (!groupId) return;

    if (!window.confirm("Are you sure you want to settle all expenses? This will clear all current expenses and generate a summary report.")) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      setSettlingAll(true); // Start loading
      
      // 1. Fetch all expenses
      const expensesRef = collection(db, 'groups', groupId, 'expenses');
      const expensesSnapshot = await getDocs(expensesRef);
      const expensesData: Expense[] = [];
      expensesSnapshot.forEach(doc => {
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
        });
      });

      // 2. Calculate current balances using the same improved logic
      const balances: { [key: string]: number } = {};
      groupMembers.forEach(member => { balances[member] = 0; });

      expensesData.forEach(expense => {
        if (expense.splitType === 'settlement') {
          balances[expense.paidBy] = +(balances[expense.paidBy] + expense.amount).toFixed(2);
          balances[expense.members[0]] = +(balances[expense.members[0]] - expense.amount).toFixed(2);
        } else {
          if (expense.members.length === 0) return;
          const amountPerPerson = +(expense.amount / expense.members.length).toFixed(2);
          balances[expense.paidBy] = +(balances[expense.paidBy] + expense.amount).toFixed(2);
          expense.members.forEach(member => {
            balances[member] = +(balances[member] - amountPerPerson).toFixed(2);
          });
        }
      });

      // Filter out near-zero balances due to floating point
      Object.keys(balances).forEach(key => {
        if (Math.abs(balances[key]) < 0.01) balances[key] = 0;
      });

      const debtors = Object.entries(balances).filter(([, balance]) => balance < 0).map(([person, balance]) => ({ person, amount: +(-balance).toFixed(2) }));
      const creditors = Object.entries(balances).filter(([, balance]) => balance > 0).map(([person, balance]) => ({ person, amount: +balance.toFixed(2) }));

      const finalTransactions: Transaction[] = [];
      let creditorsCopy = creditors.map(c => ({ ...c }));
      
      debtors.forEach(debtor => {
        let debt = debtor.amount;
        for (let creditor of creditorsCopy) {
          if (debt > 0 && creditor.amount > 0) {
            const amountToPay = Math.min(debt, creditor.amount);
            finalTransactions.push({ from: debtor.person, to: creditor.person, amount: amountToPay });
            debt = +(debt - amountToPay).toFixed(2);
            creditor.amount = +(creditor.amount - amountToPay).toFixed(2);
          }
        }
      });

      // 3. Prepare data for XLSX
      const expensesForExcel = expensesData.map(exp => ({
        Description: exp.description,
        Amount: exp.amount,
        Date: exp.date.toLocaleDateString(),
        'Paid By': exp.paidBy,
        'Split Among': exp.members.join(', '),
        'Split Type': exp.splitType,
      }));

      const balancesForExcel = finalTransactions.map(trans => ({
        From: trans.from,
        To: trans.to,
        Amount: trans.amount,
      }));

      // 4. Generate and download XLSX
      const wb = XLSX.utils.book_new();
      const wsExpenses = XLSX.utils.json_to_sheet(expensesForExcel);
      const wsBalances = XLSX.utils.json_to_sheet(balancesForExcel);

      XLSX.utils.book_append_sheet(wb, wsExpenses, "Expenses Summary");
      XLSX.utils.book_append_sheet(wb, wsBalances, "Balances Summary");

      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      saveAs(new Blob([wbout], { type: 'application/octet-stream' }), `Expense_Summary_${new Date().toLocaleDateString()}.xlsx`);

      // 5. Delete all expenses from Firestore
      const deletePromises: Promise<void>[] = [];
      expensesSnapshot.forEach((expenseDoc) => {
        deletePromises.push(deleteDoc(doc(db, 'groups', groupId, 'expenses', expenseDoc.id)));
      });
      await Promise.all(deletePromises);

      // 6. Clear displayed transactions
      setTransactions([]);
      setSuccess("All expenses settled and report downloaded successfully!");

    } catch (error) {
      console.error("Error settling all expenses: ", error);
      setError("Failed to settle all expenses. Please try again.");
    } finally {
      setSettlingAll(false); // End loading
    }
  };

  // New: Settle all (delete all expenses, reset to zero state)
  const handleClearAllExpenses = async () => {
    if (!groupId) return;
    if (!window.confirm("Are you sure you want to delete ALL expenses and reset all balances? This cannot be undone.")) {
      return;
    }
    try {
      setError(null);
      setSuccess(null);
      setSettlingAll(true);
      // Delete all expenses
      const expensesRef = collection(db, 'groups', groupId, 'expenses');
      const expensesSnapshot = await getDocs(expensesRef);
      const deletePromises: Promise<void>[] = [];
      expensesSnapshot.forEach((expenseDoc) => {
        deletePromises.push(deleteDoc(doc(db, 'groups', groupId, 'expenses', expenseDoc.id)));
      });
      await Promise.all(deletePromises);
      setTransactions([]);
      setSuccess('All expenses deleted. All balances are now settled.');
    } catch (err) {
      setError('Failed to delete all expenses. Please try again.');
      console.error(err);
    } finally {
      setSettlingAll(false);
    }
  };

  // New: Download all expenses as CSV for Google Sheets
  const handleDownloadCSV = async () => {
    if (!groupId) return;
    try {
      setError(null);
      setSuccess(null);
      // Fetch all expenses
      const expensesRef = collection(db, 'groups', groupId, 'expenses');
      const expensesSnapshot = await getDocs(expensesRef);
      const expensesData: Expense[] = [];
      expensesSnapshot.forEach(doc => {
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
        });
      });
      // Prepare CSV rows
      const csvRows = [
        [
          'Description',
          'Amount',
          'Date',
          'Paid By',
          'Split Among',
          'Split Type',
          'Created At',
        ],
        ...expensesData.map(exp => [
          exp.description,
          exp.amount,
          exp.date.toLocaleDateString(),
          exp.paidBy,
          exp.members.join(', '),
          exp.splitType,
          exp.createdAt.toLocaleString(),
        ]),
      ];
      // Convert to CSV string
      const csvContent = csvRows.map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')).join('\n');
      // Download as file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, `Expenses_${new Date().toLocaleDateString()}.csv`);
      setSuccess('CSV downloaded! You can import this file into Google Sheets.');
    } catch (err) {
      setError('Failed to download CSV. Please try again.');
      console.error(err);
    }
  };

  return (
    <div className="p-4 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Balances</h2>
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <button
          onClick={handleSettleAll}
          disabled={settlingAll}
          className={`px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${settlingAll ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {settlingAll ? 'Settling...' : 'Settle All & Download Report'}
        </button>
        <button
          onClick={handleClearAllExpenses}
          disabled={settlingAll}
          className={`px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${settlingAll ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {settlingAll ? 'Clearing...' : 'Settle All (Delete All)'}
        </button>
        <button
          onClick={handleDownloadCSV}
          disabled={settlingAll}
          className={`px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${settlingAll ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Download for Google Sheets (CSV)
        </button>
      </div>
      <div className="mb-4 text-sm text-gray-600">
        Tip: You can import the downloaded CSV file directly into Google Sheets to view and analyze your expenses and settlements.
      </div>
      {error && <div className="mb-2 text-red-600">{error}</div>}
      {success && <div className="mb-2 text-green-600">{success}</div>}
      {transactions.length === 0 ? (
        <p className="text-gray-500">No balances to display yet. Add expenses with more than one member to see balances.</p>
      ) : (
        <div className="space-y-2">
          {transactions.map((transaction, index) => (
            <div key={index} className="flex justify-between items-center p-2 border rounded">
              <span className="font-medium">{transaction.from}</span>
              <span>owes</span>
              <span className="font-medium">{transaction.to}</span>
              <span className="text-green-600">₹{transaction.amount.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BalanceView;