import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/auth-context";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { Layout } from "@/components/layout";
import { LoginPage } from "@/pages/login";
import { DashboardPage } from "@/pages/dashboard";
import { GreenCoffeePage } from "@/pages/green-coffee";
import { RoastingPage } from "@/pages/roasting";
import { RetailPage } from "@/pages/retail";
import { OrdersPage } from "@/pages/orders";
import { SettingsPage } from "@/pages/settings";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="green-coffee" element={<GreenCoffeePage />} />
              <Route path="roasting" element={<RoastingPage />} />
              <Route path="retail" element={<RetailPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </Router>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;