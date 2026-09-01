"use client";

import { useState } from "react";
import type { ReportTarget } from "@/lib/types";

export function ReportButton({
  targetType,
  targetId,
}: {
  targetType: ReportTarget;
  targetId: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  async function send() {
    setState("busy");
    const res = await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType, targetId, reason }),
    });
    setState(res.ok ? "done" : "error");
  }

  if (state === "done")
    return <span className="text-xs text-black/40">Reported — thank you</span>;

  return (
    <span className="inline">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-xs text-black/40 dark:text-white/40 hover:text-red-600"
      >
        Report
      </button>
      {open && (
        <span className="ml-2 inline-flex items-center gap-1">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason"
            maxLength={1000}
            className="rounded border border-black/15 px-2 py-0.5 text-xs bg-transparent"
          />
          <button
            onClick={send}
            disabled={state === "busy" || reason.trim().length < 3}
            className="rounded bg-black/10 px-2 py-0.5 text-xs disabled:opacity-40"
          >
            Send
          </button>
          {state === "error" && (
            <span className="text-xs text-red-600">failed</span>
          )}
        </span>
      )}
    </span>
  );
}
