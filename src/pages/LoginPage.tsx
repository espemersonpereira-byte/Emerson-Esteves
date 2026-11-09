import React, { useState, useEffect } from 'react';
import {
  LogIn,
  UserPlus,
  Lock,
  User,
  Mail,
  ArrowLeft,
  Eye,
  EyeOff,
  Receipt,
  TrendingUp,
  KeyRound,
  CheckCircle2,
  Sparkles,
  CloudCheck,
  Loader2,
  AlertCircle,
  AlertTriangle,
  ExternalLink,
  HelpCircle,
} from 'lucide-react';
import { AuthState, ThemePreference } from '../types';
import { ThemeToggle } from '../components/ThemeToggle';
import { Logo } from '../components/Logo';
import {
  loginWithEmailAndPassword,
  registerWithEmailAndPassword,
  sendFirebasePasswordReset,
  handleConfirmPasswordReset,
  loginWithGoogle,
  FIREBASE_PROJECT_ID,
  FIREBASE_CONSOLE_AUTH_PROVIDERS_URL,
} from '../utils/firebaseAuth';

interface LoginPageProps {
  existingAuth: AuthState | null;
  onLoginSuccess: (auth: AuthState) => void;
  theme: ThemePreference;
  onThemeChange: (theme: ThemePreference) => void;
  isDark: boolean;
  systemIsDark: boolean;
}

type AuthView = 'welcome' | 'login' | 'register' | 'forgot' | 'resetCode';

