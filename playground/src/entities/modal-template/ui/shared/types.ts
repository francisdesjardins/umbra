import type { ReactNode } from 'react';

export type LayoutSlots = {
  readonly top?: ReactNode | undefined;
  readonly center?: ReactNode | undefined;
  readonly bottom?: ReactNode | undefined;
};

export type ButtonCommonProps = {
  readonly children: ReactNode;
  readonly onClick?: (() => void) | undefined;
  readonly disabled?: boolean | undefined;
  readonly variant?: string | undefined;
  readonly loading?: boolean | undefined;
  readonly hotkeyLabel?: string | undefined;
};
