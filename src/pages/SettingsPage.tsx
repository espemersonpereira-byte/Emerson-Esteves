import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Moon,
  Sun,
  Monitor,
  KeyRound,
  Trash2,
  UserCheck,
  CloudCheck,
  RefreshCw,
  LogOut,
  ShieldCheck,
  Mail,
  Bell,
  Lock,
  ExternalLink,
} from 'lucide-react';
import { Database, Prefs, ThemePreference, PageId } from '../types';
import { BackupRestoreSection } from '../components/BackupRestoreSection';
import { auth as firebaseAuth } from '../firebase';
import {
  linkPasswordToCurrentUser,
  sendFirebasePasswordReset,
  FIREBASE_PROJECT_ID,
  FIREBASE_CONSOLE_AUTH_PROVIDERS_URL,
} from '../utils/firebaseAuth';

interface SettingsPageProps {
  db: Database;
  username: string;
  userEmail?: string;
  themePreference: ThemePreference;
  onThemeChange: (theme: ThemePreference) => void;
  isDark: boolean;
  systemIsDark: boolean;
  onSavePrefs: (prefs: Prefs) => void;
  onChangePassword: (oldPass: string, newPass: string) => boolean;
  onRestoreBackup: (newDb: Database) => void;
  onClearAllData: () => void;
  onShowToast: (msg: string) => void;
  onManualSync?: () => void;
  onLogout?: () => void;
  onNavigate?: (page: PageId) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  db,
  username,
  userEmail,
  themePreference,
  onThemeChange,
  systemIsDark,
  onSavePrefs,
  onChangePassword,
  onRestoreBackup,
  onClearAllData,
  onShowToast,
  onManualSync,
  onLogout,
  onNavigate,
}) => {
  // Password state
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passError, setPassError] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const notificationsEnabled = db.prefs.notificationsEnabled !== false;

  const handleToggleNotifications = () => {
    const next = !notificationsEnabled;
    onSavePrefs({
      ...db.prefs,
      notificationsEnabled: next,
    });
    onShowToast(next ? 'Alertas e notificações ativados.' : 'Notificações silenciadas.');
  };

  const user = firebaseAuth.currentUser;
  const hasPasswordProvider = Boolean(
    user?.providerData.some((p) => p.providerId === 'password')
  );
  const hasGoogleProvider = Boolean(
    user?.providerData.some((p) => p.providerId === 'google.com')
  );

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');

    if (newPass.length < 6) {
      setPassError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (newPass !== confirmPass) {
      setPassError('A confirmação não confere com a nova senha digitada.');
      return;
    }

    setIsChangingPass(true);
    try {
      if (firebaseAuth.currentUser) {
        const res = await linkPasswordToCurrentUser(newPass);
        if (res.success) {
          const msg = hasPasswordProvider
            ? 'Senha atualizada no Firebase com sucesso!'
            : 'Senha vinculada com sucesso! Agora você pode entrar com Google ou com e-mail e senha.';
          onShowToast(msg);
          setNewPass('');
          setConfirmPass('');
        } else {
          setPassError(res.error || 'Não foi possível alterar a senha.');
        }
      } else {
        onChangePassword('', newPass);
        onShowToast('Senha alterada com sucesso!');
      }
    } catch {
      setPassError('Não foi possível alterar a senha. Tente novamente mais tarde.');
    } finally {
      setIsChangingPass(false);
    }
  };

  const [isSendingReset, setIsSendingReset] = useState(false);

  const handleSendResetEmail = async () => {
    const targetEmail = user?.email || userEmail;
    if (!targetEmail) {
      onShowToast('Nenhum e-mail vinculado a esta conta.');
      return;
    }
    setIsSendingReset(true);
    setPassError('');
    try {
      const res = await sendFirebasePasswordReset(targetEmail);
      if (res.success) {
        onShowToast(`Link de redefinição enviado com sucesso para ${targetEmail}!`);
      } else {
        setPassError(res.error || 'Não foi possível enviar o e-mail de redefinição.');
      }
    } catch {
      setPassError('Falha ao enviar e-mail de redefinição. Tente novamente mais tarde.');
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleTriggerSync = async () => {
    if (!onManualSync) return;
    setIsSyncing(true);
    try {
      await onManualSync();
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <span className="text-[11px] uppercase font-bold tracking-widest text-[var(--g)]">
            Sistema & Segurança
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--ink)] mt-0.5 flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-[var(--g)]" />
            <span>Configurações</span>
          </h2>
          <p className="text-xs text-[var(--muted)]">
            Aparência, sincronização em nuvem, notificações, backup e privacidade.
          </p>
        </div>

        {onNavigate && (
          <button
            type="button"
            onClick={() => onNavigate('profile')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[var(--paper)] border border-[var(--line)] hover:border-[var(--g)] text-xs font-bold text-[var(--ink)] transition-colors cursor-pointer shadow-xs"
          >
            <UserCheck className="w-4 h-4 text-[var(--g)]" />
            <span>Editar Perfil Profissional</span>
            <ExternalLink className="w-3.5 h-3.5 text-[var(--muted)]" />
          </button>
        )}
      </div>

      {/* Cloud Account & Synchronization Status */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CloudCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-600 dark:text-emerald-400 block">
                Nuvem Ativa & Conectada
              </span>
              <h3 className="text-sm font-bold text-[var(--ink)]">
                Firebase Cloud Firestore
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onManualSync && (
              <button
                type="button"
                onClick={handleTriggerSync}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--cream)] hover:bg-[var(--line)] text-[var(--ink)] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[var(--g)]' : ''}`} />
                <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar agora'}</span>
              </button>
            )}

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-xs font-semibold transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Encerrar Sessão</span>
              </button>
            )}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[var(--cream)] border border-[var(--line)] text-xs space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[var(--muted)] flex items-center gap-1">
              <Mail className="w-3.5 h-3.5" /> Conta autenticada:
            </span>
            <span className="font-mono font-bold text-[var(--ink)]">
              {userEmail || username || 'E-mail conectado'}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[var(--muted)] flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Isolamento de segurança:
            </span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              Dados protegidos por UID exclusivo
            </span>
          </div>
        </div>

        <p className="text-[11px] text-[var(--muted)] leading-relaxed">
          Seus trabalhos, clientes, agenda, orçamentos, recibos e lançamentos financeiros são sincronizados automaticamente com o Firebase Cloud Firestore.
        </p>
      </div>

      {/* Theme Settings */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-[var(--ink)]">Tema do Sistema</h3>
        <p className="text-xs text-[var(--muted)]">
          Escolha entre Modo Claro corporativo, Modo Escuro em azul-marinho profundo ou sincronização automática com seu dispositivo.
        </p>

        <div className="grid grid-cols-3 gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => onThemeChange('auto')}
            className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
              themePreference === 'auto'
                ? 'border-[var(--g)] bg-[var(--sage)] text-[var(--g)] ring-2 ring-[var(--g)]/20'
                : 'border-[var(--line)] bg-[var(--cream)] text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            <Monitor className="w-5 h-5" />
            <span>Automático</span>
            <span className="text-[9px] font-normal opacity-75">
              ({systemIsDark ? 'Escuro' : 'Claro'})
            </span>
          </button>

          <button
            type="button"
            onClick={() => onThemeChange('light')}
            className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
              themePreference === 'light'
                ? 'border-[var(--g)] bg-[var(--sage)] text-[var(--g)] ring-2 ring-[var(--g)]/20'
                : 'border-[var(--line)] bg-[var(--cream)] text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            <Sun className="w-5 h-5" />
            <span>Modo Claro</span>
          </button>

          <button
            type="button"
            onClick={() => onThemeChange('dark')}
            className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
              themePreference === 'dark'
                ? 'border-[var(--g)] bg-[var(--sage)] text-[var(--g)] ring-2 ring-[var(--g)]/20'
                : 'border-[var(--line)] bg-[var(--cream)] text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            <Moon className="w-5 h-5" />
            <span>Modo Escuro</span>
          </button>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--sage)] text-[var(--g)] flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--ink)]">Alertas e Lembretes Inteligentes</h3>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              Exibir avisos de compromissos do dia, pagamentos atrasados, orçamentos prestes a vencer e progresso da meta.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleNotifications}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors shrink-0 cursor-pointer ${
            notificationsEnabled
              ? 'bg-[var(--g)] text-white'
              : 'bg-[var(--cream)] border border-[var(--line)] text-[var(--muted)]'
          }`}
        >
          {notificationsEnabled ? 'Ativado' : 'Desativado'}
        </button>
      </div>

      {/* Password Management / Account Linking */}
      <form
        onSubmit={handlePasswordSubmit}
        className="p-5 sm:p-6 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-xs space-y-4"
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-bold text-[var(--ink)] flex items-center gap-1.5">
            <KeyRound className="w-4 h-4 text-[var(--g)]" />
            {hasPasswordProvider ? 'Alterar Senha de Acesso' : 'Vincular Senha à Conta'}
          </h3>

          <div className="flex items-center gap-2 text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-[var(--cream)] border border-[var(--line)] text-[var(--muted)]">
            {hasGoogleProvider && (
              <span className="text-blue-600 dark:text-blue-400">● Google Conectado</span>
            )}
            {hasPasswordProvider && (
              <span className="text-emerald-600 dark:text-emerald-400">● Senha Ativa</span>
            )}
          </div>
        </div>

        <p className="text-xs text-[var(--muted)] leading-relaxed">
          {hasPasswordProvider
            ? 'Sua conta já possui login com e-mail e senha ativado. Digite uma nova senha abaixo caso deseje atualizá-la.'
            : 'Sua conta foi conectada com o Google. Crie uma senha abaixo para poder entrar também digitando seu e-mail e senha em qualquer dispositivo.'}
        </p>

        {passError && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold space-y-2">
            <div>{passError}</div>
            {(passError.includes('turnkey-variety-kf38q') ||
              passError.includes('não está habilitada')) && (
              <a
                href={FIREBASE_CONSOLE_AUTH_PROVIDERS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shadow-xs cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Ativar E-mail/Senha no Console Firebase ({FIREBASE_PROJECT_ID})</span>
              </a>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
              {hasPasswordProvider ? 'Nova senha (mínimo 6 caracteres)' : 'Criar senha (mínimo 6 caracteres)'}
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
              placeholder="Digite a nova senha"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
              Confirme a senha
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
              placeholder="Repita a senha"
            />
          </div>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-[var(--line)]">
          <button
            type="button"
            onClick={handleSendResetEmail}
            disabled={isSendingReset}
            className="text-xs font-semibold text-[var(--copper)] hover:underline flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>{isSendingReset ? 'Enviando link...' : 'Enviar e-mail para redefinir senha'}</span>
          </button>

          <button
            type="submit"
            disabled={isChangingPass}
            className="px-5 py-2.5 rounded-xl bg-[var(--g)] hover:bg-[var(--g2)] text-xs font-bold text-white transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            {isChangingPass
              ? 'Processando...'
              : hasPasswordProvider
              ? 'Atualizar Senha'
              : 'Vincular Senha'}
          </button>
        </div>
      </form>

      {/* Backup and Restore */}
      <BackupRestoreSection
        db={db}
        onRestoreBackup={onRestoreBackup}
        onShowToast={onShowToast}
      />

      {/* LGPD & Privacy Information */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-xs space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-[var(--ink)]">
          <Lock className="w-4 h-4 text-[var(--g)]" />
          <span>Privacidade, Segurança e Conformidade (LGPD)</span>
        </div>
        <p className="text-[11px] text-[var(--muted)] leading-relaxed">
          O <b>FREELAS — Autônomos & Freelancers</b> armazena seus dados exclusivamente vinculados ao seu identificador único de autenticação (UID) no Google Cloud Firestore, com regras estritas de isolamento por proprietário. Nenhuma informação comercial, financeira ou de clientes é compartilhada com terceiros. Você possui controle integral para exportar, auditar ou remover seus registros a qualquer momento.
        </p>
      </div>

      {/* Danger Zone */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[var(--paper)] border border-rose-200 dark:border-rose-950/60 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
          <Trash2 className="w-4 h-4" />
          Limpeza Local do Dispositivo
        </h3>
        <p className="text-[11px] text-[var(--muted)]">
          Limpa os dados armazenados em cache neste aparelho. Recomendamos exportar um arquivo de backup antes de executar esta ação.
        </p>

        <button
          type="button"
          onClick={() => {
            if (
              window.confirm('Tem certeza de que deseja apagar os registros locais deste dispositivo?') &&
              window.confirm('Confirmação final: Deseja prosseguir com a limpeza local?')
            ) {
              onClearAllData();
            }
          }}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs font-bold hover:bg-rose-100 transition-colors cursor-pointer"
        >
          Apagar registros locais deste dispositivo
        </button>
      </div>
    </div>
  );
};
