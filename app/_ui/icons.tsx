import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const Icon = {
  grid: (p: IconProps = {}) => (
    <svg viewBox="0 0 24 24" width="16" height="16" {...base} {...p}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  trend: (p: IconProps = {}) => (
    <svg viewBox="0 0 24 24" width="16" height="16" {...base} {...p}>
      <polyline points="3 17 9 11 13 15 21 7" />
      <polyline points="15 7 21 7 21 13" />
    </svg>
  ),
  clock: (p: IconProps = {}) => (
    <svg viewBox="0 0 24 24" width="16" height="16" {...base} {...p}>
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15.5 14" />
    </svg>
  ),
  shield: (p: IconProps = {}) => (
    <svg viewBox="0 0 24 24" width="16" height="16" {...base} {...p}>
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />
    </svg>
  ),
  spark: (p: IconProps = {}) => (
    <svg viewBox="0 0 24 24" width="16" height="16" {...base} {...p}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
    </svg>
  ),
  code: (p: IconProps = {}) => (
    <svg viewBox="0 0 24 24" width="16" height="16" {...base} {...p}>
      <polyline points="9 7 4 12 9 17" />
      <polyline points="15 7 20 12 15 17" />
    </svg>
  ),
  arrow: (p: IconProps = {}) => (
    <svg viewBox="0 0 24 24" width="14" height="14" {...base} strokeWidth={1.8} {...p}>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="13 6 19 12 13 18" />
    </svg>
  ),
  check: (p: IconProps = {}) => (
    <svg viewBox="0 0 24 24" width="14" height="14" {...base} strokeWidth={2} {...p}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  user: (p: IconProps = {}) => (
    <svg viewBox="0 0 24 24" width="16" height="16" {...base} {...p}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
    </svg>
  ),
  signout: (p: IconProps = {}) => (
    <svg viewBox="0 0 24 24" width="16" height="16" {...base} {...p}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  refresh: (p: IconProps = {}) => (
    <svg viewBox="0 0 24 24" width="14" height="14" {...base} strokeWidth={1.8} {...p}>
      <polyline points="21 12 21 6 15 6" />
      <path d="M21 6a9 9 0 1 0 0 12" />
    </svg>
  ),
  plus: (p: IconProps = {}) => (
    <svg viewBox="0 0 24 24" width="14" height="14" {...base} strokeWidth={2} {...p}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  chev: (p: IconProps = {}) => (
    <svg viewBox="0 0 24 24" width="14" height="14" {...base} strokeWidth={1.8} {...p}>
      <polyline points="9 6 15 12 9 18" />
    </svg>
  ),
  close: (p: IconProps = {}) => (
    <svg viewBox="0 0 24 24" width="16" height="16" {...base} strokeWidth={2} {...p}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  star: (p: IconProps = {}) => (
    <svg viewBox="0 0 24 24" width="16" height="16" {...base} {...p}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  stop: (p: IconProps = {}) => (
    <svg viewBox="0 0 24 24" width="16" height="16" {...base} {...p}>
      <rect x="6" y="6" width="12" height="12" rx="1" />
    </svg>
  ),
  terminal: (p: IconProps = {}) => (
    <svg viewBox="0 0 24 24" width="16" height="16" {...base} {...p}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <polyline points="7 9 10 12 7 15" />
      <line x1="12" y1="15" x2="17" y2="15" />
    </svg>
  ),
};

export function Brand() {
  return (
    <span className="aa-brand">
      <span className="aa-brand-mark" aria-hidden="true" />
      Algo Arena
    </span>
  );
}
