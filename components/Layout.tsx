import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import {
  LogOut,
  Home,
  UserPlus,
  Building2,
  AlertTriangle,
  FileText,
  Menu,
  MessageCircle,
  Calendar
} from 'lucide-react';
import logo from '../assets/Logo PIA.png';

interface LayoutProps {
  onLogout: () => void;
  isDemo?: boolean;
  isAdmin?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ onLogout, isDemo, isAdmin }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = (path: string) => location.pathname === path;

  const [institutionName, setInstitutionName] = useState('');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const fetchIdentity = async () => {
      if (isAdmin) return;

      if (isDemo) {
        setInstitutionName('Lar Esperança');
        setUserName('Usuário Demo');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, institutions(name)')
          .eq('id', user.id)
          .single();

        if (profile) {
          setUserName(profile.full_name || 'Usuário');
          // @ts-ignore
          setInstitutionName(profile.institutions?.name || 'Instituição');
        }
      }
    };

    fetchIdentity();
  }, [isAdmin, isDemo]);

  const viewingInstitutionId = localStorage.getItem('admin_viewing_institution_id');
  const viewingInstitutionName = localStorage.getItem('admin_viewing_institution_name');
  const adminRole = localStorage.getItem('admin_role');

  const handleExitView = () => {
    localStorage.removeItem('admin_viewing_institution_id');
    localStorage.removeItem('admin_viewing_institution_name');
    navigate('/admin/casas');
  };

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Sidebar - Dark Theme */}
      <aside className="w-72 bg-[#404040] text-white hidden md:flex flex-col shadow-xl z-20">
        <div className="h-20 flex items-center px-6 border-b border-[#A4A5A6]/20 bg-[#404040]">
          <img src={logo} alt="Logo PIA" className="h-12 w-auto mr-3 object-contain" />
          <div>
            <span className="font-bold text-lg tracking-tight block text-white">Curitiba Acolhe</span>
            <span className="text-xs text-[#A4A5A6] font-medium">Gestão Governamental</span>
          </div>
        </div>

        {isDemo && !isAdmin && (
          <div className="mx-4 mt-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start">
            <AlertTriangle className="w-5 h-5 text-amber-400 mr-3 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-amber-200 font-bold">Modo Demonstração</p>
              <p className="text-xs text-amber-200/70 mt-1">Dados fictícios para visualização. Nenhuma informação real será salva.</p>
            </div>
          </div>
        )}

        {isAdmin && !viewingInstitutionId && (
          <div className="mx-4 mt-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg flex items-start">
            <Building2 className="w-5 h-5 text-purple-400 mr-3 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-purple-200 font-bold">Administrador</p>
              <p className="text-xs text-purple-200/70 mt-1">Acesso total à gestão de casas.</p>
            </div>
          </div>
        )}

        {isAdmin && viewingInstitutionId && adminRole !== 'house_admin' && (
          <div className="mx-4 mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-xs text-blue-200 font-bold uppercase mb-1">Visualizando</p>
            <p className="text-sm text-white font-medium truncate">{viewingInstitutionName}</p>
            <button onClick={handleExitView} className="mt-2 text-xs text-blue-300 hover:text-white underline">
              Sair da visualização
            </button>
          </div>
        )}

        <nav className="flex-1 px-4 py-8 space-y-2">
          <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Principal</p>

          {isAdmin && !viewingInstitutionId ? (
            <Link
              to="/admin/casas"
              className={`flex items-center px-4 py-3.5 rounded-lg transition-all duration-200 group ${isActive('/admin/casas')
                  ? 'bg-[#458C57] text-white shadow-lg shadow-[#404040]/20'
                  : 'text-[#A4A5A6] hover:bg-[#A4A5A6]/10 hover:text-white'
                }`}
            >
              <Building2 className={`w-5 h-5 mr-3 ${isActive('/admin/casas') ? 'text-white' : 'text-[#A4A5A6] group-hover:text-white'}`} />
              <span className="font-medium">Gestão de Casas</span>
            </Link>
          ) : (
            <>
              <Link
                to="/"
                className={`flex items-center px-4 py-3.5 rounded-lg transition-all duration-200 group ${isActive('/')
                    ? 'bg-[#458C57] text-white shadow-lg shadow-[#404040]/20'
                    : 'text-[#A4A5A6] hover:bg-[#A4A5A6]/10 hover:text-white'
                  }`}
              >
                <Home className={`w-5 h-5 mr-3 ${isActive('/') ? 'text-white' : 'text-[#A4A5A6] group-hover:text-white'}`} />
                <span className="font-medium">Dashboard</span>
              </Link>

              {!viewingInstitutionId && (
                <Link
                  to="/cadastro-crianca"
                  className={`flex items-center px-4 py-3.5 rounded-lg transition-all duration-200 group ${isActive('/cadastro-crianca')
                      ? 'bg-[#458C57] text-white shadow-lg shadow-[#404040]/20'
                      : 'text-[#A4A5A6] hover:bg-[#A4A5A6]/10 hover:text-white'
                    }`}
                >
                  <UserPlus className={`w-5 h-5 mr-3 ${isActive('/cadastro-crianca') ? 'text-white' : 'text-[#A4A5A6] group-hover:text-white'}`} />
                  <span className="font-medium">Cadastro Criança</span>
                </Link>
              )}

              {!viewingInstitutionId && <Link
                to="/novo-acolhimento"
                className={`flex items-center px-4 py-3.5 rounded-lg transition-all duration-200 group ${isActive('/novo-acolhimento')
                    ? 'bg-[#458C57] text-white shadow-lg shadow-[#404040]/20'
                    : 'text-[#A4A5A6] hover:bg-[#A4A5A6]/10 hover:text-white'
                  }`}
              >
                <FileText className={`w-5 h-5 mr-3 ${isActive('/novo-acolhimento') ? 'text-white' : 'text-[#A4A5A6] group-hover:text-white'}`} />
                <span className="font-medium">Novo Relatório PIA</span>
              </Link>}

              <Link
                to="/relatorios"
                className={`flex items-center px-4 py-3.5 rounded-lg transition-all duration-200 group ${isActive('/relatorios')
                    ? 'bg-[#458C57] text-white shadow-lg shadow-[#404040]/20'
                    : 'text-[#A4A5A6] hover:bg-[#A4A5A6]/10 hover:text-white'
                  }`}
              >
                <FileText className={`w-5 h-5 mr-3 ${isActive('/relatorios') ? 'text-white' : 'text-[#A4A5A6] group-hover:text-white'}`} />
                <span className="font-medium">Relatórios Técnicos</span>
              </Link>

              <Link
                to="/agenda"
                className={`flex items-center px-4 py-3.5 rounded-lg transition-all duration-200 group ${isActive('/agenda')
                    ? 'bg-[#458C57] text-white shadow-lg shadow-[#404040]/20'
                    : 'text-[#A4A5A6] hover:bg-[#A4A5A6]/10 hover:text-white'
                  }`}
              >
                <Calendar className={`w-5 h-5 mr-3 ${isActive('/agenda') ? 'text-white' : 'text-[#A4A5A6] group-hover:text-white'}`} />
                <span className="font-medium">Agenda</span>
              </Link>

              <Link
                to="/comunidade"
                className={`flex items-center px-4 py-3.5 rounded-lg transition-all duration-200 group ${isActive('/comunidade')
                    ? 'bg-[#458C57] text-white shadow-lg shadow-[#404040]/20'
                    : 'text-[#A4A5A6] hover:bg-[#A4A5A6]/10 hover:text-white'
                  }`}
              >
                <MessageCircle className={`w-5 h-5 mr-3 ${isActive('/comunidade') ? 'text-white' : 'text-[#A4A5A6] group-hover:text-white'}`} />
                <span className="font-medium">Comunidade</span>
              </Link>

            </>
          )}
        </nav>

        <div className="p-4 border-t border-[#A4A5A6]/20 bg-[#404040]">
          <div className="flex items-center mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-[#A4A5A6]/10 flex items-center justify-center text-[#88F2A2] border border-[#A4A5A6]/20">
              <Building2 size={20} />
            </div>
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">{isAdmin && adminRole !== 'house_admin' ? 'Administrador' : (institutionName || viewingInstitutionName || 'Carregando...')}</p>
              <p className="text-xs text-[#A4A5A6] truncate">{isAdmin && adminRole !== 'house_admin' ? 'Gestão Central' : (isDemo ? 'Usuário Demo' : (userName || 'Administrador da Casa'))}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-[#A4A5A6] bg-[#A4A5A6]/10 hover:bg-red-900/30 hover:text-red-400 rounded-md transition-colors border border-[#A4A5A6]/20 hover:border-red-900/50"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Encerrar Sessão
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-100 h-full relative">
        {/* Mobile Header */}
        <header className="md:hidden h-16 bg-[#404040] text-white flex items-center justify-between px-4 shadow-md shrink-0">
          <div className="flex items-center">
            <img src={logo} alt="Logo PIA" className="h-8 w-auto mr-2 object-contain" />
            <span className="font-bold">Curitiba Acolhe</span>
          </div>
          <button onClick={onLogout} className="text-[#A4A5A6] hover:text-white">
            <LogOut className="w-6 h-6" />
          </button>
        </header>

        {/* Top Bar Desktop */}
        <div className="hidden md:flex h-16 bg-white border-b border-slate-200 items-center justify-between px-8 shadow-sm shrink-0">
          <h2 className="text-xl font-bold text-slate-800">
            {isActive('/') && 'Visão Geral'}
            {isActive('/novo-acolhimento') && 'Cadastro de Admissão'}
            {isActive('/cadastro-crianca') && 'Cadastro de Criança/Adolescente'}
            {isActive('/relatorios') && 'Gestão de Relatórios'}
            {isActive('/agenda') && 'Agenda de Compromissos'}
            {isActive('/comunidade') && 'Comunidade Inter-Lares'}
          </h2>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
              v1.0.0-mvp
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-auto p-4 md:p-8 relative flex flex-col">
          <div className="flex-1">
            <Outlet />
          </div>

          <div className="mt-12 pt-6 border-t border-slate-200/60 text-right opacity-80">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Desenvolvido por P-SEP-AR - GESTÃO 2025/2026</p>
            <p className="text-[10px] text-slate-400 mb-2">Assessoria de Recursos aos Tribunais Superiores (STF e STJ) da Secretaria Especial da Presidência</p>
            <div className="text-[10px] text-slate-400 flex flex-col items-end gap-0.5">
              <span>Elvertoni Martelli Coimbra</span>
              <span className="font-black text-slate-700 text-xs">Luís Gustavo Arruda Lançoni</span>
              <span>Narley Almeida de Sousa</span>
              <span>Rodrigo Louzano</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;