import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../context/NotificationsContext';
import { Notificacoes } from '../features/notifications/Notificacoes';
import {
  LayoutDashboard,
  FileText,
  Users,
  Stethoscope,
  Activity,
  MapPin,
  Trophy,
  BarChart3,
  ShieldCheck,
  DollarSign,
  Shuffle,
  Bell,
  LogOut,
  Menu,
  X,
  UserCheck
} from 'lucide-react';

interface SidebarItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  id: string;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onSelectCasoId?: (casoId: string) => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  activeTab,
  setActiveTab,
  onSelectCasoId
}) => {
  const { user, perfil, signOut } = useAuth();
  const { unreadCount } = useNotifications();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const getMenuLinks = (): SidebarItem[] => {
    const role = perfil?.role;

    if (role === 'solicitante') {
      return [
        { label: 'Dashboard', icon: LayoutDashboard, id: 'dashboard' },
        { label: 'Casos', icon: FileText, id: 'casos' },
        { label: 'Pacientes', icon: Users, id: 'pacientes' },
        { label: 'Especialistas', icon: Stethoscope, id: 'especialistas' },
        { label: 'Notificações', icon: Bell, id: 'notificacoes' }
      ];
    }

    if (role === 'especialista') {
      return [
        { label: 'Dashboard', icon: LayoutDashboard, id: 'dashboard' },
        { label: 'Casos', icon: FileText, id: 'casos' },
        { label: 'Especialidades', icon: Activity, id: 'especialidades' },
        { label: 'Ranking', icon: Trophy, id: 'ranking' },
        { label: 'Financeiro', icon: DollarSign, id: 'financeiro' },
        { label: 'Notificações', icon: Bell, id: 'notificacoes' }
      ];
    }

    if (role === 'admin') {
      return [
        { label: 'Dashboard', icon: LayoutDashboard, id: 'dashboard' },
        { label: 'Casos', icon: FileText, id: 'casos' },
        { label: 'Pacientes', icon: Users, id: 'pacientes' },
        { label: 'Especialistas', icon: Stethoscope, id: 'especialistas' },
        { label: 'Especialidades', icon: Activity, id: 'especialidades' },
        { label: 'Municípios', icon: MapPin, id: 'municipios' },
        { label: 'Ranking', icon: Trophy, id: 'ranking' },
        { label: 'Relatórios', icon: BarChart3, id: 'relatorios' },
        { label: 'Aprovar Clínicos', icon: ShieldCheck, id: 'aprovacao' },
        { label: 'Gerenciar Perfis', icon: UserCheck, id: 'gerenciamento-perfis' },
        { label: 'Financeiro', icon: DollarSign, id: 'financeiro' },
        { label: 'Distribuição', icon: Shuffle, id: 'distribuicao' },
        { label: 'Notificações', icon: Bell, id: 'notificacoes' }
      ];
    }

    return [
      { label: 'Dashboard', icon: LayoutDashboard, id: 'dashboard' },
      { label: 'Notificações', icon: Bell, id: 'notificacoes' }
    ];
  };

  const menuLinks = getMenuLinks();
  const userInitials = perfil?.nome ? perfil.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';

  const SidebarContent = () => (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#091151' }}>
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3">
          <img src="/Logo-Doutortec.png" alt="Doutortec" className="h-14 w-auto object-contain" />
        </div>
        <button
          className="md:hidden text-white/60 hover:text-white"
          onClick={() => setMobileMenuOpen(false)}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Nav items — rolável de forma independente com scrollbar fina */}
      <div className="flex flex-1 flex-col overflow-hidden py-4 px-4">
        <div className="pb-2">
          <p className="text-[9px] font-bold uppercase tracking-widest text-white/30">
            Navegação
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin">
          {menuLinks.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <div key={item.id}>
                <button
                   onClick={() => {
                     setActiveTab(item.id);
                     setMobileMenuOpen(false);
                   }}
                   className={`flex w-full items-center gap-3 rounded-xl py-3 px-4 text-[11px] font-bold uppercase tracking-wider transition-all duration-200 ${
                     isActive
                       ? 'text-white'
                       : 'text-white/60 hover:text-white hover:bg-white/5'
                   }`}
                   style={isActive ? { backgroundColor: '#0ea5e9' } : undefined}
                >
                  <Icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? 'text-white' : 'text-white/40'}`} />
                  {item.label}
                  {item.id === 'notificacoes' && unreadCount > 0 && (
                    <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </nav>
      </div>

      {/* User profile footer — fixo na parte inferior */}
      <div className="p-4 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', backgroundColor: '#091151' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
            >
              {userInitials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white">
                {perfil?.nome || 'Usuário'}
              </p>
              <p className="truncate text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {user?.email || perfil?.email}
              </p>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="rounded-lg p-1.5 transition"
            style={{ color: 'rgba(255,255,255,0.5)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'white')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );


  return (
    // Layout de página inteira travando alturas e usando rolagens independentes
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
      {/* Desktop Sidebar — altura fixa 100% da tela */}
      <aside className="hidden md:block w-64 h-full shrink-0" style={{ backgroundColor: '#091151' }}>
        <SidebarContent />
      </aside>

      {/* Mobile Drawer (overlay fixo) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-xs" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative flex flex-col w-64 max-w-xs h-full z-50 overflow-y-auto" style={{ backgroundColor: '#091151' }}>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Área direita — contida no h-screen */}
      <div className="flex flex-1 flex-col min-w-0 h-full overflow-hidden">
        {/* Header sticky — fica no topo ao rolar */}
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-slate-700 bg-[#091151] px-4 md:px-8 relative shrink-0" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }}>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden rounded-lg p-1.5 hover:bg-white/10"
              style={{ color: '#ffffff' }}
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>

          <div className="flex items-center gap-4 relative">
            {/* Bell Icon Trigger */}
            <button 
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative rounded-lg p-1.5 transition hover:bg-white/10"
              style={{ color: '#ffffff' }}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
              )}
            </button>

            {/* Notifications Dropdown Card */}
            {notificationsOpen && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setNotificationsOpen(false)} 
                />
                <div className="absolute right-0 top-10 z-20 shadow-xl">
                  <Notificacoes 
                    onClose={() => setNotificationsOpen(false)} 
                    onSelectCaso={(casoId) => {
                      if (onSelectCasoId) onSelectCasoId(casoId);
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </header>

        {/* Conteúdo principal — com sua própria rolagem vertical isolada */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8" style={{ backgroundColor: '#f4f6f8' }}>
          {children}
        </main>
      </div>
    </div>
  );
};

