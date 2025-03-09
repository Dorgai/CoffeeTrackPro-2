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

export const useActiveShop = create<ActiveShopState>()(
  persist(
    (set, get) => ({
      activeShop: null,
      setActiveShop: (shop) => {
        console.log("Setting active shop:", shop);
        set({ activeShop: shop });
        if (shop) {
          // Only invalidate queries if shop changes
          queryClient.invalidateQueries({ queryKey: ["/api/retail-inventory", shop.id] });
          queryClient.invalidateQueries({ queryKey: ["/api/orders", shop.id] });
        }
      },
      clearActiveShop: () => {
        console.log("Clearing active shop");
        set({ activeShop: null });
      },
      autoSelectShopForUser: async (userId: number) => {
        try {
          // Add performance logging
          const startTime = performance.now();
          console.log("Auto-selecting shop for user:", userId);

          const response = await apiRequest("GET", "/api/user/shops");
          if (!response.ok) {
            throw new Error("Failed to fetch user shops");
          }

          const shops: Shop[] = await response.json();
          console.log("User shops:", shops);

          // Only auto-select if user has exactly one shop
          if (shops.length === 1) {
            get().setActiveShop(shops[0]);
          } else {
            get().clearActiveShop();
          }

          const endTime = performance.now();
          console.log(`Shop selection took ${endTime - startTime}ms`);
        } catch (error) {
          console.error("Error auto-selecting shop:", error);
          get().clearActiveShop();
        }
      }
    }),
    {
      name: 'active-shop-storage',
      skipHydration: true // Skip initial hydration to prevent SSR issues
    }
  )
);

// Hook to auto-select shop for barista users
export const useAutoSelectShop = () => {
  const { user } = useAuth();
  const autoSelectShopForUser = useActiveShop(state => state.autoSelectShopForUser);
  const activeShop = useActiveShop(state => state.activeShop);

  useEffect(() => {
    let mounted = true;

    const initializeShop = async () => {
      if (user && !activeShop && user.role === 'barista' && mounted) {
        console.log("Attempting to auto-select shop for barista:", user.id);
        await autoSelectShopForUser(user.id);
      }
    };

    // Defer the shop selection to not block initial render
    setTimeout(initializeShop, 0);

    return () => {
      mounted = false;
    };
  }, [user, activeShop, autoSelectShopForUser]);

  return null;
};