import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { greenCoffee, coffeeGrades } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useActiveShop } from "@/hooks/use-active-shop";
import { ShopSelector } from "@/components/layout/shop-selector";
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
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type GreenCoffee = typeof greenCoffee.$inferSelect;

const insertGreenCoffeeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  producer: z.string().min(1, "Producer is required"),
  country: z.string().min(1, "Country is required"),
  currentStock: z.coerce.number().min(0, "Current stock must be 0 or greater"),
  minThreshold: z.coerce.number().min(0, "Minimum threshold must be 0 or greater"),
  grade: z.enum(coffeeGrades),
  isActive: z.boolean().default(true)
});

type FormValues = z.infer<typeof insertGreenCoffeeSchema>;

export function GreenCoffeeForm({
  onSuccess,
  coffee,
}: {
  onSuccess?: () => void;
  coffee?: GreenCoffee;
}) {
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(insertGreenCoffeeSchema),
    defaultValues: coffee || {
      name: "",
      producer: "",
      country: "",
      currentStock: 0,
      minThreshold: 0,
      grade: "Specialty",
      isActive: true,
    },
  });

  const createGreenCoffeeMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const res = await apiRequest("POST", "/api/green-coffee", data);
      if (!res.ok) {
        throw new Error(await res.text() || "Failed to create green coffee");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/green-coffee"] });
      if (onSuccess) onSuccess();
      toast({
        title: "Success",
        description: "Green coffee has been created",
      });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = form.handleSubmit(async (data) => {
    try {
      const formData = {
        ...data,
        currentStock: Number(data.currentStock),
        minThreshold: Number(data.minThreshold),
      };
      await createGreenCoffeeMutation.mutateAsync(formData);
      onSuccess?.();
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{coffee ? "Edit Green Coffee" : "Add New Green Coffee"}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="producer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Producer</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currentStock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Stock (kg)</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="minThreshold"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Minimum Threshold (kg)</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="grade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Grade</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a grade" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {coffeeGrades.map((grade) => (
                        <SelectItem key={grade} value={grade}>
                          {grade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={createGreenCoffeeMutation.isPending}>
              {createGreenCoffeeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                "Create Green Coffee"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}