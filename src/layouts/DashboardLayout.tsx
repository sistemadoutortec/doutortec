import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../context/NotificationsContext';
import { Notificacoes } from '../features/notifications/Notificacoes';
import {
  LayoutDashboard,
  FileText,
  FolderDot,
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
        { label: 'Meus Casos', icon: FolderDot, id: 'meus-casos' },
        { label: 'Pacientes', icon: Users, id: 'pacientes' },
        { label: 'Especialistas', icon: Stethoscope, id: 'especialistas' },
        { label: 'Notificações', icon: Bell, id: 'notificacoes' }
      ];
    }

    if (role === 'especialista') {
      return [
        { label: 'Dashboard', icon: LayoutDashboard, id: 'dashboard' },
        { label: 'Casos', icon: FileText, id: 'casos' },
        { label: 'Meus Casos', icon: FolderDot, id: 'meus-casos' },
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
        { label: 'Meus Casos', icon: FolderDot, id: 'meus-casos' },
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
    <div className="flex h-full flex-col justify-between bg-white border-r border-gray-150 p-4">
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-xl font-bold tracking-tight text-indigo-600">Doutortec</span>
          <button 
            className="md:hidden text-gray-500 hover:text-gray-700"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2">
          Navegação
        </div>

        <nav className="space-y-1">
          {menuLinks.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <div key={item.id} className="relative">
                <button
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
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
      <div className="border-t border-gray-100 pt-4 mt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-sm font-semibold">
              {userInitials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-gray-900">
                {perfil?.nome || 'Usuário'}
              </p>
              <p className="truncate text-[10px] text-gray-500">
                {user?.email || perfil?.email}
              </p>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
            title="Sair"
          >
            <LogOut className="h-4.5 w-4.5" />
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
        <header className="flex h-16 items-center justify-between border-b border-gray-150 bg-white px-4 md:px-8 relative">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden rounded-lg p-1.5 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h2 className="text-lg font-semibold text-gray-800 capitalize">
              {menuLinks.find(link => link.id === activeTab)?.label || 'Doutortec'}
            </h2>
          </div>

          <div className="flex items-center gap-4 relative">
            {/* Bell Icon Trigger */}
            <button 
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative rounded-lg p-1.5 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition"
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
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};
