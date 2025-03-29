import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/schema";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Key, Building2, UserCheck, UserX, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { Input } from "@/components/ui/input";

export default function Users() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    type: 'password' | 'activation' | 'approval' | 'permanentDelete' | null;
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

  const approveUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest(
        "POST",
        `/api/users/${userId}/approve`
      );
      if (!res.ok) {
        throw new Error(await res.text() || "Failed to approve user");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User has been approved",
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

  const permanentDeleteMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest(
        "DELETE",
        `/api/users/${userId}/permanent`
      );
      if (!res.ok) {
        throw new Error(await res.text() || "Failed to permanently delete user");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User has been permanently deleted",
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Users</h1>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Users</CardTitle>
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
              {activeUsers.map((user) => (
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
                      {user.isPendingApproval ? (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => setDialogState({ isOpen: true, type: 'approval', user })}
                        >
                          <UserCheck className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                      ) : (
                        <>
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
                            variant="destructive"
                            size="sm"
                            onClick={() => setDialogState({ isOpen: true, type: 'activation', user })}
                          >
                            <UserX className="h-4 w-4 mr-2" />
                            Deactivate
                          </Button>

                          {currentUser?.role === "roasteryOwner" && user.role !== "roasteryOwner" && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setDialogState({ isOpen: true, type: 'permanentDelete', user })}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Permanently
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Inactive Users</CardTitle>
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
              {inactiveUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>
                    <Badge variant="destructive">Inactive</Badge>
                  </TableCell>
                  <TableCell>
                    {user.createdAt && new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDialogState({ isOpen: true, type: 'activation', user })}
                      >
                        <UserCheck className="h-4 w-4 mr-2" />
                        Activate
                      </Button>

                      {currentUser?.role === "roasteryOwner" && user.role !== "roasteryOwner" && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDialogState({ isOpen: true, type: 'permanentDelete', user })}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Permanently
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

      {/* Approval Dialog */}
      <AlertDialog
        open={dialogState.type === 'approval'}
        onOpenChange={(open) => {
          if (!open) setDialogState(prev => ({ ...prev, isOpen: false, type: null, user: null }));
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve {dialogState.user?.username}? This will allow them to access the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (dialogState.user) {
                  approveUserMutation.mutate(dialogState.user.id);
                }
              }}
            >
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent Delete Dialog */}
      <AlertDialog
        open={dialogState.type === 'permanentDelete'}
        onOpenChange={(open) => {
          if (!open) setDialogState(prev => ({ ...prev, isOpen: false, type: null, user: null }));
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete {dialogState.user?.username}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (dialogState.user) {
                  permanentDeleteMutation.mutate(dialogState.user.id);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 