import { Box, useTheme } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { UmbraMoon } from './UmbraMoon';

/**
 * The playground's easter egg: Umbra's moon slides in from an edge, peeks for a couple of
 * minutes with the occasional giggle, waves, and slides back out — returning every few minutes
 * from the other edge.
 *
 * It is **shy**: bring the pointer near and it ducks back out of sight, then comes back later.
 * That is the joke, and it is also why the mascot can never be in your way — reaching for
 * anything underneath it makes it leave.
 *
 * Catch it anyway — click it, or press Enter while it has focus — and it goes out the way its
 * name says: a flare, then total shadow, and it does not come back. Keyboard dismissal is not
 * decoration here; something that flees the pointer must still be dismissible without one.
 *
 * A sibling of stardust's `PeekingStar`, sharing its timing model so the two playgrounds feel
 * like one family.
 */

type Side = 'right' | 'left';
type Phase = 'peek' | 'shy' | 'eclipse';

type Config = {
  readonly side: Side;
  readonly offset: number;
  readonly key: number;
};

// Timing, all in ms:
//   slide in + settle   0 →   2 000
//   peeking + giggles   2 000 → 122 000  (~2 min)
//   wave + slide out  122 000 → 125 000
const ANIM_MS = 125_000;
const SHY_MS = 420;
const ECLIPSE_MS = 950;

/**
 * How close the pointer may get, in px, before the moon ducks out.
 *
 * Small on purpose: it should flee when you reach *for it*, not when you pass nearby. A wide
 * radius makes it look like it is running from the whole corner of the page, and you never get
 * to see it — the joke only lands if you almost had it.
 */
const SHY_RADIUS = 45;

/** Grace period after arriving, so it never flees before it has finished appearing. */
const SETTLE_MS = 2200;

/** How much of the moon clears the edge it leans against. */
const VISIBILITY_RATIO: Readonly<Record<Side, number>> = { right: 0.7, left: 0.7 };

/** When each giggle beat fires. Generated into keyframes below rather than written ten times. */
const GIGGLE_AT = [10_000, 21_000, 33_000, 45_000, 57_000, 69_000, 81_000, 93_000, 107_000];

const pct = (ms: number) => {
  return `${((ms / ANIM_MS) * 100).toFixed(3)}%`;
};

const responsiveSize = (viewportWidth: number) => {
  if (viewportWidth < 480) {
    return 120;
  }
  if (viewportWidth < 640) {
    return 140;
  }
  if (viewportWidth < 960) {
    return 160;
  }
  return 180;
};

// Both edges are vertical, so the resting position is the same formula either side of the page.
const computeOffset = (size: number) => {
  return Math.max(20, size * 0.15 + Math.random() * Math.max(1, window.innerHeight - size * 1.3));
};

const makeConfig = (prev: Config | undefined, size: number): Config => {
  const sides: readonly Side[] = ['right', 'left'];
  // Never the same edge twice running — the reappearance should feel like a new visit.
  const pool = prev
    ? sides.filter((s) => {
        return s !== prev.side;
      })
    : sides;
  const side = pool[Math.floor(Math.random() * pool.length)] ?? 'right';
  return { side, offset: computeOffset(size), key: (prev?.key ?? 0) + 1 };
};

/** Shortest distance from a point to a rectangle; 0 when the point is inside it. */
const distanceToRect = (rect: DOMRect, x: number, y: number) => {
  const dx = Math.max(rect.left - x, 0, x - rect.right);
  const dy = Math.max(rect.top - y, 0, y - rect.bottom);
  return Math.hypot(dx, dy);
};

