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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Inventory for {coffeeName}</DialogTitle>
        </DialogHeader>
        <RetailInventoryForm
          shopId={shopId}
          coffeeId={coffeeId}
          coffeeName={coffeeName}
          currentSmallBags={currentSmallBags}
          currentLargeBags={currentLargeBags}
          onSuccess={onSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}