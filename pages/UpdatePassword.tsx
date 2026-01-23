import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Lock, Save, LogOut } from 'lucide-react';

const UpdatePassword = () => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Verifica se o usuário chegou aqui autenticado (pelo link do email)
  useEffect(() => {
    const checkSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            navigate('/login');
        }
    };
    checkSession();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
        // 1. Atualiza a senha do usuário (Auth)
        const { error: passError } = await supabase.auth.updateUser({ password });
        if (passError) throw passError;

        // 2. Correção de Vínculo: Garante que o perfil exista e esteja na casa correta
        // Recuperamos os metadados que foram enviados no convite (AdminHouses.tsx)
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user && user.user_metadata && user.user_metadata.institution_id) {
            const { institution_id, role, full_name, cpf } = user.user_metadata;
            
            // Força a criação/atualização do perfil na tabela pública
            const { error: profileError } = await supabase.from('profiles').upsert({
                id: user.id,
                institution_id: institution_id,
                role: role || 'staff',
                full_name: full_name || 'Convidado',
                email: user.email,
                cpf: cpf || null
            }, { onConflict: 'id' });

            if (profileError) {
                console.error("Erro ao vincular perfil à casa:", profileError);
            }
        }

        alert('Senha cadastrada com sucesso! Acesso liberado.');
        // Força um reload para garantir que o App.tsx reconheça o novo perfil criado
        window.location.href = '/'; 

    } catch (error: any) {
        alert('Erro ao atualizar senha: ' + error.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-100 w-full max-w-md">
        <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center">
          <Lock className="mr-2 text-[#458C57]" />
          Definir Senha de Acesso
        </h2>
        <p className="text-slate-600 mb-6 text-sm">
            Para garantir seu acesso futuro sem depender do link por e-mail, defina uma senha segura agora.
        </p>
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Nova Senha</label>
            <input 
              type="password" 
              required 
              minLength={6}
              className="block w-full rounded-lg border-slate-300 bg-slate-50 px-4 py-2.5 text-sm focus:border-[#458C57] focus:ring-[#458C57] focus:ring-1 focus:outline-none transition-all"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full rounded-lg bg-[#458C57] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#367044] focus:outline-none focus:ring-2 focus:ring-[#458C57] focus:ring-offset-2 shadow-sm transition-all disabled:opacity-50 flex justify-center items-center"
          >
            {loading ? 'Salvando...' : <><Save size={20} className="mr-2"/> Salvar e Acessar</>}
          </button>
        </form>
        
        <div className="mt-6 text-center border-t border-slate-100 pt-4">
            <button 
                type="button"
                onClick={handleLogout}
                className="text-sm text-slate-500 hover:text-slate-700 flex items-center justify-center w-full"
            >
                <LogOut size={16} className="mr-1" /> Sair / Cancelar
            </button>
        </div>
      </div>
    </div>
  );
};

export default UpdatePassword;
