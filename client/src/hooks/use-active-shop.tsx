import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Shop } from '@shared/schema';
import { useAuth } from "./use-auth"; // Added import for useAuth
import { useEffect, useState } from "react";


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
      name: 'active-shop-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);


//ShopSelector Component (Illustrative - Needs further implementation based on actual code)
export const ShopSelector = () => {
  const { activeShop, setActiveShop } = useActiveShop();
  const { user } = useAuth(); // Access user authentication status
  const [shops, setShops] = useState<Shop[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchShops = async () => {
      try {
        const response = await fetch('/api/user/shops', {
          headers: {
            Authorization: `Bearer ${user?.token}`, // Add authorization header
          },
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || response.statusText);
        }
        const data = await response.json();
        setShops(data);
      } catch (err: any) {
        setError(err.message);
      }
    };

    if (user?.token) { // Only fetch shops if user is authenticated
      fetchShops();
    }
  }, [user]);

  // ... rest of the shop selector component implementation ...
};