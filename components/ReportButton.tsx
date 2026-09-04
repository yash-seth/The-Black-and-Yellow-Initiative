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
    return <span className="text-xs by-muted">Reported — thank you</span>;

  return (
    <span className="inline">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-xs by-muted uppercase tracking-[0.04em] hover:text-[color:var(--by-error)]"
      >
        Report
      </button>
      {open && (
        <span className="ml-2 inline-flex items-center gap-1.5">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason"
            maxLength={1000}
            className="by-field by-field--sm w-40 min-h-0"
          />
          <button
            onClick={send}
            disabled={state === "busy" || reason.trim().length < 3}
            className="by-btn by-btn--ghost by-btn--sm disabled:opacity-40"
          >
            Send
          </button>
          {state === "error" && (
            <span className="text-xs text-[color:var(--by-error)]">failed</span>
          )}
        </span>
      )}
    </span>
  );
}
