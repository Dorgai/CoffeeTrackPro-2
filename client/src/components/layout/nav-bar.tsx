import * as React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Store, Coffee, Package, BarChart2, Users, Settings } from "lucide-react";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { GreenBeansStockIndicator } from "./green-beans-stock-indicator";
import { ShopSelector } from "./shop-selector";

export function NavBar() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();

  // Role-based access control for menu items
  const isRetailUser = ["owner", "retailOwner", "shopManager", "barista"].includes(user?.role || "");
  const isRoasteryUser = ["roasteryOwner", "roaster"].includes(user?.role || "");
  const canManageShops = ["owner", "roasteryOwner"].includes(user?.role || "");
  const canManageUsers = ["owner", "roasteryOwner"].includes(user?.role || "");
  const canAccessGreenCoffee = ["owner", "roasteryOwner", "roaster"].includes(user?.role || "");
  const canAccessAnalytics = ["owner", "roasteryOwner", "retailOwner", "shopManager"].includes(user?.role || "");
  const canAccessRoasting = ["owner", "roasteryOwner", "roaster"].includes(user?.role || "");
  const canAccessRetail = ["owner", "roasteryOwner", "retailOwner", "shopManager", "barista"].includes(user?.role || "");

  // Redirect users to their appropriate dashboard
  const homePath = isRetailUser ? "/manager-dashboard" : "/";

  return (
    <div className="border-b">
      <div className="flex h-16 items-center px-4">
        <div className="mr-4 flex">
          <Link href={homePath} className="flex items-center">
            <Coffee className="h-6 w-6" />
          </Link>
        </div>

        {user && (
          <div className="mr-4">
            <ShopSelector />
          </div>
        )}

        <Menubar className="border-none">
          {/* Dashboard Menu */}
          <MenubarMenu>
            <MenubarTrigger>Dashboard</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>
                <Link href={homePath} className="flex w-full">
                  Home
                </Link>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          {/* Analytics Menu */}
          {canAccessAnalytics && (
            <MenubarMenu>
              <MenubarTrigger>
                <BarChart2 className="h-4 w-4 mr-2" />
                Analytics
              </MenubarTrigger>
              <MenubarContent>
                <MenubarItem>
                  <Link href="/analytics" className="flex w-full">
                    Overview
                  </Link>
                </MenubarItem>
                <MenubarItem>
                  <Link href="/reports" className="flex w-full">
                    Reports
                  </Link>
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>
          )}

          {/* Green Coffee Menu */}
          {canAccessGreenCoffee && (
            <MenubarMenu>
              <MenubarTrigger>
                <Coffee className="h-4 w-4 mr-2" />
                Green Coffee
              </MenubarTrigger>
              <MenubarContent>
                <MenubarItem>
                  <Link href="/inventory" className="flex w-full">
                    Inventory
                  </Link>
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>
          )}

          {/* Management Menu */}
          {canManageShops && (
            <MenubarMenu>
              <MenubarTrigger>
                <Settings className="h-4 w-4 mr-2" />
                Management
              </MenubarTrigger>
              <MenubarContent>
                <MenubarItem>
                  <Link href="/shops" className="flex w-full">
                    Shop Management
                  </Link>
                </MenubarItem>
                {canManageUsers && (
                  <>
                    <MenubarItem>
                      <Link href="/user-management" className="flex w-full">
                        User Management
                      </Link>
                    </MenubarItem>
                    <MenubarItem>
                      <Link href="/user-shop-management" className="flex w-full">
                        User-Shop Assignment
                      </Link>
                    </MenubarItem>
                  </>
                )}
              </MenubarContent>
            </MenubarMenu>
          )}

          {/* Roasting Menu */}
          {canAccessRoasting && (
            <MenubarMenu>
              <MenubarTrigger>
                <Package className="h-4 w-4 mr-2" />
                Roasting
              </MenubarTrigger>
              <MenubarContent>
                <MenubarItem>
                  <Link href="/roasting/orders" className="flex w-full">
                    Orders
                  </Link>
                </MenubarItem>
                <MenubarItem>
                  <Link href="/roasting" className="flex w-full">
                    Batches
                  </Link>
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>
          )}

          {/* Retail Menu */}
          {canAccessRetail && (
            <MenubarMenu>
              <MenubarTrigger>
                <Store className="h-4 w-4 mr-2" />
                Retail
              </MenubarTrigger>
              <MenubarContent>
                <MenubarItem>
                  <Link href="/retail" className="flex w-full">
                    Inventory
                  </Link>
                </MenubarItem>
                <MenubarItem>
                  <Link href="/retail/orders" className="flex w-full">
                    Orders
                  </Link>
                </MenubarItem>
                <MenubarItem>
                  <Link href="/retail-overview" className="flex w-full">
                    Overview
                  </Link>
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>
          )}
        </Menubar>

        <div className="ml-auto flex items-center space-x-4">
          {user ? (
            <div className="flex items-center space-x-4">
              {canAccessGreenCoffee && <GreenBeansStockIndicator />}
              <Avatar>
                <AvatarFallback>
                  {user.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Menubar className="border-none">
                <MenubarMenu>
                  <MenubarTrigger>{user.username}</MenubarTrigger>
                  <MenubarContent>
                    <MenubarItem>
                      <Link href="/profile" className="flex w-full">
                        Profile
                      </Link>
                    </MenubarItem>
                    <MenubarSeparator />
                    <MenubarItem
                      onClick={() => logoutMutation.mutate()}
                      disabled={logoutMutation.isPending}
                    >
                      Logout
                      <MenubarShortcut>⇧⌘Q</MenubarShortcut>
                    </MenubarItem>
                  </MenubarContent>
                </MenubarMenu>
              </Menubar>
            </div>
          ) : (
            <div className="flex gap-2">
              <Link href="/auth" className="text-sm font-medium">
                Login
              </Link>
              <Link href="/auth" className="text-sm font-medium">
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}