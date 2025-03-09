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

  // Fetch all active shops
  const { data: allShops = [], isLoading: loadingShops } = useQuery<Shop[]>({
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

  // Get unassigned shops
  const unassignedShops = allShops.filter(
    shop => shop.isActive && !userShops.some(us => us.id === shop.id)
  );

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
          <div className="flex items-center justify-center flex-1">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden space-y-6 py-4">
            {/* Current Assignments */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium mb-2">Current Assignments</h4>
              <ScrollArea className="h-[200px] border rounded-md">
                <div className="p-4">
                  {userShops.length > 0 ? (
                    <div className="space-y-2">
                      {userShops.map((shop) => (
                        <div
                          key={shop.id}
                          className="flex items-center justify-between bg-muted/50 p-3 rounded-lg"
                        >
                          <div>
                            <div className="font-medium">{shop.name}</div>
                            <div className="text-sm text-muted-foreground">{shop.location}</div>
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
                    <div className="text-sm text-muted-foreground text-center py-4">
                      No shops currently assigned
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Available Shops */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium mb-2">Available Shops</h4>
              <ScrollArea className="h-[200px] border rounded-md">
                <div className="p-4">
                  {unassignedShops.length > 0 ? (
                    <div className="space-y-2">
                      {unassignedShops.map((shop) => (
                        <div
                          key={shop.id}
                          className="flex items-center justify-between border p-3 rounded-lg"
                        >
                          <div>
                            <div className="font-medium">{shop.name}</div>
                            <div className="text-sm text-muted-foreground">{shop.location}</div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newShopIds = [...userShops.map(s => s.id), shop.id];
                              assignShops.mutate(newShopIds);
                            }}
                          >
                            Add
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      No shops available for assignment
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}

        <DialogFooter className="flex-shrink-0 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}