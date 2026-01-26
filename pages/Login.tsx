import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Info } from 'lucide-react';
import logo from '../assets/Logo PIA.png';

interface LoginProps {
  onDemoLogin: () => void;
  onAdminLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onDemoLogin, onAdminLogin }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Master Admin Bypass
    if (email === 'admin' && password === 'admin') {
      setTimeout(() => {
        localStorage.removeItem('admin_role');
        onAdminLogin();
        setLoading(false);
        navigate('/admin/casas');
      }, 800);
      return;
    }

    // House Admin Bypass (admin@admin.com)
    if (email === 'admin@admin.com' && password === 'admin') {
      // Fetch a default institution
      try {
        const { data, error } = await supabase.from('institutions').select('id, name').limit(1).single();

        if (!data) {
          setError("Nenhuma instituição encontrada para login administrativo.");
          setLoading(false);
          return;
        }

        setTimeout(() => {
          localStorage.setItem('admin_viewing_institution_id', data.id);
          localStorage.setItem('admin_viewing_institution_name', data.name);
          localStorage.setItem('admin_role', 'house_admin');

          onAdminLogin();
          setLoading(false);
          navigate('/');
        }, 800);
        return;
      } catch (err) {
        setError("Erro ao buscar instituição base.");
        setLoading(false);
        return;
      }
    }

    // Bypass for testing/demo request
    if (!email || !password || email === 'demo' || email.includes('teste')) {
      setTimeout(() => {
        onDemoLogin();
        setLoading(false);
        navigate('/');
      }, 800);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      navigate('/');
    } catch (err: any) {
      let msg = err.message || 'Falha na autenticação';
      if (msg.includes("Email not confirmed")) {
        msg = "E-mail não confirmado. Peça ao administrador para desativar a opção 'Confirm Email' no Supabase para liberar seu acesso.";
      } else if (msg.includes("Invalid login credentials")) {
        msg = "E-mail ou senha incorretos.";
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <img src={logo} alt="Logo PIA" className="h-24 w-auto object-contain" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          Curitiba Acolhe
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Acesso restrito para Instituições de Acolhimento
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-xl sm:px-10 border border-slate-200">
          <div className="mb-6 bg-blue-50 border border-blue-100 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <Info className="h-5 w-5 text-blue-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-800 font-medium">
                  Modo de Demonstração
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  Clique em <strong>"Acessar Painel"</strong> sem preencher dados para visualizar o MVP com dados fictícios.
                </p>
              </div>
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-bold text-slate-700">
                E-mail Institucional
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="text"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 sm:text-sm border-slate-300 rounded-lg py-2.5 text-slate-900 focus:ring-[#458C57] focus:border-[#458C57]"
                  placeholder="admin (ou e-mail institucional)"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-bold text-slate-700">
                Senha
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 sm:text-sm border-slate-300 rounded-lg py-2.5 text-slate-900 focus:ring-[#458C57] focus:border-[#458C57]"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-md text-sm font-bold text-white bg-[#458C57] hover:bg-[#367044] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#458C57] disabled:opacity-50 transition-all hover:scale-[1.01]"
              >
                {loading ? 'Entrando...' : 'Acessar Painel'}
              </button>
            </div>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-400 font-medium">
                  Suporte Técnico
                </span>
              </div>
            </div>
            <div className="mt-6 text-center text-xs text-slate-400">
              Sistema em conformidade com a LGPD.<br />
              Acesso auditado e monitorado.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;