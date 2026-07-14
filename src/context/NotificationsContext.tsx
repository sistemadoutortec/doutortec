import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

export interface NotificacaoItem {
  id: string;
  perfil_id: string;
  caso_id?: string;
  tipo_evento: string;
  mensagem_resumo: string;
  is_lida: boolean;
  criado_em: string;
}

interface NotificationsContextType {
  notificacoes: NotificacaoItem[];
  unreadCount: number;
  loading: boolean;
  marcarComoLida: (id: string) => Promise<void>;
  marcarTodasComoLidas: () => Promise<void>;
  refetch: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notificacoes, setNotificacoes] = useState<NotificacaoItem[]>([]);
  const [loading, setLoading] = useState(false);

  const unreadCount = notificacoes.filter(n => !n.is_lida).length;

  const fetchNotificacoes = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notificacoes')
        .select('*')
        .eq('perfil_id', user.id)
        .order('criado_em', { ascending: false })
        .limit(50);

      if (error) {
        console.warn('Erro ao buscar notificações:', error.message);
        setNotificacoes([]);
      } else {
        setNotificacoes((data as NotificacaoItem[]) || []);
      }
    } catch (err) {
      console.error('Erro inesperado ao buscar notificações:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const marcarComoLida = async (id: string) => {
    // Optimistic update
    setNotificacoes(prev =>
      prev.map(n => (n.id === id ? { ...n, is_lida: true } : n))
    );
    try {
      await supabase
        .from('notificacoes')
        .update({ is_lida: true })
        .eq('id', id);
    } catch (err) {
      console.error('Erro ao marcar notificação como lida:', err);
      // Revert on failure
      fetchNotificacoes();
    }
  };

  const marcarTodasComoLidas = async () => {
    if (!user) return;
    // Optimistic update
    setNotificacoes(prev => prev.map(n => ({ ...n, is_lida: true })));
    try {
      await supabase
        .from('notificacoes')
        .update({ is_lida: true })
        .eq('perfil_id', user.id)
        .eq('is_lida', false);
    } catch (err) {
      console.error('Erro ao limpar notificações:', err);
      fetchNotificacoes();
    }
  };

  useEffect(() => {
    if (!user) {
      setNotificacoes([]);
      return;
    }

    fetchNotificacoes();

    // Realtime: listen for INSERT on notificacoes table filtered by this user
    const channel = supabase
      .channel(`notificacoes-user-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificacoes',
          filter: `perfil_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as NotificacaoItem;
          setNotificacoes(prev => {
            if (prev.some(n => n.id === newNotif.id)) return prev;
            return [newNotif, ...prev];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notificacoes',
          filter: `perfil_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as NotificacaoItem;
          setNotificacoes(prev =>
            prev.map(n => (n.id === updated.id ? updated : n))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotificacoes]);

  return (
    <NotificationsContext.Provider
      value={{
        notificacoes,
        unreadCount,
        loading,
        marcarComoLida,
        marcarTodasComoLidas,
        refetch: fetchNotificacoes,
      }}
    >
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
