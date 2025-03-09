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
import { Loader2 } from "lucide-react";

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
  // Fetch user's current shop assignments
  const { data: userShops = [], isLoading: loadingUserShops } = useQuery<Shop[]>({
    queryKey: ["/api/users", userId, "shops"],
    enabled: open && !!userId,
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
          <DialogTitle>Shop Access for {username}</DialogTitle>
          <DialogDescription>
            {username} has access to the following shops:
          </DialogDescription>
        </DialogHeader>

        {loadingUserShops ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="py-4 space-y-3">
            {userShops.map((shop) => (
              <div
                key={shop.id}
                className="p-3 rounded-lg bg-muted/50"
              >
                <div className="font-medium">{shop.name}</div>
                <div className="text-sm text-muted-foreground">
                  {shop.location}
                </div>
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