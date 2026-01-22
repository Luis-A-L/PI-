import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, AlertTriangle, User, Camera, Search, Info } from 'lucide-react';

interface ChildRegistrationProps {
  isDemo?: boolean;
}

const ChildRegistration: React.FC<ChildRegistrationProps> = ({ isDemo }) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('child');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);

  const [formData, setFormData] = useState<any>({
    // ABA 1: DADOS DA CRIANÇA
    full_name: '', social_name: '', naturalness: 'Selecionar', cpf: '', identification_doc: '',
    presumed_age: 'Não', birth_date: '', sex: 'Selecionar', gender_identity: 'Selecionar',
    race_color: 'Selecionar', birth_time: '', is_studying: 'Não', education_level: 'Selecionar',
    registered_by: 'Selecionar',
    
    // ABA 2: DADOS DA FAMÍLIA
    mother_name: '', mother_father_1_cpf: '', mother_father_1_deceased: 'Não',
    grandparent_1_line_1: '', grandparent_2_line_1: '',
    mother_father_2_name: '', mother_father_2_cpf: '', has_mother_father_2: 'Não',
    mother_father_2_deceased: 'Não', grandparent_1_line_2: '', grandparent_2_line_2: '',
    has_siblings: 'Selecionar', has_children: 'Não', is_child_of_teenager: 'Não',
    possible_reintegration: 'Não', has_pia: 'Não',

    // ABA 3: DADOS DE SAÚDE
    has_health_diagnosis: 'Selecionar', health_diagnosis_details: [],
    has_physical_disability: 'Selecionar', physical_disability_details: [],
    has_sensory_disability: 'Selecionar', sensory_disability_details: [],
    has_intellectual_disability: 'Selecionar', intellectual_disability_details: [],
    has_psychosocial_disability: 'Selecionar', psychosocial_disability_details: [],
    has_health_condition: 'Selecionar', health_condition_details: [],
    medication_use: 'Não', has_medical_report: 'Não', has_chemical_dependency: 'Não',

    // ABA 5: DADOS DE PROCESSO
    process_type: 'Selecionar', process_state: 'Selecionar', judging_body: 'Selecionar',
    process_number: '', protective_measures: [],

    // ABA 6: OUTRAS INFORMAÇÕES
    has_gov_benefit: 'Não', gov_benefit_type: 'Selecionar', has_death_threat: 'Não',
    receives_visits: 'Não', visitor_name: '', last_visit_date: '', observations: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'radio') {
        setFormData((prev: any) => ({ ...prev, [name]: value }));
    } else {
        setFormData((prev: any) => ({ ...prev, [name]: value }));
    }
  };

  const handleCheckboxGroup = (name: string, value: string, checked: boolean) => {
    setFormData((prev: any) => {
        const current = prev[name] || [];
        if (checked) return { ...prev, [name]: [...current, value] };
        return { ...prev, [name]: current.filter((item: string) => item !== value) };
    });
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        setSelectedPhoto(file);
        setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (isDemo) {
        setTimeout(() => {
            alert("Cadastro realizado com sucesso (Modo Demo)!");
            navigate('/');
        }, 1000);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");
      const { data: profile } = await supabase.from('profiles').select('institution_id').eq('id', user.id).single();
      
      // Preparar payload
      const payload = { ...formData, institution_id: profile.institution_id, entry_date: new Date().toISOString() };
      
      // Limpar datas vazias
      if (!payload.birth_date) delete payload.birth_date;
      if (!payload.last_visit_date) delete payload.last_visit_date;

      const { data: newChild, error: insertError } = await supabase.from('children').insert([payload]).select().single();
      if (insertError) throw insertError;

      if (selectedPhoto && newChild) {
          const fileExt = selectedPhoto.name.split('.').pop();
          const fileName = `${newChild.id}/${Math.random()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from('child-photos').upload(fileName, selectedPhoto);
          if (!uploadError) {
             const { data: publicUrlData } = supabase.storage.from('child-photos').getPublicUrl(fileName);
             await supabase.from('child_photos').insert([{ child_id: newChild.id, url: publicUrlData.publicUrl }]);
          }
      }

      navigate('/');
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao salvar cadastro.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const protectiveMeasuresOptions = [
    "ARTS. 136, III, b e 249 - REPRESENTAÇÃO JUNTO À AUTORIDADE JUDICIÁRIA",
    "ART.101 - INCISO I - ENCAMINHAMENTO AOS PAIS OU RESPONSÁVEL",
    "ART.101 - INCISO II - ORIENTAÇÃO , APOIO E ACOMPANHAMENTO TEMPORÁRIOS",
    "ART.101 - INCISO III - MATRÍCULA E FREQUÊNCIA OBRIGATÓRIAS",
    "ART.101 - INCISO IV - INCLUSÃO EM PROGRAMA COMUNITÁRIO",
    "ART.101 - INCISO IX - COLOCAÇÃO EM FAMÍLIA SUBSTITUTA",
    "ART.101 - INCISO V - REQUISIÇÃO DE TRATAMENTO MÉDICO",
    "ART.101 - INCISO VI - INCLUSÃO EM PROGRAMA OFICIAL DE AUXÍLIO",
    "ART.101 - INCISO VII - ACOLHIMENTO INSTITUCIONAL",
    "ART.101 - INCISO VIII - INCLUSÃO EM PROGRAMA DE ACOLHIMENTO FAMILIAR",
    "ART.129 - INCISO I - ENCAMINHAMENTO A PROGRAMA OFICIAL",
    "ART.136, XI - PERDA OU SUPENSÃO DO PODER FAMILIAR"
  ];

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <div className="mb-6">
        <Link to="/" className="text-gray-500 hover:text-gray-700 flex items-center mb-2 text-sm">
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Cadastro de Criança/Adolescente</h1>
        <p className="text-gray-500">Preencha os dados cadastrais completos.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 flex items-start">
            <AlertTriangle className="w-5 h-5 text-red-500 mr-2 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="bg-white shadow-sm rounded-t-lg border-b border-gray-200">
          <nav className="flex overflow-x-auto" aria-label="Tabs">
            {[
                { id: 'child', label: 'DADOS DA CRIANÇA' },
                { id: 'family', label: 'DADOS DA FAMÍLIA' },
                { id: 'health', label: 'DADOS DE SAÚDE' },
                { id: 'process', label: 'DADOS DE PROCESSO' },
                { id: 'others', label: 'OUTRAS INFORMAÇÕES' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id ? 'border-[#458C57] text-[#458C57] bg-green-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="bg-white shadow-sm rounded-b-lg border border-t-0 border-gray-200 p-6">
          {/* ABA 1: DADOS DA CRIANÇA */}
          {activeTab === 'child' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex justify-center mb-6">
                  <div className="relative group">
                      <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-200 bg-gray-100 flex items-center justify-center shadow-sm">
                          {photoPreview ? <img src={photoPreview} className="w-full h-full object-cover" /> : <User className="w-16 h-16 text-gray-400" />}
                      </div>
                      <label className="absolute bottom-0 right-0 bg-[#458C57] text-white p-2.5 rounded-full cursor-pointer hover:bg-[#367044] shadow-md"><Camera size={20} /><input type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} /></label>
                  </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-900 mb-1">Nome</label>
                  <div className="relative">
                    <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 pr-10" placeholder="Nome" required />
                    <button type="button" className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500"><Search size={18} /></button>
                  </div>
                </div>
                <div><label className="block text-sm font-bold text-gray-900 mb-1">Nome social</label><input type="text" name="social_name" value={formData.social_name} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2" /></div>
                <div><label className="block text-sm font-bold text-gray-900 mb-1">Nacionalidade</label><select name="naturalness" value={formData.naturalness} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2"><option value="Selecionar">Selecionar</option><option value="Brasileira">Brasileira</option><option value="Estrangeira">Estrangeira</option></select></div>
                <div><label className="block text-sm font-bold text-gray-900 mb-1">CPF</label><input type="text" name="cpf" value={formData.cpf} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2" /></div>
                <div><label className="block text-sm font-bold text-gray-900 mb-1">Doc. Identificação</label><input type="text" name="identification_doc" value={formData.identification_doc} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2" /></div>
                <div><label className="block text-sm font-bold text-gray-900 mb-1">Idade Presumida?</label><div className="flex gap-4 mt-2"><label><input type="radio" name="presumed_age" value="Sim" checked={formData.presumed_age === 'Sim'} onChange={handleChange} className="mr-2" /> Sim</label><label><input type="radio" name="presumed_age" value="Não" checked={formData.presumed_age === 'Não'} onChange={handleChange} className="mr-2" /> Não</label></div></div>
                <div><label className="block text-sm font-bold text-gray-900 mb-1">Data Nascimento</label><input type="date" name="birth_date" value={formData.birth_date} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2" /></div>
                <div><label className="block text-sm font-bold text-gray-900 mb-1">Sexo</label><select name="sex" value={formData.sex} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2"><option value="Selecionar">Selecionar</option><option value="M">Masculino</option><option value="F">Feminino</option></select></div>
                <div><label className="block text-sm font-bold text-gray-900 mb-1">Identidade Gênero</label><select name="gender_identity" value={formData.gender_identity} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2"><option value="Selecionar">Selecionar</option><option value="Cisgênero">Cisgênero</option><option value="Transgênero">Transgênero</option></select></div>
                <div><label className="block text-sm font-bold text-gray-900 mb-1">Raça/Cor</label><select name="race_color" value={formData.race_color} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2"><option value="Selecionar">Selecionar</option><option value="Branca">Branca</option><option value="Preta">Preta</option><option value="Parda">Parda</option></select></div>
                <div><label className="block text-sm font-bold text-gray-900 mb-1">Horário Nasc.</label><input type="time" name="birth_time" value={formData.birth_time} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2" /></div>
                <div><label className="block text-sm font-bold text-gray-900 mb-1">Estudando?</label><div className="flex gap-4 mt-2"><label><input type="radio" name="is_studying" value="Sim" checked={formData.is_studying === 'Sim'} onChange={handleChange} className="mr-2" /> Sim</label><label><input type="radio" name="is_studying" value="Não" checked={formData.is_studying === 'Não'} onChange={handleChange} className="mr-2" /> Não</label></div></div>
                <div><label className="block text-sm font-bold text-gray-900 mb-1">Instrução</label><select name="education_level" value={formData.education_level} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2"><option value="Selecionar">Selecionar</option><option value="Fundamental Incompleto">Fundamental Incompleto</option></select></div>
                <div><label className="block text-sm font-bold text-gray-900 mb-1">Registrado por</label><select name="registered_by" value={formData.registered_by} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2"><option value="Selecionar">Selecionar</option><option value="Pai e Mãe">Pai e Mãe</option><option value="Apenas Mãe">Apenas Mãe</option></select></div>
              </div>
            </div>
          )}

          {/* ABA 2: DADOS DA FAMÍLIA */}
          {activeTab === 'family' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">Pai/Mãe 1</h3>
                  <div className="space-y-3">
                    <input type="text" name="mother_name" value={formData.mother_name} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2" placeholder="Nome" />
                    <input type="text" name="mother_father_1_cpf" value={formData.mother_father_1_cpf} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2" placeholder="CPF" />
                    <div className="flex gap-4"><span className="text-sm font-bold">Falecido?</span><label><input type="radio" name="mother_father_1_deceased" value="Sim" checked={formData.mother_father_1_deceased === 'Sim'} onChange={handleChange} className="mr-1"/>Sim</label><label><input type="radio" name="mother_father_1_deceased" value="Não" checked={formData.mother_father_1_deceased === 'Não'} onChange={handleChange} className="mr-1"/>Não</label></div>
                    <input type="text" name="grandparent_1_line_1" value={formData.grandparent_1_line_1} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2" placeholder="Avô(ó) 1" />
                    <input type="text" name="grandparent_2_line_1" value={formData.grandparent_2_line_1} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2" placeholder="Avô(ó) 2" />
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">Pai/Mãe 2</h3>
                  <div className="space-y-3">
                    <div className="flex gap-4 mb-2"><span className="text-sm font-bold">Há pai/mãe 2?</span><label><input type="radio" name="has_mother_father_2" value="Sim" checked={formData.has_mother_father_2 === 'Sim'} onChange={handleChange} className="mr-1"/>Sim</label><label><input type="radio" name="has_mother_father_2" value="Não" checked={formData.has_mother_father_2 === 'Não'} onChange={handleChange} className="mr-1"/>Não</label></div>
                    {formData.has_mother_father_2 === 'Sim' && (
                        <>
                            <input type="text" name="mother_father_2_name" value={formData.mother_father_2_name} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2" placeholder="Nome" />
                            <input type="text" name="mother_father_2_cpf" value={formData.mother_father_2_cpf} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2" placeholder="CPF" />
                            <div className="flex gap-4"><span className="text-sm font-bold">Falecido?</span><label><input type="radio" name="mother_father_2_deceased" value="Sim" checked={formData.mother_father_2_deceased === 'Sim'} onChange={handleChange} className="mr-1"/>Sim</label><label><input type="radio" name="mother_father_2_deceased" value="Não" checked={formData.mother_father_2_deceased === 'Não'} onChange={handleChange} className="mr-1"/>Não</label></div>
                            <input type="text" name="grandparent_1_line_2" value={formData.grandparent_1_line_2} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2" placeholder="Avô(ó) 1" />
                            <input type="text" name="grandparent_2_line_2" value={formData.grandparent_2_line_2} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2" placeholder="Avô(ó) 2" />
                        </>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                 <div><label className="block text-sm font-bold mb-1">Possui Irmãos?</label><select name="has_siblings" value={formData.has_siblings} onChange={handleChange} className="w-full border p-2 rounded"><option value="Selecionar">Selecionar</option><option value="Sim">Sim</option><option value="Não">Não</option></select></div>
                 <div><label className="block text-sm font-bold mb-1">Possui Filhos?</label><div className="flex gap-4"><label><input type="radio" name="has_children" value="Sim" checked={formData.has_children === 'Sim'} onChange={handleChange} className="mr-1"/>Sim</label><label><input type="radio" name="has_children" value="Não" checked={formData.has_children === 'Não'} onChange={handleChange} className="mr-1"/>Não</label></div></div>
                 <div><label className="block text-sm font-bold mb-1">Possui PIA?</label><div className="flex gap-4"><label><input type="radio" name="has_pia" value="Sim" checked={formData.has_pia === 'Sim'} onChange={handleChange} className="mr-1"/>Sim</label><label><input type="radio" name="has_pia" value="Não" checked={formData.has_pia === 'Não'} onChange={handleChange} className="mr-1"/>Não</label></div></div>
              </div>
            </div>
          )}

          {/* ABA 3: DADOS DE SAÚDE */}
          {activeTab === 'health' && (
            <div className="space-y-6 animate-in fade-in">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <label className="block text-sm font-bold mb-2">Possui diagnósticos?</label>
                    <select name="has_health_diagnosis" value={formData.has_health_diagnosis} onChange={handleChange} className="w-full border p-2 rounded mb-2"><option value="Selecionar">Selecionar</option><option value="Sim">Sim</option><option value="Não">Não</option></select>
                    {formData.has_health_diagnosis === 'Sim' && (
                        <div className="grid grid-cols-2 gap-2 pl-2 border-l-2 border-[#458C57]">
                            {['Diabetes', 'Hipertensão', 'Síndrome Alcoólica Fetal', 'Hidrocefalia', 'Outra(s)'].map(i => (
                                <label key={i} className="flex items-center text-sm"><input type="checkbox" checked={formData.health_diagnosis_details?.includes(i)} onChange={(e) => handleCheckboxGroup('health_diagnosis_details', i, e.target.checked)} className="mr-2"/>{i}</label>
                            ))}
                        </div>
                    )}
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <label className="block text-sm font-bold mb-2">Deficiência Física?</label>
                    <select name="has_physical_disability" value={formData.has_physical_disability} onChange={handleChange} className="w-full border p-2 rounded mb-2"><option value="Selecionar">Selecionar</option><option value="Sim">Sim</option><option value="Não">Não</option></select>
                    {formData.has_physical_disability === 'Sim' && (
                        <div className="grid grid-cols-2 gap-2 pl-2 border-l-2 border-[#458C57]">
                            {['Leve', 'Moderada', 'Grave', 'Cadeirante', 'Nanismo'].map(i => (
                                <label key={i} className="flex items-center text-sm"><input type="checkbox" checked={formData.physical_disability_details?.includes(i)} onChange={(e) => handleCheckboxGroup('physical_disability_details', i, e.target.checked)} className="mr-2"/>{i}</label>
                            ))}
                        </div>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><label className="block text-sm font-bold mb-1">Uso de Medicação?</label><div className="flex gap-4"><label><input type="radio" name="medication_use" value="Sim" checked={formData.medication_use === 'Sim'} onChange={handleChange} className="mr-1"/>Sim</label><label><input type="radio" name="medication_use" value="Não" checked={formData.medication_use === 'Não'} onChange={handleChange} className="mr-1"/>Não</label></div></div>
                    <div><label className="block text-sm font-bold mb-1">Possui Laudo?</label><div className="flex gap-4"><label><input type="radio" name="has_medical_report" value="Sim" checked={formData.has_medical_report === 'Sim'} onChange={handleChange} className="mr-1"/>Sim</label><label><input type="radio" name="has_medical_report" value="Não" checked={formData.has_medical_report === 'Não'} onChange={handleChange} className="mr-1"/>Não</label></div></div>
                    <div><label className="block text-sm font-bold mb-1">Dependência Química?</label><div className="flex gap-4"><label><input type="radio" name="has_chemical_dependency" value="Sim" checked={formData.has_chemical_dependency === 'Sim'} onChange={handleChange} className="mr-1"/>Sim</label><label><input type="radio" name="has_chemical_dependency" value="Não" checked={formData.has_chemical_dependency === 'Não'} onChange={handleChange} className="mr-1"/>Não</label></div></div>
                </div>
            </div>
          )}

          {/* ABA 5: DADOS DE PROCESSO */}
          {activeTab === 'process' && (
            <div className="space-y-6 animate-in fade-in">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">1º Processo</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="block text-sm font-bold mb-1">Tipo de Processo</label><select name="process_type" value={formData.process_type} onChange={handleChange} className="w-full border p-2 rounded"><option value="Selecionar">Selecionar</option><option value="Medida Protetiva">Medida Protetiva</option><option value="Destituição Poder Familiar">Destituição Poder Familiar</option></select></div>
                        <div><label className="block text-sm font-bold mb-1">Estado</label><select name="process_state" value={formData.process_state} onChange={handleChange} className="w-full border p-2 rounded"><option value="Selecionar">Selecionar</option><option value="PR">Paraná</option><option value="SP">São Paulo</option></select></div>
                        <div><label className="block text-sm font-bold mb-1">Órgão Julgador</label><select name="judging_body" value={formData.judging_body} onChange={handleChange} className="w-full border p-2 rounded"><option value="Selecionar">Selecionar</option><option value="Vara Infância">Vara Infância</option><option value="Vara Família">Vara Família</option></select></div>
                        <div><label className="block text-sm font-bold mb-1">Número do Processo</label><input type="text" name="process_number" value={formData.process_number} onChange={handleChange} className="w-full border p-2 rounded" placeholder="Número" /></div>
                    </div>
                    <div className="mt-4">
                        <label className="block text-sm font-bold mb-2">Medida Protetiva</label>
                        <div className="space-y-2 max-h-60 overflow-y-auto border p-2 bg-white rounded">
                            {protectiveMeasuresOptions.map((m, idx) => (
                                <label key={idx} className="flex items-start text-xs p-1 hover:bg-gray-50"><input type="checkbox" checked={formData.protective_measures?.includes(m)} onChange={(e) => handleCheckboxGroup('protective_measures', m, e.target.checked)} className="mt-0.5 mr-2"/>{m}</label>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
          )}

          {/* ABA 6: OUTRAS INFORMAÇÕES */}
          {activeTab === 'others' && (
            <div className="space-y-6 animate-in fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold mb-1">Possui benefício?</label>
                        <div className="flex gap-4 mb-2"><label><input type="radio" name="has_gov_benefit" value="Sim" checked={formData.has_gov_benefit === 'Sim'} onChange={handleChange} className="mr-1"/>Sim</label><label><input type="radio" name="has_gov_benefit" value="Não" checked={formData.has_gov_benefit === 'Não'} onChange={handleChange} className="mr-1"/>Não</label></div>
                        {formData.has_gov_benefit === 'Sim' && <select name="gov_benefit_type" value={formData.gov_benefit_type} onChange={handleChange} className="w-full border p-2 rounded"><option value="Selecionar">Selecionar</option><option value="BPC">BPC</option><option value="Pensão">Pensão</option></select>}
                    </div>
                    <div><label className="block text-sm font-bold mb-1">Ameaça de Morte?</label><div className="flex gap-4"><label><input type="radio" name="has_death_threat" value="Sim" checked={formData.has_death_threat === 'Sim'} onChange={handleChange} className="mr-1"/>Sim</label><label><input type="radio" name="has_death_threat" value="Não" checked={formData.has_death_threat === 'Não'} onChange={handleChange} className="mr-1"/>Não</label></div></div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold mb-1">Recebe Visita?</label>
                        <div className="flex gap-4 mb-2"><label><input type="radio" name="receives_visits" value="Sim" checked={formData.receives_visits === 'Sim'} onChange={handleChange} className="mr-1"/>Sim</label><label><input type="radio" name="receives_visits" value="Não" checked={formData.receives_visits === 'Não'} onChange={handleChange} className="mr-1"/>Não</label></div>
                        {formData.receives_visits === 'Sim' && <div className="grid grid-cols-2 gap-4"><input type="text" name="visitor_name" value={formData.visitor_name} onChange={handleChange} className="border p-2 rounded" placeholder="Visitante" /><input type="date" name="last_visit_date" value={formData.last_visit_date} onChange={handleChange} className="border p-2 rounded" /></div>}
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-bold mb-1">Observações</label>
                        <textarea name="observations" value={formData.observations} onChange={handleChange} className="w-full border p-2 rounded" rows={4} maxLength={1000} placeholder="Observações gerais..." />
                        <div className="text-right text-xs text-gray-500">{formData.observations?.length || 0} / 1000</div>
                    </div>
                </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 gap-3 sticky bottom-0 bg-gray-50 p-4 border-t border-gray-200 shadow-inner">
          <button type="button" onClick={() => navigate('/')} className="bg-white py-2 px-6 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
          <button type="submit" disabled={isSubmitting} className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#458C57] hover:bg-[#367044] disabled:opacity-50">
            {isSubmitting ? 'Salvando...' : <><Save className="w-4 h-4 mr-2" /> Salvar Cadastro</>}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChildRegistration;
