import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase, isConfigured } from './services/supabaseClient';
import { Session } from '@supabase/supabase-js';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import NewAdmission from './pages/NewAdmission';
import Reports from './pages/Reports';
import ChildProfile from './pages/ChildProfile';
import Layout from './components/Layout';
import { AlertCircle } from 'lucide-react';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [isDemo, setIsDemo] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for demo mode in local storage
    const demoActive = localStorage.getItem('demo_mode') === 'true';
    if (demoActive) {
      setIsDemo(true);
      setLoading(false);
      return;
    }

    if (!isConfigured()) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleDemoLogin = () => {
    localStorage.setItem('demo_mode', 'true');
    setIsDemo(true);
  };

  const handleLogout = async () => {
    if (isDemo) {
      localStorage.removeItem('demo_mode');
      setIsDemo(false);
    } else {
      await supabase.auth.signOut();
    }
  };

  if (!isConfigured() && !isDemo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 border-l-4 border-red-600">
          <div className="flex items-center mb-4 text-red-600">
            <AlertCircle className="w-8 h-8 mr-2" />
            <h1 className="text-xl font-bold">Configuração Necessária</h1>
          </div>
          <p className="text-gray-600 mb-4">
            Para executar este MVP conectado ao banco, configure as variáveis de ambiente.
          </p>
          <div className="mt-6 flex justify-center">
            <button 
              onClick={handleDemoLogin}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md text-sm font-medium"
            >
              Entrar em Modo Demonstração (Sem Banco)
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gov-700"></div>
      </div>
    );
  }

  const isAuthenticated = session || isDemo;

  return (
    <HashRouter>
      <Routes>
        <Route 
          path="/login" 
          element={!isAuthenticated ? <Login onDemoLogin={handleDemoLogin} /> : <Navigate to="/" replace />} 
        />
        
        {/* Protected Routes */}
        <Route element={isAuthenticated ? <Layout onLogout={handleLogout} isDemo={isDemo} /> : <Navigate to="/login" replace />}>
          <Route path="/" element={<Dashboard isDemo={isDemo} />} />
          <Route path="/novo-acolhimento" element={<NewAdmission isDemo={isDemo} />} />
          <Route path="/acolhido/:id" element={<ChildProfile isDemo={isDemo} />} />
          <Route path="/relatorios" element={<Reports isDemo={isDemo} />} />
        </Route>
      </Routes>
    </HashRouter>
  );
};

export default App;