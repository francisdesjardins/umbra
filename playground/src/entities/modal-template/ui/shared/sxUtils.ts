import type { SxProps, Theme } from '@mui/material';
import type { SystemStyleObject } from '@mui/system';

// helpers are generic so callers can supply a custom theme type if they wish.
// the default is MUI's own `Theme` interface; this avoids explicit `any`
// usage and satisfies the linter while still supporting un-typed callers.

type SxObject<T extends object = Theme> = SystemStyleObject<T>;

// -- Type Guards ----------------------------------------

function isSxCallback<T extends object>(
  value: unknown
): value is (theme: T) => SystemStyleObject<T> {
  return typeof value === 'function';
}

function isSxObject<T extends object>(value: unknown): value is SxObject<T> {
  return typeof value === 'object' && value !== null;
}

// -- Helpers --------------------------------------------

/** Typed empty style object - keeps the single unavoidable cast in one place. */
const EMPTY_SX: SxObject = {};
function emptySx<T extends object>(): SxObject<T> {
  // `{}` is structurally compatible with every `SystemStyleObject<T>` because
  // all properties are optional.  This wrapper centralises the one cast that
  // cannot be expressed without `as` in a generic context.
  return EMPTY_SX as SxObject<T>;
}

/**
 * Convert an MUI `SxProps` into a plain style object suitable for spreading.
 *
 * The implementation mirrors MUI's own resolver but avoids allocating a new
 * object per array element and lets us safely merge several `sx` values.
 *
 * The optional `theme` argument is only used when callers want deterministic
 * output for callbacks; most of our code simply passes `undefined` and relies
 * on callers doing their own theming.
 */
export function sxToObject<T extends object = Theme>(
  sx?: SxProps<T> | null,
  theme?: T
): SxObject<T> {
  if (!sx) {
    return emptySx<T>();
  }

  if (Array.isArray(sx)) {
    return sx.reduce<SxObject<T>>((acc, item) => {
      if (!item || typeof item === 'boolean') {
        return acc;
      }

      if (isSxCallback<T>(item)) {
        return { ...acc, ...item(theme as T) };
      }

      if (isSxObject<T>(item)) {
        return { ...acc, ...item };
      }

      return acc;
    }, emptySx<T>());
  }

  if (isSxCallback<T>(sx)) {
    return sx(theme as T);
  }

  if (isSxObject<T>(sx)) {
    return sx;
  }

  return emptySx<T>();
}

/**
 * Combine multiple `SxProps` values into a single object.
 * The left-to-right order matches the browser cascade: later entries win.
 */
export function mergeSx<T extends object = Theme>(
  ...items: Array<SxProps<T> | null | undefined>
): SxObject<T> {
  return items.reduce<SxObject<T>>((acc, sx) => {
    if (!sx) {
      return acc;
    }
    return { ...acc, ...sxToObject(sx) };
  }, emptySx<T>());
}
