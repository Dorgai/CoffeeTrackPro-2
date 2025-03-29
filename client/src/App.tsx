import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "./components/ui/toaster";
import { Sidebar } from "./components/layout/sidebar";
import { LoginPage } from "./pages/login";
import { DashboardPage } from "./pages/dashboard";
import { CoffeeListPage } from "./pages/coffee/list";
import { CoffeeDetailPage } from "./pages/coffee/detail";
import { RoastingOrdersPage } from "./pages/roasting/orders";
import { RetailOrdersPage } from "./pages/retail/orders";
import { InventoryPage } from "./pages/inventory";
import { SettingsPage } from "./pages/settings";
import { useAuth } from "./hooks/use-auth";

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Router>
      <div className="flex h-screen">
        {isAuthenticated && <Sidebar />}
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<DashboardPage />} />
            <Route path="/coffee" element={<CoffeeListPage />} />
            <Route path="/coffee/:id" element={<CoffeeDetailPage />} />
            <Route path="/roasting/orders" element={<RoastingOrdersPage />} />
            <Route path="/retail/orders" element={<RetailOrdersPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
      <Toaster />
    </Router>
  );
}

export default App;