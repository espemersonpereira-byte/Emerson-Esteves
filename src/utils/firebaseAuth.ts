import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  EmailAuthProvider,
  linkWithCredential,
  updatePassword,
  fetchSignInMethodsForEmail,
  confirmPasswordReset,
  verifyPasswordResetCode,
  User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { AuthState, Database } from '../types';
import { getDefaultDatabase, saveDatabase } from '../utils';

export const FIREBASE_PROJECT_ID = 'turnkey-variety-kf38q';
export const FIREBASE_CONSOLE_AUTH_PROVIDERS_URL = `https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/authentication/providers`;

export interface FirebaseAuthResult {
  success: boolean;
  error?: string;
  errorCode?: string;
  isOperationNotAllowed?: boolean;
  user?: User;
  authState?: AuthState;
  providerSuggestion?: 'google' | 'password';
  emailAlreadyInUse?: boolean;
}

/**
 * Translates Firebase Auth error codes into human-friendly Portuguese messages.
 */
export function getFriendlyAuthErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'auth/user-not-found':
      return 'Não encontramos nenhuma conta com este e-mail. Verifique o endereço digitado ou crie uma conta.';
    case 'auth/wrong-password':
      return 'Senha incorreta. Verifique a digitação ou use a opção "Esqueci minha senha" para redefini-la.';
    case 'auth/invalid-credential':
      return 'E-mail ou senha incorretos. Verifique os dados digitados ou utilize a opção "Esqueci minha senha".';
    case 'auth/invalid-email':
      return 'O formato do e-mail informado é inválido. Digite um e-mail válido (ex: seu.nome@gmail.com).';
    case 'auth/email-already-in-use':
      return 'Este e-mail já está cadastrado em outra conta. Acesse a opção "Entrar" para acessar sua conta existente.';
    case 'auth/weak-password':
      return 'A senha é muito fraca. Digite pelo menos 6 caracteres.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas sem sucesso seguidas. Por segurança, aguarde alguns instantes antes de tentar novamente.';
    case 'auth/network-request-failed':
      return 'Falha na conexão com a internet. Verifique sua rede e tente novamente.';
    case 'auth/user-disabled':
      return 'Esta conta foi desativada pelo administrador.';
    case 'auth/operation-not-allowed':
      return 'Autenticação por e-mail e senha não está habilitada no Console do Firebase do projeto turnkey-variety-kf38q.';
    case 'auth/popup-closed-by-user':
      return 'A janela do Google foi fechada antes da conclusão do login.';
    case 'auth/popup-blocked':
      return 'O navegador bloqueou o pop-up do Google. Por favor, permita pop-ups para este site.';
    case 'auth/account-exists-with-different-credential':
      return 'Já existe uma conta cadastrada com este e-mail através de outro método de login. Acesse usando o método original (ex: Google).';
    case 'auth/requires-recent-login':
      return 'Por motivos de segurança, saia e entre novamente na sua conta antes de alterar a senha.';
    default:
      return 'Ocorreu um erro ao processar sua autenticação. Verifique os dados e tente novamente.';
  }
}

/**
 * Authenticates user via Firebase Authentication with email & password.
 * Differentiates accounts created with Google and provides clear guidance.
 */
export async function loginWithEmailAndPassword(
  email: string,
  pass: string
): Promise<FirebaseAuthResult> {
  const cleanEmail = email.trim();
  if (!cleanEmail) {
    return { success: false, error: 'Por favor, informe seu e-mail cadastrado.' };
  }
  if (!pass) {
    return { success: false, error: 'Por favor, digite sua senha de acesso.' };
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
    const u = cred.user;

    const authState: AuthState = {
      username: u.displayName || u.email?.split('@')[0] || 'Usuário',
      email: u.email || cleanEmail,
      uid: u.uid,
    };

    return {
      success: true,
      user: u,
      authState,
    };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';

    // Check if user account was created via Google
    let providerSuggestion: 'google' | undefined;
    try {
      const methods = await fetchSignInMethodsForEmail(auth, cleanEmail);
      if (methods.includes('google.com') && !methods.includes('password')) {
        providerSuggestion = 'google';
      }
    } catch {
      // Email enumeration protection may return an empty list or error; proceed
    }

    if (providerSuggestion === 'google') {
      return {
        success: false,
        error:
          'Esta conta foi criada através do Google. Clique no botão "Continuar com Google" abaixo para entrar com 1 clique, ou solicite a redefinição de senha para criar uma senha de acesso.',
        providerSuggestion: 'google',
      };
    }

    const message = getFriendlyAuthErrorMessage(code);
    return {
      success: false,
      error: message,
      errorCode: code,
      isOperationNotAllowed: code === 'auth/operation-not-allowed',
    };
  }
}

