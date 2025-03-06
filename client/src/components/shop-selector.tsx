import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

interface ShopSelectorProps {
  value?: number;
  onChange: (shopId: number) => void;
}

export function ShopSelector({ value, onChange }: ShopSelectorProps) {
  const { user } = useAuth();

  const { data: shops, isLoading, error } = useQuery({
    queryKey: ["/api/user/shops"],
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading shops...</span>
      </div>
    );
  }

  if (error) {
    return <div>Error loading shops</div>;
  }

  if (!shops?.length) {
    return <div>No shops available</div>;
  }

  return (
    <Select
      value={value?.toString()}
      onValueChange={(val) => {
        onChange(parseInt(val));
      }}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select a shop" />
      </SelectTrigger>
      <SelectContent>
        {shops.map((shop: any) => (
          <SelectItem key={shop.id} value={shop.id.toString()}>
            {shop.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}