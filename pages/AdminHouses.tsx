import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { Building2, Plus, Trash2, X, User, Eye } from 'lucide-react';

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
}

const AdminHouses: React.FC<AdminHousesProps> = ({ isDemo }) => {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', manager: '' });
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [institutionChildren, setInstitutionChildren] = useState<any[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(false);

  useEffect(() => {
    fetchInstitutions();
  }, [isDemo]);

  const fetchInstitutions = async () => {
    setLoading(true);
    if (isDemo) {
      setTimeout(() => {
        setInstitutions([
          { id: '1', name: 'Lar Esperança', email: 'contato@laresperanca.org', phone: '(41) 3333-3333', manager: 'Maria Silva', active: true },
          { id: '2', name: 'Casa do Menino', email: 'adm@casadomenino.org', phone: '(41) 3333-4444', manager: 'João Santos', active: true },
        ]);
        setLoading(false);
      }, 500);
      return;
    }
    
    const { data, error } = await supabase.from('institutions').select('*');
    if (!error && data) setInstitutions(data);
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDemo) {
      const newInst = { ...formData, id: Math.random().toString(), active: true };
      setInstitutions([...institutions, newInst]);
      setShowModal(false);
      setFormData({ name: '', email: '', phone: '', manager: '' });
      return;
    }

    const { error } = await supabase.from('institutions').insert([formData]);
    if (!error) {
      fetchInstitutions();
      setShowModal(false);
      setFormData({ name: '', email: '', phone: '', manager: '' });
    } else {
      alert('Erro ao salvar');
    }
  };

  const handleOpenDetails = async (inst: Institution) => {
    setSelectedInstitution(inst);
    setLoadingChildren(true);
    
    if (isDemo) {
      setTimeout(() => {
        setInstitutionChildren([
          { id: 'c1', full_name: 'Enzo Gabriel', birth_date: '2015-03-10', entry_date: '2023-01-15', sex: 'M' },
          { id: 'c2', full_name: 'Valentina Pereira', birth_date: '2018-07-22', entry_date: '2023-06-10', sex: 'F' }
        ]);
        setLoadingChildren(false);
      }, 400);
      return;
    }
    
    const { data, error } = await supabase
      .from('children')
      .select('*')
      .eq('institution_id', inst.id);
      
    if (!error && data) setInstitutionChildren(data);
    setLoadingChildren(false);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestão de Casas</h1>
          <p className="text-slate-500">Cadastre e gerencie as instituições de acolhimento.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-[#458C57] text-white px-4 py-2 rounded-lg flex items-center hover:bg-[#367044] shadow-sm transition-colors">
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
              <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Nenhuma instituição cadastrada.</td></tr>
            ) : institutions.map((inst) => (
              <tr key={inst.id} onClick={() => handleOpenDetails(inst)} className="hover:bg-slate-50 transition-colors cursor-pointer group">
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
                    <button onClick={(e) => { e.stopPropagation(); handleOpenDetails(inst); }} className="text-slate-400 hover:text-[#458C57] p-2 hover:bg-slate-100 rounded-full transition-colors"><Eye size={18} /></button>
                    <button onClick={(e) => e.stopPropagation()} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-full transition-colors"><Trash2 size={18} /></button>
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
                <label className="block text-sm font-bold text-slate-700 mb-1">Nome da Instituição</label>
                <input required type="text" className="w-full border-slate-300 rounded-lg focus:ring-[#458C57] focus:border-[#458C57]" placeholder="Ex: Lar Esperança" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nome do Responsável</label>
                <input required type="text" className="w-full border-slate-300 rounded-lg focus:ring-[#458C57] focus:border-[#458C57]" placeholder="Nome completo" value={formData.manager} onChange={e => setFormData({...formData, manager: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">E-mail Institucional</label>
                <input required type="email" className="w-full border-slate-300 rounded-lg focus:ring-[#458C57] focus:border-[#458C57]" placeholder="email@instituicao.org" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Telefone</label>
                <input required type="text" className="w-full border-slate-300 rounded-lg focus:ring-[#458C57] focus:border-[#458C57]" placeholder="(00) 0000-0000" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div className="flex justify-end pt-4 gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg font-medium border border-slate-300">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-[#458C57] text-white rounded-lg hover:bg-[#367044] font-medium shadow-sm">Salvar Cadastro</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedInstitution && (
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

                {/* Children List */}
                <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    Crianças Acolhidas ({institutionChildren.length})
                </h4>
                
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Nome</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Nascimento</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Data Entrada</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Sexo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {loadingChildren ? (
                                <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">Carregando...</td></tr>
                            ) : institutionChildren.length === 0 ? (
                                <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">Nenhuma criança registrada nesta instituição.</td></tr>
                            ) : (
                                institutionChildren.map((child) => (
                                    <tr key={child.id} className="hover:bg-slate-50">
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
    </div>
  );
};

export default AdminHouses;