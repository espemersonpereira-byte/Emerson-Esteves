import React, { useState } from 'react';
import {
  Home,
  Users,
  Briefcase,
  Calendar,
  DollarSign,
  Menu,
  PlusCircle,
  TrendingUp,
  FileText,
  Receipt,
  BookOpen,
  BarChart3,
  Bell,
  User,
  Settings,
  X,
  ChevronRight,
} from 'lucide-react';
import { PageId } from '../types';

interface NavbarProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  unreadNotificationsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  onNavigate,
  unreadNotificationsCount = 0,
}) => {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // Mobile Bottom Bar: 5 core items + Menu drawer
  const coreTabs: { id: PageId; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: 'Início', icon: <Home className="w-5 h-5" /> },
    { id: 'clients', label: 'Clientes', icon: <Users className="w-5 h-5" /> },
    { id: 'jobs', label: 'Trabalhos', icon: <Briefcase className="w-5 h-5" /> },
    { id: 'calendar', label: 'Agenda', icon: <Calendar className="w-5 h-5" /> },
    { id: 'finance', label: 'Financeiro', icon: <DollarSign className="w-5 h-5" /> },
  ];

  // Full Menu items inside the mobile drawer
  const menuItems: {
    id: PageId;
    label: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    badge?: number;
  }[] = [
    {
      id: 'new',
      label: 'Novo Trabalho',
      description: 'Registrar trabalho, plantão, diária ou projeto',
      icon: <PlusCircle className="w-5 h-5 text-[#2563EB]" />,
      color: 'bg-[#2563EB]/10 text-[#2563EB]',
    },
    {
      id: 'business',
      label: 'Meu Negócio & Metas',
      description: 'Visão executiva, lucro líquido, ticket médio e metas',
      icon: <TrendingUp className="w-5 h-5 text-[#16A36A]" />,
      color: 'bg-[#16A36A]/10 text-[#16A36A]',
    },
    {
      id: 'quotes',
      label: 'Orçamentos',
      description: 'Criar propostas comerciais, aprovar e converter em trabalho',
      icon: <FileText className="w-5 h-5 text-[#3B82F6]" />,
      color: 'bg-[#3B82F6]/10 text-[#3B82F6]',
    },
    {
      id: 'receipts',
      label: 'Recibos & Comprovantes',
      description: 'Emitir, imprimir, baixar PDF e enviar recibos',
      icon: <Receipt className="w-5 h-5 text-indigo-500" />,
      color: 'bg-indigo-500/10 text-indigo-500',
    },
    {
      id: 'catalog',
      label: 'Catálogo de Serviços',
      description: 'Serviços padronizados, preços sugeridos e materiais',
      icon: <BookOpen className="w-5 h-5 text-amber-500" />,
      color: 'bg-amber-500/10 text-amber-500',
    },
    {
      id: 'reports',
      label: 'Relatórios & Exportação',
      description: 'Relatórios financeiros, clientes, serviços, PDF e CSV',
      icon: <BarChart3 className="w-5 h-5 text-cyan-500" />,
      color: 'bg-cyan-500/10 text-cyan-500',
    },
    {
      id: 'notifications',
      label: 'Notificações & Lembretes',
      description: 'Alertas de agenda, cobranças, orçamentos e metas',
      icon: <Bell className="w-5 h-5 text-rose-500" />,
      color: 'bg-rose-500/10 text-rose-500',
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined,
    },
    {
      id: 'profile',
      label: 'Perfil Profissional',
      description: 'Dados comerciais, documento, registro e contatos',
      icon: <User className="w-5 h-5 text-purple-500" />,
      color: 'bg-purple-500/10 text-purple-500',
    },
    {
      id: 'settings',
      label: 'Configurações & Backup',
      description: 'Tema, categorias, segurança, backup e privacidade',
      icon: <Settings className="w-5 h-5 text-slate-500" />,
      color: 'bg-slate-500/10 text-slate-500',
    },
  ];

  const isDrawerPageActive = [
    'new',
    'business',
    'quotes',
    'receipts',
    'catalog',
    'reports',
    'notifications',
    'profile',
    'settings',
  ].includes(currentPage);

  const handleSelectPage = (page: PageId) => {
    setIsMoreMenuOpen(false);
    onNavigate(page);
  };

  return (
    <>
      {/* Mobile Bottom Navigation (Hidden on Desktop where Sidebar is visible) */}
      <nav
        aria-label="Navegação principal mobile"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--paper)]/95 backdrop-blur-md border-t border-[var(--line)] px-1.5 pt-1.5 transition-colors pb-safe shadow-[0_-4px_24px_rgba(0,0,0,0.08)]"
      >
        <div className="max-w-xl mx-auto grid grid-cols-6 gap-0.5 items-center">
          {coreTabs.map((item) => {
            const isActive = currentPage === item.id && !isMoreMenuOpen;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectPage(item.id)}
                className={`flex flex-col items-center justify-center min-h-[50px] py-1 px-1 rounded-2xl transition-all cursor-pointer select-none active:scale-95 ${
                  isActive
                    ? 'text-[var(--g)] font-bold'
                    : 'text-[var(--muted)] hover:text-[var(--ink)]'
                }`}
              >
                <div
                  className={`relative p-1.5 rounded-xl transition-all ${
                    isActive ? 'bg-[var(--sage)] text-[var(--g)]' : ''
                  }`}
                >
                  {item.icon}
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight font-semibold leading-none truncate max-w-full">
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* Menu Drawer Trigger */}
          <button
            type="button"
            onClick={() => setIsMoreMenuOpen(true)}
            className={`flex flex-col items-center justify-center min-h-[50px] py-1 px-1 rounded-2xl transition-all cursor-pointer select-none active:scale-95 ${
              isDrawerPageActive || isMoreMenuOpen
                ? 'text-[var(--g)] font-bold'
                : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            <div
              className={`relative p-1.5 rounded-xl transition-all ${
                isDrawerPageActive || isMoreMenuOpen ? 'bg-[var(--sage)] text-[var(--g)]' : ''
              }`}
            >
              <Menu className="w-5 h-5" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#DC4545]" />
              )}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight font-semibold leading-none truncate max-w-full">
              Menu
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile Full Navigation Drawer */}
      {isMoreMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setIsMoreMenuOpen(false)}
          />

          <div className="relative z-10 w-full max-w-lg mx-auto max-h-[85vh] flex flex-col bg-[var(--paper)] rounded-t-3xl border-t border-[var(--line)] shadow-2xl animate-in slide-in-from-bottom duration-250 pb-safe">
            <div className="p-4 pb-3 border-b border-[var(--line)] shrink-0">
              <div className="w-12 h-1.5 bg-[var(--line)] rounded-full mx-auto mb-3" />
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-[var(--ink)] tracking-tight">
                    Todos os Módulos — FREELAS
                  </h3>
                  <p className="text-xs text-[var(--muted)]">
                    Gestão completa para autônomos e freelancers
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMoreMenuOpen(false)}
                  className="p-1.5 rounded-full hover:bg-[var(--cream)] text-[var(--muted)] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto p-4 space-y-2 pb-6">
              {menuItems.map((item) => {
                const isSelected = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectPage(item.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all text-left cursor-pointer active:scale-[0.99] ${
                      isSelected
                        ? 'bg-[var(--sage)] border-[var(--g)] text-[var(--ink)] shadow-xs'
                        : 'bg-[var(--surface-elevated)] border-[var(--line)] hover:border-[var(--g)]/50 text-[var(--ink)]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2.5 rounded-xl shrink-0 ${item.color}`}>
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm leading-tight truncate">
                            {item.label}
                          </h4>
                          {item.badge !== undefined && (
                            <span className="px-1.5 py-0.5 rounded-full bg-[#2563EB] text-white text-[10px] font-bold">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--muted)] leading-tight mt-0.5 truncate">
                          {item.description}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[var(--muted)] shrink-0 ml-2" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
