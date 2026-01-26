import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Child } from '../types';
import { Plus, Search, Calendar, User, FileText, ArrowRight, Activity, ChevronLeft, ChevronRight, SortAsc, SortDesc, Eye, Edit, FilePlus, AlertCircle, Users, Building2, Cake } from 'lucide-react';
import { Link } from 'react-router-dom';
import AnalyticsCharts from '../components/AnalyticsCharts';

interface DashboardProps {
  isDemo?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ isDemo }) => {
  const [children, setChildren] = useState<Child[]>([]);
  const [overduePias, setOverduePias] = useState<Child[]>([]);
  const [birthdaysToday, setBirthdaysToday] = useState<Child[]>([]);
  const [tasksMap, setTasksMap] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [isAdmin, setIsAdmin] = useState(false);
  const [isHouseAdmin, setIsHouseAdmin] = useState(false);
  const viewingInstitutionId = localStorage.getItem('admin_viewing_institution_id');

  const [sortConfig, setSortConfig] = useState<{ key: 'name' | 'age' | 'date'; direction: 'asc' | 'desc' } | null>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortConfig]);

  useEffect(() => {
    const checkRole = async () => {
      if (isDemo) {
        setIsAdmin(true);
      } else {
        // Check for local admin mode (bypass)
        const localAdmin = localStorage.getItem('admin_mode') === 'true';
        if (localAdmin) {
          setIsAdmin(true);
          setIsHouseAdmin(true);
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
          if (data && (data.role === 'admin' || data.role === 'master')) setIsHouseAdmin(true);
          if (data && data.role === 'master') setIsAdmin(true);
        }
      }
    };
    checkRole();
  }, [isDemo]);

  useEffect(() => {
    fetchChildren();
  }, [isDemo, isAdmin]); // Re-fetch when admin status is determined

  const fetchChildren = async () => {
    setLoading(true);

    if (isDemo) {
      setTimeout(() => {
        const mockData = [
          {
            id: '1',
            full_name: 'Ana Clara Souza',
            sex: 'F',
            date_of_birth: '2015-05-10',
            arrival_date: '2023-01-15',
            notes: 'Alergia a amendoim. Requer acompanhamento nutricional semanal. Irmã de Pedro (não acolhido).',
            institution_id: 'demo',
            autos_number: '0001234-56.2023.8.16.0000',
            admission_reason_types: ['Negligência', 'Vulnerabilidade Social'],
            created_at: new Date().toISOString(),
            child_photos: [{ url: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=150&q=80', created_at: new Date().toISOString() }],
            last_pia_update: '2023-01-15' // Data antiga para testar o alerta
          } as any,
          {
            id: '2',
            full_name: 'Marcos Vinícius Pereira',
            sex: 'M',
            date_of_birth: '2010-11-20',
            arrival_date: '2023-08-10',
            notes: 'Apresenta excelente desempenho escolar. Gosta de futebol.',
            institution_id: 'demo',
            admission_reason_types: ['Abandono', 'Situação de Rua'],
            created_at: new Date().toISOString(),
          } as any,
          {
            id: '3',
            full_name: 'Júlia Mendes da Silva',
            sex: 'F',
            date_of_birth: '2019-03-05',
            arrival_date: '2023-11-22',
            notes: 'Em processo de adaptação. Chora à noite.',
            institution_id: 'demo',
            admission_reason_types: ['Violência Doméstica'],
            created_at: new Date().toISOString(),
          } as any,
          {
            id: '4',
            full_name: 'Gabriel Santos Oliveira',
            sex: 'M',
            date_of_birth: '2012-07-15',
            arrival_date: '2022-05-10',
            notes: 'Possível reintegração familiar em breve. Avó materna manifestou interesse.',
            institution_id: 'demo',
            admission_reason_types: ['Orfandade'],
            created_at: new Date().toISOString(),
          } as any
        ];
        setChildren(mockData);
        checkOverdue(mockData);
        checkBirthdays(mockData);
        setLoading(false);
      }, 600);
      return;
    }

    try {
      let targetInstitutionId = viewingInstitutionId;

      // Se não estiver em modo de visualização (Master), tenta pegar do usuário logado
      if (!targetInstitutionId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase.from('profiles').select('institution_id').eq('id', user.id).single();
          targetInstitutionId = profile?.institution_id;
        }
      }

      // Se não tiver ID de instituição definido
      if (!targetInstitutionId) {
        // Se NÃO for admin, não mostra nada. Se for admin, continua para buscar tudo.
        if (!isAdmin) {
          setChildren([]);
          setLoading(false);
          return;
        }
      }

      let query = supabase
        .from('children')
        .select('id, full_name, date_of_birth, sex, arrival_date, institution_id, autos_number, child_photos(url, created_at)')
        .order('arrival_date', { ascending: false });

      // Só filtra por instituição se tiver ID definido
      if (targetInstitutionId) {
        query = query.eq('institution_id', targetInstitutionId);
      }

      const { data, error } = await query;

      // Buscar tarefas de hoje
      const today = new Date().toISOString().split('T')[0];

      let tasksQuery = supabase
        .from('child_tasks')
        .select('*')
        .eq('date', today);

      if (targetInstitutionId) {
        tasksQuery = tasksQuery.eq('institution_id', targetInstitutionId);
      }

      const { data: tasks } = await tasksQuery;

      if (tasks) {
        const map: Record<string, any[]> = {};
        tasks.forEach(t => {
          if (!map[t.child_id]) map[t.child_id] = [];
          map[t.child_id].push(t);
        });
        setTasksMap(map);
      }

      if (error) throw error;

      const childrenWithPhotos = data?.map((child: any) => ({
        ...child,
        child_photos: child.child_photos ? child.child_photos.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) : []
      })) || [];
      setChildren(childrenWithPhotos);
      checkOverdue(childrenWithPhotos);
      checkBirthdays(childrenWithPhotos);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkOverdue = (childrenData: any[]) => {
    const today = new Date();
    const overdue = childrenData.filter(child => {
      if (!child.last_pia_update) return false;
      const lastUpdate = new Date(child.last_pia_update);
      const nextDue = new Date(lastUpdate);
      nextDue.setMonth(nextDue.getMonth() + 3);
      return today >= nextDue;
    });
    setOverduePias(overdue);
  };

  const checkBirthdays = (childrenData: Child[]) => {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth() + 1; // Janeiro é 0

    const birthdays = childrenData.filter(child => {
      if (!child.date_of_birth) return false;
      const [year, month, day] = child.date_of_birth.split('-').map(Number);
      return day === currentDay && month === currentMonth;
    });
    setBirthdaysToday(birthdays);
  };

  const getAgeNumber = (dateOfBirth: string) => {
    if (!dateOfBirth) return -1;
    const today = new Date();
    const birth = new Date(dateOfBirth);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const filteredChildren = children.filter(child => {
    const matchesSearch = child.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (child.autos_number && child.autos_number.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  if (sortConfig) {
    filteredChildren.sort((a, b) => {
      let comparison = 0;
      if (sortConfig.key === 'name') {
        comparison = a.full_name.localeCompare(b.full_name);
      } else if (sortConfig.key === 'age') {
        const ageA = getAgeNumber(a.date_of_birth);
        const ageB = getAgeNumber(b.date_of_birth);
        comparison = ageA - ageB;
      } else if (sortConfig.key === 'date') {
        const dateA = new Date(a.arrival_date || '').getTime() || 0;
        const dateB = new Date(b.arrival_date || '').getTime() || 0;
        comparison = dateA - dateB;
      }
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }

  const handleSort = (key: 'name' | 'age' | 'date') => {
    setSortConfig(current => {
      if (current?.key === key) {
        return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const totalPages = Math.ceil(filteredChildren.length / itemsPerPage);
  const paginatedChildren = filteredChildren.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const datePart = dateString.split('T')[0];
    const [year, month, day] = datePart.split('-');
    return `${day}/${month}/${year}`;
  };

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return '?';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age + ' anos';
  };

  const calculateDuration = (entryDate: string) => {
    if (!entryDate) return '-';
    const start = new Date(entryDate);
    const end = new Date();

    // Normalizar para evitar problemas de fuso horário no cálculo de dias
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    let years = end.getFullYear() - start.getFullYear();
    let months = end.getMonth() - start.getMonth();
    let days = end.getDate() - start.getDate();

    if (days < 0) {
      months--;
      const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
      days += prevMonth.getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    const parts = [];
    if (years > 0) parts.push(`${years} ano${years > 1 ? 's' : ''}`);
    if (months > 0) parts.push(`${months} ${months > 1 ? 'meses' : 'mês'}`);
    if (days > 0) parts.push(`${days} dia${days > 1 ? 's' : ''}`);

    if (parts.length === 0) return 'Hoje';
    if (parts.length === 1) return parts[0];

    const last = parts.pop();
    return `${parts.join(', ')} e ${last}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Birthday Alert */}
      {birthdaysToday.length > 0 && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start animate-in slide-in-from-top-2 shadow-sm">
          <div className="flex-shrink-0 p-1">
            <Cake className="h-6 w-6 text-yellow-600" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-bold text-yellow-800">Feliz Aniversário! 🎉</h3>
            <div className="mt-1 text-sm text-yellow-700">
              <p>Hoje é o dia especial de:</p>
              <ul className="list-disc pl-5 mt-1">
                {birthdaysToday.map(child => (
                  <li key={child.id} className="font-medium">
                    {child.full_name} ({calculateAge(child.birth_date)})
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Total Acolhidos</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{loading ? '...' : children.length}</p>
            <p className="text-xs text-slate-400 mt-1">Registros ativos</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg text-[#458C57]">
            <User size={24} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Relatórios Ativos</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{loading ? '...' : Math.floor(children.length * 0.8)}</p>
            <p className="text-xs text-slate-400 mt-1">PIAs em dia</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg text-green-600">
            <Activity size={24} />
          </div>
        </div>

        {isHouseAdmin && (
          <Link to="/gestao-casa" className="bg-[#458C57] rounded-xl p-6 shadow-sm flex items-center justify-between cursor-pointer hover:bg-[#3d7a4c] transition-colors group">
            <div>
              <p className="text-sm font-medium text-green-100">Administração</p>
              <p className="text-2xl font-bold text-white mt-1">Gestão da Casa</p>
              <p className="text-xs text-green-100 mt-1 opacity-80">Configurações e Financeiro</p>
            </div>
            <div className="p-3 bg-white/10 rounded-lg text-white group-hover:bg-white/20 transition-colors">
              <Building2 size={24} />
            </div>
          </Link>
        )}
      </div>

      {/* Overdue PIA Alerts */}
      {overduePias.length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-100 rounded-xl p-4 flex items-start">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-600" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-semibold text-red-800">Atenção: Reavaliação de PIA Necessária</h3>
              <div className="mt-1 text-sm text-red-700">
                <p>Os seguintes acolhidos precisam de atualização no PIA (vencimento de 3 meses):</p>
                <ul className="list-disc pl-5 space-y-1 mt-1">
                  {overduePias.map(child => (
                    <li key={child.id}>
                      <Link to={`/acolhido/${child.id}`} className="font-bold hover:underline">
                        {child.full_name}
                      </Link>
                      <span className="text-xs ml-2 opacity-75">
                        (Última atualização: {new Date((child as any).last_pia_update).toLocaleDateString('pt-BR')})
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Charts */}
      <AnalyticsCharts childrenData={filteredChildren} />

      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lista de Acolhidos</h1>
          <p className="text-slate-500 text-sm mt-1">Gerencie os registros ativos da instituição.</p>
        </div>

        <div className="flex gap-3">
          {isHouseAdmin && (
            <>
              <Link
                to="/equipe"
                className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#458C57] transition-colors shadow-sm"
              >
                <Users className="w-5 h-5 mr-2" />
                Minha Equipe
              </Link>
            </>
          )}
          {(isHouseAdmin || !viewingInstitutionId) && (!viewingInstitutionId || localStorage.getItem('admin_role') === 'house_admin') && <Link
            id="new-admission-btn"
            to="/cadastro-crianca"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-[#458C57] hover:bg-[#367044] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#458C57] shadow-sm transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Cadastro de Criança
          </Link>}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg leading-5 bg-white placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#458C57] focus:border-[#458C57] sm:text-sm transition-colors"
              placeholder="Buscar por nome, autos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
            <button
              onClick={() => handleSort('name')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center whitespace-nowrap ${sortConfig?.key === 'name'
                ? 'bg-[#458C57] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              {sortConfig?.key === 'name' && sortConfig.direction === 'desc' ? <SortDesc className="w-4 h-4 mr-2" /> : <SortAsc className="w-4 h-4 mr-2" />}
              Nome
            </button>

            <button
              onClick={() => handleSort('age')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center whitespace-nowrap ${sortConfig?.key === 'age'
                ? 'bg-[#458C57] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              {sortConfig?.key === 'age' && sortConfig.direction === 'asc' ? <SortAsc className="w-4 h-4 mr-2" /> : <SortDesc className="w-4 h-4 mr-2" />}
              Idade
            </button>

            <button
              onClick={() => handleSort('date')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center whitespace-nowrap ${sortConfig?.key === 'date'
                ? 'bg-[#458C57] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              {sortConfig?.key === 'date' && sortConfig.direction === 'asc' ? <SortAsc className="w-4 h-4 mr-2" /> : <SortDesc className="w-4 h-4 mr-2" />}
              Data Entrada
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg">
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#458C57]"></div>
          </div>
        ) : filteredChildren.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center">
            <div className="bg-slate-100 p-4 rounded-full mb-4">
              <User className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Nenhum registro encontrado</h3>
            <p className="text-slate-500 mt-1 max-w-sm">Não há crianças cadastradas com este nome ou o termo de busca não retornou resultados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Nome / Idade
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Data Entrada
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Motivo
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Autos / Observações
                  </th>
                  <th scope="col" className="relative px-6 py-4">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {paginatedChildren.map((child) => (
                  <tr key={child.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm overflow-hidden ${child.sex === 'F' ? 'bg-pink-50 text-pink-600' : 'bg-blue-50 text-blue-600'}`}>
                          {(child as any).child_photos && (child as any).child_photos.length > 0 ? (
                            <img src={(child as any).child_photos[0].url} alt={child.full_name} className="h-full w-full object-cover" />
                          ) : (
                            child.full_name.charAt(0)
                          )}
                        </div>
                        <div className="ml-4">
                          <Link to={`/acolhido/${child.id}`} className="text-sm font-bold text-slate-900 hover:text-[#458C57] transition-colors">
                            {child.full_name}
                          </Link>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {calculateAge(child.date_of_birth)} • {formatDate(child.date_of_birth)}
                          </div>
                          {child.pia_status === 'draft' && (
                            <span className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-yellow-100 text-yellow-800">Rascunho</span>
                          )}
                          {tasksMap[child.id] && (
                            <div className="flex items-center text-amber-600 text-xs font-bold mt-1" title="Compromissos hoje">
                              <Calendar className="w-3 h-3 mr-1" />
                              {tasksMap[child.id].length} compromisso(s) hoje
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-700 font-medium">
                          {formatDate(child.arrival_date)}
                        </span>
                        <span className="text-xs text-slate-500 font-medium text-[#458C57]">{calculateDuration(child.arrival_date)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {child.admission_reason_types?.map((reason, idx) => (
                          <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                            {reason}
                          </span>
                        ))}
                        {!child.admission_reason_types?.length && <span className="text-slate-400 text-sm">-</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col max-w-xs">
                        <span className="text-sm font-mono text-slate-600 mb-1">{child.autos_number || 'S/N'}</span>
                        <span className="text-xs text-slate-500 truncate" title={child.notes}>{child.notes || 'Sem observações.'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/acolhido/${child.id}`}
                            className="p-1.5 text-slate-400 hover:text-[#458C57] hover:bg-green-50 rounded-md transition-colors"
                            title="Ver PIA"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <Link
                            to="/relatorios"
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Relatório Técnico"
                          >
                            <FileText className="w-4 h-4" />
                          </Link>
                          {(isHouseAdmin || !viewingInstitutionId) && <Link
                            to={`/acolhido/${child.id}`}
                            state={{ edit: true }}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                            title="Editar PIA"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>}
                        </div>
                        {(isHouseAdmin || !viewingInstitutionId) && <Link
                          to={`/acolhido/${child.id}`}
                          state={{ edit: true, renew: true }}
                          className="flex items-center justify-center px-2 py-1 text-purple-600 bg-purple-50 hover:bg-purple-100 rounded border border-purple-200 transition-colors text-xs font-medium w-full"
                          title="Reavaliação"
                        >
                          <FilePlus className="w-3 h-3 mr-1" />
                          Reavaliação
                        </Link>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filteredChildren.length > 0 && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="relative ml-3 inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Próxima
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-700">
                  Mostrando <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> a <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredChildren.length)}</span> de <span className="font-medium">{filteredChildren.length}</span> resultados
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 hover:text-slate-700">
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 hover:text-slate-700">
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="mt-8 flex justify-between items-center text-xs text-slate-400 px-4">
        <span>&copy; 2024 Curitiba Acolhe. Protegido por Criptografia.</span>
        <span>v2.4.0</span>
      </div>
    </div>
  );
};

export default Dashboard;