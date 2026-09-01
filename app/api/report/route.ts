import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";
import { rateLimits } from "@/lib/config";
import type { ReportTarget } from "@/lib/types";

const TARGETS: ReportTarget[] = ["speed_breaker", "forum_post"];

export async function POST(request: Request) {
  let body: { targetType?: string; targetId?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const targetType = body.targetType as ReportTarget;
  const targetId = String(body.targetId ?? "");
  const reason = String(body.reason ?? "").trim().slice(0, 1000);

  if (!TARGETS.includes(targetType))
    return NextResponse.json({ error: "Bad target." }, { status: 400 });
  if (!/^[0-9a-f-]{36}$/i.test(targetId))
    return NextResponse.json({ error: "Bad target id." }, { status: 400 });
  if (reason.length < 3)
    return NextResponse.json({ error: "Add a short reason." }, { status: 400 });

  const ip = clientIp(request.headers);
  if (!(await checkRateLimit(`ip:${ip}`, "report", rateLimits.reportsPerHour, 3600)))
    return NextResponse.json(
      { error: "Too many reports. Try later." },
      { status: 429 },
    );

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const { error } = await admin.from("reports").insert({
    target_type: targetType,
    target_id: targetId,
    reason,
    reporter_id: user?.id ?? null,
  });
  if (error)
    return NextResponse.json({ error: "Could not file report." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
