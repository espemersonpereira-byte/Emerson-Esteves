import React from 'react';
import { Bell, LogOut, Camera } from 'lucide-react';
import { ThemePreference, PageId } from '../types';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  displayName: string;
  photo?: string;
  professionalId?: string;
  profession?: string;
  theme: ThemePreference;
  onThemeChange: (theme: ThemePreference) => void;
  isDark: boolean;
  systemIsDark: boolean;
  onOpenProfile: () => void;
  onNavigate?: (page: PageId) => void;
  unreadNotificationsCount?: number;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  displayName,
  photo,
  professionalId,
  profession,
  theme,
  onThemeChange,
  isDark,
  systemIsDark,
  onOpenProfile,
  onNavigate,
  unreadNotificationsCount = 0,
  onLogout,
}) => {
  const initial = (displayName?.trim()?.[0] || 'F').toUpperCase();
  const hasPhoto = Boolean(photo && photo.trim().length > 0);
  const subtitle = (professionalId && professionalId.trim()) || (profession && profession.trim()) || '';

  return (
    <header className="sticky top-0 z-30 bg-[var(--paper)]/95 backdrop-blur-md border-b border-[var(--line)] pt-safe transition-colors">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 min-h-[4.25rem] py-2 flex items-center justify-between gap-2.5 sm:gap-4">
        {/* Left: Circular Profile Photo + User Name + Professional Registration */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={onOpenProfile}
            className="flex items-center gap-2.5 sm:gap-3 min-w-0 text-left group cursor-pointer py-1 pr-2 rounded-2xl hover:bg-[var(--cream)] transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40"
            title="Visualizar ou alterar foto de perfil"
            aria-label="Foto e perfil do usuário"
          >
            {/* Circular Profile Photo */}
            <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full shrink-0">
              <div className="w-full h-full rounded-full overflow-hidden border-2 border-[#2563EB]/40 group-hover:border-[#2563EB] bg-[#101D32] text-white font-extrabold text-sm sm:text-base flex items-center justify-center shadow-sm transition-colors">
                {hasPhoto ? (
                  <img
                    src={photo}
                    alt={displayName}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <span>{initial}</span>
                )}
              </div>
              <span
                className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#2563EB] text-white flex items-center justify-center shadow-xs border border-[var(--paper)]"
                aria-hidden="true"
              >
                <Camera className="w-2.5 h-2.5" />
              </span>
            </div>

            {/* User Name + Professional Registration below */}
            <div className="min-w-0 flex flex-col justify-center">
              <div className="text-sm sm:text-base font-extrabold text-[var(--ink)] truncate leading-tight group-hover:text-[var(--g)] transition-colors">
                {displayName}
              </div>
              {subtitle ? (
                <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[var(--muted)] truncate mt-0.5">
                  {subtitle}
                </div>
              ) : (
                <div className="text-[10px] sm:text-[11px] font-semibold text-[var(--muted)] truncate mt-0.5">
                  Autônomo &amp; Freelancer
                </div>
              )}
            </div>
          </button>
        </div>

        {/* Right Actions: Notifications, Device/Theme Selector, Logout */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('notifications')}
              title="Central de Alertas e Lembretes"
              aria-label="Notificações"
              className="relative w-10 h-10 rounded-xl bg-[var(--cream)] border border-[var(--line)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--g)]/40 transition-all cursor-pointer shrink-0 active:scale-95"
            >
              <Bell className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#DC4545] text-white text-[10px] font-extrabold flex items-center justify-center shadow-sm">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
            </button>
          )}

          <ThemeToggle
            theme={theme}
            onThemeChange={onThemeChange}
            isDark={isDark}
            systemIsDark={systemIsDark}
            compact={true}
          />

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              title="Sair da conta"
              aria-label="Sair da conta"
              className="h-10 px-2.5 sm:px-3 rounded-xl bg-[var(--cream)] border border-[var(--line)] flex items-center justify-center gap-1.5 text-[var(--muted)] hover:text-[#DC4545] hover:border-[#DC4545]/30 hover:bg-[#DC4545]/5 transition-all cursor-pointer shrink-0 active:scale-95"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span className="hidden md:inline text-xs font-bold">Sair</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
