/**
 * ==============================================================================
 * USER & AUTHENTICATION CONTEXT (UserContext.tsx)
 * ==============================================================================
 * This React Context manages student authentication, active sessions, and profile
 * data for the entire application.
 *
 * Key Responsibilities:
 * 1. Session Rehydration & 72-Hour Expiry:
 *    - On page reload, checks localStorage for saved user and token.
 *    - Validates that the session is not older than 72 hours via `tokenStorage.isExpired()`.
 *    - If expired, automatically logs out and prompts a fresh sign-in.
 * 2. User Roles:
 *    - Differentiates between 'Buyer', 'Seller', and 'Admin'.
 * 3. Auth Actions:
 *    - `login()`: Supports password login and token storage.
 *    - `signup()`: Handles student account creation with campus affiliation.
 *    - `updateProfile()`: Updates university, name, or role.
 *    - `logout()`: Clears tokens, resets session state, and notifies backend.
 *
 * How to use in any component:
 * const { user, isLoggedIn, login, logout } = useUser();
 * ==============================================================================
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, tokenStorage } from '../../lib/api';
import { signInWithGooglePopup } from '../../lib/firebase';

// Allowed user roles in Unimart
export type UserRole = 'Buyer' | 'Seller' | 'Admin';

// Verification stage for sellers
export type KYCStatus = 'none' | 'pending' | 'approved' | 'rejected';

// Notification preferences toggles
export interface NotificationSettings {
  chat: boolean;
  orders: boolean;
  wishlist: boolean;
  promotions: boolean;
}

// Full profile shape of the authenticated student
export interface UserProfile {
  id?: number | string;
  name: string;
  email: string;
  university: string;
  role: UserRole;
  profilePic: string | null;
  joinDate: string;
  referralCode: string;
  is_staff?: boolean;
  is_email_verified?: boolean;
  hasFirebaseLinked?: boolean;
  kyc_status?: KYCStatus;
  businessName?: string;
}

// Methods and properties exposed by the useUser() hook
interface UserContextType {
  user: UserProfile | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  login: (profileOrCredentials: any) => Promise<UserProfile>;
  loginWithGoogle: () => Promise<UserProfile>;
  linkGoogleAccount: (password?: string, cachedIdToken?: string) => Promise<UserProfile>;
  signup: (formData: any) => Promise<UserProfile>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshUserProfile: () => Promise<UserProfile | null>;
  logout: () => void;
  notificationSettings: NotificationSettings;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => void;
  isLoggedIn: boolean;
  isLoading: boolean;
}

export function resolveUserDashboardPath(user: Partial<UserProfile> | null | undefined, returnTo?: string): string {
  if (user?.is_staff || user?.role === 'Admin') {
    return '/admin';
  }
  if (user?.role === 'Seller') {
    return returnTo || '/seller';
  }
  return returnTo || '/';
}

function formatUserProfile(rawUser: any, fallback: Partial<UserProfile> = {}): UserProfile {
  const email = rawUser?.email || fallback.email || '';
  const fallbackName = email ? email.split('@')[0] : 'Student';
  return {
    id: rawUser?.id || fallback.id || Date.now(),
    name: rawUser?.full_name || rawUser?.name || fallback.name || fallbackName,
    email,
    university: rawUser?.university_name || rawUser?.university || fallback.university || 'University of Ghana (UG)',
    role: (rawUser?.role as UserRole) || fallback.role || 'Buyer',
    profilePic: rawUser?.profile_pic || fallback.profilePic || null,
    joinDate: fallback.joinDate || new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
    referralCode: rawUser?.referral_code || fallback.referralCode || `UNIM-${email.slice(0, 2).toUpperCase()}-2026`,
    is_staff: rawUser?.is_staff ?? fallback.is_staff ?? false,
    is_email_verified: rawUser?.is_email_verified ?? fallback.is_email_verified ?? false,
    hasFirebaseLinked: rawUser?.has_firebase_linked ?? fallback.hasFirebaseLinked ?? false,
    kyc_status: rawUser?.kyc_status || fallback.kyc_status || 'none',
    businessName: rawUser?.business_name || fallback.businessName || undefined,
  };
}

// Create the Context with undefined default value
const UserContext = createContext<UserContextType | undefined>(undefined);

// ==============================================================================
// USER PROVIDER COMPONENT
// ==============================================================================
export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Global search bar text shared between Navbar and Shop pages
  const [searchQuery, setSearchQuery] = useState('');
  
  // Auth state variables
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Notification preferences state
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    chat: true,
    orders: true,
    wishlist: false,
    promotions: true,
  });

  // ----------------------------------------------------------------------------
  // Effect: Hydrate user session from localStorage on startup
  // ----------------------------------------------------------------------------
  useEffect(() => {
    // Check 1: Enforce the 72-hour session lifetime requirement
    if (tokenStorage.isExpired()) {
      tokenStorage.clear();
      setIsLoading(false);
      return;
    }

    // Check 2: Load cached user profile if present
    const savedUser = tokenStorage.getUser();
    if (savedUser) {
      setUser(savedUser);
      setIsLoggedIn(true);

      // If user is Admin or staff, preserve session immediately without remote verification
      if (savedUser.role === 'Admin' || savedUser.is_staff) {
        setIsLoading(false);
        return;
      }

      // Check 3: Background sync with backend to get latest profile updates
      const token = tokenStorage.getAccess();
      if (token) {
        api.get('/auth/me/')
          .then((fresh) => {
            if (fresh && fresh.email) {
              const formatted = formatUserProfile(fresh, savedUser);
              setUser(formatted);
              tokenStorage.setUser(formatted);
            }
          })
          .catch(() => {
            // Keep offline user — session already set above
          })
          .finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const persistAuthResponse = (res: any, fallback: Partial<UserProfile> = {}): UserProfile => {
    if (res?.tokens?.access) {
      tokenStorage.setTokens(res.tokens.access, res.tokens.refresh);
    }
    const profile = formatUserProfile(res?.user || {}, fallback);
    setUser(profile);
    setIsLoggedIn(true);
    tokenStorage.setUser(profile);
    return profile;
  };

  // ----------------------------------------------------------------------------
  // Action: Log In
  // ----------------------------------------------------------------------------
  const login = async (data: any): Promise<UserProfile> => {
    try {
      // Direct session injection (used for Mock demo or Admin accounts)
      if (data.name && data.email && !data.password) {
        setUser(data);
        setIsLoggedIn(true);
        setIsLoading(false);
        tokenStorage.setUser(data);
        tokenStorage.setTokens('unimart_auth_' + Date.now());
        return data;
      }

      // Standard API password authentication
      const res = await api.post('/auth/login/', {
        email: data.email,
        password: data.password || 'password123'
      });

      return persistAuthResponse(res, { email: data.email, joinDate: 'Oct 2024' });
    } catch (err: any) {
      throw err;
    }
  };

  // ----------------------------------------------------------------------------
  // Action: Sign In with Google (Existing Registered Accounts Only)
  // ----------------------------------------------------------------------------
  const loginWithGoogle = async (): Promise<UserProfile> => {
    const idToken = await signInWithGooglePopup();
    try {
      const res = await api.post('/auth/google/', { id_token: idToken });
      return persistAuthResponse(res, { is_email_verified: true, hasFirebaseLinked: true });
    } catch (err: any) {
      if (err?.code === 'ACCOUNT_LINK_VERIFICATION_REQUIRED') {
        err.pendingIdToken = idToken;
      }
      throw err;
    }
  };

  // ----------------------------------------------------------------------------
  // Action: Explicitly Link Google Identity to Existing Account via Password
  // ----------------------------------------------------------------------------
  const linkGoogleAccount = async (password?: string, cachedIdToken?: string): Promise<UserProfile> => {
    const idToken = cachedIdToken || (await signInWithGooglePopup());
    const endpoint = password ? '/auth/google/link/' : '/auth/google/';
    const body = password ? { id_token: idToken, password } : { id_token: idToken };
    const res = await api.post(endpoint, body);
    return persistAuthResponse(res, { is_email_verified: true, hasFirebaseLinked: true });
  };

  // ----------------------------------------------------------------------------
  // Action: Sign Up (New Student Account)
  // ----------------------------------------------------------------------------
  const signup = async (formData: any): Promise<UserProfile> => {
    try {
      const res = await api.post('/auth/register/', {
        email: formData.email,
        password: formData.password,
        full_name: formData.fullName || formData.name,
        phone_number: formData.phoneNumber,
        university_id: formData.universityId || null,
        university: formData.university,
        role: formData.role || 'Buyer',
        is_vendor: formData.role === 'Seller',
        business_name: formData.businessName || '',
        referral_code: formData.referral_code || formData.referralCode || '',
      });

      const profile = persistAuthResponse(res, {
        name: formData.fullName || formData.name,
        email: formData.email,
        university: formData.university || 'University of Ghana (UG)',
        role: (formData.role as UserRole) || 'Buyer',
        is_email_verified: false,
        businessName: formData.businessName || undefined,
      });
      return Object.assign(profile, {
        _verificationEmailSent: res?.verification_email_sent,
        _verificationEmailError: res?.verification_email_error,
      });
    } catch (err: any) {
      throw err;
    }
  };

  // ----------------------------------------------------------------------------
  // Action: Refresh Profile from Backend (e.g. after email verification)
  // ----------------------------------------------------------------------------
  const refreshUserProfile = async (): Promise<UserProfile | null> => {
    const token = tokenStorage.getAccess();
    if (!token || token.startsWith('mock_jwt_') || token.startsWith('unimart_auth_')) {
      return user;
    }
    try {
      const fresh = await api.get('/auth/me/');
      if (fresh && fresh.email) {
        const formatted = formatUserProfile(fresh, user || {});
        setUser(formatted);
        setIsLoggedIn(true);
        tokenStorage.setUser(formatted);
        return formatted;
      }
    } catch {
      // Ignore refresh failure if offline
    }
    return user;
  };

  // ----------------------------------------------------------------------------
  // Action: Update Profile Details
  // ----------------------------------------------------------------------------
  const updateProfile = async (updates: Partial<UserProfile>) => {
    const payload: Record<string, any> = {};
    if (updates.name !== undefined) payload.full_name = updates.name;
    if (updates.university !== undefined) payload.university = updates.university;
    if (updates.profilePic !== undefined) payload.profile_pic = updates.profilePic;
    if (updates.businessName !== undefined) payload.business_name = updates.businessName;
    if (updates.role !== undefined) payload.role = updates.role;

    const fresh = await api.patch('/auth/me/', payload);
    if (fresh && fresh.email) {
      const formatted = formatUserProfile(fresh, user || {});
      setUser(formatted);
      tokenStorage.setUser(formatted);
    }
  };

  // ----------------------------------------------------------------------------
  // Action: Update Notification Preferences
  // ----------------------------------------------------------------------------
  const updateNotificationSettings = (updates: Partial<NotificationSettings>) => {
    setNotificationSettings(prev => ({ ...prev, ...updates }));
  };

  // ----------------------------------------------------------------------------
  // Action: Log Out
  // ----------------------------------------------------------------------------
  const logout = () => {
    const refresh = tokenStorage.getRefresh();
    if (refresh && !refresh.startsWith('mock_jwt_')) {
      api.post('/auth/logout/', { refresh }).catch(() => {});
    }
    tokenStorage.clear();
    setIsLoggedIn(false);
    setUser(null);
  };

  return (
    <UserContext.Provider value={{
      user,
      searchQuery,
      setSearchQuery,
      login,
      loginWithGoogle,
      linkGoogleAccount,
      signup,
      updateProfile,
      refreshUserProfile,
      logout,
      notificationSettings,
      updateNotificationSettings,
      isLoggedIn,
      isLoading
    }}>
      {children}
    </UserContext.Provider>
  );
};

// ==============================================================================
// CUSTOM HOOK: useUser()
// ==============================================================================
/**
 * Hook to consume user authentication and profile state in any component.
 * Throws a helpful error if used outside <UserProvider>.
 */
export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
