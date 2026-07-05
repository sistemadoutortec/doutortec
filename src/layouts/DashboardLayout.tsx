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
    <div className="flex h-full flex-col justify-between" style={{ backgroundColor: '#0f2a54' }}>
      {/* Logo Placeholder Area */}
      <div>
        <div className="flex items-center justify-between px-4 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
          <div className="flex items-center gap-3">
            {/* LOGO PLACEHOLDER — substitua esta div pela tag <img> com sua logomarca */}
            <div
              className="flex items-center justify-center rounded-lg"
              style={{ width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.15)', border: '1.5px dashed rgba(255,255,255,0.4)' }}
              title="Substituir pela logomarca"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 21V9" />
              </svg>
            </div>
            <div>
              <span className="text-white font-bold text-base tracking-tight">Doutortec</span>
              <p className="text-white/50 text-[9px] uppercase tracking-widest leading-none mt-0.5">Teleconsultoria</p>
            </div>
          </div>
          <button
            className="md:hidden text-white/60 hover:text-white"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-4 pt-5 pb-2">
          <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Navegação
          </p>
        </div>

        <nav className="px-3 space-y-0.5">
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
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider transition-all ${
                    isActive
                      ? 'text-white border-l-4 border-white pl-2'
                      : 'text-white/65 hover:text-white hover:bg-white/8 border-l-4 border-transparent pl-2'
                  }`}
                  style={isActive ? { backgroundColor: 'rgba(255,255,255,0.15)' } : undefined}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-white/50'}`} />
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

      {/* User profile footer */}
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
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 shrink-0 h-full">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer (Sidebar overlay) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-xs" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative flex w-64 max-w-xs flex-col h-full z-50">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Right Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-8 relative" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden rounded-lg p-1.5 hover:bg-gray-100"
              style={{ color: '#0f2a54' }}
            >
              <Menu className="h-6 w-6" />
            </button>
            <h2 className="text-base font-bold tracking-tight" style={{ color: '#0f2a54' }}>
              {menuLinks.find(link => link.id === activeTab)?.label || 'Doutortec'}
            </h2>
          </div>

          <div className="flex items-center gap-4 relative">
            {/* Bell Icon Trigger */}
            <button 
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative rounded-lg p-1.5 transition hover:bg-gray-100"
              style={{ color: '#0f2a54' }}
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

        {/* Central Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8" style={{ backgroundColor: '#f0f4f8' }}>
          {children}
        </main>
      </div>
    </div>
  );
};

