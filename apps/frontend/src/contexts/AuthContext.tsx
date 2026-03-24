import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiFetch, setTokens, clearTokens } from '../api/client';

interface User {
  id: string; // NestJS usually uses number for ID, but keeping string for React compat if needed, we'll typecast
  email: string;
  username: string;
  avatar: string; // mapped from avatarUrl
  createdAt: string;
}

interface AuthProfileResponse {
  userid: number;
  email: string;
  nickname: string;
  avatarUrl?: string | null;
  createdAt: string;
}

interface CheckAuthOptions {
  showLoader?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: (options?: CheckAuthOptions) => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const resetAuthState = () => {
    clearTokens();
    setUser(null);
  };

  const mapProfileToUser = (data: AuthProfileResponse): User => ({
    id: String(data.userid),
    email: data.email,
    username: data.nickname,
    avatar: data.avatarUrl || '/logo.png',
    createdAt: data.createdAt,
  });

  const fetchCurrentUser = async (): Promise<User | null> => {
    const response = await apiFetch('/api/users/me');

    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    return mapProfileToUser(result.data);
  };

  // 로그인 상태 확인
  const checkAuth = async (
    options: CheckAuthOptions = {},
  ): Promise<User | null> => {
    const { showLoader = false } = options;

    if (showLoader) {
      setLoading(true);
    }

    try {
      const currentUser = await fetchCurrentUser();
      setUser(currentUser);
      return currentUser;
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      return null;
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  };

  // 컴포넌트 마운트 시 로그인 상태 확인
  useEffect(() => {
    void checkAuth({ showLoader: true });
  }, []);

  // 로그인
  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || result.error || 'Login failed');
      }

      const data = result.data; // Unwrap `{ data: { accessToken, ... } }`
      setTokens(data.accessToken, data.refreshToken);

      const currentUser = await checkAuth();
      if (!currentUser) {
        throw new Error('Failed to load authenticated user');
      }
    } catch (error) {
      resetAuthState();
      throw error;
    }
  };

  // 회원가입
  const register = async (email: string, username: string, password: string) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, nickname: username, password }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || data.error || 'Registration failed');
    }

    // Auto-login after register
    await login(email, password);
  };

  // 로그아웃
  const logout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout error', e);
    } finally {
      resetAuthState();
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
