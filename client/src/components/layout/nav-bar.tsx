import * as React from "react";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "react-router-dom";

export function NavBar() {
  const { user, logout } = useAuth();

  return (
    <div className="border-b">
      <div className="flex h-16 items-center px-4">
        <div className="mr-4 flex">
          <Link to="/" className="flex items-center">
            <img src="/logo.svg" alt="Logo" className="h-8 w-8" />
            <span className="ml-2 text-xl font-bold">CoffeeHub</span>
          </Link>
        </div>
        <Menubar className="border-none">
          <MenubarMenu>
            <MenubarTrigger>Dashboard</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>
                <Link to="/" className="flex w-full">
                  Home
                </Link>
              </MenubarItem>
              <MenubarItem>
                <Link to="/analytics" className="flex w-full">
                  Analytics
                </Link>
              </MenubarItem>
              <MenubarItem>
                <Link to="/reports" className="flex w-full">
                  Reports
                </Link>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>Green Coffee</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>
                <Link to="/green-coffee/inventory" className="flex w-full">
                  Inventory
                </Link>
              </MenubarItem>
              <MenubarItem>
                <Link to="/green-coffee/purchases" className="flex w-full">
                  Purchases
                </Link>
              </MenubarItem>
              <MenubarItem>
                <Link to="/green-coffee/suppliers" className="flex w-full">
                  Suppliers
                </Link>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>Roasting</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>
                <Link to="/roasting/profiles" className="flex w-full">
                  Profiles
                </Link>
              </MenubarItem>
              <MenubarItem>
                <Link to="/roasting/batches" className="flex w-full">
                  Batches
                </Link>
              </MenubarItem>
              <MenubarItem>
                <Link to="/roasting/schedule" className="flex w-full">
                  Schedule
                </Link>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>Retail</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>
                <Link to="/retail/products" className="flex w-full">
                  Products
                </Link>
              </MenubarItem>
              <MenubarItem>
                <Link to="/retail/orders" className="flex w-full">
                  Orders
                </Link>
              </MenubarItem>
              <MenubarItem>
                <Link to="/retail/customers" className="flex w-full">
                  Customers
                </Link>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
        <div className="ml-auto flex items-center space-x-4">
          {user ? (
            <div className="flex items-center">
              <Avatar>
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback>
                  {user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <Menubar className="border-none">
                <MenubarMenu>
                  <MenubarTrigger>{user.name}</MenubarTrigger>
                  <MenubarContent>
                    <MenubarItem>
                      <Link to="/profile" className="flex w-full">
                        Profile
                      </Link>
                    </MenubarItem>
                    <MenubarItem>
                      <Link to="/settings" className="flex w-full">
                        Settings
                      </Link>
                    </MenubarItem>
                    <MenubarSeparator />
                    <MenubarItem onClick={logout}>
                      Logout
                      <MenubarShortcut>⇧⌘Q</MenubarShortcut>
                    </MenubarItem>
                  </MenubarContent>
                </MenubarMenu>
              </Menubar>
            </div>
          ) : (
            <div className="flex gap-2">
              <Link to="/login" className="text-sm font-medium">
                Login
              </Link>
              <Link to="/register" className="text-sm font-medium">
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}