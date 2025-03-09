import { useLocation } from "wouter";
import { useEffect } from "react";

export default function RetailNewArrivals() {
  const [, navigate] = useLocation();

  useEffect(() => {
    // Redirect to retail page since this functionality is now handled automatically
    // when orders are marked as dispatched
    navigate("/retail");
  }, [navigate]);

  return null;
}