import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";

interface ShopSelectorProps {
  value?: number;
  onChange: (shopId: number) => void;
}

export function ShopSelector({ value, onChange }: ShopSelectorProps) {
  const { data: shops } = useQuery({
    queryKey: ["/api/shops"],
    queryFn: async () => {
      const res = await fetch("/api/shops");
      if (!res.ok) throw new Error("Failed to fetch shops");
      return res.json();
    },
  });

  return (
    <Select
      value={value?.toString()}
      onValueChange={(val) => {
        console.log("Shop selector value changed to:", val);
        onChange(parseInt(val));
      }}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select a shop" />
      </SelectTrigger>
      <SelectContent>
        {shops?.map((shop: any) => (
          <SelectItem key={shop.id} value={shop.id.toString()}>
            {shop.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
