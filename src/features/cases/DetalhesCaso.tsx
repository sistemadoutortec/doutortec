import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CasoClinico, MensagemChat } from '../../types';
import { 
  Clock, 
  Send, 
  ArrowLeft, 
  PlayCircle, 
  Loader2, 
  FileText, 
  Ban, 
  MessageSquare, 
  FileCheck,
  ShieldCheck,
  X
} from 'lucide-react';
import { VisualizadorDocumentos } from '../documents/VisualizadorDocumentos';
import { useNotifications } from '../../context/NotificationsContext';

interface DetalhesCasoProps {
  caso: CasoClinico;
  onBack: () => void;
  onUpdateCaso?: (updated: CasoClinico) => void;
}

export const DetalhesCaso: React.FC<DetalhesCasoProps> = ({ caso, onBack, onUpdateCaso }) => {
  const { user, perfil } = useAuth();
  
  // Local case state
  const [currentCaso, setCurrentCaso] = useState<CasoClinico>(caso);
  const [cidDesc, setCidDesc] = useState<string>('');
  const [ciapDesc, setCiapDesc] = useState<string>('');

  useEffect(() => {
    const fetchDiagnosticosDescs = async () => {
      if (currentCaso.cid_10) {
        try {
          const { data } = await supabase
            .from('cid10')
            .select('descricao')
            .eq('codigo', currentCaso.cid_10)
            .maybeSingle();
          if (data) setCidDesc(data.descricao);
        } catch (e) {
          console.error(e);
        }
      } else {
        setCidDesc('');
      }

      if (currentCaso.ciap_2) {
        try {
          const { data } = await supabase
            .from('ciap2')
            .select('descricao')
            .eq('codigo', currentCaso.ciap_2)
            .maybeSingle();
          if (data) setCiapDesc(data.descricao);
        } catch (e) {
          console.error(e);
        }
      } else {
        setCiapDesc('');
      }
    };

    fetchDiagnosticosDescs();
  }, [currentCaso.cid_10, currentCaso.ciap_2]);

  const queryClient = useQueryClient();

  // Evaluation Modal states
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
  const [resolveuDuvida, setResolveuDuvida] = useState<boolean | null>(null);
  const [grauSatisfacao, setGrauSatisfacao] = useState<number>(0);
  const [evitouEncaminhamento, setEvitouEncaminhamento] = useState<boolean | null>(null);
  const [hoveredStars, setHoveredStars] = useState<number>(0);

  const closeAndEvaluateMutation = useMutation({
    mutationFn: async (evalData: {
      resolveuDuvida: boolean;
      grauSatisfacao: number;
      evitouEncaminhamento: boolean;
    }) => {
      const { error: evalError } = await supabase
        .from('casos_avaliacoes')
        .insert([
          {
            caso_id: currentCaso.id,
            solicitante_id: currentCaso.solicitante_id,
            especialista_id: currentCaso.especialista_id || null,
            resolveu_duvida: evalData.resolveuDuvida,
            grau_satisfacao: evalData.grauSatisfacao,
            evitou_encaminhamento: evalData.evitouEncaminhamento
          }
        ]);
      if (evalError) throw evalError;

      const { data: updatedCaso, error: updateError } = await supabase
        .from('casos')
        .update({
          status: 'fechado',
          fechado_em: new Date().toISOString()
        })
        .eq('id', currentCaso.id)
        .select(`
          id, paciente_nome, especialidade_id, prioridade, historico_clinico, conduta_atual, duvida_clinica, solicitante_id, especialista_id, status, created_at, respondido_em, fechado_em, devolutiva_conduta, devolutiva_aps
        `)
        .single();
      if (updateError) throw updateError;
      return updatedCaso;
    },
    onSuccess: (data) => {
      setCurrentCaso(data as CasoClinico);
      if (onUpdateCaso) onUpdateCaso(data as CasoClinico);
      setIsEvaluationModalOpen(false);
      setResolveuDuvida(null);
      setGrauSatisfacao(0);
      setEvitouEncaminhamento(null);
      queryClient.invalidateQueries({ queryKey: ['casos'] });
      queryClient.invalidateQueries({ queryKey: ['caso', currentCaso.id] });
      queryClient.invalidateQueries({ queryKey: ['ranking-especialistas'] });
      queryClient.invalidateQueries({ queryKey: ['painel-financeiro'] });
    },
    onError: (err: any) => {
      console.error(err);
      setActionError(`Erro ao registrar avaliação e fechar caso: ${err.message || err}`);
    }
  });

  const closeDirectMutation = useMutation({
    mutationFn: async () => {
      const { data: updatedCaso, error: updateError } = await supabase
        .from('casos')
        .update({
          status: 'fechado',
          fechado_em: new Date().toISOString()
        })
        .eq('id', currentCaso.id)
        .select(`
          id, paciente_nome, especialidade_id, prioridade, historico_clinico, conduta_atual, duvida_clinica, solicitante_id, especialista_id, status, created_at, respondido_em, fechado_em, devolutiva_conduta, devolutiva_aps
        `)
        .single();
      if (updateError) throw updateError;
      return updatedCaso;
    },
    onSuccess: (data) => {
      setCurrentCaso(data as CasoClinico);
      if (onUpdateCaso) onUpdateCaso(data as CasoClinico);
      queryClient.invalidateQueries({ queryKey: ['casos'] });
      queryClient.invalidateQueries({ queryKey: ['caso', currentCaso.id] });
      queryClient.invalidateQueries({ queryKey: ['ranking-especialistas'] });
      queryClient.invalidateQueries({ queryKey: ['painel-financeiro'] });
    },
    onError: (err: any) => {
      console.error(err);
      setActionError(`Erro ao fechar caso: ${err.message || err}`);
    }
  });
  
  // Collapsible Chat Drawer State
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // Chat state
  const [messages, setMessages] = useState<MensagemChat[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingChat, setLoadingChat] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  
  // Devolutiva Form state
  const [devolutivaConduta, setDevolutivaConduta] = useState('');
  const [devolutivaAps, setDevolutivaAps] = useState('');
  
  // Action state (assign/respond)
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Document visualizer state
  const [selectedFile, setSelectedFile] = useState<{ nome: string; path: string; tipo: string } | null>(null);

  // Dictionary for message sender names
  const [sendersMap, setSendersMap] = useState<Record<string, string>>({});

  const [slaBadge, setSlaBadge] = useState<{ text: string; colorClass: string }>({ text: '', colorClass: '' });

  // Initialize values
  useEffect(() => {
    setCurrentCaso(caso);
    setDevolutivaConduta(caso.devolutiva_conduta || '');
    setDevolutivaAps(caso.devolutiva_aps || '');
  }, [caso]);

  useEffect(() => {
    const updateSla = () => {
      if (currentCaso.status === 'fechado' || currentCaso.status === 'respondido') {
        setSlaBadge({ text: 'Concluído', colorClass: 'text-green-600 bg-green-50 border-green-200' });
        return;
      }

      const hoursLimit = currentCaso.prioridade === 'alta' ? 12 : currentCaso.prioridade === 'media' ? 48 : 72;
      const limitTime = new Date(new Date(currentCaso.created_at).getTime() + hoursLimit * 60 * 60 * 1000);
      const remainingMs = limitTime.getTime() - Date.now();

      if (remainingMs <= 0) {
        setSlaBadge({ text: 'Atrasado (SLA Vencido)', colorClass: 'text-red-600 bg-red-50 border-red-200 animate-pulse' });
        return;
      }

      const hours = Math.floor(remainingMs / (1000 * 60 * 60));
      const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

      if (hours < 4) {
        setSlaBadge({ text: `${hours}h ${minutes}m restantes`, colorClass: 'text-amber-600 bg-amber-50 border-amber-200 font-semibold' });
      } else {
        setSlaBadge({ text: `${hours}h ${minutes}m restantes`, colorClass: 'text-gray-600 bg-gray-50 border-gray-200' });
      }
    };

    updateSla();
    const interval = setInterval(updateSla, 60000);
    return () => clearInterval(interval);
  }, [currentCaso.created_at, currentCaso.prioridade, currentCaso.status]);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isChatOpenRef = useRef(isChatOpen);

  useEffect(() => {
    isChatOpenRef.current = isChatOpen;
  }, [isChatOpen]);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch names of profiles in messages
  const fetchSenders = async (msgList: MensagemChat[]) => {
    const senderIds = Array.from(new Set(msgList.map(m => m.perfil_id)));
    if (senderIds.length === 0) return;

    try {
      const { data } = await supabase
        .from('perfis')
        .select('id, nome')
        .in('id', senderIds);
      
      if (data) {
        const newMap: Record<string, string> = {};
        data.forEach(p => {
          newMap[p.id] = p.nome;
        });
        setSendersMap(prev => ({ ...prev, ...newMap }));
      }
    } catch (err) {
      console.error('Erro ao buscar perfis dos remetentes:', err);
    }
  };

  // Fetch Chat Messages
  const fetchMessages = async () => {
    try {
      setLoadingChat(true);
      const { data, error } = await supabase
        .from('mensagens_chat')
        .select('id, caso_id, perfil_id, nome_remetente, texto, criado_em')
        .eq('caso_id', currentCaso.id)
        .order('criado_em', { ascending: true });

      if (error) {
        console.warn('Erro ao carregar mensagens, simulando tabela vazia:', error.message);
        setMessages([]);
      } else {
        const msgList = (data as MensagemChat[]) || [];
        setMessages(msgList);
        await fetchSenders(msgList);
      }
    } catch (err) {
      console.error('Erro inesperado ao buscar mensagens:', err);
    } finally {
      setLoadingChat(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  useEffect(() => {
    fetchMessages();

    // Subscribe to real-time chat messages
    const channel = supabase
      .channel(`chat_room_${currentCaso.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensagens_chat', filter: `caso_id=eq.${currentCaso.id}` },
        async (payload) => {
          const newMsg = payload.new as MensagemChat;
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          if (!newMsg.nome_remetente && !sendersMap[newMsg.perfil_id]) {
            try {
              const { data } = await supabase
                .from('perfis')
                .select('nome')
                .eq('id', newMsg.perfil_id)
                .single();
              if (data) {
                setSendersMap(prev => ({ ...prev, [newMsg.perfil_id]: data.nome }));
              }
            } catch (e) {
              console.error(e);
            }
          }
          setTimeout(scrollToBottom, 50);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentCaso.id]);

  // Automatically scroll to bottom when chat opens
  useEffect(() => {
    if (isChatOpen) {
      setTimeout(scrollToBottom, 150);
    }
  }, [isChatOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || sendingMessage) return;

    setSendingMessage(true);
    try {
      const { error } = await supabase
        .from('mensagens_chat')
        .insert([
          {
            caso_id: currentCaso.id,
            perfil_id: user.id,
            nome_remetente: perfil?.nome || 'Usuário',
            texto: newMessage.trim()
          }
        ]);

      if (error) throw error;
      setNewMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      fetchMessages();
    } catch (err: any) {
      console.error('Erro ao enviar mensagem:', err.message || err);
      setActionError('Erro ao enviar mensagem no chat.');
    } finally {
      setSendingMessage(false);
    }
  };

  // Specialist Action: Accept Case
  const handleAcceptCase = async () => {
    if (!user || updatingStatus) return;
    setUpdatingStatus(true);
    setActionError(null);

    try {
      const { data, error } = await supabase
        .from('casos')
        .update({
          especialista_id: user.id,
          status: 'em_progresso'
        })
        .eq('id', currentCaso.id)
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setCurrentCaso(data as CasoClinico);
        if (onUpdateCaso) onUpdateCaso(data as CasoClinico);
      }
    } catch (err: any) {
      console.error('Erro ao aceitar caso:', err.message || err);
      setActionError('Não foi possível iniciar o atendimento deste caso.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Specialist Action: Submit Official Devolutiva (System Ticket Resolution)
  const handleSubmitDevolutiva = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || updatingStatus) return;
    if (!devolutivaConduta.trim() || !devolutivaAps.trim()) {
      setActionError('Por favor, preencha todos os campos obrigatórios da Devolutiva.');
      return;
    }

    setUpdatingStatus(true);
    setActionError(null);

    try {
      const { data, error } = await supabase
        .from('casos')
        .update({
          status: 'respondido',
          devolutiva_conduta: devolutivaConduta.trim(),
          devolutiva_aps: devolutivaAps.trim(),
          respondido_em: new Date().toISOString()
        })
        .eq('id', currentCaso.id)
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setCurrentCaso(data as CasoClinico);
        if (onUpdateCaso) onUpdateCaso(data as CasoClinico);
      }
    } catch (err: any) {
      console.error('Erro ao enviar devolutiva:', err.message || err);
      setActionError(`Erro ao salvar a Devolutiva Oficial no banco de dados: ${err.message || 'Erro desconhecido'}. Certifique-se de executar a migração SQL.`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Action: Close/Archive Case (Specialist or Admin or Solicitante if respondido)
  const handleCloseCase = () => {
    if (currentCaso.status === 'respondido') {
      setIsEvaluationModalOpen(true);
    } else {
      if (window.confirm('Deseja realmente encerrar este chamado sem avaliação?')) {
        closeDirectMutation.mutate();
      }
    }
  };

  const getPriorityColor = (prio: string) => {
    switch (prio) {
      case 'alta': return 'text-red-700 bg-red-50 border-red-200';
      case 'media': return 'text-amber-700 bg-amber-50 border-amber-200';
      default: return 'text-blue-700 bg-blue-50 border-blue-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'novo': return 'Aberto';
      case 'em_progresso': return 'Em Progresso';
      case 'respondido': return 'Resolvido';
      case 'fechado': return 'Encerrado / Arquivado';
      default: return status;
    }
  };

  const caseAnexos = (currentCaso as any).anexos || [];
  
  // Track read messages locally and sync notifications context
  const { notificacoes, marcarComoLida } = useNotifications();
  
  const getStorageKey = () => `chat_last_seen_${currentCaso.id}_${user?.id}`;
  const [lastSeenTimestamp, setLastSeenTimestamp] = useState<number>(() => {
    const saved = localStorage.getItem(getStorageKey());
    return saved ? parseInt(saved, 10) : 0;
  });

  const updateLastSeen = (timestamp: number) => {
    setLastSeenTimestamp(timestamp);
    localStorage.setItem(getStorageKey(), timestamp.toString());
  };

  useEffect(() => {
    if (isChatOpen) {
      if (messages.length > 0) {
        const latestMsgTime = new Date(messages[messages.length - 1].criado_em).getTime();
        if (latestMsgTime > lastSeenTimestamp) {
          updateLastSeen(latestMsgTime);
        }
      }
      
      // Mark matching notifications as read
      notificacoes.forEach(n => {
        if (n.caso_id === currentCaso.id && !n.is_lida) {
          marcarComoLida(n.id);
        }
      });
    }
  }, [isChatOpen, messages, lastSeenTimestamp, notificacoes, currentCaso.id, marcarComoLida]);

  const unreadMessagesCount = isChatOpen
    ? 0
    : messages.filter(m => m.perfil_id !== user?.id && new Date(m.criado_em).getTime() > lastSeenTimestamp).length;

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10 relative">
      {/* STT-style info disclaimer banner */}
      <div className="flex items-start gap-3 rounded-lg p-3.5 text-sm" style={{ backgroundColor: '#e8f3fc', border: '1px solid #b2c4d6' }}>
        <div
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white text-[10px] font-bold mt-0.5"
          style={{ backgroundColor: '#002157' }}
        >
          i
        </div>
        <p style={{ color: '#002157' }} className="text-xs leading-relaxed font-semibold">
          O apoio oferecido por meio da teleconsultoria contempla sugestões de manejo dadas pelo teleconsultor, com base em evidências científicas, a partir do detalhamento do caso/situação pelo profissional solicitante. A tomada de decisão junto ao paciente ou equipe caberá ao profissional.
        </p>
      </div>

      {/* Header Bar with Collapsible Chat Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm font-extrabold transition"
            style={{ color: '#002157' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
          
          <div className="h-4 w-px bg-gray-300 hidden sm:block" />
          
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] text-[#56657c] font-mono">ID: #{currentCaso.id.substring(0, 8)}</span>
            <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-md border ${getPriorityColor(currentCaso.prioridade)}`}>
              {currentCaso.prioridade.toUpperCase()}
            </span>
            <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-md border ${
              currentCaso.status === 'fechado'
                ? 'bg-rose-100 border-rose-355 text-rose-700 font-extrabold tracking-wide uppercase'
                : 'bg-gray-100 border-gray-250 text-[#56657c]'
            }`}>
              {getStatusLabel(currentCaso.status)}
            </span>
            {slaBadge.text && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-md border ${slaBadge.colorClass}`}>
                <Clock className="h-3 w-3" />
                <span>{slaBadge.text}</span>
              </span>
            )}
          </div>
        </div>

        {/* Header Actions: Collapsible Chat Trigger & Accept/Close buttons */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          {/* Quick Messages Trigger */}
          <button
            type="button"
            onClick={() => setIsChatOpen(true)}
            className="relative inline-flex items-center gap-2 rounded-lg border border-[#0ea5e9] bg-[#e0f2fe] text-[#0369a1] hover:bg-[#bae6fd] px-3.5 py-2 text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
          >
            <MessageSquare className="h-4 w-4" />
            <span>Mensagens Rápidas</span>
            {unreadMessagesCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-rose-600 text-[9px] font-black text-white shadow-xs animate-bounce">
                {unreadMessagesCount}
              </span>
            )}
          </button>

          {/* Accept case for specialists */}
          {perfil?.role === 'especialista' && currentCaso.status === 'novo' && (
            <button
              type="button"
              onClick={handleAcceptCase}
              disabled={updatingStatus}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-750 px-4 py-2 text-xs font-bold text-white transition disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {updatingStatus ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5" />}
              Iniciar Atendimento
            </button>
          )}

          {/* Close/Archive case */}
          {currentCaso.status !== 'fechado' && (
            perfil?.role === 'admin' || 
            (perfil?.role === 'especialista' && currentCaso.especialista_id === user?.id) ||
            (perfil?.role === 'solicitante' && currentCaso.solicitante_id === user?.id && currentCaso.status === 'respondido')
          ) && (
            <button
              type="button"
              onClick={handleCloseCase}
              disabled={closeAndEvaluateMutation.isPending || closeDirectMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-605 hover:bg-rose-750 px-4 py-2 text-xs font-bold text-white transition disabled:opacity-50 cursor-pointer shadow-xs"
              style={{ backgroundColor: '#e11d48' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#be123c'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#e11d48'}
            >
              {closeAndEvaluateMutation.isPending || closeDirectMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Ban className="h-3.5 w-3.5" />
              )}
              {currentCaso.status === 'respondido' ? 'Avaliar e Encerrar' : 'Encerrar Ticket'}
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div className="flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800 animate-fade-in">
          <svg className="h-4 w-4 shrink-0 text-red-500 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          {actionError}
        </div>
      )}

      {/* Main Column Layout (Wider Central Structure) */}
      <div className="space-y-6">
        
        {/* CARD 1: TICKET OFFICIAL INFO (Patient + Case Details + Attachments) */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4.5 border-b border-gray-150" style={{ backgroundColor: '#e8f3fc' }}>
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#56657c] mb-0.5">Solicitação de Teleconsultoria</p>
            <h3 className="text-xl font-black" style={{ color: '#002157' }}>{currentCaso.paciente_nome}</h3>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-1">
              <p className="text-xs text-gray-500 font-medium">
                Data de Abertura: <span className="text-gray-700">{new Date(currentCaso.created_at).toLocaleString('pt-BR')}</span>
              </p>
              {(currentCaso.cid_10 || currentCaso.ciap_2) && (
                <div className="flex flex-wrap gap-2">
                  {currentCaso.cid_10 && (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 border border-blue-200" title={cidDesc}>
                      <span className="bg-blue-250 text-blue-800 rounded px-1 py-0.5 text-[9px] font-mono font-bold uppercase">CID-10: {currentCaso.cid_10}</span>
                      <span className="truncate max-w-[200px]">{cidDesc || 'Carregando descrição...'}</span>
                    </span>
                  )}
                  {currentCaso.ciap_2 && (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-purple-50 px-2 py-1 text-xs font-semibold text-purple-700 border border-purple-200" title={ciapDesc}>
                      <span className="bg-purple-250 text-purple-800 rounded px-1 py-0.5 text-[9px] font-mono font-bold uppercase">CIAP-2: {currentCaso.ciap_2}</span>
                      <span className="truncate max-w-[200px]">{ciapDesc || 'Carregando descrição...'}</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Details sections */}
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-[#002157] mb-2">Histórico Clínico</h4>
                <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap pl-4 py-3" style={{ borderLeft: '3px solid #002157', backgroundColor: '#f4f6f8', borderRadius: '0 6px 6px 0' }}>
                  {currentCaso.historico_clinico}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-[#002157] mb-2">Conduta Atual</h4>
                <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap pl-4 py-3" style={{ borderLeft: '3px solid #002157', backgroundColor: '#f4f6f8', borderRadius: '0 6px 6px 0' }}>
                  {currentCaso.conduta_atual}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-5">
              <h4 className="text-xs font-bold uppercase tracking-widest text-[#002157] mb-2">Dúvida Clínica</h4>
              <div className="text-sm leading-relaxed font-bold whitespace-pre-wrap p-4 rounded-lg border" style={{ backgroundColor: '#e8f3fc', borderColor: '#b2c4d6', color: '#002157' }}>
                {currentCaso.duvida_clinica}
              </div>
            </div>

            {/* Official Attachments Room */}
            {caseAnexos && caseAnexos.length > 0 && (
              <div className="border-t border-gray-100 pt-5">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-700 mb-3">Documentos e Exames Anexados (Solicitação Oficial)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {caseAnexos.map((anexo: any, idx: number) => (
                    <button
                      key={anexo.id || idx}
                      type="button"
                      onClick={() => setSelectedFile({ nome: anexo.nome, path: anexo.path, tipo: anexo.tipo })}
                      className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-indigo-400 hover:bg-gray-50 text-left transition w-full shadow-2xs"
                    >
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                         <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-gray-900 truncate" title={anexo.nome}>{anexo.nome}</p>
                        <p className="text-[10px] text-indigo-600 font-medium">Clique para visualizar</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CARD 2: DEVOLUTIVA DO ESPECIALISTA (The Central Ticket Element) */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-150 flex items-center gap-2" style={{ backgroundColor: '#0f172a' }}>
            <FileCheck className="h-5 w-5 text-[#38bdf8]" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Devolutiva do Especialista (Ticket Oficial)</h3>
          </div>

          <div className="p-6">
            {/* 1. Case already answered (Resolved State) */}
            {(currentCaso.status === 'respondido' || currentCaso.status === 'fechado') ? (
              <div className="space-y-6">
                <div className="rounded-xl border border-emerald-250 bg-emerald-50/50 p-4.5 flex gap-3.5">
                  <ShieldCheck className="h-6 w-6 text-emerald-600 shrink-0" />
                  <div>
                    <h4 className="text-sm font-extrabold text-emerald-900">Devolutiva Oficial Emitida</h4>
                    <p className="text-xs text-emerald-700 mt-0.5 font-medium">
                      Este ticket de teleconsultoria foi resolvido de forma oficial. Confira as orientações estruturadas abaixo:
                    </p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <h5 className="text-xs font-extrabold uppercase tracking-wider text-[#0f172a] mb-2">1. Resposta Direta / Conduta Recomendada</h5>
                    <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                      {currentCaso.devolutiva_conduta || 'Nenhuma conduta foi preenchida.'}
                    </div>
                  </div>

                  <div>
                    <h5 className="text-xs font-extrabold uppercase tracking-wider text-[#0f172a] mb-2">2. Contribuições e Recomendações para a Atenção Primária (APS)</h5>
                    <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                      {currentCaso.devolutiva_aps || 'Nenhuma contribuição para a APS foi preenchida.'}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* 2. Case in progress and logged user is the assigned specialist (Form State) */
              (currentCaso.status === 'em_progresso' && currentCaso.especialista_id === user?.id) ? (
                <form onSubmit={handleSubmitDevolutiva} className="space-y-5 text-left">
                  <p className="text-xs text-slate-500 mb-2 font-medium">
                    Preencha a devolutiva estruturada para concluir o chamado. Essas informações são oficiais e ficarão fixadas no prontuário do caso.
                  </p>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                      Resposta Direta / Conduta Recomendada *
                    </label>
                    <textarea
                      required
                      rows={6}
                      placeholder="Descreva a conduta clínica recomendada, sugestões de manejo, diagnóstico diferencial ou condutas imediatas..."
                      value={devolutivaConduta}
                      onChange={(e) => setDevolutivaConduta(e.target.value)}
                      className="block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-550"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                      Contribuições e Recomendações para a Atenção Primária (APS) *
                    </label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Orientações de acompanhamento preventivo, sinais de alerta de gravidade para a equipe de saúde da família ou linhas de cuidado recomendadas..."
                      value={devolutivaAps}
                      onChange={(e) => setDevolutivaAps(e.target.value)}
                      className="block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-550"
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={updatingStatus}
                      className="w-full max-w-xs sm:max-w-md flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-750 px-4 py-3.5 text-xs font-bold text-white transition disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                      {updatingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4.5 w-4.5" />}
                      Emitir Devolutiva e Resolver Chamado
                    </button>
                  </div>
                </form>
              ) : (
                /* 3. Case is new or waiting for specialist acceptation */
                <div className="text-center py-6 px-4">
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                    {currentCaso.status === 'novo' 
                      ? 'Este caso ainda está aberto. O especialista precisa aceitar a solicitação para iniciar o preenchimento da Devolutiva Oficial.' 
                      : 'Aguardando o preenchimento do parecer final pelo especialista designado.'}
                  </p>
                </div>
              )
            )}
          </div>
        </div>

      </div>

      {/* COLLAPSIBLE CHAT DRAWER (Offcanvas Panel) */}
      {isChatOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden select-none">
          {/* Overlay backdrop */}
          <div 
            onClick={() => setIsChatOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity" 
          />

          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white border-l border-gray-200 shadow-2xl flex flex-col h-full transform transition duration-300">
              
              {/* Drawer Header */}
              <div className="p-4 border-b border-gray-150 flex items-center justify-between text-white" style={{ backgroundColor: '#002157' }}>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-[#38bdf8]" />
                  <span className="text-xs font-bold uppercase tracking-wider">Mensagens Rápidas / Diligência</span>
                </div>
                <button 
                  onClick={() => setIsChatOpen(false)}
                  className="rounded-lg p-1.5 hover:bg-white/10 text-white/70 hover:text-white transition cursor-pointer"
                  title="Fechar Mensagens"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Chat Disclaimer */}
              <div className="bg-amber-50 border-b border-amber-100 p-3 text-[10px] text-amber-850 leading-relaxed font-semibold">
                ⚠️ Este canal serve apenas para alinhamentos informais e solicitação de exames/dados extras. A conduta e parecer oficial do chamado **deve obrigatoriamente** ser registrada no formulário principal de **Devolutiva do Especialista**.
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                {loadingChat ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-[#002157]" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-center text-xs text-gray-400 p-6 leading-relaxed font-medium">
                    Nenhuma mensagem registrada. Use este canal para conversar pontualmente sobre o chamado.
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOwnMessage = msg.perfil_id === user?.id;
                    const senderName = msg.nome_remetente || sendersMap[msg.perfil_id] || 'Carregando...';
                    return (
                      <div 
                        key={msg.id} 
                        className={`flex flex-col max-w-[85%] ${isOwnMessage ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                      >
                        <span className="text-[10px] text-gray-400 mb-0.5 px-1 font-semibold">{senderName}</span>
                        <div className={`rounded-xl px-3.5 py-2 text-sm leading-relaxed ${
                          isOwnMessage 
                            ? 'bg-[#0ea5e9] text-white rounded-tr-none shadow-2xs' 
                            : 'bg-white text-gray-800 rounded-tl-none border border-gray-150 shadow-2xs'
                        }`}>
                          {msg.texto}
                        </div>
                        <span className="text-[9px] text-gray-400 mt-0.5 px-1 font-mono">
                          {new Date(msg.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input form */}
              {currentCaso.status === 'fechado' ? (
                <div className="p-4 border-t border-gray-150 bg-gray-100 text-center text-xs font-bold text-gray-500">
                  Discussão encerrada.
                </div>
              ) : (
                <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-200 flex gap-2 items-end">
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    disabled={loadingChat || sendingMessage}
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      // Auto-grow logic
                      e.target.style.height = 'auto';
                      e.target.style.height = `${e.target.scrollHeight}px`;
                    }}
                    onKeyDown={(e) => {
                      // Submit on Enter (without Shift)
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (newMessage.trim() && !sendingMessage) {
                          handleSendMessage(e as any);
                        }
                      }
                    }}
                    placeholder="Perguntar ou solicitar dados ao médico..."
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-550 disabled:bg-gray-50 resize-none max-h-32 overflow-y-auto"
                    style={{ minHeight: '32px', height: 'auto' }}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sendingMessage}
                    className="rounded-lg bg-indigo-650 hover:bg-indigo-755 p-2 text-white transition disabled:bg-indigo-400 cursor-pointer flex items-center justify-center shrink-0"
                    style={{ height: '32px', width: '32px' }}
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Evaluation Modal (Telessaúde / Ministério da Saúde) */}
      {isEvaluationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none animate-fade-in">
          <div className="bg-white rounded-2xl border border-gray-250 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4.5 text-white shrink-0" style={{ backgroundColor: '#002157' }}>
              <div className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-[#38bdf8]" />
                <h3 className="text-sm font-bold uppercase tracking-wider">
                  Avaliação da Teleconsultoria
                </h3>
              </div>
              <button 
                onClick={() => setIsEvaluationModalOpen(false)}
                className="text-slate-300 hover:text-white transition cursor-pointer"
                title="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form Content */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (resolveuDuvida === null || grauSatisfacao === 0 || evitouEncaminhamento === null) return;
                closeAndEvaluateMutation.mutate({
                  resolveuDuvida,
                  grauSatisfacao,
                  evitouEncaminhamento
                });
              }} 
              className="p-6 space-y-6 overflow-y-auto text-left flex-1"
            >
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs leading-relaxed text-blue-900 font-semibold">
                ℹ️ Esta avaliação é obrigatória segundo o manual de Telessaúde do Ministério da Saúde para o encerramento do chamado de teleconsultoria.
              </div>

              {/* Pergunta 1 */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-800 uppercase tracking-wide">
                  1. A teleconsultoria resolveu a sua dúvida? *
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                    <input 
                      type="radio" 
                      name="resolveu_duvida" 
                      required
                      checked={resolveuDuvida === true}
                      onChange={() => setResolveuDuvida(true)}
                      className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                    />
                    Sim
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                    <input 
                      type="radio" 
                      name="resolveu_duvida" 
                      checked={resolveuDuvida === false}
                      onChange={() => setResolveuDuvida(false)}
                      className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                    />
                    Não
                  </label>
                </div>
              </div>

              {/* Pergunta 2 */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-800 uppercase tracking-wide">
                  2. Qual o seu grau de satisfação com esta teleconsultoria? *
                </label>
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: 5 }).map((_, i) => {
                    const starVal = i + 1;
                    const isActive = starVal <= (hoveredStars || grauSatisfacao);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setGrauSatisfacao(starVal)}
                        onMouseEnter={() => setHoveredStars(starVal)}
                        onMouseLeave={() => setHoveredStars(0)}
                        className="p-1 cursor-pointer transition-transform hover:scale-125 focus:outline-hidden"
                        title={`${starVal} Estrela${starVal > 1 ? 's' : ''}`}
                      >
                        <svg 
                          className={`h-8 w-8 ${isActive ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} 
                          viewBox="0 0 24 24" 
                          stroke="currentColor" 
                          strokeWidth="2"
                        >
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                      </button>
                    );
                  })}
                  {grauSatisfacao > 0 && (
                    <span className="text-xs font-bold text-gray-500 ml-2">
                      ({grauSatisfacao} de 5)
                    </span>
                  )}
                </div>
              </div>

              {/* Pergunta 3 */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-800 uppercase tracking-wide">
                  3. A teleconsultoria evitou o encaminhamento do paciente ao especialista? *
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                    <input 
                      type="radio" 
                      name="evitou_encaminhamento" 
                      required
                      checked={evitouEncaminhamento === true}
                      onChange={() => setEvitouEncaminhamento(true)}
                      className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                    />
                    Sim
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                    <input 
                      type="radio" 
                      name="evitou_encaminhamento" 
                      checked={evitouEncaminhamento === false}
                      onChange={() => setEvitouEncaminhamento(false)}
                      className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                    />
                    Não
                  </label>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-150 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEvaluationModalOpen(false)}
                  className="rounded-lg border border-gray-300 hover:bg-gray-50 px-4 py-2.5 text-xs font-semibold text-gray-750 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={resolveuDuvida === null || grauSatisfacao === 0 || evitouEncaminhamento === null || closeAndEvaluateMutation.isPending}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-750 px-5 py-2.5 text-xs font-bold text-white transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  style={{ backgroundColor: '#059669' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#047857'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#059669'}
                >
                  {closeAndEvaluateMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Confirmar e Fechar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Visualizer Render */}
      {selectedFile && (
        <VisualizadorDocumentos
          nome={selectedFile.nome}
          path={selectedFile.path}
          tipo={selectedFile.tipo}
          onClose={() => setSelectedFile(null)}
        />
      )}
    </div>
  );
};
