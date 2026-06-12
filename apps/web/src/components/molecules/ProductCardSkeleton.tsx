import { Skeleton } from "@/components/atoms";

export interface ProductCardSkeletonProps {
  className?: string;
}

export function ProductCardSkeleton({ className }: ProductCardSkeletonProps) {
  return (
    <div
      className={
        "relative flex flex-col rounded-[var(--radius-lg)] bg-surface border border-border overflow-hidden " +
        (className ?? "")
      }
    >
      <div style={{ aspectRatio: "4 / 3" }} className="w-full">
        <Skeleton className="w-full h-full" rounded="sm" />
      </div>
      <div className="p-4 flex flex-col gap-2">
        <Skeleton className="h-4 w-3/4" rounded="sm" />
        <div className="flex items-center justify-between gap-2 mt-1">
          <Skeleton className="h-5 w-20" rounded="sm" />
          <Skeleton className="h-9 w-9" rounded="full" />
        </div>
      </div>
    </div>
  );
}
