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
import { CoffeeLargeBagTarget, type GreenCoffee } from "@shared/schema";

interface TargetEditorDialogProps {
  coffee: GreenCoffee;
  onClose: () => void;
}

export function TargetEditorDialog({ coffee, onClose }: TargetEditorDialogProps) {
  const [open, setOpen] = useState(true);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current target
  const { data: currentTarget, isLoading } = useQuery<CoffeeLargeBagTarget>({
    queryKey: [`/api/shops/${coffee.shopId}/coffee/${coffee.id}/target`],
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
        `/api/shops/${coffee.shopId}/coffee/${coffee.id}/target`,
        { desiredLargeBags: parseInt(desiredLargeBags) }
      );
      if (!res.ok) throw new Error("Failed to update target");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/shops/${coffee.shopId}/coffee-targets`] });
      toast({
        title: "Target updated",
        description: `Updated target for ${coffee.name}`,
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

  const handleSave = async () => {
    try {
      await updateTargetMutation.mutateAsync({
        coffeeId: coffee.id,
        target: parseInt(desiredLargeBags),
      });
      onClose();
      toast.success("Target updated successfully");
    } catch (error) {
      toast.error("Failed to update target");
      console.error("Update error:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Set Target</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Target for {coffee.name}</DialogTitle>
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
            onClick={handleSave}
            disabled={updateTargetMutation.isPending || isLoading}
          >
            {updateTargetMutation.isPending ? "Saving..." : "Save Target"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}