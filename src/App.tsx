import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { Sidebar, Header } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { ProjectDetails } from './pages/ProjectDetails';
import { TestRunExecution } from './pages/TestRunExecution';
import { Analytics } from './pages/Analytics';
import { signInWithGoogle } from './lib/firebase';
import { LogIn } from 'lucide-react';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
};

const Login: React.FC = () => {
  return (
    <div className="h-screen flex items-center justify-center bg-slate-50 technical-grid">
      <div className="bg-white p-12 rounded-2xl shadow-xl border border-slate-200 max-w-md w-full text-center space-y-8">
        <div className="space-y-2">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white text-3xl font-bold mx-auto shadow-lg shadow-primary/20">Q</div>
          <h1 className="text-3xl font-bold text-slate-900">QaseClone</h1>
          <p className="text-slate-500">Modern Test Management Platform</p>
        </div>
        
        <button 
          onClick={() => signInWithGoogle()}
          className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 py-3 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
        >
          <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
          Sign in with Google
        </button>

        <div className="pt-4 text-xs text-slate-400">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </div>
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { user } = useAuth();

  return (
    <Router>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        <Route path="/*" element={
          <ProtectedRoute>
            <div className="flex min-h-screen bg-slate-50">
              <Sidebar />
              <main className="flex-1 flex flex-col min-w-0">
                <Header title="QaseClone" />
                <div className="flex-1 overflow-y-auto">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/projects" element={<Dashboard />} />
                    <Route path="/projects/:projectId" element={<ProjectDetails />} />
                    <Route path="/projects/:projectId/runs/:runId" element={<TestRunExecution />} />
                    <Route path="/analytics" element={<Analytics />} />
                    {/* Add more routes as needed */}
                  </Routes>
                </div>
              </main>
            </div>
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
