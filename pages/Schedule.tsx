import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { Calendar as CalendarIcon, Clock, Plus, Trash2, User, CheckCircle, X, Search, ChevronLeft, ChevronRight, FileText, AlignLeft, ChevronDown } from 'lucide-react';

interface ScheduleProps {
    isDemo?: boolean;
}

const Schedule: React.FC<ScheduleProps> = ({ isDemo }) => {
    const [tasks, setTasks] = useState<any[]>([]);
    const [children, setChildren] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Fix: Use local date instead of UTC to avoid "tomorrow" issue in evenings
    const getLocalDate = () => {
        const offset = new Date().getTimezoneOffset() * 60000;
        const localDate = new Date(Date.now() - offset);
        return localDate.toISOString().split('T')[0];
    };

    const [selectedDate, setSelectedDate] = useState(getLocalDate());
    const [showModal, setShowModal] = useState(false);
    const [newTask, setNewTask] = useState({ child_id: '', title: '', time: '', description: '', date: '' });
    const [submitting, setSubmitting] = useState(false);
    const viewingInstitutionId = localStorage.getItem('admin_viewing_institution_id');
    const isLocalAdmin = localStorage.getItem('admin_mode') === 'true';

    const getInstitutionId = async () => {
        if (viewingInstitutionId) return viewingInstitutionId;

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profile } = await supabase.from('profiles').select('institution_id').eq('id', user.id).single();
            return profile?.institution_id;
        }
        return null;
    };

    const fetchChildren = useCallback(async () => {
        if (isDemo) {
            setChildren([
                { id: '1', full_name: 'Ana Clara Souza' },
                { id: '2', full_name: 'Marcos Vinícius Pereira' }
            ]);
            return;
        }

        try {
            const institutionId = await getInstitutionId();
            if (institutionId) {
                const { data, error } = await supabase
                    .from('children')
                    .select('id, full_name')
                    .eq('institution_id', institutionId)
                    .order('full_name');

                if (error) throw error;
                if (data) setChildren(data);
            }
        } catch (error) {
            console.error("Erro ao buscar crianças:", error);
        }
    }, [isDemo, viewingInstitutionId]);

    const fetchTasks = useCallback(async () => {
        setLoading(true);
        if (isDemo) {
            setTasks([
                { id: '1', child_id: '1', title: 'Consulta Dentista', time: '14:00', description: 'Dr. Silva', completed: false, date: selectedDate, children: { full_name: 'Ana Clara Souza' } },
                { id: '2', child_id: '2', title: 'Psicólogo', time: '09:00', description: 'Sessão semanal', completed: true, date: selectedDate, children: { full_name: 'Marcos Vinícius Pereira' } }
            ]);
            setLoading(false);
            return;
        }

        try {
            const institutionId = await getInstitutionId();
            if (institutionId) {
                const { data: tasksData, error } = await supabase
                    .from('child_tasks')
                    .select('*, children(full_name)')
                    .eq('institution_id', institutionId)
                    .eq('date', selectedDate)
                    .order('time');

                if (error) throw error;
                if (tasksData) setTasks(tasksData);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [isDemo, selectedDate, viewingInstitutionId]);

    useEffect(() => {
        fetchChildren();
    }, [fetchChildren]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        if (isDemo) {
            const child = children.find(c => c.id === newTask.child_id);
            setTasks([...tasks, { ...newTask, id: Math.random().toString(), date: selectedDate, completed: false, children: { full_name: child?.full_name } }]);
            setShowModal(false);
            setNewTask({ child_id: '', title: '', time: '', description: '', date: selectedDate });
            setSubmitting(false);
            return;
        }

        try {
            const institutionId = await getInstitutionId();

            if (!institutionId) throw new Error("Instituição não identificada.");

            const { error } = await supabase.from('child_tasks').insert([{
                institution_id: institutionId,
                child_id: newTask.child_id,
                title: newTask.title,
                date: newTask.date || selectedDate,
                time: newTask.time,
                description: newTask.description,
                completed: false
            }]);

            if (error) throw error;
            fetchTasks();
            setShowModal(false);
            setNewTask({ child_id: '', title: '', time: '', description: '', date: selectedDate });
        } catch (error: any) {
            alert('Erro ao agendar: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const toggleTask = async (task: any) => {
        if (isDemo) {
            setTasks(tasks.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t));
            return;
        }
        await supabase.from('child_tasks').update({ completed: !task.completed }).eq('id', task.id);
        fetchTasks();
    };

    const deleteTask = async (id: string) => {
        if (!confirm('Excluir este compromisso?')) return;
        if (isDemo) {
            setTasks(tasks.filter(t => t.id !== id));
            return;
        }
        const { error } = await supabase.from('child_tasks').delete().eq('id', id);
        if (error) {
            alert('Erro ao excluir: ' + error.message);
        } else {
            fetchTasks();
        }
    };

    const changeDate = (days: number) => {
        const date = new Date(selectedDate);
        date.setDate(date.getDate() + days);
        setSelectedDate(date.toISOString().split('T')[0]);
    };

    const filteredTasks = tasks.filter(task => {
        const childName = task.children?.full_name || '';
        const taskTitle = task.title || '';
        const searchLower = searchTerm.toLowerCase();
        return childName.toLowerCase().includes(searchLower) || taskTitle.toLowerCase().includes(searchLower);
    });

    return (
        <div className="max-w-5xl mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center">
                        <CalendarIcon className="mr-2 text-[#458C57]" />
                        Agenda de Compromissos
                    </h1>
                    <p className="text-slate-500">Gerencie consultas, visitas e atividades dos acolhidos.</p>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg leading-5 bg-white placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#458C57] focus:border-[#458C57] sm:text-sm transition-colors"
                            placeholder="Buscar acolhido..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {(isLocalAdmin || !viewingInstitutionId) && (!viewingInstitutionId || localStorage.getItem('admin_role') === 'house_admin') && (
                        <button onClick={() => { setNewTask(prev => ({ ...prev, date: selectedDate })); setShowModal(true); }} className="bg-[#458C57] text-white px-4 py-2 rounded-lg hover:bg-[#367044] flex items-center shadow-sm transition-colors whitespace-nowrap">
                            <Plus className="w-5 h-5 mr-2" /> Novo
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <button onClick={() => changeDate(-1)} className="p-2 hover:bg-slate-200 rounded-full text-slate-600"><ChevronLeft size={20} /></button>
                    <div className="flex items-center gap-2">
                        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent border-none font-bold text-lg text-slate-800 focus:ring-0 cursor-pointer" />
                    </div>
                    <button onClick={() => changeDate(1)} className="p-2 hover:bg-slate-200 rounded-full text-slate-600"><ChevronRight size={20} /></button>
                </div>

                <div className="divide-y divide-slate-100">
                    {loading ? <div className="p-8 text-center text-slate-500">Carregando agenda...</div> : filteredTasks.length === 0 ? <div className="p-12 text-center flex flex-col items-center text-slate-400"><CalendarIcon size={48} className="mb-4 opacity-20" /><p>{searchTerm ? 'Nenhum compromisso encontrado.' : 'Nenhum compromisso agendado para este dia.'}</p></div> : filteredTasks.map(task => (
                        <div key={task.id} className={`p-4 flex items-center hover:bg-slate-50 transition-colors ${task.completed ? 'opacity-60' : ''}`}>
                            <button onClick={() => toggleTask(task)} className={`mr-4 flex-shrink-0 ${task.completed ? 'text-green-500' : 'text-slate-300 hover:text-green-500'}`}><CheckCircle size={24} className={task.completed ? 'fill-green-100' : ''} /></button>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center mb-1"><span className="font-bold text-slate-800 mr-3">{task.time.slice(0, 5)}</span><span className={`text-sm font-medium px-2 py-0.5 rounded-full ${task.completed ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>{task.title}</span></div>
                                <div className="flex items-center text-sm text-slate-600"><User size={14} className="mr-1" /><span className="font-medium mr-2">{task.children?.full_name}</span>{task.description && <span className="text-slate-400 border-l border-slate-300 pl-2 ml-2">{task.description}</span>}</div>
                            </div>
                            {(isLocalAdmin || !viewingInstitutionId) && (!viewingInstitutionId || localStorage.getItem('admin_role') === 'house_admin') && <button onClick={() => deleteTask(task.id)} className="ml-2 text-slate-400 hover:text-red-500 p-2"><Trash2 size={18} /></button>}
                        </div>
                    ))}
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-[#458C57] text-white"><h3 className="font-bold text-lg flex items-center"><CalendarIcon className="mr-2" size={20} /> Novo Compromisso</h3><button onClick={() => setShowModal(false)} className="text-white/80 hover:text-white transition-colors"><X size={20} /></button></div>
                        <form onSubmit={handleAddTask} className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">Acolhido</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                        <User size={18} />
                                    </div>
                                    <select required className="w-full pl-10 border-2 border-slate-200 bg-slate-50 rounded-xl px-3 py-2.5 text-slate-900 focus:bg-white focus:border-[#458C57] focus:ring-[#458C57] focus:outline-none transition-all shadow-sm appearance-none" value={newTask.child_id} onChange={e => setNewTask({ ...newTask, child_id: e.target.value })}>
                                        <option value="">Selecione o acolhido...</option>
                                        {children.length > 0 ? (
                                            children.map(c => (<option key={c.id} value={c.id}>{c.full_name}</option>))
                                        ) : (
                                            <option value="" disabled>Nenhum acolhido encontrado</option>
                                        )}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                                        <ChevronDown size={16} />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">Título / Descrição Curta</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                        <FileText size={18} />
                                    </div>
                                    <input type="text" required className="w-full pl-10 border-2 border-slate-200 bg-slate-50 rounded-xl px-3 py-2.5 text-slate-900 focus:bg-white focus:border-[#458C57] focus:ring-[#458C57] focus:outline-none transition-all shadow-sm placeholder:text-slate-400" placeholder="Ex: Consulta Dentista" value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">Data</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                            <CalendarIcon size={18} />
                                        </div>
                                        <input type="date" required className="w-full pl-10 border-2 border-slate-200 bg-slate-50 rounded-xl px-3 py-2.5 text-slate-900 focus:bg-white focus:border-[#458C57] focus:ring-[#458C57] focus:outline-none transition-all shadow-sm" value={newTask.date} onChange={e => setNewTask({ ...newTask, date: e.target.value })} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">Horário</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                            <Clock size={18} />
                                        </div>
                                        <input type="time" required className="w-full pl-10 border-2 border-slate-200 bg-slate-50 rounded-xl px-3 py-2.5 text-slate-900 focus:bg-white focus:border-[#458C57] focus:ring-[#458C57] focus:outline-none transition-all shadow-sm" value={newTask.time} onChange={e => setNewTask({ ...newTask, time: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">Detalhes / Observações</label>
                                <div className="relative">
                                    <div className="absolute top-3 left-3 pointer-events-none text-slate-400">
                                        <AlignLeft size={18} />
                                    </div>
                                    <textarea className="w-full pl-10 border-2 border-slate-200 bg-slate-50 rounded-xl px-3 py-2.5 text-slate-900 focus:bg-white focus:border-[#458C57] focus:ring-[#458C57] focus:outline-none transition-all shadow-sm min-h-[100px]" rows={4} placeholder="Adicione detalhes importantes sobre o compromisso..." value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} />
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 gap-3">
                                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl font-bold transition-colors">Cancelar</button>
                                <button type="submit" disabled={submitting} className="px-5 py-2.5 bg-[#458C57] text-white rounded-xl hover:bg-[#367044] font-bold shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center">
                                    {submitting ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Salvando...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle size={18} className="mr-2" />
                                            Confirmar Agendamento
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
export default Schedule;
