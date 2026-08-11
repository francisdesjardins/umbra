import type { ReactNode } from 'react';
import { ButtonRow } from '@/entities/modal-template/ui/vanilla/shared/ButtonRow';

type VanillaButtonContainerProps = {
  readonly children: ReactNode;
};

/**
 * Kept as this template's name for the row of actions, but it no longer owns how they are placed —
 * `Shared.ButtonRow` does, for every vanilla template at once. Three copies of one flex rule had
 * already drifted to three different gaps.
 */
export function VanillaButtonContainer({ children }: VanillaButtonContainerProps) {
  return <ButtonRow>{children}</ButtonRow>;
}
