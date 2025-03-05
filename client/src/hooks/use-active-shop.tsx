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
  // Aggressive data fetching strategy
  const queries = [
    {
      queryKey: ["/api/retail-inventory", shopId],
      refetchInterval: 3000, // More frequent updates
      staleTime: 0,
      refetchOnMount: "always",
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 3,
      retryDelay: 1000,
    },
    {
      queryKey: ["/api/orders", shopId],
      refetchInterval: 3000, // More frequent updates
      staleTime: 0,
      refetchOnMount: "always",
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 3,
      retryDelay: 1000,
    }
  ];

  // First invalidate all queries to force refetch
  await Promise.all(
    queries.map(query => 
      queryClient.invalidateQueries({ 
        queryKey: query.queryKey,
        refetchType: 'all'
      })
    )
  );

  // Then set up continuous fetching
  queries.forEach(query => {
    queryClient.prefetchQuery(query);
  });
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
