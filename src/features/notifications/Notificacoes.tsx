import React, { useState } from 'react';
import { useNotifications } from '../../context/NotificationsContext';
import type { NotificacaoItem } from '../../context/NotificationsContext';
import {
  Bell,
  CheckCheck,
  Clock,
  MessageSquare,
  Stethoscope,
  AlertCircle,
  Loader2,
  ArrowRight,
  InboxIcon
} from 'lucide-react';

interface NotificacoesPageProps {
  onSelectCaso?: (casoId: string) => void;
}

const getEventIcon = (tipo: string) => {
  switch (tipo) {
    case 'nova_mensagem':
    case 'chat':
      return <MessageSquare className="h-4 w-4" />;
    case 'novo_caso':
    case 'caso_atribuido':
      return <Stethoscope className="h-4 w-4" />;
    case 'devolutiva':
    case 'caso_respondido':
      return <CheckCheck className="h-4 w-4" />;
    default:
      return <AlertCircle className="h-4 w-4" />;
  }
};

const getEventColor = (tipo: string) => {
  switch (tipo) {
    case 'nova_mensagem':
    case 'chat':
      return { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' };
    case 'novo_caso':
    case 'caso_atribuido':
      return { bg: 'bg-indigo-100', text: 'text-indigo-600', border: 'border-indigo-200' };
    case 'devolutiva':
    case 'caso_respondido':
      return { bg: 'bg-emerald-100', text: 'text-emerald-600', border: 'border-emerald-200' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200' };
  }
};

const formatDate = (iso: string) => {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Agora mesmo';
  if (diffMins < 60) return `há ${diffMins} min`;
  if (diffHours < 24) return `há ${diffHours}h`;
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `há ${diffDays} dias`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const NotificationCard: React.FC<{
  item: NotificacaoItem;
  onRead: (id: string) => void;
  onNavigate?: (casoId: string) => void;
}> = ({ item, onRead, onNavigate }) => {
  const colors = getEventColor(item.tipo_evento);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleClick = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    await onRead(item.id);
    if (item.caso_id && onNavigate) {
      onNavigate(item.caso_id);
    }
    setIsProcessing(false);
  };

  return (
    <div
      onClick={handleClick}
      className={`group relative flex gap-4 p-4 cursor-pointer transition-all duration-200 border-b border-gray-100 last:border-b-0 hover:bg-gray-50/80 ${
        !item.is_lida ? 'bg-indigo-50/30' : 'bg-white'
      }`}
    >
      {/* Unread indicator bar */}
      {!item.is_lida && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-indigo-500 rounded-r" />
      )}

      {/* Icon */}
      <div
        className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border ${colors.bg} ${colors.text} ${colors.border}`}
      >
        {getEventIcon(item.tipo_evento)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <p
            className={`text-xs leading-snug ${
              !item.is_lida
                ? 'font-semibold text-gray-900'
                : 'font-medium text-gray-700'
            }`}
          >
            {item.mensagem_resumo}
          </p>
          {!item.is_lida && (
            <span className="h-2 w-2 bg-indigo-500 rounded-full shrink-0 mt-0.5" />
          )}
        </div>

        <div className="flex items-center gap-3 mt-1">
          <span className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
            <Clock className="h-3 w-3" />
            {formatDate(item.criado_em)}
          </span>

          {item.tipo_evento && (
            <span
              className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${colors.bg} ${colors.text}`}
            >
              {item.tipo_evento.replace(/_/g, ' ')}
            </span>
          )}
        </div>
      </div>

      {/* Navigate arrow (only if linked to a case) */}
      {item.caso_id && (
        <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowRight className="h-4 w-4 text-gray-400" />
        </div>
      )}

      {isProcessing && (
        <div className="self-center">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />
        </div>
      )}
    </div>
  );
};

