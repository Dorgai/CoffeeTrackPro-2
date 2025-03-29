import { ReactNode } from 'react';
import { Coffee, Customer, RoastingOrder, RetailOrder, InventoryMovement } from './api';

export interface LayoutProps {
  children: ReactNode;
}

export interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export interface CoffeeCardProps {
  coffee: Coffee;
}

export interface CoffeeFormProps {
  coffee?: Coffee;
  onSubmit: (data: Partial<Coffee>) => void;
  onCancel: () => void;
}

export interface CustomerCardProps {
  customer: Customer;
}

export interface CustomerFormProps {
  customer?: Customer;
  onSubmit: (data: Partial<Customer>) => void;
  onCancel: () => void;
}

export interface RoastingOrderCardProps {
  order: RoastingOrder;
}

export interface RoastingOrderFormProps {
  order?: RoastingOrder;
  onSubmit: (data: Partial<RoastingOrder>) => void;
  onCancel: () => void;
}

export interface RetailOrderCardProps {
  order: RetailOrder;
}

export interface RetailOrderFormProps {
  order?: RetailOrder;
  onSubmit: (data: Partial<RetailOrder>) => void;
  onCancel: () => void;
}

export interface InventoryMovementCardProps {
  movement: InventoryMovement;
}

export interface InventoryMovementFormProps {
  movement?: InventoryMovement;
  onSubmit: (data: Partial<InventoryMovement>) => void;
  onCancel: () => void;
}

export interface TableProps<T> {
  data: T[];
  columns: {
    key: keyof T;
    title: string;
    render?: (value: T[keyof T], item: T) => ReactNode;
  }[];
  onRowClick?: (item: T) => void;
}

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  isDisabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
}

export interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel';
  label?: string;
  placeholder?: string;
  value?: string | number;
  onChange?: (value: string) => void;
  error?: string;
  isDisabled?: boolean;
}

export interface SelectProps<T> {
  label?: string;
  value?: T;
  options: { value: T; label: string }[];
  onChange?: (value: T) => void;
  error?: string;
  isDisabled?: boolean;
}

export interface TextareaProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  isDisabled?: boolean;
}

export interface ToastProps {
  type?: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  duration?: number;
} 