import type { Metadata } from "next";
import type { ReactNode } from "react";
import "sweetalert2/dist/sweetalert2.min.css";
import "./globals.css";
import { Providers } from "./providers";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { FloatingBag } from "@/components/floating-bag";
import { CustomerBoundary } from "@/components/customer-boundary";
import { ButtonMotion } from "@/components/button-motion";
import { PageMotion } from "@/components/page-motion";

const SITE_URL = "https://foodflow-eg.vercel.app";
const SITE_NAME = "FoodFlow";
const SITE_DESCRIPTION =
  "FoodFlow is a fast-food restaurant in Egypt serving pizza, burgers, sandwiches, fries, chicken, shakes, desserts and combo deals. Order dine-in, takeaway or delivery.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "FoodFlow — Pizza, Burgers & Combos in Egypt",
    template: "%s | FoodFlow",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "FoodFlow",
    "fast food Egypt",
    "pizza Egypt",
    "burgers Egypt",
    "sandwiches",
    "fried chicken",
    "combo deals",
    "food delivery Egypt",
    "takeaway Cairo",
  ],
  authors: [{ name: "FoodFlow" }],
  creator: "FoodFlow",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_EG",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "FoodFlow — Pizza, Burgers & Combos in Egypt",
    description: SITE_DESCRIPTION,
    images: [{ url: "/media/menu/combo.jpg", width: 1200, height: 630, alt: "FoodFlow burger, fries and drink combo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "FoodFlow — Pizza, Burgers & Combos in Egypt",
    description: SITE_DESCRIPTION,
    images: ["/media/menu/combo.jpg"],
  },
  robots: { index: true, follow: true },
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('foodflow-theme');document.documentElement.dataset.theme=t==='dark'?'dark':'light'}catch(e){}})()` }}/>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Restaurant",
              name: "FoodFlow",
              url: SITE_URL,
              servesCuisine: ["Pizza", "Burgers", "Sandwiches", "Fast Food"],
              priceRange: "EGP",
              address: { "@type": "PostalAddress", addressCountry: "EG", addressLocality: "Cairo" },
              hasMenu: `${SITE_URL}/menu`,
              acceptsReservations: "False",
            }),
          }}
        />
        <Providers><SiteHeader /><CustomerBoundary>{children}</CustomerBoundary><SiteFooter /><FloatingBag /><PageMotion /><ButtonMotion /></Providers>
      </body>
    </html>
  );
}
