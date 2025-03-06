import { Route, Switch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/toaster";
import { PageLayout } from "@/components/layout/page-layout";
import Dashboard from "@/pages/dashboard";
import AuthPage from "@/pages/auth-page";
import Inventory from "@/pages/inventory";
import CoffeeDetail from "@/pages/coffee-detail";
import Roasting from "@/pages/roasting";
import RoastingOrders from "@/pages/roasting-orders";
import RoastingDiscrepancies from "@/pages/roasting-discrepancies";
import Retail from "@/pages/retail";
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

            {/* Protected routes */}
            <Route path="/">
              {() => (
                <ProtectedRoute
                  path="/"
                  component={Dashboard}
                  roles={["owner", "roasteryOwner", "roaster", "shopManager", "barista"]}
                />
              )}
            </Route>
            <Route path="/inventory">
              {() => <ProtectedRoute path="/inventory" component={Inventory} roles={["owner", "roasteryOwner", "roaster"]} />}
            </Route>
            <Route path="/coffee/:id">
              {() => <ProtectedRoute path="/coffee/:id" component={CoffeeDetail} roles={["owner", "roasteryOwner", "roaster"]} />}
            </Route>
            <Route path="/roasting">
              {() => <ProtectedRoute path="/roasting" component={Roasting} roles={["owner", "roasteryOwner", "roaster"]} />}
            </Route>
            <Route path="/roasting/orders">
              {() => <ProtectedRoute path="/roasting/orders" component={RoastingOrders} roles={["owner", "roasteryOwner", "roaster"]} />}
            </Route>
            <Route path="/roasting/discrepancies">
              {() => <ProtectedRoute path="/roasting/discrepancies" component={RoastingDiscrepancies} roles={["owner", "roasteryOwner", "roaster"]} />}
            </Route>
            <Route path="/retail">
              {() => <ProtectedRoute path="/retail" component={Retail} roles={["owner", "roasteryOwner", "retailOwner", "shopManager", "barista"]} />}
            </Route>
            <Route path="/retail/orders">
              {() => <ProtectedRoute path="/retail/orders" component={RetailOrders} roles={["owner", "roasteryOwner", "retailOwner", "shopManager", "barista"]} />}
            </Route>
            <Route path="/retail-overview">
              {() => <ProtectedRoute path="/retail-overview" component={RetailOverview} roles={["owner", "roasteryOwner", "retailOwner"]} />}
            </Route>
            <Route path="/analytics">
              {() => <ProtectedRoute path="/analytics" component={Analytics} roles={["owner", "roasteryOwner", "retailOwner", "shopManager"]} />}
            </Route>
            <Route path="/reports">
              {() => <ProtectedRoute path="/reports" component={Reports} roles={["owner", "roasteryOwner", "retailOwner", "shopManager"]} />}
            </Route>
            <Route path="/user-management">
              {() => <ProtectedRoute path="/user-management" component={UserManagement} roles={["owner", "roasteryOwner"]} />}
            </Route>
            <Route path="/shops">
              {() => <ProtectedRoute path="/shops" component={Shops} roles={["owner", "roasteryOwner"]} />}
            </Route>
            <Route path="/retail/new-arrivals">
              {() => <ProtectedRoute path="/retail/new-arrivals" component={RetailNewArrivals} roles={["owner", "roasteryOwner", "retailOwner", "shopManager", "barista"]} />}
            </Route>
            <Route path="/profile">
              {() => <ProtectedRoute path="/profile" component={Profile} />}
            </Route>
            <Route path="/billing">
              {() => <ProtectedRoute path="/billing" component={Billing} roles={["owner", "roasteryOwner"]} />}
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