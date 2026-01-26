import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Trash2, X, User, Eye, Mail, Shield, Send, Users, Link as LinkIcon, Copy, LogIn, Check } from 'lucide-react';

interface AdminHousesProps {
  isDemo?: boolean;
}

interface Institution {
  id: string;
  name: string;
  email: string;
  phone: string;
  manager: string;
  active: boolean;
  cnpj?: string;
}

const AdminHouses: React.FC<AdminHousesProps> = ({ isDemo }) => {
  const navigate = useNavigate();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', manager: '', cnpj: '' });
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [institutionChildren, setInstitutionChildren] = useState<any[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(false);
  const [institutionUsers, setInstitutionUsers] = useState<any[]>([]);
  
  // Access Management State
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteCpf, setInviteCpf] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');

  useEffect(() => {
    fetchInstitutions();
  }, [isDemo]);

  const fetchInstitutions = async () => {
    setLoading(true);
    // Removido bloco de demonstração para buscar sempre do banco
    const { data, error } = await supabase.from('institutions').select('*').order('name');
    if (error) {
        console.error("Erro ao buscar instituições:", error);
    }
    if (!error && data) setInstitutions(data);
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    // Removido bloco de demonstração para salvar sempre no banco
    const { error } = await supabase.from('institutions').insert([{ ...formData, active: true }]);
    if (!error) {
      fetchInstitutions();
      setShowModal(false);
      setFormData({ name: '', email: '', phone: '', manager: '', cnpj: '' });
      alert("Instituição cadastrada! Clique no ícone de escudo (Gerenciar Acesso) na lista para convidar o administrador.");
    } else {
      console.error("Erro ao salvar:", error);
      alert('Erro ao salvar: ' + (error.message || JSON.stringify(error)));
    }
  };

  const handleOpenAccess = (inst: Institution) => {
    setSelectedInstitution(inst);
    setShowAccessModal(true);
    setInviteEmail('');
    setInviteName('');
    setInviteCpf('');
    setGeneratedLink('');
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !selectedInstitution) return;
    setIsInviting(true);

    try {
        // 1. Criar registro na tabela de convites
        const { data, error } = await supabase.from('house_invites').insert([{
            institution_id: selectedInstitution.id,
            email: inviteEmail,
            full_name: inviteName,
            cpf: inviteCpf,
            role: 'admin' // Master convida Admin
        }]).select().single();

        if (error) throw error;

        // 2. Gerar Link
        const link = `${window.location.origin}/#/cadastro-convite?token=${data.token}`;
        setGeneratedLink(link);

        // NOTA SOBRE SMTP:
        // Para envio automático (sem mailto), configure o SMTP no Painel do Supabase e use uma Edge Function:
        // 1. Settings -> Auth -> SMTP Settings (no Dashboard Supabase)
        // 2. Crie uma Edge Function 'send-invite' que use essas credenciais.
        // 3. Chame aqui: await supabase.functions.invoke('send-invite', { body: { email: inviteEmail, link } });
        
    } catch (err: any) {
        console.error("Erro ao enviar convite:", err);       
        alert("Erro ao gerar convite: " + err.message);
    } finally {
        setIsInviting(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Tem certeza que deseja remover este usuário? Ele perderá o acesso ao sistema.')) return;

    if (isDemo) {
        setInstitutionUsers(institutionUsers.filter(u => u.id !== userId));
        return;
    }

    try {
        // Limpar dados vinculados ao usuário antes de excluir
        // 1. Buscar posts do usuário para apagar comentários neles (evitar erro de FK em comments)
        const { data: userPosts } = await supabase.from('community_posts').select('id').eq('author_id', userId);
        if (userPosts && userPosts.length > 0) {
            const postIds = userPosts.map(p => p.id);
            await supabase.from('community_comments').delete().in('post_id', postIds);
        }

        // 2. Apagar comentários feitos pelo usuário e posts do usuário
        await supabase.from('community_comments').delete().eq('author_id', userId);
        const { error: postsError } = await supabase.from('community_posts').delete().eq('author_id', userId);
        if (postsError) throw postsError;

        // 3. Excluir Perfil e verificar se apagou
        const { error, data } = await supabase.from('profiles').delete().eq('id', userId).select();
        if (error) throw error;

        if (!data || data.length === 0) {
             alert("ERRO: O usuário não foi excluído.\n\nProvável causa: Bloqueio de segurança (RLS) no banco de dados.\n\nSOLUÇÃO: Vá no Supabase > SQL Editor e execute:\nALTER TABLE profiles DISABLE ROW LEVEL SECURITY;");
             return;
        }

        setInstitutionUsers(institutionUsers.filter(u => u.id !== userId));
    } catch (error: any) {
        console.error("Erro ao remover usuário:", error);
        if (error.message?.includes('community_posts_author_id_fkey')) {
            alert("ERRO DE PERMISSÃO (Foreign Key):\n\nO sistema não conseguiu apagar as postagens do usuário antes de removê-lo. O banco de dados bloqueou a ação.\n\nSOLUÇÃO: Vá no Supabase > SQL Editor e execute:\nALTER TABLE community_posts DISABLE ROW LEVEL SECURITY;\nALTER TABLE community_comments DISABLE ROW LEVEL SECURITY;");
        } else {
            alert('Erro ao remover usuário: ' + error.message);
        }
    }
  };

  const handleOpenDetails = async (inst: Institution) => {
    setSelectedInstitution(inst);
    setLoadingChildren(true);
    
    // Buscar usuários da instituição
    const { data: users } = await supabase.from('profiles').select('*').eq('institution_id', inst.id);
    if (users) setInstitutionUsers(users);

    // Removido bloco de demonstração para buscar crianças reais
    const { data, error } = await supabase
      .from('children')
      .select('*, child_photos(url, created_at)')
      .eq('institution_id', inst.id);
      
    if (!error && data) {
        const childrenWithPhotos = data.map((child: any) => ({
            ...child,
            child_photos: child.child_photos ? child.child_photos.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) : []
        }));
        setInstitutionChildren(childrenWithPhotos);
    }
    setLoadingChildren(false);
  };

  const handleEnterHouse = (inst: Institution) => {
      localStorage.setItem('admin_viewing_institution_id', inst.id);
      localStorage.setItem('admin_viewing_institution_name', inst.name);
      navigate('/');
  };

  const handleDeleteInstitution = async (id: string) => {
      if (!confirm('Tem certeza que deseja excluir esta instituição? Todos os dados vinculados (equipe, crianças, financeiro) serão perdidos permanentemente.')) return;

      if (isDemo) {
          setInstitutions(institutions.filter(i => i.id !== id));
          return;
      }

      try {
          // 1. Limpeza manual de dados vinculados (Cascade Frontend)
          // Busca crianças para limpar seus sub-dados
          const { data: children } = await supabase.from('children').select('id').eq('institution_id', id);
          if (children && children.length > 0) {
              const childIds = children.map(c => c.id);
              await supabase.from('technical_reports').delete().in('child_id', childIds);
              await supabase.from('child_photos').delete().in('child_id', childIds);
              await supabase.from('child_notes').delete().in('child_id', childIds);
              await supabase.from('pia_history').delete().in('child_id', childIds);
              await supabase.from('children').delete().eq('institution_id', id);
          }

          // Limpa outros vínculos diretos
          await supabase.from('financial_records').delete().eq('institution_id', id);
          await supabase.from('community_comments').delete().eq('institution_id', id);
          await supabase.from('community_posts').delete().eq('institution_id', id);
          await supabase.from('house_invites').delete().eq('institution_id', id);
          await supabase.from('profiles').delete().eq('institution_id', id);

          // 2. Exclui a instituição e VERIFICA se apagou (retornando os dados excluídos)
          const { error, data } = await supabase.from('institutions').delete().eq('id', id).select();
          if (error) throw error;

          // Se data vier vazio, significa que o banco ignorou o comando (provavelmente RLS)
          if (!data || data.length === 0) {
              alert("ERRO: A instituição não foi excluída do banco de dados.\n\nCausa provável: O banco está bloqueando exclusões feitas pelo login Master (Anônimo).\n\nSOLUÇÃO: Vá no Supabase > SQL Editor e execute:\nALTER TABLE institutions DISABLE ROW LEVEL SECURITY;");
              return; // Não atualiza a tela para não enganar
          }

          setInstitutions(institutions.filter(i => i.id !== id));
      } catch (error: any) {
          console.error("Erro ao excluir:", error);
          if (error.message?.includes('profiles_institution_id_fkey')) {
              alert("ERRO DE PERMISSÃO (Foreign Key):\n\nO sistema não conseguiu apagar os perfis de usuários (equipe) desta instituição. O banco de dados impediu a exclusão.\n\nSOLUÇÃO:\n1. Vá no Supabase > SQL Editor.\n2. Execute:\nALTER TABLE profiles DISABLE ROW LEVEL SECURITY;");
          } else {
              alert('Erro ao excluir instituição: ' + error.message);
          }
      }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestão de Casas</h1>
          <p className="text-slate-500">Cadastre e gerencie as instituições de acolhimento.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="rounded-lg bg-[#458C57] px-4 py-2 text-sm font-medium text-white hover:bg-[#367044] focus:outline-none focus:ring-2 focus:ring-[#458C57] focus:ring-offset-2 shadow-sm transition-all flex items-center">
          <Plus className="w-5 h-5 mr-2" /> Nova Casa
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Instituição</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Responsável</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Contato</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Carregando instituições...</td></tr>
            ) : institutions.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">Nenhuma instituição cadastrada.</td></tr>
            ) : institutions.map((inst) => (
              <tr key={inst.id} onClick={() => handleEnterHouse(inst)} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mr-3 border border-slate-200">
                      <Building2 size={20} />
                    </div>
                    <div className="text-sm font-bold text-slate-900">{inst.name}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{inst.manager}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                  <div>{inst.email}</div>
                  <div className="text-xs text-slate-400">{inst.phone}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${inst.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {inst.active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <button onClick={(e) => { e.stopPropagation(); handleOpenAccess(inst); }} className="text-slate-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-full transition-colors" title="Gerenciar Acesso"><Shield size={18} /></button>
                    <button onClick={(e) => { e.stopPropagation(); handleEnterHouse(inst); }} className="text-slate-400 hover:text-purple-600 p-2 hover:bg-purple-50 rounded-full transition-colors" title="Acessar Painel"><LogIn size={18} /></button>
                    <button onClick={(e) => { e.stopPropagation(); handleOpenDetails(inst); }} className="text-slate-400 hover:text-[#458C57] p-2 hover:bg-slate-100 rounded-full transition-colors"><Eye size={18} /></button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteInstitution(inst.id); }} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-full transition-colors"><Trash2 size={18} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-200 bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">Nova Instituição</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Nome da Instituição</label>
                <input required type="text" className="block w-full rounded-lg border-slate-300 bg-slate-50 px-4 py-2.5 text-sm focus:border-[#458C57] focus:ring-[#458C57] focus:ring-1 focus:outline-none transition-all" placeholder="Ex: Lar Esperança" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">CNPJ</label>
                <input required type="text" className="block w-full rounded-lg border-slate-300 bg-slate-50 px-4 py-2.5 text-sm focus:border-[#458C57] focus:ring-[#458C57] focus:ring-1 focus:outline-none transition-all" placeholder="00.000.000/0000-00" value={formData.cnpj} onChange={e => setFormData({...formData, cnpj: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Nome do Responsável</label>
                <input required type="text" className="block w-full rounded-lg border-slate-300 bg-slate-50 px-4 py-2.5 text-sm focus:border-[#458C57] focus:ring-[#458C57] focus:ring-1 focus:outline-none transition-all" placeholder="Nome completo" value={formData.manager} onChange={e => setFormData({...formData, manager: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">E-mail Institucional</label>
                <input required type="email" className="block w-full rounded-lg border-slate-300 bg-slate-50 px-4 py-2.5 text-sm focus:border-[#458C57] focus:ring-[#458C57] focus:ring-1 focus:outline-none transition-all" placeholder="email@instituicao.org" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Telefone</label>
                <input required type="text" className="block w-full rounded-lg border-slate-300 bg-slate-50 px-4 py-2.5 text-sm focus:border-[#458C57] focus:ring-[#458C57] focus:ring-1 focus:outline-none transition-all" placeholder="(00) 0000-0000" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div className="flex justify-end pt-4 gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button>
                <button type="submit" className="rounded-lg bg-[#458C57] px-4 py-2 text-sm font-medium text-white hover:bg-[#367044] focus:outline-none focus:ring-2 focus:ring-[#458C57] focus:ring-offset-2 shadow-sm transition-all">Salvar Cadastro</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedInstitution && !showAccessModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                 <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600">
                    <Building2 size={20} />
                 </div>
                 <div>
                    <h3 className="text-xl font-bold text-slate-900">{selectedInstitution.name}</h3>
                    <p className="text-sm text-slate-500">Detalhes da Instituição</p>
                 </div>
              </div>
              <button onClick={() => setSelectedInstitution(null)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
                {/* Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                        <p className="text-xs text-slate-500 uppercase font-bold mb-1">Responsável</p>
                        <p className="text-slate-900 font-medium">{selectedInstitution.manager}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                        <p className="text-xs text-slate-500 uppercase font-bold mb-1">Contato</p>
                        <p className="text-slate-900 font-medium">{selectedInstitution.phone}</p>
                        <p className="text-slate-600 text-sm">{selectedInstitution.email}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                        <p className="text-xs text-slate-500 uppercase font-bold mb-1">Status</p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedInstitution.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {selectedInstitution.active ? 'Ativo' : 'Inativo'}
                        </span>
                    </div>
                </div>

                {/* Users List */}
                <div className="flex justify-between items-center mt-8 mb-4">
                    <h4 className="text-lg font-bold text-slate-800 flex items-center">
                        <Users className="w-5 h-5 mr-2" />
                        Equipe / Responsáveis ({institutionUsers.length})
                    </h4>
                    <button 
                        onClick={() => handleOpenAccess(selectedInstitution)}
                        className="text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 font-medium flex items-center transition-colors"
                    >
                        <Plus size={16} className="mr-1" />
                        Novo Admin
                    </button>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden mb-8">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Nome</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Função</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {institutionUsers.length === 0 ? (
                                <tr><td colSpan={4} className="px-6 py-4 text-center text-slate-500">Nenhum usuário vinculado.</td></tr>
                            ) : (
                                institutionUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 text-sm font-medium text-slate-900">{user.full_name}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600">{user.email}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                                                {user.role === 'admin' ? 'Administrador' : 'Equipe'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-right">
                                            <button onClick={() => handleDeleteUser(user.id)} className="text-red-400 hover:text-red-600 p-1 transition-colors" title="Remover usuário">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Children List */}
                <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    Crianças Acolhidas ({institutionChildren.length})
                </h4>
                
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Foto</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Nome</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Nascimento</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Data Entrada</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Sexo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {loadingChildren ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Carregando...</td></tr>
                            ) : institutionChildren.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Nenhuma criança registrada nesta instituição.</td></tr>
                            ) : (
                                institutionChildren.map((child) => (
                                    <tr key={child.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200">
                                                {child.child_photos && child.child_photos.length > 0 ? (
                                                    <img src={child.child_photos[0].url} alt={child.full_name} className="h-full w-full object-cover" />
                                                ) : (
                                                    <User size={20} className="text-slate-400" />
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-900">{child.full_name}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600">{child.birth_date ? new Date(child.birth_date).toLocaleDateString('pt-BR') : '-'}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600">{child.entry_date ? new Date(child.entry_date).toLocaleDateString('pt-BR') : '-'}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600">{child.sex === 'M' ? 'Masculino' : 'Feminino'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                <button onClick={() => setSelectedInstitution(null)} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Access Management Modal */}
      {showAccessModal && selectedInstitution && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Acesso: {selectedInstitution.name}</h3>
                        <p className="text-sm text-slate-500">Convidar Presidente/Administrador</p>
                    </div>
                    <button onClick={() => { setShowAccessModal(false); setSelectedInstitution(null); }} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                </div>

                <div className="p-6">
                    {!generatedLink ? (
                    <>
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
                        <p className="text-sm text-blue-800">
                            Preencha os dados abaixo para gerar um <strong>Link de Convite</strong>. Envie este link para o novo administrador se cadastrar.
                        </p>
                    </div>
                    
                    <form onSubmit={handleSendInvite}>
                        <div className="mb-4">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Nome Completo</label>
                            <input required type="text" className="block w-full rounded-lg border-slate-300 bg-slate-50 px-4 py-2.5 text-sm focus:border-[#458C57] focus:ring-[#458C57] focus:ring-1 focus:outline-none transition-all" placeholder="Nome do responsável" value={inviteName} onChange={(e) => setInviteName(e.target.value)} />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-bold text-slate-700 mb-2">CPF</label>
                            <input required type="text" className="block w-full rounded-lg border-slate-300 bg-slate-50 px-4 py-2.5 text-sm focus:border-[#458C57] focus:ring-[#458C57] focus:ring-1 focus:outline-none transition-all" placeholder="000.000.000-00" value={inviteCpf} onChange={(e) => setInviteCpf(e.target.value)} />
                        </div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">E-mail do Presidente</label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-slate-400" />
                                </div>
                                <input 
                                    type="email" 
                                    required
                                    className="block w-full pl-10 rounded-lg border-slate-300 bg-slate-50 px-4 py-2.5 text-sm focus:border-[#458C57] focus:ring-[#458C57] focus:ring-1 focus:outline-none transition-all" 
                                    placeholder="presidente@instituicao.org"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                />
                            </div>
                            <button 
                                type="submit" 
                                disabled={isInviting}
                                className="rounded-lg bg-[#458C57] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#367044] focus:outline-none focus:ring-2 focus:ring-[#458C57] focus:ring-offset-2 shadow-sm transition-all disabled:opacity-50"
                            >
                                {isInviting ? 'Gerando...' : <><LinkIcon size={18} className="mr-2"/> Gerar Link</>}
                            </button>
                        </div>
                    </form>
                    </>
                    ) : (
                        <div className="text-center">
                            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-600">
                                <Check size={24} /> 
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-2">Link Gerado com Sucesso!</h3>
                            <p className="text-sm text-slate-500 mb-4">Copie o link abaixo e envie para <strong>{inviteName}</strong>:</p>
                            
                            <div className="flex items-center gap-2 bg-slate-100 p-3 rounded-lg border border-slate-200 mb-6">
                                <input type="text" readOnly value={generatedLink} className="bg-transparent border-none w-full text-sm text-slate-600 focus:ring-0" />
                                <button onClick={() => navigator.clipboard.writeText(generatedLink)} className="text-[#458C57] hover:text-[#367044] font-bold text-sm flex items-center"><Copy size={16} className="mr-1"/> Copiar</button>
                            </div>

                            <a 
                                href={`mailto:${inviteEmail}?subject=Convite para Curitiba Acolhe&body=Olá ${inviteName},%0D%0A%0D%0AVocê foi convidado para administrar a instituição no sistema Curitiba Acolhe.%0D%0A%0D%0AAcesse o link abaixo para definir sua senha e ativar sua conta:%0D%0A${generatedLink}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-2 px-4 bg-[#458C57] text-white rounded-lg hover:bg-[#367044] flex items-center justify-center mb-3 transition-colors"
                            >
                                <Mail size={18} className="mr-2" /> Abrir Cliente de E-mail
                            </a>
                            
                            <button onClick={() => { setShowAccessModal(false); setGeneratedLink(''); setSelectedInstitution(null); }} className="w-full py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50">Fechar</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default AdminHouses;
