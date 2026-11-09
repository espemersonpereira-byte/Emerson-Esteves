import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Monitor, ChevronDown } from 'lucide-react';
import { ThemePreference } from '../types';

interface ThemeToggleProps {
  theme: ThemePreference;
  onThemeChange: (theme: ThemePreference) => void;
  isDark: boolean;
  systemIsDark: boolean;
  compact?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  theme,
  onThemeChange,
  isDark,
  systemIsDark,
  compact = false,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const options: { id: ThemePreference; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: 'auto',
      label: 'Automático',
      icon: <Monitor className="w-4 h-4" />,
      desc: systemIsDark ? 'Segue sistema (agora Escuro)' : 'Segue sistema (agora Claro)',
    },
    {
      id: 'light',
      label: 'Claro',
      icon: <Sun className="w-4 h-4" />,
      desc: 'Sempre modo claro',
    },
    {
      id: 'dark',
      label: 'Escuro',
      icon: <Moon className="w-4 h-4" />,
      desc: 'Sempre modo escuro',
    },
  ];

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setMenuOpen((prev) => !prev)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs font-semibold hover:border-[var(--muted)] transition-all shadow-xs"
        title={`Tema: ${theme === 'auto' ? `Automático (${isDark ? 'Escuro' : 'Claro'})` : theme === 'dark' ? 'Modo Escuro' : 'Modo Claro'}`}
      >
        {theme === 'auto' ? (
          <span className="relative flex items-center justify-center text-[var(--copper)]">
            <Monitor className="w-3.5 h-3.5" />
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${
                systemIsDark ? 'bg-indigo-400' : 'bg-amber-400'
              }`}
            />
          </span>
        ) : theme === 'dark' ? (
          <Moon className="w-3.5 h-3.5 text-indigo-400" />
        ) : (
          <Sun className="w-3.5 h-3.5 text-amber-500" />
        )}

        {!compact && (
          <span className="hidden sm:inline-block">
            {theme === 'auto' ? 'Auto' : theme === 'dark' ? 'Escuro' : 'Claro'}
          </span>
        )}
        <ChevronDown className={`w-3 h-3 text-[var(--muted)] transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`} />
      </button>

      {menuOpen && (
        <div className="absolute right-0 mt-1.5 w-52 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-1.5 shadow-xl z-50 text-xs">
          <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] border-b border-[var(--line)] mb-1">
            Escolher Tema
          </div>
          {options.map((opt) => {
            const isSelected = theme === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  onThemeChange(opt.id);
                  setMenuOpen(false);
                }}
                className={`w-full flex items-start gap-2.5 px-2.5 py-2 rounded-xl text-left transition-colors ${
                  isSelected
                    ? 'bg-[var(--sage)] text-[var(--g)] font-bold'
                    : 'text-[var(--ink)] hover:bg-[var(--cream)]'
                }`}
              >
                <span className="mt-0.5">{opt.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span>{opt.label}</span>
                    {isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--g)]" />
                    )}
                  </div>
                  <div className="text-[10px] text-[var(--muted)] font-normal">
                    {opt.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
