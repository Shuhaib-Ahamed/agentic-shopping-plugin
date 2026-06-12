import { cn } from "@/lib/cn";

export interface KaprukaLogoProps {
  /** Pixel height of the logo. Width auto-scales (intrinsic aspect 625:110). */
  height?: number;
  className?: string;
}

// Official Kapruka brand wordmark — PNG asset at /public/kapruka-logo.png.
export function KaprukaLogo({ height = 26, className }: KaprukaLogoProps) {
  return (
    <img
      src="/kapruka-logo.png"
      alt="Kapruka"
      width={Math.round(height * (625 / 110))}
      height={height}
      className={cn("block shrink-0 select-none", className)}
      style={{ height, width: "auto" }}
      draggable={false}
    />
  );
}
