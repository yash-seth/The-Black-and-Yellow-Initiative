"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { map as mapConfig } from "@/lib/config";

export interface LatLng {
  lat: number;
  lng: number;
}

export function LocationPicker({
  value,
  onChange,
}: {
  value: LatLng | null;
  onChange: (v: LatLng) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!container.current || mapRef.current) return;

    const start = value ?? {
      lng: mapConfig.center[0],
      lat: mapConfig.center[1],
    };

    const m = new maplibregl.Map({
      container: container.current,
      style: mapConfig.styleUrl,
      center: [start.lng, start.lat],
      zoom: value ? 16 : mapConfig.defaultZoom,
    });
    mapRef.current = m;
    m.addControl(new maplibregl.NavigationControl({}), "top-right");

    const marker = new maplibregl.Marker({ draggable: true, color: "#dc2626" })
      .setLngLat([start.lng, start.lat])
      .addTo(m);
    markerRef.current = marker;

    marker.on("dragend", () => {
      const { lat, lng } = marker.getLngLat();
      onChange({ lat, lng });
    });
    m.on("click", (e) => {
      marker.setLngLat(e.lngLat);
      onChange({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });

    return () => {
      m.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reflect external value changes (e.g. geolocation) onto the marker/map.
  useEffect(() => {
    if (!value || !mapRef.current || !markerRef.current) return;
    markerRef.current.setLngLat([value.lng, value.lat]);
    mapRef.current.easeTo({ center: [value.lng, value.lat], zoom: 16 });
  }, [value]);

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="space-y-2">
      <div
        ref={container}
        className="h-64 w-full overflow-hidden border border-[color:var(--by-line-strong)]"
      />
      <div className="flex items-center justify-between gap-3 text-xs">
        <button
          type="button"
          onClick={useMyLocation}
          className="by-btn by-btn--ghost by-btn--sm"
        >
          {locating ? "Locating…" : "📍 Use my location"}
        </button>
        <span className="by-muted tabular-nums">
          {value
            ? `${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`
            : "Tap the map to place the pin"}
        </span>
      </div>
    </div>
  );
}
