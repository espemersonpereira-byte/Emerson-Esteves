import { AuthState } from '../types';
import { AK, SK } from '../utils';

export const UK = 'calculos_users_v1';

export interface StoredUser {
  username: string;
  email?: string;
  password?: string;
  createdAt?: string;
}

/**
 * Retrieves the list of all registered users from localStorage.
 * Automatically migrates existing single user from AK so no previous accounts are lost.
 */
export function getStoredUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(UK);
    let users: StoredUser[] = [];
    if (raw) {
      users = JSON.parse(raw);
      if (!Array.isArray(users)) users = [];
    }

    // Check if legacy or single user exists in AK
    const akRaw = localStorage.getItem(AK);
    if (akRaw) {
      try {
        const legacy: StoredUser = JSON.parse(akRaw);
        if (legacy && legacy.username) {
          const exists = users.some(
            (u) => u.username.toLowerCase() === legacy.username.toLowerCase()
          );
          if (!exists) {
            users.push({
              username: legacy.username,
              email: legacy.email || '',
              password: legacy.password || '',
              createdAt: legacy.createdAt || new Date().toISOString(),
            });
            localStorage.setItem(UK, JSON.stringify(users));
          }
        }
      } catch (err) {
        console.error('Error reading legacy auth:', err);
      }
    }

    return users;
  } catch (e) {
    console.error('Error loading stored users:', e);
    return [];
  }
}

/**
 * Persists the user registry to localStorage.
 */
export function saveStoredUsers(users: StoredUser[]): void {
  try {
    localStorage.setItem(UK, JSON.stringify(users));
  } catch (e) {
    console.error('Error saving users registry:', e);
  }
}

/**
 * Finds a user by either username or email (case-insensitive).
 */
export function findUser(identifier: string): StoredUser | null {
  const clean = identifier.trim().toLowerCase();
  if (!clean) return null;
  const users = getStoredUsers();
  return (
    users.find(
      (u) =>
        u.username.toLowerCase() === clean ||
        (u.email && u.email.trim().toLowerCase() === clean)
    ) || null
  );
}

/**
 * Authenticates a user with identifier (email or username) and password.
 */
export function authenticateUser(
  identifier: string,
  password: string
): { success: boolean; error?: string; user?: StoredUser } {
  const cleanId = identifier.trim();
  if (!cleanId) {
    return { success: false, error: 'Por favor, informe seu e-mail ou nome de usuário.' };
  }
  if (!password) {
    return { success: false, error: 'Por favor, digite sua senha.' };
  }

  const user = findUser(cleanId);
  if (!user) {
    return { success: false, error: 'Usuário ou e-mail não encontrado.' };
  }

  if (user.password !== password) {
    return { success: false, error: 'Senha incorreta. Tente novamente.' };
  }

  // Set active session & auth
  const authPayload: AuthState = {
    username: user.username,
    email: user.email,
    password: user.password,
  };
  localStorage.setItem(AK, JSON.stringify(authPayload));
  localStorage.setItem(SK, '1');

  return { success: true, user };
}

/**
 * Registers a new user.
 */
export function registerNewUser(data: {
  username: string;
  email?: string;
  password: string;
}): { success: boolean; error?: string; user?: StoredUser } {
  const cleanUsername = data.username.trim();
  const cleanEmail = data.email ? data.email.trim() : '';

  if (cleanUsername.length < 3) {
    return { success: false, error: 'O nome de usuário deve ter ao menos 3 caracteres.' };
  }

  if (data.password.length < 4) {
    return { success: false, error: 'A senha deve conter ao menos 4 caracteres.' };
  }

  const users = getStoredUsers();

  const userExists = users.some(
    (u) => u.username.toLowerCase() === cleanUsername.toLowerCase()
  );
  if (userExists) {
    return {
      success: false,
      error: 'Este nome de usuário já está cadastrado. Por favor, escolha outro ou faça login.',
    };
  }

  if (cleanEmail) {
    const emailExists = users.some(
      (u) => u.email && u.email.toLowerCase() === cleanEmail.toLowerCase()
    );
    if (emailExists) {
      return {
        success: false,
        error: 'Este e-mail já está associado a uma conta cadastrada.',
      };
    }
  }

  const newUser: StoredUser = {
    username: cleanUsername,
    email: cleanEmail,
    password: data.password,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  saveStoredUsers(users);

  // Set active session & auth
  const authPayload: AuthState = {
    username: newUser.username,
    email: newUser.email,
    password: newUser.password,
  };
  localStorage.setItem(AK, JSON.stringify(authPayload));
  localStorage.setItem(SK, '1');

  return { success: true, user: newUser };
}

/**
 * Resets a user password.
 */
export function resetUserPassword(
  identifier: string,
  newPassword: string
): { success: boolean; error?: string; user?: StoredUser } {
  const cleanId = identifier.trim();
  if (!cleanId) {
    return { success: false, error: 'Informe o e-mail ou nome de usuário da sua conta.' };
  }
  if (newPassword.length < 4) {
    return { success: false, error: 'A nova senha deve conter ao menos 4 caracteres.' };
  }

  const users = getStoredUsers();
  const idx = users.findIndex(
    (u) =>
      u.username.toLowerCase() === cleanId.toLowerCase() ||
      (u.email && u.email.trim().toLowerCase() === cleanId.toLowerCase())
  );

  if (idx === -1) {
    return { success: false, error: 'Nenhuma conta encontrada com este e-mail ou usuário.' };
  }

  users[idx].password = newPassword;
  saveStoredUsers(users);

  // Also update active AK if same user
  const akRaw = localStorage.getItem(AK);
  if (akRaw) {
    try {
      const active = JSON.parse(akRaw);
      if (
        active.username.toLowerCase() === users[idx].username.toLowerCase() ||
        (active.email && active.email.toLowerCase() === users[idx].email?.toLowerCase())
      ) {
        localStorage.setItem(AK, JSON.stringify(users[idx]));
      }
    } catch {}
  }

  return { success: true, user: users[idx] };
}
