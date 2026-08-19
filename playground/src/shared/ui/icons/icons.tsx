import type { SVGProps } from 'react';

/**
 * The shell's icon set — drawn for this app, on the mascot's engraved line rather than a
 * component library's filled silhouettes. Every glyph is a stroke on `currentColor`: colour and
 * size come from the caller, accessibility from the site of use (`aria-hidden` is the default; a
 * functional icon gets its name from the control around it).
 *
 * The rules the set is drawn to, so a twenty-seventh glyph matches the twenty-six:
 *
 * - **24×24 grid, content inside a ~3px inset.** A glyph that touches the box reads a size bigger
 *   than its neighbours on the same row.
 * - **Stroke 1.75, round caps and joins, no fill.** The weight is the thing that has to be
 *   constant — a hairline among them looks broken rather than lighter. `Palette`'s two wells are
 *   the one deliberate fill, because a stroked 2px circle at 20px is a smudge.
 * - **Open forms over closed ones.** `Menu`'s third rule is short and `Tune`'s handles sit off
 *   centre for the same reason: an asymmetry is what stops a set of straight lines reading as a
 *   texture.
 */

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  viewBox: '0 0 24 24',
  width: 24,
  height: 24,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

export function ArrowBackIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M19.5 12h-15M11 5.5 4.5 12l6.5 6.5" />
    </svg>
  );
}

export function ArrowForwardIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4.5 12h15M13 5.5l6.5 6.5-6.5 6.5" />
    </svg>
  );
}

export function AutoAwesomeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      {/* Three sparkles at three sizes — a four-point star whose arms are concave, so it reads as
          light rather than as a plus sign. */}
      <path d="M10 4.2c.7 4 1.8 5.1 5.8 5.8-4 .7-5.1 1.8-5.8 5.8-.7-4-1.8-5.1-5.8-5.8 4-.7 5.1-1.8 5.8-5.8Z" />
      <path d="M17.8 14.4c.3 1.8.8 2.3 2.6 2.6-1.8.3-2.3.8-2.6 2.6-.3-1.8-.8-2.3-2.6-2.6 1.8-.3 2.3-.8 2.6-2.6Z" />
      <path d="M18.4 3.4c.2 1.2.5 1.5 1.7 1.7-1.2.2-1.5.5-1.7 1.7-.2-1.2-.5-1.5-1.7-1.7 1.2-.2 1.5-.5 1.7-1.7Z" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m4.5 12.5 5 5 10-11" />
    </svg>
  );
}

export function CheckCircleIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.2 2.8 2.8 5.4-6" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export function CodeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9 17 4 12l5-5M15 7l5 5-5 5" />
    </svg>
  );
}

export function ContentCopyIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="8" y="8" width="12" height="12" rx="2.2" />
      <path d="M16 8V5.6A1.6 1.6 0 0 0 14.4 4H5.6A1.6 1.6 0 0 0 4 5.6v8.8A1.6 1.6 0 0 0 5.6 16H8" />
    </svg>
  );
}

export function DarkModeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M20 13.2A8.2 8.2 0 1 1 10.8 4a6.4 6.4 0 0 0 9.2 9.2Z" />
    </svg>
  );
}

export function ErrorIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.6v5.2M12 16.4h.01" />
    </svg>
  );
}

export function HubIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      {/* Spokes first, so the nodes sit on top of the line ends rather than beside them. */}
      <path d="M12 9.4V6.6M10 13.6 7.3 15.5M14 13.6l2.7 1.9" />
      <circle cx="12" cy="12" r="2.6" />
      <circle cx="12" cy="4.6" r="2" />
      <circle cx="5.6" cy="17" r="2" />
      <circle cx="18.4" cy="17" r="2" />
    </svg>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16.6v-5.2M12 7.8h.01" />
    </svg>
  );
}

export function LightModeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.8V5M12 19v2.2M2.8 12H5M19 12h2.2M5.5 5.5 7 7M17 17l1.5 1.5M18.5 5.5 17 7M7 17l-1.5 1.5" />
    </svg>
  );
}

export function LinkIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M10.4 13.6a3.9 3.9 0 0 0 5.6 0l2.6-2.6a3.9 3.9 0 0 0-5.5-5.5l-1.5 1.5" />
      <path d="M13.6 10.4a3.9 3.9 0 0 0-5.6 0l-2.6 2.6a3.9 3.9 0 0 0 5.5 5.5l1.5-1.5" />
    </svg>
  );
}

