import { Route, Switch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider } from "@/hooks/use-auth";
import { PageLayout } from "@/components/layout/page-layout";
import Dashboard from "@/pages/dashboard";
import ManagerDashboard from "@/pages/manager-dashboard";
import AuthPage from "@/pages/auth-page";
import Inventory from "@/pages/inventory";
import CoffeeDetail from "@/pages/coffee-detail";
import Roasting from "@/pages/roasting";
import RoastingOrders from "@/pages/roasting-orders";
import RetailOrders from "@/pages/retail-orders";
import RetailOverview from "@/pages/retail-overview";
import Analytics from "@/pages/analytics";
import Reports from "@/pages/reports";
import UserManagement from "@/pages/user-management";
import Shops from "@/pages/shops";
import Profile from "@/pages/profile";
import NotFound from "@/pages/not-found";
import { ProtectedRoute } from "@/lib/protected-route";
import RetailNewArrivals from "@/pages/retail-new-arrivals";
import RoastingBatches from "@/pages/roasting-batches";
import Settings from "@/pages/settings";
import Orders from "@/pages/orders";
import Users from "@/pages/users";
import { Toaster } from "@/components/ui/toaster";
import RoastingDiscrepancies from "@/pages/roasting-discrepancies";
import Retail from "@/pages/retail";
import UserShopManagement from "@/pages/user-shop-management";
import Billing from "@/pages/billing";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PageLayout>
          <Switch>
            {/* Public routes */}
            <Route path="/auth" component={AuthPage} />
            <Route path="/login" component={AuthPage} />

            {/* Roastery Dashboard - for roastery staff */}
            <Route path="/">
              {() => (
                <ProtectedRoute
                  path="/"
                  component={Dashboard}
                  roles={["roasteryOwner", "roaster", "retailOwner"]}
                />
              )}
            </Route>

            {/* Manager/Retail Dashboard */}
            <Route path="/manager-dashboard">
              {() => (
                <ProtectedRoute
                  path="/manager-dashboard"
                  component={ManagerDashboard}
                  roles={["shopManager", "retailOwner", "barista"]}
                />
              )}
            </Route>

            {/* Inventory Management */}
            <Route path="/inventory">
              {() => (
                <ProtectedRoute
                  path="/inventory"
                  component={Inventory}
                  roles={["roasteryOwner", "roaster"]}
                />
              )}
            </Route>

            <Route path="/coffee/:id">
              {() => (
                <ProtectedRoute
                  path="/coffee/:id"
                  component={CoffeeDetail}
                  roles={["roasteryOwner", "roaster"]}
                />
              )}
            </Route>

            {/* Roasting Operations */}
            <Route path="/roasting">
              {() => (
                <ProtectedRoute
                  path="/roasting"
                  component={Roasting}
                  roles={["roasteryOwner", "roaster"]}
                />
              )}
            </Route>

            <Route path="/roasting/orders">
              {() => (
                <ProtectedRoute
                  path="/roasting/orders"
                  component={RoastingOrders}
                  roles={["roasteryOwner", "roaster"]}
                />
              )}
            </Route>

            <Route path="/roasting/discrepancies">
              <ProtectedRoute
                path="/roasting/discrepancies"
                component={RoastingDiscrepancies}
                roles={["roasteryOwner", "roaster"]}
              />
            </Route>

            {/* Retail Operations */}
            <Route path="/retail">
              {() => (
                <ProtectedRoute
                  path="/retail"
                  component={Retail}
                  roles={["roasteryOwner", "retailOwner", "shopManager", "barista"]}
                />
              )}
            </Route>

            <Route path="/retail/orders">
              {() => (
                <ProtectedRoute
                  path="/retail/orders"
                  component={RetailOrders}
                  roles={["roasteryOwner", "retailOwner", "shopManager", "barista"]}
                />
              )}
            </Route>

            <Route path="/retail-overview">
              {() => (
                <ProtectedRoute
                  path="/retail-overview"
                  component={RetailOverview}
                  roles={["roasteryOwner", "retailOwner", "shopManager"]}
                />
              )}
            </Route>

            {/* Analytics & Reports */}
            <Route path="/analytics">
              {() => (
                <ProtectedRoute
                  path="/analytics"
                  component={Analytics}
                  roles={["roasteryOwner", "retailOwner", "shopManager"]}
                />
              )}
            </Route>

            <Route path="/reports">
              {() => (
                <ProtectedRoute
                  path="/reports"
                  component={Reports}
                  roles={["roasteryOwner", "retailOwner", "shopManager"]}
                />
              )}
            </Route>

            {/* Administration */}
            <Route path="/user-management">
              {() => (
                <ProtectedRoute
                  path="/user-management"
                  component={UserManagement}
                  roles={["roasteryOwner"]}
                />
              )}
            </Route>

            <Route path="/shops">
              {() => (
                <ProtectedRoute
                  path="/shops"
                  component={Shops}
                  roles={["roasteryOwner"]}
                />
              )}
            </Route>

            <Route path="/retail/new-arrivals">
              {() => (
                <ProtectedRoute
                  path="/retail/new-arrivals"
                  component={RetailNewArrivals}
                  roles={["roasteryOwner", "retailOwner", "shopManager", "barista"]}
                />
              )}
            </Route>

            {/* User Profile - accessible by all authenticated users */}
            <Route path="/profile">
              {() => <ProtectedRoute path="/profile" component={Profile} />}
            </Route>

            {/* Roasting batches - roastery management only */}
            <Route path="/roasting">
              <ProtectedRoute
                path="/roasting"
                component={RoastingBatches}
                allowedRoles={["roasteryOwner", "roaster"]}
              />
            </Route>

            {/* Settings - all roles */}
            <Route path="/settings">
              {() => (
                <ProtectedRoute
                  path="/settings"
                  component={Settings}
                  roles={["roasteryOwner", "roaster", "retailOwner", "shopManager", "barista"]}
                />
              )}
            </Route>

            {/* Orders - all roles */}
            <Route path="/orders">
              {() => (
                <ProtectedRoute
                  path="/orders"
                  component={Orders}
                  roles={["roasteryOwner", "roaster", "retailOwner", "shopManager", "barista"]}
                />
              )}
            </Route>

            {/* Users - all roles */}
            <Route path="/users">
              {() => (
                <ProtectedRoute
                  path="/users"
                  component={Users}
                  roles={["roasteryOwner", "roaster", "retailOwner", "shopManager", "barista"]}
                />
              )}
            </Route>

            {/* User-Shop Management - roasteryOwner only */}
            <Route path="/user-shop-management">
              {() => (
                <ProtectedRoute
                  path="/user-shop-management"
                  component={UserShopManagement}
                  roles={["roasteryOwner"]}
                />
              )}
            </Route>

            {/* Billing - roasteryOwner and retailOwner */}
            <Route path="/billing">
              {() => (
                <ProtectedRoute
                  path="/billing"
                  component={Billing}
                  roles={["roasteryOwner", "retailOwner"]}
                />
              )}
            </Route>

            {/* 404 route */}
            <Route component={NotFound} />
          </Switch>
        </PageLayout>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}