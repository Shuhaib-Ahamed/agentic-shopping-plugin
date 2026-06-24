import { motion, useReducedMotion } from "motion/react";
import { memo, type ReactNode } from "react";
import { JunoMark } from "@/components/atoms";
import { cn } from "@/lib/cn";
import { instant, springs } from "@/lib/motion";
import { MarkdownMessage } from "./MarkdownMessage";

export type MessageRole = "user" | "assistant";

export interface MessageBubbleProps {
  role: MessageRole;
  text: string;
  agentName?: string;
  timestamp?: string;
  lang?: "en" | "si" | "ta";
  className?: string;
  children?: ReactNode;
}

// Editorial chat bubble. User text renders plain (what they typed is what they
// meant). Assistant text renders as GitHub-flavoured Markdown so Juno can use
// **bold**, lists, links, and inline code naturally.
export const MessageBubble = memo(function MessageBubble({
  role,
  text,
  timestamp,
  lang,
  className,
  children,
}: MessageBubbleProps) {
  const isUser = role === "user";
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced ? instant : springs.snappy}
      layout="position"
      className={cn(
        "flex w-full gap-3 items-start",
        isUser ? "flex-row-reverse" : "flex-row",
        className,
      )}
    >
      {!isUser && (
        <div
          className="mt-1 shrink-0 flex items-center justify-center rounded-full shadow-[0_1px_2px_rgba(20,16,40,0.08)]"
          style={{
            width: 40,
            height: 40,
            background: "var(--color-violet)",
          }}
        >
          <JunoMark size={28} bare mono="#ffffff" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[82%] md:max-w-[640px] lg:max-w-[720px] px-4 py-2.5",
          isUser
            ? "rounded-[var(--radius-bubble)] rounded-br-[4px] text-white ml-auto shadow-[var(--shadow-cta)]"
            : "rounded-[var(--radius-bubble)] rounded-bl-[4px] mr-auto shadow-[var(--shadow-bubble)]",
        )}
        style={
          isUser
            ? { background: "var(--color-cta)" }
            : { background: "var(--color-lavender)", color: "var(--color-lavender-ink)" }
        }
        lang={lang}
      >
        {isUser ? (
          <p
            className="whitespace-pre-wrap text-pretty m-0"
            style={{
              fontSize: "var(--text-md)",
              lineHeight: lang === "si" || lang === "ta" ? 1.7 : "var(--leading-bubble)",
              fontFamily: "var(--font-body)",
            }}
          >
            {text}
          </p>
        ) : (
          <div
            style={{
              fontSize: "var(--text-md)",
              lineHeight: lang === "si" || lang === "ta" ? 1.7 : "var(--leading-bubble)",
              fontFamily: "var(--font-body)",
            }}
          >
            <MarkdownMessage text={text} />
          </div>
        )}
        {children}
        {timestamp && (
          <p
            className={cn("mt-1 text-[var(--text-2xs)]", isUser ? "text-white/70" : "text-muted")}
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {timestamp}
          </p>
        )}
      </div>
    </motion.div>
  );
});
