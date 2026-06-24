import { memo } from "react";
import { cn } from "@/lib/cn";

export interface ChatBackgroundProps {
  className?: string;
}

// Chat background - "Gift-wrap" vibe ported verbatim from
// /Users/shuhaib/Downloads/Juno Welcome.html (VIBE 3). A two-tone polka
// pattern in violet + saffron, softened by a white centre wash, with sparse
// violet line motifs (gift box, ribbon bow, present, gift bag) and two slow
// amber sparkles in the middle band. Lives behind the message stream once
// the shopper leaves the hero state - paired with HeroParallax which covers
// the empty hero state. Honors `prefers-reduced-motion` via the global rule
// in styles.css.
export const ChatBackground = memo(function ChatBackground({ className }: ChatBackgroundProps) {
  return (
    <div
      aria-hidden
      className={cn("absolute inset-0 overflow-hidden pointer-events-none select-none", className)}
    >
      {/* Two-tone polka pattern. Violet dots on the base grid + saffron dots
          on a 19px-offset grid → a checker of warm + cool dots at 38px
          spacing. Opacity sits at 0.9 of the original colour; the dots are
          already low alpha (.16 violet, .30 saffron) so the surface reads as
          gentle pattern, not visual noise. */}
      <div
        className="absolute inset-0 opacity-90"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 50%, rgba(74,46,130,.16) 2.4px, transparent 3px), radial-gradient(circle at 50% 50%, rgba(249,178,51,.30) 2px, transparent 2.6px)",
          backgroundSize: "38px 38px, 38px 38px",
          backgroundPosition: "0 0, 19px 19px",
        }}
      />
      {/* Soft white vignette. Pushes the polka pattern toward the edges so the
          conversation column reads on a near-white centre. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(70% 60% at 50% 42%, rgba(255,255,255,.66), rgba(255,255,255,0) 72%)",
        }}
      />

      {/* Sparse line motifs - violet gift iconography drifting in the corners
          so the centre stays clear for messages. */}
      <div
        className="absolute"
        style={{
          left: "7%",
          top: "30%",
          color: "#4A2E82",
          opacity: 0.4,
          animation: "chat-bg-floA 10s ease-in-out infinite",
        }}
      >
        {/* Gift box, slightly tilted. */}
        <svg
          width="56"
          height="56"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transform: "rotate(-10deg)" }}
        >
          <rect x="3" y="9.5" width="18" height="11" rx="1.5" />
          <path d="M3 13.5h18M12 9.5v11" />
          <path d="M12 9.5C11 7 7.5 6 6.8 7.6 6 9.4 9.7 9.5 12 9.5ZM12 9.5C13 7 16.5 6 17.2 7.6 18 9.4 14.3 9.5 12 9.5Z" />
        </svg>
      </div>

      <div
        className="absolute"
        style={{
          left: "13%",
          top: "70%",
          color: "#4A2E82",
          opacity: 0.36,
          animation: "chat-bg-floB 9s ease-in-out infinite",
        }}
      >
        {/* Ribbon bow. */}
        <svg
          width="46"
          height="46"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 12C9 8.5 4.5 9 4.5 12S9 15.5 12 12ZM12 12c3-3.5 7.5-3 7.5 0S15 15.5 12 12Z" />
          <circle cx="12" cy="12" r="1.6" />
          <path d="M12 13.6v6M10.4 19.6h3.2" />
        </svg>
      </div>

      <div
        className="absolute"
        style={{
          right: "7.5%",
          top: "28%",
          color: "#4A2E82",
          opacity: 0.4,
          animation: "chat-bg-floC 11s ease-in-out infinite",
        }}
      >
        {/* Present with a tag. */}
        <svg
          width="54"
          height="54"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transform: "rotate(6deg)" }}
        >
          <path d="M4 20.5h16M5.5 20.5v-7h13v7M5.5 13.5h13M12 9v4.5" />
          <circle cx="12" cy="7.4" r="0.8" fill="currentColor" />
        </svg>
      </div>

      <div
        className="absolute"
        style={{
          right: "13%",
          top: "71%",
          color: "#4A2E82",
          opacity: 0.36,
          animation: "chat-bg-floA 12s ease-in-out infinite",
        }}
      >
        {/* Gift bag. */}
        <svg
          width="46"
          height="46"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5.5 8.5h13l-1 11.5h-11z" />
          <path d="M9 8.5V7a3 3 0 0 1 6 0v1.5" />
        </svg>
      </div>

      {/* Two amber sparkles in the middle band, rotating slowly on different
          intervals so the sparkle eye doesn't sync. */}
      <div
        className="absolute"
        style={{
          left: "22%",
          top: "46%",
          color: "var(--color-accent-dark)",
          opacity: 0.5,
          animation: "chat-bg-spin 28s linear infinite",
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3c.4 4.2 1.8 5.6 6 6-4.2 .4-5.6 1.8-6 6-.4-4.2-1.8-5.6-6-6 4.2-.4 5.6-1.8 6-6Z" />
        </svg>
      </div>

      <div
        className="absolute"
        style={{
          right: "23%",
          top: "44%",
          color: "var(--color-accent-dark)",
          opacity: 0.5,
          animation: "chat-bg-spin 32s linear infinite",
        }}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3c.4 4.2 1.8 5.6 6 6-4.2 .4-5.6 1.8-6 6-.4-4.2-1.8-5.6-6-6 4.2-.4 5.6-1.8 6-6Z" />
        </svg>
      </div>
    </div>
  );
});