export function LocalFireDepartmentIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      {/* The mascot's flame, reduced: an outer tongue with a curled shoulder, and a small hot core
          sitting low. The core is kept well under half the height — matched to the tongue it turns
          the whole glyph to a scribble by 16px. */}
      <path d="M13 2.5c.3 2.2 1.5 3.5 2.9 5A7.3 7.3 0 0 1 18 12.8a6 6 0 0 1-12 0c0-2.1.9-3.9 2.2-5.2.1 1.4.9 2.3 1.9 2.3 1.2 0 2-1 2-2.6 0-1.6-.6-3.2-1.1-4.8Z" />
      <path d="M12 14.4c1 .9 1.6 1.7 1.6 2.5a1.6 1.6 0 1 1-3.2 0c0-.8.6-1.6 1.6-2.5Z" />
    </svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 7h16M4 12h16M4 17h10" />
    </svg>
  );
}

export function MenuBookIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 6.6v13" />
      <path d="M12 6.6C10.4 5.2 8.3 4.5 5.9 4.5c-1 0-1.9.1-2.9.4v13c1-.3 1.9-.4 2.9-.4 2.4 0 4.5.7 6.1 2" />
      <path d="M12 6.6c1.6-1.4 3.7-2.1 6.1-2.1 1 0 1.9.1 2.9.4v13c-1-.3-1.9-.4-2.9-.4-2.4 0-4.5.7-6.1 2" />
    </svg>
  );
}

export function PaletteIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.4c-4.9 0-8.9 3.9-8.9 8.6s4 8.6 8.9 8.6c1.2 0 2.1-.9 2.1-2.1 0-.6-.2-1.1-.6-1.5a1.85 1.85 0 0 1 1.4-3.1h1.8c2.4 0 4.3-1.9 4.3-4.3 0-3.4-3.6-6.2-9-6.2Z" />
      {/* The wells are filled: a stroked 2px ring turns to a smudge at 20px. */}
      <circle cx="7.4" cy="12.4" r="1.05" fill="currentColor" stroke="none" />
      <circle cx="9.5" cy="8.4" r="1.05" fill="currentColor" stroke="none" />
      <circle cx="14.4" cy="8.2" r="1.05" fill="currentColor" stroke="none" />
      <circle cx="17.2" cy="11.4" r="1.05" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function PlayArrowIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M7.5 5.4v13.2L18.8 12Z" />
    </svg>
  );
}

export function ScienceIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9.8 3.4h4.4" />
      <path d="M10.6 3.4v6.3l-5.3 8.1a1.7 1.7 0 0 0 1.4 2.6h10.6a1.7 1.7 0 0 0 1.4-2.6l-5.3-8.1V3.4" />
      {/* The fill line: what makes a flask a flask rather than a funnel. Held 1px inside each wall
          (which is at x=7.34 / 16.66 at this height) so the round cap does not poke through. */}
      <path d="M8.3 14.8h7.4" />
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 4.6 4.6" />
    </svg>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      {/* A real cog outline — eight square teeth between a 5.6 root and an 8.15 tip, faceted rather
          than filleted so the corners survive 16px. Drawn as an outline and not as a hub with
          radiating spokes: that construction is `LightModeIcon`, and at a glance the two were the
          same glyph. */}
      <path d="M9.99 6.77 10.44 4h3.12l.45 2.77.27.11 2.28-1.64 2.2 2.2-1.64 2.28.11.27L20 10.44v3.12l-2.77.45-.11.27 1.64 2.28-2.2 2.2-2.28-1.64-.27.11L13.56 20h-3.12l-.45-2.77-.27-.11-2.28 1.64-2.2-2.2 1.64-2.28-.11-.27L4 13.56v-3.12l2.77-.45.11-.27L5.24 7.44l2.2-2.2 2.28 1.64Z" />
      <circle cx="12" cy="12" r="2.9" />
    </svg>
  );
}

export function TuneIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 7h9.3M17.7 7H20M4 17h2.3M10.7 17H20" />
      <circle cx="15.5" cy="7" r="2.2" />
      <circle cx="8.5" cy="17" r="2.2" />
    </svg>
  );
}

export function ViewSidebarIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3.2" y="4.5" width="17.6" height="15" rx="2.2" />
      <path d="M14.8 4.5v15" />
    </svg>
  );
}

export function WarningIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 4.2 2.9 19.8h18.2Z" />
      <path d="M12 10v4.2M12 17.2h.01" />
    </svg>
  );
}

export function WidgetsIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      {/* Three squares and a diamond: the rotated one is what keeps this from reading as a
          four-up grid, which is a different idea. */}
      <rect x="3.4" y="3.4" width="7.2" height="7.2" rx="1.4" />
      <rect x="3.4" y="13.4" width="7.2" height="7.2" rx="1.4" />
      <rect x="13.4" y="13.4" width="7.2" height="7.2" rx="1.4" />
      <path d="M17 2.6 21.4 7 17 11.4 12.6 7Z" />
    </svg>
  );
}
