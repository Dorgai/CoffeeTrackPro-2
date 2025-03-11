import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { User, Shop } from "@shared/schema";
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

  const { data: shops } = useQuery<Shop[]>({
    queryKey: ["/api/shops"],
    enabled: !!currentUser && currentUser.role === "roasteryOwner",
  });

  const { data: userShops } = useQuery<Shop[]>({
    queryKey: ["/api/users", dialogState.user?.id, "shops"],
    enabled: dialogState.type === 'shopAssignment' && !!dialogState.user?.id,
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: number; password: string }) => {
      const res = await apiRequest(
        "POST",
        `/api/users/${userId}/update-password`,
        { password }
      );
      if (!res.ok) {
        throw new Error(await res.text() || "Failed to update password");
      }
      return res.json();
    },
    onSuccess: () => {
      setDialogState(prev => ({ ...prev, isOpen: false, type: null, user: null }));
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
        throw new Error(await res.text() || "Failed to update user activation status");
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

  const assignShopsMutation = useMutation({
    mutationFn: async ({ userId, shopIds }: { userId: number; shopIds: number[] }) => {
      const res = await apiRequest(
        "POST",
        `/api/users/${userId}/shops`,
        { shopIds }
      );
      if (!res.ok) {
        throw new Error(await res.text() || "Failed to update shop assignments");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-shop-assignments"] });
      if (dialogState.user?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/users", dialogState.user.id, "shops"] });
      }
      toast({
        title: "Success",
        description: "Shop assignments have been updated",
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

  // Split users into active and inactive
  const activeUsers = users.filter(user => user.isActive);
  const inactiveUsers = users.filter(user => !user.isActive);

  const handleShopAssignment = (userId: number, shopIds: number[]) => {
    assignShopsMutation.mutate({ userId, shopIds });
  };

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

                    {/* Show shop assignment button except for roastery owners */}
                    {user.role !== "roasteryOwner" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDialogState({ isOpen: true, type: 'shopAssignment', user });
                        }}
                      >
                        <Building2 className="h-4 w-4 mr-2" />
                        Manage Shops
                      </Button>
                    )}

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

      {/* Password Reset Dialog */}
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
              onChange={(e) => {
                const newPassword = e.target.value;
                if (dialogState.user && newPassword) {
                  updatePasswordMutation.mutate({
                    userId: dialogState.user.id,
                    password: newPassword,
                  });
                }
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Shop Assignment Dialog */}
      <Dialog 
        open={dialogState.type === 'shopAssignment'} 
        onOpenChange={(open) => {
          if (!open) setDialogState(prev => ({ ...prev, isOpen: false, type: null, user: null }));
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              Manage Shop Access for {dialogState.user?.username}
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
                          if (dialogState.user) {
                            const updatedShopIds = userShops
                              .filter((s) => s.id !== shop.id)
                              .map((s) => s.id);
                            handleShopAssignment(dialogState.user.id, updatedShopIds);
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
                            if (dialogState.user) {
                              const newShopIds = [
                                ...(userShops?.map((s) => s.id) || []),
                                shop.id
                              ];
                              handleShopAssignment(dialogState.user.id, newShopIds);
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

      {/* Activation Dialog */}
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
    </div>
  );
}