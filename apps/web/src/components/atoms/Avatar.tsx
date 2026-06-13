import { cn } from "@/lib/cn";

export interface AvatarProps {
  /** Display label, used to derive initials when no image is given. */
  name: string;
  /** Optional image url. If absent, renders the initials on a tinted background. */
  image?: string;
  size?: number;
  className?: string;
  /** Visible accent ring. Defaults to false. */
  ring?: boolean;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

export function Avatar({ name, image, size = 32, className, ring }: AvatarProps) {
  const dim = { width: size, height: size, minWidth: size, minHeight: size };
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full overflow-hidden",
        "bg-[var(--color-surface-warm)] text-[var(--color-text)]",
        "border border-[var(--color-border)]",
        ring &&
          "ring-2 ring-[color:var(--color-cta)] ring-offset-2 ring-offset-[var(--color-background)]",
        className,
      )}
      style={dim}
      aria-label={name}
    >
      {image ? (
        <img
          src={image}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          className="block w-full h-full object-cover"
        />
      ) : (
        <span className="font-semibold" style={{ fontSize: Math.round(size * 0.4) }}>
          {initials(name)}
        </span>
      )}
    </span>
  );
}
