import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { Building2, Save, DollarSign, Camera, Plus, Trash2 } from 'lucide-react';

const HouseManagement = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'financials'>('profile');
  const [institution, setInstitution] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', manager: '', cnpj: '', address: '', photo_url: '' });
  
  // Financials State
  const [financials, setFinancials] = useState<any[]>([]);
  const [loadingFinancials, setLoadingFinancials] = useState(false);
  const [newExpense, setNewExpense] = useState({ description: '', amount: '', date: new Date().toISOString().split('T')[0], category: 'Manutenção' });
  const viewingInstitutionId = localStorage.getItem('admin_viewing_institution_id');

  useEffect(() => {
    fetchInstitution();
  }, []);

  useEffect(() => {
    if (activeTab === 'financials' && institution) {
        fetchFinancials();
    }
  }, [activeTab, institution]);

  const fetchInstitution = async () => {
    try {
        if (viewingInstitutionId) {
            const { data: inst } = await supabase.from('institutions').select('*').eq('id', viewingInstitutionId).single();
            if (inst) {
                setInstitution(inst);
                setFormData({
                    name: inst.name || '',
                    email: inst.email || '',
                    phone: inst.phone || '',
                    manager: inst.manager || '',
                    cnpj: inst.cnpj || '',
                    address: inst.address || '',
                    photo_url: inst.photo_url || ''
                });
            }
            setLoading(false);
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setLoading(false);
            return;
        }

        const { data: profile } = await supabase.from('profiles').select('institution_id').eq('id', user.id).single();
        if (profile && profile.institution_id) {
            const { data: inst } = await supabase.from('institutions').select('*').eq('id', profile.institution_id).single();
            if (inst) {
                setInstitution(inst);
                setFormData({
                    name: inst.name || '',
                    email: inst.email || '',
                    phone: inst.phone || '',
                    manager: inst.manager || '',
                    cnpj: inst.cnpj || '',
                    address: inst.address || '',
                    photo_url: inst.photo_url || ''
                });
            }
        }
    } catch (error) {
        console.error("Erro ao carregar dados da casa:", error);
    }
    setLoading(false);
  };

  const fetchFinancials = async () => {
    setLoadingFinancials(true);
    const { data, error } = await supabase
        .from('financial_records')
        .select('*')
        .eq('institution_id', institution.id)
        .order('date', { ascending: false });
    
    if (!error && data) {
        setFinancials(data);
    }
    setLoadingFinancials(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    if (institution) {
        const { error } = await supabase.from('institutions').update(formData).eq('id', institution.id);
        if (error) alert('Erro ao salvar: ' + error.message);
        else alert('Dados atualizados com sucesso!');
    }
    setSaving(false);
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institution) return;
    if (!newExpense.amount || isNaN(parseFloat(newExpense.amount))) {
        alert("Por favor, insira um valor válido.");
        return;
    }

    const { data, error } = await supabase.from('financial_records').insert([{
        institution_id: institution.id,
        description: newExpense.description,
        amount: parseFloat(newExpense.amount),
        date: newExpense.date,
        category: newExpense.category,
        type: 'expense'
    }]).select();

    if (error) {
        alert('Erro ao salvar despesa: ' + error.message);
    } else if (data) {
        setFinancials([data[0], ...financials]);
        setNewExpense({ ...newExpense, description: '', amount: '' });
    }
  };

  const handleDeleteExpense = async (id: string) => {
      if (!confirm('Excluir este registro?')) return;
      const { error } = await supabase.from('financial_records').delete().eq('id', id);
      if (!error) {
          setFinancials(financials.filter(item => item.id !== id));
      }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `institution-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('institution-logos').upload(fileName, file);
        
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from('institution-logos').getPublicUrl(fileName);
        setFormData(prev => ({ ...prev, photo_url: publicUrlData.publicUrl }));
    } catch (error: any) {
        alert('Erro ao fazer upload: ' + error.message);
    }
  };

  if (loading) return <div className="p-8 text-center">Carregando informações da casa...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Gestão da Casa</h1>
      
      <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg mb-6 w-fit">
        <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'profile' ? 'bg-white text-[#458C57] shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
        >
            Perfil da Casa
        </button>
        <button
            onClick={() => setActiveTab('financials')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'financials' ? 'bg-white text-[#458C57] shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
        >
            Prestação de Contas
        </button>
      </div>

      {activeTab === 'profile' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            {!institution && (
                <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
                    <p className="text-sm text-yellow-700">
                        Nenhuma instituição vinculada ao seu perfil. Entre em contato com o administrador do sistema.
                    </p>
                </div>
            )}
            <form onSubmit={handleSave} className="space-y-6">
                <div className="flex items-center gap-6 mb-8">
                    <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center border-2 border-slate-200 overflow-hidden relative group">
                        {formData.photo_url ? (
                            <img src={formData.photo_url} alt="Casa" className="w-full h-full object-cover" />
                        ) : (
                            <Building2 className="w-10 h-10 text-slate-400" />
                        )}
                        {!viewingInstitutionId && <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                            <Camera className="text-white w-6 h-6" />
                            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                        </label>}
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-slate-900">{formData.name || 'Nome da Instituição'}</h3>
                        <p className="text-sm text-slate-500">Informações públicas e de contato.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Nome da Instituição</label>
                        <input type="text" className="block w-full rounded-lg border-slate-300 bg-slate-50 px-4 py-2.5 text-sm focus:border-[#458C57] focus:ring-[#458C57] focus:ring-1 focus:outline-none transition-all" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">CNPJ</label>
                        <input type="text" className="block w-full rounded-lg border-slate-300 bg-slate-50 px-4 py-2.5 text-sm focus:border-[#458C57] focus:ring-[#458C57] focus:ring-1 focus:outline-none transition-all" value={formData.cnpj} onChange={e => setFormData({...formData, cnpj: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Responsável</label>
                        <input type="text" className="block w-full rounded-lg border-slate-300 bg-slate-50 px-4 py-2.5 text-sm focus:border-[#458C57] focus:ring-[#458C57] focus:ring-1 focus:outline-none transition-all" value={formData.manager} onChange={e => setFormData({...formData, manager: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Telefone</label>
                        <input type="text" className="block w-full rounded-lg border-slate-300 bg-slate-50 px-4 py-2.5 text-sm focus:border-[#458C57] focus:ring-[#458C57] focus:ring-1 focus:outline-none transition-all" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-slate-700 mb-2">Endereço</label>
                        <input type="text" className="block w-full rounded-lg border-slate-300 bg-slate-50 px-4 py-2.5 text-sm focus:border-[#458C57] focus:ring-[#458C57] focus:ring-1 focus:outline-none transition-all" placeholder="Rua, Número, Bairro" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold text-slate-700 mb-2">E-mail</label>
                        <input type="email" className="block w-full rounded-lg border-slate-300 bg-slate-50 px-4 py-2.5 text-sm focus:border-[#458C57] focus:ring-[#458C57] focus:ring-1 focus:outline-none transition-all" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                    </div>
                </div>

                {!viewingInstitutionId && <div className="flex justify-end pt-4">
                    <button type="submit" disabled={saving} className="rounded-lg bg-[#458C57] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#367044] focus:outline-none focus:ring-2 focus:ring-[#458C57] focus:ring-offset-2 shadow-sm transition-all disabled:opacity-50">
                        {saving ? 'Salvando...' : <><Save className="w-4 h-4 mr-2" /> Salvar Alterações</>}
                    </button>
                </div>}
            </form>
        </div>
      )}

      {activeTab === 'financials' && (
          <div className="space-y-6">
              {/* Add Expense Form */}
              {!viewingInstitutionId && <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
                      <Plus className="w-5 h-5 mr-2 text-[#458C57]" />
                      Nova Despesa / Registro
                  </h3>
                  <form onSubmit={handleAddExpense} className="grid grid-cols-1 md:grid-cols-5 gap-6 items-end">
                      <div className="md:col-span-2">
                          <label className="block text-sm font-bold text-slate-700 mb-2">Descrição</label>
                          <input required type="text" className="block w-full rounded-lg border-slate-300 bg-slate-50 px-4 py-2.5 text-sm focus:border-[#458C57] focus:ring-[#458C57] focus:ring-1 focus:outline-none transition-all" placeholder="Ex: Compra de Alimentos" value={newExpense.description} onChange={e => setNewExpense({...newExpense, description: e.target.value})} />
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Valor (R$)</label>
                          <input required type="number" step="0.01" className="block w-full rounded-lg border-slate-300 bg-slate-50 px-4 py-2.5 text-sm focus:border-[#458C57] focus:ring-[#458C57] focus:ring-1 focus:outline-none transition-all" placeholder="0,00" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: e.target.value})} />
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Categoria</label>
                          <select className="block w-full rounded-lg border-slate-300 bg-slate-50 px-4 py-2.5 text-sm focus:border-[#458C57] focus:ring-[#458C57] focus:ring-1 focus:outline-none transition-all" value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value})}>
                              <option>Manutenção</option>
                              <option>Alimentação</option>
                              <option>Saúde</option>
                              <option>Pessoal</option>
                              <option>Outros</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">Data</label>
                          <input required type="date" className="block w-full rounded-lg border-slate-300 bg-slate-50 px-4 py-2.5 text-sm focus:border-[#458C57] focus:ring-[#458C57] focus:ring-1 focus:outline-none transition-all" value={newExpense.date} onChange={e => setNewExpense({...newExpense, date: e.target.value})} />
                      </div>
                      <div className="md:col-span-5 flex justify-end">
                          <button type="submit" className="rounded-lg bg-[#458C57] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#367044] focus:outline-none focus:ring-2 focus:ring-[#458C57] focus:ring-offset-2 shadow-sm transition-all">
                              <Save className="w-4 h-4 mr-2" /> Registrar
                          </button>
                      </div>
                  </form>
              </div>}

              {/* Expenses List */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                          <tr>
                              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Data</th>
                              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Descrição</th>
                              <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Categoria</th>
                              <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Valor</th>
                              <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Ações</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                          {loadingFinancials ? (
                              <tr><td colSpan={5} className="p-8 text-center text-slate-500">Carregando registros...</td></tr>
                          ) : financials.length === 0 ? (
                              <tr><td colSpan={5} className="p-8 text-center text-slate-500">Nenhum registro financeiro encontrado.</td></tr>
                          ) : financials.map((item) => (
                              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{new Date(item.date).toLocaleDateString('pt-BR')}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{item.description}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                          {item.category}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-red-600">
                                      - R$ {item.amount.toFixed(2).replace('.', ',')}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                      {!viewingInstitutionId && 
                                      <button onClick={() => handleDeleteExpense(item.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={16} /></button>
                                      }
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}
    </div>
  );
};

export default HouseManagement;
