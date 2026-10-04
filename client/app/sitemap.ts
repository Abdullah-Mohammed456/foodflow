import type { MetadataRoute } from "next";

const SITE_URL = "https://foodflow-eg.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/menu", "/cart", "/checkout", "/orders", "/login", "/register", "/account"];
  return routes.map((route) => ({
    url: `${SITE_URL}${route || "/"}`,
    lastModified: new Date(),
    changeFrequency: route === "" || route === "/menu" ? "daily" : "weekly",
    priority: route === "" ? 1 : route === "/menu" ? 0.9 : 0.5,
  }));
}
