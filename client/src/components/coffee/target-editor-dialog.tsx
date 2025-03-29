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
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GreenCoffee, CoffeeLargeBagTarget } from "@shared/schema";
import { toast } from "sonner";

interface TargetEditorDialogProps {
  coffee: GreenCoffee;
  onClose: () => void;
}

export function TargetEditorDialog({ coffee, onClose }: TargetEditorDialogProps) {
  const [target, setTarget] = useState<number>(0);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Fetch current target
    fetch(`/api/coffee/${coffee.id}/target`)
      .then((res) => res.json())
      .then((data: CoffeeLargeBagTarget) => {
        if (data) {
          setTarget(data.target);
        }
      })
      .catch((error) => {
        console.error("Error fetching target:", error);
      });
  }, [coffee.id]);

  const { mutateAsync: updateTarget } = useMutation({
    mutationFn: async (newTarget: number) => {
      const response = await fetch(`/api/coffee/${coffee.id}/target`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ target: newTarget }),
      });
      if (!response.ok) {
        throw new Error("Failed to update target");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coffee", coffee.id] });
      toast.success("Target updated successfully");
      onClose();
    },
    onError: (error) => {
      toast.error("Failed to update target");
      console.error("Error updating target:", error);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateTarget(target);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Large Bag Target</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="target">Target (Large Bags)</Label>
            <Input
              id="target"
              type="number"
              min="0"
              value={target}
              onChange={(e) => setTarget(Number(e.target.value))}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}