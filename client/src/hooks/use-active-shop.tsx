import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Shop } from '@shared/schema';
import { queryClient } from '@/lib/queryClient';
import { useEffect } from 'react';
import { useAuth } from './use-auth';
import { apiRequest } from '@/lib/queryClient';

interface ActiveShopState {
  activeShop: Shop | null;
  setActiveShop: (shop: Shop | null) => void;
  clearActiveShop: () => void;
  autoSelectShopForUser: (userId: number) => Promise<void>;
}

// Create store without hydration on init
export const useActiveShop = create<ActiveShopState>()(
  persist(
    (set, get) => ({
      activeShop: null,
      setActiveShop: (shop) => {
        set({ activeShop: shop });
      },
      clearActiveShop: () => {
        set({ activeShop: null });
      },
      autoSelectShopForUser: async (userId: number) => {
        try {
          const response = await apiRequest("GET", "/api/user/shops");
          if (!response.ok) {
            throw new Error("Failed to fetch user shops");
          }
          const shops: Shop[] = await response.json();

          if (shops.length === 1) {
            get().setActiveShop(shops[0]);
          } else {
            get().clearActiveShop();
          }
        } catch (error) {
          console.error("Error auto-selecting shop:", error);
          get().clearActiveShop();
        }
      }
    }),
    {
      name: 'active-shop-storage',
      skipHydration: true
    }
  )
);

// Deferred shop selection hook
export const useAutoSelectShop = () => {
  const { user } = useAuth();
  const autoSelectShopForUser = useActiveShop(state => state.autoSelectShopForUser);
  const activeShop = useActiveShop(state => state.activeShop);

  useEffect(() => {
    // Only run for barista users without an active shop
    if (!user || !user.role || user.role !== 'barista' || activeShop) {
      return;
    }

    // Defer shop selection to next tick
    const timeoutId = setTimeout(() => {
      autoSelectShopForUser(user.id);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [user, activeShop, autoSelectShopForUser]);

  return null;
};