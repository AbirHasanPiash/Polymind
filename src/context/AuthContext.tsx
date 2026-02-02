import { createContext, useContext, useState, useEffect, type ReactNode, type Dispatch, type SetStateAction } from 'react';
import api from '../api/client';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  email: string;
  full_name?: string;
  is_superuser: boolean;
  is_active?: boolean;
  wallet?: {
    credits: number;
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
  // We add this so other pages can manually set user if needed
  setUser: Dispatch<SetStateAction<User | null>>; 
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'));
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const fetchUserProfile = async (accessToken: string) => {
    try {
      const response = await api.get('/users/me', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      setUser(response.data);
    } catch (error) {
      console.error("Failed to fetch user:", error);
    }
  };

  const refreshProfile = async () => {
    if (token) {
      await fetchUserProfile(token);
    }
  };

  const login = (newToken: string) => {
    localStorage.setItem('access_token', newToken);
    setToken(newToken);
  };

  const logout = () => {
    setIsLoading(true);
    navigate('/'); 
    setTimeout(() => {
      localStorage.removeItem('access_token');
      setToken(null);
      setUser(null);
      setIsLoading(false);
    }, 50);
  };

  useEffect(() => {
    const initAuth = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        await fetchUserProfile(token);
      } catch (error) {
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [token]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      login, 
      logout, 
      refreshProfile,
      setUser,
      isAuthenticated: !!user, 
      isLoading 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};