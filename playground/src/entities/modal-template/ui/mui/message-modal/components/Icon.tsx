import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import WarningIcon from '@mui/icons-material/Warning';
import { Box, type SxProps } from '@mui/material';
import { type MessageModalType } from 'umbra/react';
import { type ComponentType } from 'react';
import { mergeSx } from '@/entities/modal-template/ui/shared/sxUtils';

export type IconProps = {
  readonly type: MessageModalType;
  readonly sx?: SxProps | undefined;
  readonly slots?:
    | {
        readonly icon?: ComponentType<{ sx?: SxProps | undefined }> | undefined;
      }
    | undefined;
  readonly slotProps?:
    | {
        readonly icon?: { readonly sx?: SxProps | undefined } | undefined;
      }
    | undefined;
};

const iconMap = {
  success: CheckCircleIcon,
  error: ErrorIcon,
  warning: WarningIcon,
  info: InfoIcon,
} as const;

const colorMap = {
  success: 'success.main',
  error: 'error.main',
  warning: 'warning.main',
  info: 'info.main',
} as const;

export const Icon = ({ type, sx, slots, slotProps }: IconProps) => {
  const IconComponent = (slots?.icon ?? iconMap[type]) as ComponentType<{
    sx?: SxProps | undefined;
  }>;

  return (
    <Box sx={mergeSx({ display: 'flex', justifyContent: 'center', mb: 2 }, sx)}>
      <IconComponent sx={mergeSx({ fontSize: 48, color: colorMap[type] }, slotProps?.icon?.sx)} />
    </Box>
  );
};
