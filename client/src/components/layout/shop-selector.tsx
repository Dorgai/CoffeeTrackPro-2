import { useQuery } from "@tanstack/react-query";
import { Shop } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActiveShop } from "@/hooks/use-active-shop";
import { Store } from "lucide-react";

interface ShopSelectorProps {
  value?: number | null;
  onChange?: (shopId: number | null) => void;
  className?: string;
}

export function ShopSelector({ value, onChange, className }: ShopSelectorProps) {
  const { activeShop, setActiveShop } = useActiveShop();

  const { data: shops } = useQuery<Shop[]>({
    queryKey: ["/api/user/shops"],
  });

  if (!shops || shops.length === 0) {
    return null;
  }

  const handleChange = (value: string) => {
    const shopId = value ? parseInt(value, 10) : null;
    const shop = shops.find((s) => s.id === shopId);

    // Call both the controlled and context handlers
    if (onChange) {
      onChange(shopId);
    }
    setActiveShop(shop || null);
  };

  // Use controlled value if provided, otherwise use context
  const currentValue = value !== undefined ? value : activeShop?.id;

  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <Store className="h-4 w-4 text-muted-foreground" />
      <Select
        value={currentValue?.toString()}
        onValueChange={handleChange}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select a shop" />
        </SelectTrigger>
        <SelectContent>
          {shops.map((shop) => (
            <SelectItem key={shop.id} value={shop.id.toString()}>
              {shop.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}