import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch users and shops
  const { data: users = [], isLoading: loadingUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: shops = [], isLoading: loadingShops } = useQuery<Shop[]>({
    queryKey: ["/api/shops"],
  });

  // Fetch current assignments
  const { data: currentAssignments = [], isLoading: loadingAssignments } = useQuery<Assignment[]>({
    queryKey: ["/api/user-shop-assignments"],
    onSuccess: (data) => {
      // Initialize assignments state with current data
      if (assignments.length === 0) {
        setAssignments(data);
      }
    },
  });

  // Handle checkbox changes
  const handleToggle = (userId: number, shopId: number) => {
    if (isSaving) return;

    const user = users.find(u => u.id === userId);
    if (user?.role === "roasteryOwner") {
      toast({
        title: "Info",
        description: "Roastery owners automatically have access to all shops",
      });
      return;
    }

    setAssignments(current => {
      const isAssigned = current.some(a => a.userId === userId && a.shopId === shopId);
      if (isAssigned) {
        return current.filter(a => !(a.userId === userId && a.shopId === shopId));
      } else {
        return [...current, { userId, shopId }];
      }
    });
  };

  // Save changes
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await apiRequest(
        "POST",
        "/api/bulk-user-shop-assignments",
        { assignments }
      );

      if (!response.ok) {
        throw new Error(await response.text() || "Failed to save assignments");
      }

      // Refetch data after successful save
      await queryClient.invalidateQueries({ queryKey: ["/api/user-shop-assignments"] });

      toast({
        title: "Success",
        description: "Shop assignments saved successfully",
      });
    } catch (error) {
      console.error("Save error:", error);

      // Revert to server state
      setAssignments(currentAssignments);

      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save assignments",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
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
  const activeShops = shops.filter(shop => shop.isActive);

  const hasChanges = JSON.stringify(assignments) !== JSON.stringify(currentAssignments);

  const renderUserTable = (userList: User[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          {activeShops.map(shop => (
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
            {activeShops.map(shop => (
              <TableCell key={shop.id} className="text-center">
                <Checkbox
                  checked={
                    user.role === "roasteryOwner" ||
                    assignments.some(a => a.userId === user.id && a.shopId === shop.id)
                  }
                  disabled={user.role === "roasteryOwner" || isSaving}
                  onCheckedChange={() => handleToggle(user.id, shop.id)}
                />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User-Shop Management</h1>
          <p className="text-muted-foreground">
            Use the checkboxes below to manage user access to shops. Click Save Changes when done.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="min-w-[120px]"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      <div className="border rounded-lg">
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="border-b">
            <TabsTrigger value="active">Active Users ({activeUsers.length})</TabsTrigger>
            <TabsTrigger value="inactive">Inactive Users ({inactiveUsers.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="active" className="p-4">
            {renderUserTable(activeUsers)}
          </TabsContent>
          <TabsContent value="inactive" className="p-4">
            {renderUserTable(inactiveUsers)}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}