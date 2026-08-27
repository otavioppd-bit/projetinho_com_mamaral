import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { className?: string };
const S = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const IconChip = ({ className = "w-5 h-5" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <rect x="6" y="6" width="12" height="12" rx="2" />
    <rect x="10" y="10" width="4" height="4" rx="0.5" />
    <path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" />
  </svg>
);

export const IconCrown = ({ className = "w-5 h-5" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="M4 17 3 7l5 4 4-6 4 6 5-4-1 10H4Z" />
    <path d="M4 20h16" />
  </svg>
);

export const IconSend = ({ className = "w-5 h-5" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="M21 3 10.5 13.5" />
    <path d="M21 3l-6.8 18a.5.5 0 0 1-.95.02L10.5 13.5 3.98 10.75a.5.5 0 0 1 .02-.95L21 3Z" />
  </svg>
);

export const IconCopy = ({ className = "w-5 h-5" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

export const IconCheck = ({ className = "w-5 h-5" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="M4 12.5 9.5 18 20 6.5" />
  </svg>
);

export const IconRefresh = ({ className = "w-5 h-5" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="M20 11a8 8 0 1 0-1.2 5.3" />
    <path d="M20 5v6h-6" />
  </svg>
);

export const IconTrash = ({ className = "w-5 h-5" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="M4 7h16M10 4h4M6.5 7l1 13h9l1-13M10 11v6M14 11v6" />
  </svg>
);

export const IconBolt = ({ className = "w-5 h-5" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="M13 2 4.5 13.5H11L9.5 22 19 10h-6.5L13 2Z" />
  </svg>
);

export const IconGauge = ({ className = "w-5 h-5" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="M5 19a9 9 0 1 1 14 0" />
    <path d="M12 13l3.5-3.5" />
    <circle cx="12" cy="13" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

export const IconContext = ({ className = "w-5 h-5" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="M4 6h16M4 10h16M4 14h10M4 18h7" />
  </svg>
);

export const IconCoins = ({ className = "w-5 h-5" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <circle cx="9" cy="9" r="6" />
    <path d="M15.5 5.2a6 6 0 1 1-7.3 9.6" />
    <path d="M9 6.5v5M7 9h4" />
  </svg>
);

export const IconChat = ({ className = "w-5 h-5" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="M21 12a8 8 0 0 1-8 8H4l2.2-3.3A8 8 0 1 1 21 12Z" />
    <path d="M9 11h6M9 14h4" />
  </svg>
);

export const IconOpen = ({ className = "w-5 h-5" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
    <path d="M12 12l8-4.5M12 12v9M12 12 4 7.5" />
  </svg>
);
