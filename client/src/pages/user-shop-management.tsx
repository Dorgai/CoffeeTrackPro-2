import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User, Shop } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

type Assignment = {
  userId: number;
  shopId: number;
};

export default function UserShopManagement() {
  const { toast } = useToast();
  const [localAssignments, setLocalAssignments] = useState<Assignment[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch all required data
  const { data: users = [], isLoading: loadingUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: shops = [], isLoading: loadingShops } = useQuery<Shop[]>({
    queryKey: ["/api/shops"],
  });

  // Initialize local assignments - all users should be assigned to all shops by default
  useEffect(() => {
    if (users.length && shops.length) {
      const allAssignments = users.flatMap(user =>
        shops.map(shop => ({
          userId: user.id,
          shopId: shop.id
        }))
      );
      setLocalAssignments(allAssignments);
    }
  }, [users, shops]);

  // Handle checkbox changes - but all roles should have access to all shops
  const handleToggle = (userId: number, shopId: number) => {
    toast({
      title: "Info",
      description: "All users automatically have access to all shops",
    });
  };

  // Save assignments mutation
  const saveMutation = useMutation({
    mutationFn: async (assignments: Assignment[]) => {
      console.log("Saving assignments:", assignments);
      const response = await apiRequest(
        "POST",
        "/api/bulk-user-shop-assignments",
        { assignments }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to save assignments");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-shop-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "Shop assignments have been updated successfully",
      });
    },
    onError: (error: Error) => {
      console.error("Save error:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle save
  const handleSave = async () => {
    try {
      setIsSaving(true);
      await saveMutation.mutateAsync(localAssignments);
    } finally {
      setIsSaving(false);
    }
  };

  if (loadingUsers || loadingShops) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const activeUsers = users.filter(user => user.isActive);
  const inactiveUsers = users.filter(user => !user.isActive);
  const activeShops = shops.filter(shop => shop.isActive);

  // All users have access to all shops by default
  const isAssigned = () => true;

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User-Shop Management</h1>
          <p className="text-muted-foreground">
            All users have access to all shops by default
          </p>
        </div>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active">Active Users ({activeUsers.length})</TabsTrigger>
          <TabsTrigger value="inactive">Inactive Users ({inactiveUsers.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="mt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                {activeShops.map(shop => (
                  <TableHead key={shop.id} className="text-center">
                    {shop.name}
                    <div className="text-xs text-muted-foreground">
                      {shop.location}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeUsers.map(user => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{user.username}</div>
                      <Badge variant="outline" className="mt-1">
                        {user.role}
                      </Badge>
                    </div>
                  </TableCell>
                  {activeShops.map(shop => (
                    <TableCell key={shop.id} className="text-center">
                      <Checkbox
                        checked={isAssigned()}
                        disabled={true}
                        onCheckedChange={() => handleToggle(user.id, shop.id)}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="inactive" className="mt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                {activeShops.map(shop => (
                  <TableHead key={shop.id} className="text-center">
                    {shop.name}
                    <div className="text-xs text-muted-foreground">
                      {shop.location}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {inactiveUsers.map(user => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{user.username}</div>
                      <Badge variant="outline" className="mt-1">
                        {user.role}
                      </Badge>
                    </div>
                  </TableCell>
                  {activeShops.map(shop => (
                    <TableCell key={shop.id} className="text-center">
                      <Checkbox
                        checked={isAssigned()}
                        disabled={true}
                        onCheckedChange={() => handleToggle(user.id, shop.id)}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </div>
  );
}