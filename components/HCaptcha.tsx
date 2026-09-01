"use client";

import { useEffect, useRef } from "react";
import { hcaptcha } from "@/lib/config";

declare global {
  interface Window {
    hcaptcha?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
    };
    onHCaptchaLoad?: () => void;
  }
}

/**
 * Renders an hCaptcha checkbox and reports the token via onVerify.
 * When no secret is configured (local dev) it immediately reports "dev".
 */
export function HCaptcha({
  onVerify,
}: {
  onVerify: (token: string | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    if (!hcaptcha.enabled) {
      onVerify("dev");
      return;
    }

    function render() {
      if (!ref.current || !window.hcaptcha || widgetId.current) return;
      widgetId.current = window.hcaptcha.render(ref.current, {
        sitekey: hcaptcha.siteKey,
        callback: (token: string) => onVerify(token),
        "expired-callback": () => onVerify(null),
        "error-callback": () => onVerify(null),
      });
    }

    if (window.hcaptcha) {
      render();
    } else {
      window.onHCaptchaLoad = render;
      if (!document.getElementById("hcaptcha-script")) {
        const s = document.createElement("script");
        s.id = "hcaptcha-script";
        s.src =
          "https://js.hcaptcha.com/1/api.js?render=explicit&onload=onHCaptchaLoad";
        s.async = true;
        s.defer = true;
        document.head.appendChild(s);
      }
    }
  }, [onVerify]);

  if (!hcaptcha.enabled) {
    return (
      <p className="text-xs text-black/50 dark:text-white/50">
        Captcha disabled (no key configured).
      </p>
    );
  }

  return <div ref={ref} />;
}
