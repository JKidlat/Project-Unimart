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
  kyc_status?: KYCStatus;
  businessName?: string;
}

// Methods and properties exposed by the useUser() hook
interface UserContextType {
  user: UserProfile | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  login: (profileOrCredentials: any) => Promise<void>;
  signup: (formData: any) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  logout: () => void;
  notificationSettings: NotificationSettings;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => void;
  isLoggedIn: boolean;
  isLoading: boolean;
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
              const formatted: UserProfile = {
                id: fresh.id,
                name: fresh.full_name || fresh.name || savedUser.name,
                email: fresh.email,
                university: fresh.university_name || fresh.university || savedUser.university,
                role: (fresh.role as UserRole) || savedUser.role || 'Buyer',
                profilePic: fresh.profile_pic || savedUser.profilePic,
                joinDate: savedUser.joinDate || 'Oct 2024',
                referralCode: fresh.referral_code || savedUser.referralCode,
                is_staff: fresh.is_staff || false,
                kyc_status: fresh.kyc_status || savedUser.kyc_status || 'none',
                businessName: fresh.business_name || savedUser.businessName,
              };
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

  // ----------------------------------------------------------------------------
  // Action: Log In
  // ----------------------------------------------------------------------------
  const login = async (data: any) => {
    try {
      // Direct session injection (used for Mock demo or Admin accounts)
      if (data.name && data.email && !data.password) {
        setUser(data);
        setIsLoggedIn(true);
        setIsLoading(false);
        tokenStorage.setUser(data);
        tokenStorage.setTokens('unimart_auth_' + Date.now());
        return;
      }

      // Standard API password authentication
      const res = await api.post('/auth/login/', {
        email: data.email,
        password: data.password || 'password123'
      });

      if (res.tokens?.access) {
        tokenStorage.setTokens(res.tokens.access, res.tokens.refresh);
      }

      const rawUser = res.user || {};
      const profile: UserProfile = {
        id: rawUser.id || Date.now(),
        name: rawUser.full_name || rawUser.name || data.email.split('@')[0],
        email: rawUser.email || data.email,
        university: rawUser.university_name || rawUser.university || 'University of Ghana (UG)',
        role: (rawUser.role as UserRole) || 'Buyer',
        profilePic: rawUser.profile_pic || null,
        joinDate: 'Oct 2024',
        referralCode: rawUser.referral_code || `UNIM-${data.email.slice(0, 2).toUpperCase()}-2026`,
        is_staff: rawUser.is_staff || false,
        kyc_status: rawUser.kyc_status || 'none',
        businessName: rawUser.business_name || undefined,
      };

      setUser(profile);
      setIsLoggedIn(true);
      tokenStorage.setUser(profile);
    } catch (err: any) {
      throw err;
    }
  };

  // ----------------------------------------------------------------------------
  // Action: Sign Up (New Student Account)
  // ----------------------------------------------------------------------------
  const signup = async (formData: any) => {
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
        business_name: formData.businessName || null,
        referral_code: formData.referral_code || formData.referralCode || '',
      });

      if (res.tokens?.access) {
        tokenStorage.setTokens(res.tokens.access, res.tokens.refresh);
      }

      const rawUser = res.user || {};
      const profile: UserProfile = {
        id: rawUser.id || Date.now(),
        name: rawUser.full_name || formData.fullName,
        email: rawUser.email || formData.email,
        university: rawUser.university_name || formData.university || 'University of Ghana (UG)',
        role: (formData.role as UserRole) || 'Buyer',
        profilePic: null,
        joinDate: new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
        referralCode: rawUser.referral_code || `UNIM-${formData.fullName.split(' ').map((w: string) => w[0]).join('').toUpperCase()}-${Date.now().toString().slice(-4)}`,
        is_staff: false,
        kyc_status: 'none',
        businessName: formData.businessName || undefined,
      };

      setUser(profile);
      setIsLoggedIn(true);
      tokenStorage.setUser(profile);
    } catch (err: any) {
      throw err;
    }
  };

  // ----------------------------------------------------------------------------
  // Action: Update Profile Details
  // ----------------------------------------------------------------------------
  const updateProfile = async (updates: Partial<UserProfile>) => {
    try {
      await api.patch('/auth/me/', updates);
      setUser(prev => {
        if (!prev) return null;
        const updated = { ...prev, ...updates };
        tokenStorage.setUser(updated);
        return updated;
      });
    } catch (err) {
      // Fallback local update if network is unavailable
      setUser(prev => {
        if (!prev) return null;
        const updated = { ...prev, ...updates };
        tokenStorage.setUser(updated);
        return updated;
      });
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
    if (refresh) {
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
      signup,
      updateProfile,
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
