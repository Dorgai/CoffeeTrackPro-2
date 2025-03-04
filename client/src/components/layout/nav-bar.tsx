import * as React from "react";
import { Link } from "wouter";
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
import { useAuth } from "@/hooks/use-auth";
import { ShopSelector } from "./shop-selector";
import { RestockDialog } from "../coffee/restock-dialog";
import { GreenBeansStockIndicator } from "./green-beans-stock-indicator";
import { Coffee } from "lucide-react";

export function NavBar() {
  const { user, logoutMutation } = useAuth();

  return (
    <div className="border-b">
      <div className="flex h-16 items-center px-4">
        <div className="mr-4 flex">
          <Link href="/" className="flex items-center">
            <img
              src="/assets/logo.jpg"
              alt="Sonic Beans Logo"
              className="h-8 w-auto"
            />
          </Link>
        </div>
        <Menubar className="border-none">
          <MenubarMenu>
            <MenubarTrigger>Dashboard</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>
                <Link href="/" className="flex w-full">
                  Home
                </Link>
              </MenubarItem>
              <MenubarItem>
                <Link href="/inventory" className="flex w-full">
                  Inventory
                </Link>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
          {(user?.role === "roasteryOwner" || user?.role === "shopManager") && (
            <>
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
              <MenubarMenu>
                <MenubarTrigger>Finance</MenubarTrigger>
                <MenubarContent>
                  <MenubarItem>
                    <Link href="/billing" className="flex w-full">
                      Billing Events
                    </Link>
                  </MenubarItem>
                </MenubarContent>
              </MenubarMenu>
            </>
          )}
          {user?.role === "roasteryOwner" && (
            <>
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
              <MenubarMenu>
                <MenubarTrigger>Management</MenubarTrigger>
                <MenubarContent>
                  <MenubarItem>
                    <Link href="/shops" className="flex w-full">
                      Shop Management
                    </Link>
                  </MenubarItem>
                  <MenubarItem>
                    <Link href="/user-management" className="flex w-full">
                      User Management
                    </Link>
                  </MenubarItem>
                </MenubarContent>
              </MenubarMenu>
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
            </>
          )}
          {user?.role === "roaster" && (
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
                <MenubarItem>
                  <Link href="/inventory" className="flex w-full">
                    Inventory
                  </Link>
                </MenubarItem>
              </MenubarContent>
            </MenubarMenu>
          )}
          {(user?.role === "shopManager" || user?.role === "barista") && (
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
              {(user.role === "shopManager" || user.role === "barista") && <ShopSelector />}
              {(user.role === "roasteryOwner" || user.role === "roaster") && (
                <GreenBeansStockIndicator />
              )}
              {(user.role === "roasteryOwner" || user.role === "shopManager" || user.role === "barista") && <RestockDialog />}
              {(user.role === "roasteryOwner" || user.role === "roaster") && (
                <Button variant="outline" size="sm" asChild>
                  <Link href="/inventory" className="flex items-center">
                    <Coffee className="h-4 w-4 mr-2" />
                    Update Green Coffee
                  </Link>
                </Button>
              )}
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
              <Link href="/login" className="text-sm font-medium">
                Login
              </Link>
              <Link href="/register" className="text-sm font-medium">
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}