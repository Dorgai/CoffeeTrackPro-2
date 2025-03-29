import { Outlet } from "react-router-dom";
import { Navbar } from "./navbar";
import { Sidebar } from "./sidebar";

export function Layout() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
} 