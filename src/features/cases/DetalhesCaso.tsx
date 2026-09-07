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
  Printer,
  Download,
  X
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';
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
  const [hasEvaluation, setHasEvaluation] = useState<boolean | null>(null);
  const [isSubmittingEvaluation, setIsSubmittingEvaluation] = useState(false);

  useEffect(() => {
    const checkEvaluation = async () => {
      if (!currentCaso?.id) return;
      try {
        const { data } = await supabase
          .from('casos_avaliacoes')
          .select('id')
          .eq('caso_id', currentCaso.id)
          .maybeSingle();
        
        setHasEvaluation(!!data);
      } catch (err) {
        console.error('Erro ao verificar avaliação:', err);
      }
    };
    checkEvaluation();
  }, [currentCaso?.id]);

  // Fetch Specialist, Solicitante and Paciente extra details for structured Parecer
  const [especialistaInfo, setEspecialistaInfo] = useState<{
    nome: string;
    crm_coren?: string;
    rqe?: string | null;
    categoria_profissional?: string | null;
    instituicao?: string;
    municipio?: string;
  } | null>(null);

  const [solicitanteInfo, setSolicitanteInfo] = useState<{
    nome: string;
    crm_coren?: string;
    categoria_profissional?: string | null;
    instituicao?: string;
    municipio?: string;
  } | null>(null);

  const [pacienteInfo, setPacienteInfo] = useState<{
    nome: string;
    cpf?: string;
    cartao_sus?: string | null;
    data_nascimento?: string;
    sexo?: string;
    municipio?: string;
  } | null>(null);

  const [especialidadeNome, setEspecialidadeNome] = useState<string>('');

  useEffect(() => {
    const fetchParecerProfiles = async () => {
      // Especialista
      if (currentCaso?.especialista_id) {
        try {
          const { data } = await supabase
            .from('perfis')
            .select('nome, crm_coren, rqe, categoria_profissional, instituicao, municipio')
            .eq('id', currentCaso.especialista_id)
            .maybeSingle();
          if (data) setEspecialistaInfo(data);
        } catch (e) {
          console.error('Erro ao carregar perfil do especialista:', e);
        }
      } else {
        setEspecialistaInfo(null);
      }

      // Solicitante
      if (currentCaso?.solicitante_id) {
        try {
          const { data } = await supabase
            .from('perfis')
            .select('nome, crm_coren, categoria_profissional, instituicao, municipio')
            .eq('id', currentCaso.solicitante_id)
            .maybeSingle();
          if (data) setSolicitanteInfo(data);
        } catch (e) {
          console.error('Erro ao carregar perfil do solicitante:', e);
        }
      } else {
        setSolicitanteInfo(null);
      }

      // Especialidade
      if (currentCaso?.especialidade_id) {
        try {
          const { data } = await supabase
            .from('especialidades')
            .select('nome')
            .eq('id', currentCaso.especialidade_id)
            .maybeSingle();
          if (data?.nome) setEspecialidadeNome(data.nome);
        } catch (e) {
          console.error('Erro ao carregar especialidade:', e);
        }
      }

      // Paciente
      if (currentCaso?.paciente_nome) {
        try {
          const { data } = await supabase
            .from('pacientes')
            .select('nome, cpf, cartao_sus, data_nascimento, sexo, municipio_id')
            .ilike('nome', currentCaso.paciente_nome.trim())
            .limit(1)
            .maybeSingle();
          if (data) {
            let munNome = '';
            if (data.municipio_id) {
              const { data: munData } = await supabase
                .from('fluxos_municipios')
                .select('municipio')
                .eq('id', data.municipio_id)
                .maybeSingle();
              if (munData?.municipio) munNome = munData.municipio;
            }
            setPacienteInfo({ ...data, municipio: munNome });
          } else {
            setPacienteInfo(null);
          }
        } catch (e) {
          console.error('Erro ao carregar paciente:', e);
        }
      }
    };

    fetchParecerProfiles();
  }, [currentCaso?.especialista_id, currentCaso?.solicitante_id, currentCaso?.especialidade_id, currentCaso?.paciente_nome]);

  const closeAndEvaluateMutation = useMutation({
    mutationFn: async (evalData: {
      resolveuDuvida: boolean;
      grauSatisfacao: number;
      evitouEncaminhamento: boolean;
    }) => {
      const { error: evalError } = await supabase
        .from('casos_avaliacoes')
        .upsert(
          {
            caso_id: currentCaso.id,
            solicitante_id: currentCaso.solicitante_id,
            especialista_id: currentCaso.especialista_id || null,
            resolveu_duvida: evalData.resolveuDuvida,
            grau_satisfacao: evalData.grauSatisfacao,
            evitou_encaminhamento: evalData.evitouEncaminhamento
          },
          { onConflict: 'caso_id' }
        );
      if (evalError) throw evalError;

      const { data: updatedCaso, error: updateError } = await supabase
        .from('casos')
        .update({
          status: 'fechado',
          fechado_em: new Date().toISOString()
        })
        .eq('id', currentCaso.id)
        .select(`
          id, paciente_nome, especialidade_id, prioridade, historico_clinico, conduta_atual, duvida_clinica, solicitante_id, especialista_id, status, created_at, respondido_em, fechado_em, devolutiva_conduta, devolutiva_aps, aceito_em
        `)
        .single();
      if (updateError) throw updateError;
      return updatedCaso;
    },
    onSuccess: (data) => {
      setIsSubmittingEvaluation(false);
      setHasEvaluation(true);
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
      setIsSubmittingEvaluation(false);
      console.error(err);
      let friendlyMessage = err.message || err;
      if (err.code === '23505' || (err.message && err.message.includes('unique constraint'))) {
        friendlyMessage = 'Este caso já foi encerrado e avaliado.';
        setHasEvaluation(true);
      }
      setActionError(`Erro ao registrar avaliação e fechar caso: ${friendlyMessage}`);
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
          id, paciente_nome, especialidade_id, prioridade, historico_clinico, conduta_atual, duvida_clinica, solicitante_id, especialista_id, status, created_at, respondido_em, fechado_em, devolutiva_conduta, devolutiva_aps, aceito_em
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
  const [encaminhamentoIndicado, setEncaminhamentoIndicado] = useState<boolean | null>(null);
  const [classificacaoRisco, setClassificacaoRisco] = useState<string>('');
  const [examesSolicitados, setExamesSolicitados] = useState<boolean>(false);
  const [examesDescricao, setExamesDescricao] = useState<string>('');
  const [referenciasBibliograficas, setReferenciasBibliograficas] = useState<string>('');
  const [potencialSof, setPotencialSof] = useState<boolean>(false);

  // Status devolução
  const [isDevolucaoModalOpen, setIsDevolucaoModalOpen] = useState(false);
  const [devolucaoType, setDevolucaoType] = useState<'solicitante' | 'telerregulacao'>('solicitante');
  const [justificativaDevolucao, setJustificativaDevolucao] = useState('');
  
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
    setEncaminhamentoIndicado(caso.encaminhamento_indicado ?? null);
    setClassificacaoRisco(caso.classificacao_risco || '');
    setExamesSolicitados(caso.exames_solicitados || false);
    setExamesDescricao(caso.exames_descricao || '');
    setReferenciasBibliograficas(caso.referencias_bibliograficas || '');
    setPotencialSof(caso.potencial_sof || false);
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
  
  // PDF Export State & Ref for Parecer Clínico
  const parecerPrintRef = useRef<HTMLDivElement>(null);
  const [generatingParecerPdf, setGeneratingParecerPdf] = useState(false);
  const [parecerPdfSuccess, setParecerPdfSuccess] = useState(false);

  const handleExportParecerPDF = async () => {
    const element = parecerPrintRef.current;
    if (!element) {
      setActionError('Template do parecer não encontrado para geração do PDF.');
      return;
    }

    setGeneratingParecerPdf(true);
    setParecerPdfSuccess(false);
    setActionError(null);

    try {
      // Pequeno timeout para assegurar renderização dos elementos e imagens
      await new Promise(resolve => setTimeout(resolve, 350));

      const dataUrl = await toPng(element, {
        quality: 1,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210; // largura A4 mm
      const pageHeight = 297; // altura A4 mm
      
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve, reject) => { 
        img.onload = resolve;
        img.onerror = reject;
      });

      const imgHeight = (img.height * pageWidth) / img.width;

      // Se a altura calculada couber ou estiver ligeiramente maior que 1 página (até 340mm),
      // faz auto-fit proporcional para caber em 1 página A4 perfeitamente sem cortar carimbos.
      if (imgHeight <= 340) {
        const targetMargin = 4; // margem em mm
        const maxHeight = pageHeight - (targetMargin * 2);
        
        let finalWidth = pageWidth;
        let finalHeight = imgHeight;
        let xOffset = 0;
        let yOffset = targetMargin;

        if (imgHeight > maxHeight) {
          const scale = maxHeight / imgHeight;
          finalWidth = pageWidth * scale;
          finalHeight = imgHeight * scale;
          xOffset = (pageWidth - finalWidth) / 2;
        } else {
          yOffset = (pageHeight - imgHeight) / 2;
        }

        pdf.addImage(dataUrl, 'PNG', xOffset, yOffset, finalWidth, finalHeight);
      } else {
        // Para pareceres extensos, mantêm a paginação contínua
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(dataUrl, 'PNG', 0, position, pageWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
          position -= pageHeight;
          pdf.addPage();
          pdf.addImage(dataUrl, 'PNG', 0, position, pageWidth, imgHeight);
          heightLeft -= pageHeight;
        }
      }

      const cleanPatientName = (currentCaso.paciente_nome || 'paciente').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      pdf.save(`parecer_teleconsultoria_${cleanPatientName}_${currentCaso.id.substring(0, 8)}.pdf`);
      setParecerPdfSuccess(true);
      setTimeout(() => setParecerPdfSuccess(false), 5000);
    } catch (err: any) {
      console.error('Erro ao gerar PDF do parecer:', err);
      setActionError(`Falha ao gerar o PDF do parecer: ${err?.message || 'Erro desconhecido'}.`);
    } finally {
      setGeneratingParecerPdf(false);
    }
  };
  
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
      
      const destinatario_id = user.id === currentCaso.solicitante_id ? currentCaso.especialista_id : currentCaso.solicitante_id;
      if (destinatario_id) {
        try {
          await supabase.from('notificacoes').insert({
            perfil_id: destinatario_id,
            caso_id: currentCaso.id,
            tipo_evento: 'nova_mensagem',
            mensagem_resumo: `Nova mensagem no chat do caso do paciente ${currentCaso.paciente_nome}.`,
            is_lida: false
          });
        } catch (e) {
          console.warn('Falha ao enviar notificação de chat:', e);
        }
      }
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
          status: 'em_progresso',
          aceito_em: new Date().toISOString()
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
    
    if (!devolutivaConduta.trim() || !devolutivaAps.trim() || encaminhamentoIndicado === null) {
      setActionError('Por favor, preencha todos os campos obrigatórios da Devolutiva.');
      return;
    }
    if (encaminhamentoIndicado && !classificacaoRisco) {
      setActionError('Por favor, selecione a classificação de risco para o encaminhamento.');
      return;
    }
    if (examesSolicitados && !examesDescricao.trim()) {
      setActionError('Por favor, descreva os exames solicitados.');
      return;
    }

    setUpdatingStatus(true);
    setActionError(null);

    try {
      const payload: any = {
        status: 'respondido',
        devolutiva_conduta: devolutivaConduta.trim(),
        devolutiva_aps: devolutivaAps.trim(),
        encaminhamento_indicado: encaminhamentoIndicado,
        classificacao_risco: encaminhamentoIndicado ? classificacaoRisco : null,
        exames_solicitados: examesSolicitados,
        exames_descricao: examesSolicitados ? examesDescricao.trim() : null,
        referencias_bibliograficas: referenciasBibliograficas.trim(),
        potencial_sof: potencialSof,
        respondido_em: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('casos')
        .update(payload)
        .eq('id', currentCaso.id)
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setCurrentCaso(data as CasoClinico);
        if (onUpdateCaso) onUpdateCaso(data as CasoClinico);
        queryClient.invalidateQueries({ queryKey: ['casos'] });
        queryClient.invalidateQueries({ queryKey: ['caso', currentCaso.id] });

        if (currentCaso.solicitante_id) {
          try {
            await supabase.from('notificacoes').insert({
              perfil_id: currentCaso.solicitante_id,
              caso_id: currentCaso.id,
              tipo_evento: 'caso_respondido',
              mensagem_resumo: `O caso do paciente ${currentCaso.paciente_nome} foi respondido pelo especialista.`,
              is_lida: false
            });
          } catch (e) {
            console.warn('Falha ao enviar notificação de devolutiva:', e);
          }
        }
      }
    } catch (err: any) {
      console.error('Erro ao enviar devolutiva:', err.message || err);
      setActionError(`Erro ao salvar a Devolutiva Oficial no banco de dados: ${err.message || 'Erro desconhecido'}.`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!user || updatingStatus) return;
    setUpdatingStatus(true);
    setActionError(null);

    try {
      const payload: any = {
        devolutiva_conduta: devolutivaConduta.trim(),
        devolutiva_aps: devolutivaAps.trim(),
        encaminhamento_indicado: encaminhamentoIndicado,
        classificacao_risco: encaminhamentoIndicado ? classificacaoRisco : null,
        exames_solicitados: examesSolicitados,
        exames_descricao: examesSolicitados ? examesDescricao.trim() : null,
        referencias_bibliograficas: referenciasBibliograficas.trim(),
        potencial_sof: potencialSof,
      };

      const { data, error } = await supabase
        .from('casos')
        .update(payload)
        .eq('id', currentCaso.id)
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setCurrentCaso(data as CasoClinico);
        if (onUpdateCaso) onUpdateCaso(data as CasoClinico);
        queryClient.invalidateQueries({ queryKey: ['casos'] });
        queryClient.invalidateQueries({ queryKey: ['caso', currentCaso.id] });
        alert('Rascunho salvo com sucesso!');
      }
    } catch (err: any) {
      console.error('Erro ao salvar rascunho:', err.message || err);
      setActionError(`Erro ao salvar rascunho: ${err.message || 'Erro desconhecido'}.`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDevolver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || updatingStatus) return;
    if (!justificativaDevolucao.trim()) {
      setActionError('Por favor, preencha a justificativa de devolução.');
      return;
    }

    setUpdatingStatus(true);
    setActionError(null);

    const newStatus = devolucaoType === 'solicitante' ? 'devolvido' : 'pendente_regulacao';

    try {
      const limparEspecialista = devolucaoType === 'telerregulacao';

      // Usa RPC com SECURITY DEFINER para contornar limitação de RLS
      // ao setar especialista_id = null no fluxo de devolução para regulação
      const { error: rpcError } = await supabase.rpc('devolver_caso', {
        p_caso_id: currentCaso.id,
        p_status: newStatus,
        p_justificativa: justificativaDevolucao.trim(),
        p_limpar_especialista: limparEspecialista
      });

      if (rpcError) throw rpcError;

      // Busca o caso atualizado para refletir as mudanças no estado local
      const { data, error: fetchError } = await supabase
        .from('casos')
        .select('*')
        .eq('id', currentCaso.id)
        .single();

      if (fetchError) throw fetchError;

      if (data) {
        setCurrentCaso(data as CasoClinico);
        if (onUpdateCaso) onUpdateCaso(data as CasoClinico);
        setIsDevolucaoModalOpen(false);
        setJustificativaDevolucao('');
        queryClient.invalidateQueries({ queryKey: ['casos'] });
        queryClient.invalidateQueries({ queryKey: ['caso', currentCaso.id] });

        // Notifica o solicitante em ambos os tipos de devolução
        if (currentCaso.solicitante_id) {
          const mensagem = devolucaoType === 'solicitante'
            ? `O caso do paciente ${currentCaso.paciente_nome} foi devolvido pelo especialista por falta de dados.`
            : `O caso do paciente ${currentCaso.paciente_nome} foi devolvido à regulação. Aguarde nova distribuição.`;

          try {
            await supabase.from('notificacoes').insert({
              perfil_id: currentCaso.solicitante_id,
              caso_id: currentCaso.id,
              tipo_evento: 'caso_devolvido',
              mensagem_resumo: mensagem,
              is_lida: false
            });
          } catch (e) {
            console.warn('Falha ao enviar notificação de devolução:', e);
          }
        }

        // Se foi para regulação, notifica os admins/telerreguladores também
        if (devolucaoType === 'telerregulacao') {
          try {
            const { data: admins } = await supabase
              .from('perfis')
              .select('id')
              .in('role', ['admin', 'telerregulador'])
              .eq('status_cadastro', 'aprovado');

            if (admins && admins.length > 0) {
              const notifAdmins = admins.map((p: { id: string }) => ({
                perfil_id: p.id,
                caso_id: currentCaso.id,
                tipo_evento: 'caso_devolvido',
                mensagem_resumo: `O caso do paciente ${currentCaso.paciente_nome} foi devolvido pelo especialista e aguarda nova regulação.`,
                is_lida: false
              }));
              await supabase.from('notificacoes').insert(notifAdmins);
            }
          } catch (e) {
            console.warn('Falha ao notificar reguladores:', e);
          }
        }
      }
    } catch (err: any) {
      console.error('Erro ao devolver caso:', err.message || err);
      setActionError(`Erro ao devolver o caso: ${err.message || 'Erro desconhecido'}.`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Action: Close/Archive Case (Specialist or Admin or Solicitante if respondido)
  const handleCloseCase = () => {
    if (currentCaso.status === 'respondido' && !hasEvaluation) {
      setIsEvaluationModalOpen(true);
    } else {
      const skipConfirm = !!hasEvaluation;
      if (skipConfirm || window.confirm('Deseja realmente encerrar este chamado sem avaliação?')) {
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
          {/* PDF Export Action when Case has Parecer */}
          {(currentCaso.status === 'respondido' || currentCaso.status === 'fechado') && (
            <button
              type="button"
              onClick={handleExportParecerPDF}
              disabled={generatingParecerPdf}
              className="inline-flex items-center gap-2 rounded-lg bg-[#002157] hover:bg-[#00173d] text-white px-3.5 py-2 text-xs font-bold transition shadow-xs cursor-pointer shrink-0 disabled:opacity-50"
              title="Baixar Parecer Clínico Oficial em PDF timbrado para anexar ao Prontuário (PEC)"
            >
              {generatingParecerPdf ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <Download className="h-4 w-4 text-[#38bdf8]" />
              )}
              <span>{generatingParecerPdf ? 'Gerando Parecer...' : 'Baixar Parecer (PDF)'}</span>
            </button>
          )}

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
            (perfil?.role === 'solicitante' && currentCaso.solicitante_id === user?.id && currentCaso.status === 'respondido')
          ) && (
            <button
              type="button"
              onClick={handleCloseCase}
              disabled={hasEvaluation === null || closeAndEvaluateMutation.isPending || closeDirectMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-605 hover:bg-rose-750 px-4 py-2 text-xs font-bold text-white transition disabled:opacity-50 cursor-pointer shadow-xs"
              style={{ backgroundColor: '#e11d48' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#be123c'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#e11d48'}
            >
              {hasEvaluation === null || closeAndEvaluateMutation.isPending || closeDirectMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Ban className="h-3.5 w-3.5" />
              )}
              {currentCaso.status === 'respondido' && !hasEvaluation ? 'Avaliar e Encerrar' : 'Encerrar Ticket'}
            </button>
          )}
        </div>
      </div>

      {parecerPdfSuccess && (
        <div className="flex items-center gap-3 rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-xs font-semibold text-emerald-800 animate-fade-in shadow-xs">
          <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
          <div>
            <strong>Parecer Clínico gerado com sucesso!</strong> O download do PDF estruturado e timbrado para o Prontuário Eletrônico (PEC) foi iniciado.
          </div>
        </div>
      )}

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
          <div className="px-6 py-4 border-b border-gray-150 flex items-center justify-between gap-4" style={{ backgroundColor: '#0f172a' }}>
            <div className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-[#38bdf8]" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Devolutiva do Especialista (Ticket Oficial)</h3>
            </div>
            {(currentCaso.status === 'respondido' || currentCaso.status === 'fechado') && (
              <button
                type="button"
                onClick={handleExportParecerPDF}
                disabled={generatingParecerPdf}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#0ea5e9] hover:bg-[#0284c7] text-white px-3 py-1.5 text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                title="Exportar Parecer Clínico Oficial em PDF timbrado"
              >
                {generatingParecerPdf ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Printer className="h-3.5 w-3.5" />
                )}
                <span>{generatingParecerPdf ? 'Gerando...' : 'Baixar Parecer (PDF)'}</span>
              </button>
            )}
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

                  <div>
                    <h5 className="text-xs font-extrabold uppercase tracking-wider text-[#0f172a] mb-2">3. Orientação Específica</h5>
                    <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                      {currentCaso.encaminhamento_indicado === false ? 'Manejo na APS' : 
                       currentCaso.encaminhamento_indicado === true ? `Encaminhamento ao especialista (Risco: ${currentCaso.classificacao_risco})` : 'Não informado.'}
                    </div>
                  </div>

                  <div>
                    <h5 className="text-xs font-extrabold uppercase tracking-wider text-[#0f172a] mb-2">4. Exames Complementares Prévios</h5>
                    <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                      {currentCaso.exames_solicitados ? currentCaso.exames_descricao : 'Nenhum exame solicitado.'}
                    </div>
                  </div>

                  <div>
                    <h5 className="text-xs font-extrabold uppercase tracking-wider text-[#0f172a] mb-2">5. Referências Bibliográficas</h5>
                    <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                      {currentCaso.referencias_bibliograficas || 'Nenhuma referência citada.'}
                    </div>
                  </div>

                  {currentCaso.potencial_sof && (
                    <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4.5 flex gap-3.5">
                      <ShieldCheck className="h-6 w-6 text-indigo-600 shrink-0" />
                      <div>
                        <h4 className="text-sm font-extrabold text-indigo-900">Potencial Segunda Opinião Formativa (SOF)</h4>
                        <p className="text-xs text-indigo-700 mt-0.5 font-medium">
                          Esta resposta foi marcada com potencial para compor a biblioteca de SOF do sistema de telessaúde.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Identificação Oficial do Profissional Responsável (Carimbo Médico/Enfermagem) */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#002157] text-white flex items-center justify-center font-black text-sm shrink-0">
                        {especialistaInfo?.nome ? especialistaInfo.nome.substring(0, 2).toUpperCase() : 'DR'}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Teleconsultor / Especialista Responsável</p>
                        <h6 className="text-sm font-black text-slate-900 leading-tight">
                          {especialistaInfo?.nome || 'Médico Especialista'}
                        </h6>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 font-medium mt-0.5">
                          {especialistaInfo?.crm_coren && (
                            <span className="font-semibold text-slate-800">
                              Registro: {especialistaInfo.crm_coren}
                            </span>
                          )}
                          {especialistaInfo?.rqe && (
                            <span>• RQE: <strong>{especialistaInfo.rqe}</strong></span>
                          )}
                          {especialidadeNome && (
                            <span>• Especialidade: <strong>{especialidadeNome}</strong></span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200 w-full sm:w-auto">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Data e Horário de Emissão</span>
                      <span className="text-xs font-mono font-bold text-slate-800">
                        {currentCaso.respondido_em ? new Date(currentCaso.respondido_em).toLocaleString('pt-BR') : 'Horário registrado'}
                      </span>
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

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                      Qual a sua orientação específica? *
                    </label>
                    <div className="flex flex-col sm:flex-row gap-4 mb-4">
                      <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-50 border border-transparent hover:border-gray-200 transition">
                        <input
                          type="radio"
                          name="encaminhamento"
                          checked={encaminhamentoIndicado === false}
                          onChange={() => setEncaminhamentoIndicado(false)}
                          disabled={updatingStatus}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                        />
                        <span className="text-sm font-semibold text-gray-800">Manejo na APS</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-50 border border-transparent hover:border-gray-200 transition">
                        <input
                          type="radio"
                          name="encaminhamento"
                          checked={encaminhamentoIndicado === true}
                          onChange={() => setEncaminhamentoIndicado(true)}
                          disabled={updatingStatus}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                        />
                        <span className="text-sm font-semibold text-gray-800">Encaminhamento ao especialista</span>
                      </label>
                    </div>

                    {encaminhamentoIndicado === true && (
                      <div className="ml-4 pl-4 border-l-2 border-gray-200 mb-4">
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                          Classificação de Risco *
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <label className={`flex items-center justify-center gap-2 cursor-pointer p-2 rounded-lg border-2 transition font-bold text-xs ${classificacaoRisco === 'vermelha' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 hover:border-red-200 text-gray-600'}`}>
                            <input type="radio" name="risco" value="vermelha" checked={classificacaoRisco === 'vermelha'} onChange={(e) => setClassificacaoRisco(e.target.value)} className="hidden" />
                            Vermelha
                          </label>
                          <label className={`flex items-center justify-center gap-2 cursor-pointer p-2 rounded-lg border-2 transition font-bold text-xs ${classificacaoRisco === 'amarela' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-200 hover:border-amber-200 text-gray-600'}`}>
                            <input type="radio" name="risco" value="amarela" checked={classificacaoRisco === 'amarela'} onChange={(e) => setClassificacaoRisco(e.target.value)} className="hidden" />
                            Amarela
                          </label>
                          <label className={`flex items-center justify-center gap-2 cursor-pointer p-2 rounded-lg border-2 transition font-bold text-xs ${classificacaoRisco === 'verde' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 hover:border-emerald-200 text-gray-600'}`}>
                            <input type="radio" name="risco" value="verde" checked={classificacaoRisco === 'verde'} onChange={(e) => setClassificacaoRisco(e.target.value)} className="hidden" />
                            Verde
                          </label>
                          <label className={`flex items-center justify-center gap-2 cursor-pointer p-2 rounded-lg border-2 transition font-bold text-xs ${classificacaoRisco === 'azul' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-blue-200 text-gray-600'}`}>
                            <input type="radio" name="risco" value="azul" checked={classificacaoRisco === 'azul'} onChange={(e) => setClassificacaoRisco(e.target.value)} className="hidden" />
                            Azul
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                      Solicitação de Exames Complementares Prévios *
                    </label>
                    <div className="flex flex-col sm:flex-row gap-4 mb-2">
                      <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-50 border border-transparent hover:border-gray-200 transition">
                        <input
                          type="radio"
                          name="exames"
                          checked={examesSolicitados === false}
                          onChange={() => setExamesSolicitados(false)}
                          disabled={updatingStatus}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                        />
                        <span className="text-sm font-semibold text-gray-800">Não</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-gray-50 border border-transparent hover:border-gray-200 transition">
                        <input
                          type="radio"
                          name="exames"
                          checked={examesSolicitados === true}
                          onChange={() => setExamesSolicitados(true)}
                          disabled={updatingStatus}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                        />
                        <span className="text-sm font-semibold text-gray-800">Sim</span>
                      </label>
                    </div>
                    {examesSolicitados === true && (
                      <textarea
                        required
                        rows={2}
                        placeholder="Quais exames são necessários?"
                        value={examesDescricao}
                        onChange={(e) => setExamesDescricao(e.target.value)}
                        className="block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-550"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                      Referências Bibliográficas (Padrão Vancouver) (Opcional)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Ex: Ministério da Saúde. Protocolos de Atenção Básica. Brasília, 2023."
                      value={referenciasBibliograficas}
                      onChange={(e) => setReferenciasBibliograficas(e.target.value)}
                      className="block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-550"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      id="sof"
                      type="checkbox"
                      checked={potencialSof}
                      onChange={(e) => setPotencialSof(e.target.checked)}
                      disabled={updatingStatus}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                    />
                    <label htmlFor="sof" className="text-sm font-semibold text-slate-800 cursor-pointer">
                      Marcar como potencial Segunda Opinião Formativa (SOF)
                    </label>
                  </div>

                  <div className="pt-4 mt-6 border-t border-gray-150 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setDevolucaoType('solicitante');
                        setIsDevolucaoModalOpen(true);
                      }}
                      disabled={updatingStatus}
                      className="flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white hover:bg-red-50 text-red-600 px-4 py-3 text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                    >
                      <Ban className="h-4 w-4" />
                      Devolver (Falta de Dados)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDevolucaoType('telerregulacao');
                        setIsDevolucaoModalOpen(true);
                      }}
                      disabled={updatingStatus}
                      className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-3 text-xs font-bold text-white transition disabled:opacity-50 cursor-pointer"
                    >
                      Devolver p/ Regulação
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      disabled={updatingStatus}
                      className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-4 py-3 text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                    >
                      Salvar Rascunho
                    </button>
                    <button
                      type="submit"
                      disabled={updatingStatus}
                      className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-3 text-xs font-bold text-white transition disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                      {updatingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4.5 w-4.5" />}
                      Enviar Parecer
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
                if (resolveuDuvida === null || grauSatisfacao === 0 || evitouEncaminhamento === null || isSubmittingEvaluation) return;
                setIsSubmittingEvaluation(true);
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
                  disabled={resolveuDuvida === null || grauSatisfacao === 0 || evitouEncaminhamento === null || closeAndEvaluateMutation.isPending || isSubmittingEvaluation}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-750 px-5 py-2.5 text-xs font-bold text-white transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
                  style={{ backgroundColor: '#059669' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#047857'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#059669'}
                >
                  {(closeAndEvaluateMutation.isPending || isSubmittingEvaluation) ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    'Confirmar e Fechar'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Devolução Modal */}
      {isDevolucaoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none animate-fade-in">
          <div className="bg-white rounded-2xl border border-gray-250 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className={`flex items-center justify-between px-6 py-4.5 text-white shrink-0 ${devolucaoType === 'solicitante' ? 'bg-red-600' : 'bg-blue-600'}`}>
              <div className="flex items-center gap-2">
                <Ban className="h-5 w-5 text-white" />
                <h3 className="text-sm font-bold uppercase tracking-wider">
                  {devolucaoType === 'solicitante' ? 'Devolver ao Solicitante' : 'Devolver para Regulação'}
                </h3>
              </div>
              <button 
                onClick={() => setIsDevolucaoModalOpen(false)}
                className="text-white/80 hover:text-white transition cursor-pointer"
                title="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleDevolver} className="p-6 space-y-4">
              <div className={`border rounded-lg p-3 text-xs leading-relaxed font-semibold ${devolucaoType === 'solicitante' ? 'bg-red-50 border-red-200 text-red-900' : 'bg-blue-50 border-blue-200 text-blue-900'}`}>
                {devolucaoType === 'solicitante' 
                  ? 'Utilize esta opção se faltam dados clínicos essenciais para o parecer. O chamado voltará para o solicitante preencher.'
                  : 'Utilize esta opção se este caso não pertence à sua especialidade. Ele voltará para a fila do telerregulador.'}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-800 uppercase tracking-wide mb-2">
                  Justificativa da Devolução *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Escreva o motivo detalhado..."
                  value={justificativaDevolucao}
                  onChange={(e) => setJustificativaDevolucao(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-xs text-gray-900 focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-550"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-150">
                <button
                  type="button"
                  onClick={() => setIsDevolucaoModalOpen(false)}
                  className="rounded-lg border border-gray-300 hover:bg-gray-50 px-4 py-2.5 text-xs font-semibold text-gray-750 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={updatingStatus || !justificativaDevolucao.trim()}
                  className={`rounded-lg px-5 py-2.5 text-xs font-bold text-white transition cursor-pointer disabled:opacity-50 flex items-center gap-2 ${devolucaoType === 'solicitante' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {updatingStatus && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Confirmar Devolução
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

      {/* ========================================================================= */}
      {/* PARECER TÉCNICO OFICIAL TIMBRADO (Container dedicado para geração do PDF) */}
      {/* ========================================================================= */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '210mm' }}>
        <div 
          ref={parecerPrintRef} 
          className="bg-white text-slate-900 p-5 space-y-3.5 font-sans antialiased"
          style={{ width: '210mm', boxSizing: 'border-box' }}
        >
          {/* CABEÇALHO TIMBRADO OFICIAL */}
          <div className="border-b-2 border-[#002157] pb-2.5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img 
                  src="/Logo-Doutortec-Original.png" 
                  alt="Doutortec" 
                  className="h-12 w-auto object-contain block"
                  crossOrigin="anonymous"
                />
                <div>
                  <h1 className="text-xl font-black text-[#002157] tracking-tight uppercase">
                    DOUTORTEC TELESSAÚDE
                  </h1>
                  <p className="text-xs font-bold text-slate-600 tracking-wide uppercase">
                    Sistema de Teleinterconsulta e Apoio Matricial à Atenção Primária
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {pacienteInfo?.municipio || perfil?.municipio || 'Município Conveniado'} • Plataforma Conforme Resoluções CFM e Diretrizes e-SUS APS
                  </p>
                </div>
              </div>
              <div className="text-right border-l-2 border-slate-200 pl-4 shrink-0">
                <span className="inline-block bg-[#002157] text-white text-[10px] font-black px-2.5 py-1 rounded tracking-wider uppercase mb-1">
                  Documento Oficial
                </span>
                <p className="text-[11px] font-mono font-bold text-slate-700">
                  ID: #{currentCaso.id.substring(0, 8).toUpperCase()}
                </p>
                <p className="text-[10px] text-slate-500">
                  Emissão: {currentCaso.respondido_em ? new Date(currentCaso.respondido_em).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-600">
              <span>Parecer Técnico Especializado para Anexação ao Prontuário Eletrônico do Cidadão (PEC / e-SUS)</span>
              <span className="text-[#002157] font-bold">Fase 1 - Operação Piloto Homologada</span>
            </div>
          </div>

          {/* DADOS DO PACIENTE */}
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
            <div className="flex items-center justify-between mb-2 border-b border-slate-200 pb-1.5">
              <h2 className="text-xs font-black uppercase tracking-wider text-[#002157]">
                1. Identificação do Paciente
              </h2>
              <span className="text-[10px] font-bold text-slate-500 uppercase">Atenção Primária à Saúde</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Nome do Paciente</span>
                <span className="font-extrabold text-slate-900 text-sm">{currentCaso.paciente_nome}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-500 block">CPF</span>
                <span className="font-medium text-slate-800">{pacienteInfo?.cpf ? pacienteInfo.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : 'Registrado em Prontuário'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Cartão SUS (CNS)</span>
                <span className="font-medium text-slate-800">{pacienteInfo?.cartao_sus || 'Conforme PEC Municipal'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Município / Unidade</span>
                <span className="font-medium text-slate-800">{pacienteInfo?.municipio || solicitanteInfo?.municipio || perfil?.municipio || 'Unidade Básica de Saúde'}</span>
              </div>
            </div>

            {(currentCaso.cid_10 || currentCaso.ciap_2) && (
              <div className="mt-2.5 pt-2 border-t border-slate-200 flex flex-wrap gap-2 text-[11px]">
                {currentCaso.cid_10 && (
                  <span className="bg-blue-100 text-blue-900 font-semibold px-2 py-0.5 rounded">
                    CID-10: <strong>{currentCaso.cid_10}</strong> {cidDesc && `- ${cidDesc}`}
                  </span>
                )}
                {currentCaso.ciap_2 && (
                  <span className="bg-purple-100 text-purple-900 font-semibold px-2 py-0.5 rounded">
                    CIAP-2: <strong>{currentCaso.ciap_2}</strong> {ciapDesc && `- ${ciapDesc}`}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* DADOS DA SOLICITAÇÃO CLÍNICA */}
          <div className="border border-slate-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <h2 className="text-xs font-black uppercase tracking-wider text-[#002157]">
                2. Solicitação Clínica (Profissional Solicitante da APS)
              </h2>
              <span className="text-[10px] font-semibold text-slate-500">
                Abertura: {new Date(currentCaso.created_at).toLocaleString('pt-BR')}
              </span>
            </div>

            <div className="text-xs space-y-2.5">
              <div>
                <span className="font-bold text-slate-700 block uppercase text-[10px]">Histórico Clínico e Antecedentes:</span>
                <p className="text-slate-800 leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-100 whitespace-pre-wrap">
                  {currentCaso.historico_clinico}
                </p>
              </div>

              <div>
                <span className="font-bold text-slate-700 block uppercase text-[10px]">Conduta Atual Realizada na UBS:</span>
                <p className="text-slate-800 leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-100 whitespace-pre-wrap">
                  {currentCaso.conduta_atual}
                </p>
              </div>

              <div>
                <span className="font-bold text-slate-700 block uppercase text-[10px]">Dúvida Clínica Diagnóstica / Terapêutica:</span>
                <p className="text-slate-900 font-semibold leading-relaxed bg-blue-50/70 p-2.5 rounded border border-blue-100 whitespace-pre-wrap">
                  {currentCaso.duvida_clinica}
                </p>
              </div>

              {solicitanteInfo && (
                <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
                  <span><strong>Profissional Solicitante:</strong> {solicitanteInfo.nome}</span>
                  {solicitanteInfo.crm_coren && <span><strong>Registro:</strong> {solicitanteInfo.crm_coren}</span>}
                  {solicitanteInfo.instituicao && <span><strong>Unidade:</strong> {solicitanteInfo.instituicao}</span>}
                </div>
              )}
            </div>
          </div>

          {/* DEVOLUTIVA E PARECER DO ESPECIALISTA */}
          <div className="border-2 border-[#002157] rounded-lg p-4.5 space-y-4 bg-white shadow-2xs">
            <div className="flex items-center justify-between border-b-2 border-[#002157] pb-2">
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-[#002157]">
                  3. Parecer Técnico e Conduta do Especialista
                </h2>
                <p className="text-[10px] text-slate-500 font-medium">Devolutiva oficial de interconsulta médica / multiprofissional</p>
              </div>
              <span className="bg-emerald-100 text-emerald-900 text-[10px] font-extrabold px-2 py-0.5 rounded uppercase">
                Parecer Concluído
              </span>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <h3 className="font-black text-slate-900 uppercase text-[11px] mb-1">
                  3.1 Resposta Direta e Conduta Recomendada
                </h3>
                <div className="text-slate-900 leading-relaxed bg-slate-50 p-3 rounded-md border border-slate-200 whitespace-pre-wrap font-normal">
                  {currentCaso.devolutiva_conduta || 'Nenhuma conduta registrada.'}
                </div>
              </div>

              <div>
                <h3 className="font-black text-slate-900 uppercase text-[11px] mb-1">
                  3.2 Recomendações e Linhas de Cuidado para a Atenção Primária (APS)
                </h3>
                <div className="text-slate-900 leading-relaxed bg-slate-50 p-3 rounded-md border border-slate-200 whitespace-pre-wrap font-normal">
                  {currentCaso.devolutiva_aps || 'Nenhuma recomendação registrada.'}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Orientação de Encaminhamento</span>
                  <span className="font-bold text-slate-800">
                    {currentCaso.encaminhamento_indicado === false 
                      ? 'Manter manejo na Atenção Primária à Saúde (Evitou Encaminhamento)'
                      : currentCaso.encaminhamento_indicado === true 
                        ? `Encaminhamento presencial indicado (Risco: ${currentCaso.classificacao_risco || 'Não classificado'})`
                        : 'Conduta sob critério do médico assistente'}
                  </span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Exames Complementares Solicitados</span>
                  <span className="font-medium text-slate-800">
                    {currentCaso.exames_solicitados ? (currentCaso.exames_descricao || 'Exames listados em conduta') : 'Nenhum exame adicional requerido'}
                  </span>
                </div>
              </div>

              {currentCaso.referencias_bibliograficas && (
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">Referências Científicas Consultadas:</span>
                  <p className="text-[11px] text-slate-700 italic bg-slate-50 p-2 rounded border border-slate-100 whitespace-pre-wrap">
                    {currentCaso.referencias_bibliograficas}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* CARIMBO E IDENTIFICAÇÃO DO PROFISSIONAL EMISSOR */}
          <div className="border border-slate-300 rounded-lg p-4 bg-slate-50">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-1 text-center sm:text-left">
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block">
                  Autenticidade e Emissão Eletrônica
                </span>
                <p className="text-[11px] text-slate-600 max-w-sm">
                  Documento emitido digitalmente pela plataforma Doutortec em consonância com as regulamentações vigentes de telessaúde.
                </p>
                <p className="text-[10px] font-mono text-slate-500">
                  Hash de Rastreabilidade: {currentCaso.id}
                </p>
              </div>

              {/* Box do Carimbo Médico */}
              <div className="border-2 border-slate-800 rounded-lg px-6 py-3 bg-white text-center min-w-[240px] shadow-2xs">
                <p className="text-xs font-black text-slate-900 uppercase">
                  {especialistaInfo?.nome || 'Médico Teleconsultor'}
                </p>
                <p className="text-[11px] font-bold text-slate-700">
                  {especialistaInfo?.crm_coren ? `Registro: ${especialistaInfo.crm_coren}` : 'CRM / COREN Registrado'}
                </p>
                {especialistaInfo?.rqe && (
                  <p className="text-[10px] font-semibold text-slate-600">
                    RQE: {especialistaInfo.rqe}
                  </p>
                )}
                {especialidadeNome && (
                  <p className="text-[10px] text-slate-500">
                    Especialidade: {especialidadeNome}
                  </p>
                )}
                <div className="mt-2 pt-1 border-t border-slate-200 text-[9px] font-mono font-bold text-slate-700">
                  Emitido em: {currentCaso.respondido_em ? new Date(currentCaso.respondido_em).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR')}
                </div>
              </div>
            </div>
          </div>

          {/* RODAPÉ DO DOCUMENTO */}
          <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-[9px] text-slate-400">
            <span>Doutortec Teleinterconsulta • Apoio Clínico Integrado à APS • e-SUS PEC</span>
            <span>Documento emitido na Fase 1 do Projeto Piloto Homologado</span>
          </div>
        </div>
      </div>
    </div>
  );
};
