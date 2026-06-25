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

// Strip em dashes (U+2014) and en dashes (U+2013) at render time. We tell Juno
// never to use them in the system prompt, but enforce it defensively here too:
// anything that slips through is converted to ", " so the layout never breaks
// visually. Never touch the regular hyphen-minus (U+002D) — order IDs and
// compound words depend on it.
function normalizePunctuation(s: string): string {
  return s.replace(/\s?[—–]\s?/g, ", ");
}

// Defensive: strip leaked tool-call syntax that occasionally bleeds into the
// shopper-facing text when the model emits a UI tool as prose instead of a
// real function call. We've seen `<present_options chips> ...` and bare
// `present_options, label: ..., value: ...` blocks survive into the chat.
// The real chips render from the tool call; the text version is just noise.
//
// Matches any well-formed tag like `<present_options ...>` (including a
// trailing optional close tag), AND bare lines that start with a known UI
// tool name followed by `,` or `(` and a chip-like payload. Conservative on
// purpose: only well-known tool prefixes, never plain prose.
const TOOL_NAMES = [
  "present_options",
  "present_products",
  "present_product_detail",
  "present_delivery_quote",
  "present_checkout",
  "request_info",
  "update_cart",
  "order_confirmed",
  "notify",
].join("|");

const ANGLE_TAG_RE = new RegExp(
  `<(?:${TOOL_NAMES})\\b[\\s\\S]*?(?:/>|<\\/(?:${TOOL_NAMES})>|$)`,
  "gi",
);
// `[present_options]`, `[present_options "args"]`, `[present_options(args)]` -
// markdown-bracket badge form. The model sometimes emits this when it knows it
// should call a UI tool but writes the call as prose instead. Strip the bracket
// span so surrounding sentence text survives.
const BRACKET_TAG_RE = new RegExp(`\\[(?:${TOOL_NAMES})\\b[^\\]]*\\]`, "gi");
// `present_options,` (inline JSON), `present_options(` (function-call style),
// or `present_options:` followed by the rendered chip block. Greedy across
// any trailing chip list (markdown bullets, pipe-delimited rows, or raw
// `label:.. value:..` JSON fragments) so the noise vanishes too. Stops at a
// blank line OR end-of-input — `(?![\s\S])` matches end-of-input regardless
// of the `m` flag, so we don't fall back to end-of-line.
const HEADER_BLOCK_RE = new RegExp(
  `^\\s*(?:${TOOL_NAMES})\\s*[,(:][\\s\\S]*?(?=\\n\\s*\\n|(?![\\s\\S]))`,
  "gim",
);
// Stray `label: "X", value: "Y"` (and the related `icon:`/`emoji:`) lines that
// sometimes leak even without a `present_options:` header. Conservative: only
// matches lines that look like a chip object key, never plain prose.
const CHIP_FIELD_RE = /^\s*(?:label|value|icon|emoji)\s*[:=][^\n]*$/gim;

function stripLeakedToolSyntax(s: string): string {
  return s
    .replace(ANGLE_TAG_RE, "")
    .replace(BRACKET_TAG_RE, "")
    .replace(HEADER_BLOCK_RE, "")
    .replace(CHIP_FIELD_RE, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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
  const cleaned = normalizePunctuation(stripLeakedToolSyntax(text));
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
