import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Shop } from '@shared/schema';
import { queryClient } from '@/lib/queryClient';

interface ActiveShopState {
  activeShop: Shop | null;
  setActiveShop: (shop: Shop | null) => void;
  clearActiveShop: () => void;
}

export const useActiveShop = create<ActiveShopState>()(
  persist(
    (set) => ({
      activeShop: null,
      setActiveShop: (shop) => {
        set({ activeShop: shop });
        if (shop) {
          // Invalidate and refetch relevant queries
          queryClient.invalidateQueries({ queryKey: ["/api/retail-inventory", shop.id] });
          queryClient.invalidateQueries({ queryKey: ["/api/orders", shop.id] });
          queryClient.invalidateQueries({ queryKey: ["/api/green-coffee"] });
        }
      },
      clearActiveShop: () => set({ activeShop: null })
    }),
    {
      name: 'active-shop',
      // Only persist the essential shop data
      partialize: (state) => ({
        activeShop: state.activeShop ? {
          id: state.activeShop.id,
          name: state.activeShop.name,
          location: state.activeShop.location,
          isActive: state.activeShop.isActive,
          desiredSmallBags: state.activeShop.desiredSmallBags,
          desiredLargeBags: state.activeShop.desiredLargeBags,
        } : null
      })
    }
  )
);