import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hop Tracker",
    short_name: "Hop Tracker",
    description: "Czech Republic beer trip tracker",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#451a03",
    theme_color: "#78350f",
    orientation: "portrait",
    icons: [
      {
        src: "/pwa-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
