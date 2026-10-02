import Link from "next/link";

export function SiteFooter() {
  return <footer className="site-footer"><div className="wrap footer-top"><div><Link className="logo" href="/"><span>FOOD</span> <span>FLOW</span><sup>®</sup></Link><p>Good food. Every mood.</p></div><nav aria-label="Footer navigation"><Link href="/menu">The menu</Link><Link href="/orders">Your orders</Link><Link href="/account">Your account</Link></nav></div><div className="wrap footer-bottom"><span>GOOD FOOD. EVERY MOOD.</span><span>© {new Date().getFullYear()} FOOD FLOW</span></div></footer>;
}
