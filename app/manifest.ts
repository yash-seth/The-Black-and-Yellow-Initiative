import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Black & Yellow",
    short_name: "Black & Yellow",
    description:
      "Map dangerous, unmarked speed breakers and help get them painted.",
    start_url: "/",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#f5c518",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
