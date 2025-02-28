import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import Inventory from "@/pages/inventory";
import Roasting from "@/pages/roasting";
import Retail from "@/pages/retail";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={Dashboard} />
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute 
        path="/inventory" 
        component={Inventory}
        roles={["roasteryOwner"]}
      />
      <ProtectedRoute 
        path="/roasting" 
        component={Roasting}
        roles={["roaster"]}
      />
      <ProtectedRoute 
        path="/retail" 
        component={Retail} 
        roles={["shopManager", "barista"]}
      />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;