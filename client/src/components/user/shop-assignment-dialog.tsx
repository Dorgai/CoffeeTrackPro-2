import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Shop } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface Props {
  userId: number;
  username: string;
  userRole: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ShopAssignmentDialog({
  userId,
  username,
  userRole,
  open,
  onOpenChange,
  onSuccess
}: Props) {
  const { toast } = useToast();
  const [selectedShopId, setSelectedShopId] = useState<string>("");

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
        description: "Shop assignment updated successfully",
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

  // If user is roasteryOwner, show informational message
  if (userRole === "roasteryOwner") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Shop Access Information</DialogTitle>
            <DialogDescription>
              As a Roastery Owner, {username} automatically has access to all active shops.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Assign Shop to {username}</DialogTitle>
          <DialogDescription>
            Select the shop this user should have access to
          </DialogDescription>
        </DialogHeader>

        {(loadingShops || loadingUserShops) ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="py-4">
            <RadioGroup
              value={selectedShopId}
              onValueChange={setSelectedShopId}
              className="space-y-2"
            >
              {allShops
                .filter(shop => shop.isActive)
                .map(shop => (
                  <div
                    key={shop.id}
                    className="flex items-center space-x-3 p-3 rounded-lg border"
                  >
                    <RadioGroupItem value={shop.id.toString()} id={`shop-${shop.id}`} />
                    <Label htmlFor={`shop-${shop.id}`} className="flex-1 cursor-pointer">
                      <div className="font-medium">{shop.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {shop.location}
                      </div>
                    </Label>
                  </div>
                ))}
            </RadioGroup>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (selectedShopId) {
                assignShops.mutate([parseInt(selectedShopId)]);
              }
            }}
            disabled={!selectedShopId || assignShops.isPending}
          >
            {assignShops.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}