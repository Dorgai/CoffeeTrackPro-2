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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch data
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

  // Update mutation
  const submitAssignments = useMutation({
    mutationFn: async (assignments: Assignment[]) => {
      setIsSubmitting(true);
      try {
        const response = await apiRequest(
          "POST",
          "/api/bulk-user-shop-assignments",
          { assignments }
        );

        if (!response.ok) {
          const error = await response.text();
          throw new Error(error || "Failed to update assignments");
        }

        const result = await response.json();
        return result;
      } finally {
        setIsSubmitting(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-shop-assignments"] });
      setHasChanges(false);
      toast({
        title: "Success",
        description: "Shop assignments saved successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error saving assignments",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
      // Revert to current assignments on error
      setPendingAssignments(currentAssignments);
    },
  });

  // Check if a user is assigned to a shop
  const isAssigned = (userId: number, shopId: number) => {
    return pendingAssignments.some(a => a.userId === userId && a.shopId === shopId);
  };

  // Handle checkbox changes
  const toggleAssignment = (userId: number, shopId: number) => {
    if (isSubmitting) return;

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

  // Handle save button click
  const handleSave = async () => {
    try {
      await submitAssignments.mutateAsync(pendingAssignments);
    } catch (error) {
      console.error("Failed to save assignments:", error);
    }
  };

  if (loadingUsers || loadingShops || loadingAssignments) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

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
                      disabled={user.role === "roasteryOwner" || isSubmitting}
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

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User-Shop Management</h1>
          <p className="text-muted-foreground">
            Manage user access to shops using the checkboxes below. Click Save Changes when you're done.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSubmitting}
          className="min-w-[120px]"
        >
          {isSubmitting ? (
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