import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Child, FamilyMember, HealthTreatment, Commitment } from '../types';

interface NewAdmissionProps {
  isDemo?: boolean;
}

const NewAdmission: React.FC<NewAdmissionProps> = ({ isDemo }) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Initial State Mapping
  const [formData, setFormData] = useState<Partial<Child>>({
    full_name: '', birth_date: '', naturalness: '', uf: '', sex: 'M', filiation: '', filiation_destituted: false,
    autos_number: '', forum_vara: '', birth_certificate: '', cpf: '', reference_contacts: '',
    entry_date: new Date().toISOString().split('T')[0], transferred_from: '', transferred_date: '', responsible_organ: '',
    cnj_guide: '', reference_professional: '', fas_guide: '',
    admission_reason_types: [], admission_reason_other: '', guardianship_council: '', counselor_name: '',
    previous_admissions: false, previous_admissions_local: '',
    socio_educational_measure: false, socio_educational_measure_type: '', death_threats: false,
    ppcaam_evaluated: false, ppcaam_inserted: false, ppcaam_justification: '', street_situation: false,
    race_color: '', hair_color: '', eye_color: '', physical_others: '',
    family_type: '', family_composition: [], responsible_family: '', siblings_in_care: false, siblings_details: '',
    housing_condition: '', construction_type: '', housing_water: true, housing_sewage: true, housing_light: true,
    visits_received: [], visits_frequency: '', return_perspective: '', family_bond_exists: false, weekend_with_family: false, destituted_power: '',
    cras_monitoring: '', creas_monitoring: '', health_unit_monitoring: '', protection_network_monitoring: '', mandatory_notifications: false, referrals: '',
    disabilities: [], needs_perm_care: false, health_others: '', cid: '', health_followup: '', health_treatments: [],
    chemical_dependency: false, drugs_used: [], dependency_treatment: false, health_obs: '',
    school_status: '', education_level: '', school_type: '', school_name: '', school_address: '', school_phone: '',
    work_insertion: '', sports_leisure: '', historical_context: '', current_situation: '',
    commitments: [], final_considerations: ''
  });

  // Dynamic Table Logic
  const addFamilyMember = () => {
    const member: FamilyMember = { name: '', kinship: '', birth_date: '', education_level: '', job: '', occupation: '', income: '' };
    setFormData(prev => ({ ...prev, family_composition: [...(prev.family_composition || []), member] }));
  };

  const removeFamilyMember = (index: number) => {
    setFormData(prev => ({ ...prev, family_composition: prev.family_composition?.filter((_, i) => i !== index) }));
  };

  const updateFamilyMember = (index: number, field: keyof FamilyMember, value: string) => {
    const newComposition = [...(formData.family_composition || [])];
    newComposition[index] = { ...newComposition[index], [field]: value };
    setFormData(prev => ({ ...prev, family_composition: newComposition }));
  };

  const addTreatment = () => {
    const item: HealthTreatment = { treatment: '', local: '', frequency: '', medication: '' };
    setFormData(prev => ({ ...prev, health_treatments: [...(prev.health_treatments || []), item] }));
  };

  const removeTreatment = (index: number) => {
    setFormData(prev => ({ ...prev, health_treatments: prev.health_treatments?.filter((_, i) => i !== index) }));
  };

  const updateTreatment = (index: number, field: keyof HealthTreatment, value: string) => {
    const newItems = [...(formData.health_treatments || [])];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData(prev => ({ ...prev, health_treatments: newItems }));
  };

  const addCommitment = () => {
    const item: Commitment = { commitment: '', responsible: '', network: '', deadline: '', expected_results: '', obtained_results: '' };
    setFormData(prev => ({ ...prev, commitments: [...(prev.commitments || []), item] }));
  };

  const removeCommitment = (index: number) => {
    setFormData(prev => ({ ...prev, commitments: prev.commitments?.filter((_, i) => i !== index) }));
  };

  const updateCommitment = (index: number, field: keyof Commitment, value: string) => {
    const newItems = [...(formData.commitments || [])];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData(prev => ({ ...prev, commitments: newItems }));
  };

  // General Handler
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
        const checked = (e.target as HTMLInputElement).checked;
        setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Checkbox Group Handler (for arrays)
  const handleCheckboxGroup = (name: 'admission_reason_types' | 'visits_received' | 'disabilities' | 'drugs_used', value: string, checked: boolean) => {
    setFormData(prev => {
        const current = prev[name] || [];
        if (checked) return { ...prev, [name]: [...current, value] };
        return { ...prev, [name]: current.filter(item => item !== value) };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (isDemo) {
      setTimeout(() => {
        alert("Ficha PIA completa salva! (Modo Demo)");
        navigate('/');
      }, 1000);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: profile } = await supabase.from('profiles').select('institution_id').eq('id', user.id).single();
      if (!profile) throw new Error("Perfil de instituição não encontrado.");

      const { error: insertError } = await supabase
        .from('children')
        .insert([{ ...formData, institution_id: profile.institution_id }]);

      if (insertError) throw insertError;
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao salvar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <div className="mb-6">
        <Link to="/" className="text-gray-500 hover:text-gray-700 flex items-center mb-2 text-sm">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Voltar
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Plano Individual de Atendimento (PIA)</h1>
        <p className="text-gray-500">Preenchimento obrigatório completo.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 flex items-start">
            <AlertTriangle className="w-5 h-5 text-red-500 mr-2 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* 1. IDENTIFICAÇÃO */}
        <section className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-100 px-6 py-3 border-b border-gray-200 font-bold text-gray-800">1. IDENTIFICAÇÃO / DADOS PESSOAIS</div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-900">Nome Completo</label>
                    <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900 focus:ring-gov-600 focus:border-gov-600" required />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-900">Data Nascimento</label>
                    <input type="date" name="birth_date" value={formData.birth_date} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900 focus:ring-gov-600 focus:border-gov-600" required />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-900">Naturalidade</label>
                    <input type="text" name="naturalness" value={formData.naturalness} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-900">UF</label>
                    <input type="text" name="uf" maxLength={2} value={formData.uf} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900 uppercase" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-900">Sexo</label>
                    <select name="sex" value={formData.sex} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900">
                        <option value="M">Masculino</option>
                        <option value="F">Feminino</option>
                    </select>
                </div>
                <div className="md:col-span-3">
                    <label className="block text-sm font-bold text-gray-900">Filiação</label>
                    <input type="text" name="filiation" value={formData.filiation} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" placeholder="Mãe e Pai" />
                    <div className="mt-1 flex items-center">
                        <input type="checkbox" name="filiation_destituted" checked={formData.filiation_destituted} onChange={handleChange} className="mr-2" />
                        <span className="text-sm text-gray-700">Destituídos do poder familiar?</span>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-900">Autos nº</label>
                    <input type="text" name="autos_number" value={formData.autos_number} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-900">Vara / Fórum</label>
                    <select name="forum_vara" value={formData.forum_vara} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900">
                        <option value="">Selecione...</option>
                        <option value="Foro Central">Foro Central</option>
                        <option value="CIC">CIC</option>
                        <option value="S. Felicidade">S. Felicidade</option>
                        <option value="Pinheirinho">Pinheirinho</option>
                        <option value="Boqueirão">Boqueirão</option>
                        <option value="Bairro Novo">Bairro Novo</option>
                        <option value="Outro">Outro</option>
                    </select>
                </div>
                <div className="md:col-span-3 border-t pt-4 mt-2">
                    <h4 className="font-semibold text-gray-800 mb-2">Documentação</h4>
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-900">Certidão Nascimento</label>
                    <input type="text" name="birth_certificate" value={formData.birth_certificate} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" placeholder="Matrícula / Livro / Folha" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-900">CPF</label>
                    <input type="text" name="cpf" value={formData.cpf} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" />
                </div>
                <div className="md:col-span-3">
                    <label className="block text-sm font-bold text-gray-900">Contatos de Referência</label>
                    <input type="text" name="reference_contacts" value={formData.reference_contacts} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" placeholder="Telefones, nomes..." />
                </div>
            </div>
        </section>

        {/* 2. ACOLHIMENTO */}
        <section className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-100 px-6 py-3 border-b border-gray-200 font-bold text-gray-800">2. INFORMAÇÕES SOBRE ACOLHIMENTO</div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold text-gray-900">Data Acolhimento</label>
                    <input type="date" name="entry_date" value={formData.entry_date} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" required />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-900">Órgão Responsável</label>
                    <input type="text" name="responsible_organ" value={formData.responsible_organ} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-900">Transferido de</label>
                    <input type="text" name="transferred_from" value={formData.transferred_from} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-900">Data Transferência</label>
                    <input type="date" name="transferred_date" value={formData.transferred_date} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-900">Guia CNJ</label>
                    <input type="text" name="cnj_guide" value={formData.cnj_guide} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-900">Guia FAS</label>
                    <input type="text" name="fas_guide" value={formData.fas_guide} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-900">Profissional Referência (Núcleo Psicossocial Vara Infância)</label>
                    <input type="text" name="reference_professional" value={formData.reference_professional} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" />
                </div>
                
                <div className="md:col-span-2 border-t pt-2">
                    <label className="block text-sm font-bold text-gray-900 mb-2">Motivo do Acolhimento</label>
                    <div className="grid grid-cols-2 gap-2">
                        {['Violência Doméstica', 'Situação de Rua', 'Suspeita de Abuso Sexual', 'Exploração Sexual', 'Conflito com a Lei', 'Ameaça de Morte', 'Vínculos Rompidos'].map(reason => (
                             <label key={reason} className="flex items-center space-x-2">
                                <input type="checkbox" checked={formData.admission_reason_types?.includes(reason)} onChange={(e) => handleCheckboxGroup('admission_reason_types', reason, e.target.checked)} />
                                <span className="text-sm text-gray-700">{reason}</span>
                             </label>
                        ))}
                    </div>
                    <input type="text" name="admission_reason_other" value={formData.admission_reason_other} onChange={handleChange} className="mt-2 w-full border-gray-300 rounded-md border p-2 text-gray-900" placeholder="Outros (especifique)" />
                </div>

                <div className="md:col-span-2 grid grid-cols-2 gap-4 pt-2">
                     <div>
                        <label className="block text-sm font-bold text-gray-900">Conselho Tutelar Ref.</label>
                        <input type="text" name="guardianship_council" value={formData.guardianship_council} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" />
                     </div>
                     <div>
                        <label className="block text-sm font-bold text-gray-900">Nome Conselheiro</label>
                        <input type="text" name="counselor_name" value={formData.counselor_name} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" />
                     </div>
                </div>

                <div className="md:col-span-2">
                    <div className="flex items-center space-x-4">
                        <span className="text-sm font-bold text-gray-900">Acolhimentos Anteriores?</span>
                        <label className="inline-flex items-center"><input type="radio" name="previous_admissions" checked={formData.previous_admissions === true} onChange={() => setFormData(p => ({...p, previous_admissions: true}))} className="mr-1"/> Sim</label>
                        <label className="inline-flex items-center"><input type="radio" name="previous_admissions" checked={formData.previous_admissions === false} onChange={() => setFormData(p => ({...p, previous_admissions: false}))} className="mr-1"/> Não</label>
                    </div>
                    {formData.previous_admissions && (
                        <input type="text" name="previous_admissions_local" value={formData.previous_admissions_local} onChange={handleChange} className="mt-1 w-full border-gray-300 rounded-md border p-2 text-gray-900" placeholder="Local" />
                    )}
                </div>
            </div>
        </section>

        {/* 3. VULNERABILIDADES */}
        <section className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-100 px-6 py-3 border-b border-gray-200 font-bold text-gray-800">3. VULNERABILIDADES</div>
            <div className="p-6 space-y-4">
                 <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-gray-900 w-64">Em cumprimento de medida socioeducativa:</span>
                    <label><input type="radio" name="socio_educational_measure" checked={formData.socio_educational_measure} onChange={() => setFormData(p => ({...p, socio_educational_measure: true}))} /> Sim</label>
                    <label><input type="radio" name="socio_educational_measure" checked={!formData.socio_educational_measure} onChange={() => setFormData(p => ({...p, socio_educational_measure: false}))} /> Não</label>
                 </div>
                 {formData.socio_educational_measure && (
                    <select name="socio_educational_measure_type" value={formData.socio_educational_measure_type} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900">
                        <option value="">Selecione a medida...</option>
                        <option value="LA">Liberdade Assistida (LA)</option>
                        <option value="PSC">Prestação de Serviço Comunitário</option>
                    </select>
                 )}

                 <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-gray-900 w-64">Ameaça de morte pós-acolhimento:</span>
                    <label><input type="radio" name="death_threats" checked={formData.death_threats} onChange={() => setFormData(p => ({...p, death_threats: true}))} /> Sim</label>
                    <label><input type="radio" name="death_threats" checked={!formData.death_threats} onChange={() => setFormData(p => ({...p, death_threats: false}))} /> Não</label>
                 </div>

                 <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-gray-900 w-64">Avaliado pelo PPCAAM:</span>
                    <label><input type="radio" name="ppcaam_evaluated" checked={formData.ppcaam_evaluated} onChange={() => setFormData(p => ({...p, ppcaam_evaluated: true}))} /> Sim</label>
                    <label><input type="radio" name="ppcaam_evaluated" checked={!formData.ppcaam_evaluated} onChange={() => setFormData(p => ({...p, ppcaam_evaluated: false}))} /> Não</label>
                 </div>

                 <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-gray-900 w-64">Inserido no PPCAAM:</span>
                    <label><input type="radio" name="ppcaam_inserted" checked={formData.ppcaam_inserted} onChange={() => setFormData(p => ({...p, ppcaam_inserted: true}))} /> Sim</label>
                    <label><input type="radio" name="ppcaam_inserted" checked={!formData.ppcaam_inserted} onChange={() => setFormData(p => ({...p, ppcaam_inserted: false}))} /> Não</label>
                 </div>
                 <input type="text" name="ppcaam_justification" value={formData.ppcaam_justification} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" placeholder="Justifique (PPCAAM)" />

                 <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-gray-900 w-64">Vivência em situação de rua:</span>
                    <label><input type="radio" name="street_situation" checked={formData.street_situation} onChange={() => setFormData(p => ({...p, street_situation: true}))} /> Sim</label>
                    <label><input type="radio" name="street_situation" checked={!formData.street_situation} onChange={() => setFormData(p => ({...p, street_situation: false}))} /> Não</label>
                 </div>
            </div>
        </section>

        {/* 4. CARACTERÍSTICAS FÍSICAS */}
        <section className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
             <div className="bg-gray-100 px-6 py-3 border-b border-gray-200 font-bold text-gray-800">4. CARACTERÍSTICAS FÍSICAS</div>
             <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-bold text-gray-900">Raça/Cor</label>
                    <select name="race_color" value={formData.race_color} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900">
                        <option value="">Selecione...</option>
                        <option value="Branca">Branca</option>
                        <option value="Negra">Negra</option>
                        <option value="Amarela">Amarela</option>
                        <option value="Parda">Parda</option>
                        <option value="Indígena">Indígena</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-900">Cor Cabelo</label>
                    <input type="text" name="hair_color" value={formData.hair_color} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-900">Cor Olhos</label>
                    <input type="text" name="eye_color" value={formData.eye_color} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" />
                </div>
                <div className="md:col-span-3">
                    <label className="block text-sm font-bold text-gray-900">Outros (Cicatrizes, Tatuagens)</label>
                    <input type="text" name="physical_others" value={formData.physical_others} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" />
                </div>
             </div>
        </section>

        {/* 5. SITUAÇÃO FAMILIAR */}
        <section className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
             <div className="bg-gray-100 px-6 py-3 border-b border-gray-200 font-bold text-gray-800">5. SITUAÇÃO FAMILIAR</div>
             <div className="p-6">
                <div className="mb-4">
                    <label className="block text-sm font-bold text-gray-900 mb-1">Tipo de Família</label>
                    <div className="flex gap-4">
                        <label><input type="radio" name="family_type" value="Biológica" checked={formData.family_type === 'Biológica'} onChange={handleChange} /> Biológica</label>
                        <label><input type="radio" name="family_type" value="Substituta" checked={formData.family_type === 'Substituta'} onChange={handleChange} /> Substituta</label>
                        <label><input type="radio" name="family_type" value="Extensa" checked={formData.family_type === 'Extensa'} onChange={handleChange} /> Extensa</label>
                    </div>
                </div>
                
                <h4 className="font-bold text-gray-700 mb-2 border-b pb-1">5.1 Composição Familiar</h4>
                <div className="overflow-x-auto mb-4">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Parentesco</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nascimento</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Escolaridade</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ocupação</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Renda</th>
                                <th className="px-3 py-2"></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {formData.family_composition?.map((member, idx) => (
                                <tr key={idx}>
                                    <td className="p-1"><input type="text" className="w-full border-gray-300 rounded text-sm p-1 text-gray-900" value={member.name} onChange={e => updateFamilyMember(idx, 'name', e.target.value)} /></td>
                                    <td className="p-1"><input type="text" className="w-full border-gray-300 rounded text-sm p-1 text-gray-900" value={member.kinship} onChange={e => updateFamilyMember(idx, 'kinship', e.target.value)} /></td>
                                    <td className="p-1"><input type="date" className="w-full border-gray-300 rounded text-sm p-1 text-gray-900" value={member.birth_date} onChange={e => updateFamilyMember(idx, 'birth_date', e.target.value)} /></td>
                                    <td className="p-1"><input type="text" className="w-full border-gray-300 rounded text-sm p-1 text-gray-900" value={member.education_level} onChange={e => updateFamilyMember(idx, 'education_level', e.target.value)} /></td>
                                    <td className="p-1"><input type="text" className="w-full border-gray-300 rounded text-sm p-1 text-gray-900" value={member.occupation} onChange={e => updateFamilyMember(idx, 'occupation', e.target.value)} /></td>
                                    <td className="p-1"><input type="text" className="w-full border-gray-300 rounded text-sm p-1 text-gray-900" value={member.income} onChange={e => updateFamilyMember(idx, 'income', e.target.value)} /></td>
                                    <td className="p-1"><button type="button" onClick={() => removeFamilyMember(idx)} className="text-red-500"><Trash2 size={16} /></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <button type="button" onClick={addFamilyMember} className="mt-2 text-sm text-gov-700 font-medium flex items-center"><Plus size={16} className="mr-1"/> Adicionar Familiar</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-900">Responsável Familiar</label>
                        <select name="responsible_family" value={formData.responsible_family} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900">
                            <option value="">Selecione...</option>
                            <option value="Pai e Mãe">Pai e Mãe</option>
                            <option value="Mãe">Mãe</option>
                            <option value="Pai">Pai</option>
                            <option value="Avós">Avós</option>
                            <option value="Outros">Outros</option>
                        </select>
                    </div>
                    <div>
                         <div className="flex items-center gap-4 mt-6">
                            <span className="text-sm font-bold text-gray-900">Irmãos em acolhimento?</span>
                            <label><input type="radio" name="siblings_in_care" checked={formData.siblings_in_care} onChange={() => setFormData(p => ({...p, siblings_in_care: true}))} /> Sim</label>
                            <label><input type="radio" name="siblings_in_care" checked={!formData.siblings_in_care} onChange={() => setFormData(p => ({...p, siblings_in_care: false}))} /> Não</label>
                         </div>
                    </div>
                    {formData.siblings_in_care && (
                        <div className="md:col-span-2">
                             <input type="text" name="siblings_details" value={formData.siblings_details} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" placeholder="Nome e local de acolhimento dos irmãos" />
                        </div>
                    )}
                </div>

                <h4 className="font-bold text-gray-700 mb-2 border-b pb-1 pt-2">5.2 Situação Habitacional e Vínculo (5.3)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                         <label className="block text-sm font-bold text-gray-900">Moradia</label>
                         <select name="housing_condition" value={formData.housing_condition} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900">
                             <option value="">Selecione...</option>
                             <option value="Própria">Própria</option>
                             <option value="Alugada">Alugada</option>
                             <option value="Cedida">Cedida</option>
                             <option value="Irregular">Ocupação Irregular</option>
                         </select>
                    </div>
                    <div>
                         <label className="block text-sm font-bold text-gray-900">Construção</label>
                         <select name="construction_type" value={formData.construction_type} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900">
                             <option value="">Selecione...</option>
                             <option value="Alvenaria">Alvenaria</option>
                             <option value="Madeira">Madeira</option>
                             <option value="Mista">Mista</option>
                             <option value="Taipa">Taipa</option>
                         </select>
                    </div>
                    <div className="md:col-span-2 flex gap-6">
                        <label className="flex items-center"><input type="checkbox" checked={formData.housing_water} onChange={(e) => setFormData(p => ({...p, housing_water: e.target.checked}))} className="mr-2" /> Água</label>
                        <label className="flex items-center"><input type="checkbox" checked={formData.housing_sewage} onChange={(e) => setFormData(p => ({...p, housing_sewage: e.target.checked}))} className="mr-2" /> Esgoto</label>
                        <label className="flex items-center"><input type="checkbox" checked={formData.housing_light} onChange={(e) => setFormData(p => ({...p, housing_light: e.target.checked}))} className="mr-2" /> Luz</label>
                    </div>

                    <div className="md:col-span-2 mt-2">
                        <label className="block text-sm font-bold text-gray-900">Recebe visitas de:</label>
                        <div className="flex gap-4 flex-wrap">
                            {['Pais', 'Mãe', 'Pai', 'Irmãos', 'Parentes', 'Outros'].map(v => (
                                <label key={v} className="flex items-center text-sm"><input type="checkbox" checked={formData.visits_received?.includes(v)} onChange={(e) => handleCheckboxGroup('visits_received', v, e.target.checked)} className="mr-1" /> {v}</label>
                            ))}
                        </div>
                        <input type="text" name="visits_frequency" value={formData.visits_frequency} onChange={handleChange} className="mt-2 w-full border-gray-300 rounded-md border p-2 text-gray-900" placeholder="Frequência (Diária, Semanal, Quinzenal...)" />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-900">Vínculo preservado?</label>
                        <div className="flex gap-4">
                           <label><input type="radio" name="family_bond_exists" checked={formData.family_bond_exists} onChange={() => setFormData(p => ({...p, family_bond_exists: true}))} /> Sim</label>
                           <label><input type="radio" name="family_bond_exists" checked={!formData.family_bond_exists} onChange={() => setFormData(p => ({...p, family_bond_exists: false}))} /> Não</label>
                        </div>
                    </div>
                    <div>
                         <label className="block text-sm font-bold text-gray-900">Destituído poder familiar?</label>
                         <select name="destituted_power" value={formData.destituted_power} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900">
                             <option value="">Selecione...</option>
                             <option value="Sim">Sim</option>
                             <option value="Não">Não</option>
                             <option value="Em análise">Em análise</option>
                         </select>
                    </div>
                </div>
                
                <h4 className="font-bold text-gray-700 mb-2 border-b pb-1 pt-4">5.4 Rede Socioassistencial</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <input type="text" name="cras_monitoring" value={formData.cras_monitoring} onChange={handleChange} className="border-gray-300 rounded-md border p-2 text-gray-900" placeholder="CRAS (Qual?)" />
                     <input type="text" name="creas_monitoring" value={formData.creas_monitoring} onChange={handleChange} className="border-gray-300 rounded-md border p-2 text-gray-900" placeholder="CREAS (Qual?)" />
                     <input type="text" name="health_unit_monitoring" value={formData.health_unit_monitoring} onChange={handleChange} className="border-gray-300 rounded-md border p-2 text-gray-900" placeholder="Unidade Saúde (Qual?)" />
                     <input type="text" name="referrals" value={formData.referrals} onChange={handleChange} className="border-gray-300 rounded-md border p-2 text-gray-900" placeholder="Encaminhamentos" />
                </div>
             </div>
        </section>

        {/* 6. SAÚDE */}
        <section className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
             <div className="bg-gray-100 px-6 py-3 border-b border-gray-200 font-bold text-gray-800">6. SITUAÇÃO DE SAÚDE</div>
             <div className="p-6">
                 <div className="mb-4">
                    <label className="block text-sm font-bold text-gray-900">Deficiência</label>
                    <div className="flex gap-4 flex-wrap">
                        {['Mental', 'Visual', 'Auditiva', 'Física', 'Down'].map(d => (
                             <label key={d} className="flex items-center text-sm"><input type="checkbox" checked={formData.disabilities?.includes(d)} onChange={(e) => handleCheckboxGroup('disabilities', d, e.target.checked)} className="mr-1" /> {d}</label>
                        ))}
                    </div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-900">CID</label>
                        <input type="text" name="cid" value={formData.cid} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" />
                    </div>
                    <div>
                         <label className="block text-sm font-bold text-gray-900">Acompanhamento de saúde</label>
                         <input type="text" name="health_followup" value={formData.health_followup} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" />
                    </div>
                 </div>

                 <h4 className="font-bold text-gray-700 mb-2">Tratamentos / Medicamentos</h4>
                 <div className="overflow-x-auto mb-4">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tratamento</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Local</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Frequência</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Medicamento</th>
                                <th className="px-3 py-2"></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {formData.health_treatments?.map((t, idx) => (
                                <tr key={idx}>
                                    <td className="p-1"><input type="text" className="w-full border-gray-300 rounded text-sm p-1 text-gray-900" value={t.treatment} onChange={e => updateTreatment(idx, 'treatment', e.target.value)} /></td>
                                    <td className="p-1"><input type="text" className="w-full border-gray-300 rounded text-sm p-1 text-gray-900" value={t.local} onChange={e => updateTreatment(idx, 'local', e.target.value)} /></td>
                                    <td className="p-1"><input type="text" className="w-full border-gray-300 rounded text-sm p-1 text-gray-900" value={t.frequency} onChange={e => updateTreatment(idx, 'frequency', e.target.value)} /></td>
                                    <td className="p-1"><input type="text" className="w-full border-gray-300 rounded text-sm p-1 text-gray-900" value={t.medication} onChange={e => updateTreatment(idx, 'medication', e.target.value)} /></td>
                                    <td className="p-1"><button type="button" onClick={() => removeTreatment(idx)} className="text-red-500"><Trash2 size={16} /></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <button type="button" onClick={addTreatment} className="mt-2 text-sm text-gov-700 font-medium flex items-center"><Plus size={16} className="mr-1"/> Adicionar Tratamento</button>
                </div>
                
                <div className="border-t pt-4">
                    <label className="flex items-center font-bold text-gray-900 mb-2"><input type="checkbox" checked={formData.chemical_dependency} onChange={(e) => setFormData(p => ({...p, chemical_dependency: e.target.checked}))} className="mr-2" /> Dependência Química?</label>
                    {formData.chemical_dependency && (
                         <div className="p-2 bg-gray-50 rounded">
                             <span className="text-sm font-bold text-gray-700">Drogas Utilizadas:</span>
                             <div className="flex gap-4 flex-wrap mt-1">
                                {['Álcool', 'Tabaco', 'Cocaína', 'Crack', 'Maconha', 'Inalantes'].map(d => (
                                     <label key={d} className="flex items-center text-sm"><input type="checkbox" checked={formData.drugs_used?.includes(d)} onChange={(e) => handleCheckboxGroup('drugs_used', d, e.target.checked)} className="mr-1" /> {d}</label>
                                ))}
                             </div>
                             <div className="mt-2">
                                <label className="flex items-center text-sm text-gray-900"><input type="checkbox" checked={formData.dependency_treatment} onChange={(e) => setFormData(p => ({...p, dependency_treatment: e.target.checked}))} className="mr-2" /> Realiza tratamento?</label>
                             </div>
                         </div>
                    )}
                </div>
             </div>
        </section>

        {/* 7. EDUCACIONAL e 8. TRABALHO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
                <div className="bg-gray-100 px-6 py-3 border-b border-gray-200 font-bold text-gray-800">7. SITUAÇÃO EDUCACIONAL</div>
                <div className="p-6 space-y-4">
                     <select name="school_status" value={formData.school_status} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900">
                         <option value="">Situação Escolar...</option>
                         <option value="Estuda atualmente">Estuda atualmente</option>
                         <option value="Não estuda">Não estuda</option>
                         <option value="Nunca estudou">Nunca estudou</option>
                     </select>
                     <select name="education_level" value={formData.education_level} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900">
                         <option value="">Nível...</option>
                         <option value="Infantil">Educação Infantil</option>
                         <option value="Fundamental">Ens. Fundamental</option>
                         <option value="Médio">Ens. Médio</option>
                         <option value="EJA">EJA</option>
                         <option value="Especial">Especial</option>
                     </select>
                     <input type="text" name="school_name" value={formData.school_name} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" placeholder="Nome Escola" />
                     <input type="text" name="school_phone" value={formData.school_phone} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" placeholder="Telefone" />
                </div>
            </section>

            <section className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
                <div className="bg-gray-100 px-6 py-3 border-b border-gray-200 font-bold text-gray-800">8. TRABALHO / PROFISSIONALIZAÇÃO</div>
                <div className="p-6">
                     <label className="block text-sm font-bold text-gray-900 mb-2">Inserção no Mundo do Trabalho</label>
                     <select name="work_insertion" value={formData.work_insertion} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900">
                         <option value="Não se aplica">Não se aplica</option>
                         <option value="Sim">Sim (Especifique abaixo)</option>
                     </select>
                     {formData.work_insertion === 'Sim' && (
                         <input type="text" name="work_insertion_details" className="mt-2 w-full border-gray-300 rounded-md border p-2 text-gray-900" placeholder="Qual?" />
                     )}
                </div>
            </section>
        </div>

        {/* 9 - 13 SEÇÕES FINAIS */}
        <section className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
             <div className="bg-gray-100 px-6 py-3 border-b border-gray-200 font-bold text-gray-800">OUTROS (9-13)</div>
             <div className="p-6 space-y-4">
                 <div>
                    <label className="block text-sm font-bold text-gray-900">9. Esporte e Lazer</label>
                    <textarea name="sports_leisure" value={formData.sports_leisure} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" rows={2} />
                 </div>
                 <div>
                    <label className="block text-sm font-bold text-gray-900">10. Contexto Histórico</label>
                    <textarea name="historical_context" value={formData.historical_context} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" rows={3} />
                 </div>
                 <div>
                    <label className="block text-sm font-bold text-gray-900">11. Situação Atual</label>
                    <textarea name="current_situation" value={formData.current_situation} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" rows={3} />
                 </div>
                 
                 <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">12. Compromissos Pactuados</label>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Compromisso</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Responsável</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rede</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Prazo</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Res. Esperados</th>
                                    <th className="px-3 py-2"></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {formData.commitments?.map((c, idx) => (
                                    <tr key={idx}>
                                        <td className="p-1"><input type="text" className="w-full border-gray-300 rounded text-sm p-1 text-gray-900" value={c.commitment} onChange={e => updateCommitment(idx, 'commitment', e.target.value)} /></td>
                                        <td className="p-1"><input type="text" className="w-full border-gray-300 rounded text-sm p-1 text-gray-900" value={c.responsible} onChange={e => updateCommitment(idx, 'responsible', e.target.value)} /></td>
                                        <td className="p-1"><input type="text" className="w-full border-gray-300 rounded text-sm p-1 text-gray-900" value={c.network} onChange={e => updateCommitment(idx, 'network', e.target.value)} /></td>
                                        <td className="p-1"><input type="text" className="w-full border-gray-300 rounded text-sm p-1 text-gray-900" value={c.deadline} onChange={e => updateCommitment(idx, 'deadline', e.target.value)} /></td>
                                        <td className="p-1"><input type="text" className="w-full border-gray-300 rounded text-sm p-1 text-gray-900" value={c.expected_results} onChange={e => updateCommitment(idx, 'expected_results', e.target.value)} /></td>
                                        <td className="p-1"><button type="button" onClick={() => removeCommitment(idx)} className="text-red-500"><Trash2 size={16} /></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <button type="button" onClick={addCommitment} className="mt-2 text-sm text-gov-700 font-medium flex items-center"><Plus size={16} className="mr-1"/> Adicionar Compromisso</button>
                    </div>
                 </div>

                 <div>
                    <label className="block text-sm font-bold text-gray-900">13. Considerações Finais</label>
                    <textarea name="final_considerations" value={formData.final_considerations} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" rows={3} />
                 </div>
             </div>
        </section>

        <div className="flex justify-end pt-4 gap-3 sticky bottom-0 bg-gray-50 p-4 border-t border-gray-200 shadow-inner">
          <button type="button" onClick={() => navigate('/')} className="bg-white py-2 px-6 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gov-600">
            Cancelar
          </button>
          <button type="submit" disabled={isSubmitting} className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gov-700 hover:bg-gov-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gov-600 disabled:opacity-50">
            {isSubmitting ? 'Salvando...' : <><Save className="w-4 h-4 mr-2" /> Salvar PIA Completo</>}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewAdmission;