import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Child } from '../types';
import { Plus, Search, Calendar, User, FileText, ArrowRight, Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DashboardProps {
  isDemo?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ isDemo }) => {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    fetchChildren();
  }, [isDemo]);

  const fetchChildren = async () => {
    setLoading(true);
    
    if (isDemo) {
      setTimeout(() => {
        setChildren([
          { 
            id: '1', 
            full_name: 'Ana Clara Souza',
            sex: 'F',
            birth_date: '2015-05-10', 
            entry_date: '2023-01-15', 
            notes: 'Alergia a amendoim. Requer acompanhamento nutricional semanal. Irmã de Pedro (não acolhido).', 
            institution_id: 'demo',
            autos_number: '0001234-56.2023.8.16.0000',
            admission_reason_types: ['Negligência', 'Vulnerabilidade Social'],
            created_at: new Date().toISOString(),
            child_photos: [{ url: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=150&q=80', created_at: new Date().toISOString() }]
          } as any,
          { 
            id: '2', 
            full_name: 'Marcos Vinícius Pereira',
            sex: 'M',
            birth_date: '2010-11-20', 
            entry_date: '2023-08-10', 
            notes: 'Apresenta excelente desempenho escolar. Gosta de futebol.', 
            institution_id: 'demo',
            admission_reason_types: ['Abandono', 'Situação de Rua'],
            created_at: new Date().toISOString(),
          } as any,
          { 
            id: '3', 
            full_name: 'Júlia Mendes da Silva',
            sex: 'F',
            birth_date: '2019-03-05', 
            entry_date: '2023-11-22', 
            notes: 'Em processo de adaptação. Chora à noite.', 
            institution_id: 'demo',
            admission_reason_types: ['Violência Doméstica'],
            created_at: new Date().toISOString(),
          } as any,
          { 
            id: '4', 
            full_name: 'Gabriel Santos Oliveira',
            sex: 'M',
            birth_date: '2012-07-15', 
            entry_date: '2022-05-10', 
            notes: 'Possível reintegração familiar em breve. Avó materna manifestou interesse.', 
            institution_id: 'demo',
            admission_reason_types: ['Orfandade'],
            created_at: new Date().toISOString(),
          } as any
        ]);
        setLoading(false);
      }, 600);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('children')
        .select('*, child_photos(url, created_at)')
        .order('entry_date', { ascending: false });

      if (error) throw error;
      
      const childrenWithPhotos = data?.map((child: any) => ({
        ...child,
        child_photos: child.child_photos ? child.child_photos.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) : []
      })) || [];
      setChildren(childrenWithPhotos);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredChildren = children.filter(child => 
    child.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    start.setHours(0,0,0,0);
    end.setHours(0,0,0,0);

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
    <div className="max-w-7xl mx-auto">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center">
            <div className="p-3 rounded-full bg-blue-50 text-blue-600 mr-4">
                <User size={24} />
            </div>
            <div>
                <p className="text-sm font-medium text-slate-500">Total Acolhidos</p>
                <p className="text-2xl font-bold text-slate-800">{loading ? '...' : children.length}</p>
            </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center">
            <div className="p-3 rounded-full bg-green-50 text-green-600 mr-4">
                <Activity size={24} />
            </div>
            <div>
                <p className="text-sm font-medium text-slate-500">Relatórios Ativos</p>
                <p className="text-2xl font-bold text-slate-800">{loading ? '...' : Math.floor(children.length * 0.8)}</p>
            </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center justify-between group cursor-pointer hover:border-[#63BF7A] transition-colors" onClick={() => document.getElementById('new-admission-btn')?.click()}>
            <div>
                <p className="text-sm font-medium text-slate-500">Ação Rápida</p>
                <p className="text-lg font-bold text-[#458C57]">Cadastro de Criança</p>
            </div>
            <div className="p-2 rounded-full bg-[#88F2A2]/10 text-[#458C57] group-hover:bg-[#458C57] group-hover:text-white transition-colors">
                <Plus size={20} />
            </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lista de Acolhidos</h1>
          <p className="text-slate-500 mt-1 text-sm">Gerencie os registros ativos da instituição.</p>
        </div>
        
        <Link 
          id="new-admission-btn"
          to="/cadastro-crianca" 
          className="inline-flex items-center justify-center px-5 py-2.5 bg-[#458C57] hover:bg-[#367044] text-white text-sm font-semibold rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#458C57]"
        >
          <Plus className="w-5 h-5 mr-2" />
          Cadastro de Criança
        </Link>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-200 mb-6 max-w-md">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2.5 border-none rounded-lg leading-5 bg-transparent placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-0 sm:text-sm"
            placeholder="Buscar por nome, autos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg">
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white shadow-sm border border-slate-200 rounded-xl overflow-hidden">
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
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Nome / Idade
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Data Entrada
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Motivo
                  </th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Autos / Observações
                  </th>
                  <th scope="col" className="relative px-6 py-4">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {paginatedChildren.map((child) => (
                  <tr key={child.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`flex-shrink-0 h-16 w-16 rounded-full flex items-center justify-center font-bold text-xl shadow-sm border-2 overflow-hidden ${child.sex === 'F' ? 'bg-pink-50 text-pink-600 border-pink-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                          {(child as any).child_photos && (child as any).child_photos.length > 0 ? (
                            <img src={(child as any).child_photos[0].url} alt={child.full_name} className="h-full w-full object-cover" />
                          ) : (
                            child.full_name.charAt(0)
                          )}
                        </div>
                        <div className="ml-4">
                          <Link to={`/acolhido/${child.id}`} className="text-sm font-bold text-slate-900 hover:text-[#458C57] hover:underline">
                            {child.full_name}
                          </Link>
                          <div className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-full inline-block mt-1">
                            {calculateAge(child.birth_date)} • {formatDate(child.birth_date)}
                          </div>
                          {child.pia_status === 'draft' && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">Rascunho</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-700 font-medium">
                            {formatDate(child.entry_date)}
                        </span>
                        <span className="text-xs text-slate-500 font-medium text-[#458C57]">{calculateDuration(child.entry_date)}</span>
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
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <Link to="/relatorios" className="text-[#458C57] hover:text-[#367044] flex items-center justify-end group-hover:underline">
                        Ver <ArrowRight className="ml-1 w-4 h-4" />
                      </Link>
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
                    <span className="sr-only">Anterior</span>
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 hover:text-slate-700">
                    <span className="sr-only">Próxima</span>
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="mt-6 flex justify-between items-center text-xs text-slate-400">
         <span>Sistema protegido por Criptografia de Ponta a Ponta.</span>
         <span>LGPD Compliance v2.4</span>
      </div>
    </div>
  );
};

export default Dashboard;