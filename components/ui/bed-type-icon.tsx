import { BedDouble } from "lucide-react";
import type { BedType } from "@/lib/types";

interface BedTypeIconProps {
  type: BedType | string;
  className?: string;
}

export default function BedTypeIcon({ type, className = "h-4 w-4" }: BedTypeIconProps) {
  const bed = typeof type === "string" ? type.toLowerCase() : type;

  switch (bed) {
    case "bunk":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden
        >
          <rect x="3" y="4" width="18" height="8" rx="1" />
          <line x1="3" y1="8" x2="21" y2="8" />
          <rect x="3" y="12" width="18" height="8" rx="1" />
          <line x1="3" y1="16" x2="21" y2="16" />
        </svg>
      );
    case "single":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden
        >
          <rect x="5" y="10" width="14" height="10" rx="1" />
          <path d="M7 10V8a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v2" />
          <line x1="5" y1="15" x2="19" y2="15" />
        </svg>
      );
    case "double":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden
        >
          <rect x="3" y="10" width="18" height="10" rx="1" />
          <path d="M5 10V8a1 1 0 0 1 1-1h5v3" />
          <path d="M19 10V8a1 1 0 0 0-1-1h-5v3" />
          <line x1="3" y1="15" x2="21" y2="15" />
        </svg>
      );
    case "queen":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden
        >
          <rect x="2" y="10" width="20" height="10" rx="1" />
          <path d="M4 10V8a1 1 0 0 1 1-1h6v3" />
          <path d="M20 10V8a1 1 0 0 0-1-1h-6v3" />
          <line x1="2" y1="15" x2="22" y2="15" />
          <circle cx="12" cy="5" r="1.5" />
        </svg>
      );
    case "king":
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={className}
          aria-hidden
        >
          <rect x="1" y="10" width="22" height="10" rx="1" />
          <path d="M3 10V8a1 1 0 0 1 1-1h7v3" />
          <path d="M21 10V8a1 1 0 0 0-1-1h-7v3" />
          <line x1="1" y1="15" x2="23" y2="15" />
          <path d="M12 3l-2 4h4l-2-4z" />
        </svg>
      );
    default:
      return <BedDouble className={className} aria-hidden />;
  }
}
