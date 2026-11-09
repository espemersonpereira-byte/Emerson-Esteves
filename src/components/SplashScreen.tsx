import React, { useEffect, useState } from 'react';
import { Logo } from './Logo';

interface SplashScreenProps {
  onFinish: () => void;
  minDuration?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  minDuration = 1200,
}) => {
  const [progress, setProgress] = useState(18);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / minDuration) * 100));
      setProgress(pct);

      if (elapsed >= minDuration) {
        clearInterval(interval);
        setIsFadingOut(true);
        setTimeout(() => {
          onFinish();
        }, 300);
      }
    }, 35);

    return () => clearInterval(interval);
  }, [minDuration, onFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-between px-6 py-12 bg-[#101D32] text-white transition-opacity duration-300 ease-out select-none ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        background: 'radial-gradient(circle at 50% 38%, #162847 0%, #101D32 70%, #09111E 100%)',
      }}
    >
      <div className="w-full h-4" />

      {/* Center Corporate Brand Lockup */}
      <div className="flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-[#2563EB]/30 rounded-full blur-2xl animate-pulse" />
          <Logo size="lg" glow={true} />
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-none mb-2.5 uppercase">
          <span className="text-white">FREE</span>
          <span className="text-[#60A5FA]">LAS</span>
        </h1>

        <div className="flex items-center gap-3">
          <span className="w-6 h-[1.5px] bg-[#3B82F6]/60 rounded-full" />
          <span className="text-xs sm:text-sm font-bold tracking-[0.18em] uppercase text-[#94A3B8]">
            AUTÔNOMOS &amp; FREELANCERS
          </span>
          <span className="w-6 h-[1.5px] bg-[#3B82F6]/60 rounded-full" />
        </div>
      </div>

      {/* Subtle Loading Bar */}
      <div className="w-full max-w-xs flex flex-col items-center gap-2.5">
        <div className="w-full h-1.5 bg-[#09111E]/90 rounded-full overflow-hidden p-0.5 border border-[#1E3254]">
          <div
            className="h-full bg-gradient-to-r from-[#2563EB] via-[#3B82F6] to-[#60A5FA] rounded-full transition-all duration-75 ease-out shadow-[0_0_12px_rgba(59,130,246,0.75)]"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-[11px] font-medium text-[#94A3B8] tracking-wide">
          Iniciando plataforma corporativa...
        </p>
      </div>
    </div>
  );
};
