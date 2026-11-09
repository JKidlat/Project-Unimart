/**
 * ==============================================================================
 * ADMIN AUTHENTICATION & TEAM MANAGEMENT SERVICE (adminAuth.ts)
 * ==============================================================================
 * This service controls which users are allowed to enter the Unimart Admin Suite
 * (/admin, /admin/dashboard, etc.).
 *
 * Core Security Rules:
 * 1. Master Administrator:
 *    - Email: `jansah.klintaps@gmail.com`
 *    - Default initial password: `unimartadmin1234`
 *    - Cannot be deleted by anyone.
 *
 * 2. Team Admins:
 *    - The Master Admin can add co-administrators by email.
 *    - When an email is added, `generateAutoPassword()` creates a random readable
 *      password (e.g. `unimart_k9X2bY`).
 *    - Admins can change their own password once logged in.
 *
 * 3. Persistence:
 *    - Stored in browser `localStorage` under `unimart_authorized_admins`.
 *    - Ensures the Master Admin is always seeded even if storage is reset.
 * ==============================================================================
 */

// Interface defining the structure of an Administrator account
export interface AdminAccount {
  id: string;             // Unique identifier (e.g. 'admin-master' or timestamp)
  name: string;           // Display name (e.g. 'Platform Creator')
  email: string;          // Lowercase admin email
  password: string;       // Plaintext admin access password
  role: 'Super Admin' | 'Admin'; // Access tier
  isMaster: boolean;      // True only for the master account (cannot be deleted)
  createdAt: string;      // Date account was provisioned
}

// Key used to store admin accounts in browser localStorage
const ADMIN_STORAGE_KEY = 'unimart_authorized_admins';

// Master administrator constants
export const MASTER_ADMIN_EMAIL = 'jansah.klintaps@gmail.com';
export const CO_ADMIN_EMAIL = 'abrahamkwesijames@gmail.com';
export const DEFAULT_ADMIN_PASSWORD = 'unimartadmin1234';

// Seed accounts for platform administrators
const INITIAL_ADMINS: AdminAccount[] = [
  {
    id: 'admin-master',
    name: 'Jay Kidlat',
    email: MASTER_ADMIN_EMAIL,
    password: DEFAULT_ADMIN_PASSWORD,
    role: 'Super Admin',
    isMaster: true,
    createdAt: '2024-01-01',
  },
  {
    id: 'admin-co-founder',
    name: 'Abraham Kwesi James',
    email: CO_ADMIN_EMAIL,
    password: DEFAULT_ADMIN_PASSWORD,
    role: 'Super Admin',
    isMaster: true,
    createdAt: '2024-01-01',
  },
];

// ==============================================================================
// 1. PASSWORD GENERATOR
// ==============================================================================

/**
 * Generates an automatic, secure, yet easy-to-type temporary password for newly
 * invited administrators (format: `unimart_` + 6 alphanumeric characters).
 *
 * @returns A temporary password string, e.g. "unimart_h8P3mX"
 */
export function generateAutoPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let randomStr = '';
  for (let i = 0; i < 6; i++) {
    randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `unimart_${randomStr}`;
}

// ==============================================================================
// 2. STORAGE RETRIEVAL & SYNCHRONIZATION
// ==============================================================================

/**
 * Retrieves all authorized admin accounts from localStorage.
 * Automatically guarantees that the master administrator account is present.
 *
 * @returns Array of AdminAccount objects
 */
export function getAuthorizedAdmins(): AdminAccount[] {
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Guarantee both seed administrators are always present
        for (const initial of INITIAL_ADMINS) {
          const exists = parsed.some(a => a.email.toLowerCase() === initial.email.toLowerCase());
          if (!exists) {
            parsed.push(initial);
          }
        }
        localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(parsed));
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to parse admins from storage:', err);
  }

  // Seed default admins if storage is empty
  const initial = [...INITIAL_ADMINS];
  localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

/**
 * Helper to write updated admin accounts array to localStorage.
 */
function saveAdmins(admins: AdminAccount[]) {
  localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(admins));
}

// ==============================================================================
// 3. ADMIN CREDENTIAL VERIFICATION
// ==============================================================================

