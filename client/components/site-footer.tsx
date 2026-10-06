"use client";

import Link from "next/link";
import { useStaffAccess } from "@/lib/queries";

export function SiteFooter() {
  const access = useStaffAccess();
  return <footer className="site-footer"><div className="wrap footer-top"><div><Link className="logo" href={access.isStaff ? "/kitchen" : "/"}><span>FOOD</span> <span>FLOW</span><sup>®</sup></Link><p>Good food. Every mood.</p></div><nav aria-label="Footer navigation">{access.isStaff ? <><Link href="/kitchen">Kitchen</Link>{access.canManage && <Link href="/admin">Management</Link>}</> : !access.isChecking && !access.error && <><Link href="/menu">The menu</Link><Link href="/orders">Your orders</Link></>}<Link href="/account">Your account</Link></nav></div><div className="wrap footer-bottom"><span>GOOD FOOD. EVERY MOOD.</span><span>© {new Date().getFullYear()} FOOD FLOW</span></div></footer>;
}
