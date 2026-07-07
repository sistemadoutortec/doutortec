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
        { label: 'Aprovação de Clínicos', icon: ShieldCheck, id: 'aprovacao' },
        { label: 'Gerenciamento de Perfis', icon: UserCheck, id: 'gerenciamento-perfis' },
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
    <div className="flex flex-col" style={{ backgroundColor: '#0b1626', minHeight: '100%' }}>
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3 py-1">
          <img src="/LogoBranca.png" alt="Doutortec" className="h-10 w-auto object-contain" />
        </div>
        <button
          className="md:hidden text-white/60 hover:text-white"
          onClick={() => setMobileMenuOpen(false)}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Nav items — fluem naturalmente com a página */}
      <div className="px-4 pt-5 pb-2">
        <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Navegação
        </p>
      </div>

      <nav className="px-3 space-y-1 pb-4">
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
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition-all ${
                  isActive
                    ? 'text-white border-l-4 border-white pl-2'
                    : 'text-white/60 hover:text-white hover:bg-white/5 border-l-4 border-transparent pl-2'
                }`}
                style={isActive ? { backgroundColor: '#0b316d' } : undefined}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-white/40'}`} />
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

      {/* User profile footer — flui após os itens */}
      <div className="p-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(0,0,0,0.15)' }}>
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
    // Layout de página inteira: sem altura fixa, sem overflow — uma única scrollbar do navegador
    <div className="flex min-h-screen w-full bg-gray-50">
      {/* Desktop Sidebar — flui com a página */}
      <aside className="hidden md:block w-64 shrink-0" style={{ backgroundColor: '#0b1626' }}>
        <SidebarContent />
      </aside>

      {/* Mobile Drawer (overlay fixo) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-xs" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative flex flex-col w-64 max-w-xs h-full z-50 overflow-y-auto" style={{ backgroundColor: '#0b1626' }}>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Área direita — flui com a página */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header sticky — fica no topo ao rolar */}
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-8 relative" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden rounded-lg p-1.5 hover:bg-gray-100"
              style={{ color: '#0f2a54' }}
            >
              <Menu className="h-6 w-6" />
            </button>
            <h2 className="text-base font-extrabold tracking-tight" style={{ color: '#002157' }}>
              {menuLinks.find(link => link.id === activeTab)?.label || 'Doutortec'}
            </h2>
          </div>

          <div className="flex items-center gap-4 relative">
            {/* Bell Icon Trigger */}
            <button 
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative rounded-lg p-1.5 transition hover:bg-gray-100"
              style={{ color: '#002157' }}
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

        {/* Conteúdo principal — flui com a página */}
        <main className="flex-1 p-4 md:p-8" style={{ backgroundColor: '#f4f6f8' }}>
          {children}
        </main>
      </div>
    </div>
  );
};

