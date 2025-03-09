import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useActiveShop, useAutoSelectShop } from "@/hooks/use-active-shop";
import { apiRequest } from "@/lib/queryClient";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StockStatus } from "./stock-status";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "@/components/ui/accordion";


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
  updateType: "manual" | "dispatch" | null;
  notes: string | null;
};

export function RetailInventoryTable() {
  const { user } = useAuth();
  const { activeShop } = useActiveShop();
  const { toast } = useToast();
  useAutoSelectShop(); // Auto-select shop for barista users

  // Check if user can edit inventory
  const canEditInventory = ["owner", "shopManager", "retailOwner", "barista"].includes(user?.role || "");

  // Fetch inventory data
  const { data: inventory, isLoading: loadingInventory } = useQuery<InventoryItem[]>({
    queryKey: ["/api/retail-inventory", activeShop?.id],
    queryFn: async () => {
      console.log("Fetching retail inventory for shop:", activeShop?.id);

      if (!activeShop?.id) {
        console.log("No active shop selected");
        return [];
      }

      const res = await apiRequest("GET", `/api/retail-inventory?shopId=${activeShop.id}`);
      if (!res.ok) {
        throw new Error("Failed to fetch inventory");
      }

      const data = await res.json();
      console.log("Fetched inventory data:", data);
      return data;
    },
    enabled: Boolean(user && activeShop?.id)
  });

  if (loadingInventory) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!activeShop?.id) {
    return (
      <Alert>
        <AlertDescription>
          Please select a shop to view and manage inventory.
        </AlertDescription>
      </Alert>
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Current Inventory</CardTitle>
        <CardDescription>
          Manage coffee stock levels for {activeShop.shopName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Coffee</TableHead>
              <TableHead>Producer</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Stock Levels</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead>Updated By</TableHead>
              <TableHead>Method</TableHead>
              {canEditInventory && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {inventory.map((item) => (
              <TableRow key={`${item.shopId}-${item.coffeeId}`}>
                <TableCell className="font-medium">{item.coffeeName}</TableCell>
                <TableCell>{item.producer}</TableCell>
                <TableCell>{item.grade}</TableCell>
                <TableCell>
                  <StockStatus
                    smallBags={item.smallBags}
                    largeBags={item.largeBags}
                    isVertical={false}
                  />
                </TableCell>
                <TableCell>{formatDate(item.updatedAt)}</TableCell>
                <TableCell>{item.updatedByUsername}</TableCell>
                <TableCell>
                  <span className={cn(
                    "capitalize px-2 py-1 rounded-full text-xs",
                    item.updateType === "manual"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-green-100 text-green-700"
                  )}>
                    {item.updateType || "manual"}
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
                          shopId={activeShop.id}
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
      </CardContent>
    </Card>
  );
}