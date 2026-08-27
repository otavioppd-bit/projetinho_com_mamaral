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

/* ---- áreas do sistema ---- */

export const IconTable = ({ className = "w-5 h-5" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 9.5h18M9.5 9.5V20M3 14.5h18" />
  </svg>
);

export const IconCap = ({ className = "w-5 h-5" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="m12 4 10 5-10 5L2 9l10-5Z" />
    <path d="M6.5 11.5v5c0 1.2 2.5 2.5 5.5 2.5s5.5-1.3 5.5-2.5v-5" />
    <path d="M22 9v5" />
  </svg>
);

export const IconLayers = ({ className = "w-5 h-5" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="m12 3 9 5-9 5-9-5 9-5Z" />
    <path d="m4.5 12.5 7.5 4.2 7.5-4.2" />
    <path d="m4.5 16.5 7.5 4.2 7.5-4.2" />
  </svg>
);

export const IconArrowLeft = ({ className = "w-5 h-5" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </svg>
);

export const IconChevronRight = ({ className = "w-5 h-5" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="m9 5 7 7-7 7" />
  </svg>
);

export const IconAlert = ({ className = "w-5 h-5" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="M12 3 2.5 20h19L12 3Z" />
    <path d="M12 9.5V14" />
    <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
  </svg>
);

export const IconX = ({ className = "w-5 h-5" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const IconUpload = ({ className = "w-5 h-5" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="M12 16V4M6.5 9.5 12 4l5.5 5.5" />
    <path d="M4 16v3a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19v-3" />
  </svg>
);

export const IconDownload = ({ className = "w-5 h-5" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="M12 4v12M6.5 10.5 12 16l5.5-5.5" />
    <path d="M4 16v3a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19v-3" />
  </svg>
);

export const IconSpark = ({ className = "w-5 h-5" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
  </svg>
);

export const IconWave = ({ className = "w-5 h-5" }: P) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="M2 12c2.5 0 2.5-5 5-5s2.5 10 5 10 2.5-10 5-10 2.5 5 5 5" />
  </svg>
);

/* ---- marca ---- */

export const LogoMark = ({ className = "w-7 h-7" }: P) => (
  <svg viewBox="0 0 32 32" className={className} fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 5 28 27H4L16 5Z" stroke="var(--color-cyan)" strokeWidth="2" />
    <path d="M10.4 20h11.2" stroke="var(--color-cyan)" strokeWidth="1.6" opacity="0.85" />
    <circle cx="16" cy="5" r="2" fill="var(--color-amber)" stroke="none" />
    <path d="M4.5 16h4.5" stroke="var(--color-sky)" strokeWidth="1.6" />
    <path d="M21 21.5l6.5-3.8" stroke="var(--color-sky)" strokeWidth="1.6" />
    <path d="M21.5 24.5l7 1.2" stroke="var(--color-coral)" strokeWidth="1.6" />
  </svg>
);
