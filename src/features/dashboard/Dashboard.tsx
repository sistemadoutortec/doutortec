import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { ListaCasos } from '../cases/ListaCasos';
import type { CasoClinico } from '../../types';
import {
  Users,
  MapPin,
  Activity,
  FileText,
  RefreshCw,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FolderOpen,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────
interface MetricCard {
  label: string;
  sublabel: string;
  value: number | null;   // null = loading, -1 = error
  icon: React.ReactNode;
  colorClass: string;      // Tailwind classes for the value color
  bgClass: string;         // Tailwind classes for the icon background
}

interface DashboardProps {
  onSelectCaso: (caso: CasoClinico) => void;
  onNavigate: (tab: string) => void;
}

// ─────────────────────────────────────────────────────────
// Skeleton card
// ─────────────────────────────────────────────────────────
const SkeletonCard: React.FC = () => (
  <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-xs animate-pulse">
    <div className="h-3 w-28 rounded bg-gray-200 mb-3" />
    <div className="h-8 w-16 rounded bg-gray-200 mb-2" />
    <div className="h-2.5 w-36 rounded bg-gray-100" />
  </div>
);

// ─────────────────────────────────────────────────────────
// Metric card component
// ─────────────────────────────────────────────────────────
const MetricCardView: React.FC<{ card: MetricCard }> = ({ card }) => {
  const isLoading = card.value === null;
  const isError   = card.value === -1;

  if (isLoading) return <SkeletonCard />;

  return (
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex flex-col justify-between group hover:shadow-sm transition-shadow duration-200">
      {/* Top row: label + icon */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold text-[#56657c] uppercase tracking-wider leading-snug">
          {card.label}
        </span>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${card.bgClass}`}>
          {card.icon}
        </span>
      </div>

      {/* Value */}
      <div className="mt-3">
        {isError ? (
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-semibold text-amber-600">Erro</span>
          </div>
        ) : (
          <span className="text-3xl font-extrabold tracking-tight text-[#002157]">
            {card.value}
          </span>
        )}
      </div>

      {/* Sub-label as a mini-banner */}
      <div className="mt-3 bg-[#e8f3fc] text-[#002157] px-2.5 py-1.5 rounded-lg font-bold text-[10px] leading-relaxed text-center">
        {card.sublabel}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// Main Dashboard component
// ─────────────────────────────────────────────────────────
export const Dashboard: React.FC<DashboardProps> = ({ onSelectCaso, onNavigate }) => {
  const { user, perfil } = useAuth();
  const role = perfil?.role;

  // All 4 cards start as null (loading)
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // ─────────────────────────────────────────────────────────
  // Build card templates (icons + labels) per role
  // ─────────────────────────────────────────────────────────
  const buildCardTemplates = useCallback((): MetricCard[] => {
    if (role === 'admin') {
      return [
        {
          label: 'Profissionais Pendentes',
          sublabel: 'Aguardando aprovação de acesso',
          value: null,
          icon: <Users className="h-4 w-4 text-amber-600" />,
          colorClass: 'text-amber-600',
          bgClass: 'bg-amber-50',
        },
        {
          label: 'Municípios Ativos',
          sublabel: 'Cidades cobertas pela rede',
          value: null,
          icon: <MapPin className="h-4 w-4 text-indigo-600" />,
          colorClass: 'text-indigo-600',
          bgClass: 'bg-indigo-50',
        },
        {
          label: 'Fluxos Configurados',
          sublabel: 'Fluxos de especialidades ativos',
          value: null,
          icon: <Activity className="h-4 w-4 text-violet-600" />,
          colorClass: 'text-violet-600',
          bgClass: 'bg-violet-50',
        },
        {
          label: 'Casos Clínicos Ativos',
          sublabel: 'Novos + em progresso',
          value: null,
          icon: <FileText className="h-4 w-4 text-rose-600" />,
          colorClass: 'text-rose-600',
          bgClass: 'bg-rose-50',
        },
      ];
    }

    if (role === 'especialista') {
      return [
        {
          label: 'Casos Atribuídos',
          sublabel: 'Casos sob sua responsabilidade',
          value: null,
          icon: <FileText className="h-4 w-4 text-indigo-600" />,
          colorClass: 'text-indigo-600',
          bgClass: 'bg-indigo-50',
        },
        {
          label: 'Em Atendimento',
          sublabel: 'Interconsultas em progresso',
          value: null,
          icon: <Clock className="h-4 w-4 text-amber-600" />,
          colorClass: 'text-amber-600',
          bgClass: 'bg-amber-50',
        },
        {
          label: 'Respondidos',
          sublabel: 'Casos concluídos por você',
          value: null,
          icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,
          colorClass: 'text-green-600',
          bgClass: 'bg-green-50',
        },
        {
          label: 'Novos na Fila',
          sublabel: 'Aguardando aceitação',
          value: null,
          icon: <FolderOpen className="h-4 w-4 text-violet-600" />,
          colorClass: 'text-violet-600',
          bgClass: 'bg-violet-50',
        },
      ];
    }

    // solicitante / default
    return [
      {
        label: 'Meus Casos',
        sublabel: 'Total de interconsultas solicitadas',
        value: null,
        icon: <FileText className="h-4 w-4 text-indigo-600" />,
        colorClass: 'text-indigo-600',
        bgClass: 'bg-indigo-50',
      },
      {
        label: 'Em Progresso',
        sublabel: 'Casos em atendimento',
        value: null,
        icon: <Clock className="h-4 w-4 text-amber-600" />,
        colorClass: 'text-amber-600',
        bgClass: 'bg-amber-50',
      },
      {
        label: 'Respondidos',
        sublabel: 'Aguardando seu arquivamento',
        value: null,
        icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,
        colorClass: 'text-green-600',
        bgClass: 'bg-green-50',
      },
      {
        label: 'Casos Novos',
        sublabel: 'Aguardando especialista',
        value: null,
        icon: <FolderOpen className="h-4 w-4 text-violet-600" />,
        colorClass: 'text-violet-600',
        bgClass: 'bg-violet-50',
      },
    ];
  }, [role]);

  // ─────────────────────────────────────────────────────────
  // Fetch all metrics in parallel using count: 'exact', head: true
  // (no rows returned — pure lightweight count queries)
  // ─────────────────────────────────────────────────────────
  const fetchMetrics = useCallback(async () => {
    if (!user || !role) return;

    setRefreshing(true);

    // Set all cards to loading state (null) first
    setMetrics(buildCardTemplates());

    try {
      let counts: (number | -1)[];

      if (role === 'admin') {
        const [pendentesRes, municipiosRes, fluxosRes, casosRes] = await Promise.allSettled([
          // Card 1 – profissionais pendentes
          supabase
            .from('perfis')
            .select('*', { count: 'exact', head: true })
            .eq('status_cadastro', 'pendente'),
          // Card 2 – municípios ativos
          supabase
            .from('fluxos_municipios')
            .select('*', { count: 'exact', head: true }),
          // Card 3 – fluxos de especialidades
          supabase
            .from('fluxos_especialidades')
            .select('*', { count: 'exact', head: true }),
          // Card 4 – casos ativos (novo + em_progresso)
          supabase
            .from('casos')
            .select('*', { count: 'exact', head: true })
            .in('status', ['novo', 'em_progresso']),
        ]);

        counts = [
          pendentesRes.status === 'fulfilled' && pendentesRes.value.error === null
            ? (pendentesRes.value.count ?? 0)
            : -1,
          municipiosRes.status === 'fulfilled' && municipiosRes.value.error === null
            ? (municipiosRes.value.count ?? 0)
            : -1,
          fluxosRes.status === 'fulfilled' && fluxosRes.value.error === null
            ? (fluxosRes.value.count ?? 0)
            : -1,
          casosRes.status === 'fulfilled' && casosRes.value.error === null
            ? (casosRes.value.count ?? 0)
            : -1,
        ];

      } else if (role === 'especialista') {
        const [totalRes, progressoRes, respondidoRes, novosRes] = await Promise.allSettled([
          // Card 1 – total de casos atribuídos
          supabase
            .from('casos')
            .select('*', { count: 'exact', head: true })
            .eq('especialista_id', user.id),
          // Card 2 – em progresso (atribuídos a mim)
          supabase
            .from('casos')
            .select('*', { count: 'exact', head: true })
            .eq('especialista_id', user.id)
            .eq('status', 'em_progresso'),
          // Card 3 – respondidos por mim
          supabase
            .from('casos')
            .select('*', { count: 'exact', head: true })
            .eq('especialista_id', user.id)
            .eq('status', 'respondido'),
          // Card 4 – novos na fila (não atribuídos ainda)
          supabase
            .from('casos')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'novo')
            .is('especialista_id', null),
        ]);

        counts = [
          totalRes.status === 'fulfilled' && totalRes.value.error === null
            ? (totalRes.value.count ?? 0)
            : -1,
          progressoRes.status === 'fulfilled' && progressoRes.value.error === null
            ? (progressoRes.value.count ?? 0)
            : -1,
          respondidoRes.status === 'fulfilled' && respondidoRes.value.error === null
            ? (respondidoRes.value.count ?? 0)
            : -1,
          novosRes.status === 'fulfilled' && novosRes.value.error === null
            ? (novosRes.value.count ?? 0)
            : -1,
        ];

      } else {
        // solicitante
        const [totalRes, progressoRes, respondidoRes, novosRes] = await Promise.allSettled([
          // Card 1 – meus casos (todos)
          supabase
            .from('casos')
            .select('*', { count: 'exact', head: true })
            .eq('solicitante_id', user.id),
          // Card 2 – em progresso
          supabase
            .from('casos')
            .select('*', { count: 'exact', head: true })
            .eq('solicitante_id', user.id)
            .eq('status', 'em_progresso'),
          // Card 3 – respondidos
          supabase
            .from('casos')
            .select('*', { count: 'exact', head: true })
            .eq('solicitante_id', user.id)
            .eq('status', 'respondido'),
          // Card 4 – aguardando especialista
          supabase
            .from('casos')
            .select('*', { count: 'exact', head: true })
            .eq('solicitante_id', user.id)
            .eq('status', 'novo'),
        ]);

        counts = [
          totalRes.status === 'fulfilled' && totalRes.value.error === null
            ? (totalRes.value.count ?? 0)
            : -1,
          progressoRes.status === 'fulfilled' && progressoRes.value.error === null
            ? (progressoRes.value.count ?? 0)
            : -1,
          respondidoRes.status === 'fulfilled' && respondidoRes.value.error === null
            ? (respondidoRes.value.count ?? 0)
            : -1,
          novosRes.status === 'fulfilled' && novosRes.value.error === null
            ? (novosRes.value.count ?? 0)
            : -1,
        ];
      }

      // Apply resolved counts to card templates
      setMetrics((prev) =>
        prev.map((card, i) => ({
          ...card,
          value: counts[i] as number | -1,
        })),
      );

      setLastUpdated(new Date());
    } catch (err: unknown) {
      console.error('Erro ao buscar métricas:', err);
      // Mark all remaining loading cards as error
      setMetrics((prev) =>
        prev.map((card) => ({
          ...card,
          value: card.value === null ? -1 : card.value,
        })),
      );
    } finally {
      setRefreshing(false);
    }
  }, [user, role, buildCardTemplates]);

  useEffect(() => {
    // Initialize templates immediately so skeletons render before fetch starts
    setMetrics(buildCardTemplates());
    fetchMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  // ─────────────────────────────────────────────────────────
  // Role display labels
  // ─────────────────────────────────────────────────────────
  const PANEL_TITLES: Record<string, string> = {
    admin: 'Painel Administrativo Doutortec',
    especialista: 'Painel do Especialista Doutortec',
    solicitante: 'Painel de Interconsultas Doutortec',
  };
  const panelTitle = PANEL_TITLES[role ?? ''] ?? 'Painel Doutortec';

  const casosTab = role === 'especialista' ? 'casos' : 'meus-casos';

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* ── Welcome Banner ─────────────────────────────────── */}
      <div
        className="rounded-xl p-6 md:p-8 relative overflow-hidden border border-[#b2c4d6]/50"
        style={{ backgroundColor: '#e8f3fc' }}
      >
        <div className="relative flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <p className="text-[#56657c] text-xs font-bold uppercase tracking-widest mb-1.5">
              Sistema de Teleconsultoria Médica
            </p>
            <h3 className="text-xl font-bold tracking-tight" style={{ color: '#002157' }}>
              {panelTitle}
            </h3>
            <p className="mt-2 text-sm max-w-2xl text-gray-700">
              Olá,{' '}
              <strong style={{ color: '#002157' }}>{perfil?.nome}</strong>. Sua
              conexão está ativa e você está pronto para gerenciar e responder
              interconsultas médicas com segurança.
            </p>
          </div>

          {/* Refresh button */}
          <button
            onClick={fetchMetrics}
            disabled={refreshing}
            title="Atualizar métricas"
            className="flex items-center gap-1.5 self-start rounded-lg border px-3 py-2 text-xs font-bold transition disabled:opacity-50 shrink-0"
            style={{ borderColor: '#002157', color: '#002157', backgroundColor: 'transparent' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#002157'; e.currentTarget.style.color = '#white'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#002157'; }}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}
            />
            Atualizar
          </button>
        </div>

        {/* Last updated timestamp */}
        {lastUpdated && (
          <p className="relative mt-3 text-[10px] text-[#56657c]">
            Última atualização:{' '}
            {lastUpdated.toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </p>
        )}
      </div>

      {/* ── Metrics Grid ───────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.length === 0
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : metrics.map((card, i) => <MetricCardView key={i} card={card} />)}
      </div>

      {/* ── Recent Cases ───────────────────────────────────── */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-xs">
        <div className="flex justify-between items-center pb-4 border-b border-gray-100 mb-4">
          <div>
            <h4 className="text-sm font-extrabold" style={{ color: '#002157' }}>
              Casos Recentes
            </h4>
            <p className="text-[10px] text-[#56657c] mt-0.5">
              Últimas interconsultas registradas na plataforma
            </p>
          </div>
          <button
            onClick={() => onNavigate(casosTab)}
            className="text-xs font-bold transition"
            style={{ color: '#002157' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            Ver todos →
          </button>
        </div>
        <ListaCasos limit={3} showFilters={false} onSelectCaso={onSelectCaso} />
      </div>
    </div>
  );
};
