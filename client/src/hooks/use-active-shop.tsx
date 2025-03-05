import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Shop } from '@shared/schema';
import { queryClient } from '@/lib/queryClient';

interface ActiveShopState {
  activeShop: Shop | null;
  setActiveShop: (shop: Shop | null) => void;
  refreshShopData: (shopId: number) => void;
}

// Helper function to refresh shop data
const refreshShopData = async (shopId: number) => {
  await Promise.all([
    queryClient.invalidateQueries({ 
      queryKey: ["/api/retail-inventory", shopId],
      refetchType: 'active',
    }),
    queryClient.invalidateQueries({ 
      queryKey: ["/api/orders", shopId],
      refetchType: 'active',
    }),
    // Prefetch the data immediately
    queryClient.prefetchQuery({ 
      queryKey: ["/api/retail-inventory", shopId],
      staleTime: 0,
      refetchInterval: 5000, // Refresh every 5 seconds
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true
    }),
    queryClient.prefetchQuery({ 
      queryKey: ["/api/orders", shopId],
      staleTime: 0,
      refetchInterval: 5000, // Refresh every 5 seconds
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true
    })
  ]);
};

export const useActiveShop = create<ActiveShopState>()(
  persist(
    (set) => ({
      activeShop: null,
      setActiveShop: (shop) => {
        set({ activeShop: shop });
        if (shop) {
          refreshShopData(shop.id);
        }
      },
      refreshShopData: (shopId: number) => {
        refreshShopData(shopId);
      }
    }),
    {
      name: 'active-shop',
    }
  )
);