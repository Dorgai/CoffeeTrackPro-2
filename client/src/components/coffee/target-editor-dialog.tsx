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
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TargetEditorDialogProps {
  shopId: number;
  coffeeId: number;
  coffeeName: string;
  currentTarget?: number;
  trigger?: React.ReactNode;
}

export function TargetEditorDialog({
  shopId,
  coffeeId,
  coffeeName,
  currentTarget = 0,
  trigger
}: TargetEditorDialogProps) {
  const [open, setOpen] = useState(false);
  const [desiredLargeBags, setDesiredLargeBags] = useState(currentTarget.toString());
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
      queryClient.invalidateQueries({ queryKey: ["/api/shops", shopId, "coffee-targets"] });
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
          <Button
            onClick={() => updateTargetMutation.mutate()}
            disabled={updateTargetMutation.isPending}
          >
            Save Target
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
