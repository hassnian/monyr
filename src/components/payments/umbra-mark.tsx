import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Monochrome silhouette of the Umbra logomark — the cloud-like outer shape
 * with the two pill cutouts. Strips Umbra's brand-blue gradient so the mark
 * inherits Hush's `currentColor` tone. Size via `className`.
 */
export function UmbraMark({ className }: { className?: string }) {
  const maskId = useId();
  return (
    <svg
      viewBox="0 0 210 210"
      fill="currentColor"
      aria-hidden
      className={cn("inline-block", className)}
    >
      <mask id={maskId}>
        <rect width="210" height="210" fill="white" />
        <rect x="81.416" y="87.3633" width="18.0469" height="35.2734" rx="9.02344" fill="black" />
        <rect x="111.768" y="87.3633" width="18.0469" height="35.2734" rx="9.02344" fill="black" />
      </mask>
      <path
        d="M99.5068 33.6328C118.136 33.633 134.042 45.2795 140.348 61.6875C152.228 56.7389 166.411 58.6881 176.615 67.8682C190.742 80.5777 191.891 102.333 179.182 116.46C176.403 119.549 173.191 122.017 169.721 123.855C171.451 127.969 172.408 132.488 172.408 137.23C172.408 156.302 156.948 171.763 137.876 171.763C129.374 171.763 121.592 168.689 115.575 163.594C109.244 171.386 99.5857 176.367 88.7627 176.367C71.952 176.367 57.9487 164.355 54.8643 148.445C36.3338 146.116 22 130.301 22 111.139C22.0002 91.6149 36.8802 75.5681 55.918 73.7168C57.7761 51.2705 76.5809 33.6328 99.5068 33.6328Z"
        mask={`url(#${maskId})`}
      />
    </svg>
  );
}
