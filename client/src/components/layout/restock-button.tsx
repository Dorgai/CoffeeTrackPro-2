import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useActiveShop } from "@/hooks/use-active-shop";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import StockProgress from "@/components/stock-progress";

export function RestockButton() {
  const { activeShop } = useActiveShop();
  const { toast } = useToast();
  const [showInventory, setShowInventory] = useState(false);

  // Fetch current inventory for the active shop
  const { data: inventory } = useQuery({
    queryKey: ["/api/retail-inventory", activeShop?.id],
    enabled: !!activeShop?.id,
  });

  const handleRestock = async () => {
    if (!activeShop?.id) return;

    try {
      const res = await apiRequest("POST", `/api/retail-inventory/${activeShop.id}/restock`);
      if (!res.ok) {
        throw new Error("Failed to restock inventory");
      }

      queryClient.invalidateQueries({ queryKey: ["/api/retail-inventory"] });

      toast({
        title: "Success",
        description: "Inventory has been restocked",
      });

      // Show inventory dialog after successful restock
      setShowInventory(true);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to restock inventory",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleRestock}
        disabled={!activeShop}
        className="gap-2"
      >
        <RefreshCw className="h-4 w-4" />
        Restock
      </Button>

      <Dialog open={showInventory} onOpenChange={setShowInventory}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Current Inventory</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {activeShop && (
              <>
                <StockProgress
                  current={inventory?.smallBags || 0}
                  desired={activeShop.desiredSmallBags || 20}
                  label="Small Bags (200g)"
                />
                <StockProgress
                  current={inventory?.largeBags || 0}
                  desired={activeShop.desiredLargeBags || 10}
                  label="Large Bags (1kg)"
                />
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}