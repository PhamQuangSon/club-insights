import { Suspense } from "react";
import { Dashboard } from "@/components/dashboard/Dashboard";

/** The page is a client dashboard that reads everything through the JSON API. */
export default function HomePage() {
  return (
    <Suspense>
      <Dashboard />
    </Suspense>
  );
}
