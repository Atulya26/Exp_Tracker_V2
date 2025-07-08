import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import Home from './components/Home';
import GroupDashboard from './components/GroupDashboard';
import GroupSetup from './components/GroupSetup';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-white shadow-md p-4">
          <ul className="flex justify-around">
            <li>
              <Link to="/" className="text-blue-600 hover:text-blue-800">Home</Link>
            </li>
          </ul>
        </nav>

        <main className="container mx-auto p-4">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/group-setup" element={<GroupSetup />} />
            <Route path="/group/:groupId/*" element={<GroupDashboard />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
