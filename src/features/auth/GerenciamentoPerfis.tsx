import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { Perfil, UserRole } from '../../types';
import { Search, Check, Ban, Loader2, ShieldAlert, RefreshCw, User } from 'lucide-react';

export const GerenciamentoPerfis: React.FC = () => {
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  // Fetch all profiles from supabase
  const fetchPerfis = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('perfis')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Map profiles and supply default values if they are missing
      const mappedList = (data || []).map((item: any) => ({
        ...item,
        status_cadastro: item.status_cadastro || item.status || 'pendente',
        instituicao: item.instituicao || 'Não especificado',
        categoria_profissional: item.categoria_profissional || null
      })) as Perfil[];

      setPerfis(mappedList);
    } catch (err: any) {
      console.error('Erro ao buscar perfis:', err.message || err);
      setError('Não foi possível carregar a lista de perfis do banco de dados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerfis();
  }, []);

  // Update status for a specific user
  const handleUpdateStatus = async (profileId: string, newStatus: 'aprovado' | 'bloqueado') => {
    setActioningId(profileId);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('perfis')
        .update({ status_cadastro: newStatus })
        .eq('id', profileId);

      if (updateError) throw updateError;

      // Update state locally immediately
      setPerfis(prev => 
        prev.map(item => 
          item.id === profileId 
            ? { ...item, status_cadastro: newStatus } 
            : item
        )
      );
    } catch (err: any) {
      console.error(`Erro ao atualizar status para ${newStatus}:`, err.message || err);
      setError(`Falha ao alterar o status do usuário: ${err.message}`);
    } finally {
      setActioningId(null);
    }
  };

  // Helper to format role names into friendly labels
  const formatRole = (role: UserRole): string => {
    const roleMap: Record<UserRole, string> = {
      admin: 'Administrador',
      especialista: 'Especialista',
      solicitante: 'Solicitante',
      telerregulador: 'Telerregulador',
      teleconsultor: 'Teleconsultor',
      visualizador: 'Visualizador'
    };
    return roleMap[role] || role;
  };

  // Helper to get color classes for roles
  const getRoleStyle = (role: UserRole): string => {
    switch (role) {
      case 'admin':
        return 'bg-rose-50 border-rose-200 text-rose-700';
      case 'telerregulador':
        return 'bg-indigo-50 border-indigo-200 text-indigo-700';
      case 'teleconsultor':
      case 'especialista':
        return 'bg-purple-50 border-purple-200 text-purple-700';
      case 'solicitante':
        return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'visualizador':
        return 'bg-teal-50 border-teal-200 text-teal-700';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  // Filter profiles based on search query and status filter
  const filteredPerfis = perfis.filter((item) => {
    // 1. Status Filter
    if (statusFilter !== 'todos' && item.status_cadastro !== statusFilter) {
      return false;
    }

    // 2. Search Query (matches name or professional category)
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      const nameMatch = item.nome?.toLowerCase().includes(query);
      const catMatch = item.categoria_profissional?.toLowerCase().includes(query);
      return nameMatch || catMatch;
    }

    return true;
  });

  // Calculate status counts for filter badges
  const getCounts = () => {
    return {
      todos: perfis.length,
      pendente: perfis.filter(p => p.status_cadastro === 'pendente').length,
      aprovado: perfis.filter(p => p.status_cadastro === 'aprovado').length,
      bloqueado: perfis.filter(p => p.status_cadastro === 'bloqueado').length,
    };
  };

  const counts = getCounts();

  return (
    <div className="space-y-6">
      {/* Header and Sync Button */}
      <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 tracking-tight">Gerenciamento de Perfis (Atores)</h3>
          <p className="text-xs text-gray-500 mt-1">
            Administre os papéis, status de acesso e informações profissionais de todos os atores cadastrados no sistema.
          </p>
        </div>
        <button
          onClick={fetchPerfis}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 hover:bg-gray-55 px-3.5 py-2 text-xs font-semibold text-gray-700 transition disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Sincronizar
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700 flex items-start gap-2">
          <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters bar */}
      <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
          {/* Quick Filters Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'pendente', label: 'Pendentes' },
              { id: 'aprovado', label: 'Aprovados' },
              { id: 'bloqueado', label: 'Bloqueados' }
            ].map((tab) => {
              const isActive = statusFilter === tab.id;
              const countVal = counts[tab.id as keyof typeof counts];
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                    isActive 
                      ? 'bg-indigo-650 text-white shadow-xs' 
                      : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {tab.label}
                  <span className={`inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {countVal}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Text Search Input */}
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </span>
            <input
              type="text"
              placeholder="Buscar por Nome ou Categoria Profissional..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full rounded-xl border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500 transition"
            />
          </div>
        </div>
      </div>

      {/* Main Profiles Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center bg-white rounded-2xl border border-gray-150 shadow-xs">
          <div className="flex flex-col items-center space-y-3">
            <Loader2 className="h-9 w-9 animate-spin text-indigo-600" />
            <span className="text-gray-500 text-sm font-medium">Carregando cadastros...</span>
          </div>
        </div>
      ) : filteredPerfis.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 bg-white rounded-2xl border border-gray-150 shadow-xs text-center">
          <div className="h-12 w-12 rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-100 mb-4">
            <User className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-sm font-bold text-gray-900">Nenhum registro encontrado</p>
          <p className="text-xs text-gray-500 mt-1 max-w-sm">
            Não encontramos nenhum perfil correspondente aos filtros de pesquisa selecionados no momento.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-150 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4.5">Nome Completo</th>
                  <th className="px-6 py-4.5">E-mail</th>
                  <th className="px-6 py-4.5">Categoria Profissional</th>
                  <th className="px-6 py-4.5">Tipo de Perfil</th>
                  <th className="px-6 py-4.5">Data de Cadastro</th>
                  <th className="px-6 py-4.5">Status</th>
                  <th className="px-6 py-4.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 bg-white">
                {filteredPerfis.map((item) => {
                  const isActioning = actioningId === item.id;
                  const initials = item.nome 
                    ? item.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() 
                    : 'U';
                  
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/40 transition-colors">
                      {/* Name / Info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold">
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-gray-955">{item.nome}</div>
                            {item.cpf && (
                              <div className="text-[10px] text-gray-400 mt-0.5">
                                CPF: {item.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-6 py-4 text-gray-700">
                        <a 
                          href={`mailto:${item.email}`}
                          className="hover:text-indigo-600 hover:underline transition"
                        >
                          {item.email}
                        </a>
                      </td>

                      {/* Categoria Profissional */}
                      <td className="px-6 py-4 text-gray-950 font-medium">
                        {item.categoria_profissional ? (
                          <span>{item.categoria_profissional}</span>
                        ) : (
                          <span className="text-gray-400 italic text-xs font-normal">Não informada</span>
                        )}
                      </td>

                      {/* Role */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold border ${getRoleStyle(item.role)}`}>
                          {formatRole(item.role)}
                        </span>
                      </td>

                      {/* Created At */}
                      <td className="px-6 py-4 text-gray-600">
                        {item.created_at 
                          ? new Date(item.created_at).toLocaleDateString('pt-BR') 
                          : '--'}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        {item.status_cadastro === 'aprovado' && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-850">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                            Aprovado
                          </span>
                        )}
                        {item.status_cadastro === 'pendente' && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-semibold text-amber-855">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                            Pendente
                          </span>
                        )}
                        {item.status_cadastro === 'bloqueado' && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-xs font-semibold text-rose-850">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
                            Bloqueado
                          </span>
                        )}
                        {item.status_cadastro !== 'aprovado' && item.status_cadastro !== 'pendente' && item.status_cadastro !== 'bloqueado' && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 border border-gray-200 px-2.5 py-0.5 text-xs font-semibold text-gray-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-gray-500" />
                            {item.status_cadastro}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleUpdateStatus(item.id, 'aprovado')}
                            disabled={isActioning || item.status_cadastro === 'aprovado'}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 disabled:bg-gray-50 text-emerald-700 disabled:text-gray-400 border border-emerald-200 disabled:border-gray-200 px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed cursor-pointer"
                            title="Aprovar Usuário"
                          >
                            {isActioning ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                            Aprovar
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(item.id, 'bloqueado')}
                            disabled={isActioning || item.status_cadastro === 'bloqueado'}
                            className="inline-flex items-center gap-1 rounded-lg bg-rose-50 hover:bg-rose-100 disabled:bg-gray-50 text-rose-700 disabled:text-gray-400 border border-rose-200 disabled:border-gray-200 px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed cursor-pointer"
                            title="Bloquear Usuário"
                          >
                            {isActioning ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Ban className="h-3.5 w-3.5" />
                            )}
                            Bloquear
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
