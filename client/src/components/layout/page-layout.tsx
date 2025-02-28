import { NavBar } from "./nav-bar";
import { Breadcrumbs } from "./breadcrumbs";

export function PageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      <div className="container mx-auto px-4">
        <Breadcrumbs />
        {children}
      </div>
    </div>
  );
}
