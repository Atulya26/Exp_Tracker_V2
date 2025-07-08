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

  const calculateTransactions = useCallback((expenses: Expense[]) => {
    const balances: { [key: string]: number } = {};
    groupMembers.forEach(member => { balances[member] = 0; });

    expenses.forEach(expense => {
      if (expense.splitType === 'settlement') {
        balances[expense.paidBy] += expense.amount;
        balances[expense.members[0]] -= expense.amount;
      } else {
        if (expense.members.length === 0) return;
        const amountPerPerson = expense.amount / expense.members.length;
        balances[expense.paidBy] += expense.amount;
        expense.members.forEach(member => {
          balances[member] -= amountPerPerson;
        });
      }
    });

    const debtors = Object.entries(balances).filter(([, balance]) => balance < 0).map(([person, balance]) => ({ person, amount: -balance }));
    const creditors = Object.entries(balances).filter(([, balance]) => balance > 0).map(([person, balance]) => ({ person, amount: balance }));

    const newTransactions: Transaction[] = [];

    debtors.forEach(debtor => {
      let debt = debtor.amount;
      creditors.forEach(creditor => {
        if (debt > 0 && creditor.amount > 0) {
          const amountToPay = Math.min(debt, creditor.amount);
          newTransactions.push({ from: debtor.person, to: creditor.person, amount: amountToPay });
          debt -= amountToPay;
          creditor.amount -= amountToPay;
        }
      });
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

  const settleTransaction = async (from: string, to: string, amount: number) => {
    if (!groupId) return;

    await addDoc(collection(db, 'groups', groupId, 'expenses'), {
      description: `Settlement: ${from} to ${to}`,
      amount: amount,
      paidBy: from,
      members: [to],
      splitType: 'settlement',
      createdAt: serverTimestamp(),
    });
  };

  const handleSettleAll = async () => {
    if (!groupId) return;

    if (!window.confirm("Are you sure you want to settle all expenses? This will clear all current expenses and generate a summary report.")) {
      return;
    }

    try {
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
          members: data.members,
          splitType: data.splitType,
          createdAt: data.createdAt.toDate(),
        });
      });

      // 2. Calculate current balances (re-using existing logic)
      const balances: { [key: string]: number } = {};
      groupMembers.forEach(member => { balances[member] = 0; });

      expensesData.forEach(expense => {
        if (expense.splitType === 'settlement') {
          balances[expense.paidBy] += expense.amount;
          balances[expense.members[0]] -= expense.amount;
        } else {
          if (expense.members.length === 0) return;
          const amountPerPerson = expense.amount / expense.members.length;
          balances[expense.paidBy] += expense.amount;
          expense.members.forEach(member => {
            balances[member] -= amountPerPerson;
          });
        }
      });

      const debtors = Object.entries(balances).filter(([, balance]) => balance < 0).map(([person, balance]) => ({ person, amount: -balance }));
      const creditors = Object.entries(balances).filter(([, balance]) => balance > 0).map(([person, balance]) => ({ person, amount: balance }));

      const finalTransactions: Transaction[] = [];

      debtors.forEach(debtor => {
        let debt = debtor.amount;
        creditors.forEach(creditor => {
          if (debt > 0 && creditor.amount > 0) {
            const amountToPay = Math.min(debt, creditor.amount);
            finalTransactions.push({ from: debtor.person, to: creditor.person, amount: amountToPay });
            debt -= amountToPay;
            creditor.amount -= amountToPay;
          }
        });
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
      alert("All expenses settled and report downloaded!");

    } catch (error) {
      console.error("Error settling all expenses: ", error);
      alert("Failed to settle all expenses. Please try again.");
    }
  };

  return (
    <div className="p-4 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Balances</h2>
      <button
        onClick={handleSettleAll}
        className="mb-4 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
      >
        Settle All & Download Report
      </button>
      {transactions.length === 0 ? (
        <p>No balances to display yet.</p>
      ) : (
        <div className="space-y-2">
          {transactions.map((transaction, index) => (
            <div key={index} className="flex justify-between items-center p-2 border rounded">
              <span className="font-medium">{transaction.from}</span>
              <span>owes</span>
              <span className="font-medium">{transaction.to}</span>
              <span className="text-green-600">₹{transaction.amount.toFixed(2)}</span>
              <button
                onClick={() => settleTransaction(transaction.from, transaction.to, transaction.amount)}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded"
              >
                Settle
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BalanceView;