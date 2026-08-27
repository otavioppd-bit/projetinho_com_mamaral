import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { className?: string };
const S = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

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

/* ---- marca ---- */

export const LogoMark = ({ className = "w-7 h-7" }: P) => (
  <svg viewBox="0 0 32 32" className={className} fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 5 28 27H4L16 5Z" stroke="var(--color-teal)" strokeWidth="2" />
    <path d="M10.4 20h11.2" stroke="var(--color-teal)" strokeWidth="1.6" opacity="0.85" />
    <circle cx="16" cy="5" r="2" fill="var(--color-amber)" stroke="none" />
    <path d="M4.5 16h4.5" stroke="var(--color-sky)" strokeWidth="1.6" />
    <path d="M21 21.5l6.5-3.8" stroke="var(--color-sky)" strokeWidth="1.6" />
    <path d="M21.5 24.5l7 1.2" stroke="var(--color-coral)" strokeWidth="1.6" />
  </svg>
);
