import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Link, Navigate } from 'react-router-dom';
import Home from './components/Home';
import GroupDashboard from './components/GroupDashboard';
import GroupSetup from './components/GroupSetup';

const PASSCODE = '6969';

function App() {
  const [authenticated, setAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('passcode-auth') === PASSCODE;
  });
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authenticated) {
      localStorage.setItem('passcode-auth', PASSCODE);
    } else {
      localStorage.removeItem('passcode-auth');
    }
  }, [authenticated]);

  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === PASSCODE) {
      setAuthenticated(true);
      setError(null);
    } else {
      setError('Incorrect passcode.');
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <form onSubmit={handlePasscodeSubmit} className="bg-white p-8 rounded shadow-md w-80">
          <h2 className="text-2xl font-bold mb-4 text-center">Enter Passcode</h2>
          <input
            type="password"
            value={passcode}
            onChange={e => setPasscode(e.target.value)}
            className="w-full border border-gray-300 rounded p-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Passcode"
            autoFocus
          />
          {error && <div className="mb-2 text-red-600 text-center">{error}</div>}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 font-semibold"
          >
            Unlock
          </button>
        </form>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-white shadow-md p-4">
          <div className="container mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link to="/" className="text-blue-600 hover:text-blue-800 font-semibold">Expense Splitter</Link>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => { setAuthenticated(false); setPasscode(''); }}
                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
              >
                Lock
              </button>
            </div>
          </div>
        </nav>

        <main className="container mx-auto p-4">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/group-setup" element={<GroupSetup />} />
            <Route path="/group/:groupId/*" element={<GroupDashboard />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
