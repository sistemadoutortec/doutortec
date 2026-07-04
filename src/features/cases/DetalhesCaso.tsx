import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { CasoClinico, MensagemChat } from '../../types';
import { Clock, Send, ArrowLeft, CheckCircle2, PlayCircle, Loader2, FileText } from 'lucide-react';
import { VisualizadorDocumentos } from '../documents/VisualizadorDocumentos';

interface DetalhesCasoProps {
  caso: CasoClinico;
  onBack: () => void;
  onUpdateCaso?: () => void;
}

export const DetalhesCaso: React.FC<DetalhesCasoProps> = ({ caso, onBack, onUpdateCaso }) => {
  const { user, perfil } = useAuth();
  
  // Local case state to track instant status updates
  const [currentCaso, setCurrentCaso] = useState<CasoClinico>(caso);
  
  // Chat state
  const [messages, setMessages] = useState<MensagemChat[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingChat, setLoadingChat] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  
  // Action state (assign/respond)
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Document visualizer state
  const [selectedFile, setSelectedFile] = useState<{ nome: string; path: string; tipo: string } | null>(null);

  // Dictionary for message sender names
  const [sendersMap, setSendersMap] = useState<Record<string, string>>({});
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch names of profiles in messages
  const fetchSenders = async (msgList: MensagemChat[]) => {
    const senderIds = Array.from(new Set(msgList.map(m => m.remetente_id)));
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
        .select('id, caso_id, remetente_id, mensagem, created_at')
        .eq('caso_id', currentCaso.id)
        .order('created_at', { ascending: true });

      if (error) {
        // Table might not exist or be named differently, handle gracefully
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
            // Prevent duplicate message renders from multiple channel updates
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          
          // Get sender name if not loaded already
          if (!sendersMap[newMsg.remetente_id]) {
            try {
              const { data } = await supabase
                .from('perfis')
                .select('nome')
                .eq('id', newMsg.remetente_id)
                .single();
              if (data) {
                setSendersMap(prev => ({ ...prev, [newMsg.remetente_id]: data.nome }));
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
            remetente_id: user.id,
            mensagem: newMessage.trim()
          }
        ]);

      if (error) throw error;
      setNewMessage('');
      // If PostgreSQL subscription didn't trigger, pull manually
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
          status: 'em_progresso',
          updated_at: new Date().toISOString()
        })
        .eq('id', currentCaso.id)
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setCurrentCaso(data as CasoClinico);
        if (onUpdateCaso) onUpdateCaso();
      }
    } catch (err: any) {
      console.error('Erro ao aceitar caso:', err.message || err);
      setActionError('Não foi possível iniciar o atendimento deste caso.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Specialist Action: Mark as Answered
  const handleMarkAsAnswered = async () => {
    if (!user || updatingStatus) return;
    setUpdatingStatus(true);
    setActionError(null);

    try {
      const { data, error } = await supabase
        .from('casos')
        .update({
          status: 'respondido',
          respondido_em: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', currentCaso.id)
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setCurrentCaso(data as CasoClinico);
        if (onUpdateCaso) onUpdateCaso();
      }
    } catch (err: any) {
      console.error('Erro ao finalizar caso:', err.message || err);
      setActionError('Não foi possível finalizar o caso.');
    } finally {
      setUpdatingStatus(false);
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
      case 'novo': return 'Novo';
      case 'em_progresso': return 'Em Progresso';
      case 'respondido': return 'Respondido';
      case 'fechado': return 'Fechado';
      default: return status;
    }
  };

  // Extract attachments list from case (handle flexible schemas)
  // Our schema stores attachments inside a custom array. Let's cast it safely
  const caseAnexos = (currentCaso as any).anexos || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-gray-150 shadow-xs">
        <button 
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para a Lista
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 font-mono">ID: #{currentCaso.id.substring(0, 8)}</span>
          <span className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${getPriorityColor(currentCaso.prioridade)}`}>
            Prioridade: {currentCaso.prioridade.toUpperCase()}
          </span>
          <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-gray-100 border border-gray-200 text-gray-700">
            Status: {getStatusLabel(currentCaso.status)}
          </span>
        </div>
      </div>

      {actionError && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {/* Main Grid: Details Left, Chat Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Case Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-150 p-6 md:p-8 space-y-6 shadow-xs">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">{currentCaso.paciente_nome}</h3>
              <p className="text-xs text-gray-400">Criado em: {new Date(currentCaso.created_at).toLocaleString('pt-BR')}</p>
            </div>

            <div className="border-t border-gray-100 pt-5 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Histórico Clínico</h4>
                <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-4 rounded-lg leading-relaxed whitespace-pre-wrap">
                  {currentCaso.historico_clinico}
                </p>
              </div>

              <div>
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Conduta Atual</h4>
                <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-4 rounded-lg leading-relaxed whitespace-pre-wrap">
                  {currentCaso.conduta_atual}
                </p>
              </div>

              <div>
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Dúvida Clínica</h4>
                <p className="text-sm text-gray-850 mt-2 bg-indigo-50/50 p-4 rounded-lg border border-indigo-100/50 leading-relaxed font-medium whitespace-pre-wrap">
                  {currentCaso.duvida_clinica}
                </p>
              </div>

              {/* Attachments Section */}
              {caseAnexos && caseAnexos.length > 0 && (
                <div className="border-t border-gray-100 pt-5">
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">Documentos e Exames Anexados</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {caseAnexos.map((anexo: any, idx: number) => (
                      <button
                        key={anexo.id || idx}
                        onClick={() => setSelectedFile({ nome: anexo.nome, path: anexo.path, tipo: anexo.tipo })}
                        className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-indigo-400 hover:bg-gray-50 text-left transition w-full"
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
        </div>

        {/* Right Side: Actions and Chat */}
        <div className="space-y-6 flex flex-col">
          {/* Contextual Actions card */}
          {perfil?.role === 'especialista' && (currentCaso.status === 'novo' || currentCaso.status === 'em_progresso') && (
            <div className="bg-white rounded-xl border border-gray-150 p-5 shadow-xs">
              <h4 className="text-sm font-bold text-gray-900 mb-4">Ações Clínicas</h4>
              {currentCaso.status === 'novo' ? (
                <button
                  onClick={handleAcceptCase}
                  disabled={updatingStatus}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white transition disabled:bg-indigo-400"
                >
                  {updatingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                  Iniciar Atendimento
                </button>
              ) : (
                currentCaso.especialista_id === user?.id && (
                  <button
                    onClick={handleMarkAsAnswered}
                    disabled={updatingStatus}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-green-600 hover:bg-green-700 px-4 py-2.5 text-sm font-semibold text-white transition disabled:bg-green-400"
                  >
                    {updatingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Marcar como Respondido
                  </button>
                )
              )}
            </div>
          )}

          {/* Chat Box */}
          <div className="bg-white rounded-xl border border-gray-150 shadow-xs flex flex-col h-[500px] overflow-hidden flex-1">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
              <Clock className="h-4 w-4 text-indigo-500" />
              <span className="text-xs font-bold text-gray-700">Chat de Interconsulta</span>
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingChat ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-center text-xs text-gray-400 p-4">
                  Inicie a discussão clínica enviando uma mensagem abaixo.
                </div>
              ) : (
                messages.map((msg) => {
                  const isOwnMessage = msg.remetente_id === user?.id;
                  const senderName = sendersMap[msg.remetente_id] || 'Carregando...';
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex flex-col max-w-[85%] ${isOwnMessage ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                    >
                      <span className="text-[10px] text-gray-400 mb-0.5 px-1 font-semibold">{senderName}</span>
                      <div className={`rounded-xl px-3.5 py-2 text-sm leading-relaxed ${
                        isOwnMessage 
                          ? 'bg-indigo-600 text-white rounded-tr-none' 
                          : 'bg-gray-100 text-gray-800 rounded-tl-none'
                      }`}>
                        {msg.mensagem}
                      </div>
                      <span className="text-[9px] text-gray-400 mt-0.5 px-1">
                        {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Message Form */}
            {currentCaso.status !== 'fechado' && (
              <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-100 flex gap-2">
                <input
                  type="text"
                  disabled={loadingChat || sendingMessage}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Escreva sua conduta ou dúvida..."
                  className="flex-1 rounded-lg border border-gray-350 px-3 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-hidden focus:ring-indigo-500 disabled:bg-gray-50"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sendingMessage}
                  className="rounded-lg bg-indigo-600 hover:bg-indigo-700 p-2 text-white transition disabled:bg-indigo-400"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

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
