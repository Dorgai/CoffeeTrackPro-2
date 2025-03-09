import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Shop } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface ShopAssignmentDialogProps {
  userId: number;
  username: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ShopAssignmentDialog({
  userId,
  username,
  open,
  onOpenChange,
  onSuccess
}: ShopAssignmentDialogProps) {
  const { toast } = useToast();
  const [selectedShops, setSelectedShops] = useState<number[]>([]);

  // Fetch all active shops
  const { data: shops, isLoading: loadingShops } = useQuery<Shop[]>({
    queryKey: ["/api/shops"],
    enabled: open,
    select: (data) => data.filter(shop => shop.isActive).sort((a, b) => a.name.localeCompare(b.name))
  });

  // Fetch user's current shop assignments
  const { isLoading: loadingUserShops } = useQuery<number[]>({
    queryKey: ["/api/users", userId, "shops"],
    enabled: open,
    onSuccess: (data) => {
      setSelectedShops(data || []);
    }
  });

  // Mutation for assigning shops
  const assignShopsMutation = useMutation({
    mutationFn: async (shopIds: number[]) => {
      const response = await apiRequest(
        "POST",
        `/api/users/${userId}/shops`,
        { shopIds }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to assign shops");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId, "shops"] });
      toast({
        title: "Success",
        description: "Shop assignments updated successfully",
      });
      if (onSuccess) onSuccess();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isLoading = loadingShops || loadingUserShops;

  const handleToggleShop = (shopId: number) => {
    setSelectedShops(prev => {
      if (prev.includes(shopId)) {
        return prev.filter(id => id !== shopId);
      } else {
        return [...prev, shopId];
      }
    });
  };

  const handleSave = () => {
    assignShopsMutation.mutate(selectedShops);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Shops to {username}</DialogTitle>
          <DialogDescription>
            Select the shops this user should have access to
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : !shops?.length ? (
          <div className="py-4 text-center text-muted-foreground">
            No active shops available
          </div>
        ) : (
          <div className="grid gap-4 py-4 max-h-[400px] overflow-y-auto">
            {shops.map(shop => (
              <div key={shop.id} className="flex items-center space-x-2 p-2 hover:bg-muted rounded-lg">
                <Checkbox
                  id={`shop-${shop.id}`}
                  checked={selectedShops.includes(shop.id)}
                  onCheckedChange={() => handleToggleShop(shop.id)}
                />
                <Label htmlFor={`shop-${shop.id}`} className="flex-1 cursor-pointer">
                  {shop.name}
                  <span className="text-muted-foreground ml-2">
                    ({shop.location})
                  </span>
                </Label>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={assignShopsMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={assignShopsMutation.isPending || isLoading}
          >
            {assignShopsMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save Assignments
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}