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

  // Fetch all shops
  const { data: allShops, isLoading: loadingShops } = useQuery<Shop[]>({
    queryKey: ["/api/shops"],
  });

  // Fetch user's current shop assignments
  const { data: userShops, isLoading: loadingUserShops } = useQuery<number[]>({
    queryKey: ["/api/users", userId, "shops"],
    queryFn: async () => {
      console.log("Fetching shops for user:", userId);
      const response = await apiRequest("GET", `/api/users/${userId}/shops`);
      if (!response.ok) {
        throw new Error("Failed to fetch user's shops");
      }
      const data = await response.json();
      console.log("Received user shops:", data);
      return data;
    },
    onSettled: (data) => {
      console.log("Setting initial shop selection:", data);
      if (data) {
        setSelectedShops(data);
      }
    }
  });

  const assignShopsMutation = useMutation({
    mutationFn: async (shopIds: number[]) => {
      console.log("Assigning shops:", shopIds, "to user:", userId);
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
      console.error("Error assigning shops:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleToggleShop = (shopId: number) => {
    console.log("Toggling shop:", shopId);
    setSelectedShops(prev => {
      if (prev.includes(shopId)) {
        return prev.filter(id => id !== shopId);
      } else {
        return [...prev, shopId];
      }
    });
  };

  const handleSave = () => {
    console.log("Saving shop assignments:", selectedShops);
    assignShopsMutation.mutate(selectedShops);
  };

  const isLoading = loadingShops || loadingUserShops;

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
        ) : (
          <div className="space-y-4 py-4">
            {allShops?.map(shop => (
              <div key={shop.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`shop-${shop.id}`}
                  checked={selectedShops.includes(shop.id)}
                  onCheckedChange={() => handleToggleShop(shop.id)}
                />
                <Label htmlFor={`shop-${shop.id}`}>
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