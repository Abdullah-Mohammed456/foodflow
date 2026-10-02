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
      <p role="status" className="text-sm text-neutral-500">
        Checking API…
      </p>
    );
  }

  if (query.isError) {
    return (
      <p role="alert" className="text-sm text-red-600">
        API unreachable:{" "}
        {query.error instanceof Error
          ? query.error.message
          : "unknown error"}
      </p>
    );
  }

  return (
    <p role="status" className="text-sm text-green-700">
      API connected (uptime {query.data.uptimeSeconds}s,{" "}
      {query.data.timestamp})
    </p>
  );
}