export const NotificacoesPage: React.FC<NotificacoesPageProps> = ({ onSelectCaso }) => {
  const { notificacoes, unreadCount, loading, marcarComoLida, marcarTodasComoLidas } =
    useNotifications();

  const [filter, setFilter] = useState<'todas' | 'nao_lidas'>('todas');

  const displayed =
    filter === 'nao_lidas'
      ? notificacoes.filter(n => !n.is_lida)
      : notificacoes;

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Bell className="h-5 w-5 text-indigo-600" />
            <h1 className="text-lg font-extrabold" style={{ color: '#0f2a54' }}>
              Central de Notificações
            </h1>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-red-500 text-[10px] font-black text-white">
                {unreadCount}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">
            Acompanhe os alertas e atualizações dos seus casos clínicos.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={marcarTodasComoLidas}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition shrink-0"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Marcar todas como lidas
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        {(['todas', 'nao_lidas'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === tab
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'todas' ? 'Todas' : `Não lidas${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
          </button>
        ))}
      </div>

      {/* Notifications list */}
      <div className="rounded-xl bg-white border border-gray-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            <span className="text-xs text-gray-400 font-medium">
              Carregando notificações...
            </span>
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
            <div className="h-12 w-12 rounded-2xl bg-gray-100 flex items-center justify-center">
              <InboxIcon className="h-6 w-6 text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700">Tudo em dia!</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {filter === 'nao_lidas'
                  ? 'Nenhuma notificação não lida no momento.'
                  : 'Nenhuma notificação encontrada.'}
              </p>
            </div>
          </div>
        ) : (
          displayed.map(item => (
            <NotificationCard
              key={item.id}
              item={item}
              onRead={marcarComoLida}
              onNavigate={onSelectCaso}
            />
          ))
        )}
      </div>

      {displayed.length > 0 && (
        <p className="text-center text-[10px] text-gray-400">
          Exibindo {displayed.length} notificaç{displayed.length !== 1 ? 'ões' : 'ão'}.
        </p>
      )}
    </div>
  );
};

// Backward-compatible dropdown version (used in DashboardLayout header)
export const Notificacoes: React.FC<{
  onClose?: () => void;
  onSelectCaso?: (casoId: string) => void;
}> = ({ onClose, onSelectCaso }) => {
  const { notificacoes, marcarComoLida, marcarTodasComoLidas, loading } = useNotifications();

  const unread = notificacoes.filter(n => !n.is_lida);

  return (
    <div className="w-80 bg-white rounded-xl border border-gray-150 shadow-xl overflow-hidden max-h-[450px] flex flex-col">
      {/* Header */}
      <div className="p-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-indigo-600" />
          <span className="text-xs font-bold text-gray-800">Central de Alertas</span>
          {unread.length > 0 && (
            <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-red-500 text-[9px] font-black text-white">
              {unread.length}
            </span>
          )}
        </div>
        {unread.length > 0 && (
          <button
            onClick={marcarTodasComoLidas}
            className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-500 flex items-center gap-1 transition"
          >
            <CheckCheck className="h-3 w-3" />
            Limpar tudo
          </button>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
          </div>
        ) : notificacoes.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400">
            Sem notificações no momento.
          </div>
        ) : (
          notificacoes.slice(0, 15).map(item => {
            const colors = getEventColor(item.tipo_evento);
            return (
              <div
                key={item.id}
                onClick={async () => {
                  await marcarComoLida(item.id);
                  if (item.caso_id && onSelectCaso) onSelectCaso(item.caso_id);
                  if (onClose) onClose();
                }}
                className={`p-3 cursor-pointer hover:bg-gray-50 transition flex gap-3 ${
                  !item.is_lida ? 'bg-indigo-50/25' : ''
                }`}
              >
                <div
                  className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${colors.bg} ${colors.text}`}
                >
                  {getEventIcon(item.tipo_evento)}
                </div>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex justify-between items-start gap-2">
                    <p
                      className={`text-[11px] leading-snug ${
                        !item.is_lida ? 'font-semibold text-gray-900' : 'text-gray-600'
                      }`}
                    >
                      {item.mensagem_resumo}
                    </p>
                    {!item.is_lida && (
                      <span className="h-1.5 w-1.5 bg-indigo-600 rounded-full shrink-0 mt-1" />
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[9px] text-gray-400">
                    <Clock className="h-2.5 w-2.5" />
                    <span>{formatDate(item.criado_em)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
