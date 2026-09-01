"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSession, hasRole } from "@/lib/auth";
import type { Role } from "@/lib/types";

async function guard(min: Role = "moderator") {
  const session = await getSession();
  if (!hasRole(session.profile, min)) {
    throw new Error("Not authorised.");
  }
  return session;
}

function done() {
  revalidatePath("/admin");
}

export async function approvePin(formData: FormData) {
  await guard();
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("speed_breakers").update({ status: "approved" }).eq("id", id);
  // The photos shown in the queue have been visually reviewed alongside the pin.
  await supabase
    .from("photos")
    .update({ status: "approved" })
    .eq("speed_breaker_id", id)
    .eq("kind", "report")
    .eq("status", "pending");
  done();
}

export async function rejectPin(formData: FormData) {
  await guard();
  const id = String(formData.get("id"));
  const reason = String(formData.get("reason") ?? "").slice(0, 500);
  const supabase = await createClient();
  await supabase
    .from("speed_breakers")
    .update({ status: "rejected", reject_reason: reason || null })
    .eq("id", id);
  await supabase
    .from("photos")
    .update({ status: "rejected" })
    .eq("speed_breaker_id", id)
    .eq("status", "pending");
  done();
}

export async function setPhotoStatus(formData: FormData) {
  await guard();
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  if (!["approved", "rejected", "pending"].includes(status)) return;
  const supabase = await createClient();
  await supabase.from("photos").update({ status }).eq("id", id);
  done();
}

export async function setPostStatus(formData: FormData) {
  await guard();
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  if (!["visible", "removed", "pending"].includes(status)) return;
  const supabase = await createClient();
  await supabase.from("forum_posts").update({ status }).eq("id", id);
  done();
}

export async function setThreadStatus(formData: FormData) {
  await guard();
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  if (!["open", "locked", "removed"].includes(status)) return;
  const supabase = await createClient();
  await supabase.from("forum_threads").update({ status }).eq("id", id);
  done();
}

export async function resolveReport(formData: FormData) {
  await guard();
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("reports").update({ resolved: true }).eq("id", id);
  done();
}

export async function setUserRole(formData: FormData) {
  await guard("admin");
  const userId = String(formData.get("userId"));
  const role = String(formData.get("role")) as Role;
  if (!["user", "moderator", "admin"].includes(role)) return;
  const supabase = await createClient();
  await supabase.from("profiles").update({ role }).eq("id", userId);
  done();
}

export async function setUserBanned(formData: FormData) {
  await guard("admin");
  const userId = String(formData.get("userId"));
  const banned = String(formData.get("banned")) === "true";
  const supabase = await createClient();
  await supabase.from("profiles").update({ is_banned: banned }).eq("id", userId);
  done();
}