export const PeekingMoon = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [size, setSize] = useState(() => {
    return typeof window === 'undefined' ? 180 : responsiveSize(window.innerWidth);
  });
  const [config, setConfig] = useState<Config | null>(null);
  const [phase, setPhase] = useState<Phase>('peek');
  const [gone, setGone] = useState(false);

  const boxRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sizeRef = useRef(size);
  const isFirstRef = useRef(true);
  const dismissedRef = useRef(false);
  const arrivedAtRef = useRef(0);
  const phaseRef = useRef<Phase>('peek');
  const prevWidthRef = useRef(window.innerWidth);

  useEffect(() => {
    sizeRef.current = size;
  }, [size]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  /**
   * @param soon - after a startled exit, not a natural one. Being scared off and then staying
   *   away for four minutes reads as broken rather than shy; it should peek back from the other
   *   edge while you still remember chasing it.
   */
  const scheduleNext = (prev?: Config, soon = false) => {
    if (dismissedRef.current) {
      return;
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    const delay = isFirstRef.current
      ? 1500 + Math.random() * 1500
      : soon
        ? 6_000 + Math.random() * 9_000
        : 180_000 + Math.random() * 60_000;
    isFirstRef.current = false;
    timerRef.current = setTimeout(() => {
      arrivedAtRef.current = Date.now();
      setConfig(makeConfig(prev, sizeRef.current));
      setPhase('peek');
      setGone(false);
    }, delay);
  };

  useEffect(() => {
    const handleResize = () => {
      // Mobile browsers fire `resize` on scroll as the URL bar hides/shows, changing only
      // `innerHeight` — recomputing on that would reshuffle the moon mid-scroll for no reason.
      const width = window.innerWidth;
      if (width === prevWidthRef.current) {
        return;
      }
      prevWidthRef.current = width;
      const next = responsiveSize(width);
      sizeRef.current = next;
      setSize(next);
      setConfig((prev) => {
        return prev ? { ...prev, offset: computeOffset(next) } : prev;
      });
    };

    // Shyness. Reading the live rect rather than recomputing the layout keeps this honest
    // while the peek animation is mid-flight.
    const handlePointer = (event: MouseEvent) => {
      if (phaseRef.current !== 'peek' || dismissedRef.current) {
        return;
      }
      if (Date.now() - arrivedAtRef.current < SETTLE_MS) {
        return;
      }
      const node = boxRef.current;
      if (!node) {
        return;
      }
      if (
        distanceToRect(node.getBoundingClientRect(), event.clientX, event.clientY) <= SHY_RADIUS
      ) {
        setPhase('shy');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handlePointer, { passive: true });
    scheduleNext();

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handlePointer);
      // Reset so StrictMode's second mount still uses the short first-appearance delay.
      isFirstRef.current = true;
    };
    // Mount-only: everything above reads refs, not render values.
  }, []);

  if (!config || gone) {
    return null;
  }

  const { side, offset, key } = config;
  const visible = Math.round(size * VISIBILITY_RATIO[side]);
  const hidden = size - visible;

  const animName = `um-${phase}-${key.toString()}`;

  // Mirrored lean per edge, so the moon always tilts away from the side it emerged from.
  const tilt = side === 'right' ? ' rotate(-18deg)' : ' rotate(18deg)';

  const off = (px: number) => {
    return `translateX(${(side === 'right' ? px : -px).toString()}px)${tilt}`;
  };

  // Generous on purpose. The artwork is painted well past its own box — the glow is a circle of
  // r=112 in a 200 viewBox, breathing to 1.035 — and the exit rotates, which widens the swept
  // area again. Translating by exactly `size` hides the disc and leaves its halo glowing over
  // the edge, which reads worse than not hiding at all.
  const tHide = off(size * 1.6);
  const tPeek = off(hidden);

  // Anchored flush to its edge either side — on desktop the left one briefly overlaps the
  // persistent sidebar, which is fine: it's shy and ducks away the moment the pointer nears.
  const position = side === 'right' ? { right: 0, top: offset } : { left: 0, top: offset };

  // Alternate the giggle direction per visit so it never looks looped.
  const sway = key % 2 === 0 ? 1 : -1;

  const peekKeyframes: Record<string, { transform: string }> = {
    // Slide in, overshoot, settle — a spring without a spring library.
    [pct(0)]: { transform: tHide },
    [pct(420)]: { transform: `${tPeek} rotate(-14deg) scale(1.1)` },
    [pct(820)]: { transform: `${tPeek} rotate(8deg) scale(0.95)` },
    [pct(1150)]: { transform: `${tPeek} rotate(-4deg) scale(1.02)` },
    [pct(2000)]: { transform: `${tPeek} rotate(0deg) scale(1)` },
    // Wave, then withdraw.
    [pct(122_000)]: { transform: `${tPeek} rotate(0deg) scale(1)` },
    [pct(123_000)]: { transform: `${tPeek} rotate(7deg) scale(0.97)` },
    [pct(123_800)]: { transform: `${tPeek} rotate(-4deg)` },
    [pct(ANIM_MS)]: { transform: tHide },
  };

  // Three beats per giggle, alternating lean, so the loop stays legible at a glance.
  for (const [i, at] of GIGGLE_AT.entries()) {
    const dir = i % 2 === 0 ? sway : -sway;
    peekKeyframes[pct(at)] = {
      transform: `${tPeek} rotate(${(dir * 3).toString()}deg) scale(1.04)`,
    };
    peekKeyframes[pct(at + 300)] = {
      transform: `${tPeek} rotate(${(dir * -2).toString()}deg) scale(0.98)`,
    };
    peekKeyframes[pct(at + 600)] = { transform: `${tPeek} rotate(0deg) scale(1)` };
  }

  // Startled: a small flinch away from the pointer, then straight out of sight.
  const shyKeyframes = {
    '0%': { transform: `${tPeek} scale(1)` },
    '22%': { transform: `${tPeek} rotate(6deg) scale(0.94)` },
    '100%': { transform: `${tHide} rotate(-6deg)` },
  };

  // It leaves the way it is named. The corona flares — the diamond-ring instant just before
  // totality — and then the disc contracts into its own shadow and is gone. No spin: a moon
  // does not cartwheel out of an eclipse.
  const eclipseKeyframes = {
    '0%': { transform: `${tPeek} scale(1)`, filter: 'brightness(1)', opacity: 1 },
    '18%': { transform: `${tPeek} scale(1.14)`, filter: 'brightness(2.1)', opacity: 1 },
    '38%': { transform: `${tPeek} scale(1.04)`, filter: 'brightness(1.2)', opacity: 1 },
    '72%': { transform: `${tPeek} scale(0.55)`, filter: 'brightness(0.35)', opacity: 0.9 },
    '100%': { transform: `${tPeek} scale(0)`, filter: 'brightness(0)', opacity: 0 },
  };

  const keyframes =
    phase === 'eclipse' ? eclipseKeyframes : phase === 'shy' ? shyKeyframes : peekKeyframes;

  const duration = phase === 'eclipse' ? ECLIPSE_MS : phase === 'shy' ? SHY_MS : ANIM_MS;

  const easing =
    phase === 'eclipse'
      ? 'cubic-bezier(0.4, 0, 0.2, 1)'
      : phase === 'shy'
        ? 'cubic-bezier(0.36, 0, 0.66, -0.24)'
        : 'linear';

  const dismiss = () => {
    if (dismissedRef.current) {
      return;
    }
    dismissedRef.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setPhase('eclipse');
  };

  return (
    <Box
      ref={boxRef}
      key={`${phase}-${key.toString()}`}
      role="button"
      tabIndex={0}
      aria-label="Dismiss the mascot"
      onClick={dismiss}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          dismiss();
        }
      }}
      onAnimationEnd={(event) => {
        // The artwork animates too (corona, blink), and those events bubble.
        if (event.animationName !== animName) {
          return;
        }
        if (phase === 'eclipse') {
          setGone(true);
        } else {
          // Either way it comes back, and `makeConfig` drops the edge it just used — so a
          // startled moon always reappears on the opposite side.
          scheduleNext(config, phase === 'shy');
        }
      }}
      sx={{
        position: 'fixed',
        zIndex: 1200,
        cursor: 'pointer',
        width: size,
        height: size,
        ...position,
        animation: `${animName} ${duration.toString()}ms ${easing} forwards`,
        [`@keyframes ${animName}`]: keyframes,
        '@media (prefers-reduced-motion: reduce)': { animationDuration: '1ms' },
      }}
    >
      <UmbraMoon isDark={isDark} />
    </Box>
  );
};
