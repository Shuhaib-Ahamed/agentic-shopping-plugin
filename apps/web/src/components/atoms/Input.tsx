import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Input as ShadcnInput } from "@/components/ui/input";
import { Textarea as ShadcnTextarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

// Wraps the shadcn Input primitive with our theme tokens and an explicit invalid state.
// Padding is generous (px-4 h-11) so the input never reads as cramped.
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, type = "text", ...rest },
  ref,
) {
  return (
    <ShadcnInput
      ref={ref}
      type={type}
      aria-invalid={invalid || undefined}
      className={cn(
        // Override shadcn defaults to match our token system.
        "h-11 px-4 py-2.5 rounded-[10px]",
        "bg-white text-primary",
        "border border-border",
        "placeholder:text-muted placeholder:font-medium",
        "transition-colors duration-150 ease-out",
        "focus-visible:ring-2 focus-visible:ring-[color:var(--color-cta)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)] focus-visible:border-[color:var(--color-cta)]",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        invalid && [
          "border-[color:var(--color-error)]",
          "focus-visible:border-[color:var(--color-error)]",
          "focus-visible:ring-[color:var(--color-error)]",
        ],
        className,
      )}
      style={{ fontSize: "var(--text-base)" }}
      {...rest}
    />
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, ...rest },
  ref,
) {
  return (
    <ShadcnTextarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "min-h-[88px] px-4 py-3 rounded-[10px]",
        "bg-white text-primary",
        "border border-border",
        "placeholder:text-muted placeholder:font-medium",
        "transition-colors duration-150 ease-out",
        "focus-visible:ring-2 focus-visible:ring-[color:var(--color-cta)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)] focus-visible:border-[color:var(--color-cta)]",
        "disabled:opacity-50",
        "resize-none",
        invalid && [
          "border-[color:var(--color-error)]",
          "focus-visible:border-[color:var(--color-error)]",
          "focus-visible:ring-[color:var(--color-error)]",
        ],
        className,
      )}
      style={{ fontSize: "var(--text-base)", lineHeight: "var(--leading-body)" }}
      {...rest}
    />
  );
});
