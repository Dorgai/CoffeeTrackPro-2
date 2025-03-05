import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useQuery } from '@tanstack/react-query';
import { Shop } from '@shared/schema';
import { apiRequest } from "@/lib/queryClient";

interface ActiveShopState {
  activeShop: Shop | null;
  userShops: Shop[];
  setActiveShop: (shop: Shop | null) => void;
  setUserShops: (shops: Shop[]) => void;
}

// Create store with persistence
export const useActiveShop = create<ActiveShopState>()(
  persist(
    (set) => ({
      activeShop: null,
      userShops: [],
      setActiveShop: (shop) => set({ activeShop: shop }),
      setUserShops: (shops) => set({ userShops: shops }),
    }),
    {
      name: 'active-shop-storage',
    }
  )
);

// Hook to fetch user shops
export function useUserShops() {
  const setUserShops = useActiveShop(state => state.setUserShops);
  const setActiveShop = useActiveShop(state => state.setActiveShop);
  const activeShop = useActiveShop(state => state.activeShop);

  const { data: shops, isLoading, error } = useQuery<Shop[]>({
    queryKey: ['/api/user/shops'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/user/shops");
      if (!res.ok) {
        const error = await res.text();
        throw new Error(`Failed to fetch user shops: ${error}`);
      }
      const data = await res.json();

      // Update shops in store
      setUserShops(data);

      // Set default shop if needed
      if (data && data.length > 0 && (!activeShop || !data.find(s => s.id === activeShop.id))) {
        setActiveShop(data[0]);
      }

      return data;
    },
  });

  return { shops, isLoading, error, setUserShops, setActiveShop, activeShop };
}