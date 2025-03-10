import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { User, Shop } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
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

type Assignment = {
  userId: number;
  shopId: number;
};

export default function UserShopManagement() {
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  const { data: users = [], isLoading: loadingUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: shops = [], isLoading: loadingShops } = useQuery<Shop[]>({
    queryKey: ["/api/shops"],
  });

  const { data: currentAssignments = [], isLoading: loadingAssignments } = useQuery<Assignment[]>({
    queryKey: ["/api/user-shop-assignments"],
    onSuccess: (data) => {
      console.log("Received current assignments:", data);
      setAssignments(data);
    },
  });

  const updateAssignmentsMutation = useMutation({
    mutationFn: async (newAssignments: Assignment[]) => {
      console.log("Sending assignment update:", newAssignments);
      setIsUpdating(true);
      try {
        const response = await apiRequest(
          "POST",
          "/api/bulk-user-shop-assignments",
          { assignments: newAssignments }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || "Failed to update assignments");
        }

        const result = await response.json();
        console.log("Server response:", result);
        return result;
      } catch (error) {
        console.error("Mutation error:", error);
        throw error;
      } finally {
        setIsUpdating(false);
      }
    },
    onSuccess: (data) => {
      console.log("Successfully updated assignments:", data);
      // Invalidate and refetch queries
      queryClient.invalidateQueries({ queryKey: ["/api/user-shop-assignments"] });

      toast({
        title: "Success",
        description: "Shop assignments updated successfully",
      });
    },
    onError: (error: Error) => {
      console.error("Failed to update assignments:", error);
      // Revert to previous state
      setAssignments(currentAssignments);

      toast({
        title: "Error updating assignments",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isAssigned = (userId: number, shopId: number) => {
    return assignments.some(a => a.userId === userId && a.shopId === shopId);
  };

  const toggleAssignment = async (userId: number, shopId: number) => {
    if (isUpdating) return;

    const user = users.find(u => u.id === userId);
    if (user?.role === "roasteryOwner") {
      toast({
        title: "Info",
        description: "Roastery owners automatically have access to all shops",
      });
      return;
    }

    try {
      const newAssignments = isAssigned(userId, shopId)
        ? assignments.filter(a => !(a.userId === userId && a.shopId === shopId))
        : [...assignments, { userId, shopId }];

      // Update local state optimistically
      setAssignments(newAssignments);

      // Send update to server
      await updateAssignmentsMutation.mutateAsync(newAssignments);

      console.log("Assignment toggle completed");
    } catch (error) {
      console.error("Toggle assignment failed:", error);
      // Error handling is done in mutation callbacks
    }
  };

  const activeUsers = users.filter(user => user.isActive);
  const inactiveUsers = users.filter(user => !user.isActive);

  const renderUserTable = (userList: User[]) => (
    <div className="border rounded-lg overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            {shops
              .filter(shop => shop.isActive)
              .map(shop => (
                <TableHead key={shop.id} className="text-center">
                  {shop.name}
                  <div className="text-xs text-muted-foreground">{shop.location}</div>
                </TableHead>
              ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {userList.map(user => (
            <TableRow key={user.id}>
              <TableCell>
                <div>
                  <div className="font-medium">{user.username}</div>
                  <Badge variant="outline" className="mt-1">
                    {user.role}
                  </Badge>
                </div>
              </TableCell>
              {shops
                .filter(shop => shop.isActive)
                .map(shop => (
                  <TableCell key={shop.id} className="text-center">
                    <Checkbox
                      checked={user.role === "roasteryOwner" || isAssigned(user.id, shop.id)}
                      disabled={user.role === "roasteryOwner" || isUpdating}
                      onCheckedChange={() => toggleAssignment(user.id, shop.id)}
                    />
                  </TableCell>
                ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  if (loadingUsers || loadingShops || loadingAssignments) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User-Shop Management</h1>
        <p className="text-muted-foreground">
          Manage user access to shops using the checkboxes below. Roastery owners automatically have access to all shops.
        </p>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active">Active Users ({activeUsers.length})</TabsTrigger>
          <TabsTrigger value="inactive">Inactive Users ({inactiveUsers.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="mt-6">
          {renderUserTable(activeUsers)}
        </TabsContent>
        <TabsContent value="inactive" className="mt-6">
          {renderUserTable(inactiveUsers)}
        </TabsContent>
      </Tabs>
    </div>
  );
}