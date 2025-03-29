export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    currentPage: number;
    lastPage: number;
    perPage: number;
    total: number;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface Coffee {
  id: number;
  name: string;
  type: string;
  origin: string;
  roastLevel: string;
  description: string;
  price: number;
  stock: number;
  createdAt: string;
  updatedAt: string;
}

export interface RoastingOrder {
  id: number;
  coffeeId: number;
  coffee: Coffee;
  quantity: number;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RetailOrder {
  id: number;
  customerId: number;
  customer: Customer;
  items: OrderItem[];
  status: string;
  total: number;
  paymentStatus: string;
  shippingStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: number;
  orderId: number;
  coffeeId: number;
  coffee: Coffee;
  quantity: number;
  price: number;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryMovement {
  id: number;
  coffeeId: number;
  coffee: Coffee;
  type: string;
  quantity: number;
  reference: string;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  id: number;
  key: string;
  value: string;
  createdAt: string;
  updatedAt: string;
} 