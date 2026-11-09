import React from 'react';

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  glow?: boolean;
  variant?: 'default' | 'light' | 'dark' | 'monochrome';
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  className = '',
  glow = true,
  variant = 'default',
  showText = false,
}) => {
  const symbolSizes = {
    xs: 'w-9 h-9 sm:w-10 sm:h-10',
    sm: 'w-11 h-11 sm:w-12 sm:h-12',
    md: 'w-16 h-16 sm:w-20 sm:h-20',
    lg: 'w-24 h-24 sm:w-28 sm:h-28',
    xl: 'w-32 h-32 sm:w-36 sm:h-36',
  };

  const isMono = variant === 'monochrome';

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      <div className={`relative flex items-center justify-center shrink-0 ${symbolSizes[size]}`}>
        {glow && !isMono && (
          <div className="absolute inset-0 bg-[#2563EB]/25 rounded-2xl blur-xl pointer-events-none transform scale-95" />
        )}
        <img
          src="/icons/icon-512.png?v=20261103"
          alt="Freelas"
          className={`relative w-full h-full object-cover rounded-2xl drop-shadow-md pointer-events-none ${
            isMono ? 'grayscale contrast-125' : ''
          }`}
        />
      </div>

      {showText && (
        <div className="flex flex-col justify-center leading-none">
          <div
            className={`font-extrabold tracking-tight uppercase ${
              size === 'xs'
                ? 'text-base'
                : size === 'sm'
                ? 'text-lg'
                : size === 'md'
                ? 'text-2xl'
                : 'text-3xl'
            } ${
              variant === 'dark'
                ? 'text-white'
                : variant === 'light'
                ? 'text-[#101D32]'
                : 'text-[var(--ink)]'
            }`}
          >
            <span>FREE</span>
            <span className="text-[#3B82F6]">LAS</span>
          </div>
          <span
            className={`font-bold uppercase tracking-widest mt-0.5 ${
              size === 'xs' ? 'text-[9px]' : 'text-[10px]'
            } ${
              variant === 'dark'
                ? 'text-[#94A3B8]'
                : variant === 'light'
                ? 'text-[#64748B]'
                : 'text-[var(--muted)]'
            }`}
          >
            Autônomos &amp; Freelancers
          </span>
        </div>
      )}
    </div>
  );
};
