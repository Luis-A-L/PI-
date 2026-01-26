import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Child, TechnicalReport } from '../types';
import { Search, FileText, X, Save, ChevronRight, Check, Clock } from 'lucide-react';

interface ReportsProps {
  isDemo?: boolean;
}

const Reports: React.FC<ReportsProps> = ({ isDemo }) => {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const viewingInstitutionId = localStorage.getItem('admin_viewing_institution_id');
  
  // Modal/Form State
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [reportData, setReportData] = useState<Partial<TechnicalReport>>({
    summary: '',
    evolution: '',
    health_status: '',
    family_situation: '',
    referrals: '',
    conclusion: '',
    status: 'draft',
    report_date: new Date().toISOString().split('T')[0]
  });
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchChildren();
  }, [isDemo]);

  // Carrega a lista de crianças
  const fetchChildren = async () => {
    setLoading(true);
    if (isDemo) {
       setTimeout(() => {
        setChildren([
          { 
            id: '1', full_name: 'Ana Clara Souza', sex: 'F', birth_date: '2015-05-10', entry_date: '2023-01-15', institution_id: 'demo', notes: '', autos_number: '0001234-56.2023.8.16.0000', admission_reason_types: ['Demo'], created_at: ''
          } as any,
          { 
            id: '2', full_name: 'Marcos Vinícius Pereira', sex: 'M', birth_date: '2010-11-20', entry_date: '2023-08-10', institution_id: 'demo', notes: '', autos_number: '0005555-12.2023.8.16.0000', created_at: ''
          } as any,
          {
            id: '3', full_name: 'Gabriel Santos Oliveira', sex: 'M', birth_date: '2012-07-15', entry_date: '2022-05-10', institution_id: 'demo', notes: '', autos_number: '0009999-99.2022.8.16.0000', created_at: ''
          } as any
        ]);
        setLoading(false);
      }, 300);
      return;
    }

    let targetInstitutionId = viewingInstitutionId;

    if (!targetInstitutionId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profile } = await supabase.from('profiles').select('institution_id').eq('id', user.id).single();
            targetInstitutionId = profile?.institution_id;
        }
    }

    if (!targetInstitutionId) {
        setChildren([]);
        setLoading(false);
        return;
    }

    const { data, error } = await supabase.from('children').select('*').eq('institution_id', targetInstitutionId).order('full_name');
    
    if (!error && data) {
        setChildren(data);
    }
    setLoading(false);
  };

  // Ao selecionar uma criança, carrega (ou inicializa) o relatório
  const handleSelectChild = async (child: Child) => {
    setSelectedChild(child);
    setIsReportLoading(true);

    if (isDemo) {
      // Mock report DATA - BEM COMPLETO
      setTimeout(() => {
        // Exemplo: Se for a Ana Clara, retorna um relatório completo. Se for o Marcos, um rascunho.
        if (child.id === '1') {
            setReportData({
              report_date: new Date().toISOString().split('T')[0],
              status: 'finalized',
              summary: 'Acolhida em 15/01/2023, proveniente do Conselho Tutelar Boa Vista, devido a situação de negligência severa. A criança chegou com poucos pertences e apresentava sinais de desnutrição leve.',
              health_status: 'Acompanhamento nutricional iniciado na UBS próxima. Vacinação foi regularizada em 20/01. Apresenta boa saúde geral, sem queixas agudas no momento. Sono tranquilo.',
              evolution: 'Ana Clara tem demonstrado boa adaptação à rotina da casa. Inicialmente tímida, agora interage bem com as outras crianças e cuidadores. Participa ativamente das atividades escolares e recreativas. Demonstra carinho pela equipe técnica.',
              family_situation: 'A genitora realizou 2 visitas no último mês. O vínculo parece preservado, porém a mãe ainda não demonstra condições habitacionais para o retorno. O pai não foi localizado até o momento. Avó materna manifestou interesse mas reside em outro estado.',
              referrals: '1. Continuidade no acompanhamento psicológico quinzenal.\n2. Inserção em oficina de artes no contraturno escolar.\n3. Busca ativa da família extensa paterna.',
              conclusion: 'Sugere-se a manutenção do acolhimento enquanto a equipe técnica realiza a avaliação psicossocial da avó materna e aguarda a estabilização da moradia da genitora. Criança protegida e com direitos garantidos na instituição.'
            });
        } else {
            setReportData({
              report_date: new Date().toISOString().split('T')[0],
              status: 'draft',
              summary: 'Adolescente acolhido recentemente. Histórico de evasão escolar.',
              health_status: 'Exames admissionais realizados. Sem alterações.',
              evolution: 'Resistente às regras da casa nos primeiros dias.',
              family_situation: '',
              referrals: '',
              conclusion: ''
            });
        }
        setIsReportLoading(false);
      }, 400);
      return;
    }

    const { data, error } = await supabase
      .from('technical_reports')
      .select('*')
      .eq('child_id', child.id)
      .single();

    if (data) {
      setReportData(data);
    } else {
      setReportData({
        summary: '',
        evolution: '',
        health_status: '',
        family_situation: '',
        referrals: '',
        conclusion: '',
        status: 'draft',
        report_date: new Date().toISOString().split('T')[0]
      });
    }
    setIsReportLoading(false);
  };

  const handleCloseModal = () => {
    setSelectedChild(null);
    setReportData({});
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setReportData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    if (isDemo) {
      setTimeout(() => {
        alert("Relatório salvo com sucesso! (Simulação)");
        setIsSaving(false);
        handleCloseModal();
      }, 600);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !selectedChild) throw new Error("Erro de autenticação");

      const { data: profile } = await supabase.from('profiles').select('institution_id').eq('id', user.id).single();
      if (!profile) throw new Error("Perfil inválido");
      
      const payload = {
        ...reportData,
        child_id: selectedChild.id,
        institution_id: profile.institution_id
      };

      // @ts-ignore
      if (reportData.id) {
        const { error } = await supabase.from('technical_reports').update(payload).eq('id', reportData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('technical_reports').insert([payload]);
        if (error) throw error;
      }

      setIsSaving(false);
      handleCloseModal();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar relatório.");
      setIsSaving(false);
    }
  };

  const filteredChildren = children.filter(c => c.full_name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Relatórios Técnicos</h1>
        <p className="text-slate-500">Selecione uma criança para visualizar, editar ou emitir pareceres técnicos.</p>
      </div>

      {/* Lista de Seleção (Style: Card Grid) */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar acolhido para relatório..."
            className="pl-10 w-full p-2.5 border border-slate-300 rounded-lg text-slate-900 bg-white focus:ring-2 focus:ring-[#458C57] focus:border-transparent transition-shadow shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="text-center p-8 text-slate-500">Carregando lista...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredChildren.map(child => (
              <button
                key={child.id}
                onClick={() => handleSelectChild(child)}
                className="flex items-center p-4 border border-slate-200 rounded-lg hover:border-[#63BF7A] hover:bg-[#88F2A2]/10 hover:shadow-md transition-all text-left group bg-white"
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold mr-4 text-lg border-2 overflow-hidden ${child.sex === 'F' ? 'bg-pink-50 text-pink-600 border-pink-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                  {child.full_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-slate-800 truncate group-hover:text-[#458C57]">{child.full_name}</p>
                  <p className="text-xs text-slate-500 truncate flex items-center mt-1">
                    <FileText size={12} className="mr-1" />
                    Autos: {child.autos_number || 'N/A'}
                  </p>
                </div>
                <div className="p-2 bg-slate-50 rounded-full group-hover:bg-[#88F2A2]/30 transition-colors">
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[#458C57]" />
                </div>
              </button>
            ))}
            {filteredChildren.length === 0 && (
              <div className="col-span-full text-center text-slate-500 py-8 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                Nenhum acolhido encontrado para os termos pesquisados.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal / Editor Overlay */}
      {selectedChild && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col border border-slate-200">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-200 bg-slate-50 rounded-t-xl">
              <div>
                <div className="flex items-center space-x-2">
                    <h2 className="text-xl font-bold text-slate-900">Relatório Técnico</h2>
                    <span className="px-2 py-0.5 bg-[#88F2A2]/20 text-[#458C57] text-xs font-bold rounded border border-[#88F2A2]/40 uppercase">Confidencial</span>
                </div>
                <p className="text-sm text-slate-600 mt-1">Referente a: <strong className="text-slate-900">{selectedChild.full_name}</strong></p>
              </div>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-2 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Body */}
            <div className="p-8 overflow-y-auto flex-1 bg-white">
              {isReportLoading ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#458C57]"></div>
                  <p className="text-slate-500">Buscando histórico...</p>
                </div>
              ) : (
                <form id="report-form" onSubmit={handleSave} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-slate-50 p-5 rounded-lg border border-slate-200">
                     <div className="md:col-span-4">
                        <label className="block text-sm font-bold text-slate-700 mb-1">Data do Relatório</label>
                        <input 
                          type="date" 
                          name="report_date" 
                          value={reportData.report_date} 
                          onChange={handleInputChange} 
                          className="w-full border border-slate-300 rounded-md p-2.5 text-slate-900 bg-white focus:ring-2 focus:ring-[#458C57] focus:border-transparent shadow-sm" 
                        />
                     </div>
                     <div className="md:col-span-4">
                        <label className="block text-sm font-bold text-slate-700 mb-1">Status do Documento</label>
                        <select 
                          name="status" 
                          value={reportData.status} 
                          onChange={handleInputChange}
                          className={`w-full border rounded-md p-2.5 text-slate-900 bg-white focus:ring-2 focus:ring-[#458C57] focus:border-transparent shadow-sm font-medium ${reportData.status === 'finalized' ? 'border-green-300 bg-green-50 text-green-900' : 'border-amber-300 bg-amber-50 text-amber-900'}`}
                        >
                          <option value="draft">🟡 Rascunho (Em edição)</option>
                          <option value="finalized">🟢 Finalizado (Pronto para envio)</option>
                        </select>
                     </div>
                     <div className="md:col-span-4 flex items-end">
                        <div className="text-xs text-slate-500 pb-3">
                            {reportData.status === 'finalized' ? 
                                <span className="flex items-center text-green-700"><Check size={14} className="mr-1"/> Documento válido legalmente</span> : 
                                <span className="flex items-center text-amber-600"><Clock size={14} className="mr-1"/> Edição pendente</span>
                            }
                        </div>
                     </div>
                  </div>

                  <div className="space-y-6">
                      <div className="relative">
                        <label className="block text-sm font-bold text-slate-800 mb-2 uppercase tracking-wide">1. Resumo do Caso / Contexto Inicial</label>
                        <textarea 
                          name="summary" 
                          rows={4} 
                          value={reportData.summary || ''} 
                          onChange={handleInputChange}
                          className="w-full border border-slate-300 rounded-lg p-3 text-slate-900 bg-white focus:ring-2 focus:ring-[#458C57] focus:border-transparent shadow-sm"
                          placeholder="Descreva o contexto de entrada, motivo do acolhimento e condições iniciais..."
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-bold text-slate-800 mb-2 uppercase tracking-wide">2. Situação de Saúde</label>
                          <textarea 
                            name="health_status" 
                            rows={5} 
                            value={reportData.health_status || ''} 
                            onChange={handleInputChange}
                            className="w-full border border-slate-300 rounded-lg p-3 text-slate-900 bg-white focus:ring-2 focus:ring-[#458C57] focus:border-transparent shadow-sm"
                            placeholder="Vacinação, doenças pré-existentes, tratamentos em curso..."
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-800 mb-2 uppercase tracking-wide">3. Evolução no Acolhimento</label>
                          <textarea 
                            name="evolution" 
                            rows={5} 
                            value={reportData.evolution || ''} 
                            onChange={handleInputChange}
                            className="w-full border border-slate-300 rounded-lg p-3 text-slate-900 bg-white focus:ring-2 focus:ring-[#458C57] focus:border-transparent shadow-sm"
                            placeholder="Adaptação, comportamento, rotina, escolaridade..."
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-800 mb-2 uppercase tracking-wide">4. Situação Familiar e Visitas</label>
                        <textarea 
                          name="family_situation" 
                          rows={4} 
                          value={reportData.family_situation || ''} 
                          onChange={handleInputChange}
                          className="w-full border border-slate-300 rounded-lg p-3 text-slate-900 bg-white focus:ring-2 focus:ring-[#458C57] focus:border-transparent shadow-sm"
                          placeholder="Frequência de visitas, qualidade do vínculo, situação dos genitores..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-800 mb-2 uppercase tracking-wide">5. Encaminhamentos Realizados</label>
                        <textarea 
                          name="referrals" 
                          rows={3} 
                          value={reportData.referrals || ''} 
                          onChange={handleInputChange}
                          className="w-full border border-slate-300 rounded-lg p-3 text-slate-900 bg-white focus:ring-2 focus:ring-[#458C57] focus:border-transparent shadow-sm"
                          placeholder="Encaminhamentos para rede (Saúde, Educação, CRAS, CREAS)..."
                        />
                      </div>

                      <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                        <label className="block text-sm font-bold text-slate-900 mb-2 uppercase tracking-wide">6. Parecer Técnico Final / Conclusão</label>
                        <p className="text-xs text-slate-500 mb-2">Síntese técnica indicando sugestões para o plano de ação (Reintegração, Manutenção do Acolhimento, etc).</p>
                        <textarea 
                          name="conclusion" 
                          rows={5} 
                          value={reportData.conclusion || ''} 
                          onChange={handleInputChange}
                          className="w-full border border-slate-300 rounded-lg p-3 text-slate-900 bg-white focus:ring-2 focus:ring-[#458C57] focus:border-transparent shadow-sm"
                          placeholder="Conclusão técnica..."
                        />
                      </div>
                  </div>
                </form>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-200 flex justify-end bg-slate-50 rounded-b-xl gap-3">
              <button 
                type="button" 
                onClick={handleCloseModal}
                className="px-5 py-2.5 border border-slate-300 rounded-lg text-slate-700 bg-white hover:bg-slate-50 font-semibold shadow-sm transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                form="report-form"
                disabled={isSaving || isReportLoading}
                className="px-5 py-2.5 bg-[#458C57] text-white rounded-lg hover:bg-[#367044] font-semibold flex items-center shadow-md shadow-[#404040]/10 transition-all transform active:scale-95"
              >
                {isSaving ? 'Salvando...' : <><Save className="w-4 h-4 mr-2" /> Salvar Relatório</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;