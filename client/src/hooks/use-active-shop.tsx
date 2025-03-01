import { create } from 'zustand';
import { Shop } from '@shared/schema';

interface ActiveShopState {
  activeShop: Shop | null;
  setActiveShop: (shop: Shop | null) => void;
}

export const useActiveShop = create<ActiveShopState>((set) => ({
  activeShop: null,
  setActiveShop: (shop) => set({ activeShop: shop }),
}));
