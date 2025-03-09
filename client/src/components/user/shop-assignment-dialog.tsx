import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
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
  const { data: shops = [], isLoading: loadingShops } = useQuery<Shop[]>({
    queryKey: ["/api/shops"],
    enabled: open,
  });

  // Fetch user's current shop assignments
  const { data: userShops = [], isLoading: loadingUserShops } = useQuery<Shop[]>({
    queryKey: ["/api/users", userId, "shops"],
    enabled: open && !!userId,
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

  // Handle save
  const handleSave = () => {
    assignShops.mutate(selectedShops);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Manage Shop Access for {username}</DialogTitle>
          <DialogDescription>
            Select the shops this user should have access to
          </DialogDescription>
        </DialogHeader>

        {(loadingShops || loadingUserShops) ? (
          <div className="flex justify-center py-6 flex-1">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4 pt-4 flex-1 overflow-hidden">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Current Assignments</h4>
              <ScrollArea className="h-[200px] rounded-md border">
                {userShops.length > 0 ? (
                  <div className="space-y-2 p-4">
                    {userShops.map((shop) => (
                      <div
                        key={shop.id}
                        className="flex items-center justify-between bg-muted p-2 rounded"
                      >
                        <div>
                          <span className="font-medium">{shop.name}</span>
                          <div className="text-xs text-muted-foreground">
                            {shop.location}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const updatedShopIds = userShops
                              .filter((s) => s.id !== shop.id)
                              .map((s) => s.id);
                            assignShops.mutate(updatedShopIds);
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-sm text-muted-foreground">
                    No shops currently assigned
                  </div>
                )}
              </ScrollArea>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Available Shops</h4>
              <ScrollArea className="h-[200px] rounded-md border">
                {shops.length ? (
                  <div className="space-y-2 p-4">
                    {shops
                      .filter((shop) =>
                        shop.isActive &&
                        !userShops.some((us) => us.id === shop.id)
                      )
                      .map((shop) => (
                        <div
                          key={shop.id}
                          className="flex items-center justify-between p-2 border rounded"
                        >
                          <div>
                            <span className="font-medium">{shop.name}</span>
                            <div className="text-xs text-muted-foreground">
                              {shop.location}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newShopIds = [
                                ...userShops.map((s) => s.id),
                                shop.id
                              ];
                              assignShops.mutate(newShopIds);
                            }}
                          >
                            Add
                          </Button>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="p-4 text-sm text-muted-foreground">
                    No shops available
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        )}

        <DialogFooter className="flex-shrink-0 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}