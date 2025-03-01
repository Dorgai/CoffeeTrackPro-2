import { Route, Switch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "./hooks/use-auth";
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
            {/* Auth routes */}
            <Route path="/auth" component={AuthPage} />
            <Route path="/login" component={AuthPage} />

            {/* Protected routes with roles */}
            <ProtectedRoute path="/" component={Dashboard} />
            <ProtectedRoute path="/inventory" component={Inventory} roles={["roasteryOwner"]} />
            <ProtectedRoute path="/coffee/:id" component={CoffeeDetail} roles={["roasteryOwner"]} />
            <ProtectedRoute path="/roasting" component={Roasting} roles={["roaster"]} />
            <ProtectedRoute path="/roasting/orders" component={RoastingOrders} roles={["roaster"]} />
            <ProtectedRoute path="/retail" component={Retail} roles={["roasteryOwner", "shopManager", "barista"]} />
            <ProtectedRoute path="/retail/orders" component={RetailOrders} roles={["roasteryOwner", "shopManager", "barista"]} />
            <ProtectedRoute path="/retail-overview" component={RetailOverview} roles={["roasteryOwner"]} />
            <ProtectedRoute path="/analytics" component={Analytics} roles={["roasteryOwner", "shopManager"]} />
            <ProtectedRoute path="/reports" component={Reports} roles={["roasteryOwner", "shopManager"]} />
            <ProtectedRoute path="/user-management" component={UserManagement} roles={["roasteryOwner"]} />
            <ProtectedRoute path="/shops" component={Shops} roles={["roasteryOwner"]} />
            <ProtectedRoute 
              path="/retail/new-arrivals" 
              component={RetailNewArrivals} 
              roles={["roasteryOwner", "shopManager", "barista"]} 
            />
            <ProtectedRoute path="/profile" component={Profile} />

            {/* NotFound route must be last */}
            <Route component={NotFound} />
          </Switch>
        </PageLayout>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}