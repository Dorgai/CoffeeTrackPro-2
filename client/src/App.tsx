import { Route, Switch } from "wouter";
import { Layout } from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import AuthPage from "@/pages/auth-page";
import Inventory from "@/pages/inventory";
import CoffeeDetail from "@/pages/coffee-detail";
import Roasting from "@/pages/roasting";
import Retail from "@/pages/retail";
import Order from "@/pages/order";
import NotFound from "@/pages/not-found";
import { ProtectedRoute } from "@/lib/protected-route";
import { useUser } from "@/hooks/use-user";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "./hooks/use-auth";
import { Toaster } from "@/components/ui/toaster";


function App() {
  const { isLoading } = useUser();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Switch>
          <Route path="/login">{() => <AuthPage />}</Route>
          <Route path="/auth">{() => <AuthPage />}</Route>
          
          <Layout>
            <ProtectedRoute path="/" component={Dashboard} />
            <ProtectedRoute path="/inventory" component={Inventory} />
            <ProtectedRoute path="/coffee/:id" component={CoffeeDetail} />
            <ProtectedRoute path="/roasting" component={Roasting} />
            <ProtectedRoute path="/retail" component={Retail} />
            <ProtectedRoute path="/order" component={Order} />
            <Route path="/:rest*">{() => <NotFound />}</Route>
          </Layout>
        </Switch>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;