import React, { createContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Perfil, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  perfil: Perfil | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (
    email: string,
    password: string,
    metadata: {
      nome: string;
      cpf: string;
      role: UserRole;
      crm_coren?: string;
      municipio: string;
      instituicao: string;
      telefone?: string;
    }
  ) => Promise<{ data: any; error: any }>;
  signOut: () => Promise<{ error: any }>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Helper to fetch the profile of a given user ID
  const fetchPerfil = async (userId: string) => {
    try {
      let columns = 'id, nome, email, cpf, crm_coren, role, municipio, instituicao, telefone, status_cadastro, created_at';
      let result = await supabase.from('perfis').select(columns).eq('id', userId).maybeSingle();

      if (result.error) {
        console.warn('Erro ao carregar perfil completo, tentando fallback de compatibilidade:', result.error.message);
        
        if (result.error.message.includes('instituicao')) {
          columns = columns.replace('instituicao, ', '');
        }

        if (result.error.message.includes('status_cadastro')) {
          columns = columns.replace('status_cadastro, ', '');
        }

        if (result.error.message.includes('crm_coren')) {
          columns = columns.replace('crm_coren, ', '');
        }

        result = await supabase.from('perfis').select(columns).eq('id', userId).maybeSingle();
      }

      if (result.error) {
        console.error('Falha ao buscar perfil com fallback:', result.error.message);
        setPerfil(null);
      } else if (result.data) {
        const profileData = result.data as any;
        const mappedPerfil = {
          ...profileData,
          status_cadastro: profileData.status_cadastro || profileData.status || 'aprovado',
          instituicao: profileData.instituicao || 'Não especificado',
        };
        setPerfil(mappedPerfil as Perfil);
      } else {
        setPerfil(null);
      }
    } catch (err) {
      console.error('Erro inesperado ao buscar perfil:', err);
      setPerfil(null);
    }
  };

  useEffect(() => {
    // Check active session on mount
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (session?.user) {
          setUser(session.user);
          await fetchPerfil(session.user.id);
        } else {
          setUser(null);
          setPerfil(null);
        }
      } catch (err) {
        console.error('Erro ao inicializar sessão ativa:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setLoading(true);
        if (session?.user) {
          setUser(session.user);
          await fetchPerfil(session.user.id);
        } else {
          setUser(null);
          setPerfil(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      console.error('Erro no login:', error.message || error);
      return { error };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    metadata: {
      nome: string;
      cpf: string;
      role: UserRole;
      crm_coren?: string;
      municipio: string;
      instituicao: string;
      telefone?: string;
    }
  ) => {
    try {
      // 1. Cria a conta no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        console.error('[signUp] Erro no Auth:', authError);
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Usuário não foi criado pelo Supabase Auth.');
      }

      console.log('[signUp] Auth criado com sucesso. ID:', authData.user.id);

      // 2. Insere o perfil diretamente na tabela public.perfis
      const payload = {
        id: authData.user.id,
        nome: metadata.nome,
        email: email,
        cpf: metadata.cpf,
        role: metadata.role,
        municipio: metadata.municipio,
        instituicao: metadata.instituicao,
        telefone: metadata.telefone || null,
        crm_coren: metadata.crm_coren || null,
        status_cadastro: (metadata.role === 'solicitante' || metadata.role === 'especialista') ? 'pendente' : 'aprovado',
      };

      console.log('[signUp] Tentando inserir perfil:', payload);

      const { data: perfilData, error: perfilError } = await supabase
        .from('perfis')
        .insert([payload])
        .select()
        .single();

      if (perfilError) {
        console.error('[signUp] ERRO ao inserir perfil:', perfilError);
        // Retorna o erro detalhado para ser exibido na tela
        return {
          data: null,
          error: {
            message: `Erro ao salvar perfil: [${perfilError.code}] ${perfilError.message}`,
            details: perfilError.details,
            hint: perfilError.hint,
          }
        };
      }

      console.log('[signUp] Perfil inserido com sucesso:', perfilData);
      return { data: authData, error: null };
    } catch (error: any) {
      console.error('[signUp] Exceção capturada:', error);
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      console.error('Erro no logout:', error.message || error);
      return { error };
    }
  };

  return (
    <AuthContext.Provider value={{ user, perfil, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
