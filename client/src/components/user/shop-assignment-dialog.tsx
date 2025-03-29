import { useQuery } from "@tanstack/react-query";
import { Shop } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Check, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Props {
  userId: number;
  username: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssignShops: (shopIds: number[]) => void;
}

export function ShopAssignmentDialog({
  userId,
  username,
  open,
  onOpenChange,
  onAssignShops,
}: Props) {
  const { toast } = useToast();

  // Fetch all available shops
  const { data: allShops = [], isLoading: loadingShops } = useQuery<Shop[]>({
    queryKey: ["/api/shops"],
    enabled: open,
  });

  // Fetch user's current shop assignments
  const { data: userShops = [], isLoading: loadingUserShops } = useQuery<Shop[]>({
    queryKey: ["/api/users", userId, "shops"],
    enabled: open && !!userId,
  });

  const isLoading = loadingShops || loadingUserShops;

  // Get the list of assigned shop IDs
  const assignedShopIds = userShops.map(shop => shop.id);

  // Handle shop assignment toggle
  const handleShopToggle = async (shopId: number) => {
    try {
      const newShopIds = assignedShopIds.includes(shopId)
        ? assignedShopIds.filter(id => id !== shopId)
        : [...assignedShopIds, shopId];
      
      onAssignShops(newShopIds);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update shop assignments",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Shop Access for {username}</DialogTitle>
          <DialogDescription>
            Select the shops that {username} should have access to:
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="py-4 space-y-3">
            {allShops.map((shop) => (
              <div
                key={shop.id}
                className={`p-3 rounded-lg border flex items-center justify-between ${
                  assignedShopIds.includes(shop.id)
                    ? "bg-primary/10 border-primary"
                    : "bg-muted/50"
                }`}
              >
                <div>
                  <div className="font-medium">{shop.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {shop.location}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleShopToggle(shop.id)}
                  className={assignedShopIds.includes(shop.id) ? "text-primary" : ""}
                >
                  {assignedShopIds.includes(shop.id) ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}