import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import axiosClient from '../api/axiosClient';
import { useNavigate } from 'react-router-dom';

export type UserRole = 'admin' | 'lecturer' | null;

interface User {
  id: number;
  email: string;
  role: UserRole;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  role: UserRole;
  token: string | null;
  login: (token: string, user_data: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('is_logged_in') ? 'cookie_set' : null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Luôn thử fetch user xem cookie có hợp lệ không
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await axiosClient.get('/auth/me');
      setUser(response.data);
      setRole(response.data.role);
      setToken('cookie_set');
      localStorage.setItem('is_logged_in', 'true');
    } catch (error) {
      console.error("Failed to fetch user", error);
      setUser(null);
      setRole(null);
      setToken(null);
      localStorage.removeItem('is_logged_in');
    } finally {
      setIsLoading(false);
    }
  };

  const login = (newToken: string, user_data: User) => {
    localStorage.setItem('is_logged_in', 'true');
    setToken('cookie_set');
    setUser(user_data);
    setRole(user_data.role);
  };

  const logout = async () => {
    try {
      await axiosClient.post('/auth/logout');
    } catch (e) {
      console.error("Logout request failed", e);
    }
    localStorage.removeItem('is_logged_in');
    setToken(null);
    setUser(null);
    setRole(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, role, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
