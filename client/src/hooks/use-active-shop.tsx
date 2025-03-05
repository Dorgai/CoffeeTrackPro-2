import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Shop } from '@shared/schema';
import { useEffect } from 'react';

interface ActiveShopState {
  activeShop: Shop | null;
  setActiveShop: (shop: Shop | null) => void;
}

export const useActiveShop = create<ActiveShopState>()(
  persist(
    (set) => ({
      activeShop: null,
      setActiveShop: (shop) => set({ activeShop: shop }),
    }),
    {
      name: 'active-shop',
    }
  )
);


// Note: The ShopSelector component is now defined in src/components/layout/shop-selector.tsx