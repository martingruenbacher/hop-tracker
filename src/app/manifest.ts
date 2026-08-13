import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hop Tracker",
    short_name: "Hop Tracker",
    id: "/",
    description: "Czech Republic beer trip tracker",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    display_override: ["standalone"],
    background_color: "#451a03",
    theme_color: "#78350f",
    orientation: "portrait",
    icons: [
      {
        src: "/pwa-icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/pwa-icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
