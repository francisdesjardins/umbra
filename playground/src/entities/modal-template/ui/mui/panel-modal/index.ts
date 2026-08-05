// Named exports for direct import
export { HeaderActionLayout } from '@/entities/modal-template/ui/mui/panel-modal/components/HeaderActionLayout';
export { PanelContainer } from '@/entities/modal-template/ui/mui/panel-modal/components/PanelContainer';
export { PanelContent } from '@/entities/modal-template/ui/mui/panel-modal/components/PanelContent';
export { PanelFooter } from '@/entities/modal-template/ui/mui/panel-modal/components/PanelFooter';
export { PanelHeader } from '@/entities/modal-template/ui/mui/panel-modal/components/PanelHeader';

// Type exports
export type { HeaderActionLayoutProps } from '@/entities/modal-template/ui/mui/panel-modal/components/HeaderActionLayout';
export type { PanelContainerProps } from '@/entities/modal-template/ui/mui/panel-modal/components/PanelContainer';
export type { PanelContentProps } from '@/entities/modal-template/ui/mui/panel-modal/components/PanelContent';
export type { PanelFooterProps } from '@/entities/modal-template/ui/mui/panel-modal/components/PanelFooter';
export type {
  PanelHeaderProps,
  PanelHeaderSlotProps,
} from '@/entities/modal-template/ui/mui/panel-modal/components/PanelHeader';

// Namespace object for convenient access: PanelModal.PanelContainer, etc.
import { HeaderActionLayout } from '@/entities/modal-template/ui/mui/panel-modal/components/HeaderActionLayout';
import { PanelContainer } from '@/entities/modal-template/ui/mui/panel-modal/components/PanelContainer';
import { PanelContent } from '@/entities/modal-template/ui/mui/panel-modal/components/PanelContent';
import { PanelFooter } from '@/entities/modal-template/ui/mui/panel-modal/components/PanelFooter';
import { PanelHeader } from '@/entities/modal-template/ui/mui/panel-modal/components/PanelHeader';

export const PanelModal = {
  PanelContainer,
  PanelHeader,
  HeaderActionLayout,
  PanelContent,
  PanelFooter,
} as const;
