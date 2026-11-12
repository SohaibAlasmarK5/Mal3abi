"use client";

import ar from "@mal3abi/shared/messages/ar.json";
import en from "@mal3abi/shared/messages/en.json";
import "./globals.css";

/**
 * Last resort when the root layout itself fails, so no language provider is available.
 * Shows the message in both languages, Arabic first.
 */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="bg-bg text-ink flex min-h-dvh items-center justify-center p-4 font-sans">
        <div className="rounded-card border-line bg-surface flex max-w-xl flex-col gap-6 border p-8 text-center">
          {[ar, en].map((messages, index) => (
            <div key={index} lang={index === 0 ? "ar" : "en"} dir={index === 0 ? "rtl" : "ltr"}>
              <h1 className="text-xl font-semibold">{messages.shell.error.title}</h1>
              <p className="text-muted mt-2">{messages.shell.error.body}</p>
            </div>
          ))}
          <button
            type="button"
            onClick={reset}
            className="h-control rounded-control bg-accent text-accent-ink mx-auto inline-flex items-center gap-3 px-5 font-semibold"
          >
            <span lang="ar">{ar.shell.error.retry}</span>
            <span lang="en">{en.shell.error.retry}</span>
          </button>
        </div>
      </body>
    </html>
  );
}
