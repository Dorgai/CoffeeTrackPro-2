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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
            Currently assigned shops:
          </DialogDescription>
        </DialogHeader>

        {loadingUserShops ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2">
              {userShops.map((shop) => (
                <div
                  key={shop.id}
                  className="flex items-center p-3 rounded-lg border"
                >
                  <div>
                    <div className="font-medium">{shop.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {shop.location}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
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