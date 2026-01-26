import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Save, AlertTriangle, Plus, Trash2, User, FileText, Edit, Camera, Printer, MessageSquare, Clock, X, History, Eye, FilePlus, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Child, FamilyMember, HealthTreatment, Commitment, ReferenceContact, PreviousAdmission, ChildPhoto, ChildNote, SiblingInCare } from '../types';
import { jsPDF } from 'jspdf';

interface ChildProfileProps {
    isDemo?: boolean;
}

const ChildProfile: React.FC<ChildProfileProps> = ({ isDemo }) => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hasDisability, setHasDisability] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isRenewing, setIsRenewing] = useState(false);
    const [photos, setPhotos] = useState<ChildPhoto[]>([]);
    const [notes, setNotes] = useState<ChildNote[]>([]);
    const [newNote, setNewNote] = useState('');
    const [isNoteSubmitting, setIsNoteSubmitting] = useState(false);
    const [showNotesModal, setShowNotesModal] = useState(false);
    const [hasUnreadNotes, setHasUnreadNotes] = useState(false);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [showEducationModal, setShowEducationModal] = useState(false);
    const [editingFamilyMember, setEditingFamilyMember] = useState<number | null>(null);

    // History Tabs State
    const [activeTab, setActiveTab] = useState<'profile' | 'history'>('profile');
    const [piaHistory, setPiaHistory] = useState<any[]>([]);
    const [viewingHistoryItem, setViewingHistoryItem] = useState<any | null>(null);
    const viewingInstitutionId = localStorage.getItem('admin_viewing_institution_id');
    const isLocalAdmin = localStorage.getItem('admin_mode') === 'true';
    // Only allow edit if NOT viewing as Master (checking role for local admin bypass)
    const canEdit = !viewingInstitutionId || (isLocalAdmin && localStorage.getItem('admin_role') === 'house_admin');

    const [expandedSections, setExpandedSections] = useState({
        identification: true,
        admission: true,
        vulnerabilities: true,
        physical: true,
        family: true,
        health: true,
        education: true,
        work: true,
        others: true
    });

    const toggleSection = (section: keyof typeof expandedSections) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const educationOptions = [
        "Não alfabetizado", "Ensino Fundamental Incompleto", "Ensino Fundamental Completo",
        "Ensino Médio Incompleto", "Ensino Médio Completo", "Ensino Superior Incompleto",
        "Ensino Superior Completo", "Pós-graduação"
    ];

    const submitAction = useRef<'draft' | 'completed'>('completed');

    // Initial State Mapping
    const [formData, setFormData] = useState<Partial<Child>>({
        full_name: '', date_of_birth: '', naturalness: '', uf: '', sex: 'M',
        mother_name: '', father_name: '', filiation_destituted: false,
        autos_number: '', forum_vara: '', birth_certificate: '', cpf: '', reference_contacts: [],
        first_admission: false,
        arrival_date: '', transferred_from: '', transferred_date: '', responsible_organ: '',
        cnj_guide: '', reference_professional: '', fas_guide: '',
        admission_reason_types: [], admission_reason_other: '', guardianship_council: '', counselor_name: '',
        previous_admissions: false, previous_admissions_local: '', previous_admissions_history: [],
        socio_educational_measure: false, socio_educational_measure_type: '', death_threats: false,
        ppcaam_evaluated: false, ppcaam_inserted: false, ppcaam_justification: '', street_situation: false,
        race_color: '', hair_color: '', eye_color: '', physical_others: '',
        family_type: '', family_composition: [], responsible_family: '', siblings_in_care: false, siblings_details: [],
        housing_condition: '', construction_type: '', housing_water: true, housing_sewage: true, housing_light: true,
        visits_received: [], visits_frequency: '', visits_non_occurrence_reason: '', return_perspective: '', family_bond_exists: false, weekend_with_family: false, destituted_power: '',
        cras_monitoring: '', creas_monitoring: '', health_unit_monitoring: '', protection_network_monitoring: '', mandatory_notifications: false, referrals: '',
        disabilities: [], needs_perm_care: false, health_others: '', cid: '', health_followup: '', health_treatments: [],
        chemical_dependency: false, drugs_used: [], dependency_treatment: false, health_obs: '',
        school_status: '', education_level: '', school_type: '', school_name: '', school_address: '', school_phone: '',
        work_insertion: '', sports_leisure: '', historical_context: '', current_situation: '',
        commitments: [], final_considerations: ''
    });

    useEffect(() => {
        if (id) {
            fetchChildData(id);
            fetchPhotos(id);
            fetchNotes(id);
            fetchPiaHistory(id);
        }
    }, [id, isDemo]);

    useEffect(() => {
        if (location.state) {
            if ((location.state as any).edit && canEdit) setIsEditing(true);
            if ((location.state as any).renew) setIsRenewing(true);
        }
    }, [location]);

    const fetchPiaHistory = async (childId: string) => {
        if (isDemo) {
            setPiaHistory([
                { id: 'h1', created_at: new Date(Date.now() - 86400000 * 30).toISOString(), snapshot: { ...formData, full_name: 'Versão Antiga (Demo)' } },
            ]);
            return;
        }
        const { data } = await supabase
            .from('pia_history')
            .select('*')
            .eq('child_id', childId)
            .order('created_at', { ascending: false });

        if (data) setPiaHistory(data);
    };

    const handleViewHistory = (item: any) => {
        setFormData(item.snapshot);
        setViewingHistoryItem(item);
        setActiveTab('profile');
        setIsEditing(false);
        window.scrollTo(0, 0);
    };

    const handleExitHistoryView = () => {
        setViewingHistoryItem(null);
        if (id) fetchChildData(id); // Reload current data
    };

    const fetchChildData = async (childId: string) => {
        setIsLoading(true);
        if (isDemo) {
            // Mock Data for Demo
            setTimeout(() => {
                setFormData({
                    id: childId,
                    full_name: childId === '1' ? 'Ana Clara Souza' : 'Acolhido Demo',
                    date_of_birth: '2015-05-10',
                    sex: 'F',
                    mother_name: 'Maria Souza',
                    father_name: 'João Silva',
                    arrival_date: '2023-01-15',
                    autos_number: '0001234-56.2023.8.16.0000',
                    admission_reason_types: ['Negligência'],
                    reference_contacts: [{ name: 'Tia Joana', phone: '41 99999-9999', relationship: 'Tia', address: 'Rua X' }],
                    family_composition: [],
                    health_treatments: [],
                    commitments: [],
                    disabilities: [],
                    visits_received: ['Mãe'],
                    visits_frequency: 'Quinzenal'
                });
                setHasDisability(false);
                setIsLoading(false);
            }, 500);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('children')
                .select('*')
                .eq('id', childId)
                .single();

            if (error) throw error;
            if (data) {
                // Ensure siblings_details is an array
                if (typeof data.siblings_details === 'string') {
                    try {
                        data.siblings_details = JSON.parse(data.siblings_details);
                    } catch (e) {
                        data.siblings_details = [];
                    }
                }
                setFormData(data);
                setHasDisability(data.disabilities && data.disabilities.length > 0);
            }
        } catch (err: any) {
            console.error(err);
            setError("Erro ao carregar dados do acolhido.");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchPhotos = async (childId: string) => {
        if (isDemo) {
            setPhotos([
                { id: '1', child_id: childId, url: 'https://via.placeholder.com/150', created_at: new Date().toISOString() }
            ]);
            return;
        }
        const { data } = await supabase
            .from('child_photos')
            .select('*')
            .eq('child_id', childId)
            .order('created_at', { ascending: false });
        if (data) {
            setPhotos(data);
        }
    };

    const fetchNotes = async (childId: string) => {
        if (isDemo) {
            setNotes([
                { id: '1', child_id: childId, institution_id: 'demo', content: 'Criança apresentou febre durante a noite (38.5). Medicada com Dipirona conforme prescrição.', created_at: new Date(Date.now() - 86400000).toISOString() },
                { id: '2', child_id: childId, institution_id: 'demo', content: 'Visita da tia realizada com sucesso. Trouxe roupas novas.', created_at: new Date().toISOString() }
            ]);
            return;
        }
        const { data, error } = await supabase
            .from('child_notes')
            .select('*')
            .eq('child_id', childId)
            .order('created_at', { ascending: false });

        if (!error && data) {
            setNotes(data);

            // Notification Logic: Check if there are notes newer than last view
            if (data.length > 0) {
                const lastViewedStr = localStorage.getItem(`last_viewed_notes_${childId}`);
                const lastViewedTime = lastViewedStr ? new Date(lastViewedStr).getTime() : 0;
                const latestNoteTime = new Date(data[0].created_at).getTime();

                // If latest note is newer than last view (or never viewed), show notification
                setHasUnreadNotes(latestNoteTime > lastViewedTime);
            }
        }
    };

    const handleAddNote = async () => {
        if (!newNote.trim()) return;
        setIsNoteSubmitting(true);

        if (isDemo) {
            const note: ChildNote = {
                id: Math.random().toString(),
                child_id: id!,
                institution_id: 'demo',
                content: newNote,
                created_at: new Date().toISOString()
            };
            setNotes([note, ...notes]);
            setNewNote('');
            setIsNoteSubmitting(false);
            return;
        }

        try {
            let institutionId: string | null = null;
            const isLocalAdmin = localStorage.getItem('admin_mode') === 'true';
            const viewingInstId = localStorage.getItem('admin_viewing_institution_id');

            if (isLocalAdmin) {
                institutionId = viewingInstId || 'admin-bypass';
            } else {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error("Usuário não autenticado");

                const { data: profile } = await supabase.from('profiles').select('institution_id').eq('id', user.id).single();
                if (!profile) throw new Error("Perfil não encontrado");
                institutionId = profile.institution_id;
            }

            const { error } = await supabase.from('child_notes').insert([{
                child_id: id,
                institution_id: profile.institution_id,
                content: newNote
            }]);

            if (error) throw error;
            setNewNote('');
            fetchNotes(id!);
        } catch (err) {
            alert("Erro ao salvar nota.");
        } finally {
            setIsNoteSubmitting(false);
        }
    };

    const handleOpenNotes = () => {
        setShowNotesModal(true);
        setHasUnreadNotes(false);
        // Update last viewed time to now
        localStorage.setItem(`last_viewed_notes_${id}`, new Date().toISOString());
    };

    const handleDeleteNote = async (noteId: string) => {
        if (!confirm("Tem certeza que deseja excluir esta anotação?")) return;

        if (isDemo) {
            setNotes(notes.filter(n => n.id !== noteId));
            return;
        }

        const { error } = await supabase.from('child_notes').delete().eq('id', noteId);
        if (error) {
            alert("Erro ao excluir anotação.");
        } else {
            setNotes(notes.filter(n => n.id !== noteId));
        }
    };

    const handleDeletePhoto = async (photoId: string) => {
        if (!confirm("Tem certeza que deseja excluir esta foto?")) return;

        if (isDemo) {
            setPhotos(photos.filter(p => p.id !== photoId));
            return;
        }

        const { error } = await supabase.from('child_photos').delete().eq('id', photoId);
        if (error) {
            alert("Erro ao excluir foto.");
        } else {
            setPhotos(photos.filter(p => p.id !== photoId));
        }
    };

    const maskPhone = (value: string) => {
        return value
            .replace(/\D/g, '')
            .replace(/^(\d{2})(\d)/g, '($1) $2')
            .replace(/(\d)(\d{4})$/, '$1-$2')
            .slice(0, 15);
    };

    const maskCurrency = (value: string) => {
        const numericValue = value.replace(/\D/g, '');
        if (!numericValue) return '';
        const floatValue = parseFloat(numericValue) / 100;
        return floatValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const handleEducationSelect = (level: string) => {
        if (editingFamilyMember !== null) {
            updateFamilyMember(editingFamilyMember, 'education_level', level);
            setEditingFamilyMember(null);
        }
        setShowEducationModal(false);
    };

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
        if (field === 'income') {
            value = maskCurrency(value);
        }
        newComposition[index] = { ...newComposition[index], [field]: value };
        setFormData(prev => ({ ...prev, family_composition: newComposition }));
    };

    // Reference Contacts Logic
    const addReferenceContact = () => {
        const contact: ReferenceContact = { name: '', phone: '', relationship: '', address: '' };
        setFormData(prev => ({ ...prev, reference_contacts: [...(prev.reference_contacts || []), contact] }));
    };

    const removeReferenceContact = (index: number) => {
        setFormData(prev => ({ ...prev, reference_contacts: prev.reference_contacts?.filter((_, i) => i !== index) }));
    };

    const updateReferenceContact = (index: number, field: keyof ReferenceContact, value: string) => {
        const newContacts = [...(formData.reference_contacts || [])];
        if (field === 'phone') value = maskPhone(value);
        newContacts[index] = { ...newContacts[index], [field]: value };
        setFormData(prev => ({ ...prev, reference_contacts: newContacts }));
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

    const addPreviousAdmission = () => {
        const item: PreviousAdmission = { institution_name: '', entry_date: '', exit_date: '', motive: '' };
        setFormData(prev => ({ ...prev, previous_admissions_history: [...(prev.previous_admissions_history || []), item] }));
    };

    const removePreviousAdmission = (index: number) => {
        setFormData(prev => ({ ...prev, previous_admissions_history: prev.previous_admissions_history?.filter((_, i) => i !== index) }));
    };

    const updatePreviousAdmission = (index: number, field: keyof PreviousAdmission, value: string) => {
        const newItems = [...(formData.previous_admissions_history || [])];
        newItems[index] = { ...newItems[index], [field]: value };
        setFormData(prev => ({ ...prev, previous_admissions_history: newItems }));
    };

    const addSibling = () => {
        const item: any = { name: '', age: '', location: '', date: '' };
        setFormData(prev => ({ ...prev, siblings_details: [...(prev.siblings_details || []), item] }));
    };

    const removeSibling = (index: number) => {
        setFormData(prev => ({ ...prev, siblings_details: prev.siblings_details?.filter((_, i) => i !== index) }));
    };

    const updateSibling = (index: number, field: keyof SiblingInCare, value: string) => {
        const newItems = [...(formData.siblings_details || [])];
        newItems[index] = { ...newItems[index], [field]: value };
        setFormData(prev => ({ ...prev, siblings_details: newItems }));
    };

    // General Handler
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else if (name === 'school_phone') {
            const masked = maskPhone(value);
            setFormData(prev => ({ ...prev, [name]: masked }));
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

    const varaOptions = ['Foro Central', 'CIC', 'S. Felicidade', 'Pinheirinho', 'Boqueirão', 'Bairro Novo'];
    const showVaraInput = formData.forum_vara === 'Outro' || (formData.forum_vara && !varaOptions.includes(formData.forum_vara));

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !id) return;
        const file = e.target.files[0];

        if (isDemo) {
            alert("Upload simulado (Demo)");
            return;
        }

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${id}/${Math.random()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('child-photos').upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage.from('child-photos').getPublicUrl(fileName);

            const { error: dbError } = await supabase.from('child_photos').insert([
                { child_id: id, url: publicUrlData.publicUrl }
            ]);

            if (dbError) throw dbError;
            fetchPhotos(id);
        } catch (err: any) {
            alert("Erro ao fazer upload: " + err.message);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!window.confirm("Ao salvar este PIA, será iniciada a contagem de 3 meses para a próxima reavaliação. Deseja continuar?")) {
            return;
        }

        setIsSubmitting(true);
        setError(null);

        if (isDemo) {
            setTimeout(() => {
                alert(isRenewing ? "Novo PIA gerado (Demo)! Histórico salvo." : "Salvo com sucesso (Demo)!");
                setIsEditing(false);
                setIsRenewing(false);
                setIsSubmitting(false);
            }, 1000);
            return;
        }

        try {
            let institutionId: string | null = null;
            let userId: string | null = null;

            // Check for bypass (admin@admin)
            const isLocalAdmin = localStorage.getItem('admin_mode') === 'true';
            const viewingInstId = localStorage.getItem('admin_viewing_institution_id');

            if (isLocalAdmin) {
                // For editing, we don't strictly need institution context unless we're creating history
                institutionId = viewingInstId || 'admin-bypass';
                userId = 'admin-bypass';
            } else {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error("Usuário não autenticado");
                userId = user.id;
                const { data: profile } = await supabase.from('profiles').select('institution_id').eq('id', user.id).single();
                institutionId = profile?.institution_id;
            }

            // Clean data based on logic
            const payload = {
                ...formData,
                pia_status: submitAction.current,
                last_pia_update: new Date().toISOString()
            };

            // Sanitize date fields (convert empty strings to null)
            if (payload.date_of_birth === '') payload.date_of_birth = null as any;
            if (payload.arrival_date === '') payload.arrival_date = null as any;
            if (payload.transferred_date === '') payload.transferred_date = null as any;

            if (payload.first_admission) {
                payload.transferred_from = '';
                payload.transferred_date = null as any;
            }

            // Lógica de Histórico / Renovação
            if (isRenewing) {
                // 1. Buscar dados atuais para arquivar
                const { data: currentData, error: fetchError } = await supabase
                    .from('children')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (!fetchError && currentData) {
                    // 2. Inserir no histórico
                    // Assume que existe uma tabela 'pia_history' com colunas: child_id, snapshot (jsonb), created_at
                    await supabase.from('pia_history').insert([{
                        child_id: id,
                        snapshot: currentData,
                        created_at: new Date().toISOString(),
                        created_by: userId,
                        institution_id: institutionId
                    }]);
                }
            }

            const { error: updateError } = await supabase
                .from('children')
                .update(payload)
                .eq('id', id);

            if (updateError) throw updateError;
            alert(isRenewing ? "Novo PIA gerado com sucesso! O anterior foi arquivado no histórico." : (submitAction.current === 'draft' ? "Rascunho salvo com sucesso!" : "PIA atualizado com sucesso!"));
            setIsEditing(false);
            setIsRenewing(false);
            // navigate('/'); // Comentado para manter na tela e ver o resultado, ou descomente se preferir voltar
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Erro ao salvar.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const generatePDF = async () => {
        setIsGeneratingPDF(true);
        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 20;
            let yPos = 20;
            const lineHeight = 7;

            // Helper to add text
            const addText = (text: string, isBold: boolean = false, fontSize: number = 12) => {
                doc.setFont("times", isBold ? "bold" : "normal");
                doc.setFontSize(fontSize);

                // Handle long text wrapping
                const splitText = doc.splitTextToSize(text, pageWidth - (margin * 2));
                doc.text(splitText, margin, yPos);
                yPos += (splitText.length * lineHeight);

                // Page break check
                if (yPos > 280) {
                    doc.addPage();
                    yPos = 20;
                }
            };

            // --- HEADER ---
            doc.setFont("times", "bold");
            doc.setFontSize(16);
            doc.text("PLANO INDIVIDUAL DE ATENDIMENTO - PIA", pageWidth / 2, yPos, { align: "center" });
            yPos += 15;

            // --- PHOTO ---
            if (photos.length > 0) {
                try {
                    // Create an image element to load the URL
                    const img = new Image();
                    img.crossOrigin = "Anonymous";
                    img.src = photos[0].url;
                    await new Promise((resolve) => {
                        img.onload = resolve;
                        img.onerror = resolve; // Continue even if error
                    });

                    // Draw image centered (approx 3x4cm ratio -> 30x40mm)
                    doc.addImage(img, "JPEG", (pageWidth - 40) / 2, yPos, 40, 53);
                    yPos += 60;
                } catch (e) {
                    console.error("Erro ao carregar imagem para PDF", e);
                    addText("[Foto não disponível]", false, 10);
                }
            } else {
                yPos += 10;
            }

            // --- NAME ---
            doc.setFontSize(14);
            doc.setFont("times", "bold");
            doc.text(formData.full_name?.toUpperCase() || "NOME NÃO INFORMADO", pageWidth / 2, yPos, { align: "center" });
            yPos += 20;

            // --- SECTIONS ---

            // 1. Identificação
            addText("1. IDENTIFICAÇÃO / DADOS PESSOAIS", true, 12);
            addText(`Data de Nascimento: ${formData.birth_date ? new Date(formData.birth_date).toLocaleDateString('pt-BR') : '-'}`);
            addText(`Naturalidade: ${formData.naturalness || '-'} - ${formData.uf || '-'}`);
            addText(`Sexo: ${formData.sex === 'M' ? 'Masculino' : 'Feminino'}`);
            addText(`Filiação: Mãe: ${formData.mother_name || '-'} | Pai: ${formData.father_name || '-'}`);
            if (formData.filiation_destituted) addText("(Destituídos do poder familiar)");
            addText(`Autos nº: ${formData.autos_number || '-'}`);
            addText(`Vara/Fórum: ${formData.forum_vara || '-'}`);
            addText(`Certidão Nascimento: ${formData.birth_certificate || '-'}`);
            addText(`CPF: ${formData.cpf || '-'}`);

            if (formData.reference_contacts && formData.reference_contacts.length > 0) {
                addText("Contatos de Referência:", true, 11);
                formData.reference_contacts.forEach(c => {
                    addText(`- ${c.name} (${c.relationship}): ${c.phone} - ${c.address}`);
                });
            }
            yPos += 5;

            // 2. Acolhimento
            addText("2. INFORMAÇÕES SOBRE ACOLHIMENTO", true, 12);
            addText(`Primeiro Acolhimento: ${formData.first_admission ? 'Sim' : 'Não'}`);
            addText(`Data de Entrada: ${formData.entry_date ? new Date(formData.entry_date).toLocaleDateString('pt-BR') : '-'}`);
            if (!formData.first_admission) {
                addText(`Transferido de: ${formData.transferred_from || '-'} em ${formData.transferred_date ? new Date(formData.transferred_date).toLocaleDateString('pt-BR') : '-'}`);
            }
            addText(`Motivo: ${formData.admission_reason_types?.join(', ') || '-'}`);
            if (formData.admission_reason_other) addText(`Outros motivos: ${formData.admission_reason_other}`);
            addText(`Órgão Responsável: ${formData.responsible_organ || '-'}`);
            addText(`Guia CNJ: ${formData.cnj_guide || '-'}`);
            addText(`Guia FAS: ${formData.fas_guide || '-'}`);
            addText(`Profissional Ref.: ${formData.reference_professional || '-'}`);
            addText(`Conselho Tutelar: ${formData.guardianship_council || '-'} (Conselheiro: ${formData.counselor_name || '-'})`);

            if (formData.previous_admissions) {
                addText(`Acolhimentos Anteriores: Sim (${formData.previous_admissions_local || '-'})`);
                if (formData.previous_admissions_history && formData.previous_admissions_history.length > 0) {
                    formData.previous_admissions_history.forEach(h => {
                        addText(`- ${h.institution_name} (${h.entry_date ? new Date(h.entry_date).toLocaleDateString('pt-BR') : '?'} a ${h.exit_date ? new Date(h.exit_date).toLocaleDateString('pt-BR') : '?'}) - ${h.motive}`);
                    });
                }
            } else {
                addText("Acolhimentos Anteriores: Não");
            }
            yPos += 5;

            // 3. Vulnerabilidades
            addText("3. VULNERABILIDADES", true, 12);
            addText(`Medida Socioeducativa: ${formData.socio_educational_measure ? `Sim (${formData.socio_educational_measure_type})` : 'Não'}`);
            addText(`Ameaça de Morte: ${formData.death_threats ? 'Sim' : 'Não'}`);
            addText(`PPCAAM: ${formData.ppcaam_inserted ? 'Inserido' : (formData.ppcaam_evaluated ? 'Avaliado' : 'Não')}`);
            if (formData.ppcaam_justification) addText(`Justificativa PPCAAM: ${formData.ppcaam_justification}`);
            addText(`Situação de Rua: ${formData.street_situation ? 'Sim' : 'Não'}`);
            yPos += 5;

            // 4. Características Físicas
            addText("4. CARACTERÍSTICAS FÍSICAS", true, 12);
            addText(`Cor/Raça: ${formData.race_color || '-'}`);
            addText(`Cabelo: ${formData.hair_color || '-'}`);
            addText(`Olhos: ${formData.eye_color || '-'}`);
            addText(`Outros: ${formData.physical_others || '-'}`);
            yPos += 5;

            // 5. Situação Familiar
            addText("5. SITUAÇÃO FAMILIAR", true, 12);
            addText(`Tipo de Família: ${formData.family_type || '-'}`);
            addText(`Responsável Familiar: ${formData.responsible_family || '-'}`);
            addText(`Irmãos em Acolhimento: ${formData.siblings_in_care ? 'Sim' : 'Não'}`);
            if (formData.siblings_in_care && formData.siblings_details && formData.siblings_details.length > 0) {
                formData.siblings_details.forEach(s => {
                    addText(`- ${s.name} (${s.location}) - ${s.date ? new Date(s.date).toLocaleDateString('pt-BR') : '-'}`);
                });
            }

            if (formData.family_composition && formData.family_composition.length > 0) {
                addText("Composição Familiar:", true, 11);
                formData.family_composition.forEach(f => {
                    addText(`- ${f.name} (${f.kinship}), ${f.birth_date ? new Date(f.birth_date).toLocaleDateString('pt-BR') : '-'}, ${f.occupation || '-'}, R$ ${f.income || '-'}`);
                });
            }
            yPos += 5;

            // 5.2 Habitacional e Vínculo
            addText("5.2 HABITAÇÃO E VÍNCULOS", true, 12);
            addText(`Moradia: ${formData.housing_condition || '-'} (${formData.construction_type || '-'})`);
            addText(`Infraestrutura: ${[formData.housing_water && 'Água', formData.housing_sewage && 'Esgoto', formData.housing_light && 'Luz'].filter(Boolean).join(', ') || 'Nenhuma'}`);
            addText(`Visitas de: ${formData.visits_received?.join(', ') || 'Ninguém'}`);
            addText(`Frequência: ${formData.visits_frequency || '-'}`);
            addText(`Vínculo Preservado: ${formData.family_bond_exists ? 'Sim' : 'Não'}`);
            addText(`Destituído Poder Familiar: ${formData.destituted_power || '-'}`);
            yPos += 5;

            // 5.4 Rede
            addText("5.4 REDE SOCIOASSISTENCIAL", true, 12);
            addText(`CRAS: ${formData.cras_monitoring || '-'}`);
            addText(`CREAS: ${formData.creas_monitoring || '-'}`);
            addText(`Unidade Saúde: ${formData.health_unit_monitoring || '-'}`);
            addText(`Encaminhamentos: ${formData.referrals || '-'}`);
            yPos += 5;

            // 6. Saúde
            addText("6. SAÚDE", true, 12);
            addText(`Deficiências: ${formData.disabilities?.length ? formData.disabilities.join(', ') : 'Nenhuma declarada'}`);
            addText(`CID: ${formData.cid || '-'}`);
            addText(`Acompanhamento: ${formData.health_followup || '-'}`);

            if (formData.health_treatments && formData.health_treatments.length > 0) {
                addText("Tratamentos em curso:", true, 11);
                formData.health_treatments.forEach(t => {
                    addText(`- ${t.treatment} (${t.medication}): ${t.frequency} em ${t.local}`);
                });
            } else {
                addText("Nenhum tratamento medicamentoso registrado.");
            }

            addText(`Dependência Química: ${formData.chemical_dependency ? 'Sim' : 'Não'}`);
            if (formData.chemical_dependency) {
                addText(`Substâncias: ${formData.drugs_used?.join(', ') || '-'}`);
                addText(`Tratamento: ${formData.dependency_treatment ? 'Sim' : 'Não'}`);
            }
            yPos += 5;

            // 7. Educação
            addText("7. EDUCAÇÃO", true, 12);
            addText(`Situação: ${formData.school_status || '-'}`);
            addText(`Nível: ${formData.education_level || '-'}`);
            addText(`Escola: ${formData.school_name || '-'} (${formData.school_phone || '-'})`);
            yPos += 5;

            // 8. Trabalho
            addText("8. TRABALHO", true, 12);
            addText(`Inserção: ${formData.work_insertion || '-'}`);
            yPos += 5;

            // 9-11 Outros
            addText("9. OUTROS", true, 12);
            addText(`Esporte e Lazer: ${formData.sports_leisure || '-'}`);
            addText(`Contexto Histórico: ${formData.historical_context || '-'}`);
            addText(`Situação Atual: ${formData.current_situation || '-'}`);
            yPos += 5;

            // 12. Compromissos
            if (formData.commitments && formData.commitments.length > 0) {
                addText("12. COMPROMISSOS PACTUADOS", true, 12);
                formData.commitments.forEach(c => {
                    addText(`- ${c.commitment} (Resp: ${c.responsible}) - Prazo: ${c.deadline}`);
                    addText(`  Rede: ${c.network} | Resultados Esperados: ${c.expected_results}`);
                });
                yPos += 5;
            }

            // 13. Considerações Finais
            addText("13. CONSIDERAÇÕES FINAIS", true, 12);
            addText(formData.final_considerations || "Sem considerações registradas.");

            yPos += 20;

            if (yPos > 220) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFont("times", "bold");
            doc.setFontSize(12);
            doc.text("ASSINATURAS DE COMPROMISSO", margin, yPos);
            yPos += 15;

            doc.setFont("times", "normal");
            doc.text("Assinatura da criança/adolescente: ___________________________________________________", margin, yPos);
            yPos += 15;

            doc.text("Assinatura do técnico de referência: ___________________________________________________", margin, yPos);
            yPos += 6;
            doc.text("******************/FAS************/Psicóloga ***********", margin, yPos);
            yPos += 6;
            doc.text("*********** / FAS ***********/ CRESS ***********", margin, yPos);
            yPos += 15;

            doc.text("Data: ____/____/_______", margin, yPos);

            doc.save(`PIA_${formData.full_name?.replace(/\s+/g, '_')}.pdf`);
        } catch (err) {
            console.error("Erro ao gerar PDF:", err);
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gov-700"></div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto pb-20 print:p-0 print:max-w-none relative">

            {/* --- NOTES POST-IT (Floating) --- */}
            {!viewingInstitutionId && <div className="fixed top-24 right-6 z-40 print:hidden">
                <button
                    onClick={handleOpenNotes}
                    className="relative group transition-transform hover:scale-105"
                    title="Diário de Acolhimento"
                >
                    <div className="absolute top-0 right-0 bg-yellow-200 w-12 h-12 transform rotate-6 shadow-md border border-yellow-300 rounded-sm"></div>
                    <div className="absolute top-0 right-0 bg-yellow-100 w-12 h-12 transform rotate-3 shadow-md border border-yellow-300 rounded-sm"></div>
                    <div className="relative bg-yellow-50 w-12 h-12 shadow-lg border border-yellow-200 flex items-center justify-center hover:bg-yellow-100 transition-colors rounded-sm">
                        <MessageSquare className="text-yellow-700 w-6 h-6" />
                        {hasUnreadNotes && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-sm">
                                !
                            </span>
                        )}
                    </div>
                </button>
            </div>}

            {/* --- NOTES MODAL --- */}
            {showNotesModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm print:hidden p-4">
                    <div className="bg-yellow-50 w-full max-w-md rounded-lg shadow-2xl border-2 border-yellow-200 flex flex-col max-h-[80vh] animate-in fade-in zoom-in duration-200">
                        <div className="p-4 border-b border-yellow-200 flex justify-between items-center bg-yellow-100 rounded-t-lg">
                            <h3 className="font-bold text-yellow-900 flex items-center text-lg">
                                <MessageSquare className="w-5 h-5 mr-2" />
                                Diário de Acolhimento
                            </h3>
                            <button onClick={() => setShowNotesModal(false)} className="text-yellow-800 hover:text-yellow-900 hover:bg-yellow-200 p-1 rounded-full transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-yellow-50/50">
                            {notes.length === 0 && <p className="text-yellow-700 text-sm italic text-center py-4">Nenhuma anotação registrada.</p>}
                            {notes.map(note => (
                                <div key={note.id} className="bg-white p-3 rounded shadow-sm border border-yellow-100 relative group">
                                    <button onClick={() => handleDeleteNote(note.id)} className="absolute top-2 right-2 text-yellow-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" title="Excluir nota">
                                        <Trash2 size={14} />
                                    </button>
                                    <div className="flex items-center text-xs text-gray-400 mb-1">
                                        <Clock className="w-3 h-3 mr-1" />
                                        {new Date(note.created_at).toLocaleString('pt-BR')}
                                    </div>
                                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.content}</p>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 border-t border-yellow-200 bg-yellow-100 rounded-b-lg">
                            <textarea className="w-full border-yellow-300 rounded-md shadow-sm focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm p-2 bg-white" rows={2} placeholder="Nova anotação..." value={newNote} onChange={(e) => setNewNote(e.target.value)}></textarea>
                            <button type="button" onClick={handleAddNote} disabled={isNoteSubmitting || !newNote.trim()} className="mt-2 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none disabled:opacity-50">
                                {isNoteSubmitting ? 'Salvando...' : 'Adicionar Nota'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- EDUCATION MODAL --- */}
            {showEducationModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm print:hidden p-4">
                    <div className="bg-white w-full max-w-sm rounded-lg shadow-xl border border-gray-200 flex flex-col max-h-[80vh]">
                        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-lg">
                            <h3 className="font-bold text-gray-900">Selecione a Escolaridade</h3>
                            <button onClick={() => setShowEducationModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>
                        <div className="overflow-y-auto p-2">
                            {educationOptions.map(opt => (
                                <button key={opt} type="button" onClick={() => handleEducationSelect(opt)} className="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-md text-sm text-gray-700 border-b border-gray-100 last:border-0">{opt}</button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="print:hidden">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <Link to="/" className="text-gray-500 hover:text-gray-700 flex items-center mb-2 text-sm">
                            <ArrowLeft className="w-4 h-4 mr-1" />
                            Voltar ao Painel
                        </Link>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                            <User className="mr-2 text-[#458C57]" />
                            {isRenewing ? "Reavaliação do PIA" : "Perfil do Acolhido"}
                        </h1>
                        <p className="text-gray-500">Visualização e edição do Plano Individual de Atendimento (PIA).</p>
                        {isRenewing && (
                            <div className="mt-4 bg-purple-50 border-l-4 border-purple-500 p-4">
                                <p className="text-sm text-purple-700">
                                    <strong>Modo de Reavaliação:</strong> Ao salvar, os dados atuais serão arquivados no histórico e este formulário definirá o novo PIA vigente.
                                </p>
                            </div>
                        )}
                        {formData.pia_status === 'draft' && (
                            <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                <FileText className="w-3 h-3 mr-1" />
                                Rascunho
                            </div>
                        )}
                    </div>
                </div>

                {/* Tabs Navigation */}
                <div className="mb-6 border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            onClick={() => setActiveTab('profile')}
                            className={`${activeTab === 'profile' ? 'border-[#458C57] text-[#458C57]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors`}
                        >
                            <User className="w-4 h-4 mr-2" />
                            Perfil Atual
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`${activeTab === 'history' ? 'border-[#458C57] text-[#458C57]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors`}
                        >
                            <History className="w-4 h-4 mr-2" />
                            Histórico de PIAs
                        </button>
                    </nav>
                </div>

                {activeTab === 'history' ? (
                    <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden animate-in fade-in">
                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                            <h3 className="text-lg font-medium text-gray-900">Histórico de Alterações (PIA)</h3>
                            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">{piaHistory.length} registros</span>
                        </div>
                        <ul className="divide-y divide-gray-200">
                            {piaHistory.length === 0 ? (
                                <li className="p-12 text-center text-gray-500 flex flex-col items-center">
                                    <History className="w-12 h-12 text-gray-300 mb-2" />
                                    Nenhum histórico registrado para este acolhido.
                                </li>
                            ) : (
                                piaHistory.map((item) => (
                                    <li key={item.id} className="p-4 hover:bg-gray-50 flex justify-between items-center transition-colors group">
                                        <div className="flex items-center">
                                            <div className="bg-blue-50 p-2 rounded-full mr-4 text-blue-600 group-hover:bg-blue-100 transition-colors">
                                                <Clock size={20} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">Versão de {new Date(item.created_at).toLocaleDateString('pt-BR')}</p>
                                                <p className="text-xs text-gray-500">{new Date(item.created_at).toLocaleTimeString('pt-BR')} • Arquivado por renovação/alteração</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleViewHistory(item)}
                                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#458C57]"
                                        >
                                            <Eye className="w-3 h-3 mr-1" />
                                            Visualizar
                                        </button>
                                    </li>
                                ))
                            )}
                        </ul>
                    </div>
                ) : (
                    <>
                        {viewingHistoryItem && (
                            <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 flex justify-between items-center rounded-r-lg shadow-sm animate-in slide-in-from-top-2">
                                <div className="flex items-center">
                                    <History className="text-blue-500 w-5 h-5 mr-3" />
                                    <div>
                                        <p className="text-sm text-blue-800 font-bold">Modo de Visualização de Histórico</p>
                                        <p className="text-xs text-blue-600">Você está vendo a versão salva em: {new Date(viewingHistoryItem.created_at).toLocaleString('pt-BR')}</p>
                                    </div>
                                </div>
                                <button onClick={handleExitHistoryView} className="px-4 py-2 bg-white text-blue-700 text-sm font-medium rounded border border-blue-200 hover:bg-blue-50 transition-colors shadow-sm">
                                    Voltar ao Atual
                                </button>
                            </div>
                        )}

                        {/* Photo Gallery Section */}
                        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 mb-8 print:break-inside-avoid">
                            <div className="flex flex-col md:flex-row gap-6 items-start">
                                <div className="w-full md:w-1/3">
                                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200 flex items-center justify-center relative group">
                                        {photos.length > 0 ? (
                                            <>
                                                <img src={photos[0].url} alt="Foto Atual" className="w-full h-full object-cover" />
                                                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs py-1 text-center backdrop-blur-sm">
                                                    {new Date(photos[0].created_at).toLocaleDateString('pt-BR')}
                                                </div>
                                            </>
                                        ) : (
                                            <User className="w-24 h-24 text-gray-300" />
                                        )}
                                        {photos.length > 0 && (
                                            <button onClick={() => handleDeletePhoto(photos[0].id)} className="absolute top-2 right-2 bg-white/80 p-1.5 rounded-full text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors z-10" title="Excluir foto">
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                        {isEditing && (
                                            <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                                                <div className="text-white flex flex-col items-center">
                                                    <Camera className="w-8 h-8 mb-1" />
                                                    <span className="text-sm font-bold">Alterar Foto</span>
                                                </div>
                                            </label>
                                        )}
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">Galeria de Fotos</h3>
                                    <div className="grid grid-cols-4 gap-2">
                                        {photos.slice(1).map(photo => (
                                            <div key={photo.id} className="aspect-square rounded-md overflow-hidden border border-gray-200 relative group">
                                                <img src={photo.url} alt="Histórico" className="w-full h-full object-cover" />
                                                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] py-0.5 text-center backdrop-blur-sm">
                                                    {new Date(photo.created_at).toLocaleDateString('pt-BR')}
                                                </div>
                                                <button onClick={() => handleDeletePhoto(photo.id)} className="absolute top-1 right-1 bg-white/80 p-1 rounded-full text-red-500 hover:bg-red-50 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity" title="Excluir foto">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                        {photos.length <= 1 && <p className="text-sm text-gray-500 col-span-4">Nenhuma foto antiga.</p>}
                                    </div>
                                </div>
                            </div>
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
                                <button type="button" onClick={() => toggleSection('identification')} className="w-full flex justify-between items-center bg-gray-100 px-6 py-3 border-b border-gray-200 font-bold text-gray-800 hover:bg-gray-200 transition-colors text-left">
                                    <span>1. IDENTIFICAÇÃO / DADOS PESSOAIS</span>
                                    {expandedSections.identification ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </button>
                                {expandedSections.identification && (
                                    <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-bold text-gray-900">Nome Completo</label>
                                            <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900 focus:ring-[#458C57] focus:border-[#458C57]" required disabled={!isEditing} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-900">Data Nascimento</label>
                                            <input type="date" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900 focus:ring-[#458C57] focus:border-[#458C57]" required disabled={!isEditing} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-900">Naturalidade</label>
                                            <input type="text" name="naturalness" value={formData.naturalness} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" disabled={!isEditing} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-900">UF</label>
                                            <input type="text" name="uf" maxLength={2} value={formData.uf} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900 uppercase" disabled={!isEditing} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-900">Sexo</label>
                                            <select name="sex" value={formData.sex} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" disabled={!isEditing}>
                                                <option value="M">Masculino</option>
                                                <option value="F">Feminino</option>
                                            </select>
                                        </div>

                                        {/* Filiação Split */}
                                        <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-bold text-gray-900">Nome da Mãe</label>
                                                <input type="text" name="mother_name" value={formData.mother_name} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" disabled={!isEditing} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-900">Nome do Pai</label>
                                                <input type="text" name="father_name" value={formData.father_name} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" disabled={!isEditing} />
                                            </div>
                                            <div className="md:col-span-2 flex items-center">
                                                <input type="checkbox" name="filiation_destituted" checked={formData.filiation_destituted} onChange={handleChange} className="mr-2" disabled={!isEditing} />
                                                <span className="text-sm text-gray-700">Destituídos do poder familiar?</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-900">Autos nº</label>
                                            <input type="text" name="autos_number" value={formData.autos_number} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" disabled={!isEditing} />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-bold text-gray-900">Vara / Fórum</label>
                                            <select
                                                name="forum_vara"
                                                value={showVaraInput ? 'Outro' : formData.forum_vara}
                                                onChange={(e) => e.target.value === 'Outro' ? setFormData(prev => ({ ...prev, forum_vara: 'Outro' })) : handleChange(e)}
                                                className="w-full border-gray-300 rounded-md border p-2 text-gray-900"
                                                disabled={!isEditing}
                                            >
                                                <option value="">Selecione...</option>
                                                {varaOptions.map(opt => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                                <option value="Outro">Outro</option>
                                            </select>
                                            {showVaraInput && (
                                                <input type="text" name="forum_vara" value={formData.forum_vara === 'Outro' ? '' : formData.forum_vara} onChange={handleChange} className="mt-2 w-full border-gray-300 rounded-md border p-2 text-gray-900" placeholder="Especifique a Vara/Fórum" disabled={!isEditing} />
                                            )}
                                        </div>
                                        <div className="md:col-span-3 border-t pt-4 mt-2">
                                            <h4 className="font-semibold text-gray-800 mb-2">Documentação</h4>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-bold text-gray-900">Certidão Nascimento</label>
                                            <input type="text" name="birth_certificate" value={formData.birth_certificate} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" placeholder="Matrícula / Livro / Folha" disabled={!isEditing} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-900">CPF</label>
                                            <input type="text" name="cpf" value={formData.cpf} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" disabled={!isEditing} />
                                        </div>
                                        <div className="md:col-span-3">
                                            <label className="block text-sm font-bold text-gray-900 mb-2">Contatos de Referência</label>
                                            <div className="overflow-x-auto mb-2">
                                                <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-md">
                                                    <thead className="bg-gray-50 border-b border-gray-200">
                                                        <tr className="divide-x divide-gray-200">
                                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Telefone</th>
                                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vínculo</th>
                                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Endereço/Obs</th>
                                                            <th className="px-3 py-2"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-200">
                                                        {formData.reference_contacts?.map((contact, idx) => (
                                                            <tr key={idx} className="border-b border-gray-200 divide-x divide-gray-200">
                                                                <td className="p-1"><input type="text" className="w-full border-gray-300 rounded text-sm p-1 text-gray-900" value={contact.name} onChange={e => updateReferenceContact(idx, 'name', e.target.value)} placeholder="Nome" disabled={!isEditing} /></td>
                                                                <td className="p-1"><input type="text" className="w-full border-gray-300 rounded text-sm p-1 text-gray-900" value={contact.phone} onChange={e => updateReferenceContact(idx, 'phone', e.target.value)} placeholder="Tel" disabled={!isEditing} /></td>
                                                                <td className="p-1"><input type="text" className="w-full border-gray-300 rounded text-sm p-1 text-gray-900" value={contact.relationship} onChange={e => updateReferenceContact(idx, 'relationship', e.target.value)} placeholder="Ex: Tia" disabled={!isEditing} /></td>
                                                                <td className="p-1"><input type="text" className="w-full border-gray-300 rounded text-sm p-1 text-gray-900" value={contact.address} onChange={e => updateReferenceContact(idx, 'address', e.target.value)} disabled={!isEditing} /></td>
                                                                <td className="p-1 text-center">{isEditing && <button type="button" onClick={() => removeReferenceContact(idx)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            {isEditing && <button type="button" onClick={addReferenceContact} className="text-sm text-[#458C57] font-medium flex items-center"><Plus size={16} className="mr-1" /> Adicionar Contato</button>}
                                        </div>
                                    </div>
                                )}
                            </section>

                            {/* 2. ACOLHIMENTO */}
                            <section className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
                                <button type="button" onClick={() => toggleSection('admission')} className="w-full flex justify-between items-center bg-gray-100 px-6 py-3 border-b border-gray-200 font-bold text-gray-800 hover:bg-gray-200 transition-colors text-left">
                                    <span>2. INFORMAÇÕES SOBRE ACOLHIMENTO</span>
                                    {expandedSections.admission ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </button>
                                {expandedSections.admission && (
                                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">

                                        {/* First Admission Checkbox */}
                                        <div className="md:col-span-2 bg-blue-50 p-3 rounded-md border border-blue-100 mb-2">
                                            <label className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.first_admission}
                                                    onChange={(e) => setFormData(p => ({ ...p, first_admission: e.target.checked }))}
                                                    className="w-5 h-5 text-[#458C57] rounded focus:ring-[#458C57] border-gray-300 mr-3"
                                                    disabled={!isEditing}
                                                />
                                                <span className="font-bold text-gray-900">Este é o primeiro acolhimento institucional da criança/adolescente</span>
                                            </label>
                                        </div>

                                        {!formData.first_admission && (
                                            <div className="md:col-span-2 mb-2">
                                                <div className="flex items-center space-x-4">
                                                    <span className="text-sm font-bold text-gray-900">Acolhimentos Anteriores?</span>
                                                    <label className="inline-flex items-center"><input type="radio" name="previous_admissions" checked={formData.previous_admissions === true} onChange={() => setFormData(p => ({ ...p, previous_admissions: true }))} className="mr-1" disabled={!isEditing} /> Sim</label>
                                                    <label className="inline-flex items-center"><input type="radio" name="previous_admissions" checked={formData.previous_admissions === false} onChange={() => setFormData(p => ({ ...p, previous_admissions: false }))} className="mr-1" disabled={!isEditing} /> Não</label>
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-sm font-bold text-gray-900">Data Acolhimento</label>
                                            <input type="date" name="arrival_date" value={formData.arrival_date} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" required disabled={!isEditing} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-900">Órgão Responsável</label>
                                            <input type="text" name="responsible_organ" value={formData.responsible_organ} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" disabled={!isEditing} />
                                        </div>

                                        {/* Transfer Fields - Hidden if first admission */}
                                        {!formData.first_admission && (
                                            <>
                                                <div>
                                                    <label className="block text-sm font-bold text-gray-900">Transferido de</label>
                                                    <input type="text" name="transferred_from" value={formData.transferred_from} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" disabled={!isEditing} />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-bold text-gray-900">Data Transferência</label>
                                                    <input type="date" name="transferred_date" value={formData.transferred_date} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" disabled={!isEditing} />
                                                </div>

                                                <div className="md:col-span-2 mt-4">
                                                    <label className="block text-sm font-bold text-gray-900 mb-2">Histórico de Acolhimentos Anteriores</label>
                                                    <div className="overflow-x-auto mb-2">
                                                        <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-md">
                                                            <thead className="bg-gray-50 border-b border-gray-200">
                                                                <tr className="divide-x divide-gray-200">
                                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Instituição / Casa Lar</th>
                                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Data Entrada</th>
                                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Data Saída</th>
                                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Motivo Saída/Reingresso</th>
                                                                    <th className="px-3 py-2"></th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="bg-white divide-y divide-gray-200">
                                                                {formData.previous_admissions_history?.map((item, idx) => (
                                                                    <tr key={idx} className="border-b border-gray-200 divide-x divide-gray-200">
                                                                        <td className="p-1"><input type="text" className="w-full border-gray-300 rounded text-sm p-1 text-gray-900" value={item.institution_name} onChange={e => updatePreviousAdmission(idx, 'institution_name', e.target.value)} placeholder="Nome do local" disabled={!isEditing} /></td>
                                                                        <td className="p-1"><input type="date" className="w-full border-gray-300 rounded text-sm p-1 text-gray-900" value={item.entry_date} onChange={e => updatePreviousAdmission(idx, 'entry_date', e.target.value)} disabled={!isEditing} /></td>
                                                                        <td className="p-1"><input type="date" className="w-full border-gray-300 rounded text-sm p-1 text-gray-900" value={item.exit_date} onChange={e => updatePreviousAdmission(idx, 'exit_date', e.target.value)} disabled={!isEditing} /></td>
                                                                        <td className="p-1"><input type="text" className="w-full border-gray-300 rounded text-sm p-1 text-gray-900" value={item.motive} onChange={e => updatePreviousAdmission(idx, 'motive', e.target.value)} placeholder="Motivo" disabled={!isEditing} /></td>
                                                                        <td className="p-1 text-center">{isEditing && <button type="button" onClick={() => removePreviousAdmission(idx)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                    {isEditing && <button type="button" onClick={addPreviousAdmission} className="text-sm text-[#458C57] font-medium flex items-center"><Plus size={16} className="mr-1" /> Adicionar Histórico</button>}
                                                </div>
                                            </>
                                        )}

                                        <div>
                                            <label className="block text-sm font-bold text-gray-900">Guia CNJ</label>
                                            <input type="text" name="cnj_guide" value={formData.cnj_guide} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" disabled={!isEditing} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-900">Guia FAS</label>
                                            <input type="text" name="fas_guide" value={formData.fas_guide} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" disabled={!isEditing} />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-bold text-gray-900">Profissional Referência (Núcleo Psicossocial Vara Infância)</label>
                                            <input type="text" name="reference_professional" value={formData.reference_professional} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" disabled={!isEditing} />
                                        </div>

                                        <div className="md:col-span-2 border-t pt-2">
                                            <label className="block text-sm font-bold text-gray-900 mb-2">Motivo do Acolhimento</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {['Violência Doméstica', 'Situação de Rua', 'Suspeita de Abuso Sexual', 'Exploração Sexual', 'Conflito com a Lei', 'Ameaça de Morte', 'Vínculos Rompidos'].map(reason => (
                                                    <label key={reason} className="flex items-center space-x-2">
                                                        <input type="checkbox" checked={formData.admission_reason_types?.includes(reason)} onChange={(e) => handleCheckboxGroup('admission_reason_types', reason, e.target.checked)} disabled={!isEditing} />
                                                        <span className="text-sm text-gray-700">{reason}</span>
                                                    </label>
                                                ))}
                                            </div>
                                            <input type="text" name="admission_reason_other" value={formData.admission_reason_other} onChange={handleChange} className="mt-2 w-full border-gray-300 rounded-md border p-2 text-gray-900" placeholder="Outros (especifique)" disabled={!isEditing} />
                                        </div>

                                        <div className="md:col-span-2 grid grid-cols-2 gap-4 pt-2">
                                            <div>
                                                <label className="block text-sm font-bold text-gray-900">Conselho Tutelar Ref.</label>
                                                <input type="text" name="guardianship_council" value={formData.guardianship_council} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" disabled={!isEditing} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-900">Nome Conselheiro</label>
                                                <input type="text" name="counselor_name" value={formData.counselor_name} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" disabled={!isEditing} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </section>

                            {/* 3. VULNERABILIDADES */}
                            <section className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
                                <button type="button" onClick={() => toggleSection('vulnerabilities')} className="w-full flex justify-between items-center bg-gray-100 px-6 py-3 border-b border-gray-200 font-bold text-gray-800 hover:bg-gray-200 transition-colors text-left">
                                    <span>3. VULNERABILIDADES</span>
                                    {expandedSections.vulnerabilities ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </button>
                                {expandedSections.vulnerabilities && (
                                    <div className="p-6 space-y-4">
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm font-bold text-gray-900 w-64">Em cumprimento de medida socioeducativa:</span>
                                            <label><input type="radio" name="socio_educational_measure" checked={formData.socio_educational_measure} onChange={() => setFormData(p => ({ ...p, socio_educational_measure: true }))} disabled={!isEditing} /> Sim</label>
                                            <label><input type="radio" name="socio_educational_measure" checked={!formData.socio_educational_measure} onChange={() => setFormData(p => ({ ...p, socio_educational_measure: false }))} disabled={!isEditing} /> Não</label>
                                        </div>
                                        {formData.socio_educational_measure && (
                                            <select name="socio_educational_measure_type" value={formData.socio_educational_measure_type} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" disabled={!isEditing}>
                                                <option value="">Selecione a medida...</option>
                                                <option value="LA">Liberdade Assistida (LA)</option>
                                                <option value="PSC">Prestação de Serviço Comunitário</option>
                                            </select>
                                        )}

                                        <div className="flex items-center gap-4">
                                            <span className="text-sm font-bold text-gray-900 w-64">Ameaça de morte pós-acolhimento:</span>
                                            <label><input type="radio" name="death_threats" checked={formData.death_threats} onChange={() => setFormData(p => ({ ...p, death_threats: true }))} disabled={!isEditing} /> Sim</label>
                                            <label><input type="radio" name="death_threats" checked={!formData.death_threats} onChange={() => setFormData(p => ({ ...p, death_threats: false }))} disabled={!isEditing} /> Não</label>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <span className="text-sm font-bold text-gray-900 w-64">Avaliado pelo PPCAAM:</span>
                                            <label><input type="radio" name="ppcaam_evaluated" checked={formData.ppcaam_evaluated} onChange={() => setFormData(p => ({ ...p, ppcaam_evaluated: true }))} disabled={!isEditing} /> Sim</label>
                                            <label><input type="radio" name="ppcaam_evaluated" checked={!formData.ppcaam_evaluated} onChange={() => setFormData(p => ({ ...p, ppcaam_evaluated: false }))} disabled={!isEditing} /> Não</label>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <span className="text-sm font-bold text-gray-900 w-64">Inserido no PPCAAM:</span>
                                            <label><input type="radio" name="ppcaam_inserted" checked={formData.ppcaam_inserted} onChange={() => setFormData(p => ({ ...p, ppcaam_inserted: true }))} disabled={!isEditing} /> Sim</label>
                                            <label><input type="radio" name="ppcaam_inserted" checked={!formData.ppcaam_inserted} onChange={() => setFormData(p => ({ ...p, ppcaam_inserted: false }))} disabled={!isEditing} /> Não</label>
                                        </div>
                                        <input type="text" name="ppcaam_justification" value={formData.ppcaam_justification} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" placeholder="Justifique (PPCAAM)" disabled={!isEditing} />

                                        <div className="flex items-center gap-4">
                                            <span className="text-sm font-bold text-gray-900 w-64">Vivência em situação de rua:</span>
                                            <label><input type="radio" name="street_situation" checked={formData.street_situation} onChange={() => setFormData(p => ({ ...p, street_situation: true }))} disabled={!isEditing} /> Sim</label>
                                            <label><input type="radio" name="street_situation" checked={!formData.street_situation} onChange={() => setFormData(p => ({ ...p, street_situation: false }))} disabled={!isEditing} /> Não</label>
                                        </div>
                                    </div>
                                )}
                            </section>

                            {/* 4. CARACTERÍSTICAS FÍSICAS */}
                            <section className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
                                <button type="button" onClick={() => toggleSection('physical')} className="w-full flex justify-between items-center bg-gray-100 px-6 py-3 border-b border-gray-200 font-bold text-gray-800 hover:bg-gray-200 transition-colors text-left">
                                    <span>4. CARACTERÍSTICAS FÍSICAS</span>
                                    {expandedSections.physical ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </button>
                                {expandedSections.physical && (
                                    <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-900">Raça/Cor</label>
                                            <select name="race_color" value={formData.race_color} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" disabled={!isEditing}>
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
                                            <select name="hair_color" value={formData.hair_color} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" disabled={!isEditing}>
                                                <option value="">Selecione...</option>
                                                <option value="Preto">Preto</option>
                                                <option value="Castanho Escuro">Castanho Escuro</option>
                                                <option value="Castanho Claro">Castanho Claro</option>
                                                <option value="Louro">Louro</option>
                                                <option value="Ruivo">Ruivo</option>
                                                <option value="Grisalho">Grisalho</option>
                                                <option value="Branco">Branco</option>
                                                <option value="Outro">Outro</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-900">Cor Olhos</label>
                                            <select name="eye_color" value={formData.eye_color} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" disabled={!isEditing}>
                                                <option value="">Selecione...</option>
                                                <option value="Castanho">Castanho</option>
                                                <option value="Preto">Preto</option>
                                                <option value="Azul">Azul</option>
                                                <option value="Verde">Verde</option>
                                                <option value="Mel">Mel</option>
                                                <option value="Outro">Outro</option>
                                            </select>
                                        </div>
                                        <div className="md:col-span-3">
                                            <label className="block text-sm font-bold text-gray-900">Outros (Cicatrizes, Tatuagens)</label>
                                            <input type="text" name="physical_others" value={formData.physical_others} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" disabled={!isEditing} />
                                        </div>
                                    </div>
                                )}
                            </section>

                            {/* 5. SITUAÇÃO FAMILIAR */}
                            <section className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
                                <button type="button" onClick={() => toggleSection('family')} className="w-full flex justify-between items-center bg-gray-100 px-6 py-3 border-b border-gray-200 font-bold text-gray-800 hover:bg-gray-200 transition-colors text-left">
                                    <span>5. SITUAÇÃO FAMILIAR</span>
                                    {expandedSections.family ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </button>
                                {expandedSections.family && (
                                    <div className="p-6">
                                        <div className="mb-4">
                                            <label className="block text-sm font-bold text-gray-900 mb-1">Tipo de Família</label>
                                            <div className="flex gap-4">
                                                <label><input type="radio" name="family_type" value="Biológica" checked={formData.family_type === 'Biológica'} onChange={handleChange} disabled={!isEditing} /> Biológica</label>
                                                <label><input type="radio" name="family_type" value="Substituta" checked={formData.family_type === 'Substituta'} onChange={handleChange} disabled={!isEditing} /> Substituta</label>
                                                <label><input type="radio" name="family_type" value="Extensa" checked={formData.family_type === 'Extensa'} onChange={handleChange} disabled={!isEditing} /> Extensa</label>
                                            </div>
                                        </div>

                                        <h4 className="font-bold text-gray-700 mb-2 border-b pb-1">5.1 Composição Familiar</h4>
                                        <div className="overflow-x-auto mb-4">
                                            <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-md">
                                                <thead className="bg-gray-50 border-b border-gray-200">
                                                    <tr className="divide-x divide-gray-200">
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Parentesco</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nascimento</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Escolaridade</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ocupação</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Renda (R$)</th>
                                                        <th className="px-3 py-2"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {formData.family_composition?.map((member, idx) => (
                                                        <tr key={idx} className="border-b border-gray-200 divide-x divide-gray-200">
                                                            <td className="p-1"><input type="text" className="w-full border-gray-300 rounded text-sm p-1 text-gray-900" value={member.name} onChange={e => updateFamilyMember(idx, 'name', e.target.value)} disabled={!isEditing} /></td>
                                                            <td className="p-1"><input type="text" className="w-full border-gray-300 rounded text-sm p-1 text-gray-900" value={member.kinship} onChange={e => updateFamilyMember(idx, 'kinship', e.target.value)} disabled={!isEditing} /></td>
                                                            <td className="p-1"><input type="date" className="w-full border-gray-300 rounded text-sm p-1 text-gray-900" value={member.birth_date} onChange={e => updateFamilyMember(idx, 'birth_date', e.target.value)} disabled={!isEditing} /></td>
                                                            <td className="p-1">
                                                                <input
                                                                    type="text"
                                                                    className="w-full border-gray-300 rounded text-sm p-1 text-gray-900 cursor-pointer"
                                                                    value={member.education_level}
                                                                    onClick={() => { if (isEditing) { setEditingFamilyMember(idx); setShowEducationModal(true); } }}
                                                                    readOnly
                                                                    placeholder="Selecione..."
                                                                    disabled={!isEditing}
                                                                />
                                                            </td>
                                                            <td className="p-1"><input type="text" className="w-full border-gray-300 rounded text-sm p-1 text-gray-900" value={member.occupation} onChange={e => updateFamilyMember(idx, 'occupation', e.target.value)} disabled={!isEditing} /></td>
                                                            <td className="p-1"><input type="text" className="w-full border-gray-300 rounded text-sm p-1 text-gray-900" value={member.income} onChange={e => updateFamilyMember(idx, 'income', e.target.value)} placeholder="R$ 0,00" disabled={!isEditing} /></td>
                                                            <td className="p-1 text-center">{isEditing && <button type="button" onClick={() => removeFamilyMember(idx)} className="text-red-500"><Trash2 size={16} /></button>}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {isEditing && <button type="button" onClick={addFamilyMember} className="mt-2 text-sm text-[#458C57] font-medium flex items-center"><Plus size={16} className="mr-1" /> Adicionar Familiar</button>}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <label className="block text-sm font-bold text-gray-900">Responsável Familiar</label>
                                                <select name="responsible_family" value={formData.responsible_family} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" disabled={!isEditing}>
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
                                                    <label><input type="radio" name="siblings_in_care" checked={formData.siblings_in_care} onChange={() => setFormData(p => ({ ...p, siblings_in_care: true }))} disabled={!isEditing} /> Sim</label>
                                                    <label><input type="radio" name="siblings_in_care" checked={!formData.siblings_in_care} onChange={() => setFormData(p => ({ ...p, siblings_in_care: false }))} disabled={!isEditing} /> Não</label>
                                                </div>
                                            </div>
                                            {formData.siblings_in_care && (
                                                <div className="md:col-span-2">
                                                    <label className="block text-sm font-bold text-gray-900 mb-2">Detalhes dos Irmãos</label>
                                                    <div className="overflow-x-auto mb-2">
                                                        <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-md">
                                                            <thead className="bg-gray-50 border-b border-gray-200">
                                                                <tr className="divide-x divide-gray-200">
                                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Idade</th>
                                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Local de Acolhimento</th>
                                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                                                                    <th className="px-3 py-2"></th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="bg-white divide-y divide-gray-200">
                                                                {formData.siblings_details?.map((sibling, idx) => (
                                                                    <tr key={idx} className="border-b border-gray-200 divide-x divide-gray-200">
                                                                        <td className="p-1"><input type="text" className="w-full border-gray-300 rounded text-sm p-1 text-gray-900" value={sibling.name} onChange={e => updateSibling(idx, 'name', e.target.value)} placeholder="Nome" disabled={!isEditing} /></td>
                                                                        <td className="p-1"><input type="text" className="w-full border-gray-300 rounded text-sm p-1 text-gray-900" value={(sibling as any).age} onChange={e => updateSibling(idx, 'age' as any, e.target.value)} placeholder="Idade" disabled={!isEditing} /></td>
                                                                        <td className="p-1"><input type="text" className="w-full border-gray-300 rounded text-sm p-1 text-gray-900" value={sibling.location} onChange={e => updateSibling(idx, 'location', e.target.value)} placeholder="Local" disabled={!isEditing} /></td>
                                                                        <td className="p-1"><input type="date" className="w-full border-gray-300 rounded text-sm p-1 text-gray-900" value={sibling.date} onChange={e => updateSibling(idx, 'date', e.target.value)} disabled={!isEditing} /></td>
                                                                        <td className="p-1 text-center">{isEditing && <button type="button" onClick={() => removeSibling(idx)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                    {isEditing && <button type="button" onClick={addSibling} className="text-sm text-[#458C57] font-medium flex items-center"><Plus size={16} className="mr-1" /> Adicionar Irmão</button>}
                                                </div>
                                            )}
                                        </div>

                                        <h4 className="font-bold text-gray-700 mb-2 border-b pb-1 pt-2">5.2 Situação Habitacional e Vínculo (5.3)</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-bold text-gray-900">Moradia</label>
                                                <select name="housing_condition" value={formData.housing_condition} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" disabled={!isEditing}>
                                                    <option value="">Selecione...</option>
                                                    <option value="Própria">Própria</option>
                                                    <option value="Alugada">Alugada</option>
                                                    <option value="Cedida">Cedida</option>
                                                    <option value="Irregular">Ocupação Irregular</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-900">Construção</label>
                                                <select name="construction_type" value={formData.construction_type} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" disabled={!isEditing}>
                                                    <option value="">Selecione...</option>
                                                    <option value="Alvenaria">Alvenaria</option>
                                                    <option value="Madeira">Madeira</option>
                                                    <option value="Mista">Mista</option>
                                                    <option value="Taipa">Taipa</option>
                                                </select>
                                            </div>
                                            <div className="md:col-span-2 flex gap-6">
                                                <label className="flex items-center"><input type="checkbox" checked={formData.housing_water} onChange={(e) => setFormData(p => ({ ...p, housing_water: e.target.checked }))} className="mr-2" disabled={!isEditing} /> Água</label>
                                                <label className="flex items-center"><input type="checkbox" checked={formData.housing_sewage} onChange={(e) => setFormData(p => ({ ...p, housing_sewage: e.target.checked }))} className="mr-2" disabled={!isEditing} /> Esgoto</label>
                                                <label className="flex items-center"><input type="checkbox" checked={formData.housing_light} onChange={(e) => setFormData(p => ({ ...p, housing_light: e.target.checked }))} className="mr-2" disabled={!isEditing} /> Luz</label>
                                            </div>

                                            <div className="md:col-span-2 mt-2">
                                                <label className="block text-sm font-bold text-gray-900">Recebe visitas de:</label>
                                                <label className="flex items-center text-sm font-bold text-gray-900 mb-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.visits_received?.includes('Não ocorrem')}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setFormData(prev => ({ ...prev, visits_received: ['Não ocorrem'] }));
                                                            } else {
                                                                setFormData(prev => ({ ...prev, visits_received: [] }));
                                                            }
                                                        }}
                                                        className="mr-2"
                                                        disabled={!isEditing}
                                                    />
                                                    Não ocorrem
                                                </label>
                                                {!formData.visits_received?.includes('Não ocorrem') ? (
                                                    <>
                                                        <div className="flex gap-4 flex-wrap">
                                                            {['Pais', 'Mãe', 'Pai', 'Irmãos', 'Parentes', 'Outros'].map(v => (
                                                                <label key={v} className="flex items-center text-sm"><input type="checkbox" checked={formData.visits_received?.includes(v)} onChange={(e) => handleCheckboxGroup('visits_received', v, e.target.checked)} className="mr-1" disabled={!isEditing} /> {v}</label>
                                                            ))}
                                                        </div>
                                                        <label className="block text-sm font-bold text-gray-900 mt-2">Frequência das Visitas</label>
                                                        <select name="visits_frequency" value={formData.visits_frequency} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" disabled={!isEditing}>
                                                            <option value="">Selecione...</option>
                                                            <option value="Semanal">Semanal</option>
                                                            <option value="Quinzenal">Quinzenal</option>
                                                            <option value="Mensal">Mensal</option>
                                                            <option value="Bimestral">Bimestral</option>
                                                            <option value="Semestral">Semestral</option>
                                                            <option value="Esporádica">Esporádica</option>
                                                        </select>
                                                    </>
                                                ) : (
                                                    <div className="mt-2">
                                                        <label className="block text-sm font-bold text-gray-900">Motivo da não ocorrência</label>
                                                        <input type="text" name="visits_non_occurrence_reason" value={formData.visits_non_occurrence_reason || ''} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" placeholder="Especifique o motivo..." disabled={!isEditing} />
                                                    </div>
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-sm font-bold text-gray-900">Vínculo preservado?</label>
                                                <div className="flex gap-4">
                                                    <label><input type="radio" name="family_bond_exists" checked={formData.family_bond_exists} onChange={() => setFormData(p => ({ ...p, family_bond_exists: true }))} disabled={!isEditing} /> Sim</label>
                                                    <label><input type="radio" name="family_bond_exists" checked={!formData.family_bond_exists} onChange={() => setFormData(p => ({ ...p, family_bond_exists: false }))} disabled={!isEditing} /> Não</label>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-900">Destituído poder familiar?</label>
                                                <select name="destituted_power" value={formData.destituted_power} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" disabled={!isEditing}>
                                                    <option value="">Selecione...</option>
                                                    <option value="Sim">Sim</option>
                                                    <option value="Não">Não</option>
                                                    <option value="Em análise">Em análise</option>
                                                </select>
                                            </div>
                                        </div>

                                        <h4 className="font-bold text-gray-700 mb-2 border-b pb-1 pt-4">5.4 Rede Socioassistencial</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <input type="text" name="cras_monitoring" value={formData.cras_monitoring} onChange={handleChange} className="border-gray-300 rounded-md border p-2 text-gray-900" placeholder="CRAS (Qual?)" disabled={!isEditing} />
                                            <input type="text" name="creas_monitoring" value={formData.creas_monitoring} onChange={handleChange} className="border-gray-300 rounded-md border p-2 text-gray-900" placeholder="CREAS (Qual?)" disabled={!isEditing} />
                                            <input type="text" name="health_unit_monitoring" value={formData.health_unit_monitoring} onChange={handleChange} className="border-gray-300 rounded-md border p-2 text-gray-900" placeholder="Unidade Saúde (Qual?)" disabled={!isEditing} />
                                            <input type="text" name="referrals" value={formData.referrals} onChange={handleChange} className="border-gray-300 rounded-md border p-2 text-gray-900" placeholder="Encaminhamentos" disabled={!isEditing} />
                                        </div>
                                    </div>
                                )}
                            </section>

                            {/* 6. SAÚDE */}
                            <section className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
                                <button type="button" onClick={() => toggleSection('health')} className="w-full flex justify-between items-center bg-gray-100 px-6 py-3 border-b border-gray-200 font-bold text-gray-800 hover:bg-gray-200 transition-colors text-left">
                                    <span>6. SITUAÇÃO DE SAÚDE</span>
                                    {expandedSections.health ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </button>
                                {expandedSections.health && (
                                    <div className="p-6">
                                        <div className="mb-4">
                                            <label className="block text-sm font-bold text-gray-900">Deficiência</label>

                                            {/* Has Disability Checkbox */}
                                            <div className="mb-2">
                                                <label className="flex items-center text-sm font-medium text-gray-700">
                                                    <input
                                                        type="checkbox"
                                                        checked={hasDisability}
                                                        onChange={(e) => {
                                                            setHasDisability(e.target.checked);
                                                            if (!e.target.checked) {
                                                                setFormData(p => ({ ...p, disabilities: [] }));
                                                            }
                                                        }}
                                                        className="mr-2"
                                                        disabled={!isEditing}
                                                    />
                                                    Possui deficiência
                                                </label>
                                            </div>

                                            {hasDisability && (
                                                <div className="flex gap-4 flex-wrap transition-opacity duration-200">
                                                    {['Mental', 'Visual', 'Auditiva', 'Física', 'Down'].map(d => (
                                                        <label key={d} className="flex items-center text-sm"><input type="checkbox" checked={formData.disabilities?.includes(d)} onChange={(e) => handleCheckboxGroup('disabilities', d, e.target.checked)} className="mr-1" disabled={!isEditing} /> {d}</label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <label className="block text-sm font-bold text-gray-900">CID</label>
                                                <input type="text" name="cid" value={formData.cid} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" disabled={!isEditing} />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-900">Acompanhamento de saúde</label>
                                                <input type="text" name="health_followup" value={formData.health_followup} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" disabled={!isEditing} />
                                            </div>
                                        </div>

                                        <h4 className="font-bold text-gray-700 mb-2">Tratamentos / Medicamentos</h4>
                                        <div className="overflow-x-auto mb-4">
                                            <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-md">
                                                <thead className="bg-gray-50 border-b border-gray-200">
                                                    <tr className="divide-x divide-gray-200">
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tratamento</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Local</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Frequência</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Medicamento</th>
                                                        <th className="px-3 py-2"></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {formData.health_treatments?.map((t, idx) => (
                                                        <tr key={idx} className="border-b border-gray-200 divide-x divide-gray-200">
                                                            <td className="p-1"><input type="text" className="w-full border-gray-300 rounded text-sm p-1 text-gray-900" value={t.treatment} onChange={e => updateTreatment(idx, 'treatment', e.target.value)} disabled={!isEditing} /></td>
                                                            <td className="p-1"><input type="text" className="w-full border-gray-300 rounded text-sm p-1 text-gray-900" value={t.local} onChange={e => updateTreatment(idx, 'local', e.target.value)} disabled={!isEditing} /></td>
                                                            <td className="p-1"><input type="text" className="w-full border-gray-300 rounded text-sm p-1 text-gray-900" value={t.frequency} onChange={e => updateTreatment(idx, 'frequency', e.target.value)} disabled={!isEditing} /></td>
                                                            <td className="p-1"><input type="text" className="w-full border-gray-300 rounded text-sm p-1 text-gray-900" value={t.medication} onChange={e => updateTreatment(idx, 'medication', e.target.value)} disabled={!isEditing} /></td>
                                                            <td className="p-1 text-center">{isEditing && <button type="button" onClick={() => removeTreatment(idx)} className="text-red-500"><Trash2 size={16} /></button>}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {isEditing && <button type="button" onClick={addTreatment} className="mt-2 text-sm text-[#458C57] font-medium flex items-center"><Plus size={16} className="mr-1" /> Adicionar Tratamento</button>}
                                        </div>

                                        <div className="border-t pt-4">
                                            {/* Chemical Dependency Logic: "Não possui" checkbox */}
                                            <label className="flex items-center font-bold text-gray-900 mb-2">
                                                <input
                                                    type="checkbox"
                                                    checked={!formData.chemical_dependency}
                                                    onChange={(e) => setFormData(p => ({ ...p, chemical_dependency: !e.target.checked }))}
                                                    className="mr-2"
                                                    disabled={!isEditing}
                                                />
                                                Não possui dependência química
                                            </label>

                                            {formData.chemical_dependency && (
                                                <div className="p-2 bg-gray-50 rounded">
                                                    <span className="text-sm font-bold text-gray-700">Drogas Utilizadas:</span>
                                                    <div className="flex gap-4 flex-wrap mt-1">
                                                        {['Álcool', 'Tabaco', 'Cocaína', 'Crack', 'Maconha', 'Inalantes'].map(d => (
                                                            <label key={d} className="flex items-center text-sm"><input type="checkbox" checked={formData.drugs_used?.includes(d)} onChange={(e) => handleCheckboxGroup('drugs_used', d, e.target.checked)} className="mr-1" disabled={!isEditing} /> {d}</label>
                                                        ))}
                                                    </div>
                                                    <div className="mt-2">
                                                        <label className="flex items-center text-sm text-gray-900"><input type="checkbox" checked={formData.dependency_treatment} onChange={(e) => setFormData(p => ({ ...p, dependency_treatment: e.target.checked }))} className="mr-2" disabled={!isEditing} /> Realiza tratamento?</label>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </section>

                            {/* 7. EDUCACIONAL e 8. TRABALHO */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <section className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden h-fit">
                                    <button type="button" onClick={() => toggleSection('education')} className="w-full flex justify-between items-center bg-gray-100 px-6 py-3 border-b border-gray-200 font-bold text-gray-800 hover:bg-gray-200 transition-colors text-left">
                                        <span>7. SITUAÇÃO EDUCACIONAL</span>
                                        {expandedSections.education ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </button>
                                    {expandedSections.education && (
                                        <div className="p-6 space-y-4">
                                            <select name="school_status" value={formData.school_status} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" disabled={!isEditing}>
                                                <option value="">Situação Escolar...</option>
                                                <option value="Estuda atualmente">Estuda atualmente</option>
                                                <option value="Não estuda">Não estuda</option>
                                                <option value="Nunca estudou">Nunca estudou</option>
                                            </select>
                                            {formData.school_status !== 'Não estuda' && formData.school_status !== 'Nunca estudou' && (
                                                <>
                                                    <select name="education_level" value={formData.education_level} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" disabled={!isEditing}>
                                                        <option value="">Nível...</option>
                                                        <option value="Infantil">Educação Infantil</option>
                                                        <option value="Fundamental">Ens. Fundamental</option>
                                                        <option value="Médio">Ens. Médio</option>
                                                        <option value="EJA">EJA</option>
                                                        <option value="Especial">Especial</option>
                                                    </select>
                                                    <input type="text" name="school_name" value={formData.school_name} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" placeholder="Nome Escola" disabled={!isEditing} />
                                                    <input type="text" name="school_phone" value={formData.school_phone} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" placeholder="Telefone" disabled={!isEditing} />
                                                </>
                                            )}
                                        </div>
                                    )}
                                </section>

                                <section className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden h-fit">
                                    <button type="button" onClick={() => toggleSection('work')} className="w-full flex justify-between items-center bg-gray-100 px-6 py-3 border-b border-gray-200 font-bold text-gray-800 hover:bg-gray-200 transition-colors text-left">
                                        <span>8. TRABALHO / PROFISSIONALIZAÇÃO</span>
                                        {expandedSections.work ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </button>
                                    {expandedSections.work && (
                                        <div className="p-6">
                                            <label className="block text-sm font-bold text-gray-900 mb-2">Inserção no Mundo do Trabalho</label>
                                            <select name="work_insertion" value={formData.work_insertion} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" disabled={!isEditing}>
                                                <option value="Não se aplica">Não se aplica</option>
                                                <option value="Sim">Sim (Especifique abaixo)</option>
                                            </select>
                                            {formData.work_insertion === 'Sim' && (
                                                <input type="text" name="work_insertion_details" className="mt-2 w-full border-gray-300 rounded-md border p-2 text-gray-900" placeholder="Qual?" disabled={!isEditing} />
                                            )}
                                        </div>
                                    )}
                                </section>
                            </div>

                            {/* 9 - 13 SEÇÕES FINAIS */}
                            <section className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
                                <button type="button" onClick={() => toggleSection('others')} className="w-full flex justify-between items-center bg-gray-100 px-6 py-3 border-b border-gray-200 font-bold text-gray-800 hover:bg-gray-200 transition-colors text-left">
                                    <span>OUTROS (9-13)</span>
                                    {expandedSections.others ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </button>
                                {expandedSections.others && (
                                    <div className="p-6 space-y-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-900">9. Esporte e Lazer</label>
                                            <textarea name="sports_leisure" value={formData.sports_leisure} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" rows={2} disabled={!isEditing} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-900">10. Contexto Histórico</label>
                                            <textarea name="historical_context" value={formData.historical_context} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" rows={3} disabled={!isEditing} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-900">11. Situação Atual</label>
                                            <textarea name="current_situation" value={formData.current_situation} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" rows={3} disabled={!isEditing} />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-gray-900 mb-2">12. Compromissos Pactuados</label>
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-md">
                                                    <thead className="bg-gray-50 border-b border-gray-200">
                                                        <tr className="divide-x divide-gray-200">
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
                                                            <tr key={idx} className="border-b border-gray-200 divide-x divide-gray-200">
                                                                <td className="p-1"><input type="text" className="w-full border-gray-300 rounded text-sm p-1 text-gray-900" value={c.commitment} onChange={e => updateCommitment(idx, 'commitment', e.target.value)} disabled={!isEditing} /></td>
                                                                <td className="p-1"><input type="text" className="w-full border-gray-300 rounded text-sm p-1 text-gray-900" value={c.responsible} onChange={e => updateCommitment(idx, 'responsible', e.target.value)} disabled={!isEditing} /></td>
                                                                <td className="p-1"><input type="text" className="w-full border-gray-300 rounded text-sm p-1 text-gray-900" value={c.network} onChange={e => updateCommitment(idx, 'network', e.target.value)} disabled={!isEditing} /></td>
                                                                <td className="p-1"><input type="text" className="w-full border-gray-300 rounded text-sm p-1 text-gray-900" value={c.deadline} onChange={e => updateCommitment(idx, 'deadline', e.target.value)} disabled={!isEditing} /></td>
                                                                <td className="p-1"><input type="text" className="w-full border-gray-300 rounded text-sm p-1 text-gray-900" value={c.expected_results} onChange={e => updateCommitment(idx, 'expected_results', e.target.value)} disabled={!isEditing} /></td>
                                                                <td className="p-1 text-center">{isEditing && <button type="button" onClick={() => removeCommitment(idx)} className="text-red-500"><Trash2 size={16} /></button>}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                                {isEditing && <button type="button" onClick={addCommitment} className="mt-2 text-sm text-[#458C57] font-medium flex items-center"><Plus size={16} className="mr-1" /> Adicionar Compromisso</button>}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-gray-900">13. Considerações Finais</label>
                                            <textarea name="final_considerations" value={formData.final_considerations} onChange={handleChange} className="w-full border-gray-300 rounded-md border p-2 text-gray-900" rows={3} disabled={!isEditing} />
                                        </div>
                                    </div>
                                )}
                            </section>

                            <div className="flex justify-end pt-4 gap-3 sticky bottom-0 bg-gray-50 p-4 border-t border-gray-200 shadow-inner print:hidden">
                                {!isEditing ? (
                                    <>
                                        <button type="button" onClick={() => navigate('/')} className="bg-white py-2 px-6 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#458C57]">
                                            Voltar
                                        </button>
                                        {!viewingHistoryItem && canEdit && (
                                            <>
                                                <button type="button" onClick={(e) => {
                                                    e.preventDefault();
                                                    setIsEditing(true);
                                                    setIsRenewing(true);
                                                    window.scrollTo(0, 0);
                                                }} className="inline-flex justify-center py-2 px-6 border border-purple-600 shadow-sm text-sm font-medium rounded-md text-purple-600 bg-white hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500">
                                                    <FilePlus className="w-4 h-4 mr-2" /> Reavaliação
                                                </button>
                                                <button type="button" onClick={(e) => {
                                                    e.preventDefault();
                                                    setIsEditing(true);
                                                }} className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#458C57] hover:bg-[#367044] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#458C57]">
                                                    <Edit className="w-4 h-4 mr-2" /> Alterar
                                                </button>
                                            </>
                                        )}
                                        <button type="button" onClick={generatePDF} disabled={isGeneratingPDF} className="ml-3 inline-flex justify-center py-2 px-6 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#458C57] disabled:opacity-50">
                                            {isGeneratingPDF ? 'Gerando...' : <><Printer className="w-4 h-4 mr-2" /> Baixar PDF</>}
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button type="button" onClick={() => { setIsEditing(false); if (id) fetchChildData(id); }} className="bg-white py-2 px-6 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#458C57]">
                                            Cancelar
                                        </button>
                                        <button type="submit" onClick={() => (submitAction.current = 'draft')} formNoValidate disabled={isSubmitting} className="bg-white py-2 px-6 border border-[#458C57] rounded-md shadow-sm text-sm font-medium text-[#458C57] hover:bg-[#88F2A2]/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#458C57] disabled:opacity-50 inline-flex items-center">
                                            <FileText className="w-4 h-4 mr-2" /> Salvar Rascunho
                                        </button>
                                        <button type="submit" onClick={() => (submitAction.current = 'completed')} disabled={isSubmitting} className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#458C57] hover:bg-[#367044] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#458C57] disabled:opacity-50">
                                            {isSubmitting ? 'Salvando...' : <><Save className="w-4 h-4 mr-2" /> Salvar Completo</>}
                                        </button>
                                    </>
                                )}
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};

export default ChildProfile;