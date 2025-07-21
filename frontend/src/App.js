import './App.css';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import TaskApp from './components/TaskApp';
import AuthWrapper from './components/AuthWrapper';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'phosphor-react';

function AppContent() {
  const { user, logout } = useAuth();
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [dark]);

  if (!user) {
    return <AuthWrapper />;
  }

  return (
    <div className="App bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="bg-gray-800 dark:bg-gray-950 text-white p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Monstager (Task Manager)</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setDark(d => !d)}
              className="bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none"
              aria-label="Toggle dark mode"
            >
              {dark ? <Sun size={20} weight="fill" /> : <Moon size={20} weight="fill" />}
            </button>
            <span className="text-gray-300">Welcome, {user.username}!</span>
            <button
              onClick={logout}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
      <TaskApp />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          {/* Add other routes here as needed */}
          <Route path="/*" element={<AppContent />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
