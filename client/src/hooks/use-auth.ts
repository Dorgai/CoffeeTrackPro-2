import { useContext } from 'react';
import { AuthContext } from '../contexts/auth-context';
import { UseAuthReturn } from '../types/hooks';

export function useAuth(): UseAuthReturn {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 