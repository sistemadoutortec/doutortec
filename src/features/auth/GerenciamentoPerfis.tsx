import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import type { Perfil, UserRole } from '../../types';
import { Search, Check, Ban, Loader2, ShieldAlert, RefreshCw, User, Plus, X, CheckCircle2 } from 'lucide-react';

export const GerenciamentoPerfis: React.FC = () => {
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Specialties state
  const [especialidades, setEspecialidades] = useState<{ id: string; nome: string }[]>([]);

  // Create Professional Modal States
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newProf, setNewProf] = useState({
    nome: '',
    email: '',
    cpf: '',
    crm_coren: '',
    uf: 'SP',
    role: 'especialista' as 'especialista' | 'solicitante',
    especialidadeId: '',
    instituicao: '',
    municipio: '',
    senhaInicial: 'Mudar@123',
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<boolean>(false);

  // Fetch specialties
  const fetchEspecialidades = async () => {
    try {
      const { data } = await supabase
        .from('especialidades')
        .select('id, nome')
        .order('nome', { ascending: true });
      if (data) {
        setEspecialidades(data);
      }
    } catch (err) {
      console.error('Erro ao buscar especialidades:', err);
    }
  };

  useEffect(() => {
    fetchEspecialidades();
  }, []);

  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);
    setCreateSuccess(false);

    try {
      if (!newProf.nome.trim() || !newProf.email.trim() || !newProf.cpf.trim()) {
        throw new Error('Nome, E-mail e CPF são obrigatórios.');
      }
      const cleanCpf = newProf.cpf.replace(/\D/g, '');
      if (cleanCpf.length !== 11) {
        throw new Error('O CPF deve conter 11 dígitos.');
      }

      // Instantiate a temporary client so it doesn't affect our main auth session
      const tempClient = createClient(
        import.meta.env.VITE_SUPABASE_URL || '',
        import.meta.env.VITE_SUPABASE_ANON_KEY || '',
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          }
        }
      );

      // Create the user in Auth
      const { data: authData, error: authError } = await tempClient.auth.signUp({
        email: newProf.email.trim(),
        password: newProf.senhaInicial,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Não foi possível criar a autenticação do usuário.');

      const userId = authData.user.id;

      // Find the name of the selected specialty if it exists
      const selectedEsp = especialidades.find(e => e.id === newProf.especialidadeId);
      const categoryName = newProf.role === 'especialista' && selectedEsp ? selectedEsp.nome : (newProf.role === 'solicitante' ? 'Clínico Geral' : null);

      // Create the profile in the 'perfis' table
      const docCrm = newProf.crm_coren.trim() ? `${newProf.crm_coren.trim()} / ${newProf.uf}` : null;
      const { error: profileError } = await supabase
        .from('perfis')
        .insert([{
          id: userId,
          nome: newProf.nome.trim(),
          email: newProf.email.trim(),
          cpf: cleanCpf,
          role: newProf.role,
          crm_coren: docCrm,
          instituicao: newProf.instituicao.trim() || 'Não especificado',
          municipio: newProf.municipio.trim() || 'Não especificado',
          status_cadastro: 'aprovado', // Auto-approved
          categoria_profissional: categoryName,
        }]);

      if (profileError) {
        throw profileError;
      }

      // If it's a specialist, link to the flows/specialty flow
      if (newProf.role === 'especialista' && selectedEsp) {
        await supabase
          .from('fluxos_especialidades')
          .insert([{
            especialista_id: userId,
            nome_fluxo: selectedEsp.nome,
            tipo_fluxo: 'Consultivo',
            idade_minima: null,
            idade_maxima: null,
            sexo: null,
          }]);
      }

      setCreateSuccess(true);
      setTimeout(() => {
        setCreateModalOpen(false);
        setCreateSuccess(false);
        setNewProf({
          nome: '',
          email: '',
          cpf: '',
          crm_coren: '',
          uf: 'SP',
          role: 'especialista',
          especialidadeId: '',
          instituicao: '',
          municipio: '',
          senhaInicial: 'Mudar@123',
        });
        fetchPerfis();
      }, 1500);

    } catch (err: any) {
      console.error(err);
      setCreateError(err.message || 'Erro inesperado ao cadastrar profissional.');
    } finally {
      setCreateLoading(false);
    }
  };

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
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-xs font-bold transition text-[#091151] hover:opacity-90 active:scale-98 shadow-xs cursor-pointer"
            style={{ backgroundColor: '#28ffb2' }}
          >
            <Plus className="h-3.5 w-3.5" />
            Cadastrar Profissional
          </button>
          <button
            onClick={fetchPerfis}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 px-3.5 py-2.5 text-xs font-semibold text-gray-700 transition disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Sincronizar
          </button>
        </div>
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

      {/* Create Professional Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-gray-250 shadow-2xl w-full max-w-xl overflow-hidden my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-150" style={{ backgroundColor: '#091151' }}>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="h-5 w-5 text-[#28ffb2]" />
                Cadastrar Novo Profissional
              </h3>
              <button 
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-300 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitCreate} className="p-6 space-y-4">
              {createError && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-700 flex items-start gap-2">
                  <ShieldAlert className="h-4.5 w-4.5 text-rose-600 shrink-0 mt-0.5" />
                  <span>{createError}</span>
                </div>
              )}

              {createSuccess && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3.5 text-xs text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                  <span>Profissional cadastrado com sucesso!</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nome Completo */}
                <div className="sm:col-span-2">
                  <label htmlFor="modal-nome" className="block text-xs font-bold text-gray-700 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    id="modal-nome"
                    type="text"
                    required
                    disabled={createLoading}
                    placeholder="Ex: Dr. Roberto Alencar"
                    value={newProf.nome}
                    onChange={e => setNewProf(prev => ({ ...prev, nome: e.target.value }))}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500"
                  />
                </div>

                {/* E-mail */}
                <div>
                  <label htmlFor="modal-email" className="block text-xs font-bold text-gray-700 mb-1">
                    Endereço de E-mail *
                  </label>
                  <input
                    id="modal-email"
                    type="email"
                    required
                    disabled={createLoading}
                    placeholder="medico@exemplo.com.br"
                    value={newProf.email}
                    onChange={e => setNewProf(prev => ({ ...prev, email: e.target.value }))}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500"
                  />
                </div>

                {/* CPF */}
                <div>
                  <label htmlFor="modal-cpf" className="block text-xs font-bold text-gray-700 mb-1">
                    CPF *
                  </label>
                  <input
                    id="modal-cpf"
                    type="text"
                    required
                    disabled={createLoading}
                    placeholder="Apenas números (11 dígitos)"
                    value={newProf.cpf}
                    onChange={e => setNewProf(prev => ({ ...prev, cpf: e.target.value.replace(/\D/g, '') }))}
                    maxLength={11}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500"
                  />
                </div>

                {/* Perfil/Função */}
                <div>
                  <label htmlFor="modal-role" className="block text-xs font-bold text-gray-700 mb-1">
                    Perfil / Função *
                  </label>
                  <select
                    id="modal-role"
                    required
                    disabled={createLoading}
                    value={newProf.role}
                    onChange={e => setNewProf(prev => ({ ...prev, role: e.target.value as 'especialista' | 'solicitante' }))}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500 bg-white"
                  >
                    <option value="especialista">Especialista (Médico de Referência)</option>
                    <option value="solicitante">Solicitante (Clínico da Unidade)</option>
                  </select>
                </div>

                {/* CRM/COREN */}
                <div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label htmlFor="modal-crm" className="block text-xs font-bold text-gray-700 mb-1">
                        CRM / COREN *
                      </label>
                      <input
                        id="modal-crm"
                        type="text"
                        required
                        disabled={createLoading}
                        placeholder="Número do Registro"
                        value={newProf.crm_coren}
                        onChange={e => setNewProf(prev => ({ ...prev, crm_coren: e.target.value }))}
                        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500"
                      />
                    </div>
                    <div className="w-20">
                      <label htmlFor="modal-uf" className="block text-xs font-bold text-gray-700 mb-1">
                        UF *
                      </label>
                      <select
                        id="modal-uf"
                        required
                        disabled={createLoading}
                        value={newProf.uf}
                        onChange={e => setNewProf(prev => ({ ...prev, uf: e.target.value }))}
                        className="block w-full rounded-lg border border-gray-300 px-2 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500 bg-white"
                      >
                        {['SP', 'RJ', 'MG', 'ES', 'PR', 'SC', 'RS', 'MS', 'MT', 'GO', 'DF', 'AM', 'PA', 'AC', 'RO', 'RR', 'AP', 'TO', 'MA', 'PI', 'CE', 'RN', 'PB', 'PE', 'AL', 'SE', 'BA'].map(uf => (
                          <option key={uf} value={uf}>{uf}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Especialidade Médica (Somente para Especialistas) */}
                {newProf.role === 'especialista' && (
                  <div className="sm:col-span-2">
                    <label htmlFor="modal-especialidade" className="block text-xs font-bold text-gray-700 mb-1">
                      Especialidade Médica *
                    </label>
                    <select
                      id="modal-especialidade"
                      required={newProf.role === 'especialista'}
                      disabled={createLoading}
                      value={newProf.especialidadeId}
                      onChange={e => setNewProf(prev => ({ ...prev, especialidadeId: e.target.value }))}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500 bg-white"
                    >
                      <option value="">Selecione uma especialidade...</option>
                      {especialidades.map(esp => (
                        <option key={esp.id} value={esp.id}>{esp.nome}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Unidade / Vínculo */}
                <div>
                  <label htmlFor="modal-instituicao" className="block text-xs font-bold text-gray-700 mb-1">
                    Unidade / Vínculo
                  </label>
                  <input
                    id="modal-instituicao"
                    type="text"
                    disabled={createLoading}
                    placeholder="Ex: UBS Santa Marta"
                    value={newProf.instituicao}
                    onChange={e => setNewProf(prev => ({ ...prev, instituicao: e.target.value }))}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500"
                  />
                </div>

                {/* Município */}
                <div>
                  <label htmlFor="modal-municipio" className="block text-xs font-bold text-gray-700 mb-1">
                    Município
                  </label>
                  <input
                    id="modal-municipio"
                    type="text"
                    disabled={createLoading}
                    placeholder="Ex: São Paulo"
                    value={newProf.municipio}
                    onChange={e => setNewProf(prev => ({ ...prev, municipio: e.target.value }))}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500"
                  />
                </div>

                {/* Senha Inicial */}
                <div className="sm:col-span-2">
                  <label htmlFor="modal-senha" className="block text-xs font-bold text-gray-700 mb-1">
                    Senha Inicial (Padrão: Mudar@123) *
                  </label>
                  <input
                    id="modal-senha"
                    type="text"
                    required
                    disabled={createLoading}
                    value={newProf.senhaInicial}
                    onChange={e => setNewProf(prev => ({ ...prev, senhaInicial: e.target.value }))}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-150 mt-5">
                <button
                  type="button"
                  disabled={createLoading}
                  onClick={() => setCreateModalOpen(false)}
                  className="rounded-lg border border-gray-300 hover:bg-gray-50 px-4.5 py-2 text-xs font-semibold text-gray-700 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createLoading || createSuccess}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-750 px-5 py-2 text-xs font-bold text-white transition cursor-pointer disabled:opacity-50"
                >
                  {createLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cadastrando...
                    </>
                  ) : (
                    'Cadastrar Profissional'
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
