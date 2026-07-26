import React, { createContext, useContext, useState } from 'react';

/**
 * UserRole Type
 * Defines the possible permissions levels for a user in the marketplace.
 */
export type UserRole = 'Buyer' | 'Seller' | 'Admin';

/**
 * NotificationSettings Interface
 * Tracks user preferences for different types of platform notifications.
 */
interface NotificationSettings {
  chat: boolean;
  orders: boolean;
  wishlist: boolean;
  promotions: boolean;
}

/**
 * UserProfile Interface
 * Represents the comprehensive data structure for a logged-in user.
 */
export interface UserProfile {
  name: string;
  email: string;
  university: string;
  role: UserRole;
  profilePic: string | null;
  joinDate: string;
  referralCode: string;
}

/**
 * UserContextType Interface
 * Defines the shape of the global user state and the methods to interact with it.
 */
interface UserContextType {
  user: UserProfile | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  login: (profile: UserProfile) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  logout: () => void;
  notificationSettings: NotificationSettings;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => void;
  isLoggedIn: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

/**
 * UserProvider Component
 *
 * The context provider that wraps the application. It manages:
 * - Current user session and profile data
 * - Global search state used by the marketplace
 * - Notification preferences
 * - Authentication state
 */
export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Global search query state shared between Navbar and Shop pages
  const [searchQuery, setSearchQuery] = useState('');

  // Auth state — starts logged out so Sign In is shown to new visitors
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Current user profile state — null until the user signs in or signs up
  const [user, setUser] = useState<UserProfile | null>(null);

  // User notification preferences
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    chat: true,
    orders: true,
    wishlist: false,
    promotions: true,
  });

  /**
   * Sets the active user session after a successful sign-in or sign-up.
   * @param profile - Full user profile to store in context
   */
  const login = (profile: UserProfile) => {
    setUser(profile);
    setIsLoggedIn(true);
  };

  /**
   * Updates the user profile with new partial data.
   * @param updates - Object containing properties to update
   */
  const updateProfile = (updates: Partial<UserProfile>) => {
    setUser(prev => prev ? { ...prev, ...updates } : null);
  };

  /**
   * Updates notification preferences.
   * @param updates - Object containing notification flags to update
   */
  const updateNotificationSettings = (updates: Partial<NotificationSettings>) => {
    setNotificationSettings(prev => ({ ...prev, ...updates }));
  };

  /**
   * Handles user logout.
   * Resets local state and redirects to the sign-in page.
   */
  const logout = () => {
    setIsLoggedIn(false);
    setUser(null);
    window.location.href = '/signin';
  };

  return (
    <UserContext.Provider value={{
      user,
      searchQuery,
      setSearchQuery,
      login,
      updateProfile,
      logout,
      notificationSettings,
      updateNotificationSettings,
      isLoggedIn
    }}>
      {children}
    </UserContext.Provider>
  );
};

/**
 * useUser Hook
 *
 * Custom hook to access the UserContext.
 * Must be used within a UserProvider component.
 */
export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
