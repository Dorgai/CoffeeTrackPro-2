import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertShopSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useState } from 'react';
import type { Shop } from "@shared/schema";
import { Store, Plus, Edit2, Trash2, Loader2 } from "lucide-react";

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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Extended schema to include the new fields
const formSchema = insertShopSchema.extend({
  desiredSmallBags: z.coerce.number().min(0),
  desiredLargeBags: z.coerce.number().min(0),
});

export default function Shops() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [shopToDelete, setShopToDelete] = useState<Shop | null>(null);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      location: "",
      desiredSmallBags: 20,
      desiredLargeBags: 10,
    },
  });

  const editForm = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      location: "",
      desiredSmallBags: 20,
      desiredLargeBags: 10,
    },
  });

  const { data: shops, isLoading } = useQuery<Shop[]>({
    queryKey: ["/api/shops"],
  });

  const createShopMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const res = await apiRequest("POST", "/api/shops", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create shop");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shops"] });
      toast({
        title: "Success",
        description: "Shop created successfully",
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

  const updateShopMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof formSchema> }) => {
      const res = await apiRequest("PATCH", `/api/shops/${id}`, data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update shop");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shops"] });
      toast({
        title: "Success",
        description: "Shop updated successfully",
      });
      setEditingShop(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteShopMutation = useMutation({
    mutationFn: async (shopId: number) => {
      const res = await apiRequest("DELETE", `/api/shops/${shopId}`);
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "Failed to delete shop");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shops"] });
      toast({
        title: "Success",
        description: "Shop deleted successfully",
      });
      setShopToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Shop Management</h1>
        <p className="text-muted-foreground">
          Add and manage retail coffee shops.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Add New Shop</CardTitle>
            <CardDescription>Create a new retail location</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((data) =>
                  createShopMutation.mutate(data)
                )}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shop Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="desiredSmallBags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Small Bags (200g)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                      <p className="text-sm text-muted-foreground">
                        Set the desired quantity of small bags for this location
                      </p>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="desiredLargeBags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Large Bags (1kg)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                      <p className="text-sm text-muted-foreground">
                        Set the desired quantity of large bags for this location
                      </p>
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={createShopMutation.isPending}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Shop
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Existing Shops</CardTitle>
            <CardDescription>All retail locations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {shops?.map((shop) => (
                <div
                  key={shop.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <Store className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{shop.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {shop.location}
                      </p>
                    </div>
                  </div>
                  {user?.role === "roasteryOwner" && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingShop(shop);
                          editForm.reset({
                            name: shop.name,
                            location: shop.location,
                            desiredSmallBags: shop.desiredSmallBags || 20,
                            desiredLargeBags: shop.desiredLargeBags || 10,
                          });
                        }}
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setShopToDelete(shop)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={!!editingShop}
        onOpenChange={(open) => !open && setEditingShop(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Shop Details</DialogTitle>
            <DialogDescription>
              Update shop information and target stock levels
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit((data) =>
                updateShopMutation.mutate({ id: editingShop!.id, data })
              )}
              className="space-y-4"
            >
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shop Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="desiredSmallBags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Small Bags (200g)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                    <p className="text-sm text-muted-foreground">
                      Set the desired quantity of small bags for this location
                    </p>
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="desiredLargeBags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Large Bags (1kg)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                    <p className="text-sm text-muted-foreground">
                      Set the desired quantity of large bags for this location
                    </p>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingShop(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateShopMutation.isPending}
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog 
        open={!!shopToDelete}
        onOpenChange={(open) => !open && setShopToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {shopToDelete?.name}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => shopToDelete && deleteShopMutation.mutate(shopToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Shop
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}