import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { supabase, isConfigured } from './services/supabaseClient';
import { Session } from '@supabase/supabase-js';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import NewAdmission from './pages/NewAdmission';
import ChildRegistration from './pages/ChildRegistration';
import Reports from './pages/Reports';
import ChildProfile from './pages/ChildProfile';
import Community from './pages/Community';
import Schedule from './pages/Schedule';
import AdminHouses from './pages/AdminHouses';
import Team from './pages/team';
import HouseManagement from './pages/HouseManagement';
import RegisterInvite from './pages/RegisterInvite';
import Layout from './components/Layout';
import { AlertCircle } from 'lucide-react';
import logo from './assets/Logo PIA.png';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [isDemo, setIsDemo] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Configurar Favicon e Título
    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!link) {
      const newLink = document.createElement('link');
      newLink.rel = 'icon';
      newLink.href = logo;
      document.head.appendChild(newLink);
    } else {
      link.href = logo;
    }
    document.title = "Curitiba Acolhe";

    // Check for demo mode in local storage
    const demoActive = localStorage.getItem('demo_mode') === 'true';
    const adminActive = localStorage.getItem('admin_mode') === 'true';

    if (adminActive) {
      setIsAdmin(true);
    } else if (demoActive) {
      setIsDemo(true);
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

  const handleAdminLogin = () => {
    localStorage.setItem('admin_mode', 'true');
    setIsAdmin(true);
    setIsDemo(false);
  };

  const handleLogout = async () => {
    localStorage.removeItem('demo_mode');
    localStorage.removeItem('admin_mode');
    setIsDemo(false);
    setIsAdmin(false);

    if (isConfigured()) {
      await supabase.auth.signOut();
      setSession(null);
    }
  };

  if (!isConfigured() && !isDemo && !isAdmin) {
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#458C57]"></div>
      </div>
    );
  }

  const isAuthenticated = session || isDemo || isAdmin;

  return (
    <HashRouter>
      <Routes>
        <Route
          path="/login"
          element={!isAuthenticated ? <Login onDemoLogin={handleDemoLogin} onAdminLogin={handleAdminLogin} /> : <Navigate to={isAdmin && localStorage.getItem('admin_role') !== 'house_admin' ? "/admin/casas" : "/"} replace />}
        />

        {/* Rota Pública de Aceite de Convite */}
        <Route path="/cadastro-convite" element={<RegisterInvite />} />

        {/* Protected Routes with Layout */}
        <Route element={isAuthenticated ? (
          <Layout onLogout={handleLogout} isDemo={isDemo} isAdmin={isAdmin} />
        ) : <Navigate to="/login" replace />}>
          {isAdmin ? (
            <>
              <Route path="/admin/casas" element={localStorage.getItem('admin_role') !== 'house_admin' ? <AdminHouses isDemo={isDemo} /> : <Navigate to="/" />} />
              <Route path="/" element={<Dashboard isDemo={isDemo} />} />
              <Route path="/novo-acolhimento" element={<NewAdmission isDemo={isDemo} />} />
              <Route path="/cadastro-crianca" element={<ChildRegistration isDemo={isDemo} />} />
              <Route path="/acolhido/:id" element={<ChildProfile isDemo={isDemo} />} />
              <Route path="/relatorios" element={<Reports isDemo={isDemo} />} />
              <Route path="/agenda" element={<Schedule isDemo={isDemo} />} />
              <Route path="/comunidade" element={<Community isDemo={isDemo} />} />
              <Route path="/equipe" element={<Team isDemo={isDemo} />} />
              <Route path="/gestao-casa" element={<HouseManagement />} />
            </>
          ) : (
            <>
              <Route path="/" element={<Dashboard isDemo={isDemo} />} />
              <Route path="/novo-acolhimento" element={<NewAdmission isDemo={isDemo} />} />
              <Route path="/cadastro-crianca" element={<ChildRegistration isDemo={isDemo} />} />
              <Route path="/acolhido/:id" element={<ChildProfile isDemo={isDemo} />} />
              <Route path="/relatorios" element={<Reports isDemo={isDemo} />} />
              <Route path="/agenda" element={<Schedule isDemo={isDemo} />} />
              <Route path="/comunidade" element={<Community isDemo={isDemo} />} />
              <Route path="/equipe" element={<Team isDemo={isDemo} />} />
              <Route path="/gestao-casa" element={<HouseManagement />} />
            </>
          )}
          {/* Redirecionamento padrão para admin se tentar acessar rota inválida */}
          {isAdmin && <Route path="*" element={<Navigate to="/admin/casas" replace />} />}
        </Route>

        {/* Rota global para capturar qualquer caminho não correspondido (ex: após logout de rota admin) */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
