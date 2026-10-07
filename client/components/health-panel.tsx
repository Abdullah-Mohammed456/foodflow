"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch, type HealthData } from "@/lib/api";

export function HealthPanel() {
  const query = useQuery({
    queryKey: ["health"],
    queryFn: () => apiFetch<HealthData>("/health"),
  });

  if (query.isPending) {
    return (
      <p role="status" className="health-status">
        Checking API…
      </p>
    );
  }

  if (query.isError) {
    return (
      <p role="alert" className="health-error">
        API unreachable:{" "}
        {query.error instanceof Error
          ? query.error.message
          : "unknown error"}
      </p>
    );
  }

  return (
    <p role="status" className="health-ok">
      API connected (uptime {query.data.uptimeSeconds}s,{" "}
      {query.data.timestamp})
    </p>
  );
}
