import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RetailInventoryForm } from "./retail-inventory-form";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shopId: number;
  coffeeId: number;
  coffeeName: string;
  currentSmallBags: number;
  currentLargeBags: number;
  onSuccess?: () => void;
}

export function RetailInventoryFormDialog({
  open,
  onOpenChange,
  shopId,
  coffeeId,
  coffeeName,
  currentSmallBags,
  currentLargeBags,
  onSuccess,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Inventory</DialogTitle>
        </DialogHeader>
        <RetailInventoryForm
          shopId={shopId}
          coffeeId={coffeeId}
          currentSmallBags={currentSmallBags}
          currentLargeBags={currentLargeBags}
          coffeeName={coffeeName}
          onSuccess={onSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}
