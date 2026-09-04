"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { compressPhoto, isAcceptedImage, MAX_PHOTOS } from "@/lib/images";

export function AfterPhotoUpload({ speedBreakerId }: { speedBreakerId: string }) {
  const supabase = createClient();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data }) => setSignedIn(Boolean(data.user)));
  }, [supabase]);

  async function add(list: FileList | null) {
    if (!list) return;
    const picked = Array.from(list)
      .filter(isAcceptedImage)
      .slice(0, MAX_PHOTOS - files.length);
    const compressed = await Promise.all(picked.map(compressPhoto));
    setFiles((f) => [...f, ...compressed]);
  }

  async function submit() {
    if (files.length === 0) return;
    setState("busy");
    setMsg(null);
    const fd = new FormData();
    fd.set("speedBreakerId", speedBreakerId);
    files.forEach((f) => fd.append("photos", f));
    const res = await fetch("/api/after-photos", { method: "POST", body: fd });
    const json = await res.json();
    if (res.ok) {
      setState("done");
    } else {
      setState("error");
      setMsg(json.error ?? "Upload failed.");
    }
  }

  if (signedIn === null) return null;

  if (state === "done")
    return (
      <p className="by-note by-note--ok">
        Thanks! Your &ldquo;after&rdquo; photos are pending moderator review. If
        confirmed, this speed breaker will be marked as painted.
      </p>
    );

  if (!signedIn)
    return (
      <p className="text-sm">
        <Link href="/login" className="by-link font-semibold">
          Sign in
        </Link>{" "}
        to upload photos showing this speed breaker has been painted.
      </p>
    );

  return (
    <div className="space-y-3">
      <input
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={(e) => add(e.target.files)}
        className="by-file block text-sm"
      />
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((f, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              alt=""
              src={URL.createObjectURL(f)}
              className="h-16 w-16 object-cover border border-[color:var(--by-line)]"
            />
          ))}
        </div>
      )}
      <button
        onClick={submit}
        disabled={state === "busy" || files.length === 0}
        className="by-btn by-btn--accent by-btn--sm"
      >
        {state === "busy" ? "Uploading…" : "Submit “after” photos"}
      </button>
      {msg && <p className="by-note by-note--error">{msg}</p>}
    </div>
  );
}
