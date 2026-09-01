"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import maplibregl, {
  type GeoJSONSource,
  type MapGeoJSONFeature,
} from "maplibre-gl";
import { createClient } from "@/lib/supabase/client";
import { map as mapConfig } from "@/lib/config";

type FC = GeoJSON.FeatureCollection<GeoJSON.Point>;

const EMPTY: FC = { type: "FeatureCollection", features: [] };

const POINT_COLOR: maplibregl.ExpressionSpecification = [
  "case",
  ["==", ["get", "paint_state"], "marked"],
  "#16a34a",
  ["==", ["get", "severity"], "high"],
  "#dc2626",
  ["==", ["get", "severity"], "low"],
  "#eab308",
  "#f97316",
];

export function MapView() {
  const wrap = useRef<HTMLDivElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Size the map explicitly from the viewport — `100dvh`-style CSS can resolve
  // to 0 in some embedded browsers, leaving the map invisible.
  useEffect(() => {
    function resize() {
      if (!wrap.current) return;
      const top = wrap.current.getBoundingClientRect().top;
      const h = Math.max(window.innerHeight - top, 360);
      wrap.current.style.height = `${h}px`;
      mapRef.current?.resize();
    }
    resize();
    window.addEventListener("resize", resize);
    // A few delayed passes catch late layout shifts (fonts, header height).
    const timers = [100, 400, 1200].map((ms) => window.setTimeout(resize, ms));
    return () => {
      window.removeEventListener("resize", resize);
      timers.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    if (!container.current || mapRef.current) return;

    const m = new maplibregl.Map({
      container: container.current,
      style: mapConfig.styleUrl,
      center: mapConfig.center,
      zoom: mapConfig.defaultZoom,
      attributionControl: { compact: true },
    });
    mapRef.current = m;
    if (process.env.NODE_ENV === "development") {
      (window as unknown as { __map: maplibregl.Map }).__map = m;
    }
    m.on("error", (e) => console.error("[map]", e.error?.message ?? e));

    m.addControl(new maplibregl.NavigationControl({}), "top-right");
    m.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
      "top-right",
    );

    m.on("load", async () => {
      m.resize();
      m.addSource("pins", {
        type: "geojson",
        data: EMPTY,
        cluster: true,
        clusterRadius: 50,
        clusterMaxZoom: 15,
      });

      m.addLayer({
        id: "clusters",
        type: "circle",
        source: "pins",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#1a1a1a",
          "circle-stroke-color": "#f5c518",
          "circle-stroke-width": 3,
          "circle-radius": [
            "step",
            ["get", "point_count"],
            16,
            10,
            22,
            50,
            30,
          ],
        },
      });
      m.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "pins",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 12,
        },
        paint: { "text-color": "#f5c518" },
      });
      m.addLayer({
        id: "pin",
        type: "circle",
        source: "pins",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": POINT_COLOR,
          "circle-radius": 8,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
        },
      });

      m.on("click", "clusters", async (e) => {
        const feature = e.features?.[0] as MapGeoJSONFeature | undefined;
        if (!feature) return;
        const clusterId = feature.properties.cluster_id as number;
        const source = m.getSource("pins") as GeoJSONSource;
        const zoom = await source.getClusterExpansionZoom(clusterId);
        m.easeTo({
          center: (feature.geometry as GeoJSON.Point).coordinates as [
            number,
            number,
          ],
          zoom,
        });
      });

      m.on("click", "pin", (e) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const id = feature.properties?.id as string;
        const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates;
        const node = document.createElement("div");
        node.innerHTML = `<a href="/pin/${id}" style="font-weight:600;color:#1a1a1a">View this report →</a>`;
        new maplibregl.Popup({ closeButton: true })
          .setLngLat([lng, lat])
          .setDOMContent(node)
          .addTo(m);
      });

      for (const layer of ["clusters", "pin"]) {
        m.on("mouseenter", layer, () => (m.getCanvas().style.cursor = "pointer"));
        m.on("mouseleave", layer, () => (m.getCanvas().style.cursor = ""));
      }

      const supabase = createClient();
      const { data, error: rpcError } = await supabase.rpc(
        "public_speed_breakers",
      );
      if (rpcError) {
        setError("Could not load reports.");
        return;
      }
      const fc = (data as FC) ?? EMPTY;
      (m.getSource("pins") as GeoJSONSource).setData(fc);
      setCount(fc.features.length);
    });

    return () => {
      m.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div ref={wrap} className="relative w-full" style={{ minHeight: 420 }}>
      <div ref={container} className="h-full w-full" />

      <Link
        href="/submit"
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 rounded-full bg-[color:var(--by-yellow)] text-black font-bold px-6 py-3 shadow-lg shadow-black/30 hover:brightness-95"
      >
        ＋ Report a speed breaker
      </Link>

      <div className="absolute top-3 left-3 z-10 rounded bg-white/90 dark:bg-black/80 px-3 py-1.5 text-xs font-medium shadow">
        {error
          ? error
          : count === null
            ? "Loading reports…"
            : `${count} report${count === 1 ? "" : "s"} on the map`}
      </div>
    </div>
  );
}
