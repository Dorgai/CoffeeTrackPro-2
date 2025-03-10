import { useState, useEffect } from "react";
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

  // Fetch users
  const { data: users = [], isLoading: loadingUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Fetch shops
  const { data: shops = [], isLoading: loadingShops } = useQuery<Shop[]>({
    queryKey: ["/api/shops"],
  });

  // Fetch current assignments with proper error handling
  const { data: currentAssignments = [], isLoading: loadingAssignments } = useQuery<Assignment[]>({
    queryKey: ["/api/user-shop-assignments"],
    onSuccess: (data) => {
      setAssignments(data);
    },
    onError: (error) => {
      toast({
        title: "Error loading assignments",
        description: error instanceof Error ? error.message : "Failed to load assignments",
        variant: "destructive",
      });
    },
  });

  // Keep local state in sync with server state
  useEffect(() => {
    if (currentAssignments) {
      setAssignments(currentAssignments);
    }
  }, [currentAssignments]);

  // Update assignments mutation
  const updateAssignments = useMutation({
    mutationFn: async (newAssignments: Assignment[]) => {
      setIsUpdating(true);
      try {
        const response = await apiRequest(
          "POST",
          "/api/bulk-user-shop-assignments",
          { assignments: newAssignments }
        );
        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(errorData || "Failed to update assignments");
        }
        return response.json();
      } finally {
        setIsUpdating(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-shop-assignments"] });
      toast({
        title: "Success",
        description: "Shop assignments updated successfully",
      });
    },
    onError: (error: Error) => {
      setAssignments(currentAssignments); // Revert on error
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
    if (isUpdating) return; // Prevent multiple simultaneous updates

    const user = users.find(u => u.id === userId);
    if (user?.role === "roasteryOwner") {
      toast({
        title: "Info",
        description: "Roastery owners automatically have access to all shops",
      });
      return;
    }

    let newAssignments: Assignment[];
    if (isAssigned(userId, shopId)) {
      newAssignments = assignments.filter(
        a => !(a.userId === userId && a.shopId === shopId)
      );
    } else {
      newAssignments = [...assignments, { userId, shopId }];
    }

    try {
      setAssignments(newAssignments); // Optimistic update
      await updateAssignments.mutateAsync(newAssignments);
    } catch (error) {
      console.error("Failed to update assignments:", error);
      // Error handling is done in mutation callbacks
    }
  };

  // Separate active and inactive users
  const activeUsers = users.filter(user => user.isActive);
  const inactiveUsers = users.filter(user => !user.isActive);

  // Render assignment table for a given set of users
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