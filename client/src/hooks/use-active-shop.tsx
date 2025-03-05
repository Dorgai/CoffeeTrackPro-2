
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Shop } from '@shared/schema';

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
