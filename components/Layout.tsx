import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  LogOut, 
  Home, 
  UserPlus, 
  ShieldCheck, 
  Building2,
  AlertTriangle,
  FileText,
  Menu
} from 'lucide-react';

interface LayoutProps {
  onLogout: () => void;
  isDemo?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ onLogout, isDemo }) => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Sidebar - Dark Theme */}
      <aside className="w-72 bg-slate-900 text-white hidden md:flex flex-col shadow-xl z-20">
        <div className="h-20 flex items-center px-6 border-b border-slate-800 bg-slate-950">
          <ShieldCheck className="w-8 h-8 text-gov-400 mr-3" />
          <div>
            <span className="font-bold text-lg tracking-tight block text-white">Curitiba Acolhe</span>
            <span className="text-xs text-slate-400 font-medium">Gestão Governamental</span>
          </div>
        </div>

        {isDemo && (
          <div className="mx-4 mt-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start">
            <AlertTriangle className="w-5 h-5 text-amber-400 mr-3 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-amber-200 font-bold">Modo Demonstração</p>
              <p className="text-xs text-amber-200/70 mt-1">Dados fictícios para visualização. Nenhuma informação real será salva.</p>
            </div>
          </div>
        )}

        <nav className="flex-1 px-4 py-8 space-y-2">
          <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Principal</p>
          
          <Link
            to="/"
            className={`flex items-center px-4 py-3.5 rounded-lg transition-all duration-200 group ${
              isActive('/') 
                ? 'bg-gov-600 text-white shadow-lg shadow-gov-900/20' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Home className={`w-5 h-5 mr-3 ${isActive('/') ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
            <span className="font-medium">Dashboard</span>
          </Link>

          <Link
            to="/novo-acolhimento"
            className={`flex items-center px-4 py-3.5 rounded-lg transition-all duration-200 group ${
              isActive('/novo-acolhimento') 
                ? 'bg-gov-600 text-white shadow-lg shadow-gov-900/20' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <UserPlus className={`w-5 h-5 mr-3 ${isActive('/novo-acolhimento') ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
            <span className="font-medium">Novo Acolhimento</span>
          </Link>

          <Link
            to="/relatorios"
            className={`flex items-center px-4 py-3.5 rounded-lg transition-all duration-200 group ${
              isActive('/relatorios') 
                ? 'bg-gov-600 text-white shadow-lg shadow-gov-900/20' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <FileText className={`w-5 h-5 mr-3 ${isActive('/relatorios') ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
            <span className="font-medium">Relatórios Técnicos</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-950">
          <div className="flex items-center mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-gov-400 border border-slate-700">
              <Building2 size={20} />
            </div>
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">Lar Esperança</p>
              <p className="text-xs text-slate-400 truncate">{isDemo ? 'Usuário Demo' : 'Acesso Seguro'}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-red-900/30 hover:text-red-400 rounded-md transition-colors border border-slate-700 hover:border-red-900/50"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Encerrar Sessão
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-100 h-full relative">
        {/* Mobile Header */}
        <header className="md:hidden h-16 bg-slate-900 text-white flex items-center justify-between px-4 shadow-md shrink-0">
          <div className="flex items-center">
            <ShieldCheck className="w-6 h-6 text-gov-400 mr-2" />
            <span className="font-bold">Curitiba Acolhe</span>
          </div>
          <button onClick={onLogout} className="text-slate-400 hover:text-white">
            <LogOut className="w-6 h-6" />
          </button>
        </header>

        {/* Top Bar Desktop */}
        <div className="hidden md:flex h-16 bg-white border-b border-slate-200 items-center justify-between px-8 shadow-sm shrink-0">
           <h2 className="text-xl font-bold text-slate-800">
             {isActive('/') && 'Visão Geral'}
             {isActive('/novo-acolhimento') && 'Cadastro de Admissão'}
             {isActive('/relatorios') && 'Gestão de Relatórios'}
           </h2>
           <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                v1.0.0-mvp
              </span>
           </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-auto p-4 md:p-8 relative">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;