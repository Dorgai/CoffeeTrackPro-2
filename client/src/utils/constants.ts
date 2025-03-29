export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const TOKEN_KEY = 'token';
export const USER_KEY = 'user';

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  COFFEE: '/coffee',
  COFFEE_DETAIL: '/coffee/:id',
  ROASTING_ORDERS: '/roasting/orders',
  RETAIL_ORDERS: '/retail/orders',
  INVENTORY: '/inventory',
  SETTINGS: '/settings',
} as const;

export const COFFEE_TYPES = {
  ARABICA: 'Arabica',
  ROBUSTA: 'Robusta',
  BLEND: 'Blend',
} as const;

export const ROAST_LEVELS = {
  LIGHT: 'Light',
  MEDIUM: 'Medium',
  DARK: 'Dark',
} as const;

export const ORDER_STATUS = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
} as const;

export const INVENTORY_STATUS = {
  IN_STOCK: 'In Stock',
  LOW_STOCK: 'Low Stock',
  OUT_OF_STOCK: 'Out of Stock',
} as const;

export const PAYMENT_STATUS = {
  PENDING: 'Pending',
  PAID: 'Paid',
  REFUNDED: 'Refunded',
  FAILED: 'Failed',
} as const;

export const SHIPPING_STATUS = {
  PENDING: 'Pending',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  RETURNED: 'Returned',
} as const;

export const USER_ROLES = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  STAFF: 'Staff',
} as const; 