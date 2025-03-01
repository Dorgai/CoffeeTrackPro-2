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

export function ShopSelector() {
  const { activeShop, setActiveShop } = useActiveShop();
  
  const { data: shops } = useQuery<Shop[]>({
    queryKey: ["/api/user/shops"],
  });

  if (!shops || shops.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Store className="h-4 w-4 text-muted-foreground" />
      <Select
        value={activeShop?.id.toString()}
        onValueChange={(value) => {
          const shop = shops.find((s) => s.id.toString() === value);
          setActiveShop(shop || null);
        }}
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
