import { Route, Routes } from "react-router-dom";
import { Layout } from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import AuthPage from "@/pages/auth-page";
import Inventory from "@/pages/inventory";
import CoffeeDetail from "@/pages/coffee-detail";
import Roasting from "@/pages/roasting";
import Retail from "@/pages/retail";
import Order from "@/pages/order";
import { RequireAuth } from "@/components/auth/require-auth";
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
        <Routes>
          <Route path="/login" element={<AuthPage />} />

          <Route element={<Layout />}>
            <Route element={<RequireAuth />}>
              <Route path="/" element={<Dashboard />} />

              <Route path="/inventory" element={<Inventory />} />
              <Route path="/coffee/:id" element={<CoffeeDetail />} />

              <Route path="/roasting" element={<Roasting />} />
              <Route path="/retail" element={<Retail />} />
              <Route path="/order" element={<Order />} />
            </Route>
          </Route>
        </Routes>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;