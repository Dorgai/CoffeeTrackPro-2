import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useActiveShop } from "@/hooks/use-active-shop";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn, formatDate } from "@/lib/utils";
import { Loader2, Package, Edit } from "lucide-react";
import { RetailInventoryFormDialog } from "./retail-inventory-form-dialog";
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
import { Button } from "@/components/ui/button";
import { StockStatus } from "./stock-status";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  onEditSuccess?: () => void;
}

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

export function RetailInventoryTable({ onEditSuccess }: Props) {
  const { user } = useAuth();
  const { activeShop } = useActiveShop();
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [open, setOpen] = useState(false);

  const canEditInventory = ["owner", "shopManager", "retailOwner", "barista"].includes(user?.role || "");

  // Effect to invalidate queries when shop changes
  useEffect(() => {
    if (activeShop?.id) {
      queryClient.invalidateQueries({ queryKey: ["/api/retail-inventory", activeShop.id] });
    }
  }, [activeShop?.id]);

  const { data: inventory, isLoading: loadingInventory } = useQuery<InventoryItem[]>({
    queryKey: ["/api/retail-inventory", activeShop?.id],
    queryFn: async () => {
      if (!activeShop?.id) return [];
      const res = await apiRequest("GET", `/api/retail-inventory?shopId=${activeShop.id}`);
      if (!res.ok) throw new Error("Failed to fetch inventory");
      return res.json();
    },
    enabled: Boolean(user && activeShop?.id),
    staleTime: 0, // Always fetch fresh data when shop changes
    refetchOnWindowFocus: true,
  });

  if (!user) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] w-full" />
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

  if (loadingInventory) {
    return (
      <div className="flex items-center justify-center p-8">
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
            No coffee inventory found for {activeShop.name}
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
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Current Inventory</CardTitle>
          <CardDescription>
            Manage coffee stock levels for {activeShop.name}
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
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedItem(item);
                          setOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedItem && (
        <RetailInventoryFormDialog
          open={open}
          onOpenChange={setOpen}
          shopId={activeShop.id}
          coffeeId={selectedItem.coffeeId}
          coffeeName={selectedItem.coffeeName}
          currentSmallBags={selectedItem.smallBags}
          currentLargeBags={selectedItem.largeBags}
          onSuccess={() => {
            setOpen(false);
            if (onEditSuccess) onEditSuccess();
          }}
        />
      )}
    </div>
  );
}