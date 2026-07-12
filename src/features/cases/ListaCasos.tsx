import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { CasoClinico, CasoPrioridade, CasoStatus } from '../../types';
import { Search, Clock, HelpCircle, User, Activity } from 'lucide-react';

interface ListaCasosProps {
  limit?: number;
  showFilters?: boolean;
  onSelectCaso?: (caso: CasoClinico) => void;
  onCreateCaso?: () => void;
}

export const ListaCasos: React.FC<ListaCasosProps> = ({ limit = 20, showFilters = true, onSelectCaso, onCreateCaso }) => {
  const { user, perfil } = useAuth();
  
  // State
  const [casos, setCasos] = useState<CasoClinico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dictionary maps for mapping IDs to Names in memory (avoiding raw join crashes)
  const [specialtiesMap, setSpecialtiesMap] = useState<Record<string, string>>({});
  const [profilesMap, setProfilesMap] = useState<Record<string, { nome: string; municipio?: string }>>({});

  // Filter States
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [prioridadeFilter, setPrioridadeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Specialist served municipalities
  const [specialistMuns, setSpecialistMuns] = useState<string[]>([]);

  useEffect(() => {
    const fetchSpecialistMuns = async () => {
      if (!user || perfil?.role !== 'especialista') return;
      try {
        const { data: flows } = await supabase
          .from('fluxos_especialidades')
          .select('id')
          .eq('especialista_id', user.id);

        if (!flows || flows.length === 0) {
          setSpecialistMuns([]);
          return;
        }
        const flowIds = flows.map(f => f.id);

        const { data: links } = await supabase
          .from('fluxos_especialidades_municipios')
          .select('municipio_id')
          .in('fluxo_id', flowIds);

        if (!links || links.length === 0) {
          setSpecialistMuns([]);
          return;
        }
        const munIds = links.map(l => l.municipio_id);

        const { data: muns } = await supabase
          .from('fluxos_municipios')
          .select('municipio')
          .in('id', munIds);

        if (muns) {
          setSpecialistMuns(muns.map(m => m.municipio));
        }
      } catch (err) {
        console.error('Erro ao buscar municípios do especialista:', err);
      }
    };

    fetchSpecialistMuns();
  }, [user, perfil]);

  // Fetch reference data (specialties)
  const fetchReferenceData = async () => {
    try {
      const { data: specData } = await supabase
        .from('especialidades')
        .select('id, nome');
      
      if (specData) {
        const specMap: Record<string, string> = {};
        specData.forEach(item => {
          specMap[item.id] = item.nome;
        });
        setSpecialtiesMap(specMap);
      }
    } catch (err) {
      console.error('Erro ao buscar dados de referência:', err);
    }
  };

  // Fetch cases
  const fetchCasos = useCallback(async (isLoadMore = false) => {
    if (!user || !perfil) return;

    try {
      if (!isLoadMore) {
        setLoading(true);
      }
      setError(null);

      const offset = isLoadMore ? (page * limit) : 0;
      
      let query = supabase
        .from('casos')
        .select(`
          id, paciente_nome, especialidade_id, prioridade, historico_clinico, conduta_atual, duvida_clinica, solicitante_id, especialista_id, status, created_at, anexos, devolutiva_conduta, devolutiva_aps, respondido_em, fechado_em,
          solicitante:perfis!solicitante_id(id, nome, municipio),
          especialista:perfis!especialista_id(id, nome)
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Role adaptive filters
      if (perfil.role === 'solicitante') {
        query = query.eq('solicitante_id', user.id);
      } else if (perfil.role === 'especialista') {
        if (statusFilter === 'novo') {
          query = query.is('especialista_id', null);
          if (specialistMuns.length > 0) {
            query = query.in('solicitante.municipio', specialistMuns);
          }
        } else {
          query = query.eq('especialista_id', user.id);
        }
      }

      // Apply API filters if not doing client-side search (to protect performance)
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (prioridadeFilter !== 'all') {
        query = query.eq('prioridade', prioridadeFilter);
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;

      const newCasos = (data as CasoClinico[]) || [];
      
      if (isLoadMore) {
        setCasos(prev => [...prev, ...newCasos]);
        setPage(prev => prev + 1);
      } else {
        setCasos(newCasos);
        setPage(1);
      }

      setHasMore(newCasos.length === limit);

      // Map profiles directly from query results
      const mappedProfiles: Record<string, { nome: string; municipio?: string }> = {};
      newCasos.forEach((c: any) => {
        if (c.solicitante) {
          mappedProfiles[c.solicitante_id] = {
            nome: c.solicitante.nome,
            municipio: c.solicitante.municipio
          };
        }
        if (c.especialista) {
          mappedProfiles[c.especialista_id] = {
            nome: c.especialista.nome
          };
        }
      });

      setProfilesMap(prev => ({ ...prev, ...mappedProfiles }));
    } catch (err: any) {
      console.error('Erro ao buscar casos:', err.message || err);
      setError('Não foi possível carregar a lista de casos clínicos.');
    } finally {
      setLoading(false);
    }
  }, [user, perfil, statusFilter, prioridadeFilter, page, limit, specialistMuns]);

  // Load reference data on mount
  useEffect(() => {
    fetchReferenceData();
  }, []);

  // Fetch cases when filters change or on mount
  useEffect(() => {
    fetchCasos(false);
  }, [statusFilter, prioridadeFilter]);

  // Client-side text filter on patient name
  const filteredCasos = casos.filter(caso => {
    if (!searchTerm.trim()) return true;
    return caso.paciente_nome.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Helper to format remaining SLA time
  const formatSLA = (slaLimite: string, status: CasoStatus) => {
    if (status === 'fechado' || status === 'respondido') {
      return { text: 'Concluído', colorClass: 'text-green-600 bg-green-50 border-green-200' };
    }

    const remainingMs = new Date(slaLimite).getTime() - Date.now();
    if (remainingMs <= 0) {
      return { text: 'Atrasado (SLA Vencido)', colorClass: 'text-red-600 bg-red-50 border-red-200 animate-pulse' };
    }

    const hours = Math.floor(remainingMs / (1000 * 60 * 60));
    const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours < 4) {
      return { text: `${hours}h ${minutes}m restantes`, colorClass: 'text-amber-600 bg-amber-50 border-amber-200 font-semibold' };
    }

    return { text: `${hours}h ${minutes}m restantes`, colorClass: 'text-gray-600 bg-gray-50 border-gray-200' };
  };

  const getPriorityBadge = (prio: CasoPrioridade) => {
    switch (prio) {
      case 'alta':
        return <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 border border-red-200">Alta</span>;
      case 'media':
        return <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 border border-amber-200">Média</span>;
      case 'baixa':
        return <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 border border-blue-200">Baixa</span>;
    }
  };

  const getStatusBadge = (status: CasoStatus) => {
    switch (status) {
      case 'novo':
        return <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 border border-purple-200">Novo</span>;
      case 'em_progresso':
        return <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200">Em Progresso</span>;
      case 'respondido':
        return <span className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 border border-green-200">Respondido</span>;
      case 'fechado':
        return <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 border border-gray-200">Fechado</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters bar */}
      {showFilters && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4 bg-white p-4 rounded-xl border border-gray-150 shadow-xs">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar paciente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500"
            >
              <option value="all">Todos os Status</option>
              <option value="novo">Novo</option>
              <option value="em_progresso">Em Progresso</option>
              <option value="respondido">Respondido</option>
              <option value="fechado">Fechado</option>
            </select>
          </div>

          <div>
            <select
              value={prioridadeFilter}
              onChange={(e) => setPrioridadeFilter(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500"
            >
              <option value="all">Todas as Prioridades</option>
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
            </select>
          </div>

          <div className="flex items-center justify-end">
            <button 
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setPrioridadeFilter('all');
              }}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 transition"
            >
              Limpar Filtros
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Cases List */}
      {loading ? (
        <div className="flex h-32 items-center justify-center bg-white rounded-xl border border-gray-150">
          <svg className="animate-spin h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      ) : filteredCasos.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 bg-white rounded-xl border border-gray-150 text-center">
          <HelpCircle className="h-10 w-10 text-gray-400 mb-2" />
          <p className="text-sm font-semibold text-gray-900">Nenhum caso clínico encontrado</p>
          <p className="text-xs text-gray-500 mt-1">Experimente alterar os filtros ou cadastrar um novo caso.</p>
          {onCreateCaso && (
            <button
              onClick={onCreateCaso}
              className="mt-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-semibold text-white transition shadow-xs"
            >
              + Novo Caso Clínico
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredCasos.map((caso, idx) => {
            const getSlaHours = (prio: string) => {
              if (prio === 'alta') return 12;
              if (prio === 'media') return 48;
              return 72;
            };
            const limitTime = new Date(new Date(caso.created_at).getTime() + getSlaHours(caso.prioridade) * 60 * 60 * 1000).toISOString();
            const sla = formatSLA(limitTime, caso.status);
            const isEven = idx % 2 === 0;
            return (
              <div 
                key={caso.id} 
                onClick={() => onSelectCaso?.(caso)}
                className={`rounded-xl border p-5 transition duration-150 flex flex-col md:flex-row md:items-center md:justify-between gap-4 ${
                  onSelectCaso ? 'cursor-pointer hover:border-blue-400 hover:shadow-xs' : ''
                }`}
                style={{ backgroundColor: isEven ? '#white' : 'rgba(232, 243, 252, 0.4)' }}
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-mono text-[#56657c]">ID: #{caso.id.substring(0, 8)}</span>
                    {getStatusBadge(caso.status)}
                    {getPriorityBadge(caso.prioridade)}
                  </div>
                  
                  <h4 className="text-base font-extrabold" style={{ color: '#002157' }}>{caso.paciente_nome}</h4>
                  
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#56657c]">
                    <span className="flex items-center gap-1">
                      <Activity className="h-3.5 w-3.5" />
                      Especialidade: {specialtiesMap[caso.especialidade_id] || 'Carregando...'}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      Solicitante: {profilesMap[caso.solicitante_id]?.nome || 'Carregando...'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-start md:items-end gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-gray-100">
                  <div className="text-xs text-[#56657c]">
                    Criado em: {new Date(caso.created_at).toLocaleDateString('pt-BR')}
                  </div>
                  
                  <div className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs border ${sla.colorClass}`}>
                    <Clock className="h-3.5 w-3.5" />
                    <span>{sla.text}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => fetchCasos(true)}
                className="rounded-lg border border-gray-300 bg-white hover:bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-700 transition"
              >
                Carregando mais...
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
