import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { Users, Mail, Plus, Trash2, ShieldCheck, UserCheck, Link as LinkIcon, Copy, Check } from 'lucide-react';
import { Profile } from '../types';

interface TeamProps {
  isDemo?: boolean;
}

const Team: React.FC<TeamProps> = ({ isDemo }) => {
  const [team, setTeam] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [generatedLink, setGeneratedLink] = useState('');

  useEffect(() => {
    const init = async () => {
        if (isDemo) {
            setCurrentUser({ id: 'demo', institution_id: 'demo' });
            setTeam([
                { id: '1', full_name: 'Maria Silva (Você)', role: 'admin', institution_id: 'demo' },
                { id: '2', full_name: 'João Psicólogo', role: 'staff', institution_id: 'demo' },
                { id: '3', full_name: 'Ana Assistente', role: 'staff', institution_id: 'demo' }
            ]);
            setLoading(false);
        } else {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                setCurrentUser(profile);
                if (profile) {
                    fetchTeam(profile.institution_id);
                } else {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        }
    };
    init();
  }, [isDemo]);

  const fetchTeam = async (institutionId: string) => {
    const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('institution_id', institutionId);
    if (data) setTeam(data);
    setLoading(false);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setIsInviting(true);

    if (isDemo) {
        setTimeout(() => {
            const link = `http://localhost:5173/#/cadastro-convite?token=demo-token-${Math.random()}`;
            setGeneratedLink(link);
            setTeam([...team, { id: Math.random().toString(), full_name: inviteEmail.split('@')[0], role: 'staff', institution_id: 'demo' }]);
            setIsInviting(false);
        }, 800);
        return;
    }

    try {
        // 1. Criar registro na tabela de convites
        const { data, error } = await supabase.from('house_invites').insert([{
            institution_id: currentUser.institution_id,
            email: inviteEmail,
            full_name: 'Membro da Equipe', // Pode adicionar campo de nome se quiser
            role: 'staff'
        }]).select().single();

        if (error) throw error;

        // 2. Gerar Link
        const link = `${window.location.origin}/#/cadastro-convite?token=${data.token}`;
        setGeneratedLink(link);
        
    } catch (err: any) {
        alert("Erro: " + err.message);
    } finally {
        setIsInviting(false);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
      if (!confirm("Tem certeza que deseja remover este membro da equipe?")) return;

      if (isDemo) {
          setTeam(team.filter(m => m.id !== memberId));
          return;
      }

      const { error } = await supabase.from('profiles').delete().eq('id', memberId);
      if (error) {
          alert("Erro ao remover membro: " + error.message);
      } else {
          setTeam(team.filter(m => m.id !== memberId));
      }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center">
            <Users className="mr-3 text-[#458C57]" />
            Gerenciar Equipe
        </h1>
        <p className="text-slate-500">Adicione membros da equipe técnica para auxiliar na gestão dos acolhidos.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
        <div className="p-6 border-b border-slate-200 bg-slate-50">
            <h3 className="font-bold text-slate-800">Convidar Novo Membro</h3>
        </div>
        <div className="p-6">
            {!generatedLink ? (
            <form onSubmit={handleInvite} className="flex gap-4 items-end">
                <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1">E-mail do Colaborador</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Mail className="h-5 w-5 text-slate-400" />
                        </div>
                        <input 
                            type="email" 
                            required
                            className="block w-full pl-10 border-slate-300 rounded-lg focus:ring-[#458C57] focus:border-[#458C57]" 
                            placeholder="colaborador@instituicao.org"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                        />
                    </div>
                </div>
                <button 
                    type="submit" 
                    disabled={isInviting}
                    className="rounded-lg bg-[#458C57] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#367044] focus:outline-none focus:ring-2 focus:ring-[#458C57] focus:ring-offset-2 shadow-sm transition-all disabled:opacity-50 flex items-center"
                >
                    {isInviting ? 'Gerando...' : <><LinkIcon size={20} className="mr-2"/> Gerar Link</>}
                </button>
            </form>
            ) : (
                <div className="bg-green-50 border border-green-100 rounded-lg p-4 flex flex-col items-center text-center">
                    <div className="flex items-center text-green-800 font-bold mb-2">
                        <Check size={20} className="mr-2" /> Link de Convite Gerado!
                    </div>
                    <p className="text-sm text-green-700 mb-4">Envie este link para o colaborador se cadastrar:</p>
                    <div className="flex items-center gap-2 w-full max-w-lg bg-white p-2 rounded border border-green-200">
                        <input type="text" readOnly value={generatedLink} className="flex-1 bg-transparent border-none text-sm text-slate-600 focus:ring-0" />
                        <button onClick={() => navigator.clipboard.writeText(generatedLink)} className="text-[#458C57] font-bold text-sm hover:underline px-2">Copiar</button>
                    </div>
                    <button onClick={() => { setGeneratedLink(''); setInviteEmail(''); }} className="mt-4 text-sm text-slate-500 hover:text-slate-700 underline">Gerar outro convite</button>
                </div>
            )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-bold text-slate-800">Membros Ativos ({team.length})</h3>
        </div>
        <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Nome</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Função</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Ações</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
                {loading ? (
                    <tr><td colSpan={3} className="p-8 text-center text-slate-500">Carregando equipe...</td></tr>
                ) : team.map((member) => (
                    <tr key={member.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                                <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold mr-3">
                                    {member.full_name.charAt(0)}
                                </div>
                                <span className="text-sm font-medium text-slate-900">{member.full_name}</span>
                            </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            {member.role === 'admin' ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                                    <ShieldCheck size={12} className="mr-1" /> Presidente/Admin
                                </span>
                            ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                    <UserCheck size={12} className="mr-1" /> Equipe Técnica
                                </span>
                            )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                            {member.role !== 'admin' && (
                                <button onClick={() => handleDeleteMember(member.id)} className="text-red-400 hover:text-red-600 p-1 transition-colors" title="Remover acesso">
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
};

export default Team;