/**
 * Registers a new user with Firebase Authentication and initializes their Firestore profile.
 * Prevents account duplication and provides direct login navigation if already registered.
 */
export async function registerWithEmailAndPassword(
  displayName: string,
  email: string,
  pass: string,
  initialDb?: Partial<Database>
): Promise<FirebaseAuthResult> {
  const cleanName = displayName.trim();
  const cleanEmail = email.trim();

  if (cleanName.length < 2) {
    return { success: false, error: 'O nome profissional deve conter pelo menos 2 caracteres.' };
  }
  if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
    return { success: false, error: 'Por favor, informe um endereço de e-mail válido.' };
  }
  if (pass.length < 6) {
    return { success: false, error: 'A senha de acesso deve conter no mínimo 6 caracteres.' };
  }

  try {
    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
    const u = cred.user;

    // Set display name in Firebase Auth
    try {
      await updateProfile(u, { displayName: cleanName });
    } catch (e) {
      console.warn('Could not update Auth displayName:', e);
    }

    // Force token refresh so Firestore rules evaluate request.auth with UID
    try {
      await u.getIdToken(true);
    } catch {}

    // Initialize clean local database cache immediately for the new user
    const fallbackDb = getDefaultDatabase();
    const prefs = initialDb?.prefs || fallbackDb.prefs;
    const initialUserDb: Database = {
      jobs: [],
      clients: [],
      appointments: [],
      prefs: {
        ...prefs,
        displayName: cleanName,
      },
    };
    saveDatabase(initialUserDb, u.uid);

    // Initialize user profile in Firestore
    const userDocRef = doc(db, 'users', u.uid);
    try {
      await setDoc(userDocRef, {
        uid: u.uid,
        email: cleanEmail,
        displayName: cleanName,
        username: cleanName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        prefs: initialUserDb.prefs,
      }, { merge: true });
    } catch (fsErr) {
      console.warn('Initial Firestore profile write warning (will sync automatically):', fsErr);
    }

    const authState: AuthState = {
      username: cleanName,
      email: cleanEmail,
      uid: u.uid,
    };

    return {
      success: true,
      user: u,
      authState,
    };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';

    if (code === 'auth/email-already-in-use') {
      let isGoogle = false;
      try {
        const methods = await fetchSignInMethodsForEmail(auth, cleanEmail);
        isGoogle = methods.includes('google.com');
      } catch {}

      return {
        success: false,
        error: isGoogle
          ? 'Este e-mail já possui uma conta criada através do Google. Por favor, utilize o botão "Continuar com Google" ou acesse "Entrar".'
          : 'Este e-mail já está cadastrado no FREELAS. Por favor, acesse a opção "Entrar" para acessar sua conta ou redefina sua senha.',
        emailAlreadyInUse: true,
        providerSuggestion: isGoogle ? 'google' : 'password',
      };
    }

    const message = getFriendlyAuthErrorMessage(code);
    return {
      success: false,
      error: message,
      errorCode: code,
      isOperationNotAllowed: code === 'auth/operation-not-allowed',
    };
  }
}

/**
 * Sends a password reset email via Firebase Authentication.
 */
export async function sendFirebasePasswordReset(
  email: string
): Promise<{ success: boolean; error?: string; errorCode?: string; isOperationNotAllowed?: boolean }> {
  const cleanEmail = email.trim();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'Por favor, informe um e-mail válido para redefinir a senha.' };
  }

  try {
    await sendPasswordResetEmail(auth, cleanEmail);
    return { success: true };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    const message = getFriendlyAuthErrorMessage(code);
    return {
      success: false,
      error: message,
      errorCode: code,
      isOperationNotAllowed: code === 'auth/operation-not-allowed',
    };
  }
}

/**
 * Confirms in-app password reset if the user received an oobCode action link.
 */
export async function handleConfirmPasswordReset(
  oobCode: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (newPassword.length < 6) {
    return { success: false, error: 'A nova senha deve ter no mínimo 6 caracteres.' };
  }

  try {
    await confirmPasswordReset(auth, oobCode, newPassword);
    return { success: true };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    if (code === 'auth/invalid-action-code' || code === 'auth/expired-action-code') {
      return {
        success: false,
        error: 'O link de redefinição expirou ou já foi utilizado. Solicite um novo link.',
      };
    }
    return { success: false, error: getFriendlyAuthErrorMessage(code) };
  }
}

