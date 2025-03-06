import * as React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Store, Coffee, Package } from "lucide-react";
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

  // Role-based access control
  const isRetailUser = user?.role === "retailOwner" || user?.role === "shopManager" || user?.role === "barista";
  const isRoasteryUser = user?.role === "roasteryOwner" || user?.role === "roaster";
  const canManageShops = user?.role === "roasteryOwner";
  const canManageUsers = user?.role === "roasteryOwner";
  const canAccessGreenCoffee = user?.role === "roasteryOwner" || user?.role === "roaster";
  const canAccessAnalytics = user?.role === "roasteryOwner" || user?.role === "retailOwner" || user?.role === "shopManager";
  const canAccessRoasting = user?.role === "roasteryOwner" || user?.role === "roaster";
  const canAccessRetail = user?.role === "roasteryOwner" || user?.role === "retailOwner" || user?.role === "shopManager" || user?.role === "barista";

  return (
    <div className="border-b">
      <div className="flex h-16 items-center px-4">
        <div className="mr-4 flex">
          <Link href="/" className="flex items-center">
            <Coffee className="h-6 w-6" />
          </Link>
        </div>

        {/* Shop Selector */}
        {user && <ShopSelector />}

        <Menubar className="border-none">
          <MenubarMenu>
            <MenubarTrigger>Dashboard</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>
                <Link href="/" className="flex w-full">
                  Home
                </Link>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>

          {canAccessAnalytics && (
            <MenubarMenu>
              <MenubarTrigger>Analytics</MenubarTrigger>
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


          {canAccessGreenCoffee && (
            <MenubarMenu>
              <MenubarTrigger>Green Coffee</MenubarTrigger>
              <MenubarContent>
                <MenubarItem>
                  <Link href="/inventory" className="flex w-full">
                    Inventory
                  </Link>
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>
          )}

          {canManageShops && (
            <MenubarMenu>
              <MenubarTrigger>Management</MenubarTrigger>
              <MenubarContent>
                <MenubarItem>
                  <Link href="/shops" className="flex w-full">
                    Shop Management
                  </Link>
                </MenubarItem>
                {canManageUsers && (
                  <MenubarItem>
                    <Link href="/user-management" className="flex w-full">
                      User Management
                    </Link>
                  </MenubarItem>
                )}
              </MenubarContent>
            </MenubarMenu>
          )}

          {canAccessRoasting && (
            <MenubarMenu>
              <MenubarTrigger>Roasting</MenubarTrigger>
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

          {canAccessRetail && (
            <>
              <MenubarMenu>
                <MenubarTrigger>Retail</MenubarTrigger>
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
                </MenubarContent>
              </MenubarMenu>
              <MenubarMenu>
                <MenubarTrigger>New Arrivals</MenubarTrigger>
                <MenubarContent>
                  <MenubarItem>
                    <Link href="/retail/new-arrivals" className="flex w-full">
                      Pending Confirmations
                    </Link>
                  </MenubarItem>
                </MenubarContent>
              </MenubarMenu>
            </>
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