export const LoginPage: React.FC<LoginPageProps> = ({
  existingAuth,
  onLoginSuccess,
  theme,
  onThemeChange,
  isDark,
  systemIsDark,
}) => {
  // Check if URL has password reset action code (oobCode)
  const [resetCode] = useState<string | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('mode') === 'resetPassword' && params.get('oobCode')) {
        return params.get('oobCode');
      }
    } catch {}
    return null;
  });

  // Navigation view
  const [view, setView] = useState<AuthView>(() => (resetCode ? 'resetCode' : 'welcome'));

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState(
    existingAuth?.email || existingAuth?.username || ''
  );
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register form state
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Forgot password form state
  const [forgotIdentifier, setForgotIdentifier] = useState(
    existingAuth?.email || ''
  );

  // In-app reset code state
  const [newPasswordCode, setNewPasswordCode] = useState('');
  const [confirmPasswordCode, setConfirmPasswordCode] = useState('');
  const [showResetCodePass, setShowResetCodePass] = useState(false);

  // Feedback and contextual states
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [providerSuggestion, setProviderSuggestion] = useState<'google' | 'password' | null>(null);
  const [emailAlreadyInUse, setEmailAlreadyInUse] = useState(false);
  const [isOperationNotAllowed, setIsOperationNotAllowed] = useState(false);

  // Switch view helper
  const navigateTo = (newView: AuthView) => {
    setError('');
    setSuccess('');
    setProviderSuggestion(null);
    setEmailAlreadyInUse(false);
    setIsOperationNotAllowed(false);
    setView(newView);
  };

  // Submit Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setProviderSuggestion(null);
    setIsOperationNotAllowed(false);

    const cleanId = loginIdentifier.trim();
    if (!cleanId) {
      setError('Por favor, informe seu e-mail cadastrado.');
      return;
    }
    if (!loginPassword) {
      setError('Por favor, digite sua senha de acesso.');
      return;
    }

    let targetEmail = cleanId;
    if (!targetEmail.includes('@')) {
      setError('Por favor, digite o seu endereço de e-mail completo (ex: seu.email@gmail.com).');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await loginWithEmailAndPassword(targetEmail, loginPassword);
      if (res.success && res.authState && res.user) {
        onLoginSuccess({
          username: res.authState.username,
          email: res.authState.email,
          uid: res.user.uid,
        });
      } else {
        setError(res.error || 'E-mail ou senha incorretos. Verifique suas credenciais.');
        if (res.isOperationNotAllowed) {
          setIsOperationNotAllowed(true);
        }
        if (res.providerSuggestion) {
          setProviderSuggestion(res.providerSuggestion);
        }
      }
    } catch {
      setError('Falha de conexão ao autenticar. Verifique sua rede e tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Register
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setEmailAlreadyInUse(false);
    setProviderSuggestion(null);
    setIsOperationNotAllowed(false);

    const u = regUsername.trim();
    const em = regEmail.trim();

    if (u.length < 2) {
      setError('O nome profissional deve conter pelo menos 2 caracteres.');
      return;
    }

    if (!em || !em.includes('@') || !em.includes('.')) {
      setError('Por favor, informe um endereço de e-mail válido (ex: seu.email@gmail.com).');
      return;
    }

    if (regPassword.length < 6) {
      setError('A senha deve conter pelo menos 6 caracteres.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError('A confirmação de senha não confere com a senha digitada.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await registerWithEmailAndPassword(u, em, regPassword);
      if (res.success && res.authState && res.user) {
        onLoginSuccess({
          username: res.authState.username,
          email: res.authState.email,
          uid: res.user.uid,
        });
      } else {
        setError(res.error || 'Não foi possível concluir o cadastro na nuvem.');
        if (res.isOperationNotAllowed) {
          setIsOperationNotAllowed(true);
        }
        if (res.emailAlreadyInUse) {
          setEmailAlreadyInUse(true);
        }
        if (res.providerSuggestion) {
          setProviderSuggestion(res.providerSuggestion);
        }
      }
    } catch {
      setError('Falha ao conectar com o serviço de cadastro. Verifique sua conexão.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Password Reset Request Email
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsOperationNotAllowed(false);

    const cleanEmail = forgotIdentifier.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Por favor, informe o e-mail cadastrado na sua conta.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await sendFirebasePasswordReset(cleanEmail);
      if (res.success) {
        setSuccess(
          'Link de recuperação enviado com sucesso! Verifique sua caixa de entrada e a pasta de spam do e-mail para cadastrar sua nova senha.'
        );
      } else {
        setError(res.error || 'Não foi possível enviar o e-mail de recuperação.');
        if (res.isOperationNotAllowed) {
          setIsOperationNotAllowed(true);
        }
      }
    } catch {
      setError('Falha ao solicitar redefinição. Verifique sua rede.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit In-App Password Reset with action code
  const handleInAppResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetCode) return;
    setError('');
    setSuccess('');

    if (newPasswordCode.length < 6) {
      setError('A nova senha deve conter pelo menos 6 caracteres.');
      return;
    }

    if (newPasswordCode !== confirmPasswordCode) {
      setError('A confirmação não confere com a nova senha digitada.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await handleConfirmPasswordReset(resetCode, newPasswordCode);
      if (res.success) {
        setSuccess('Sua nova senha foi cadastrada com sucesso! Redirecionando para o login...');
        setTimeout(() => {
          navigateTo('login');
        }, 1800);
      } else {
        setError(res.error || 'Não foi possível redefinir a senha.');
      }
    } catch {
      setError('Falha ao redefinir senha com o código fornecido.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Google Login
  const handleGoogleSignIn = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      const res = await loginWithGoogle();
      if (res.success && res.authState && res.user) {
        onLoginSuccess({
          username: res.authState.username,
          email: res.authState.email,
          uid: res.user.uid,
        });
      } else if (res.error) {
        setError(res.error);
      }
    } catch {
      setError('Não foi possível entrar com Google.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderOperationNotAllowedBanner = () => {
    if (!isOperationNotAllowed && !error.includes('turnkey-variety-kf38q') && !error.includes('não está habilitada no projeto')) {
      return null;
    }
    return (
      <div className="p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 text-[var(--ink)] text-xs space-y-3 mb-4 animate-in fade-in">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-amber-900 dark:text-amber-300 text-xs sm:text-sm">
              Habilitação Necessária no Console Firebase
            </h4>
            <p className="text-[11px] text-[var(--muted)] mt-0.5 leading-relaxed">
              O Firebase Authentication do projeto <span className="font-mono font-bold text-[var(--ink)]">{FIREBASE_PROJECT_ID}</span> requer a ativação do provedor nativo <b>E-mail/senha</b> no console para autorizar acessos por senha.
            </p>
          </div>
        </div>

        <ol className="text-[11px] space-y-1.5 pl-5 list-decimal text-[var(--ink)]/90 font-medium">
          <li>Acesse a aba de provedores no Firebase Console através do botão abaixo.</li>
          <li>Clique no provedor <b>E-mail/senha</b> (ou em <i>Adicionar novo provedor</i>).</li>
          <li>Ative a primeira chave de alternância <b>E-mail/senha</b> e clique em <b>Salvar</b>.</li>
        </ol>

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <a
            href={FIREBASE_CONSOLE_AUTH_PROVIDERS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer text-center"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Abrir Provedores no Console Firebase</span>
          </a>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting}
            className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
              <path fill="#ffffff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#ffffff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#ffffff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#ffffff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Entrar com Google (Já Ativo)</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-[100dvh] flex flex-col justify-center px-4 sm:px-6 pt-safe-login pb-safe-login bg-[var(--cream)] transition-colors selection:bg-[var(--sage)]">
      <div className="w-full max-w-md mx-auto my-auto flex flex-col justify-center">
        {/* ============================================================ */}
        {/* CABEÇALHO SUPERIOR OFICIAL FREELAS (LOGO À ESQ. + TEXTOS)   */}
        {/* ============================================================ */}
        <header className="w-full flex items-center justify-between gap-3 pt-2 pb-2 mb-5 sm:mb-6">
          {/* Lado Esquerdo: Logotipo oficial + Nome FREELAS + Subtítulo */}
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="shrink-0 aspect-square flex items-center justify-center">
              <Logo size="sm" glow={false} />
            </div>
            <div className="flex flex-col justify-center min-w-0">
              <span className="font-black text-xl sm:text-2xl tracking-tight leading-none text-[var(--ink)]">
                <span>FREE</span>
                <span className="text-[var(--g)]">LAS</span>
              </span>
              <span className="text-[11px] sm:text-xs font-bold tracking-wider text-[var(--muted)] uppercase mt-1 whitespace-nowrap">
                Autônomos &amp; Freelancers
              </span>
            </div>
          </div>

          {/* Lado Direito: Alternador de tema compacto */}
          <div className="shrink-0">
            <ThemeToggle
              theme={theme}
              onThemeChange={onThemeChange}
              isDark={isDark}
              systemIsDark={systemIsDark}
              compact
            />
          </div>
        </header>

        {/* ============================================================ */}
        {/* ÁREA CENTRAL DO CARTÃO DE APRESENTAÇÃO E AUTENTICAÇÃO        */}
        {/* ============================================================ */}
        <div className="w-full flex flex-col justify-center">
        {/* ============================================================ */}
        {/* VIEW 1: TELA DE BOAS-VINDAS (WELCOME SCREEN)                 */}
        {/* ============================================================ */}
        {view === 'welcome' && (
          <div className="p-5 sm:p-7 rounded-3xl bg-[var(--paper)] border border-[var(--line)] shadow-xl text-[var(--ink)] animate-in fade-in zoom-in-95 duration-200">
            {/* O título é o primeiro elemento dentro do cartão */}
            <div className="mb-5">
              <h1 className="text-lg sm:text-xl font-bold text-[var(--ink)] tracking-tight leading-snug">
                Sua rotina profissional, organizada em um só lugar.
              </h1>
              <p className="text-xs text-[var(--muted)] mt-1.5 leading-relaxed">
                Registre trabalhos, acompanhe seus ganhos e organize sua vida profissional.
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="grid grid-cols-1 gap-2.5 mb-6">
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[var(--cream)] border border-[var(--line)]/60 text-xs">
                <div className="w-7 h-7 rounded-lg bg-[var(--paper)] border border-[var(--line)] flex items-center justify-center text-[var(--g)] shrink-0 shadow-xs">
                  <CloudCheck className="w-4 h-4" />
                </div>
                <div className="text-[11px] leading-tight text-[var(--ink)]">
                  <span className="font-bold">Sincronização em Nuvem:</span> Seus dados ficam salvos de forma permanente por conta.
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[var(--cream)] border border-[var(--line)]/60 text-xs">
                <div className="w-7 h-7 rounded-lg bg-[var(--paper)] border border-[var(--line)] flex items-center justify-center text-[var(--g)] shrink-0 shadow-xs">
                  <Receipt className="w-4 h-4" />
                </div>
                <div className="text-[11px] leading-tight text-[var(--ink)]">
                  <span className="font-bold">Comprovantes & Cupom Fiscal:</span> Emissão instantânea e compatível com PDF e impressão.
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[var(--cream)] border border-[var(--line)]/60 text-xs">
                <div className="w-7 h-7 rounded-lg bg-[var(--paper)] border border-[var(--line)] flex items-center justify-center text-[var(--copper)] shrink-0 shadow-xs">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div className="text-[11px] leading-tight text-[var(--ink)]">
                  <span className="font-bold">Controle Financeiro:</span> Resumo de recebimentos, saldos pendentes e metas.
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => navigateTo('login')}
                className="w-full py-3.5 px-4 rounded-xl bg-[var(--g)] hover:bg-[var(--g2)] text-white text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                <LogIn className="w-4 h-4" />
                <span>Entrar com E-mail e Senha</span>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleGoogleSignIn}
                className="w-full py-3 px-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--cream)] text-[var(--ink)] text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-xs active:scale-[0.99]"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Entrar com Google</span>
              </button>

              <button
                type="button"
                onClick={() => navigateTo('register')}
                className="w-full py-2.5 px-4 rounded-xl border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--cream)] text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Criar nova conta</span>
              </button>
            </div>

            <p className="text-[10px] text-[var(--muted)] text-center mt-5">
              🔒 Autenticação segura e dados individuais vinculados ao usuário.
            </p>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 2: TELA DE LOGIN (ENTRAR)                               */}
        {/* ============================================================ */}
        {view === 'login' && (
          <div className="p-6 sm:p-8 rounded-3xl bg-[var(--paper)] border border-[var(--line)] shadow-xl text-[var(--ink)] animate-in fade-in zoom-in-95 duration-200">
            {/* Back Button */}
            <button
              type="button"
              onClick={() => navigateTo('welcome')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)] mb-4 transition-colors cursor-pointer group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span>Voltar para o início</span>
            </button>

            {/* Header */}
            <div className="mb-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--copper)] block">
                Acessar Conta Existente
              </span>
              <h1 className="text-xl font-bold tracking-tight text-[var(--ink)] mt-0.5">
                Entrar no Freelas
              </h1>
            </div>

            <p className="text-xs text-[var(--muted)] mb-5">
              Informe seu e-mail e senha para acessar sua conta protegida na nuvem.
            </p>

            {/* Operation Not Allowed Diagnostic & Direct Activation Guide */}
            {renderOperationNotAllowedBanner()}

            {/* Error banner with contextual resolution */}
            {error && !isOperationNotAllowed && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs font-medium mb-4 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                  <span className="leading-relaxed">{error}</span>
                </div>

                {providerSuggestion === 'google' && (
                  <div className="pt-2 border-t border-rose-200/60 dark:border-rose-900/60 space-y-2">
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={isSubmitting}
                      className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-[0.99]"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#ffffff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#ffffff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#ffffff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#ffffff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      <span>Entrar com Google Agora</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setForgotIdentifier(loginIdentifier);
                        navigateTo('forgot');
                      }}
                      className="w-full text-center text-[11px] text-[var(--copper)] hover:underline font-semibold block cursor-pointer"
                    >
                      Deseja cadastrar uma senha para este e-mail? Clique aqui
                    </button>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                  E-mail cadastrado *
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    autoFocus
                    autoComplete="email"
                    placeholder="ex: seu.email@exemplo.com"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] placeholder:text-[var(--muted)]/60 focus:outline-hidden focus:border-[var(--copper)] focus:ring-1 focus:ring-[var(--copper)] text-xs transition-colors"
                  />
                  <Mail className="w-4 h-4 text-[var(--muted)] absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-[var(--ink)]">
                    Senha de acesso *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotIdentifier(loginIdentifier);
                      navigateTo('forgot');
                    }}
                    className="text-[11px] text-[var(--copper)] hover:underline font-semibold cursor-pointer"
                  >
                    Esqueci minha senha
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    placeholder="Sua senha de acesso"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] placeholder:text-[var(--muted)]/60 focus:outline-hidden focus:border-[var(--copper)] focus:ring-1 focus:ring-[var(--copper)] text-xs transition-colors"
                  />
                  <Lock className="w-4 h-4 text-[var(--muted)] absolute left-3 top-3 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-2.5 text-[var(--muted)] hover:text-[var(--ink)] transition-colors p-0.5 cursor-pointer"
                    aria-label="Alternar visibilidade da senha"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-[var(--g)] hover:bg-[var(--g2)] text-white text-xs sm:text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Conectando...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Entrar</span>
                  </>
                )}
              </button>
            </form>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--line)]" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
                <span className="bg-[var(--paper)] px-2 text-[var(--muted)]">ou</span>
              </div>
            </div>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleGoogleSignIn}
              className="w-full py-2.5 px-4 rounded-xl border border-[var(--line)] hover:bg-[var(--cream)] text-[var(--ink)] text-xs font-semibold transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-2xs disabled:opacity-60"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continuar com Google</span>
            </button>

            <div className="mt-6 pt-5 border-t border-[var(--line)] text-center text-xs text-[var(--muted)]">
              <span>Ainda não tem uma conta? </span>
              <button
                type="button"
                onClick={() => navigateTo('register')}
                className="font-bold text-[var(--g)] hover:underline cursor-pointer"
              >
                Cadastre-se
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 3: TELA DE CADASTRO (CRIAR NOVA CONTA)                 */}
        {/* ============================================================ */}
        {view === 'register' && (
          <div className="p-6 sm:p-8 rounded-3xl bg-[var(--paper)] border border-[var(--line)] shadow-xl text-[var(--ink)] animate-in fade-in zoom-in-95 duration-200">
            {/* Back Button */}
            <button
              type="button"
              onClick={() => navigateTo('welcome')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)] mb-4 transition-colors cursor-pointer group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span>Voltar para o início</span>
            </button>

            {/* Header */}
            <div className="mb-2">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--copper)] block">
                Novo Cadastro na Nuvem
              </span>
              <h1 className="text-xl font-bold tracking-tight text-[var(--ink)] mt-0.5">
                Criar Conta no Freelas
              </h1>
            </div>

            <p className="text-xs text-[var(--muted)] mb-5">
              Crie seu acesso permanente para sincronizar seus trabalhos e recibos com segurança.
            </p>

            {/* Operation Not Allowed Diagnostic & Direct Activation Guide */}
            {renderOperationNotAllowedBanner()}

            {/* Error banner with direct action buttons if email is already registered */}
            {error && !isOperationNotAllowed && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs font-medium mb-4 space-y-2.5">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                  <span className="leading-relaxed">{error}</span>
                </div>

                {emailAlreadyInUse && (
                  <div className="pt-2 border-t border-rose-200/60 dark:border-rose-900/60 space-y-2">
                    <p className="text-[11px] text-[var(--muted)] font-normal">
                      Escolha como deseja acessar sua conta existente:
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setLoginIdentifier(regEmail);
                          navigateTo('login');
                        }}
                        className="flex-1 py-2 px-3 rounded-xl bg-[var(--g)] hover:bg-[var(--g2)] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-[0.99]"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Entrar na Conta</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        disabled={isSubmitting}
                        className="flex-1 py-2 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-semibold text-xs flex items-center justify-center gap-1.5 hover:bg-[var(--cream)] cursor-pointer shadow-2xs active:scale-[0.99]"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                        <span>Com Google</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                  Nome Completo ou Profissional *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    minLength={2}
                    autoFocus
                    autoComplete="name"
                    placeholder="ex: Seu Nome Profissional"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] placeholder:text-[var(--muted)]/60 focus:outline-hidden focus:border-[var(--copper)] focus:ring-1 focus:ring-[var(--copper)] text-xs transition-colors"
                  />
                  <User className="w-4 h-4 text-[var(--muted)] absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                  E-mail de Acesso *
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="seu.email@exemplo.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] placeholder:text-[var(--muted)]/60 focus:outline-hidden focus:border-[var(--copper)] focus:ring-1 focus:ring-[var(--copper)] text-xs transition-colors"
                  />
                  <Mail className="w-4 h-4 text-[var(--muted)] absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                  Senha de Acesso (mínimo 6 caracteres) *
                </label>
                <div className="relative">
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] placeholder:text-[var(--muted)]/60 focus:outline-hidden focus:border-[var(--copper)] focus:ring-1 focus:ring-[var(--copper)] text-xs transition-colors"
                  />
                  <Lock className="w-4 h-4 text-[var(--muted)] absolute left-3 top-3 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-3 top-2.5 text-[var(--muted)] hover:text-[var(--ink)] transition-colors p-0.5 cursor-pointer"
                    aria-label="Alternar visibilidade da senha"
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                  Confirme a Senha *
                </label>
                <div className="relative">
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Repita sua nova senha"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] placeholder:text-[var(--muted)]/60 focus:outline-hidden focus:border-[var(--copper)] focus:ring-1 focus:ring-[var(--copper)] text-xs transition-colors"
                  />
                  <Lock className="w-4 h-4 text-[var(--muted)] absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-3 py-3 px-4 rounded-xl bg-[var(--g)] hover:bg-[var(--g2)] text-white text-xs sm:text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Criando sua conta na nuvem...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Criar conta e sincronizar</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-[var(--line)] text-center text-xs text-[var(--muted)]">
              <span>Já tem uma conta cadastrada? </span>
              <button
                type="button"
                onClick={() => navigateTo('login')}
                className="font-bold text-[var(--g)] hover:underline cursor-pointer"
              >
                Entrar
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 4: RECUPERAR SENHA (ESQUECI MINHA SENHA)               */}
        {/* ============================================================ */}
        {view === 'forgot' && (
          <div className="p-6 sm:p-8 rounded-3xl bg-[var(--paper)] border border-[var(--line)] shadow-xl text-[var(--ink)] animate-in fade-in zoom-in-95 duration-200">
            {/* Back Button */}
            <button
              type="button"
              onClick={() => navigateTo('login')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)] hover:text-[var(--ink)] mb-4 transition-colors cursor-pointer group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span>Voltar para o login</span>
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-[var(--copper)] text-white flex items-center justify-center font-bold shadow-sm ring-2 ring-[var(--copper)]/30 shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--copper)] block">
                  Recuperação de Acesso
                </span>
                <h1 className="text-xl font-bold tracking-tight text-[var(--ink)] font-serif">
                  Redefinir Senha
                </h1>
              </div>
            </div>

            <p className="text-xs text-[var(--muted)] mb-5">
              Digite seu e-mail cadastrado. Enviaremos um link oficial de redefinição para você criar ou alterar sua senha com segurança.
            </p>

            {/* Success message */}
            {success && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs font-semibold mb-4 flex items-start gap-2 leading-relaxed">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            {/* Operation Not Allowed Diagnostic & Direct Activation Guide */}
            {renderOperationNotAllowedBanner()}

            {/* Error message */}
            {error && !isOperationNotAllowed && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold mb-4 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleResetSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                  Seu E-mail Cadastrado *
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    autoFocus
                    autoComplete="email"
                    placeholder="ex: seu.email@exemplo.com"
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] placeholder:text-[var(--muted)]/60 focus:outline-hidden focus:border-[var(--copper)] focus:ring-1 focus:ring-[var(--copper)] text-xs transition-colors"
                  />
                  <Mail className="w-4 h-4 text-[var(--muted)] absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-3 py-3 px-4 rounded-xl bg-[var(--copper)] hover:opacity-90 text-white text-xs sm:text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enviando link por e-mail...</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    <span>Enviar link de redefinição por e-mail</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-[var(--line)] text-center text-xs text-[var(--muted)] flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => navigateTo('login')}
                className="font-bold text-[var(--g)] hover:underline cursor-pointer"
              >
                Voltar para o login
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => navigateTo('welcome')}
                className="text-[var(--muted)] hover:underline cursor-pointer"
              >
                Tela inicial
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 5: REDEFINIÇÃO DE SENHA DIRETA VIA LINK (OOB_CODE)       */}
        {/* ============================================================ */}
        {view === 'resetCode' && (
          <div className="p-6 sm:p-8 rounded-3xl bg-[var(--paper)] border border-[var(--line)] shadow-xl text-[var(--ink)] animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-[var(--g)] text-white flex items-center justify-center font-bold shadow-sm ring-2 ring-[var(--sage)]/40 shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--copper)] block">
                  Link de Recuperação Verificado
                </span>
                <h1 className="text-xl font-bold tracking-tight text-[var(--ink)] font-serif">
                  Cadastrar Nova Senha
                </h1>
              </div>
            </div>

            <p className="text-xs text-[var(--muted)] mb-5">
              Digite e confirme sua nova senha de acesso para o FREELAS.
            </p>

            {/* Success message */}
            {success && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs font-semibold mb-4 flex items-start gap-2 leading-relaxed">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold mb-4 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleInAppResetSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                  Nova Senha (mínimo 6 caracteres) *
                </label>
                <div className="relative">
                  <input
                    type={showResetCodePass ? 'text' : 'password'}
                    required
                    minLength={6}
                    autoFocus
                    placeholder="Digite sua nova senha"
                    value={newPasswordCode}
                    onChange={(e) => setNewPasswordCode(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] placeholder:text-[var(--muted)]/60 focus:outline-hidden focus:border-[var(--copper)] focus:ring-1 focus:ring-[var(--copper)] text-xs transition-colors"
                  />
                  <Lock className="w-4 h-4 text-[var(--muted)] absolute left-3 top-3 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowResetCodePass(!showResetCodePass)}
                    className="absolute right-3 top-2.5 text-[var(--muted)] hover:text-[var(--ink)] transition-colors p-0.5 cursor-pointer"
                  >
                    {showResetCodePass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--ink)] mb-1">
                  Confirme a Nova Senha *
                </label>
                <div className="relative">
                  <input
                    type={showResetCodePass ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Repita sua nova senha"
                    value={confirmPasswordCode}
                    onChange={(e) => setConfirmPasswordCode(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] placeholder:text-[var(--muted)]/60 focus:outline-hidden focus:border-[var(--copper)] focus:ring-1 focus:ring-[var(--copper)] text-xs transition-colors"
                  />
                  <Lock className="w-4 h-4 text-[var(--muted)] absolute left-3 top-3 pointer-events-none" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-3 py-3 px-4 rounded-xl bg-[var(--g)] hover:bg-[var(--g2)] text-white text-xs sm:text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Salvando nova senha...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Confirmar e Salvar Nova Senha</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-[var(--line)] text-center text-xs text-[var(--muted)]">
              <button
                type="button"
                onClick={() => navigateTo('login')}
                className="font-bold text-[var(--g)] hover:underline cursor-pointer"
              >
                Ir para a tela de login
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};
