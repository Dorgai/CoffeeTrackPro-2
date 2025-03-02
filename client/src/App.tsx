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
              {() => <ProtectedRoute component={Dashboard} />}
            </Route>
            <Route path="/inventory">
              {() => <ProtectedRoute component={Inventory} roles={["roasteryOwner"]} />}
            </Route>
            <Route path="/coffee/:id">
              {() => <ProtectedRoute component={CoffeeDetail} roles={["roasteryOwner"]} />}
            </Route>
            <Route path="/roasting">
              {() => <ProtectedRoute component={Roasting} roles={["roaster"]} />}
            </Route>
            <Route path="/roasting/orders">
              {() => <ProtectedRoute component={RoastingOrders} roles={["roaster"]} />}
            </Route>
            <Route path="/retail">
              {() => <ProtectedRoute component={Retail} roles={["roasteryOwner", "shopManager", "barista"]} />}
            </Route>
            <Route path="/retail/orders">
              {() => <ProtectedRoute component={RetailOrders} roles={["roasteryOwner", "shopManager", "barista"]} />}
            </Route>
            <Route path="/retail-overview">
              {() => <ProtectedRoute component={RetailOverview} roles={["roasteryOwner"]} />}
            </Route>
            <Route path="/analytics">
              {() => <ProtectedRoute component={Analytics} roles={["roasteryOwner", "shopManager"]} />}
            </Route>
            <Route path="/reports">
              {() => <ProtectedRoute component={Reports} roles={["roasteryOwner", "shopManager"]} />}
            </Route>
            <Route path="/user-management">
              {() => <ProtectedRoute component={UserManagement} roles={["roasteryOwner"]} />}
            </Route>
            <Route path="/shops">
              {() => <ProtectedRoute component={Shops} roles={["roasteryOwner"]} />}
            </Route>
            <Route path="/retail/new-arrivals">
              {() => <ProtectedRoute component={RetailNewArrivals} roles={["roasteryOwner", "shopManager", "barista"]} />}
            </Route>
            <Route path="/profile">
              {() => <ProtectedRoute component={Profile} />}
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