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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { AlertCircle, Key, Building2, UserCheck, UserX, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [userToDeactivate, setUserToDeactivate] = useState<User | null>(null);
  const [selectedUserForShops, setSelectedUserForShops] = useState<User | null>(null);
  const [isShopAssignmentOpen, setIsShopAssignmentOpen] = useState(false);

  // Dialog state management
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    type: 'password' | 'shopAssignment' | 'activation' | null;
    user: User | null;
  }>({
    isOpen: false,
    type: null,
    user: null
  });


  // Queries
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Split users into active and inactive
  const activeUsers = users.filter(user => user.isActive);
  const inactiveUsers = users.filter(user => !user.isActive);

  const updatePasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: number; password: string }) => {
      const res = await apiRequest(
        "POST",
        `/api/users/${userId}/update-password`,
        { password }
      );
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "Failed to update password");
      }
      return res.json();
    },
    onSuccess: () => {
      setDialogState(prev => ({ ...prev, isOpen: false, type: null, user: null }));
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

  const toggleActivationMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: number; isActive: boolean }) => {
      const res = await apiRequest(
        "PATCH",
        `/api/users/${userId}`,
        { isActive }
      );
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
      setDialogState(prev => ({ ...prev, isOpen: false, type: null, user: null }));
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Render the user table for a given list of users
  const renderUserTable = (userList: User[]) => (
    <Card>
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
            {userList.map((user) => (
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDialogState({ isOpen: true, type: 'password', user });
                      }}
                    >
                      <Key className="h-4 w-4 mr-2" />
                      Reset Password
                    </Button>

                    <Button
                      variant={user.isActive ? "destructive" : "outline"}
                      size="sm"
                      onClick={() => setDialogState({ isOpen: true, type: 'activation', user })}
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
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  const { data: shops } = useQuery<Shop[]>({
    queryKey: ["/api/shops"],
    enabled: !!currentUser && currentUser.role === "roasteryOwner",
  });

  const { data: userShops } = useQuery<Shop[]>({
    queryKey: ["/api/users", selectedUserForShops?.id, "shops"],
    enabled: !!selectedUserForShops?.id,
  });

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
      // Invalidate both queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      if (selectedUserForShops) {
        queryClient.invalidateQueries({
          queryKey: ["/api/users", selectedUserForShops.id, "shops"]
        });
      }
      toast({
        title: "Success",
        description: "Shop assignments have been updated",
      });
      setIsShopAssignmentOpen(false);
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

  const handleShopAssignment = (userId: number, shopIds: number[]) => {
    console.log("Assigning shops:", { userId, shopIds });
    updateShopAssignmentsMutation.mutate({ userId, shopIds });
  };

  const renderPasswordDialog = () => (
    <Dialog open={dialogState.type === 'password'} onOpenChange={(open) => {
      if (!open) setDialogState(prev => ({ ...prev, isOpen: false, type: null, user: null }));
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset Password for {dialogState.user?.username}</DialogTitle>
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
              if (dialogState.user) {
                updatePasswordMutation.mutate({
                  userId: dialogState.user.id,
                  password: newPassword,
                });
              }
            }}
            disabled={!newPassword || !dialogState.user}
          >
            Update Password
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  const renderActivationDialog = () => (
    <AlertDialog
      open={dialogState.type === 'activation'}
      onOpenChange={(open) => {
        if (!open) setDialogState(prev => ({ ...prev, isOpen: false, type: null, user: null }));
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {dialogState.user?.isActive ? "Deactivate" : "Activate"} User
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to {dialogState.user?.isActive ? "deactivate" : "activate"} {dialogState.user?.username}?
            {dialogState.user?.isActive && " This will prevent them from accessing the system."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (dialogState.user) {
                toggleActivationMutation.mutate({
                  userId: dialogState.user.id,
                  isActive: !dialogState.user.isActive,
                });
              }
            }}
            className={dialogState.user?.isActive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
          >
            {dialogState.user?.isActive ? "Deactivate" : "Activate"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

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

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">
          Manage user accounts, approvals, and access
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

      {/* Render dialogs */}
      {renderPasswordDialog()}
      {renderActivationDialog()}

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
              Manage Shop Access for {selectedUserForShops?.username}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Current Assignments</h4>
              {userShops && userShops.length > 0 ? (
                <div className="space-y-2">
                  {userShops.map((shop) => (
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
                            const updatedShopIds = userShops
                              .filter((s) => s.id !== shop.id)
                              .map((s) => s.id);
                            handleShopAssignment(selectedUserForShops.id, updatedShopIds);
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
              <h4 className="text-sm font-medium">Available Shops</h4>
              {shops?.length ? (
                <div className="space-y-2">
                  {shops
                    .filter((shop) =>
                      shop.isActive &&
                      !userShops?.some((us) => us.id === shop.id)
                    )
                    .map((shop) => (
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
                              const newShopIds = [
                                ...(userShops?.map((s) => s.id) || []),
                                shop.id
                              ];
                              handleShopAssignment(selectedUserForShops.id, newShopIds);
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

interface Shop {
  id: number;
  name: string;
  location: string;
  isActive: boolean;
}