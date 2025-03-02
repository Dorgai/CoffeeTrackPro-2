import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect as ReactuseEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CoffeeLargeBagTarget } from "@shared/schema";

interface TargetEditorDialogProps {
  shopId: number;
  coffeeId: number;
  coffeeName: string;
  trigger?: React.ReactNode;
}

export function TargetEditorDialog({
  shopId,
  coffeeId,
  coffeeName,
  trigger
}: TargetEditorDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current target
  const { data: currentTarget, isLoading } = useQuery<CoffeeLargeBagTarget>({
    queryKey: [`/api/shops/${shopId}/coffee/${coffeeId}/target`],
    enabled: open, // Only fetch when dialog is open
  });

  const [desiredLargeBags, setDesiredLargeBags] = useState(
    currentTarget?.desiredLargeBags.toString() || "0"
  );

  // Update target when currentTarget changes
  ReactuseEffect(() => {
    if (currentTarget) {
      setDesiredLargeBags(currentTarget.desiredLargeBags.toString());
    }
  }, [currentTarget]);

  const updateTargetMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "PATCH",
        `/api/shops/${shopId}/coffee/${coffeeId}/target`,
        { desiredLargeBags: parseInt(desiredLargeBags) }
      );
      if (!res.ok) throw new Error("Failed to update target");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/shops/${shopId}/coffee-targets`] });
      toast({
        title: "Target updated",
        description: `Updated target for ${coffeeName}`,
      });
      setOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to update target",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">Set Target</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Target for {coffeeName}</DialogTitle>
          <DialogDescription>
            Set the desired number of large bags (1kg) for this coffee.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {isLoading ? (
            <div className="text-center text-muted-foreground">Loading current target...</div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="largeBags">Desired Large Bags</Label>
              <Input
                id="largeBags"
                type="number"
                min="0"
                value={desiredLargeBags}
                onChange={(e) => setDesiredLargeBags(e.target.value)}
              />
            </div>
          )}
          <Button
            onClick={() => updateTargetMutation.mutate()}
            disabled={updateTargetMutation.isPending || isLoading}
          >
            {updateTargetMutation.isPending ? "Saving..." : "Save Target"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}