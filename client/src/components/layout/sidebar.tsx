import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/auth-context";

const routes = [
  {
    href: "/",
    label: "Dashboard",
  },
  {
    href: "/green-coffee",
    label: "Green Coffee",
  },
  {
    href: "/roasting",
    label: "Roasting",
  },
  {
    href: "/retail",
    label: "Retail",
  },
  {
    href: "/orders",
    label: "Orders",
  },
  {
    href: "/settings",
    label: "Settings",
  },
];

export function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="hidden border-r bg-gray-100/40 lg:block dark:bg-gray-800/40">
      <div className="flex h-full flex-col gap-2">
        <div className="flex h-[60px] items-center border-b px-6">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <span>Navigation</span>
          </Link>
        </div>
        <ScrollArea className="flex-1 px-3">
          <div className="space-y-4 py-4">
            <div className="px-3 py-2">
              <div className="space-y-1">
                {routes.map((route) => (
                  <Link
                    key={route.href}
                    to={route.href}
                    className={cn(
                      "flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                      location.pathname === route.href
                        ? "bg-accent text-accent-foreground"
                        : "transparent"
                    )}
                  >
                    {route.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
} 