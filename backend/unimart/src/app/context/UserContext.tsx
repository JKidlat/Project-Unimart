import React, { createContext, useContext, useState, useEffect } from 'react';

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
interface UserProfile {
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
 * - Authentication state (mocked)
 */
export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Global search query state shared between Navbar and Shop pages
  const [searchQuery, setSearchQuery] = useState('');
  
  // Mocked login state for UI demonstration
  const [isLoggedIn, setIsLoggedIn] = useState(true); 
  
  // Current user profile state
  const [user, setUser] = useState<UserProfile | null>({
    name: "Emmanuel Boateng",
    email: "emmanuel.b@st.ug.edu.gh",
    university: "University of Ghana (UG)",
    role: "Buyer",
    profilePic: null,
    joinDate: "Sept 2024",
    referralCode: "UNIM-EB-2026",
  });

  // User notification preferences
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    chat: true,
    orders: true,
    wishlist: false,
    promotions: true,
  });

  /**
   * Updates the user profile with new partial data
   * @param updates - Object containing properties to update
   */
  const updateProfile = (updates: Partial<UserProfile>) => {
    setUser(prev => prev ? { ...prev, ...updates } : null);
  };

  /**
   * Updates notification preferences
   * @param updates - Object containing notification flags to update
   */
  const updateNotificationSettings = (updates: Partial<NotificationSettings>) => {
    setNotificationSettings(prev => ({ ...prev, ...updates }));
  };

  /**
   * Handles user logout
   * Resets local state and redirects to the sign-in page
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
