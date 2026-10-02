import { FastFoodHero } from "@/components/fast-food-hero";
import { HealthPanel } from "@/components/health-panel";
import { API_BASE, type HealthData } from "@/lib/api";

async function getServerHealth(): Promise<HealthData | null> {
  try {
    const apiBase = process.env["API_INTERNAL_URL"] ?? API_BASE;
    const res = await fetch(`${apiBase}/health`, { cache: "no-store" });
    if (!res.ok) return null;
    const body = (await res.json()) as { success: boolean; data: HealthData };
    return body.success ? body.data : null;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const serverHealth = await getServerHealth();

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-6 py-16">
      <FastFoodHero />
      <header className="flex flex-col gap-2">
        <p className="text-sm font-medium tracking-wide text-neutral-500">
          M1 · Foundation
        </p>
        <h1 className="text-4xl font-bold">
          Food<span className="text-primary">Flow</span>
        </h1>
        <p className="text-neutral-600">
          Restaurant ordering and management platform. Foundation milestone:
          frontend and backend are connected.
        </p>
      </header>

      <section
        aria-label="Backend connectivity"
        className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4"
      >
        <h2 className="text-lg font-semibold">Backend connectivity</h2>
        {serverHealth ? (
          <p role="status" className="text-sm text-green-700">
            Server render reached the API (uptime {serverHealth.uptimeSeconds}
            s).
          </p>
        ) : (
          <p role="status" className="text-sm text-amber-700">
            Server render could not reach the API yet — is it running on{" "}
            {API_BASE}?
          </p>
        )}
        <HealthPanel />
      </section>
    </main>
  );
}
