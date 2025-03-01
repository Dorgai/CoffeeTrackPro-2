import { Route, Switch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "./hooks/use-auth";
import { Toaster } from "@/components/ui/toaster";
import { PageLayout } from "@/components/layout/page-layout";
import Dashboard from "@/pages/dashboard";
import AuthPage from "@/pages/auth-page";
import Inventory from "@/pages/inventory";
import Roasting from "@/pages/roasting";
import RoastingOrders from "@/pages/roasting-orders";
import Retail from "@/pages/retail";
import RetailOrders from "@/pages/retail-orders";
import RetailOverview from "@/pages/retail-overview";
import Shops from "@/pages/shops";
import NotFound from "@/pages/not-found";
import { ProtectedRoute } from "@/lib/protected-route";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Switch>
          <PageLayout>
            {/* Auth routes outside of layout */}
            <Route path="/auth" component={AuthPage} />
            <Route path="/login" component={AuthPage} />

            {/* Protected routes with roles */}
            <ProtectedRoute path="/" component={Dashboard} />
            <ProtectedRoute path="/inventory" component={Inventory} roles={["roasteryOwner"]} />
            <ProtectedRoute path="/roasting" component={Roasting} roles={["roaster"]} />
            <ProtectedRoute path="/roasting/orders" component={RoastingOrders} roles={["roaster"]} />
            <ProtectedRoute path="/retail" component={Retail} roles={["shopManager", "barista"]} />
            <ProtectedRoute path="/retail/orders" component={RetailOrders} roles={["shopManager", "barista"]} />
            <ProtectedRoute path="/retail-overview" component={RetailOverview} roles={["roasteryOwner"]} />
            <ProtectedRoute path="/shops" component={Shops} roles={["roasteryOwner"]} />

            {/* NotFound route must be last */}
            <Route component={NotFound} />
          </PageLayout>
        </Switch>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}