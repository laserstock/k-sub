"use client";

import { useEffect, useState } from "react";

export function CopyKoreanButton({
  koreanName,
}: {
  koreanName: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(t);
  }, [copied]);

  if (!koreanName.trim()) return null;

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(koreanName.trim());
      setCopied(true);
    } catch {
      // Fallback for older browsers
      const el = document.createElement("textarea");
      el.value = koreanName.trim();
      el.style.position = "fixed";
      el.style.left = "-9999px";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
    }
  }

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={onCopy}
        className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-medium text-zinc-700 transition hover:border-zinc-300 hover:bg-white hover:text-zinc-900 active:scale-[0.98]"
      >
        <span aria-hidden>📋</span>
        Copy Name in Korean
      </button>
      <span
        role="status"
        className={`pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 rounded-md bg-zinc-900 px-2 py-1 text-[11px] font-medium text-white shadow transition duration-200 ${
          copied ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
        }`}
      >
        Copied!
      </span>
    </div>
  );
}
