import { create } from 'zustand';
import { useQuery } from '@tanstack/react-query';
import { Shop } from '@shared/schema';

interface ActiveShopState {
  activeShop: Shop | null;
  userShops: Shop[];
  setActiveShop: (shop: Shop | null) => void;
  setUserShops: (shops: Shop[]) => void;
}

export const useActiveShop = create<ActiveShopState>((set) => ({
  activeShop: null,
  userShops: [],
  setActiveShop: (shop) => set({ activeShop: shop }),
  setUserShops: (shops) => set({ userShops: shops }),
}));

// Hook to fetch user shops
export function useUserShops() {
  const setUserShops = useActiveShop(state => state.setUserShops);
  const setActiveShop = useActiveShop(state => state.setActiveShop);

  return useQuery({
    queryKey: ['/api/user/shops'],
    onSuccess: (data) => {
      setUserShops(data);
      // If there's only one shop, set it as active
      if (data.length === 1) {
        setActiveShop(data[0]);
      }
    },
  });
}