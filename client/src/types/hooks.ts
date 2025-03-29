import { User } from './api';

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export interface UseToastReturn {
  toast: (props: {
    type?: 'success' | 'error' | 'warning' | 'info';
    title: string;
    description?: string;
    duration?: number;
  }) => void;
}

export interface UseDialogReturn {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export interface UseFormReturn<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  handleChange: (field: keyof T) => (value: any) => void;
  handleBlur: (field: keyof T) => () => void;
  handleSubmit: (e: React.FormEvent) => void;
  setFieldValue: (field: keyof T, value: any) => void;
  setFieldError: (field: keyof T, error: string) => void;
  resetForm: () => void;
}

export interface UsePaginationReturn {
  currentPage: number;
  totalPages: number;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  firstPage: () => void;
  lastPage: () => void;
}

export interface UseSearchReturn<T> {
  query: string;
  results: T[];
  isLoading: boolean;
  error: Error | null;
  setQuery: (query: string) => void;
}

export interface UseSortReturn<T> {
  sortBy: keyof T | null;
  sortOrder: 'asc' | 'desc';
  setSortBy: (field: keyof T) => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  sortedData: T[];
}

export interface UseFilterReturn<T> {
  filters: Partial<Record<keyof T, any>>;
  setFilter: (field: keyof T, value: any) => void;
  clearFilters: () => void;
  filteredData: T[];
} 