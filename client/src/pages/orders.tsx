import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Order } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function OrdersPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: async () => {
      const response = await fetch("/api/orders");
      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }
      return response.json();
    },
  });

  const filteredOrders = orders?.filter((order) =>
    order.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Orders</h1>
        <Button>New Order</Button>
      </div>
      <div className="flex items-center space-x-2">
        <Input
          placeholder="Search orders..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredOrders?.map((order) => (
          <div
            key={order.id}
            className="rounded-lg border bg-card text-card-foreground shadow-sm"
          >
            <div className="p-6">
              <h3 className="text-lg font-semibold">Order #{order.id}</h3>
              <p className="text-sm text-muted-foreground">
                Status: {order.status}
              </p>
              <p className="text-sm text-muted-foreground">
                Small Bags: {order.smallBags}
              </p>
              <p className="text-sm text-muted-foreground">
                Large Bags: {order.largeBags}
              </p>
              <p className="text-sm text-muted-foreground">
                Created: {new Date(order.createdAt || "").toLocaleDateString()}
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