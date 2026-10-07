"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useStaffAccess } from "@/lib/queries";
import { AppLoaderGate } from "@/components/app-loader";

export function CustomerBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const access = useStaffAccess();
  const customerPage =
    pathname === "/" ||
    ["/menu", "/cart", "/checkout", "/orders"].some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    );
  if (!customerPage) return children;
  if (access.isChecking || access.error)
    return (
      <AppLoaderGate
        done={!access.isChecking && !access.error}
        failed={!!access.error}
        onRetry={() => access.refetch()}
      >
        <main className="interior wrap">
          <p role="status">Checking your session…</p>
        </main>
      </AppLoaderGate>
    );
  if (access.isStaff)
    return (
      <main className="interior wrap staff-welcome">
        <span className="eyebrow">FOOD FLOW / STAFF WORKSPACE</span>
        <h1>READY FOR SERVICE.</h1>
        <p>
          Your staff account opens the kitchen and management tools. Use a
          separate customer account for personal orders.
        </p>
        <div className="staff-links">
          {access.canUseKitchen && (
            <Link className="action" href="/kitchen">
              OPEN KITCHEN
            </Link>
          )}
          {access.canManage && (
            <Link className="action light" href="/admin">
              OPEN MANAGEMENT
            </Link>
          )}
          <Link className="text-button" href="/account">
            YOUR ACCOUNT
          </Link>
        </div>
      </main>
    );
  return children;
}
