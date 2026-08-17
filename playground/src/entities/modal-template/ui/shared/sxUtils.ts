import type { SxProps, Theme } from '@mui/material';
import type { SystemStyleObject } from '@mui/system';

// Generic over the theme, defaulting to MUI's `Theme`, so un-typed callers work without `any`.

type SxObject<T extends object = Theme> = SystemStyleObject<T>;

function isSxCallback<T extends object>(
  value: unknown
): value is (theme: T) => SystemStyleObject<T> {
  return typeof value === 'function';
}

function isSxObject<T extends object>(value: unknown): value is SxObject<T> {
  return typeof value === 'object' && value !== null;
}

const EMPTY_SX: SxObject = {};
function emptySx<T extends object>(): SxObject<T> {
  // `{}` fits every `SystemStyleObject<T>` (all properties optional); centralises the one `as`.
  return EMPTY_SX as SxObject<T>;
}

/**
 * Convert an MUI `SxProps` into a plain spreadable object — MUI's own resolver without the
 * per-array-element allocation. `theme` only matters for deterministic callback output.
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

/** Combine `SxProps` values into one object, left to right — later entries win, as in the cascade. */
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
