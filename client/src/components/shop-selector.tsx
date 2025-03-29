import { type Shop } from "@shared/schema";

interface ShopSelectorProps {
  shops: Shop[];
  selectedShopId: number | null;
  onSelectShop: (shopId: number) => void;
}

export function ShopSelector({ shops, selectedShopId, onSelectShop }: ShopSelectorProps) {
  return (
    <div className="flex items-center space-x-2">
      <select
        value={selectedShopId || ""}
        onChange={(e) => onSelectShop(Number(e.target.value))}
        className="rounded-md border border-gray-300 px-3 py-2"
      >
        <option value="">Select a shop</option>
        {shops.map((shop) => (
          <option key={shop.id} value={shop.id}>
            {shop.name}
          </option>
        ))}
      </select>
    </div>
  );
}