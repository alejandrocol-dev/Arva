import Image from "next/image";
import { cx } from "@/components/ui";

/** ARVA hexagon mark (brand kit in public/brand). `white` = for dark backgrounds. */
export function ZafraMark({ className, white = false }: { className?: string; white?: boolean }) {
  return (
    <Image
      src={white ? "/brand/arva-mark-white.png" : "/brand/arva-mark.png"}
      alt=""
      aria-hidden
      width={333}
      height={389}
      priority
      className={cx("select-none object-contain", className)}
    />
  );
}

/** Horizontal lockup: mark + ARVA wordmark. */
export function ZafraLockup({ white = false, className }: { white?: boolean; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-2.5", className)}>
      <ZafraMark white={white} className="h-8 w-auto" />
      <span
        className={cx(
          "font-display text-[19px] font-bold tracking-[0.04em] select-none",
          white ? "text-white" : "text-ink",
        )}
      >
        ARVA
      </span>
    </span>
  );
}
