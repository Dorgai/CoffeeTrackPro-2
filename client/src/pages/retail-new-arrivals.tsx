import { useNavigate } from "wouter";
import { useEffect } from "react";

export default function RetailNewArrivals() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to retail page since this functionality is now handled automatically
    navigate("/retail");
  }, [navigate]);

  return null;
}