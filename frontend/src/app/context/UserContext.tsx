import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { toast } from 'sonner';

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
  ordersCount: number;
  wishlistCount: number;
  referralsCount: number;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false); 
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    chat: true,
    orders: true,
    wishlist: false,
    promotions: true,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          
          // Fetch profile from Django
          const response = await fetch('http://127.0.0.1:8000/api/auth/me/', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            setUser({
              name: data.email.split('@')[0],
              email: data.email,
              university: data.university_name || 'Unknown University',
              role: data.is_vendor ? 'Seller' : 'Buyer',
              profilePic: null,
              joinDate: 'Just now',
              referralCode: data.referral_code || `UNIM-${data.id || 'NEW'}`,
              ordersCount: data.orders_count || 0,
              wishlistCount: data.wishlist_count || 0,
              referralsCount: data.referrals_count || 0,
            });
            setIsLoggedIn(true);
          } else {
            const errorText = await response.text();
            console.error('Failed to fetch profile from Django:', response.status, errorText);
            toast.error(`Backend Login Error: ${response.status} - ${errorText.substring(0, 50)}`);
            setIsLoggedIn(false);
            setUser(null);
          }
        } catch (error: any) {
          console.error('Error fetching profile:', error);
          toast.error(`Network Error: ${error.message}`);
          setIsLoggedIn(false);
          setUser(null);
        }
      } else {
        setIsLoggedIn(false);
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
  const logout = async () => {
    try {
      await signOut(auth);
      window.location.href = '/signin';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

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