/**
 * Verifies if an email and password pair matches an authorized administrator.
 *
 * @param emailInput - Email entered in the admin sign-in form.
 * @param passwordInput - Password entered in the admin sign-in form.
 * @returns Object with `success` boolean and either `admin` or an error message.
 */
export function authenticateAdminCredentials(
  emailInput: string,
  passwordInput: string
): { success: boolean; admin?: AdminAccount; error?: string } {
  const normalizedEmail = emailInput.trim().toLowerCase();
  const admins = getAuthorizedAdmins();

  const foundAdmin = admins.find(a => a.email.toLowerCase() === normalizedEmail);

  // Check 1: Is this email on the authorized admin roster?
  if (!foundAdmin) {
    return {
      success: false,
      error: `Access denied. Email "${emailInput.trim()}" is not an authorized administrator. Only authorized emails (e.g. ${MASTER_ADMIN_EMAIL}) are allowed.`,
    };
  }

  // Check 2: Does the password match?
  if (foundAdmin.password !== passwordInput) {
    return {
      success: false,
      error: 'Incorrect admin password. Please try again or contact the platform creator.',
    };
  }

  return {
    success: true,
    admin: foundAdmin,
  };
}

// ==============================================================================
// 4. PASSWORD MODIFICATION
// ==============================================================================

/**
 * Changes an existing administrator's password.
 *
 * @param email - Email of the admin changing their password.
 * @param currentPassword - Their current password for security verification.
 * @param newPassword - The new password (minimum 6 characters).
 * @returns Object indicating success or failure.
 */
export function changeAdminPassword(
  email: string,
  currentPassword: string,
  newPassword: string
): { success: boolean; error?: string } {
  const normalizedEmail = email.trim().toLowerCase();
  const admins = getAuthorizedAdmins();
  const index = admins.findIndex(a => a.email.toLowerCase() === normalizedEmail);

  if (index === -1) {
    return { success: false, error: 'Admin account not found.' };
  }

  if (admins[index].password !== currentPassword) {
    return { success: false, error: 'Current password does not match.' };
  }

  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'New password must be at least 6 characters.' };
  }

  admins[index].password = newPassword;
  saveAdmins(admins);
  return { success: true };
}

// ==============================================================================
// 5. ADMIN TEAM MANAGEMENT (ADD / REMOVE)
// ==============================================================================

/**
 * Adds a new administrator by email and auto-generates their password.
 *
 * @param email - Email address of the new admin to invite.
 * @param name - Optional display name.
 * @returns Object containing the created AdminAccount and generated password.
 */
export function addAdminAccount(
  email: string,
  name?: string
): { success: boolean; admin?: AdminAccount; generatedPassword?: string; error?: string } {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return { success: false, error: 'Please enter a valid email address.' };
  }

  const admins = getAuthorizedAdmins();
  const exists = admins.some(a => a.email.toLowerCase() === normalizedEmail);

  if (exists) {
    return { success: false, error: `An admin with email "${email}" is already registered.` };
  }

  const autoPassword = generateAutoPassword();
  const autoName = name?.trim() || email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  const newAdmin: AdminAccount = {
    id: `admin-${Date.now()}`,
    name: autoName,
    email: normalizedEmail,
    password: autoPassword,
    role: 'Admin',
    isMaster: false,
    createdAt: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
  };

  admins.push(newAdmin);
  saveAdmins(admins);

  return {
    success: true,
    admin: newAdmin,
    generatedPassword: autoPassword,
  };
}

/**
 * Removes an administrator account from the authorized list.
 * Note: The master creator (jansah.klintaps@gmail.com) is protected and cannot be deleted.
 *
 * @param id - The ID of the admin account to remove.
 */
export function removeAdminAccount(id: string): { success: boolean; error?: string } {
  const admins = getAuthorizedAdmins();
  const target = admins.find(a => a.id === id);

  if (!target) {
    return { success: false, error: 'Admin not found.' };
  }

  if (target.isMaster || target.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) {
    return { success: false, error: 'The primary platform creator (jansah.klintaps@gmail.com) cannot be removed.' };
  }

  const updated = admins.filter(a => a.id !== id);
  saveAdmins(updated);
  return { success: true };
}
