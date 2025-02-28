
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { GreenCoffee } from "@shared/schema";

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
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// Define schema for retail inventory form
const retailInventorySchema = z.object({
  greenCoffeeId: z.number(),
  smallBags: z.coerce.number().min(0, "Cannot be negative"),
  largeBags: z.coerce.number().min(0, "Cannot be negative"),
  shopId: z.number().optional(),
});

type InventoryFormValues = z.infer<typeof retailInventorySchema>;

export function RetailInventoryForm({
  coffee,
  currentInventory,
  onSuccess,
}: {
  coffee: GreenCoffee;
  currentInventory?: {
    smallBags: number;
    largeBags: number;
    id?: number;
  };
  onSuccess?: () => void;
}) {
  const { toast } = useToast();

  const form = useForm<InventoryFormValues>({
    resolver: zodResolver(retailInventorySchema),
    defaultValues: {
      greenCoffeeId: coffee.id,
      smallBags: currentInventory?.smallBags || 0,
      largeBags: currentInventory?.largeBags || 0,
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: InventoryFormValues) => {
      return apiRequest("/api/retail-inventory", {
        method: "POST",
        data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/retail-inventory"] });
      if (onSuccess) onSuccess();
    },
  });

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      await updateMutation.mutateAsync(data);
      toast({
        title: "Inventory Updated",
        description: "Retail inventory has been updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update inventory",
        variant: "destructive",
      });
    }
  });

  return (
    <>
      <CardHeader>
        <CardTitle>Update Inventory</CardTitle>
        <CardDescription>
          Update current inventory for {coffee.name}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <input type="hidden" name="greenCoffeeId" value={coffee.id} />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="smallBags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Small Bags (200g)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
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
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <Button 
              type="submit" 
              className="w-full" 
              disabled={updateMutation.isPending}
            >
              Update Inventory
            </Button>
          </form>
        </Form>
      </CardContent>
    </>
  );
}
