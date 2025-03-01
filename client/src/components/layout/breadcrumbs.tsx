import { useLocation } from "wouter";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const routes: Record<string, string> = {
  "/": "Dashboard",
  "/inventory": "Green Coffee Inventory",
  "/roasting": "Roasting",
  "/retail": "Retail Management",
  "/shops": "Shop Management",
  "/orders": "Orders",
};

export function Breadcrumbs() {
  const [location] = useLocation();
  const pathSegments = location.split("/").filter(Boolean);
  
  return (
    <Breadcrumb className="py-4">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/">Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        {pathSegments.map((segment, index) => {
          const path = `/${pathSegments.slice(0, index + 1).join("/")}`;
          const isLast = index === pathSegments.length - 1;
          
          return (
            <BreadcrumbItem key={path}>
              {isLast ? (
                <span className="font-medium">{routes[path] || segment}</span>
              ) : (
                <>
                  <BreadcrumbLink href={path}>
                    {routes[path] || segment}
                  </BreadcrumbLink>
                  <BreadcrumbSeparator />
                </>
              )}
            </BreadcrumbItem>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
