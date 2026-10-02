"use client";

import Link from "next/link";
import { useCart } from "@/components/cart-provider";
import { useStaffAccess, useUser } from "@/lib/queries";

export function SiteHeader() {
  const { count } = useCart();
  const { data: user } = useUser();
  const access = useStaffAccess();
  return <header className="site-header"><div className="site-nav wrap">
    <Link className="logo" href="/" aria-label="Food Flow home"><span>FOOD</span> <span>FLOW</span><sup>®</sup></Link>
    <nav aria-label="Main navigation"><Link href="/menu">The menu</Link><Link href="/orders">Orders</Link>{user && <Link href="/account">Account</Link>}{access.canUseKitchen && <Link href="/kitchen">Kitchen</Link>}{access.canManage && <Link href="/admin">Manage</Link>}</nav>
    <div className="site-nav-actions"><Link className="cart-link" href="/cart">Bag <span>{count}</span></Link><Link className="action" href="/menu">LET&apos;S EAT <span>→</span></Link></div>
  </div></header>;
}
