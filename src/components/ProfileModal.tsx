import React, { useRef, useState } from 'react';
import { X, Camera, Trash2, UserCog } from 'lucide-react';

interface ProfileModalProps {
  displayName: string;
  professionalId?: string;
  photo: string;
  onUpdatePhoto: (photoBase64: string) => void;
  onDeletePhoto: () => void;
  onOpenFullProfile?: () => void;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  displayName,
  professionalId,
  photo,
  onUpdatePhoto,
  onDeletePhoto,
  onOpenFullProfile,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Por favor, selecione um arquivo de imagem válido.');
      return;
    }

    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const max = 480;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          onUpdatePhoto(dataUrl);
          setConfirmRemove(false);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const initial = (displayName?.trim()?.[0] || 'F').toUpperCase();
  const hasPhoto = Boolean(photo && photo.trim().length > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm bg-[var(--paper)] border border-[var(--line)] rounded-3xl p-6 sm:p-7 shadow-2xl text-[var(--ink)] text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 p-2 rounded-xl border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--cream)] transition-colors cursor-pointer"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Circular Profile Photo Preview */}
        <div className="relative w-28 h-28 mx-auto mt-2 mb-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-28 h-28 rounded-full overflow-hidden border-4 border-[#2563EB]/30 shadow-lg bg-[#101D32] flex items-center justify-center text-white text-4xl font-extrabold cursor-pointer group"
            title="Clique para alterar a foto"
          >
            {hasPhoto ? (
              <img src={photo} alt={displayName} className="w-full h-full object-cover rounded-full" />
            ) : (
              <span>{initial}</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white flex items-center justify-center shadow-md border-2 border-[var(--paper)] cursor-pointer transition-transform active:scale-95"
            title="Selecionar nova foto"
          >
            <Camera className="w-4 h-4" />
          </button>
        </div>

        <h3 className="text-lg font-extrabold text-[var(--ink)]">{displayName || 'Meu Perfil'}</h3>
        {professionalId && (
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--g)] mt-0.5">
            {professionalId}
          </p>
        )}
        <p className="text-xs text-[var(--muted)] mt-1.5 mb-5">
          Sua foto fica vinculada à sua conta e aparece no cabeçalho do aplicativo.
        </p>

        {errorMsg && (
          <div className="mb-4 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-300 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <div className="space-y-2.5">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[var(--g)] text-white text-xs font-bold hover:bg-[var(--g2)] transition-colors shadow-sm cursor-pointer active:scale-[0.99]"
          >
            <Camera className="w-4 h-4" />
            <span>{hasPhoto ? 'Alterar Foto de Perfil' : 'Adicionar Foto de Perfil'}</span>
          </button>

          {hasPhoto && !confirmRemove && (
            <button
              type="button"
              onClick={() => setConfirmRemove(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Remover Foto</span>
            </button>
          )}

          {hasPhoto && confirmRemove && (
            <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/40 space-y-2">
              <p className="text-xs font-bold text-rose-700 dark:text-rose-300">
                Confirmar remoção da foto de perfil?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onDeletePhoto();
                    setConfirmRemove(false);
                  }}
                  className="flex-1 py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                >
                  Sim, remover
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmRemove(false)}
                  className="flex-1 py-2 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {onOpenFullProfile && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenFullProfile();
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--cream)] text-[var(--ink)] text-xs font-semibold transition-colors cursor-pointer"
            >
              <UserCog className="w-4 h-4 text-[var(--g)]" />
              <span>Editar Dados e Registro Profissional</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl border border-[var(--line)] bg-[var(--cream)] text-xs font-semibold hover:bg-[var(--line)] transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
