import { Tooltip, Typography, type TooltipProps, type TypographyProps } from '@mui/material';
import { useEffect, useRef, useState } from 'react';

export type OverflownTypographySlotProps = {
  /**
   * Props forwarded to the underlying `Tooltip`. `title` and `children` are
   * controlled internally and cannot be overridden here.
   *
   * `slotProps.tooltip.slotProps.popper.disablePortal` defaults to `true` so
   * the tooltip renders inside the dialog (not escaped to `<body>`). Override
   * via `slotProps.tooltip.slotProps.popper` if you need portal behaviour.
   */
  tooltip?: Omit<TooltipProps, 'title' | 'children'>;
};

export type OverflownTypographyProps = Omit<TypographyProps, 'noWrap'> & {
  slotProps?: OverflownTypographySlotProps | undefined;
};

/**
 * Typography that truncates with an ellipsis when the container runs out of
 * horizontal space. A tooltip with the full text is shown **only** when the
 * content is actually truncated. Requires a width-constrained parent — the
 * `content` slot of `PanelModal.HeaderActionLayout` (which sets
 * `flex: 1, minWidth: 0`) satisfies this automatically.
 *
 * ```tsx
 * <PanelModal.HeaderActionLayout
 *   content={
 *     <Shared.OverflownTypography
 *       variant="h6"
 *       slotProps={{ tooltip: { placement: 'bottom', enterDelay: 500, fontWeight: 600 } }}
 *     >
 *       {title}
 *     </Shared.OverflownTypography>
 *   }
 *   actions={headerActions}
 * />
 * ```
 */
export const OverflownTypography = ({
  children,
  slotProps,
  ...props
}: OverflownTypographyProps) => {
  const ref = useRef<HTMLElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const observer = new ResizeObserver(() => {
      setIsOverflowing(el.scrollWidth > el.clientWidth);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);

  const { slotProps: tooltipSlotProps, ...restTooltipProps } = slotProps?.tooltip ?? {};

  return (
    <Tooltip
      arrow
      {...restTooltipProps}
      title={isOverflowing ? children : ''}
      slotProps={{ popper: { disablePortal: true }, ...tooltipSlotProps }}
    >
      <Typography ref={ref} sx={{ textOverflow: 'ellipsis' }} noWrap {...props}>
        {children}
      </Typography>
    </Tooltip>
  );
};
