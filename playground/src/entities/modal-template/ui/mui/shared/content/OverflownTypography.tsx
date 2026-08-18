import Tooltip, { type TooltipProps } from '@mui/material/Tooltip';
import Typography, { type TypographyProps } from '@mui/material/Typography';
import { useEffect, useRef, useState } from 'react';

export type OverflownTypographySlotProps = {
  /**
   * Forwarded to the `Tooltip` (`title`/`children` are internal). Its popper's `disablePortal`
   * defaults to `true`, keeping the tooltip inside the dialog instead of `<body>`.
   */
  tooltip?: Omit<TooltipProps, 'title' | 'children'>;
};

export type OverflownTypographyProps = Omit<TypographyProps, 'noWrap'> & {
  slotProps?: OverflownTypographySlotProps | undefined;
};

/**
 * Typography that ellipsis-truncates when horizontal space runs out, showing a tooltip of the full
 * text only while actually truncated. Needs a width-constrained parent; the `content` slot of
 * `PanelModal.HeaderActionLayout` (`flex: 1, minWidth: 0`) is one.
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
