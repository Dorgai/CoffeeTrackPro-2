import { Link, useLocation } from "wouter";
import { ChevronRight } from "lucide-react";

export function Breadcrumbs() {
  const [location] = useLocation();
  
  const paths = location.split("/").filter(Boolean);
  const breadcrumbs = paths.map((path, index) => {
    const href = "/" + paths.slice(0, index + 1).join("/");
    return {
      href,
      label: path.charAt(0).toUpperCase() + path.slice(1),
    };
  });

  if (breadcrumbs.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
      <Link href="/" className="hover:text-foreground">
        Home
      </Link>
      {breadcrumbs.map((crumb, index) => (
        <div key={crumb.href} className="flex items-center gap-2">
          <ChevronRight className="h-4 w-4" />
          <Link
            href={crumb.href}
            className={
              index === breadcrumbs.length - 1
                ? "text-foreground font-medium"
                : "hover:text-foreground"
            }
          >
            {crumb.label}
          </Link>
        </div>
      ))}
    </div>
  );
}
