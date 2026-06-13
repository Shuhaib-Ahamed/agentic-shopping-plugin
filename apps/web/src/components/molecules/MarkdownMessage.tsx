import { memo, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/cn";

export interface MarkdownMessageProps {
  text: string;
  className?: string;
  /** When true, the inverted variant is used (assistant on lavender → dark ink). */
  tone?: "default" | "inverted";
}

// Strip em dashes and en dashes at render time. We tell Juno never to use them
// in the system prompt, but enforce it defensively here too: anything that
// slips through is converted to ", " so the layout never breaks visually.
function normalizePunctuation(s: string): string {
  return s.replace(/\s?-\s?/g, ", ").replace(/\s?–\s?/g, ", ");
}

// Renders assistant text as Markdown. GitHub-flavoured (lists, bold, italic,
// links, inline code, fenced code). Block elements are styled so the result
// reads like a clean chat bubble, not a documentation page.
//
// Component overrides explicitly remove default browser margins (which collide
// with our bubble padding) and tighten spacing for chat-density reading.
export const MarkdownMessage = memo(function MarkdownMessage({
  text,
  className,
  tone = "default",
}: MarkdownMessageProps) {
  const cleaned = normalizePunctuation(text);
  const muted = tone === "inverted" ? "rgba(255,255,255,0.72)" : "var(--color-text-muted)";
  const linkColor = tone === "inverted" ? "#fff" : "var(--color-cta)";

  const components: Components = {
    p: ({ children }) => (
      <p
        className="m-0 mt-2 first:mt-0 whitespace-pre-wrap text-pretty"
        style={{ lineHeight: "inherit" }}
      >
        {children}
      </p>
    ),
    strong: ({ children }) => <strong className="font-bold">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    a: ({ children, href }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold underline underline-offset-2 hover:no-underline"
        style={{ color: linkColor }}
      >
        {children}
      </a>
    ),
    ul: ({ children }) => (
      <ul className="m-0 mt-2 pl-5 list-disc space-y-1 marker:opacity-60">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="m-0 mt-2 pl-5 list-decimal space-y-1 marker:opacity-60">{children}</ol>
    ),
    li: ({ children }) => <li className="text-pretty leading-snug">{children}</li>,
    code: ({ children, className: codeClassName }) => {
      // Inline code: no language tag. Fenced blocks have a language- prefix.
      const isBlock = codeClassName?.startsWith("language-");
      if (isBlock) {
        return (
          <pre
            className="m-0 mt-2 p-3 rounded-[10px] overflow-x-auto"
            style={{
              background: tone === "inverted" ? "rgba(0,0,0,0.18)" : "var(--color-surface-warm)",
              fontFamily: "var(--font-mono)",
              fontSize: "0.92em",
            }}
          >
            <code>{children}</code>
          </pre>
        );
      }
      return (
        <code
          className="px-1.5 py-0.5 rounded-[6px]"
          style={{
            background:
              tone === "inverted" ? "rgba(255,255,255,0.18)" : "var(--color-surface-warm)",
            fontFamily: "var(--font-mono)",
            fontSize: "0.92em",
          }}
        >
          {children}
        </code>
      );
    },
    blockquote: ({ children }) => (
      <blockquote
        className="m-0 mt-2 pl-3 border-l-2 italic"
        style={{
          borderColor: tone === "inverted" ? "rgba(255,255,255,0.4)" : "var(--color-border-strong)",
          color: muted,
        }}
      >
        {children}
      </blockquote>
    ),
    hr: () => (
      <hr
        className="my-3 border-0 h-px"
        style={{
          background: tone === "inverted" ? "rgba(255,255,255,0.25)" : "var(--color-border)",
        }}
      />
    ),
    h1: ({ children }) => (
      <h4 className="m-0 mt-3 text-[1.05em] font-bold leading-snug">{children}</h4>
    ),
    h2: ({ children }) => (
      <h4 className="m-0 mt-3 text-[1.05em] font-bold leading-snug">{children}</h4>
    ),
    h3: ({ children }) => (
      <h5 className="m-0 mt-3 text-[1em] font-semibold leading-snug">{children}</h5>
    ),
    h4: ({ children }) => (
      <h5 className="m-0 mt-3 text-[1em] font-semibold leading-snug">{children}</h5>
    ),
    h5: ({ children }) => (
      <h6 className="m-0 mt-2 text-[0.95em] font-semibold leading-snug">{children}</h6>
    ),
    h6: ({ children }) => (
      <h6 className="m-0 mt-2 text-[0.95em] font-semibold leading-snug">{children}</h6>
    ),
    table: ({ children }) => (
      <div className="mt-2 overflow-x-auto">
        <table className="min-w-full text-left text-[0.95em] border-collapse">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead>{children}</thead>,
    tbody: ({ children }) => <tbody>{children}</tbody>,
    tr: ({ children }) => (
      <tr
        style={{
          borderBottom: `1px solid ${tone === "inverted" ? "rgba(255,255,255,0.18)" : "var(--color-border)"}`,
        }}
      >
        {children}
      </tr>
    ),
    th: ({ children }) => <th className="px-2 py-1.5 font-semibold">{children}</th>,
    td: ({ children }) => <td className="px-2 py-1.5">{children}</td>,
  } satisfies Components;

  return (
    <div className={cn("markdown-message", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {cleaned}
      </ReactMarkdown>
    </div>
  );
}) as unknown as (props: MarkdownMessageProps) => ReactNode;
