import React from 'react';
import { useNotifications } from '../../context/NotificationsContext';
import { Bell, Check, Clock } from 'lucide-react';

interface NotificacoesProps {
  onClose?: () => void;
  onSelectCaso?: (casoId: string) => void;
}

export const Notificacoes: React.FC<NotificacoesProps> = ({ onClose, onSelectCaso }) => {
  const { notificacoes, marcarComoLida, limparTodas } = useNotifications();

  return (
    <div className="w-80 bg-white rounded-xl border border-gray-150 shadow-lg overflow-hidden max-h-[450px] flex flex-col">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-indigo-600" />
          <span className="text-xs font-bold text-gray-800">Central de Alertas</span>
        </div>
        {notificacoes.some(n => !n.lida) && (
          <button
            onClick={limparTodas}
            className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-500 flex items-center gap-1 transition"
          >
            <Check className="h-3 w-3" />
            Limpar tudo
          </button>
        )}
      </div>

      {/* Notifications list */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
        {notificacoes.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-400">
            Sem notificações no momento.
          </div>
        ) : (
          notificacoes.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                marcarComoLida(item.id);
                if (item.caso_id && onSelectCaso) {
                  onSelectCaso(item.caso_id);
                }
                if (onClose) onClose();
              }}
              className={`p-3 text-left transition cursor-pointer hover:bg-gray-50 flex gap-3 ${
                !item.lida ? 'bg-indigo-50/20 font-medium' : ''
              }`}
            >
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex justify-between items-start gap-2">
                  <p className="text-xs font-bold text-gray-900 truncate">
                    {item.titulo}
                  </p>
                  {!item.lida && (
                    <span className="h-1.5 w-1.5 bg-indigo-600 rounded-full shrink-0 mt-1" />
                  )}
                </div>
                <p className="text-[11px] text-gray-600 leading-normal line-clamp-2">
                  {item.mensagem}
                </p>
                <div className="flex items-center gap-1 text-[9px] text-gray-400">
                  <Clock className="h-3 w-3" />
                  <span>
                    {new Date(item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
              
              {!item.lida && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    marcarComoLida(item.id);
                  }}
                  className="rounded-full p-1 hover:bg-gray-150 text-gray-400 hover:text-indigo-600 transition self-center"
                  title="Marcar como lida"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
