import React from 'react';
import {
  Home,
  Users,
  Briefcase,
  Calendar,
  DollarSign,
  TrendingUp,
  FileText,
  Receipt,
  BookOpen,
  BarChart3,
  Bell,
  User,
  Settings,
  PlusCircle,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from 'lucide-react';
import { PageId } from '../types';
import { Logo } from './Logo';

interface SidebarProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  unreadNotificationsCount: number;
  displayName: string;
  professionalId?: string;
  photo?: string;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  collapsed,
  onToggleCollapse,
  unreadNotificationsCount,
  displayName,
  professionalId,
  photo,
  onLogout,
}) => {
  const mainItems: { id: PageId; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: 'Início', icon: <Home className="w-5 h-5 shrink-0" /> },
    { id: 'clients', label: 'Clientes', icon: <Users className="w-5 h-5 shrink-0" /> },
    { id: 'jobs', label: 'Trabalhos', icon: <Briefcase className="w-5 h-5 shrink-0" /> },
    { id: 'calendar', label: 'Agenda', icon: <Calendar className="w-5 h-5 shrink-0" /> },
    { id: 'finance', label: 'Financeiro', icon: <DollarSign className="w-5 h-5 shrink-0" /> },
    { id: 'business', label: 'Meu Negócio', icon: <TrendingUp className="w-5 h-5 shrink-0" /> },
  ];

  const secondaryItems: { id: PageId; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'quotes', label: 'Orçamentos', icon: <FileText className="w-4.5 h-4.5 shrink-0" /> },
    { id: 'receipts', label: 'Recibos', icon: <Receipt className="w-4.5 h-4.5 shrink-0" /> },
    { id: 'catalog', label: 'Catálogo de Serviços', icon: <BookOpen className="w-4.5 h-4.5 shrink-0" /> },
    { id: 'reports', label: 'Relatórios', icon: <BarChart3 className="w-4.5 h-4.5 shrink-0" /> },
    {
      id: 'notifications',
      label: 'Notificações',
      icon: <Bell className="w-4.5 h-4.5 shrink-0" />,
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined,
    },
    { id: 'profile', label: 'Perfil', icon: <User className="w-4.5 h-4.5 shrink-0" /> },
    { id: 'settings', label: 'Configurações', icon: <Settings className="w-4.5 h-4.5 shrink-0" /> },
  ];

  const initial = (displayName[0] || 'F').toUpperCase();

  return (
    <aside
      className={`hidden lg:flex flex-col shrink-0 bg-[#101D32] text-white border-r border-[#1E3254] transition-all duration-200 select-none ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Top Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-[#1E3254]">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2.5 min-w-0 cursor-pointer text-left"
        >
          <Logo size="xs" glow={false} variant="dark" showText={!collapsed} />
        </button>

        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#162540] transition-colors cursor-pointer"
          title={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
        >
          {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {/* Primary Action CTA */}
      <div className="p-3">
        <button
          type="button"
          onClick={() => onNavigate('new')}
          className={`w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#2563EB] hover:bg-[#3B82F6] text-white font-bold text-xs shadow-sm transition-all cursor-pointer active:scale-[0.98] ${
            currentPage === 'new' ? 'ring-2 ring-[#60A5FA]' : ''
          }`}
          title="Registrar Novo Trabalho"
        >
          <PlusCircle className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Novo Trabalho</span>}
        </button>
      </div>

      {/* Scrollable Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6 no-scrollbar">
        {/* Main Menu */}
        <div>
          {!collapsed && (
            <div className="px-2.5 mb-2 text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
              Menu Principal
            </div>
          )}
          <nav className="space-y-1">
            {mainItems.map((item) => {
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center ${
                    collapsed ? 'justify-center px-2' : 'justify-start px-3'
                  } gap-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#2563EB] text-white shadow-xs font-bold'
                      : 'text-[#94A3B8] hover:text-white hover:bg-[#162540]'
                  }`}
                >
                  {item.icon}
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Secondary Menu */}
        <div>
          {!collapsed && (
            <div className="px-2.5 mb-2 text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
              Gestão &amp; Ferramentas
            </div>
          )}
          <nav className="space-y-1">
            {secondaryItems.map((item) => {
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center ${
                    collapsed ? 'justify-center px-2' : 'justify-between px-3'
                  } py-2 rounded-xl text-xs font-medium transition-all cursor-pointer relative ${
                    isActive
                      ? 'bg-[#162540] text-[#60A5FA] font-bold border border-[#2563EB]/40'
                      : 'text-[#94A3B8] hover:text-white hover:bg-[#162540]/70'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {item.icon}
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </div>
                  {item.badge !== undefined && (
                    <span
                      className={`${
                        collapsed
                          ? 'absolute top-1 right-1.5 w-4 h-4 text-[9px]'
                          : 'px-1.5 py-0.5 text-[10px]'
                      } rounded-full bg-[#2563EB] text-white font-bold flex items-center justify-center`}
                    >
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* User Footer */}
      <div className="p-3 border-t border-[#1E3254] bg-[#0B1324]/50">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} gap-2`}>
          <button
            type="button"
            onClick={() => onNavigate('profile')}
            className="flex items-center gap-2.5 min-w-0 text-left hover:opacity-90 transition-opacity cursor-pointer"
            title="Abrir Perfil Profissional"
          >
            <div className="w-9 h-9 rounded-full overflow-hidden border border-[#2563EB]/50 bg-[#162540] text-[#60A5FA] font-bold text-xs flex items-center justify-center shrink-0">
              {photo ? (
                <img src={photo} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span>{initial}</span>
              )}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">{displayName || 'Profissional'}</div>
                <div className="text-[10px] text-[#94A3B8] truncate">
                  {professionalId || 'Ver Perfil'}
                </div>
              </div>
            )}
          </button>

          {!collapsed && (
            <button
              type="button"
              onClick={onLogout}
              className="p-2 rounded-lg text-[#94A3B8] hover:text-[#DC4545] hover:bg-[#162540] transition-colors cursor-pointer shrink-0"
              title="Sair da conta"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
