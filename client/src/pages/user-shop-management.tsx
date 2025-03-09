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

type Assignment = {
  userId: number;
  shopId: number;
};

export default function UserShopManagement() {
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  // Fetch all users
  const { data: users = [], isLoading: loadingUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Fetch all shops
  const { data: shops = [], isLoading: loadingShops } = useQuery<Shop[]>({
    queryKey: ["/api/shops"],
  });

  // Fetch current assignments
  const { data: currentAssignments = [], isLoading: loadingAssignments } = useQuery<Assignment[]>({
    queryKey: ["/api/user-shop-assignments"],
    onSuccess: (data) => {
      setAssignments(data);
    }
  });

  const updateAssignments = useMutation({
    mutationFn: async (assignments: Assignment[]) => {
      const response = await apiRequest(
        "POST",
        "/api/user-shop-assignments/bulk",
        { assignments }
      );
      if (!response.ok) {
        throw new Error("Failed to update assignments");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-shop-assignments"] });
      toast({
        title: "Success",
        description: "Shop assignments updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleAssignment = (userId: number, shopId: number) => {
    const isAssigned = assignments.some(
      a => a.userId === userId && a.shopId === shopId
    );

    let newAssignments;
    if (isAssigned) {
      // Remove assignment
      newAssignments = assignments.filter(
        a => !(a.userId === userId && a.shopId === shopId)
      );
    } else {
      // Add assignment
      newAssignments = [...assignments, { userId, shopId }];
    }

    setAssignments(newAssignments);
    updateAssignments.mutate(newAssignments);
  };

  const isAssigned = (userId: number, shopId: number) => {
    return assignments.some(a => a.userId === userId && a.shopId === shopId);
  };

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
          Manage user access to shops. Users will only see data for their assigned shops.
        </p>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              {shops.map(shop => (
                <TableHead key={shop.id} className="text-center">
                  {shop.name}
                  <div className="text-xs text-muted-foreground">{shop.location}</div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map(user => (
              <TableRow key={user.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{user.username}</div>
                    <Badge variant="outline" className="mt-1">
                      {user.role}
                    </Badge>
                  </div>
                </TableCell>
                {shops.map(shop => (
                  <TableCell key={shop.id} className="text-center">
                    <Checkbox
                      checked={isAssigned(user.id, shop.id)}
                      disabled={user.role === "roasteryOwner"} // Owners always have access
                      onCheckedChange={() => toggleAssignment(user.id, shop.id)}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
