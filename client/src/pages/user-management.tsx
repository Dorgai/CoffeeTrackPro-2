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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Loader2, Key, AlertCircle, Building2, UserCheck, UserX } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ShopAssignment = {
  userId: number;
  shopId: number;
};

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [userToDeactivate, setUserToDeactivate] = useState<User | null>(null);
  const [selectedUserForShops, setSelectedUserForShops] = useState<User | null>(null);
  const [isShopAssignmentOpen, setIsShopAssignmentOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "active" | "inactive">("all");

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: shops } = useQuery({
    queryKey: ["/api/shops"],
    enabled: !!currentUser && currentUser.role === "roasteryOwner",
  });

  const { data: userShops } = useQuery({
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

  const approveUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("POST", `/api/users/${userId}/approve`);
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "Failed to approve user");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User has been approved",
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

  const toggleActivationMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: number; isActive: boolean }) => {
      const res = await apiRequest("POST", `/api/users/${userId}/toggle-activation`, {
        isActive,
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "Failed to update user activation status");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User activation status has been updated",
      });
      setUserToDeactivate(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: number; password: string }) => {
      const res = await apiRequest("POST", `/api/users/${userId}/update-password`, {
        password,
      });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "Failed to update password");
      }
      return res.json();
    },
    onSuccess: () => {
      setIsPasswordDialogOpen(false);
      setNewPassword("");
      toast({
        title: "Success",
        description: "Password has been updated",
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

  const updateShopAssignmentsMutation = useMutation({
    mutationFn: async ({ userId, shopIds }: { userId: number; shopIds: number[] }) => {
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
      toast({
        title: "Success",
        description: "Shop assignments have been updated",
      });
      setIsShopAssignmentOpen(false);
      setSelectedUserForShops(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">
          Manage user accounts, approvals, and access
        </p>
      </div>

      <div className="flex justify-end gap-2">
        <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
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
                      {user.isPendingApproval && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => approveUserMutation.mutate(user.id)}
                          disabled={approveUserMutation.isPending}
                        >
                          {approveUserMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <UserCheck className="h-4 w-4 mr-2" />
                              Approve
                            </>
                          )}
                        </Button>
                      )}

                      {!user.isPendingApproval && (
                        <Button
                          variant={user.isActive ? "destructive" : "outline"}
                          size="sm"
                          onClick={() => setUserToDeactivate(user)}
                        >
                          {user.isActive ? (
                            <>
                              <UserX className="h-4 w-4 mr-2" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-4 w-4 mr-2" />
                              Activate
                            </>
                          )}
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

                      {user.role === "barista" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUserForShops(user);
                            setIsShopAssignmentOpen(true);
                          }}
                        >
                          <Building2 className="h-4 w-4 mr-2" />
                          Assign Shops
                        </Button>
                      )}
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
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              Assign Shops to {selectedUserForShops?.username}
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
                      <span>{shop.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (selectedUserForShops) {
                            const newShopIds = userShops
                              .filter((s: any) => s.id !== shop.id)
                              .map((s: any) => s.id);
                            updateShopAssignmentsMutation.mutate({
                              userId: selectedUserForShops.id,
                              shopIds: newShopIds,
                            });
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
              <h4 className="text-sm font-medium">Add Shop Assignment</h4>
              {shops?.length ? (
                <Select
                  onValueChange={(value) => {
                    if (selectedUserForShops) {
                      updateShopAssignmentsMutation.mutate({
                        userId: selectedUserForShops.id,
                        shopIds: [...(userShops?.map((s: any) => s.id) || []), parseInt(value)],
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a shop to assign" />
                  </SelectTrigger>
                  <SelectContent>
                    {shops
                      .filter(
                        (shop: any) =>
                          !userShops?.some((us: any) => us.id === shop.id)
                      )
                      .map((shop: any) => (
                        <SelectItem key={shop.id} value={shop.id.toString()}>
                          {shop.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
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