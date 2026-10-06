"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import gsap from "gsap";
import { useQueryClient } from "@tanstack/react-query";
import { useCart } from "@/components/cart-provider";
import { useStaffAccess, useUser } from "@/lib/queries";
import { apiFetch } from "@/lib/api";
import { errorMessage } from "@/lib/alerts";
import { ThemeToggle } from "@/components/theme-toggle";

function useRollUnderline(
  rootRef: RefObject<HTMLElement | null>,
  active = false,
) {
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add("(hover: hover) and (prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        const first = el.querySelector(".nav-roll-first");
        const second = el.querySelector(".nav-roll-second");
        const line = el.querySelector(".nav-roll-line");
        gsap.set(second, { y: 0, yPercent: 100 });
        gsap.set(line, {
          scaleX: active ? 1 : 0,
          transformOrigin: "left center",
        });
        const timeline = gsap
          .timeline({
            paused: true,
            defaults: { overwrite: "auto", duration: 0.4, ease: "power3.out" },
          })
          .to(first, { yPercent: -100 }, 0)
          .to(second, { yPercent: 0 }, 0);
        if (!active) timeline.to(line, { scaleX: 1 }, 0);
        const play = () => timeline.play();
        const leave = () => {
          if (!el.matches(":focus-visible")) timeline.reverse();
        };
        const focus = () => {
          if (el.matches(":focus-visible")) timeline.play();
        };
        const blur = () => {
          if (!el.matches(":hover")) timeline.reverse();
        };
        el.addEventListener("pointerenter", play);
        el.addEventListener("pointerleave", leave);
        el.addEventListener("focus", focus);
        el.addEventListener("blur", blur);
        return () => {
          el.removeEventListener("pointerenter", play);
          el.removeEventListener("pointerleave", leave);
          el.removeEventListener("focus", focus);
          el.removeEventListener("blur", blur);
        };
      }, el);
      return () => ctx.revert();
    });
    return () => mm.revert();
  }, [rootRef, active]);
}

function RollLink({
  href,
  children,
  active = false,
  trailing,
  className = "",
  label,
}: {
  href: string;
  children: ReactNode;
  active?: boolean;
  trailing?: ReactNode;
  className?: string;
  label?: string;
}) {
  const root = useRef<HTMLAnchorElement>(null);
  useRollUnderline(root, active);
  return (
    <Link
      ref={root}
      className={`nav-roll ${className}`}
      aria-label={label}
      data-active={active ? "true" : undefined}
      href={href}
    >
      <span className="nav-roll-mask">
        <span className="nav-roll-first">{children}</span>
        <span className="nav-roll-second" aria-hidden="true">
          {children}
        </span>
        <span className="nav-roll-line" aria-hidden="true" />
      </span>
      {trailing}
    </Link>
  );
}

function RollButton({
  children,
  onClick,
  disabled = false,
  className = "",
  label,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  label?: string;
}) {
  const root = useRef<HTMLButtonElement>(null);
  useRollUnderline(root, false);
  return (
    <button
      ref={root}
      type="button"
      className={`nav-roll ${className}`}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="nav-roll-mask">
        <span className="nav-roll-first">{children}</span>
        <span className="nav-roll-second" aria-hidden="true">
          {children}
        </span>
        <span className="nav-roll-line" aria-hidden="true" />
      </span>
    </button>
  );
}

function BagButton({ count }: { count: number }) {
  const badge = useRef<HTMLSpanElement>(null);
  const previous = useRef(count);
  const pathname = usePathname();
  useEffect(() => {
    if (count === previous.current) return;
    previous.current = count;
    const el = badge.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    const ctx = gsap.context(() => {
      gsap
        .timeline()
        .fromTo(
          el,
          { scale: 1 },
          { scale: 1.25, duration: 0.15, ease: "power2.out" },
        )
        .to(el, { scale: 1, duration: 0.2, ease: "back.out(2)" });
    }, el);
    return () => ctx.revert();
  }, [count]);
  return (
    <RollLink
      href="/cart"
      className="cart-link nav-roll-bag"
      label={`Bag ${count}`}
      active={pathname === "/cart"}
      trailing={
        <span
          ref={badge}
          className="bag-badge"
          data-has-items={count > 0 ? "true" : "false"}
        >
          {count}
        </span>
      }
    >
      Bag
    </RollLink>
  );
}

export function SiteHeader() {
  const { count, clear: clearCart } = useCart();
  const { data: user, isPending: userPending } = useUser();
  const access = useStaffAccess();
  const client = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);
  const customer = !access.isStaff && !access.isChecking && !access.error;
  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await apiFetch("/api/auth/logout", { method: "POST", body: "{}" });
      clearCart();
      client.clear();
      client.setQueryData(["me"], null);
      router.replace("/");
      router.refresh();
    } catch (caught) {
      console.error(caught);
      void errorMessage(caught);
    } finally {
      setSigningOut(false);
    }
  };
  return (
    <header className="site-header">
      <div className="site-nav wrap">
        <Link
          className="logo"
          href={access.isStaff ? "/kitchen" : "/"}
          aria-label="Food Flow home"
        >
          <span>FOOD</span> <span>FLOW</span>
          <sup>®</sup>
        </Link>
        <nav aria-label="Main navigation">
          {customer && (
            <>
              <RollLink href="/" active={pathname === "/"}>
                Home
              </RollLink>
              <RollLink href="/menu" active={pathname === "/menu"}>
                The Menu
              </RollLink>
              <RollLink href="/orders" active={pathname === "/orders"}>
                Orders
              </RollLink>
            </>
          )}
          {user && (
            <RollLink href="/account" active={pathname === "/account"}>
              Account
            </RollLink>
          )}
          {access.canUseKitchen && (
            <RollLink href="/kitchen" active={pathname === "/kitchen"}>
              Kitchen
            </RollLink>
          )}
          {access.canManage && (
            <RollLink href="/admin" active={pathname === "/admin"}>
              Manage
            </RollLink>
          )}
          {user ? (
            <RollButton
              onClick={signOut}
              disabled={signingOut}
              className="nav-auth"
            >
              Logout
            </RollButton>
          ) : userPending ? (
            <span className="nav-auth-placeholder" aria-hidden="true" />
          ) : (
            customer && (
              <RollLink
                href="/login"
                active={pathname === "/login"}
                className="nav-auth"
              >
                Login
              </RollLink>
            )
          )}
        </nav>
        <div className="site-nav-actions">
          <ThemeToggle />
          {customer && <BagButton count={count} />}
        </div>
      </div>
    </header>
  );
}
