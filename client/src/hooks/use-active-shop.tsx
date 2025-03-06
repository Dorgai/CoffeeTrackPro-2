import { create } from 'zustand';
import { Shop } from '@shared/schema';
import { queryClient } from '@/lib/queryClient';

interface ActiveShopState {
  activeShop: Shop | null;
  setActiveShop: (shop: Shop | null) => void;
  clearActiveShop: () => void;
}

// Clear any existing persisted data
if (typeof window !== 'undefined') {
  localStorage.removeItem('active-shop');
}

export const useActiveShop = create<ActiveShopState>()((set) => ({
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
}));