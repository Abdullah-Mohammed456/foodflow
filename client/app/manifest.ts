import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FoodFlow — Pizza, Burgers & Combos",
    short_name: "FoodFlow",
    description:
      "Fast-food ordering in Egypt: pizza, burgers, sandwiches, fries, chicken, shakes and combos for dine-in, takeaway and delivery.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f4ec",
    theme_color: "#26332e",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
