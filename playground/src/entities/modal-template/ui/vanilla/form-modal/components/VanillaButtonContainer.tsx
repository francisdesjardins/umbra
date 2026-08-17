import type { ReactNode } from 'react';
import { ButtonRow } from '@/entities/modal-template/ui/vanilla/shared/ButtonRow';

type VanillaButtonContainerProps = {
  readonly children: ReactNode;
};

/**
 * This template's name for the row of actions; placement belongs to `Shared.ButtonRow`, shared by
 * every vanilla template because three copies of one flex rule drift to three different gaps.
 */
export function VanillaButtonContainer({ children }: VanillaButtonContainerProps) {
  return <ButtonRow>{children}</ButtonRow>;
}
