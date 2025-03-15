import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useActiveShop } from "@/hooks/use-active-shop";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Define schema for retail inventory form
const retailInventorySchema = z.object({
  shopId: z.number(),
  greenCoffeeId: z.number(),
  smallBags: z.coerce.number().min(0, "Cannot be negative"),
  largeBags: z.coerce.number().min(0, "Cannot be negative"),
  notes: z.string().optional(),
});

type InventoryFormValues = z.infer<typeof retailInventorySchema>;

interface RetailInventoryFormProps {
  shopId?: number;
  coffeeId: number;
  currentSmallBags: number;
  currentLargeBags: number;
  coffeeName: string;
  onSuccess?: () => void;
}

export function RetailInventoryForm({
  shopId: propShopId,
  coffeeId,
  currentSmallBags,
  currentLargeBags,
  coffeeName,
  onSuccess,
}: RetailInventoryFormProps) {
  const { toast } = useToast();
  const { activeShop } = useActiveShop();

  // Use either the prop shopId or activeShop.id
  const shopId = propShopId ?? activeShop?.id;

  // Early return if no shop is selected
  if (!shopId) {
    return (
      <Alert>
        <AlertDescription>
          Please select a shop to edit inventory.
        </AlertDescription>
      </Alert>
    );
  }

  const form = useForm<InventoryFormValues>({
    resolver: zodResolver(retailInventorySchema),
    defaultValues: {
      shopId,
      greenCoffeeId: coffeeId,
      smallBags: currentSmallBags,
      largeBags: currentLargeBags,
      notes: "",
    },
  });

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      if (!data.shopId) {
        throw new Error("Shop ID is required");
      }

      console.log("Submitting inventory update:", {
        ...data,
        updateType: "manual"
      });

      const response = await apiRequest("POST", "/api/retail-inventory", {
        ...data,
        updateType: "manual",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update inventory");
      }

      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ["/api/retail-inventory"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/retail-inventory/history"] });

      toast({
        title: "Success",
        description: "Inventory updated successfully",
      });

      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error updating inventory:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update inventory",
        variant: "destructive",
      });
    }
  });

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">{coffeeName}</h3>
      </div>

      <Form {...form}>
        <form onSubmit={onSubmit}>
          <input type="hidden" name="shopId" value={shopId} />
          <input type="hidden" name="greenCoffeeId" value={coffeeId} />

          <div className="grid grid-cols-2 gap-4 mb-4">
            <FormField
              control={form.control}
              name="smallBags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Small Bags (200g)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="largeBags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Large Bags (1kg)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Add any notes about this inventory update"
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button 
            type="submit" 
            className="w-full mt-4"
            disabled={form.formState.isSubmitting}
          >
            Update Inventory
          </Button>
        </form>
      </Form>
    </div>
  );
}