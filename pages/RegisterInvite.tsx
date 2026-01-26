import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Save, UserCheck, Building2, AlertCircle } from 'lucide-react';

const RegisterInvite = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  
  const [invite, setInvite] = useState<any>(null);
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
        setError('Token de convite inválido ou ausente.');
        setLoading(false);
        return;
    }
    fetchInvite();
  }, [token]);

  const fetchInvite = async () => {
      const { data, error } = await supabase
        .from('house_invites')
        .select('*, institutions(name)')
        .eq('token', token)
        .eq('used', false)
        .single();
      
      if (error || !data) {
          setError('Este convite é inválido, expirou ou já foi utilizado.');
      } else {
          setInvite(data);
          setFullName(data.full_name || '');
      }
      setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
      e.preventDefault();
      setRegisterError(null);
      if (password !== confirmPassword) {
          setRegisterError('As senhas não conferem.');
          return;
      }

      setLoading(true);
      
      try {
          // 1. Criar usuário no Auth (SignUp)
          // Nota: Se "Confirm Email" estiver ligado no Supabase, o usuário receberá um email.
          // Para fluxo 100% sem email, desative "Confirm Email" no painel do Supabase.
          const { data: authData, error: authError } = await supabase.auth.signUp({
              email: invite.email,
              password: password,
              options: {
                  data: {
                      full_name: fullName,
                      institution_id: invite.institution_id,
                      role: invite.role,
                      cpf: invite.cpf
                  }
              }
          });

          if (authError) throw authError;

          if (authData.user) {
              // 2. Criar perfil na tabela pública (Garantia extra além do trigger)
              const { error: profileError } = await supabase.from('profiles').upsert({
                  id: authData.user.id,
                  email: invite.email,
                  full_name: fullName,
                  institution_id: invite.institution_id,
                  role: invite.role,
                  cpf: invite.cpf
              });

              if (profileError) {
                  // Se der erro, apenas logamos, pois o Trigger do banco já deve ter criado o perfil corretamente.
                  console.warn("Aviso na criação de perfil (pode ter sido criado pelo Trigger):", profileError.message);
              }

              // 3. Marcar convite como usado para não ser usado novamente
              await supabase.from('house_invites').update({ used: true }).eq('id', invite.id);

              if (authData.session) {
                  alert('Cadastro realizado com sucesso! Você já pode acessar o sistema.');
                  navigate('/');
              } else {
                  alert('Cadastro realizado, mas o login foi bloqueado porque o e-mail requer confirmação.\n\nPARA ENTRAR DIRETO (SEM E-MAIL):\n1. Vá no Supabase Dashboard > Authentication > Providers > Email.\n2. DESATIVE a opção "Confirm Email".\n3. Salve e tente novamente.');
                  navigate('/login');
              }
          }
      } catch (err: any) {
          console.error("Erro no registro:", err);
          let msg = err.message || "Ocorreu um erro ao registrar.";
          if (msg.includes("Email signups are disabled")) {
              msg = "O registro está bloqueado. Habilite 'Enable Email Signup' no Supabase. Isso permite criar a conta sem enviar e-mail (desde que 'Confirm Email' esteja desligado).";
          } else if (msg.includes("Error sending confirmation email")) {
              msg = "O sistema tentou enviar um e-mail de confirmação e falhou. Para corrigir: Vá no Painel Supabase > Authentication > Providers > Email e DESATIVE a opção 'Confirm Email'.";
          }
          setRegisterError(msg);
      } finally {
          setLoading(false);
      }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">Carregando informações do convite...</div>;

  if (error) return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center border border-slate-200">
              <div className="text-red-500 mb-4 flex justify-center"><UserCheck size={48} /></div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Convite Inválido</h2>
              <p className="text-slate-600 mb-6">{error}</p>
              <button onClick={() => navigate('/login')} className="w-full py-2 px-4 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors">Ir para Login</button>
          </div>
      </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-100 w-full max-w-md">
        <div className="text-center mb-8">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4 text-[#458C57]">
                <Building2 size={24} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Bem-vindo(a)!</h2>
            <p className="text-slate-500 text-sm mt-2">
                Você foi convidado para participar da equipe da instituição <br/>
                <strong className="text-slate-800">{invite.institutions?.name}</strong>.
            </p>
        </div>
        
        <form onSubmit={handleRegister} className="space-y-4">
          {registerError && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 flex items-start rounded-r-lg">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{registerError}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Nome Completo</label>
            <input 
                type="text" 
                required 
                className="w-full border-slate-300 rounded-lg px-4 py-2 focus:ring-[#458C57] focus:border-[#458C57]"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">E-mail (Confirmado)</label>
            <input type="email" value={invite.email} disabled className="w-full bg-slate-100 border-slate-300 rounded-lg px-4 py-2 text-slate-500 cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Defina sua Senha de Acesso</label>
            <input 
              type="password" 
              required 
              minLength={6}
              className="w-full border-slate-300 rounded-lg px-4 py-2 focus:ring-[#458C57] focus:border-[#458C57]"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Confirme sua Senha</label>
            <input 
              type="password" 
              required 
              minLength={6}
              className="w-full border-slate-300 rounded-lg px-4 py-2 focus:ring-[#458C57] focus:border-[#458C57]"
              placeholder="Repita a senha"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#458C57] text-white py-3 rounded-lg font-bold hover:bg-[#367044] transition-all shadow-lg shadow-green-700/20 flex justify-center items-center mt-4"
          >
            {loading ? 'Registrando...' : <><Save size={20} className="mr-2"/> Concluir Cadastro</>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegisterInvite;
