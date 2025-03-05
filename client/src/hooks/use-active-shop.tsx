import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useQuery } from '@tanstack/react-query';
import { Shop } from '@shared/schema';
import { apiRequest } from "@/lib/queryClient";

interface ActiveShopState {
  activeShop: Shop | null;
  setActiveShop: (shop: Shop | null) => void;
}

// Create store with persistence
export const useActiveShop = create<ActiveShopState>()(
  persist(
    (set) => ({
      activeShop: null,
      setActiveShop: (shop) => set({ activeShop: shop }),
    }),
    {
      name: 'active-shop-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Hook to fetch user shops and manage active shop
export function useUserShops() {
  const setActiveShop = useActiveShop(state => state.setActiveShop);
  const activeShop = useActiveShop(state => state.activeShop);

  const { data: shops, isLoading, error } = useQuery<Shop[]>({
    queryKey: ['/api/user/shops'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/user/shops");
      if (!res.ok) {
        throw new Error("Failed to fetch user shops");
      }
      const data = await res.json();

      // Set default shop if needed
      if (data?.length > 0 && (!activeShop || !data.find(s => s.id === activeShop.id))) {
        setActiveShop(data[0]);
      }

      return data;
    },
  });

  return { shops, isLoading, error, setActiveShop, activeShop };
}