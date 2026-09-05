import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import type { Perfil, UserRole } from '../../types';
import { Search, Check, Ban, Loader2, ShieldAlert, RefreshCw, User, Plus, X, CheckCircle2, Edit, Trash2 } from 'lucide-react';

export const GerenciamentoPerfis: React.FC = () => {
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Specialties state
  const [especialidades, setEspecialidades] = useState<{ id: string; nome: string }[]>([]);

  // Create Professional Modal States
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newProf, setNewProf] = useState<{
    nome: string;
    email: string;
    cpf: string;
    crm_coren: string;
    uf: string;
    role: UserRole;
    especialidadeId: string;
    instituicao: string;
    municipio: string;
    senhaInicial: string;
  }>({
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
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<boolean>(false);

  // Edit Professional Modal States
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editProf, setEditProf] = useState<{
    id: string;
    nome: string;
    email: string;
    cpf: string;
    crm_coren_num: string;
    uf: string;
    role: UserRole;
    rqe: string;
    especialidadeId: string;
    municipiosIds: string[];
    instituicao: string;
    municipio: string;
    telefone: string;
  } | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);

  // Custom municipality text states (when '+ Outro' is selected)
  const [createCustomMunicipio, setCreateCustomMunicipio] = useState('');
  const [editCustomMunicipio, setEditCustomMunicipio] = useState('');

  // Delete Professional Modal States
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<Perfil | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleOpenDeleteModal = (profile: Perfil) => {
    setProfileToDelete(profile);
    setDeleteError(null);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!profileToDelete) return;
    setDeleteLoading(true);
    setDeleteError(null);

    try {
      const profileId = profileToDelete.id;
      let deletedCount = 0;

      // 1. Try calling RPC functions (delete_user_by_admin or delete_user)
      try {
        const { error: rpcErr1 } = await supabase.rpc('delete_user_by_admin', { user_id: profileId });
        if (!rpcErr1) {
          deletedCount = 1;
        } else {
          const { error: rpcErr2 } = await supabase.rpc('delete_user', { user_id: profileId });
          if (!rpcErr2) {
            deletedCount = 1;
          }
        }
      } catch (rpcExc) {
        console.warn('RPC de exclusão não encontrada ou falhou:', rpcExc);
      }

      // 2. Fallback: Manually delete from public tables if RPC was not configured
      if (deletedCount === 0) {
        // If user is specialist, remove any linked flow and specialty municipios
        const { data: oldFlow } = await supabase
          .from('fluxos_especialidades')
          .select('id')
          .eq('especialista_id', profileId)
          .maybeSingle();

        if (oldFlow) {
          await supabase
            .from('fluxos_especialidades_municipios')
            .delete()
            .eq('fluxo_id', oldFlow.id);

          await supabase
            .from('fluxos_especialidades')
            .delete()
            .eq('especialista_id', profileId);
        }

        // Delete profile from perfis table and check if rows were actually affected
        const { data: deletedData, error: deleteProfileError } = await supabase
          .from('perfis')
          .delete()
          .eq('id', profileId)
          .select();

        if (deleteProfileError) throw deleteProfileError;

        if (!deletedData || deletedData.length === 0) {
          throw new Error('Permissão negada no Supabase: A tabela perfis não possui política de DELETE ativa para administradores. Execute o script SQL no Supabase.');
        }
      }

      // Local state update & refetch
      setPerfis(prev => prev.filter(p => p.id !== profileId));
      setDeleteModalOpen(false);
      setProfileToDelete(null);
      fetchPerfis();

    } catch (err: any) {
      console.error('Erro ao excluir usuário:', err);
      setDeleteError(err.message || 'Não foi possível excluir o usuário. Tente novamente.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Municipios list state
  const [municipiosList, setMunicipiosList] = useState<{ id: string; municipio: string; uf: string }[]>([]);

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

  // Fetch municipalities list
  const fetchMunicipiosList = async () => {
    try {
      const { data } = await supabase
        .from('fluxos_municipios')
        .select('id, municipio, uf')
        .order('uf', { ascending: true })
        .order('municipio', { ascending: true });
      if (data) {
        setMunicipiosList(data);
      }
    } catch (err) {
      console.error('Erro ao buscar lista de municípios:', err);
    }
  };

  useEffect(() => {
    fetchEspecialidades();
    fetchMunicipiosList();
  }, []);

  // Format telephone number as (99) 99999-9999 or (99) 9999-9999
  const formatTelefone = (value: string) => {
    const clean = value.replace(/\D/g, '');
    const numbers = clean.slice(0, 11);
    if (numbers.length <= 2) {
      return numbers;
    }
    if (numbers.length <= 6) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    }
    if (numbers.length <= 10) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    }
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  };

  const handleOpenEditModal = async (profile: Perfil) => {
    setError(null);
    setEditError(null);
    setEditSuccess(false);

    // Split CRM / COREN and UF
    let num = '';
    let ufVal = 'SP';
    if (profile.crm_coren) {
      const parts = profile.crm_coren.split('/');
      num = parts[0]?.trim() || '';
      ufVal = parts[1]?.trim() || 'SP';
    }

    // Try to fetch their specialty flow and coverage municipalities if specialist
    let espId = '';
    let selectedMunIds: string[] = [];
    if (profile.role === 'especialista') {
      try {
        const { data: flowData } = await supabase
          .from('fluxos_especialidades')
          .select('id, nome_fluxo')
          .eq('especialista_id', profile.id)
          .maybeSingle();

        if (flowData) {
          const found = especialidades.find(e => e.nome.toLowerCase() === flowData.nome_fluxo.toLowerCase());
          if (found) {
            espId = found.id;
          }

          // Fetch municipios linked to this flow_id
          const { data: linkData } = await supabase
            .from('fluxos_especialidades_municipios')
            .select('municipio_id')
            .eq('fluxo_id', flowData.id);

          if (linkData) {
            selectedMunIds = linkData.map(l => l.municipio_id);
          }
        }
      } catch (err) {
        console.error('Erro ao buscar fluxo/municípios do especialista:', err);
      }
    }

    // Check if the profile's municipality is in municipiosList
    const profileMun = profile.municipio && profile.municipio !== 'Não especificado' ? profile.municipio : '';
    const knownMunMatch = municipiosList.find(m => m.municipio.toLowerCase() === profileMun.toLowerCase());
    let initialMun = profileMun;
    let customMun = '';

    if (profileMun && !knownMunMatch) {
      initialMun = '__outro__';
      customMun = profileMun;
    } else if (knownMunMatch) {
      initialMun = knownMunMatch.municipio;
    }

    setEditCustomMunicipio(customMun);

    setEditProf({
      id: profile.id,
      nome: profile.nome,
      email: profile.email,
      cpf: profile.cpf,
      crm_coren_num: num,
      uf: ufVal,
      role: profile.role,
      rqe: profile.rqe || '',
      especialidadeId: espId,
      municipiosIds: selectedMunIds,
      instituicao: profile.instituicao || '',
      municipio: initialMun,
      telefone: profile.telefone ? formatTelefone(profile.telefone) : '',
    });
    setEditModalOpen(true);
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProf) return;

    setEditLoading(true);
    setEditError(null);
    setEditSuccess(false);

    try {
      if (!editProf.nome.trim() || !editProf.email.trim() || !editProf.cpf.trim()) {
        throw new Error('Nome, E-mail e CPF são obrigatórios.');
      }
      const cleanCpf = editProf.cpf.replace(/\D/g, '');
      if (cleanCpf.length !== 11) {
        throw new Error('O CPF deve conter 11 dígitos.');
      }

      // Telephone validation
      if (editProf.telefone.trim()) {
        const cleanPhone = editProf.telefone.replace(/\D/g, '');
        if (cleanPhone.length < 10 || cleanPhone.length > 11) {
          throw new Error('Por favor, insira um telefone de contato válido com DDD (10 ou 11 dígitos).');
        }
      }

      if (editProf.role === 'especialista') {
        if (!editProf.rqe.trim()) {
          throw new Error('O RQE é obrigatório para médicos especialistas.');
        }
        if (!editProf.especialidadeId) {
          throw new Error('A especialidade médica é obrigatória para médicos especialistas.');
        }
        if (!editProf.municipiosIds || editProf.municipiosIds.length === 0) {
          throw new Error('Por favor, selecione ao menos um município atendido para a rede de cobertura do especialista.');
        }
      }

      const selectedEsp = especialidades.find(e => e.id === editProf.especialidadeId);
      const categoryName = editProf.role === 'especialista' && selectedEsp 
        ? selectedEsp.nome 
        : (editProf.role === 'solicitante' ? 'Clínico Geral' : (editProf.role === 'gestor_municipal' ? 'Gestor Municipal' : null));

      const isMedicalEdit = editProf.role !== 'gestor_municipal' && editProf.role !== 'admin';
      const formattedCrm = (isMedicalEdit && editProf.crm_coren_num.trim()) 
        ? `${editProf.crm_coren_num.trim()} / ${editProf.uf}` 
        : null;

      const finalMunicipio = editProf.municipio === '__outro__'
        ? (editCustomMunicipio.trim() || 'Não especificado')
        : (editProf.municipio.trim() || 'Não especificado');

      // 1. Update perfis table
      const { error: profileError } = await supabase
        .from('perfis')
        .update({
          nome: editProf.nome.trim(),
          email: editProf.email.trim(),
          cpf: cleanCpf,
          role: editProf.role,
          crm_coren: formattedCrm,
          rqe: editProf.role === 'especialista' ? editProf.rqe.trim() : null,
          categoria_profissional: categoryName,
          instituicao: editProf.instituicao.trim() || 'Não especificado',
          municipio: finalMunicipio,
          telefone: editProf.telefone.trim() ? editProf.telefone.replace(/\D/g, '') : null,
        })
        .eq('id', editProf.id);

      if (profileError) throw profileError;

      // 2. Manage fluxos_especialidades & fluxos_especialidades_municipios
      if (editProf.role === 'especialista' && selectedEsp) {
        // Check if flow already exists
        const { data: existingFlow, error: checkError } = await supabase
          .from('fluxos_especialidades')
          .select('id')
          .eq('especialista_id', editProf.id)
          .maybeSingle();

        let flowId = '';
        if (checkError) console.error('Erro ao verificar fluxo existente:', checkError);

        if (existingFlow) {
          flowId = existingFlow.id;
          // Update
          const { error: flowUpdateError } = await supabase
            .from('fluxos_especialidades')
            .update({ nome_fluxo: selectedEsp.nome })
            .eq('especialista_id', editProf.id);
          if (flowUpdateError) throw flowUpdateError;
        } else {
          // Insert
          const { data: newFlow, error: flowInsertError } = await supabase
            .from('fluxos_especialidades')
            .insert([{
              especialista_id: editProf.id,
              nome_fluxo: selectedEsp.nome,
              tipo_fluxo: 'Consultivo',
              idade_minima: null,
              idade_maxima: null,
              sexo: null,
            }])
            .select('id')
            .single();

          if (flowInsertError) throw flowInsertError;
          if (newFlow) {
            flowId = newFlow.id;
          }
        }

        if (flowId) {
          // Delete old links
          const { error: deleteLinksError } = await supabase
            .from('fluxos_especialidades_municipios')
            .delete()
            .eq('fluxo_id', flowId);
          if (deleteLinksError) throw deleteLinksError;

          // Insert new links
          if (editProf.municipiosIds && editProf.municipiosIds.length > 0) {
            const linkPayload = editProf.municipiosIds.map(mId => ({
              fluxo_id: flowId,
              municipio_id: mId
            }));
            const { error: insertLinksError } = await supabase
              .from('fluxos_especialidades_municipios')
              .insert(linkPayload);
            if (insertLinksError) throw insertLinksError;
          }
        }
      } else {
        // If no longer specialist, remove their flow and links
        const { data: oldFlow } = await supabase
          .from('fluxos_especialidades')
          .select('id')
          .eq('especialista_id', editProf.id)
          .maybeSingle();

        if (oldFlow) {
          await supabase
            .from('fluxos_especialidades_municipios')
            .delete()
            .eq('fluxo_id', oldFlow.id);

          const { error: flowDeleteError } = await supabase
            .from('fluxos_especialidades')
            .delete()
            .eq('especialista_id', editProf.id);
          if (flowDeleteError) console.error('Erro ao remover fluxo de especialidade do ex-especialista:', flowDeleteError);
        }
      }

      setEditSuccess(true);
      setTimeout(() => {
        setEditModalOpen(false);
        setEditSuccess(false);
        setEditProf(null);
        fetchPerfis();
      }, 1500);

    } catch (err: any) {
      console.error(err);
      setEditError(err.message || 'Erro ao salvar alterações do profissional.');
    } finally {
      setEditLoading(false);
    }
  };

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

      // Find the name of the selected specialty if it exists or set category according to role
      const selectedEsp = especialidades.find(e => e.id === newProf.especialidadeId);
      const categoryName = newProf.role === 'especialista' && selectedEsp 
        ? selectedEsp.nome 
        : (newProf.role === 'solicitante' ? 'Clínico Geral' : (newProf.role === 'gestor_municipal' ? 'Gestor Municipal' : null));

      // Create the profile in the 'perfis' table
      const isMedicalCreate = newProf.role !== 'gestor_municipal' && newProf.role !== 'admin';
      const docCrm = (isMedicalCreate && newProf.crm_coren.trim()) ? `${newProf.crm_coren.trim()} / ${newProf.uf}` : null;

      const finalMunicipio = newProf.municipio === '__outro__'
        ? (createCustomMunicipio.trim() || 'Não especificado')
        : (newProf.municipio.trim() || 'Não especificado');

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
          municipio: finalMunicipio,
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
        setCreateCustomMunicipio('');
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
      setCreateError(err.message || 'Erro inesperado ao cadastrar usuário.');
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
      visualizador: 'Visualizador',
      gestor_municipal: 'Gestor Municipal'
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
      case 'gestor_municipal':
        return 'bg-amber-50 border-amber-200 text-amber-700';
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

  // Helper to get professional category display text with smart fallback
  const getCategoriaDisplay = (item: Perfil): string => {
    if (item.categoria_profissional) return item.categoria_profissional;
    if (item.role === 'solicitante') return 'Clínico Geral';
    if (item.role === 'gestor_municipal') return 'Gestor Municipal';
    if (item.role === 'admin') return 'Administração';
    if (item.role === 'especialista') return 'Médico Especialista';
    return 'Não informada';
  };

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
            Cadastrar Usuário / Perfil
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
            <table className="min-w-full divide-y divide-gray-200 text-left text-xs sm:text-sm">
              <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5 whitespace-nowrap">Nome Completo</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">E-mail</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">Categoria Profissional</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">Tipo de Perfil</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">Data de Cadastro</th>
                  <th className="px-4 py-3.5 whitespace-nowrap">Status</th>
                  <th className="px-4 py-3.5 text-right whitespace-nowrap">Ações</th>
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
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold">
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-gray-955">{item.nome}</div>
                            {item.cpf && (
                              <div className="text-[10px] text-gray-400 mt-0.5 whitespace-nowrap">
                                CPF: {item.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        <a 
                          href={`mailto:${item.email}`}
                          className="hover:text-indigo-600 hover:underline transition text-xs"
                        >
                          {item.email}
                        </a>
                      </td>

                      {/* Categoria Profissional */}
                      <td className="px-4 py-3 text-gray-950 font-medium whitespace-nowrap">
                        <span>{getCategoriaDisplay(item)}</span>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold border ${getRoleStyle(item.role)}`}>
                          {formatRole(item.role)}
                        </span>
                      </td>

                      {/* Created At */}
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
                        {item.created_at 
                          ? new Date(item.created_at).toLocaleDateString('pt-BR') 
                          : '--'}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {item.status_cadastro === 'aprovado' && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-semibold text-emerald-850">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                            Aprovado
                          </span>
                        )}
                        {item.status_cadastro === 'pendente' && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-855">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                            Pendente
                          </span>
                        )}
                        {item.status_cadastro === 'bloqueado' && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-xs font-semibold text-rose-850">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
                            Bloqueado
                          </span>
                        )}
                        {item.status_cadastro !== 'aprovado' && item.status_cadastro !== 'pendente' && item.status_cadastro !== 'bloqueado' && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 border border-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-gray-500" />
                            {item.status_cadastro}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            disabled={isActioning}
                            className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 disabled:bg-gray-50 text-indigo-700 disabled:text-gray-400 border border-indigo-200 disabled:border-gray-200 px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed cursor-pointer"
                            title="Editar Dados"
                          >
                            <Edit className="h-3.5 w-3.5" />
                            Editar
                          </button>
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
                            className="inline-flex items-center gap-1 rounded-lg bg-amber-50 hover:bg-amber-100 disabled:bg-gray-50 text-amber-800 disabled:text-gray-400 border border-amber-200 disabled:border-gray-200 px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed cursor-pointer"
                            title="Bloquear Usuário"
                          >
                            {isActioning ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Ban className="h-3.5 w-3.5" />
                            )}
                            Bloquear
                          </button>
                          <button
                            onClick={() => handleOpenDeleteModal(item)}
                            disabled={isActioning}
                            className="inline-flex items-center gap-1 rounded-lg bg-rose-50 hover:bg-rose-100 disabled:bg-gray-50 text-rose-700 disabled:text-gray-400 border border-rose-200 disabled:border-gray-200 px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed cursor-pointer"
                            title="Excluir Usuário"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                            Excluir
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
                Cadastrar Novo Usuário / Perfil
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
                  <span>Usuário cadastrado com sucesso!</span>
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
                    onChange={e => setNewProf(prev => ({ ...prev, role: e.target.value as UserRole }))}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500 bg-white"
                  >
                    <option value="especialista">Especialista (Médico de Referência)</option>
                    <option value="solicitante">Solicitante (Clínico da Unidade)</option>
                    <option value="gestor_municipal">Gestor Municipal</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                {/* CRM/COREN e UF (Apenas para perfis médicos: Especialista e Solicitante) */}
                {(newProf.role === 'especialista' || newProf.role === 'solicitante') && (
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
                )}

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

                {/* Município de Atuação (Dropdown padronizado) */}
                <div>
                  <label htmlFor="modal-municipio" className="block text-xs font-bold text-gray-700 mb-1">
                    Município de Atuação {newProf.role === 'gestor_municipal' ? '*' : ''}
                  </label>
                  <select
                    id="modal-municipio"
                    required={newProf.role === 'gestor_municipal'}
                    disabled={createLoading}
                    value={newProf.municipio}
                    onChange={e => setNewProf(prev => ({ ...prev, municipio: e.target.value }))}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500 bg-white"
                  >
                    <option value="">Selecione um município...</option>
                    {municipiosList.map(m => (
                      <option key={m.id} value={m.municipio}>
                        {m.municipio} - {m.uf}
                      </option>
                    ))}
                    <option value="__outro__">+ Outro (Digitar município...)</option>
                  </select>

                  {newProf.municipio === '__outro__' && (
                    <div className="mt-2">
                      <input
                        type="text"
                        required
                        disabled={createLoading}
                        placeholder="Digite o nome do município..."
                        value={createCustomMunicipio}
                        onChange={e => setCreateCustomMunicipio(e.target.value)}
                        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500"
                      />
                    </div>
                  )}

                  <p className="text-[10px] text-gray-500 mt-1">
                    Não encontrou a cidade? Cadastre-a na aba <strong>Municípios</strong> ou selecione <em>"+ Outro"</em>.
                  </p>
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
                    'Cadastrar Usuário / Perfil'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Professional Modal */}
      {editModalOpen && editProf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-gray-250 shadow-2xl w-full max-w-xl overflow-hidden my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-150" style={{ backgroundColor: '#091151' }}>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit className="h-5 w-5 text-[#28ffb2]" />
                Editar Profissional
              </h3>
              <button 
                onClick={() => { setEditModalOpen(false); setEditProf(null); }}
                className="text-slate-300 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitEdit} className="p-6 space-y-4">
              {editError && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-700 flex items-start gap-2">
                  <ShieldAlert className="h-4.5 w-4.5 text-rose-600 shrink-0 mt-0.5" />
                  <span>{editError}</span>
                </div>
              )}

              {editSuccess && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3.5 text-xs text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                  <span>Alterações salvas com sucesso!</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nome Completo */}
                <div className="sm:col-span-2">
                  <label htmlFor="edit-nome" className="block text-xs font-bold text-gray-700 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    id="edit-nome"
                    type="text"
                    required
                    disabled={editLoading}
                    placeholder="Ex: Dr. Roberto Alencar"
                    value={editProf.nome}
                    onChange={e => setEditProf(prev => prev ? ({ ...prev, nome: e.target.value }) : null)}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500"
                  />
                </div>

                {/* E-mail */}
                <div>
                  <label htmlFor="edit-email" className="block text-xs font-bold text-gray-700 mb-1">
                    Endereço de E-mail *
                  </label>
                  <input
                    id="edit-email"
                    type="email"
                    required
                    disabled={editLoading}
                    placeholder="medico@exemplo.com.br"
                    value={editProf.email}
                    onChange={e => setEditProf(prev => prev ? ({ ...prev, email: e.target.value }) : null)}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500"
                  />
                </div>

                {/* CPF */}
                <div>
                  <label htmlFor="edit-cpf" className="block text-xs font-bold text-gray-700 mb-1">
                    CPF *
                  </label>
                  <input
                    id="edit-cpf"
                    type="text"
                    required
                    disabled={editLoading}
                    placeholder="Apenas números (11 dígitos)"
                    value={editProf.cpf}
                    onChange={e => setEditProf(prev => prev ? ({ ...prev, cpf: e.target.value.replace(/\D/g, '') }) : null)}
                    maxLength={11}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500"
                  />
                </div>

                {/* Telefone */}
                <div>
                  <label htmlFor="edit-telefone" className="block text-xs font-bold text-gray-700 mb-1">
                    Telefone de Contato
                  </label>
                  <input
                    id="edit-telefone"
                    type="text"
                    disabled={editLoading}
                    placeholder="(00) 00000-0000"
                    value={editProf.telefone}
                    onChange={e => setEditProf(prev => prev ? ({ ...prev, telefone: formatTelefone(e.target.value) }) : null)}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500"
                  />
                </div>

                {/* Perfil/Função */}
                <div>
                  <label htmlFor="edit-role" className="block text-xs font-bold text-gray-700 mb-1">
                    Perfil / Função *
                  </label>
                  <select
                    id="edit-role"
                    required
                    disabled={editLoading}
                    value={editProf.role}
                    onChange={e => setEditProf(prev => prev ? ({ ...prev, role: e.target.value as UserRole }) : null)}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500 bg-white"
                  >
                    <option value="especialista">Especialista (Médico de Referência)</option>
                    <option value="solicitante">Solicitante (Clínico da Unidade)</option>
                    <option value="gestor_municipal">Gestor Municipal</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                {/* CRM/COREN e UF (Apenas para perfis médicos: Especialista e Solicitante) */}
                {(editProf.role === 'especialista' || editProf.role === 'solicitante') && (
                  <div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label htmlFor="edit-crm" className="block text-xs font-bold text-gray-700 mb-1">
                          CRM / COREN
                        </label>
                        <input
                          id="edit-crm"
                          type="text"
                          disabled={editLoading}
                          placeholder="Número do Registro"
                          value={editProf.crm_coren_num}
                          onChange={e => setEditProf(prev => prev ? ({ ...prev, crm_coren_num: e.target.value }) : null)}
                          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500"
                        />
                      </div>
                      <div className="w-20">
                        <label htmlFor="edit-uf" className="block text-xs font-bold text-gray-700 mb-1">
                          UF
                        </label>
                        <select
                          id="edit-uf"
                          disabled={editLoading}
                          value={editProf.uf}
                          onChange={e => setEditProf(prev => prev ? ({ ...prev, uf: e.target.value }) : null)}
                          className="block w-full rounded-lg border border-gray-300 px-2 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500 bg-white"
                        >
                          <option value="">UF</option>
                          {['SP', 'RJ', 'MG', 'ES', 'PR', 'SC', 'RS', 'MS', 'MT', 'GO', 'DF', 'AM', 'PA', 'AC', 'RO', 'RR', 'AP', 'TO', 'MA', 'PI', 'CE', 'RN', 'PB', 'PE', 'AL', 'SE', 'BA'].map(uf => (
                            <option key={uf} value={uf}>{uf}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* RQE (Somente para Especialistas) */}
                {editProf.role === 'especialista' && (
                  <div>
                    <label htmlFor="edit-rqe" className="block text-xs font-bold text-gray-700 mb-1">
                      RQE *
                    </label>
                    <input
                      id="edit-rqe"
                      type="text"
                      required={editProf.role === 'especialista'}
                      disabled={editLoading}
                      placeholder="Registro de Qualificação"
                      value={editProf.rqe}
                      onChange={e => setEditProf(prev => prev ? ({ ...prev, rqe: e.target.value }) : null)}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500"
                    />
                  </div>
                )}

                {/* Especialidade Médica (Somente para Especialistas) */}
                {editProf.role === 'especialista' && (
                  <div className={editProf.role === 'especialista' ? '' : 'sm:col-span-2'}>
                    <label htmlFor="edit-especialidade" className="block text-xs font-bold text-gray-700 mb-1">
                      Especialidade Médica *
                    </label>
                    <select
                      id="edit-especialidade"
                      required={editProf.role === 'especialista'}
                      disabled={editLoading}
                      value={editProf.especialidadeId}
                      onChange={e => setEditProf(prev => prev ? ({ ...prev, especialidadeId: e.target.value }) : null)}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500 bg-white"
                    >
                      <option value="">Selecione uma especialidade...</option>
                      {especialidades.map(esp => (
                        <option key={esp.id} value={esp.id}>{esp.nome}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Municípios Atendidos (Somente para Especialistas) */}
                {editProf.role === 'especialista' && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Municípios Atendidos / Rede de Cobertura *
                    </label>
                    <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto bg-gray-50/50 space-y-2">
                      {municipiosList.length === 0 ? (
                        <span className="text-gray-400 text-xs italic">Nenhum município cadastrado no sistema.</span>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {municipiosList.map(m => {
                            const isChecked = editProf.municipiosIds?.includes(m.id) || false;
                            return (
                              <label key={m.id} className="flex items-center gap-2 text-xs text-gray-800 cursor-pointer hover:bg-gray-100/50 p-1 rounded transition">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setEditProf(prev => {
                                      if (!prev) return null;
                                      const currentIds = prev.municipiosIds || [];
                                      const updatedIds = checked
                                        ? [...currentIds, m.id]
                                        : currentIds.filter(id => id !== m.id);
                                      return { ...prev, municipiosIds: updatedIds };
                                    });
                                  }}
                                  className="rounded text-indigo-655 focus:ring-indigo-500 h-3.5 w-3.5"
                                />
                                <span>{m.municipio} - {m.uf}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Unidade / Vínculo */}
                <div>
                  <label htmlFor="edit-instituicao" className="block text-xs font-bold text-gray-700 mb-1">
                    Unidade / Vínculo
                  </label>
                  <input
                    id="edit-instituicao"
                    type="text"
                    disabled={editLoading}
                    placeholder="Ex: UBS Santa Marta"
                    value={editProf.instituicao}
                    onChange={e => setEditProf(prev => prev ? ({ ...prev, instituicao: e.target.value }) : null)}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500"
                  />
                </div>

                {/* Município (Dropdown padronizado) */}
                <div>
                  <label htmlFor="edit-municipio" className="block text-xs font-bold text-gray-700 mb-1">
                    Município de Atuação {editProf.role === 'gestor_municipal' ? '*' : ''}
                  </label>
                  <select
                    id="edit-municipio"
                    required={editProf.role === 'gestor_municipal'}
                    disabled={editLoading}
                    value={editProf.municipio}
                    onChange={e => setEditProf(prev => prev ? ({ ...prev, municipio: e.target.value }) : null)}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500 bg-white"
                  >
                    <option value="">Selecione um município...</option>
                    {municipiosList.map(m => (
                      <option key={m.id} value={m.municipio}>
                        {m.municipio} - {m.uf}
                      </option>
                    ))}
                    <option value="__outro__">+ Outro (Digitar município...)</option>
                  </select>

                  {editProf.municipio === '__outro__' && (
                    <div className="mt-2">
                      <input
                        type="text"
                        required
                        disabled={editLoading}
                        placeholder="Digite o nome do município..."
                        value={editCustomMunicipio}
                        onChange={e => setEditCustomMunicipio(e.target.value)}
                        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500"
                      />
                    </div>
                  )}

                  <p className="text-[10px] text-gray-500 mt-1">
                    Não encontrou a cidade? Cadastre-a na aba <strong>Municípios</strong> ou selecione <em>"+ Outro"</em>.
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-150 mt-5">
                <button
                  type="button"
                  disabled={editLoading}
                  onClick={() => { setEditModalOpen(false); setEditProf(null); }}
                  className="rounded-lg border border-gray-300 hover:bg-gray-50 px-4.5 py-2 text-xs font-semibold text-gray-700 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editLoading || editSuccess}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-750 px-5 py-2 text-xs font-bold text-white transition cursor-pointer disabled:opacity-50"
                >
                  {editLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar Alterações'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {deleteModalOpen && profileToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-gray-250 shadow-2xl w-full max-w-md overflow-hidden my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-150 bg-rose-600">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-white" />
                Confirmar Exclusão de Usuário
              </h3>
              <button 
                onClick={() => { setDeleteModalOpen(false); setProfileToDelete(null); }}
                className="text-white/80 hover:text-white transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {deleteError && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-700 flex items-start gap-2">
                  <ShieldAlert className="h-4.5 w-4.5 text-rose-600 shrink-0 mt-0.5" />
                  <span>{deleteError}</span>
                </div>
              )}

              <p className="text-sm text-gray-800 leading-relaxed">
                Tem certeza que deseja excluir o usuário <strong className="text-gray-950 font-bold">{profileToDelete.nome}</strong>?
              </p>

              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 text-xs text-amber-800 space-y-1">
                <p className="font-bold text-amber-900 flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
                  Atenção: Ação Irreversível
                </p>
                <p className="text-[11px] text-amber-700">
                  Esta ação removerá permanentemente o perfil do usuário (<span className="font-mono text-[10px]">{profileToDelete.email}</span>) e todas as suas permissões no sistema.
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-150 mt-5">
                <button
                  type="button"
                  disabled={deleteLoading}
                  onClick={() => { setDeleteModalOpen(false); setProfileToDelete(null); }}
                  className="rounded-lg border border-gray-300 hover:bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-700 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={deleteLoading}
                  onClick={handleConfirmDelete}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 px-5 py-2 text-xs font-bold text-white transition cursor-pointer disabled:opacity-50"
                >
                  {deleteLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Excluindo...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-3.5 w-3.5" />
                      Confirmar Exclusão
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
