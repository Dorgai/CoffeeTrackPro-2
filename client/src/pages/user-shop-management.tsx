import { useState } from "react";
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
  const [pendingAssignments, setPendingAssignments] = useState<Assignment[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: users = [], isLoading: loadingUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: shops = [], isLoading: loadingShops } = useQuery<Shop[]>({
    queryKey: ["/api/shops"],
  });

  const { data: currentAssignments = [], isLoading: loadingAssignments } = useQuery<Assignment[]>({
    queryKey: ["/api/user-shop-assignments"],
    onSuccess: (data) => {
      if (!hasChanges) {
        setPendingAssignments(data);
      }
    },
  });

  const updateAssignmentsMutation = useMutation({
    mutationFn: async (assignments: Assignment[]) => {
      const response = await apiRequest(
        "POST",
        "/api/bulk-user-shop-assignments",
        { assignments }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to update assignments");
      }

      return response.json();
    },
    onMutate: async (newAssignments) => {
      setIsUpdating(true);
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/user-shop-assignments"] });

      // Save the previous assignments
      const previousAssignments = queryClient.getQueryData(["/api/user-shop-assignments"]);

      // Optimistically update to the new value
      queryClient.setQueryData(["/api/user-shop-assignments"], newAssignments);

      return { previousAssignments };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-shop-assignments"] });
      setHasChanges(false);
      setIsUpdating(false);
      toast({
        title: "Success",
        description: "Shop assignments updated successfully",
      });
    },
    onError: (error, newAssignments, context) => {
      // Revert back to the previous assignments
      queryClient.setQueryData(["/api/user-shop-assignments"], context?.previousAssignments);
      setPendingAssignments(currentAssignments);
      setIsUpdating(false);
      toast({
        title: "Error updating assignments",
        description: error instanceof Error ? error.message : "Failed to update assignments",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-shop-assignments"] });
    },
  });

  const isAssigned = (userId: number, shopId: number) => {
    return pendingAssignments.some(a => a.userId === userId && a.shopId === shopId);
  };

  const toggleAssignment = (userId: number, shopId: number) => {
    if (isUpdating) return;

    const user = users.find(u => u.id === userId);
    if (user?.role === "roasteryOwner") {
      toast({
        title: "Info",
        description: "Roastery owners automatically have access to all shops",
      });
      return;
    }

    const newAssignments = isAssigned(userId, shopId)
      ? pendingAssignments.filter(a => !(a.userId === userId && a.shopId === shopId))
      : [...pendingAssignments, { userId, shopId }];

    setPendingAssignments(newAssignments);
    setHasChanges(true);
  };

  const handleSubmit = async () => {
    try {
      await updateAssignmentsMutation.mutateAsync(pendingAssignments);
    } catch (error) {
      console.error("Failed to submit assignments:", error);
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User-Shop Management</h1>
          <p className="text-muted-foreground">
            Manage user access to shops using the checkboxes below. Roastery owners automatically have access to all shops.
          </p>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={!hasChanges || isUpdating}
          className="min-w-[120px]"
        >
          {isUpdating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
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