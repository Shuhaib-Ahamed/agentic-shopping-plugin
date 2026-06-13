import { type ReactNode } from "react";
import { Calendar, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/cn";

export interface FilterBarProps {
  range: string;
  onRangeChange?: () => void;
  children?: ReactNode;
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  className?: string;
}

// Sticky, framework-agnostic filter row. Buttons are presentational stubs in
// this build; live menus arrive once each page wires its own state.
export function FilterBar({
  range,
  onRangeChange,
  children,
  search,
  onSearchChange,
  searchPlaceholder = "Search",
  className,
}: FilterBarProps) {
  return (
    <div
      className={cn(
        "sticky top-0 z-[var(--z-sticky)] flex flex-wrap items-center gap-2 py-3 px-1",
        "bg-[color:var(--color-console-canvas)]/85 backdrop-blur supports-[backdrop-filter]:bg-[color:var(--color-console-canvas)]/75",
        className,
      )}
    >
      <FilterButton onClick={onRangeChange} icon={<Calendar size={14} />}>
        {range}
      </FilterButton>
      {children}
      {onSearchChange ? (
        <label className="ml-auto flex items-center gap-2 h-9 px-3 rounded-full bg-[color:var(--color-console-card)] border border-[color:var(--color-border)] focus-within:border-[color:var(--color-cta)] transition-colors">
          <Search size={14} className="text-muted" aria-hidden />
          <input
            type="text"
            value={search ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="bg-transparent outline-none w-[240px] text-[13px] placeholder:text-muted"
          />
        </label>
      ) : null}
    </div>
  );
}

export function FilterButton({
  children,
  icon,
  onClick,
  active = false,
}: {
  children: ReactNode;
  icon?: ReactNode;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 h-9 px-3 rounded-full",
        "text-[13px] font-medium transition-colors duration-150 cursor-pointer",
        active
          ? "bg-[color:var(--color-cta-soft)] text-[color:var(--color-cta-deep)] border border-[color:var(--color-cta)]"
          : "bg-[color:var(--color-console-card)] text-text border border-[color:var(--color-border)] hover:border-[color:var(--color-border-strong)]",
      )}
    >
      {icon}
      {children}
      <ChevronDown size={12} className="text-muted" aria-hidden />
    </button>
  );
}
