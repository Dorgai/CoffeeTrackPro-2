import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useActiveShop } from "@/hooks/use-active-shop";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn, formatDate } from "@/lib/utils";
import { Loader2, Package, Edit } from "lucide-react";
import { RetailInventoryForm } from "./retail-inventory-form";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type InventoryItem = {
  id: number;
  shopId: number;
  shopName: string;
  shopLocation: string;
  coffeeId: number;
  coffeeName: string;
  producer: string;
  grade: string;
  smallBags: number;
  largeBags: number;
  updatedAt: string;
  updatedById: number;
  updatedByUsername: string;
  updateType: "manual" | "dispatch";
  notes: string | null;
};

type HistoryItem = {
  id: number;
  shopId: number;
  greenCoffeeId: number;
  previousSmallBags: number;
  previousLargeBags: number;
  newSmallBags: number;
  newLargeBags: number;
  updatedAt: string;
  updateType: "manual" | "dispatch";
  updatedByUsername: string;
  coffeeName: string;
  notes: string | null;
};

export function RetailInventoryTable() {
  const { user } = useAuth();
  const { activeShop } = useActiveShop();
  const { toast } = useToast();

  // Check if user can edit inventory
  const canEditInventory = ["owner", "shopManager", "retailOwner", "barista"].includes(user?.role || "");

  const { data: inventory, isLoading: loadingInventory } = useQuery<InventoryItem[]>({
    queryKey: ["/api/retail-inventory", activeShop?.id],
    queryFn: async () => {
      console.log("Fetching retail inventory for shop:", activeShop?.id);
      const url = activeShop?.id ? `/api/retail-inventory?shopId=${activeShop.id}` : "/api/retail-inventory";
      const res = await apiRequest("GET", url);
      if (!res.ok) {
        throw new Error("Failed to fetch inventory");
      }
      return res.json();
    },
    enabled: Boolean(user)
  });

  const { data: history, isLoading: loadingHistory } = useQuery<HistoryItem[]>({
    queryKey: ["/api/retail-inventory/history", activeShop?.id],
    queryFn: async () => {
      const url = activeShop?.id
        ? `/api/retail-inventory/history?shopId=${activeShop.id}`
        : "/api/retail-inventory/history";
      const res = await apiRequest("GET", url);
      if (!res.ok) {
        throw new Error("Failed to fetch history");
      }
      return res.json();
    },
    enabled: Boolean(user)
  });

  if (loadingInventory || loadingHistory) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!inventory?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Inventory Data</CardTitle>
          <CardDescription>
            No coffee inventory found for the selected shop
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
            <Package className="h-12 w-12 mb-4" />
            <p>Start by adding inventory or processing orders</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const shopInventory = inventory.reduce<Record<number, InventoryItem[]>>((acc, item) => {
    if (!acc[item.shopId]) {
      acc[item.shopId] = [];
    }
    acc[item.shopId].push(item);
    return acc;
  }, {});

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentHistory = history?.filter(h => 
    new Date(h.updatedAt) > thirtyDaysAgo
  ) || [];

  return (
    <div className="space-y-8">
      {Object.entries(shopInventory).map(([shopId, items]) => {
        const shopHistory = recentHistory.filter(h => h.shopId === parseInt(shopId));
        const shop = items[0];

        return (
          <Card key={shopId}>
            <CardHeader>
              <CardTitle>{shop.shopName}</CardTitle>
              <CardDescription>{shop.shopLocation}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Coffee</TableHead>
                      <TableHead>Producer</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Small Bags (200g)</TableHead>
                      <TableHead>Large Bags (1kg)</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead>Updated By</TableHead>
                      <TableHead>Type</TableHead>
                      {canEditInventory && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={`${item.shopId}-${item.coffeeId}`}>
                        <TableCell className="font-medium">{item.coffeeName}</TableCell>
                        <TableCell>{item.producer}</TableCell>
                        <TableCell>{item.grade}</TableCell>
                        <TableCell>{item.smallBags}</TableCell>
                        <TableCell>{item.largeBags}</TableCell>
                        <TableCell>{formatDate(item.updatedAt)}</TableCell>
                        <TableCell>{item.updatedByUsername}</TableCell>
                        <TableCell>
                          <span className={cn(
                            "capitalize px-2 py-1 rounded-full text-xs",
                            item.updateType === "manual" 
                              ? "bg-blue-100 text-blue-700"
                              : "bg-green-100 text-green-700"
                          )}>
                            {item.updateType}
                          </span>
                        </TableCell>
                        {canEditInventory && (
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Update Inventory</DialogTitle>
                                </DialogHeader>
                                <RetailInventoryForm 
                                  shopId={item.shopId}
                                  coffeeId={item.coffeeId}
                                  currentSmallBags={item.smallBags}
                                  currentLargeBags={item.largeBags}
                                  coffeeName={item.coffeeName}
                                />
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {shopHistory.length > 0 && (
                  <Accordion type="single" collapsible>
                    <AccordionItem value="history">
                      <AccordionTrigger>
                        Recent Changes (Last 30 Days)
                      </AccordionTrigger>
                      <AccordionContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Coffee</TableHead>
                              <TableHead>Previous Stock</TableHead>
                              <TableHead>New Stock</TableHead>
                              <TableHead>Updated By</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Notes</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {shopHistory.map((h) => (
                              <TableRow key={h.id}>
                                <TableCell>{formatDate(h.updatedAt)}</TableCell>
                                <TableCell>{h.coffeeName}</TableCell>
                                <TableCell>
                                  {h.previousSmallBags} small, {h.previousLargeBags} large
                                </TableCell>
                                <TableCell>
                                  {h.newSmallBags} small, {h.newLargeBags} large
                                </TableCell>
                                <TableCell>{h.updatedByUsername}</TableCell>
                                <TableCell>
                                  <span className={cn(
                                    "capitalize px-2 py-1 rounded-full text-xs",
                                    h.updateType === "manual" 
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-green-100 text-green-700"
                                  )}>
                                    {h.updateType}
                                  </span>
                                </TableCell>
                                <TableCell>{h.notes || '-'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}