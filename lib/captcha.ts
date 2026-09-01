import "server-only";

import { hcaptcha } from "@/lib/config";

/**
 * Verifies an hCaptcha token with hCaptcha's siteverify endpoint.
 * Returns true when captcha is disabled (no secret configured) so local dev
 * works without keys.
 */
export async function verifyCaptcha(
  token: string | null | undefined,
  remoteip?: string,
): Promise<boolean> {
  if (!hcaptcha.enabled) return true;
  if (!token) return false;

  const body = new URLSearchParams({
    secret: process.env.HCAPTCHA_SECRET!,
    response: token,
  });
  if (remoteip) body.set("remoteip", remoteip);

  try {
    const res = await fetch("https://api.hcaptcha.com/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