/**
 * Verifies if a reset action code is valid and returns the associated email.
 */
export async function verifyResetCode(
  oobCode: string
): Promise<{ success: boolean; email?: string; error?: string }> {
  try {
    const email = await verifyPasswordResetCode(auth, oobCode);
    return { success: true, email };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    return {
      success: false,
      error:
        code === 'auth/invalid-action-code' || code === 'auth/expired-action-code'
          ? 'O link de redefinição expirou ou é inválido. Solicite um novo link.'
          : getFriendlyAuthErrorMessage(code),
    };
  }
}

/**
 * Links a password credential to the currently logged in user (e.g. user created via Google).
 * This establishes dual-provider access (Google + Password) on the EXACT same UID!
 */
export async function linkPasswordToCurrentUser(
  newPassword: string
): Promise<{ success: boolean; error?: string; errorCode?: string; isOperationNotAllowed?: boolean }> {
  const user = auth.currentUser;
  if (!user || !user.email) {
    return { success: false, error: 'Nenhum usuário conectado para vincular senha.' };
  }
  if (newPassword.length < 6) {
    return { success: false, error: 'A nova senha deve conter ao menos 6 caracteres.' };
  }

  try {
    const hasPassword = user.providerData.some((p) => p.providerId === 'password');
    if (hasPassword) {
      await updatePassword(user, newPassword);
      return { success: true };
    } else {
      const credential = EmailAuthProvider.credential(user.email, newPassword);
      await linkWithCredential(user, credential);
      return { success: true };
    }
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    if (code === 'auth/requires-recent-login') {
      return {
        success: false,
        error: 'Por segurança, saia e entre novamente na conta antes de vincular uma nova senha.',
        errorCode: code,
      };
    }
    if (code === 'auth/credential-already-in-use') {
      return {
        success: false,
        error: 'Esta credencial já está associada a outra conta de usuário.',
        errorCode: code,
      };
    }
    return {
      success: false,
      error: getFriendlyAuthErrorMessage(code),
      errorCode: code,
      isOperationNotAllowed: code === 'auth/operation-not-allowed',
    };
  }
}

/**
 * Returns the authentication providers linked to the currently logged in user.
 */
export function getCurrentUserProviders(): {
  isGoogle: boolean;
  hasPassword: boolean;
  email: string | null;
  uid: string | null;
} {
  const u = auth.currentUser;
  if (!u) {
    return { isGoogle: false, hasPassword: false, email: null, uid: null };
  }
  const isGoogle = u.providerData.some((p) => p.providerId === 'google.com');
  const hasPassword = u.providerData.some((p) => p.providerId === 'password');
  return {
    isGoogle,
    hasPassword,
    email: u.email,
    uid: u.uid,
  };
}

/**
 * Signs in with Google Popup.
 * Preserves the exact same Firestore document and user UID.
 */
export async function loginWithGoogle(): Promise<FirebaseAuthResult> {
  try {
    const provider = new GoogleAuthProvider();
    // Prompt account selection
    provider.setCustomParameters({ prompt: 'select_account' });

    const cred = await signInWithPopup(auth, provider);
    const u = cred.user;

    const authState: AuthState = {
      username: u.displayName || u.email?.split('@')[0] || 'Usuário',
      email: u.email || '',
      uid: u.uid,
    };

    // Check if user doc exists in Firestore, create if not
    const userDocRef = doc(db, 'users', u.uid);
    try {
      const snap = await getDoc(userDocRef);
      if (!snap.exists()) {
        const fallbackDb = getDefaultDatabase();
        await setDoc(userDocRef, {
          uid: u.uid,
          email: u.email || '',
          displayName: u.displayName || 'Usuário',
          username: u.displayName || 'Usuário',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          prefs: {
            ...fallbackDb.prefs,
            displayName: u.displayName || fallbackDb.prefs.displayName,
          },
        });
      }
    } catch (e) {
      console.warn('Google sign-in user doc check:', e);
    }

    return { success: true, user: u, authState };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    const message = getFriendlyAuthErrorMessage(code);
    return { success: false, error: message };
  }
}

/**
 * Logs out the active user from Firebase Authentication.
 */
export async function logoutFirebase(): Promise<void> {
  try {
    await signOut(auth);
  } catch (err) {
    console.error('Error signing out from Firebase:', err);
  }
}
