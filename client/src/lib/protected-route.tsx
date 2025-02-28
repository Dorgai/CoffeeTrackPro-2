import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Route, Redirect } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
  roles = [],
}: {
  path: string;
  component: () => React.JSX.Element;
  roles?: string[];
}) {
  const { user, isLoading } = useAuth();

  return (
    <Route path={path}>
      {() => {
        if (isLoading) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <Loader2 className="h-8 w-8 animate-spin text-border" />
            </div>
          );
        }

        if (!user || (roles.length > 0 && !roles.includes(user.role))) {
          return <Redirect to="/auth" />;
        }

        return <Component />;
      }}
    </Route>
  );
}