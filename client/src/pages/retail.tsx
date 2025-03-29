import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RetailInventory } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function RetailPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: inventories, isLoading } = useQuery<RetailInventory[]>({
    queryKey: ["retail-inventory"],
    queryFn: async () => {
      const response = await fetch("/api/retail/inventory");
      if (!response.ok) {
        throw new Error("Failed to fetch retail inventory");
      }
      return response.json();
    },
  });

  const filteredInventories = inventories?.filter((inventory) =>
    inventory.notes?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Retail</h1>
        <Button>Update Inventory</Button>
      </div>
      <div className="flex items-center space-x-2">
        <Input
          placeholder="Search inventory..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredInventories?.map((inventory) => (
          <div
            key={inventory.id}
            className="rounded-lg border bg-card text-card-foreground shadow-sm"
          >
            <div className="p-6">
              <h3 className="text-lg font-semibold">Inventory #{inventory.id}</h3>
              <p className="text-sm text-muted-foreground">
                Small Bags: {inventory.smallBags}
              </p>
              <p className="text-sm text-muted-foreground">
                Large Bags: {inventory.largeBags}
              </p>
              <p className="text-sm text-muted-foreground">
                Last Updated: {new Date(inventory.updatedAt || "").toLocaleDateString()}
              </p>
              <p className="text-sm text-muted-foreground">
                Update Type: {inventory.updateType}
              </p>
            </div>
            <div className="p-6 pt-0">
              <Button variant="outline">View Details</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}