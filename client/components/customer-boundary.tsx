"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useStaffAccess } from "@/lib/queries";

export function CustomerBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const access = useStaffAccess();
  const customerPage =
    pathname === "/" ||
    ["/menu", "/cart", "/checkout", "/orders"].some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    );
  if (!customerPage) return children;
  if (access.isChecking)
    return (
      <main className="interior wrap">
        <p role="status">Checking your session…</p>
      </main>
    );
  if (access.error)
    return (
      <main className="interior wrap">
        <h1>LET’S RECONNECT.</h1>
        <p>We could not check your account permissions.</p>
        <button
          className="action"
          type="button"
          onClick={() => access.refetch()}
        >
          TRY AGAIN
        </button>
        <Link className="text-button" href="/account">
          YOUR ACCOUNT
        </Link>
      </main>
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
