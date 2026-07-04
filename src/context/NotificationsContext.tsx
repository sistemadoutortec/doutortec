import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

export interface NotificacaoItem {
  id: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  created_at: string;
  caso_id?: string;
}

interface NotificationsContextType {
  notificacoes: NotificacaoItem[];
  unreadCount: number;
  marcarComoLida: (id: string) => void;
  limparTodas: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, perfil } = useAuth();
  const [notificacoes, setNotificacoes] = useState<NotificacaoItem[]>([]);

  const unreadCount = notificacoes.filter(n => !n.lida).length;

  const marcarComoLida = (id: string) => {
    setNotificacoes(prev =>
      prev.map(n => (n.id === id ? { ...n, lida: true } : n))
    );
  };

  const limparTodas = () => {
    setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
  };

  useEffect(() => {
    if (!user || !perfil) return;

    const myCaseIds: string[] = [];

    // Helper: If Solicitante, fetch case IDs to filter message notifications
    const fetchMyCases = async () => {
      if (perfil.role !== 'solicitante') return;
      try {
        const { data } = await supabase
          .from('casos')
          .select('id')
          .eq('solicitante_id', user.id);
        
        if (data) {
          data.forEach(c => myCaseIds.push(c.id));
        }
      } catch (err) {
        console.error('Erro ao buscar casos para notificações:', err);
      }
    };

    fetchMyCases();

    // Set up Realtime listener channel
    const channel = supabase.channel('notificacoes-realtime');

    // 1. Listen for new clinical cases (for specialists)
    if (perfil.role === 'especialista') {
      channel.on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'casos' },
        (payload) => {
          const newCase = payload.new as any;
          
          // Verify if it is a new case and matches the specialist profile details
          if (newCase.status === 'novo') {
            const newNotif: NotificacaoItem = {
              id: crypto.randomUUID(),
              titulo: 'Novo Caso Disponível',
              mensagem: `Paciente: ${newCase.paciente_nome} precisa de avaliação clínica.`,
              lida: false,
              created_at: new Date().toISOString(),
              caso_id: newCase.id
            };
            setNotificacoes(prev => [newNotif, ...prev]);
          }
        }
      );
    }

    // 2. Listen for new chat messages (for requesters)
    if (perfil.role === 'solicitante') {
      channel.on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensagens_chat' },
        (payload) => {
          const newMsg = payload.new as any;

          // Notify only if it belongs to one of the requester's cases and is sent by someone else
          if (myCaseIds.includes(newMsg.caso_id) && newMsg.remetente_id !== user.id) {
            const newNotif: NotificacaoItem = {
              id: crypto.randomUUID(),
              titulo: 'Nova Resposta Recebida',
              mensagem: `O especialista respondeu no chat do seu caso clínico.`,
              lida: false,
              created_at: new Date().toISOString(),
              caso_id: newMsg.caso_id
            };
            setNotificacoes(prev => [newNotif, ...prev]);
          }
        }
      );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, perfil]);

  return (
    <NotificationsContext.Provider value={{ notificacoes, unreadCount, marcarComoLida, limparTodas }}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotifications deve ser usado dentro de um NotificationsProvider');
  }
  return context;
};
