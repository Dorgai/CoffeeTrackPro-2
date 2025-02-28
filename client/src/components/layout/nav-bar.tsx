import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogOut, Coffee, Package, Store, Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function NavBar() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  const menuItems = [
    {
      href: "/",
      label: "Dashboard",
      roles: ["roasteryOwner", "roaster", "shopManager", "barista"],
    },
    {
      href: "/inventory",
      label: "Green Coffee",
      icon: Coffee,
      roles: ["roasteryOwner"],
    },
    {
      href: "/shops",
      label: "Shops",
      icon: Store,
      roles: ["roasteryOwner"],
    },
    {
      href: "/roasting",
      label: "Roasting",
      icon: Package,
      roles: ["roaster"],
    },
    {
      href: "/retail",
      label: "Retail",
      icon: Store,
      roles: ["shopManager", "barista"],
    },
  ];

  const filteredItems = menuItems.filter(
    (item) => item.roles.includes(user?.role || "")
  );

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <Coffee className="h-6 w-6 text-primary" />
            <span className="font-semibold hidden md:block">Coffee Manager</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            {filteredItems.map((item) => (
              <Button
                key={item.href}
                variant={location === item.href ? "default" : "ghost"}
                asChild
              >
                <Link href={item.href}>{item.label}</Link>
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            className="hidden md:flex"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>

          {/* Mobile Navigation */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-2 mt-4">
                {filteredItems.map((item) => (
                  <Button
                    key={item.href}
                    variant={location === item.href ? "default" : "ghost"}
                    asChild
                    className="justify-start"
                  >
                    <Link href={item.href}>
                      {item.icon && <item.icon className="h-4 w-4 mr-2" />}
                      {item.label}
                    </Link>
                  </Button>
                ))}
                <Button
                  variant="outline"
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                  className="justify-start"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
import { Link } from "wouter";
import { Coffee, Package, Home, ShoppingCart, Flame } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export function NavBar() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container flex h-16 items-center">
        <Link href="/" className="flex items-center space-x-2">
          <Coffee className="h-6 w-6" />
          <span className="font-bold">Coffee Roastery</span>
        </Link>
        
        <nav className="flex items-center space-x-4 lg:space-x-6 mx-6">
          <Link href="/" className="text-sm font-medium transition-colors hover:text-primary">
            <div className="flex items-center space-x-1">
              <Home className="h-4 w-4" />
              <span>Dashboard</span>
            </div>
          </Link>
          <Link href="/inventory" className="text-sm font-medium transition-colors hover:text-primary">
            <div className="flex items-center space-x-1">
              <Package className="h-4 w-4" />
              <span>Inventory</span>
            </div>
          </Link>
          <Link href="/roasting" className="text-sm font-medium transition-colors hover:text-primary">
            <div className="flex items-center space-x-1">
              <Flame className="h-4 w-4" />
              <span>Roasting</span>
            </div>
          </Link>
          <Link href="/retail" className="text-sm font-medium transition-colors hover:text-primary">
            <div className="flex items-center space-x-1">
              <ShoppingCart className="h-4 w-4" />
              <span>Retail</span>
            </div>
          </Link>
        </nav>
        
        <div className="ml-auto flex items-center space-x-4">
          {user ? (
            <>
              <span className="text-sm text-muted-foreground">
                {user.username} ({user.role})
              </span>
              <Button variant="ghost" onClick={() => logout()}>
                Logout
              </Button>
            </>
          ) : (
            <Link href="/auth">
              <Button variant="ghost">Login</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
