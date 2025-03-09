import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Shop } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";

interface Props {
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
}: Props) {
  const { toast } = useToast();
  const [selectedShops, setSelectedShops] = useState<number[]>([]);

  // Fetch all active shops
  const { data: shops = [], isLoading: loadingShops } = useQuery({
    queryKey: ["/api/shops"] as const,
    enabled: open,
    select: (data: Shop[]) => 
      data
        .filter(shop => shop.isActive)
        .sort((a, b) => a.name.localeCompare(b.name))
  });

  // Fetch user's current shop assignments
  useQuery({
    queryKey: ["/api/users", userId, "shops"] as const,
    enabled: open,
    onSuccess: (data: number[]) => {
      setSelectedShops(data);
    }
  });

  // Handle shop assignment mutation
  const assignShops = useMutation({
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
      onSuccess?.();
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

  // Toggle shop selection
  const toggleShop = (shopId: number) => {
    setSelectedShops(prev => 
      prev.includes(shopId)
        ? prev.filter(id => id !== shopId)
        : [...prev, shopId]
    );
  };

  // Handle save
  const handleSave = () => {
    assignShops.mutate(selectedShops);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Assign Shops to {username}</DialogTitle>
          <DialogDescription>
            Select the shops this user should have access to
          </DialogDescription>
        </DialogHeader>

        {loadingShops ? (
          <div className="flex justify-center py-6 flex-1">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : !shops.length ? (
          <div className="py-6 text-center text-muted-foreground flex-1">
            No active shops available
          </div>
        ) : (
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-2">
              {shops.map(shop => (
                <label
                  key={shop.id}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={selectedShops.includes(shop.id)}
                    onCheckedChange={() => toggleShop(shop.id)}
                  />
                  <div>
                    <div className="font-medium">{shop.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {shop.location}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="flex-shrink-0 mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={assignShops.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={assignShops.isPending || loadingShops}
          >
            {assignShops.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}