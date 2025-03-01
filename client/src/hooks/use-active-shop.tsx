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
  const activeShop = useActiveShop(state => state.activeShop);

  return useQuery<Shop[]>({
    queryKey: ['/api/user/shops'],
    onSuccess: (data) => {
      setUserShops(data);
      // If there's only one shop or no active shop is selected, set the first shop as active
      if (data.length === 1 || (!activeShop && data.length > 0)) {
        setActiveShop(data[0]);
      }
    },
  });
}