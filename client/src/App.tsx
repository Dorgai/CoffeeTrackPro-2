import { Route, Switch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";

function HomePage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold">Welcome to Coffee Supply Chain Manager</h1>
      <p className="mt-2">A comprehensive solution for coffee roasteries and retail shops.</p>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Switch>
        <Route path="/" component={HomePage} />
      </Switch>
      <Toaster />
    </QueryClientProvider>
  );
}