import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, Info } from 'lucide-react';

interface LoginProps {
  onDemoLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onDemoLogin }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

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
      setError(err.message || 'Falha na autenticação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="bg-gov-700 p-4 rounded-2xl shadow-lg">
            <ShieldCheck className="w-12 h-12 text-white" />
          </div>
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
                  className="block w-full pl-10 sm:text-sm border-slate-300 rounded-lg py-2.5 text-slate-900 focus:ring-gov-600 focus:border-gov-600"
                  placeholder="admin@instituicao.org.br"
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
                  className="block w-full pl-10 sm:text-sm border-slate-300 rounded-lg py-2.5 text-slate-900 focus:ring-gov-600 focus:border-gov-600"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-md text-sm font-bold text-white bg-gov-700 hover:bg-gov-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gov-600 disabled:opacity-50 transition-all hover:scale-[1.01]"
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
              Sistema em conformidade com a LGPD.<br/>
              Acesso auditado e monitorado.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;