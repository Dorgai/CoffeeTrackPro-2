import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle, Key, Building2, UserCheck, UserX, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type FilterStatus = "all" | "pending" | "active" | "inactive";

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [userToDeactivate, setUserToDeactivate] = useState<User | null>(null);
  const [selectedUserForShops, setSelectedUserForShops] = useState<User | null>(null);
  const [isShopAssignmentOpen, setIsShopAssignmentOpen] = useState(false);
  const [selectedShopIds, setSelectedShopIds] = useState<number[]>([]);
  const [filter, setFilter] = useState<FilterStatus>("all");

  // Queries
  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: shops } = useQuery({
    queryKey: ["/api/shops"],
    enabled: !!currentUser && currentUser.role === "roasteryOwner",
  });

  const { data: userShops, refetch: refetchUserShops } = useQuery({
    queryKey: ["/api/users", selectedUserForShops?.id, "shops"],
    enabled: !!selectedUserForShops?.id,
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/users/${selectedUserForShops?.id}/shops`
      );
      if (!res.ok) throw new Error("Failed to fetch user's shops");
      return res.json();
    },
  });

  // Update shop assignments mutation
  const updateShopAssignmentsMutation = useMutation({
    mutationFn: async ({ userId, shopIds }: { userId: number; shopIds: number[] }) => {
      console.log("Updating shop assignments:", { userId, shopIds });
      const res = await apiRequest(
        "POST",
        `/api/users/${userId}/shops`,
        { shopIds }
      );
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "Failed to update shop assignments");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      refetchUserShops();
      toast({
        title: "Success",
        description: "Shop assignments have been updated",
      });
    },
    onError: (error: Error) => {
      console.error("Shop assignment error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update shop assignments",
        variant: "destructive",
      });
    },
  });

  // Component render
  if (currentUser?.role !== "roasteryOwner") {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You do not have permission to access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const filteredUsers = users?.filter(user => {
    switch (filter) {
      case "pending":
        return user.isPendingApproval;
      case "active":
        return !user.isPendingApproval && user.isActive;
      case "inactive":
        return !user.isPendingApproval && !user.isActive;
      default:
        return true;
    }
  });

  const handleShopAssignment = (userId: number, shopIds: number[]) => {
    console.log("Assigning shops:", { userId, shopIds });
    updateShopAssignmentsMutation.mutate({ userId, shopIds });
  };

  const handleShopSelectionChange = (shopId: string) => {
    const id = parseInt(shopId);
    setSelectedShopIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(x => x !== id);
      }
      return [...prev, id];
    });
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">
          Manage user accounts, approvals, and access
        </p>
      </div>

      <div className="flex justify-end gap-2">
        <Select value={filter} onValueChange={(value: FilterStatus) => setFilter(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            <SelectItem value="pending">Pending Approval</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            Manage user accounts and their access to the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        user.isPendingApproval
                          ? "outline"
                          : user.isActive
                            ? "default"
                            : "destructive"
                      }
                    >
                      {user.isPendingApproval ? "Pending Approval" : user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.createdAt && new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {!user.isPendingApproval && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUserForShops(user);
                            setIsShopAssignmentOpen(true);
                          }}
                        >
                          <Building2 className="h-4 w-4 mr-2" />
                          Manage Shops
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(user);
                          setIsPasswordDialogOpen(true);
                        }}
                      >
                        <Key className="h-4 w-4 mr-2" />
                        Reset Password
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={isPasswordDialogOpen}
        onOpenChange={(open) => {
          setIsPasswordDialogOpen(open);
          if (!open) {
            setSelectedUser(null);
            setNewPassword("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password for {selectedUser?.username}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Button
              className="w-full"
              onClick={() => {
                if (selectedUser) {
                  updatePasswordMutation.mutate({
                    userId: selectedUser.id,
                    password: newPassword,
                  });
                }
              }}
              disabled={!newPassword || !selectedUser}
            >
              Update Password
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={!!userToDeactivate}
        onOpenChange={(open) => !open && setUserToDeactivate(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {userToDeactivate?.isActive ? "Deactivate" : "Activate"} User
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {userToDeactivate?.isActive ? "deactivate" : "activate"} {userToDeactivate?.username}?
              {userToDeactivate?.isActive && " This will prevent them from accessing the system."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (userToDeactivate) {
                  toggleActivationMutation.mutate({
                    userId: userToDeactivate.id,
                    isActive: !userToDeactivate.isActive,
                  });
                }
              }}
              className={userToDeactivate?.isActive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {userToDeactivate?.isActive ? "Deactivate" : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={isShopAssignmentOpen}
        onOpenChange={(open) => {
          setIsShopAssignmentOpen(open);
          if (!open) {
            setSelectedUserForShops(null);
            setSelectedShopIds([]);
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              Manage Shop Access for {selectedUserForShops?.username}
              <div className="text-sm font-normal text-muted-foreground mt-1">
                Role: {selectedUserForShops?.role}
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Current Assignments</h4>
              {userShops?.length ? (
                <div className="space-y-2">
                  {userShops.map((shop: any) => (
                    <div
                      key={shop.id}
                      className="flex items-center justify-between bg-muted p-2 rounded"
                    >
                      <div>
                        <span className="font-medium">{shop.name}</span>
                        <div className="text-xs text-muted-foreground">
                          {shop.location}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (selectedUserForShops) {
                            handleShopAssignment(
                              selectedUserForShops.id,
                              userShops
                                .filter((s: any) => s.id !== shop.id)
                                .map((s: any) => s.id)
                            );
                          }
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No shops currently assigned
                </p>
              )}
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Add Shop Assignments</h4>
              {shops?.length ? (
                <div className="space-y-2">
                  {shops
                    .filter((shop: any) => !userShops?.some((us: any) => us.id === shop.id))
                    .map((shop: any) => (
                      <div
                        key={shop.id}
                        className="flex items-center justify-between p-2 border rounded"
                      >
                        <div>
                          <span className="font-medium">{shop.name}</span>
                          <div className="text-xs text-muted-foreground">
                            {shop.location}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (selectedUserForShops) {
                              handleShopAssignment(
                                selectedUserForShops.id,
                                [...(userShops?.map((s: any) => s.id) || []), shop.id]
                              );
                            }
                          }}
                        >
                          Add
                        </Button>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No shops available</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}