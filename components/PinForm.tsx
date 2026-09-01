"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { LocationPicker, type LatLng } from "@/components/LocationPicker";
import { HCaptcha } from "@/components/HCaptcha";
import {
  compressPhoto,
  isAcceptedImage,
  MAX_PHOTOS,
} from "@/lib/images";
import type { Severity } from "@/lib/types";

function anonToken(): string {
  const KEY = "by_anon_token";
  try {
    let t = localStorage.getItem(KEY);
    if (!t) {
      t = crypto.randomUUID();
      localStorage.setItem(KEY, t);
    }
    return t;
  } catch {
    return "no-storage";
  }
}

export function PinForm() {
  const [loc, setLoc] = useState<LatLng | null>(null);
  const [landmark, setLandmark] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<Severity>("medium");
  const [photos, setPhotos] = useState<File[]>([]);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneId, setDoneId] = useState<string | null>(null);

  const onVerify = useCallback((t: string | null) => setCaptcha(t), []);

  async function addFiles(list: FileList | null) {
    if (!list) return;
    setError(null);
    const incoming = Array.from(list).filter(isAcceptedImage);
    const room = MAX_PHOTOS - photos.length;
    const picked = incoming.slice(0, room);
    try {
      const compressed = await Promise.all(picked.map(compressPhoto));
      setPhotos((p) => [...p, ...compressed]);
    } catch {
      setError("One of those images could not be processed.");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!loc) return setError("Place the pin on the map first.");
    if (photos.length === 0)
      return setError("Add at least one photo of the speed breaker.");
    if (!captcha) return setError("Please complete the captcha.");

    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("lat", String(loc.lat));
      fd.set("lng", String(loc.lng));
      fd.set("landmark", landmark);
      fd.set("description", description);
      fd.set("severity", severity);
      fd.set("captchaToken", captcha);
      fd.set("submitterToken", anonToken());
      photos.forEach((p) => fd.append("photos", p));

      const res = await fetch("/api/pins", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Submission failed.");
      setDoneId(json.id as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (doneId) {
    return (
      <div className="rounded-lg border border-green-600/30 bg-green-50 dark:bg-green-950/40 p-6 space-y-3">
        <h2 className="font-bold text-lg">Thank you 🙏</h2>
        <p className="text-sm">
          Your report has been submitted and is now waiting for a moderator to
          review it. Once approved it will appear on the public map with its own
          discussion thread.
        </p>
        <div className="flex gap-3 text-sm font-medium">
          <Link href="/" className="underline">
            Back to the map
          </Link>
          <button
            onClick={() => {
              setDoneId(null);
              setLoc(null);
              setLandmark("");
              setDescription("");
              setPhotos([]);
              setCaptcha(null);
            }}
            className="underline"
          >
            Report another
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <label className="block font-semibold mb-1">Location *</label>
        <LocationPicker value={loc} onChange={setLoc} />
      </div>

      <div>
        <label htmlFor="landmark" className="block font-semibold mb-1">
          Nearest landmark
        </label>
        <input
          id="landmark"
          value={landmark}
          onChange={(e) => setLandmark(e.target.value)}
          maxLength={200}
          placeholder="e.g. Opposite City Hospital gate"
          className="w-full rounded border border-black/15 dark:border-white/15 bg-transparent px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="description" className="block font-semibold mb-1">
          What makes it dangerous?
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="Unmarked, no warning sign, very steep, bad at night…"
          className="w-full rounded border border-black/15 dark:border-white/15 bg-transparent px-3 py-2"
        />
      </div>

      <div>
        <label htmlFor="severity" className="block font-semibold mb-1">
          Severity
        </label>
        <select
          id="severity"
          value={severity}
          onChange={(e) => setSeverity(e.target.value as Severity)}
          className="rounded border border-black/15 dark:border-white/15 bg-transparent px-3 py-2"
        >
          <option value="low">Low — mild jolt</option>
          <option value="medium">Medium — clearly hazardous</option>
          <option value="high">High — caused / nearly caused a crash</option>
        </select>
      </div>

      <div>
        <label className="block font-semibold mb-1">
          Photos * (up to {MAX_PHOTOS})
        </label>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={(e) => addFiles(e.target.files)}
          className="block text-sm"
        />
        {photos.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {photos.map((p, i) => (
              <div key={i} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={`Photo ${i + 1}`}
                  src={URL.createObjectURL(p)}
                  className="h-20 w-20 object-cover rounded border border-black/10"
                />
                <button
                  type="button"
                  onClick={() =>
                    setPhotos((arr) => arr.filter((_, j) => j !== i))
                  }
                  className="absolute -top-2 -right-2 bg-black text-white rounded-full w-5 h-5 text-xs"
                  aria-label="Remove photo"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="mt-1 text-xs text-black/50 dark:text-white/50">
          Photos are resized and stripped of location metadata before upload.
        </p>
      </div>

      <HCaptcha onVerify={onVerify} />

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="rounded-full bg-[color:var(--by-yellow)] text-black font-bold px-6 py-3 disabled:opacity-50"
      >
        {busy ? "Submitting…" : "Submit report"}
      </button>
    </form>
  );
}
